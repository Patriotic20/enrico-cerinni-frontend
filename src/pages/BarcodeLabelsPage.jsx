import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Printer, Save, Search, Trash2, Usb, X } from 'lucide-react';
import JsBarcode from 'jsbarcode';
import { datamatrix, qrcode, drawingSVG } from 'bwip-js';
import toast from 'react-hot-toast';
import PageLayout from '../components/layout/PageLayout';
import Button from '../components/ui/Button';
import { Card } from '../components/ui';
import { productsAPI, labelsAPI } from '../api';
import { toArray, getApiErrorMessage } from '../utils/api';
import { useDebounce } from '../hooks/useDebounce';
import { SEARCH_CONFIG } from '../utils/constants';
import { formatCurrency, productTitle } from '../utils/format';
import { cn } from '../utils/cn';

// Mirrors LabelTemplate defaults in the backend (app/api/labels.py); used until the saved one loads.
const DEFAULT_TEMPLATE = {
  mode: 'roll',
  code_type: 'code128',
  width_mm: 58,
  height_mm: 40,
  roll_cols: 1,
  a4_cols: 3,
  a4_rows: 8,
  a4_margin_mm: 8,
  a4_gap_mm: 2,
  show_header: true,
  show_name: true,
  show_price: true,
  show_variant: true,
  show_sku_text: true,
  header_text: 'Enrico Cerinni',
  font_size: 9,
  bar_height_mm: 12,
  bar_width: 1.5,
};

const SAMPLE = { sku: 'SKU-20260930-AB12CD', name: 'Namuna mahsulot', color_name: 'Qora', size_name: 'M', price: 250000 };

// Shared by the on-screen preview and the print iframe so both look the same.
const LABEL_CSS = `
.lbl{box-sizing:border-box;padding:1.5mm;display:flex;flex-direction:column;align-items:center;justify-content:safe center;gap:.4mm;overflow:hidden;font-family:Arial,Helvetica,sans-serif;color:#000;background:#fff;text-align:center;line-height:1.15}
.lbl div{max-width:100%;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
.lbl .h{font-weight:700;text-transform:uppercase;font-size:.85em;letter-spacing:.3px}
.lbl .n{font-weight:600}
.lbl .p{font-weight:700;font-size:1.35em}
.lbl .s{font-size:.8em;letter-spacing:.5px}
.lbl svg{display:block;max-width:100%;flex-shrink:1;min-height:5mm}
.lbl.m2d{flex-direction:row;gap:1.5mm}
.lbl.m2d svg{max-height:100%}
.lbl.m2d .t{flex:1;min-width:0;display:flex;flex-direction:column;align-items:flex-start;gap:.4mm;text-align:left}
`;

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));

// Code128 SVG. Bars keep `bar_width` px per module but shrink to fit narrow labels;
// only the x axis stretches, which scanners don't mind (text is rendered as HTML).
function barcodeSvg(sku, t) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  try {
    JsBarcode(svg, sku, { format: 'CODE128', width: t.bar_width, height: 100, displayValue: false, margin: 0 });
  } catch {
    return ''; // non-ASCII SKU: label prints without bars rather than breaking the batch
  }
  const w = parseFloat(svg.getAttribute('width'));
  svg.setAttribute('viewBox', `0 0 ${w} 100`);
  svg.setAttribute('preserveAspectRatio', 'none');
  svg.removeAttribute('width');
  svg.removeAttribute('height');
  svg.setAttribute('style', `width:${w}px;height:${t.bar_height_mm}mm`);
  return svg.outerHTML;
}

const MATRIX = { datamatrix, qrcode };

// 2D code (Data Matrix / QR), square, `bar_height_mm` per side.
function matrixSvg(sku, t) {
  try {
    const svg = MATRIX[t.code_type]({ bcid: t.code_type, text: sku }, drawingSVG());
    return svg.replace('<svg ', `<svg style="width:${t.bar_height_mm}mm;height:${t.bar_height_mm}mm" `);
  } catch {
    return '';
  }
}

