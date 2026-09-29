import { AlertCircle } from 'lucide-react';
import { cn } from '../../utils/cn';
import { initials } from '../employees/shared';

// One row of chips: sellers are few and the pick is remembered between sales
// (see useCheckout), so this usually needs no tap at all. Scrolls sideways if
// a shop ever has more sellers than fit.
export default function SellerSection({ sellers, sellerId, onSelect, error }) {
  if (sellers.length === 0) {
    return (
      <p className="m-0 text-sm text-gray-500 rounded-xl border-2 border-dashed border-gray-300 px-3 py-2">
        Sotuvchilar yo'q — "Xodimlar" bo'limida qo'shing.
      </p>
    );
  }

  return (
    <section>
      <div
        role="radiogroup"
        aria-label="Sotuvchi"
        className={cn(
          'flex gap-2 overflow-x-auto -mx-1 px-1 py-0.5 rounded-xl',
          error && 'ring-2 ring-red-400'
        )}
      >
        {sellers.map(s => {
          const active = s.id === sellerId;
          return (
            <button
              key={s.id}
              type="button"
              role="radio"
              aria-checked={active}
              title={s.position}
              onClick={() => onSelect(s.id)}
              className={cn(
                'shrink-0 flex items-center gap-2 h-12 pl-1.5 pr-4 rounded-full border-2 transition-colors',
                active
                  ? 'border-blue-600 bg-blue-600 text-white'
                  : 'border-gray-200 bg-white text-gray-800 hover:border-gray-300 hover:bg-gray-50'
              )}
            >
              <span className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold',
                active ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'
              )}>
                {initials(s.name)}
              </span>
              <span className="text-base font-semibold whitespace-nowrap">{s.name.split(' ')[0]}</span>
            </button>
          );
        })}
      </div>
      {error && (
        <p className="m-0 mt-1.5 flex items-center gap-1.5 text-sm font-medium text-red-600">
          <AlertCircle size={16} /> Sotuvchini tanlang
        </p>
      )}
    </section>
  );
}
