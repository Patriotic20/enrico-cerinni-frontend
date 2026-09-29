import { useState } from 'react';
import { Minus, Plus, Trash2, ShoppingCart, ScanBarcode, Pencil } from 'lucide-react';
import { formatCurrency } from '../../utils/format';
import { cn } from '../../utils/cn';
import PriceKeypadModal from './PriceKeypadModal';

export default function CartItems({
  cart,
  updateQuantity,
  updatePrice,
  removeFromCart,
  clearCart
}) {
  const [editingId, setEditingId] = useState(null);
  const editing = cart.find(i => i.id === editingId) || null;
  const units = cart.reduce((n, i) => n + (Number(i.quantity) || 0), 0);

  return (
    <div className="flex-1 min-h-[320px] lg:min-h-0 flex flex-col" data-no-autofocus>
      <div className="flex items-center justify-between gap-3 px-4 h-14 shrink-0 border-b border-gray-100">
        <h3 className="m-0 text-lg font-semibold text-gray-900 flex items-center gap-2">
          <ShoppingCart size={22} className="text-gray-500" />
          Savat
          {cart.length > 0 && (
            <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-sm font-semibold">
              {units} dona
            </span>
          )}
        </h3>
        {cart.length > 0 && clearCart && (
          <button
            type="button"
            onClick={() => window.confirm("Savatni tozalaysizmi?") && clearCart()}
            className="h-10 px-3 flex items-center gap-1.5 rounded-lg text-sm font-semibold text-red-600 hover:bg-red-50 active:bg-red-100"
          >
            <Trash2 size={16} /> Tozalash
          </button>
        )}
      </div>

      {cart.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center px-6 py-10">
          <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mb-3">
            <ScanBarcode size={30} className="text-blue-500" />
          </div>
          <p className="m-0 text-lg font-semibold text-gray-800">Savat bo'sh</p>
          <p className="m-0 mt-1 text-sm text-gray-500 max-w-xs">
            Shtrix-kodni skanerlang yoki chapdan mahsulotni bosing
          </p>
        </div>
      ) : (
        <ul className="m-0 p-0 list-none divide-y divide-gray-100 flex-1 min-h-0 overflow-y-auto">
          {cart.map(item => {
            const price = Number(item.price) || 0;
            const base = Number(item.basePrice ?? item.price) || 0;
            const changed = price !== base;
            return (
              <li key={item.id} className="px-4 py-3 space-y-2">
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="m-0 text-base font-semibold text-gray-900 leading-snug truncate">{item.name}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      {item.color_name && (
                        <span className="inline-flex items-center gap-1.5 h-6 pl-1 pr-2 rounded-full border border-gray-200 text-sm text-gray-700">
                          <span
                            className="w-4 h-4 rounded-full border border-black/10"
                            style={{ backgroundColor: item.color_hex || '#e5e7eb' }}
                          />
                          {item.color_name}
                        </span>
                      )}
                      {item.size_name && (
                        <span className="inline-flex items-center h-6 px-2 rounded-full bg-gray-900 text-white text-sm font-bold">
                          {item.size_name}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    aria-label="O'chirish"
                    className="-mr-1 w-11 h-11 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 active:bg-red-100"
                    onClick={() => removeFromCart(item.id)}
                  >
                    <Trash2 size={20} />
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingId(item.id)}
                    className={cn(
                      'flex-1 min-w-0 h-12 px-3 flex items-center justify-between gap-2 rounded-xl border-2 text-left transition-colors active:scale-[0.98]',
                      changed ? 'border-emerald-300 bg-emerald-50 hover:bg-emerald-100' : 'border-gray-200 hover:border-blue-400 hover:bg-blue-50/50'
                    )}
                  >
                    <span className="min-w-0">
                      {changed && (
                        <span className="block text-xs text-gray-400 line-through tabular-nums leading-none">
                          {formatCurrency(base)}
                        </span>
                      )}
                      <span className="block text-base font-semibold text-gray-900 tabular-nums leading-tight truncate">
                        {formatCurrency(price)}
                      </span>
                    </span>
                    <Pencil size={16} className="text-gray-400 shrink-0" />
                  </button>

                  <div className="flex items-center h-12 w-[136px] shrink-0 rounded-xl border-2 border-gray-200 overflow-hidden">
                    <button
                      type="button"
                      aria-label="Kamaytirish"
                      className="w-11 h-full flex items-center justify-center text-gray-600 hover:bg-gray-100 active:bg-gray-200 disabled:opacity-30"
                      disabled={item.quantity <= 1}
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    >
                      <Minus size={20} />
                    </button>
                    <span className="flex-1 text-center text-lg font-bold text-gray-900 tabular-nums">{item.quantity}</span>
                    <button
                      type="button"
                      aria-label="Ko'paytirish"
                      className="w-11 h-full flex items-center justify-center text-gray-600 hover:bg-gray-100 active:bg-gray-200"
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    >
                      <Plus size={20} />
                    </button>
                  </div>

                  <span className="w-[132px] shrink-0 text-right text-lg font-bold text-gray-900 whitespace-nowrap tabular-nums">
                    {formatCurrency(price * (Number(item.quantity) || 0))}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <PriceKeypadModal
        item={editing}
        onClose={() => setEditingId(null)}
        onSave={(p) => updatePrice(editingId, p)}
      />
    </div>
  );
}
