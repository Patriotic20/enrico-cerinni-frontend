import { useEffect, useState } from 'react';
import { Delete, RotateCcw } from 'lucide-react';
import Modal from '../modals/Modal';
import { formatCurrency } from '../../utils/format';
import { cn } from '../../utils/cn';

const DISCOUNTS = [5, 10, 15, 20];
const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '000', '0', 'back'];
const MAX_DIGITS = 12;

// Touch keypad for a cart line's price. Works like a calculator: the first key
// replaces the shown price, so a new price never needs "clear" first.
export default function PriceKeypadModal({ item, onClose, onSave }) {
  const [value, setValue] = useState('');
  const [fresh, setFresh] = useState(true);

  useEffect(() => {
    if (item) {
      setValue(String(Math.round(Number(item.price) || 0)));
      setFresh(true);
    }
  }, [item]);

  const base = Math.round(Number(item?.basePrice ?? item?.price) || 0);
  const price = Number(value) || 0;
  const diff = price - base;
  const pct = base > 0 ? Math.round((diff / base) * 100) : 0;

  const press = (key) => {
    if (key === 'back') {
      setValue(v => (fresh ? '' : v.slice(0, -1)));
    } else {
      setValue(v => {
        const next = (fresh ? '' : v) + key;
        return next.replace(/^0+(?=\d)/, '').slice(0, MAX_DIGITS);
      });
    }
    setFresh(false);
  };

  const set = (n) => {
    setValue(String(Math.max(0, Math.round(n))));
    setFresh(true);
  };

  const save = () => {
    onSave(price);
    onClose();
  };

  // Physical keyboard works too. Capture phase: ProductSearch's global handler
  // would otherwise pull digit keys into the product search box.
  useEffect(() => {
    if (!item) return;
    const onKey = (e) => {
      if (/^\d$/.test(e.key)) press(e.key);
      else if (e.key === 'Backspace') press('back');
      else if (e.key === 'Enter') { if (price > 0) save(); }
      else return;
      e.preventDefault();
      e.stopPropagation();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  });

  const chip = 'h-12 rounded-xl text-base font-bold active:scale-[0.97] transition';

  return (
    <Modal isOpen={!!item} onClose={onClose} title="Narxni o'zgartirish" size="xl">
      {item && (
        // Two columns keep the Save button on screen on short POS displays.
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="space-y-3">
            <div>
              <p className="m-0 text-base font-semibold text-gray-900">
                {item.name}
                {item.size_name && <span className="text-gray-500 font-normal"> · {item.size_name}</span>}
              </p>
              <p className="m-0 text-sm text-gray-500">
                Asl narx: <span className="font-semibold text-gray-700 tabular-nums">{formatCurrency(base)}</span>
              </p>
            </div>

            <div className={cn(
              'rounded-2xl border-2 px-4 py-3 text-right',
              fresh ? 'border-gray-200 bg-gray-50' : 'border-blue-500 bg-white'
            )}>
              <p className={cn('m-0 text-3xl font-bold tabular-nums tracking-tight', fresh ? 'text-gray-500' : 'text-gray-900')}>
                {formatCurrency(price)}
              </p>
              <p className={cn(
                'm-0 mt-1 h-5 text-sm font-medium tabular-nums',
                diff < 0 ? 'text-emerald-600' : 'text-amber-600'
              )}>
                {diff !== 0 && `${diff < 0 ? 'Chegirma' : 'Qimmatroq'}: ${formatCurrency(Math.abs(diff))} (${Math.abs(pct)}%)`}
              </p>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {DISCOUNTS.map(d => (
                <button
                  key={d}
                  type="button"
                  onClick={() => set(base * (1 - d / 100))}
                  className={cn(chip, 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 active:bg-emerald-200')}
                >
                  −{d}%
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => set(Math.floor(price / 1000) * 1000)}
                className={cn(chip, 'text-sm border-2 border-gray-200 text-gray-700 hover:bg-gray-50')}
              >
                Yaxlitlash 1 000
              </button>
              <button
                type="button"
                onClick={() => set(Math.floor(price / 10000) * 10000)}
                className={cn(chip, 'text-sm border-2 border-gray-200 text-gray-700 hover:bg-gray-50')}
              >
                Yaxlitlash 10 000
              </button>
            </div>
            <button
              type="button"
              onClick={() => set(base)}
              disabled={price === base}
              className={cn(chip, 'w-full flex items-center justify-center gap-2 text-sm bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-40')}
            >
              <RotateCcw size={18} /> Asl narxga qaytarish
            </button>
          </div>

          <div className="space-y-2">
            <div className="grid grid-cols-3 gap-2">
              {KEYS.map(k => (
                <button
                  key={k}
                  type="button"
                  onClick={() => press(k)}
                  aria-label={k === 'back' ? "O'chirish" : k}
                  className="h-14 flex items-center justify-center rounded-xl bg-white border-2 border-gray-200 text-2xl font-semibold text-gray-900 hover:bg-gray-50 active:bg-gray-200 active:scale-[0.97] transition"
                >
                  {k === 'back' ? <Delete size={26} /> : k}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-[1fr_2fr] gap-2">
              <button
                type="button"
                onClick={onClose}
                className="h-14 rounded-xl border-2 border-gray-200 bg-white text-base font-semibold text-gray-700 hover:bg-gray-50"
              >
                Bekor
              </button>
              <button
                type="button"
                onClick={save}
                disabled={price <= 0}
                className="h-14 rounded-xl bg-blue-600 text-white text-lg font-bold hover:bg-blue-700 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed"
              >
                Saqlash
              </button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
