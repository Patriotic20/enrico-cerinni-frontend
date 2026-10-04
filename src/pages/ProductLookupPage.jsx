/**
 * Product Lookup Page
 *
 * Quick "do we have it?" tool for sellers: scan a barcode (hardware scanner
 * or phone camera) or type a name / brand / SKU and see price and stock per
 * colour and size at a glance. Read-only, mobile first.
 *
 * @page
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Search, X, ScanBarcode, Camera, Package, ChevronDown, Tag, ExternalLink, SearchX, Loader2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { productsAPI, brandsAPI } from '../api';
import { toArray } from '../utils/api';
import { useProductSearch } from '../hooks/useProductSearch';
import { useAuth } from '../contexts/AuthContext';
import { isStaff, SEARCH_CONFIG } from '../utils/constants';
import { formatCurrency, productTitle } from '../utils/format';
import { variantStockStatus } from '../utils/stock';
import { cn } from '../utils/cn';
import { isBarcode } from '../utils/barcode';
import { CameraScanner, CAN_SCAN } from '../components/ui/CameraScanner';

const money = formatCurrency;

const STOCK_STYLE = {
  ok: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  low: 'bg-amber-50 text-amber-700 ring-amber-200',
  out: 'bg-gray-100 text-gray-500 ring-gray-200 line-through',
};

const summarize = (product) => {
  const variants = (product.variants || []).filter((v) => v.is_active !== false);
  const prices = variants.map((v) => Number(v.price) || 0);
  const stock = variants.reduce((s, v) => s + (v.stock_quantity || 0), 0);
  return {
    variants,
    stock,
    min: prices.length ? Math.min(...prices) : 0,
    max: prices.length ? Math.max(...prices) : 0,
  };
};

const ProductCard = ({ product, open, onToggle, highlightSku, staff }) => {
  const { variants, stock, min, max } = summarize(product);

  // Colour rows × size chips — how sellers think about clothing stock.
  const byColor = useMemo(() => {
    const map = new Map();
    variants.forEach((v) => {
      const key = v.color_name || '—';
      if (!map.has(key)) map.set(key, { hex: v.color_hex, items: [] });
      map.get(key).items.push(v);
    });
    map.forEach((g) => g.items.sort((a, b) =>
      String(a.size_name).localeCompare(String(b.size_name), undefined, { numeric: true })));
    return [...map.entries()];
  }, [variants]);

  const hit = highlightSku && variants.find((v) => v.sku?.toLowerCase() === highlightSku.toLowerCase());

  return (
    <li className={cn(
      'overflow-hidden rounded-2xl bg-white shadow-sm ring-1 transition',
      hit ? 'ring-2 ring-blue-500' : 'ring-gray-200',
    )}>
      <button onClick={onToggle} className="flex w-full items-center gap-3 p-4 text-left active:bg-gray-50" aria-expanded={open}>
        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-blue-50 to-indigo-100">
          {product.image_url
            ? <img src={product.image_url} alt="" className="h-full w-full object-cover" loading="lazy" />
            : <Package size={26} className="text-blue-500" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-semibold text-gray-900">{productTitle(product)}</p>
          <p className="truncate text-sm text-gray-500">
            {[product.brand_name, product.category_name].filter(Boolean).join(' · ') || product.sku}
          </p>
          <p className="mt-0.5 text-sm font-bold text-blue-600">
            {min === max ? money(min) : `${money(min)} – ${money(max)}`}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className={cn(
            'rounded-full px-2.5 py-1 text-xs font-bold ring-1',
            stock === 0 ? STOCK_STYLE.out.replace(' line-through', '') : STOCK_STYLE.ok,
          )}>
            {stock} dona
          </span>
          <ChevronDown size={20} className={cn('text-gray-500 transition-transform', open && 'rotate-180')} />
        </div>
      </button>

      {open && (
        <div className="space-y-3 border-t border-gray-100 bg-gray-50/60 p-4">
          {hit && (
            <div className="rounded-xl bg-blue-600 p-3 text-white">
              <p className="text-xs uppercase tracking-wide opacity-80">Skanerlangan</p>
              <p className="text-lg font-bold">
                {[hit.color_name, hit.size_name].filter(Boolean).join(' · ')} — {money(hit.price)}
              </p>
              <p className="text-sm opacity-90">Omborda: {hit.stock_quantity} dona · {hit.sku}</p>
            </div>
          )}

          {byColor.length === 0 && <p className="text-sm text-gray-500">Variantlar yo'q</p>}

          {byColor.map(([color, { hex, items }]) => (
            <div key={color}>
              <div className="mb-1.5 flex items-center gap-2 text-sm font-medium text-gray-700">
                <span className="h-4 w-4 rounded-full ring-1 ring-gray-300" style={{ background: hex || '#e5e7eb' }} />
                {color}
              </div>
              <div className="flex flex-wrap gap-2">
                {items.map((v) => {
                  const status = variantStockStatus(v);
                  return (
                    <div
                      key={v.id}
                      title={`${v.sku} · ${money(v.price)}`}
                      className={cn(
                        'min-w-[3.5rem] rounded-xl px-3 py-2 text-center ring-1',
                        STOCK_STYLE[status],
                        v.id === hit?.id && 'ring-2 ring-blue-500',
                      )}
                    >
                      <span className="block text-base font-bold">{v.size_name || '—'}</span>
                      <span className="block text-xs">{v.stock_quantity} dona</span>
                    </div>
                  );
                })}
              </div>
              {new Set(items.map((v) => v.price)).size > 1 && (
                <p className="mt-1 text-xs text-gray-500">
                  {items.map((v) => `${v.size_name}: ${money(v.price)}`).join(' · ')}
                </p>
              )}
            </div>
          ))}

          <div className="flex items-center justify-between pt-1 text-xs text-gray-500">
            <span className="flex items-center gap-1"><Tag size={14} /> {product.sku}</span>
            {staff && (
              <Link to={`/inventory/${product.id}`} className="flex items-center gap-1 font-medium text-blue-600">
                Inventarda ochish <ExternalLink size={14} />
              </Link>
            )}
          </div>
        </div>
      )}
    </li>
  );
};

const ProductLookupPage = () => {
  const { user } = useAuth();
  const staff = isStaff(user);
  const inputRef = useRef(null);
  const { searchTerm, setSearchTerm, searchResults, searchLoading, clearSearch } = useProductSearch();
  const [openId, setOpenId] = useState(null);
  const [scanned, setScanned] = useState(null); // { product, sku }
  const [scanning, setScanning] = useState(false);
  const [lookingUp, setLookingUp] = useState(false);
  const [brands, setBrands] = useState([]);
  const [brandId, setBrandId] = useState(null);
  const [brandResults, setBrandResults] = useState([]);
  const [brandLoading, setBrandLoading] = useState(false);

  useEffect(() => {
    inputRef.current?.focus();
    brandsAPI.getBrands()
      .then((res) => setBrands(toArray(res.data).filter((b) => b.is_active !== false)))
      .catch(() => setBrands([]));
  }, []);

  // Hardware scanners type into whatever has focus. After tapping a card the
  // input is blurred, so pull stray keystrokes back into it.
  useEffect(() => {
    const onKey = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.key.length !== 1) return;
      if (e.target.closest?.('input, textarea, select, [contenteditable]')) return;
      inputRef.current?.focus();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Brand chip picked: list that brand's products, narrowed by the typed text.
  useEffect(() => {
    if (!brandId) return;
    let cancelled = false;
    const t = setTimeout(async () => {
      setBrandLoading(true);
      try {
        const res = await productsAPI.getProducts({
          brand_id: brandId,
          search: searchTerm.trim() || undefined,
          page: 1,
          size: SEARCH_CONFIG.MAX_LIMIT,
        });
        if (!cancelled) setBrandResults(res.success ? toArray(res.data) : []);
      } catch {
        if (!cancelled) setBrandResults([]);
      } finally {
        if (!cancelled) setBrandLoading(false);
      }
    }, SEARCH_CONFIG.DEBOUNCE_DELAY);
    return () => { cancelled = true; clearTimeout(t); };
  }, [brandId, searchTerm]);

  const pickBrand = (id) => {
    setBrandId(brandId === id ? null : id);
    setScanned(null);
    setOpenId(null);
  };

  const list = scanned ? [scanned.product] : brandId ? brandResults : searchResults;
  const busy = searchLoading || lookingUp || brandLoading;
  const brandName = brands.find((b) => b.id === brandId)?.name;

  const lookupCode = async (code) => {
    setScanning(false);
    setLookingUp(true);
    // Partial SKU typed by hand already has text-search matches on screen.
    const notFound = () => {
      if (!(searchTerm.trim() === code && searchResults.length)) {
        toast.error('Bu kod bo\'yicha mahsulot topilmadi');
      }
      setSearchTerm(code);
    };
    try {
      const res = await productsAPI.getProductByBarcode(code);
      if (res.success && res.data) {
        setScanned({ product: res.data, sku: code });
        setBrandId(null);
        setOpenId(res.data.id);
        setSearchTerm('');
      } else {
        notFound();
      }
    } catch {
      notFound();
    } finally {
      setLookingUp(false);
      inputRef.current?.select();
    }
  };

  // Hardware scanners type the code and press Enter.
  const onKeyDown = (e) => {
    if (e.key !== 'Enter') return;
    const code = searchTerm.trim();
    if (isBarcode(code)) lookupCode(code);
    else if (list[0]) setOpenId(list[0].id);
  };

  const onChange = (e) => {
    setSearchTerm(e.target.value);
    setScanned(null);
  };

  const reset = () => {
    clearSearch();
    setBrandId(null);
    setScanned(null);
    setOpenId(null);
    inputRef.current?.focus();
  };


  return (
    <div className="mx-auto w-full max-w-3xl pb-24">
      <div className="sticky top-14 md:top-0 z-20 -mx-4 bg-gradient-to-b from-gray-50 via-gray-50 to-gray-50/0 px-4 pb-4 pt-2 sm:mx-0 sm:px-0">
        <h1 className="mb-3 text-2xl font-bold text-gray-900">Mahsulot qidirish</h1>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={22} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              ref={inputRef}
              type="search"
              inputMode="search"
              enterKeyHint="search"
              autoComplete="off"
              value={searchTerm}
              onChange={onChange}
              onKeyDown={onKeyDown}
              placeholder="Nomi, firma yoki shtrix-kod"
              aria-label="Mahsulot qidirish"
              className="h-14 w-full rounded-2xl border-0 bg-white pl-12 pr-12 text-lg shadow-sm ring-1 ring-gray-200 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {busy ? (
              <Loader2 size={22} className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin text-blue-500" />
            ) : (searchTerm || scanned || brandId) && (
              <button onClick={reset} aria-label="Tozalash" className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full text-gray-500 active:bg-gray-100">
                <X size={22} />
              </button>
            )}
          </div>
          {CAN_SCAN && (
            <button
              onClick={() => setScanning(true)}
              aria-label="Kamera bilan skanerlash"
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-md shadow-blue-600/30 active:scale-95"
            >
              <Camera size={26} />
            </button>
          )}
        </div>
        {brands.length > 0 && (
          <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:px-0">
            {brands.map((b) => (
              <button
                key={b.id}
                onClick={() => pickBrand(b.id)}
                aria-pressed={brandId === b.id}
                className={cn(
                  'shrink-0 rounded-full px-4 py-2 text-sm font-medium ring-1 transition active:scale-95',
                  brandId === b.id
                    ? 'bg-blue-600 text-white ring-blue-600 shadow-md shadow-blue-600/30'
                    : 'bg-white text-gray-700 ring-gray-200',
                )}
              >
                {b.name}
              </button>
            ))}
          </div>
        )}
        <p className="mt-2 flex items-center gap-1.5 text-sm text-gray-500">
          <ScanBarcode size={16} />
          {scanned
            ? 'Skaner natijasi'
            : brandId
              ? `${brandName}: ${brandResults.length} ta mahsulot`
              : searchTerm.trim()
              ? `${searchResults.length} ta natija`
              : 'Skanerni ishlating yoki yozing · yangi mahsulotlar'}
        </p>
      </div>

      {!busy && list.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-center text-gray-500">
          <SearchX size={48} className="mb-3 text-gray-300" />
          <p className="text-lg font-medium text-gray-700">Hech narsa topilmadi</p>
          <p className="text-sm">Boshqa nom, firma yoki kodni sinab ko'ring</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {list.map((p) => (
            <ProductCard
              key={p.id}
              product={p}
              staff={staff}
              open={openId === p.id}
              onToggle={() => setOpenId(openId === p.id ? null : p.id)}
              highlightSku={scanned?.sku}
            />
          ))}
        </ul>
      )}

      {scanning && <CameraScanner onDetect={lookupCode} onClose={() => setScanning(false)} />}
    </div>
  );
};

export default ProductLookupPage;
