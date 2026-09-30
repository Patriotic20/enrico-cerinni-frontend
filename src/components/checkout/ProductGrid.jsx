import { memo, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { cn } from '../../utils/cn';
import { formatCurrency } from '../../utils/format';

const OTHER = 'Boshqa';

// Stable soft tint per category so the monogram tiles group visually.
const TINTS = [
  'bg-blue-100 text-blue-700', 'bg-emerald-100 text-emerald-700', 'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700', 'bg-violet-100 text-violet-700', 'bg-cyan-100 text-cyan-700',
  'bg-orange-100 text-orange-700', 'bg-teal-100 text-teal-700',
];
const tintFor = (key) => TINTS[[...key].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 0) % TINTS.length];

const initials = (name) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();

const productMeta = (product) => {
  const variants = product.variants || [];
  if (variants.length > 0) {
    const inStock = variants.filter(v => v.stock_quantity > 0);
    const prices = variants.map(v => Number(v.price) || 0);
    const min = Math.min(...prices), max = Math.max(...prices);
    const colors = [...new Map(
      inStock.filter(v => v.color_hex).map(v => [v.color_hex, v.color_name])
    ).entries()];
    const sizes = [...new Set(inStock.map(v => v.size_name).filter(Boolean))];
    return {
      stock: inStock.reduce((s, v) => s + Number(v.stock_quantity), 0),
      price: formatCurrency(min),
      from: min !== max,
      colors,
      sizes,
    };
  }
  return {
    stock: Number(product.stock_quantity) || 0,
    price: formatCurrency(Number(product.price) || 0),
    from: false,
    colors: [],
    sizes: [],
  };
};

const ProductCard = memo(({ product, meta, onAdd }) => {
  const { stock, price, from, colors, sizes } = meta;
  const out = stock <= 0;
  const category = product.category_name || OTHER;

  return (
    <button
      type="button"
      disabled={out}
      onClick={() => onAdd(product)}
      className="group flex gap-3 p-3 text-left bg-white rounded-xl border border-gray-200 shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:border-blue-400 hover:shadow-md active:scale-[0.98] transition disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-gray-200 disabled:hover:shadow-none"
    >
      {product.image_url ? (
        <img src={product.image_url} alt="" loading="lazy" decoding="async" width={56} height={56} className="w-14 h-14 shrink-0 rounded-lg object-cover bg-gray-100" />
      ) : (
        <span className={cn('w-14 h-14 shrink-0 rounded-lg flex items-center justify-center text-base font-bold', tintFor(category))}>
          {initials(product.name)}
        </span>
      )}

      <span className="flex-1 min-w-0 flex flex-col">
        <span className="text-[15px] font-semibold leading-snug text-gray-900 line-clamp-2">{product.name}</span>
        {product.brand_name && <span className="text-xs text-gray-500 truncate">{product.brand_name}</span>}

        {(colors.length > 0 || sizes.length > 0) && (
          <span className="mt-1.5 flex items-center gap-2 min-w-0">
            {colors.length > 0 && (
              <span className="flex -space-x-1 shrink-0">
                {colors.slice(0, 5).map(([hex, name]) => (
                  <span key={hex} title={name} className="w-3.5 h-3.5 rounded-full ring-2 ring-white border border-black/10" style={{ backgroundColor: hex }} />
                ))}
                {colors.length > 5 && <span className="pl-2 text-[11px] text-gray-500">+{colors.length - 5}</span>}
              </span>
            )}
            {sizes.length > 0 && (
              <span className="text-[11px] text-gray-500 truncate">
                {sizes.length > 4 ? `${sizes[0]}–${sizes[sizes.length - 1]}` : sizes.join(' · ')}
              </span>
            )}
          </span>
        )}

        <span className="mt-auto pt-2 flex items-end justify-between gap-2">
          <span className="tabular-nums whitespace-nowrap">
            {from && <span className="text-[11px] text-gray-500 mr-1">dan</span>}
            <span className="text-[15px] font-bold text-gray-900">{price}</span>
          </span>
          <span className={cn(
            'text-[11px] font-medium px-1.5 py-0.5 rounded',
            out ? 'bg-red-50 text-red-600' : stock <= 3 ? 'bg-amber-50 text-amber-700' : 'bg-gray-100 text-gray-600'
          )}>
            {out ? 'Tugagan' : `${stock} dona`}
          </span>
        </span>
      </span>

      <span className="self-start w-8 h-8 shrink-0 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
        <Plus size={18} />
      </span>
    </button>
  );
});

/**
 * Checkout product list: category chips on top, products grouped under
 * sticky category headers. Search results arrive already filtered, so the
 * chips only narrow what is on screen.
 */
function ProductGrid({ products, title, onAdd, dimmed = false }) {
  const [category, setCategory] = useState('all');

  // Per-product meta once per result set, not per render / sort comparison.
  const metas = useMemo(() => new Map(products.map(p => [p.id, productMeta(p)])), [products]);

  const groups = useMemo(() => {
    const map = new Map();
    products.forEach(p => {
      const key = p.category_name || OTHER;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(p);
    });
    // Alphabetical, "Boshqa" last; in-stock items first inside each group.
    return [...map.entries()]
      .sort(([a], [b]) => (a === OTHER) - (b === OTHER) || a.localeCompare(b))
      .map(([name, items]) => [name, items.sort((x, y) => (metas.get(x.id).stock <= 0) - (metas.get(y.id).stock <= 0))]);
  }, [products, metas]);

  // A chip can disappear when the search changes; fall back to "all".
  const active = groups.some(([name]) => name === category) ? category : 'all';
  const visible = active === 'all' ? groups : groups.filter(([name]) => name === active);

  const chip = (id, label, count) => (
    <button
      key={id}
      type="button"
      onClick={() => setCategory(id)}
      className={cn(
        'shrink-0 h-9 px-3.5 rounded-full text-sm font-medium border transition-colors',
        active === id ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
      )}
    >
      {label} <span className={cn('ml-1 text-xs', active === id ? 'text-white/70' : 'text-gray-500')}>{count}</span>
    </button>
  );

  return (
    <div className={cn('mt-4 flex-1 min-h-0 flex flex-col transition-opacity', dimmed && 'opacity-60')} aria-busy={dimmed}>
      <div className="flex items-center gap-2 overflow-x-auto pb-2 shrink-0 [scrollbar-width:thin]">
        {chip('all', title, products.length)}
        {groups.length > 1 && groups.map(([name, items]) => chip(name, name, items.length))}
      </div>

      <div className="max-h-[420px] lg:max-h-none lg:flex-1 min-h-0 overflow-y-auto pr-1 -mr-1">
        {visible.map(([name, items]) => (
          <section key={name} className="mb-4 last:mb-0">
            {(active === 'all' && groups.length > 1) && (
              <h3 className="sticky top-0 z-10 m-0 py-2 bg-white text-xs font-semibold uppercase tracking-wide text-gray-500">
                {name} <span className="text-gray-500 font-normal">· {items.length}</span>
              </h3>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-2.5">
              {items.map(p => <ProductCard key={p.id} product={p} meta={metas.get(p.id)} onAdd={onAdd} />)}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

export default memo(ProductGrid);
