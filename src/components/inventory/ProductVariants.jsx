import { useState, useMemo } from 'react';
import { Edit, Trash2, Plus, Check, X, Package } from 'lucide-react';
import Button from '../ui/Button';
import { useConfirm } from '../../contexts/ConfirmContext';
import { formatNumber } from '../../utils/format';
import { variantStockStatus } from '../../utils/stock';
import toast from 'react-hot-toast';

const STATUS_CELL = {
  out: 'bg-red-50 text-red-700 border-red-200',
  low: 'bg-amber-50 text-amber-700 border-amber-200',
  ok: 'bg-white text-gray-900 border-gray-200',
};

const compareSize = (a, b) => String(a).localeCompare(String(b), undefined, { numeric: true });

const Swatch = ({ hex, name }) => (
  <span
    title={name}
    className="inline-block w-3.5 h-3.5 rounded-full border border-gray-300 shrink-0"
    style={{ backgroundColor: hex || '#e5e7eb' }}
  />
);

const StockBadge = ({ variant }) => {
  const status = variantStockStatus(variant);
  if (status === 'out') return <span className="text-xs text-red-600">Tugagan</span>;
  if (status === 'low') return <span className="text-xs text-amber-600">Kam</span>;
  return null;
};

const numInput = 'w-full px-2 py-1 text-sm text-right border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 tabular-nums';