function labelHtml(item, t) {
  const variant = [item.color_name, item.size_name].filter(Boolean).join(' / ');
  const is2d = t.code_type in MATRIX;
  const text = (key, cls, value) => t[key] && value && `<div class="${cls}">${esc(value)}</div>`;
  const header = text('show_header', 'h', t.header_text);
  const name = text('show_name', 'n', item.name);
  const variantLine = text('show_variant', 'v', variant);
  const skuLine = text('show_sku_text', 's', item.sku);
  const price = text('show_price', 'p', formatCurrency(item.price));
  const style = `width:${t.width_mm}mm;height:${t.height_mm}mm;font-size:${t.font_size}pt`;

  if (is2d) {
    // Code on the left, text column on the right.
    const col = [header, name, variantLine, skuLine, price].filter(Boolean).join('');
    return `<div class="lbl m2d" style="${style}">${matrixSvg(item.sku, t)}<div class="t">${col}</div></div>`;
  }
  const lines = [header, name, variantLine, barcodeSvg(item.sku, t), skuLine, price];
  return `<div class="lbl" style="${style}">${lines.filter(Boolean).join('')}</div>`;
}

const A4 = { w: 210, h: 297 };

// Page geometry: a roll page is one row of `roll_cols` labels; an A4 page is a cols x rows grid.
function pageLayout(t) {
  const roll = t.mode === 'roll';
  const cols = roll ? t.roll_cols : t.a4_cols;
  const rows = roll ? 1 : t.a4_rows;
  const margin = roll ? 0 : t.a4_margin_mm;
  const gridW = cols * t.width_mm + (cols - 1) * t.a4_gap_mm;
  const gridH = rows * t.height_mm + (rows - 1) * t.a4_gap_mm;
  const pageW = roll ? gridW : A4.w;
  const pageH = roll ? gridH : A4.h;
  return {
    cols, margin, pageW, pageH,
    perPage: cols * rows,
    overflow: !roll && (gridW > A4.w - 2 * margin + 0.01 || gridH > A4.h - 2 * margin + 0.01),
    sheetCss: `.sheet{display:grid;grid-template-columns:repeat(${cols},${t.width_mm}mm);grid-auto-rows:${t.height_mm}mm;gap:${t.a4_gap_mm}mm${roll ? `;height:${pageH - 0.5}mm;overflow:hidden` : ''}}`,
    // ponytail: roll sheet 0.5mm short of the page so driver margins/rounding (macOS) never spill onto a 2nd label
    pageCss: roll ? `@page{size:${pageW}mm ${pageH}mm;margin:0}` : `@page{size:A4;margin:${margin}mm}`,
  };
}

// Most labels of the current size that fit on A4 (clamped to the backend's bounds).
function fitA4(t) {
  const fit = (page, size) => Math.floor((page - 2 * t.a4_margin_mm + t.a4_gap_mm) / (size + t.a4_gap_mm));
  return {
    a4_cols: Math.min(8, Math.max(1, fit(A4.w, t.width_mm))),
    a4_rows: Math.min(20, Math.max(1, fit(A4.h, t.height_mm))),
  };
}

const chunk = (arr, n) => Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, i * n + n));

// Thermal drivers (XPrinter etc.) rotate pages that are wider than tall. `rotate` is a per-printer
// knob: 'driver' lets the driver's paper setting decide, '90'/'-90' send a portrait page with the
// sheet turned inside it.
const ROTATE_KEY = 'label-rotate';
const ROTATIONS = [
  ['none', 'Oddiy'],
  ['driver', 'Printer qog\'ozi bo\'yicha'],
  ['90', '90° burish'],
  ['-90', '-90° burish'],
];
const readRotate = () => { try { return localStorage.getItem(ROTATE_KEY) || 'none'; } catch { return 'none'; } };

function rotateCss(lay, rotate) {
  if (rotate === 'driver') return '@page{size:auto;margin:0}';
  if (rotate !== '90' && rotate !== '-90') return lay.pageCss;
  const turn = rotate === '90' ? 'rotate(90deg) translateY(-100%)' : 'rotate(-90deg) translateX(-100%)';
  return `@page{size:${lay.pageH}mm ${lay.pageW}mm;margin:0}.sheet{width:${lay.pageW}mm;height:${lay.pageH}mm;transform-origin:top left;transform:${turn}}`;
}

function printLabels(items, t, rotate) {
  const lay = pageLayout(t);
  const labels = items.flatMap((it) => Array(it.qty).fill(labelHtml(it, t)));
  const body = chunk(labels, lay.perPage).map((page) => `<div class="sheet">${page.join('')}</div>`).join('');
  const pageCss = t.mode === 'roll' ? rotateCss(lay, rotate) : lay.pageCss;
  const css = `${lay.sheetCss}${pageCss}.sheet:not(:last-child){break-after:page}.lbl{break-inside:avoid}`;

  // Own iframe: the app's global @media print rule only shows #receipt.
  document.getElementById('label-print-frame')?.remove();
  const frame = document.createElement('iframe');
  frame.id = 'label-print-frame';
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
  document.body.appendChild(frame);
  const doc = frame.contentDocument;
  doc.open();
  doc.write(`<!doctype html><html><head><meta charset="utf-8"><title>Shtrix-kodlar</title><style>
*{-webkit-print-color-adjust:exact;print-color-adjust:exact}body{margin:0}${LABEL_CSS}${css}</style></head><body>${body}</body></html>`);
  doc.close();
  frame.contentWindow.onafterprint = () => frame.remove();
  frame.contentWindow.focus();
  frame.contentWindow.print();
}

// Direct thermal printing over WebUSB (Chrome/Edge): each roll page is rendered from the same HTML
// as the preview, turned into a 1-bit bitmap and sent as TSPL, so no OS driver or paper-size setup
// is needed and the printer stops on the label gap.
const DOTS_PER_MM = 8; // 203 dpi (XP-365B)
const CSS_PX_PER_MM = 96 / 25.4;
const LABEL_GAP_MM = 2; // ponytail: common roll gap; make it a template field if a roll differs

async function rasterize(html, css, wMm, hMm) {
  const w = Math.round(wMm * DOTS_PER_MM);
  const h = Math.round(hMm * DOTS_PER_MM);
  // Inside XHTML an <svg> without xmlns would be an unknown HTML tag and render nothing.
  html = html.replace(/<svg(?![^>]*xmlns=)/g, '<svg xmlns="http://www.w3.org/2000/svg"');
  const svg =`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${wMm * CSS_PX_PER_MM} ${hMm * CSS_PX_PER_MM}">`
    + `<foreignObject width="100%" height="100%"><div xmlns="http://www.w3.org/1999/xhtml"><style>${css}</style>${html}</div></foreignObject></svg>`;
  const img = new Image();
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  await img.decode();

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);
  const px = ctx.getImageData(0, 0, w, h).data;

  const wb = Math.ceil(w / 8);
  const bits = new Uint8Array(wb * h).fill(0xff); // TSPL BITMAP: 1 = blank, 0 = burn
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (px[i] + px[i + 1] + px[i + 2] < 384) bits[y * wb + (x >> 3)] &= ~(0x80 >> (x & 7));
    }
  }
  return { wb, h, bits };
}

// First call asks the user to pick the printer; Chrome remembers it for the next prints.
async function usbPrinter() {
  const [known] = await navigator.usb.getDevices();
  const dev = known || await navigator.usb.requestDevice({ filters: [] });
  if (!dev.opened) await dev.open();
  if (!dev.configuration) await dev.selectConfiguration(1);
  for (const iface of dev.configuration.interfaces) {
    const ep = iface.alternate.endpoints.find((e) => e.direction === 'out' && e.type === 'bulk');
    if (!ep) continue;
    if (!iface.claimed) await dev.claimInterface(iface.interfaceNumber);
    return (data) => dev.transferOut(ep.endpointNumber, data);
  }
  throw new Error('USB printer endpoint not found');
}

async function printLabelsUsb(items, t) {
  const send = await usbPrinter(); // before any slow work: requestDevice needs the click's user activation
  const lay = pageLayout(t);
  const css = LABEL_CSS + lay.sheetCss;
  const pages = chunk(items.flatMap((it) => Array(it.qty).fill(labelHtml(it, t))), lay.perPage)
    .map((page) => `<div class="sheet">${page.join('')}</div>`);

  // Consecutive identical pages (one variant x qty) go out as one bitmap with a copy count.
  for (let i = 0, n; i < pages.length; i += n) {
    for (n = 1; pages[i + n] === pages[i]; n++);
    const { wb, h, bits } = await rasterize(pages[i], css, lay.pageW, lay.pageH);
    const head = `SIZE ${lay.pageW} mm,${lay.pageH} mm\r\nGAP ${LABEL_GAP_MM} mm,0 mm\r\nDIRECTION 1\r\nCLS\r\nBITMAP 0,0,${wb},${h},0,`;
    await send(await new Blob([head, bits, `\r\nPRINT 1,${n}\r\n`]).arrayBuffer());
  }
}