export default function ProductVariants({
  variants = [],
  loading = false,
  onUpdateVariant,
  onDeleteVariant,
  onAddVariant
}) {
  const [editingVariant, setEditingVariant] = useState(null);
  const [editData, setEditData] = useState({});
  const confirm = useConfirm();

  // Colour × size grid: stock at a glance, the way a shop floor thinks about it.
  const { colors, sizes, cells, sorted } = useMemo(() => {
    const colorMap = new Map();
    const sizeSet = new Set();
    const cellMap = new Map();
    for (const v of variants) {
      const color = v.color_name || 'Noma\'lum';
      const size = v.size_name || '—';
      if (!colorMap.has(color)) colorMap.set(color, v.color_hex);
      sizeSet.add(size);
      cellMap.set(`${color}|${size}`, v);
    }
    const sizeList = [...sizeSet].sort(compareSize);
    const sortedVariants = [...variants].sort((a, b) =>
      (a.color_name || '').localeCompare(b.color_name || '') || compareSize(a.size_name, b.size_name)
    );
    return { colors: [...colorMap], sizes: sizeList, cells: cellMap, sorted: sortedVariants };
  }, [variants]);

  const handleEdit = (variant) => {
    setEditingVariant(variant.id);
    setEditData({
      price: variant.price,
      stock_quantity: variant.stock_quantity,
      min_stock_level: variant.min_stock_level || 0,
      is_active: variant.is_active
    });
  };

  const handleSave = async () => {
    const result = await onUpdateVariant(editingVariant, editData);
    if (result.success) {
      setEditingVariant(null);
      setEditData({});
    } else {
      toast.error(result.error || 'Variant yangilanmadi');
    }
  };

  const handleCancel = () => {
    setEditingVariant(null);
    setEditData({});
  };

  const handleDelete = async (variantId) => {
    const confirmed = await confirm({
      title: 'Variantni o\'chirish',
      message: 'Bu variantni o\'chirishni xohlaysizmi?',
      description: 'Bu amalni qaytarib bo\'lmaydi.',
      confirmText: 'Ha, o\'chirish',
      variant: 'danger',
    });
    if (!confirmed) return;

    const result = await onDeleteVariant(variantId);
    if (!result.success) {
      toast.error(result.error || 'Variant o\'chirilmadi');
    }
  };

  const setField = (field, parse) => (e) =>
    setEditData(prev => ({ ...prev, [field]: parse(e.target.value) || 0 }));

  const header = (
    <div className="flex items-center justify-between mb-3">
      <h3 className="text-sm font-semibold text-gray-900">
        Variantlar {variants.length > 0 && <span className="text-gray-500 font-normal">({variants.length})</span>}
      </h3>
      <Button size="sm" onClick={onAddVariant}>
        <Plus size={14} className="mr-1" />
        Variant qo'shish
      </Button>
    </div>
  );

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        {header}
        <div className="flex items-center justify-center py-6">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-3"></div>
          <p className="text-sm text-gray-600">Variantlar yuklanmoqda...</p>
        </div>
      </div>
    );
  }

  if (variants.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        {header}
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Package size={24} className="text-gray-500 mb-3" />
          <p className="text-sm text-gray-600">Bu mahsulot uchun variantlar mavjud emas</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stock matrix */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <h3 className="text-sm font-semibold text-gray-900">Qoldiq: rang × o'lcham</h3>
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-amber-100 border border-amber-300" /> Kam</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-red-100 border border-red-300" /> Tugagan</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="text-sm border-separate border-spacing-1">
            <thead>
              <tr>
                <th />
                {sizes.map(size => (
                  <th key={size} className="px-2 text-xs font-medium text-gray-500 text-center min-w-[56px]">{size}</th>
                ))}
                <th className="px-2 text-xs font-medium text-gray-500 text-right">Jami</th>
              </tr>
            </thead>
            <tbody>
              {colors.map(([color, hex]) => {
                let rowTotal = 0;
                return (
                  <tr key={color}>
                    <td className="pr-3 whitespace-nowrap">
                      <span className="flex items-center gap-2 text-gray-800"><Swatch hex={hex} name={color} />{color}</span>
                    </td>
                    {sizes.map(size => {
                      const v = cells.get(`${color}|${size}`);
                      if (!v) return <td key={size} className="text-center text-gray-300">—</td>;
                      rowTotal += v.stock_quantity;
                      return (
                        <td key={size}>
                          <button
                            type="button"
                            onClick={() => handleEdit(v)}
                            title={`${v.sku} · min ${v.min_stock_level}`}
                            className={`w-full px-2 py-1 rounded border text-center tabular-nums hover:ring-2 hover:ring-blue-200 ${STATUS_CELL[variantStockStatus(v)]}`}
                          >
                            {v.stock_quantity}
                          </button>
                        </td>
                      );
                    })}
                    <td className="px-2 text-right font-semibold tabular-nums">{formatNumber(rowTotal)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Variant list with inline edit */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        {header}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-xs text-gray-500 text-left">
                <th className="py-2 pr-3 font-medium">Rang / o'lcham</th>
                <th className="py-2 pr-3 font-medium">SKU</th>
                <th className="py-2 pr-3 font-medium text-right">Narx</th>
                <th className="py-2 pr-3 font-medium text-right">Tannarx</th>
                <th className="py-2 pr-3 font-medium text-right">Marja</th>
                <th className="py-2 pr-3 font-medium text-right">Qoldiq</th>
                <th className="py-2 pr-3 font-medium text-right">Min</th>
                <th className="py-2 w-20" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sorted.map(variant => {
                const editing = editingVariant === variant.id;
                const price = Number(variant.price);
                const cost = variant.cost_price != null ? Number(variant.cost_price) : null;
                const margin = cost != null && price > 0 ? Math.round(((price - cost) / price) * 100) : null;
                return (
                  <tr key={variant.id} className={editing ? 'bg-blue-50/50' : 'hover:bg-gray-50'}>
                    <td className="py-2 pr-3 whitespace-nowrap">
                      <span className="flex items-center gap-2">
                        <Swatch hex={variant.color_hex} name={variant.color_name} />
                        <span className="text-gray-900">{variant.color_name || '—'}</span>
                        <span className="text-gray-500">· {variant.size_name || '—'}</span>
                      </span>
                    </td>
                    <td className="py-2 pr-3 font-mono text-xs text-gray-500 whitespace-nowrap">{variant.sku}</td>
                    <td className="py-2 pr-3 text-right tabular-nums whitespace-nowrap">
                      {editing
                        ? <input type="number" value={editData.price ?? ''} onChange={setField('price', parseFloat)} className={`${numInput} min-w-[110px]`} aria-label="Narx" />
                        : formatNumber(Math.round(price))}
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums text-gray-500 whitespace-nowrap">
                      {cost != null ? formatNumber(Math.round(cost)) : '—'}
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums text-gray-500">
                      {margin != null ? `${margin}%` : '—'}
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums whitespace-nowrap">
                      {editing
                        ? <input type="number" min="0" value={editData.stock_quantity ?? ''} onChange={setField('stock_quantity', v => parseInt(v, 10))} className={`${numInput} w-20`} aria-label="Qoldiq" />
                        : <span className="flex items-center justify-end gap-2"><StockBadge variant={variant} /><span className="font-medium">{variant.stock_quantity}</span></span>}
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums text-gray-500">
                      {editing
                        ? <input type="number" min="0" value={editData.min_stock_level ?? ''} onChange={setField('min_stock_level', v => parseInt(v, 10))} className={`${numInput} w-16`} aria-label="Minimal zapas" />
                        : variant.min_stock_level}
                    </td>
                    <td className="py-2 text-right whitespace-nowrap">
                      {editing ? (
                        <>
                          <button onClick={handleSave} className="p-1.5 text-green-600 hover:bg-green-50 rounded" title="Saqlash" aria-label="Saqlash"><Check size={16} /></button>
                          <button onClick={handleCancel} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded" title="Bekor qilish" aria-label="Bekor qilish"><X size={16} /></button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => handleEdit(variant)} className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded" title="Tahrirlash" aria-label="Tahrirlash"><Edit size={16} /></button>
                          <button onClick={() => handleDelete(variant.id)} className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded" title="O'chirish" aria-label="O'chirish"><Trash2 size={16} /></button>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