const variantToItem = (product, v) => ({
  id: v.id,
  sku: v.sku,
  name: productTitle(product),
  color_name: v.color_name,
  size_name: v.size_name,
  price: v.price,
  qty: v.stock_quantity > 0 ? v.stock_quantity : 1,
});

const inputCls = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500';

const NumField = ({ label, value, onChange, min, max, step = 1 }) => (
  <label className="block">
    <span className="block text-xs font-medium text-gray-600 mb-1">{label}</span>
    <input
      type="number"
      className={inputCls}
      value={value}
      min={min}
      max={max}
      step={step}
      onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
    />
  </label>
);

const TOGGLES = [
  ['show_header', 'Sarlavha'],
  ['show_name', 'Mahsulot nomi'],
  ['show_variant', 'Rang / o\'lcham'],
  ['show_sku_text', 'Shtrix-kod raqami'],
  ['show_price', 'Narx'],
];

const BarcodeLabelsPage = () => {
  const [searchParams] = useSearchParams();
  const [tpl, setTpl] = useState(DEFAULT_TEMPLATE);
  const [saving, setSaving] = useState(false);
  const [usbBusy, setUsbBusy] = useState(false);
  const [rotate, setRotate] = useState(readRotate);
  const [items, setItems] = useState([]);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const debouncedQuery = useDebounce(query.trim(), SEARCH_CONFIG.DEBOUNCE_DELAY);

  const set = (key) => (value) => setTpl((t) => ({ ...t, [key]: value }));

  useEffect(() => {
    labelsAPI.getTemplate()
      .then((res) => res.success && res.data && setTpl(res.data))
      .catch(() => toast.error('Shablonni yuklab bo\'lmadi'));
  }, []);

  const addProduct = useCallback((product) => {
    const variants = (product.variants || []).filter((v) => v.is_active !== false);
    if (!variants.length) {
      toast.error('Bu mahsulotda variant yo\'q');
      return;
    }
    setItems((prev) => {
      const have = new Set(prev.map((i) => i.id));
      return [...prev, ...variants.filter((v) => !have.has(v.id)).map((v) => variantToItem(product, v))];
    });
  }, []);

  // Opened from Inventory: /labels?product=<id>
  const productId = searchParams.get('product');
  useEffect(() => {
    if (!productId) return;
    productsAPI.getProduct(productId)
      .then((res) => res.success && res.data && addProduct(res.data))
      .catch(() => toast.error('Mahsulot topilmadi'));
  }, [productId, addProduct]);

  useEffect(() => {
    if (!debouncedQuery) {
      setResults([]);
      return;
    }
    let cancelled = false;
    productsAPI.getProducts({ search: debouncedQuery, size: 10 })
      .then((res) => !cancelled && setResults(res.success ? toArray(res.data) : []))
      .catch(() => !cancelled && setResults([]));
    return () => { cancelled = true; };
  }, [debouncedQuery]);

  const setQty = (id, qty) => setItems((prev) => prev.map((i) => (
    i.id === id ? { ...i, qty: Math.max(0, Math.min(999, Math.floor(Number(qty) || 0))) } : i
  )));

  const total = items.reduce((s, i) => s + i.qty, 0);
  const layout = pageLayout(tpl);
  const pages = Math.ceil(total / layout.perPage);
  // Preview = first printed page (or a full page of samples when the list is empty).
  const previewHtml = useMemo(() => {
    const first = [];
    for (const it of items) {
      const html = labelHtml(it, tpl);
      for (let i = 0; i < it.qty && first.length < layout.perPage; i++) first.push(html);
    }
    const labels = first.length ? first : Array(layout.perPage).fill(labelHtml(SAMPLE, tpl));
    return `<div class="sheet">${labels.join('')}</div>`;
  }, [items, tpl, layout.perPage]);
  const previewZoom = Math.min(1.5, 480 / (layout.pageW * 3.78));

  const handleUsbPrint = async () => {
    setUsbBusy(true);
    const list = items.filter((i) => i.qty > 0);
    try {
      await printLabelsUsb(list, tpl);
      toast.success('Printerga yuborildi');
    } catch (error) {
      if (error?.name === 'NotFoundError') return; // user closed the device picker
      if (error?.name === 'SecurityError') {
        // OS driver owns the port (Windows usbprint.sys): fall back to the driver print.
        toast('USB band — oddiy chop etish ochildi');
        printLabels(list, tpl, rotate);
        return;
      }
      toast.error(`USB printer: ${error?.message || error}`);
    } finally {
      setUsbBusy(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await labelsAPI.saveTemplate(tpl);
      toast.success('Shablon saqlandi');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Shablonni saqlab bo\'lmadi. Qiymatlarni tekshiring.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageLayout
      title="Shtrix-kodlar"
      subtitle="Yorliq shablonini sozlang va chop eting"
      actions={
        // Roll labels go straight to the thermal printer over USB; A4 (and browsers without WebUSB) use the print dialog.
        tpl.mode === 'roll' && 'usb' in navigator ? (
          <Button onClick={handleUsbPrint} loading={usbBusy} disabled={!total}>
            <Usb size={16} className="mr-2" />
            Chop etish ({total})
          </Button>
        ) : (
          <Button onClick={() => printLabels(items.filter((i) => i.qty > 0), tpl, rotate)} disabled={!total}>
            <Printer size={16} className="mr-2" />
            Chop etish ({total})
          </Button>
        )
      }
    >
      <style>{LABEL_CSS + layout.sheetCss}</style>
      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <Card className="p-5 space-y-5">
          <label className="block">
            <span className="block text-xs font-medium text-gray-600 mb-1">Kod turi</span>
            <select className={inputCls} value={tpl.code_type} onChange={(e) => set('code_type')(e.target.value)}>
              <option value="code128">Chiziqli shtrix-kod (Code128)</option>
              <option value="datamatrix">Data Matrix (2D)</option>
              <option value="qrcode">QR kod (2D)</option>
            </select>
          </label>

          <div>
            <span className="block text-xs font-medium text-gray-600 mb-1">Qog'oz turi</span>
            <div className="grid grid-cols-2 gap-2">
              {[['roll', 'Termo rulon'], ['a4', 'A4 varaq']].map(([mode, label]) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => set('mode')(mode)}
                  className={cn(
                    'rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
                    tpl.mode === mode ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {tpl.mode === 'roll' && (
            <label className="block">
              <span className="block text-xs font-medium text-gray-600 mb-1">Chop etish yo'nalishi (shu qurilma uchun)</span>
              <select
                className={inputCls}
                value={rotate}
                onChange={(e) => {
                  setRotate(e.target.value);
                  try { localStorage.setItem(ROTATE_KEY, e.target.value); } catch { /* private mode */ }
                }}
              >
                {ROTATIONS.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
              </select>
            </label>
          )}

          <div className="grid grid-cols-2 gap-3">
            <NumField label="Eni (mm)" value={tpl.width_mm} onChange={set('width_mm')} min={15} max={120} />
            <NumField label="Bo'yi (mm)" value={tpl.height_mm} onChange={set('height_mm')} min={10} max={100} />
            {tpl.mode === 'roll' ? (
              <NumField label="Yonma-yon (ta)" value={tpl.roll_cols} onChange={set('roll_cols')} min={1} max={4} />
            ) : (
              <>
                <NumField label="Ustunlar" value={tpl.a4_cols} onChange={set('a4_cols')} min={1} max={8} />
                <NumField label="Qatorlar" value={tpl.a4_rows} onChange={set('a4_rows')} min={1} max={20} />
                <NumField label="Chet (mm)" value={tpl.a4_margin_mm} onChange={set('a4_margin_mm')} min={0} max={20} />
              </>
            )}
            {(tpl.mode === 'a4' || tpl.roll_cols > 1) && (
              <NumField label="Oraliq (mm)" value={tpl.a4_gap_mm} onChange={set('a4_gap_mm')} min={0} max={10} step={0.5} />
            )}
          </div>

          <div className={cn('rounded-lg px-3 py-2 text-sm', layout.overflow ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-800')}>
            {layout.overflow ? "Yorliqlar A4 varaqqa sig'maydi. " : `Sahifada ${layout.perPage} ta yorliq`}
            {!layout.overflow && total > 0 && ` · jami ${pages} sahifa`}
            {tpl.mode === 'a4' && (
              <button type="button" className="ml-2 font-medium underline" onClick={() => setTpl((t) => ({ ...t, ...fitA4(t) }))}>
                Avto joylash
              </button>
            )}
          </div>

          <div className="space-y-2">
            {TOGGLES.map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-blue-600"
                  checked={tpl[key]}
                  onChange={(e) => set(key)(e.target.checked)}
                />
                {label}
              </label>
            ))}
          </div>

          {tpl.show_header && (
            <label className="block">
              <span className="block text-xs font-medium text-gray-600 mb-1">Sarlavha matni</span>
              <input
                className={inputCls}
                value={tpl.header_text}
                maxLength={60}
                onChange={(e) => set('header_text')(e.target.value)}
              />
            </label>
          )}

          <div className="grid grid-cols-3 gap-3">
            <NumField label="Shrift (pt)" value={tpl.font_size} onChange={set('font_size')} min={5} max={20} step={0.5} />
            {tpl.code_type === 'code128' ? (
              <>
                <NumField label="Chiziq bo'yi (mm)" value={tpl.bar_height_mm} onChange={set('bar_height_mm')} min={5} max={60} />
                <NumField label="Chiziq eni" value={tpl.bar_width} onChange={set('bar_width')} min={1} max={4} step={0.5} />
              </>
            ) : (
              <NumField label="Kod o'lchami (mm)" value={tpl.bar_height_mm} onChange={set('bar_height_mm')} min={5} max={60} />
            )}
          </div>

          <Button variant="secondary" className="w-full" onClick={handleSave} loading={saving}>
            <Save size={16} className="mr-2" />
            Shablonni saqlash
          </Button>
        </Card>

        <div className="space-y-6 min-w-0">
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Ko'rinish</h3>
            <div className="flex justify-center overflow-auto rounded-lg bg-gray-100 p-6">
              <div
                className="shrink-0 bg-white shadow-md outline outline-1 outline-gray-300 box-border overflow-hidden"
                style={{ zoom: previewZoom, width: `${layout.pageW}mm`, height: `${layout.pageH}mm`, padding: `${layout.margin}mm` }}
                dangerouslySetInnerHTML={{ __html: previewHtml }}
              />
            </div>
          </Card>

          <Card className="p-5 space-y-4">
            <h3 className="text-sm font-semibold text-gray-900">Chop etiladigan mahsulotlar</h3>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                className={cn(inputCls, 'pl-9')}
                placeholder="Mahsulot nomi yoki SKU..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              {results.length > 0 && (
                <ul className="absolute z-10 mt-1 w-full max-h-72 overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                  {results.map((p) => (
                    <li key={p.id}>
                      <button
                        type="button"
                        className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-gray-50"
                        onClick={() => { addProduct(p); setQuery(''); setResults([]); }}
                      >
                        <span className="truncate">{productTitle(p)}</span>
                        <span className="ml-3 shrink-0 text-xs text-gray-500">{p.variants?.length || 0} variant</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {items.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-500">Mahsulot qidiring va ro'yxatga qo'shing</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs text-gray-500">
                      <th className="py-2 pr-3 font-medium">Mahsulot</th>
                      <th className="py-2 pr-3 font-medium">Variant</th>
                      <th className="py-2 pr-3 font-medium">SKU</th>
                      <th className="py-2 pr-3 font-medium text-right">Narx</th>
                      <th className="py-2 pr-3 font-medium w-24">Soni</th>
                      <th className="py-2 w-8" />
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((i) => (
                      <tr key={i.id} className="border-b last:border-0">
                        <td className="py-2 pr-3">{i.name}</td>
                        <td className="py-2 pr-3 text-gray-600">{[i.color_name, i.size_name].filter(Boolean).join(' / ')}</td>
                        <td className="py-2 pr-3 font-mono text-xs text-gray-600">{i.sku}</td>
                        <td className="py-2 pr-3 text-right whitespace-nowrap">{formatCurrency(i.price)}</td>
                        <td className="py-2 pr-3">
                          <input
                            type="number"
                            min={0}
                            max={999}
                            className={cn(inputCls, 'py-1')}
                            value={i.qty}
                            onChange={(e) => setQty(i.id, e.target.value)}
                          />
                        </td>
                        <td className="py-2">
                          <button
                            type="button"
                            className="p-1.5 text-gray-400 hover:text-red-600 rounded"
                            onClick={() => setItems((prev) => prev.filter((x) => x.id !== i.id))}
                            aria-label="O'chirish"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <button
                  type="button"
                  className="mt-3 inline-flex items-center gap-1 text-xs text-gray-500 hover:text-red-600"
                  onClick={() => setItems([])}
                >
                  <X size={14} /> Ro'yxatni tozalash
                </button>
              </div>
            )}
          </Card>
        </div>
      </div>
    </PageLayout>
  );
};

export default BarcodeLabelsPage;
