import { Banknote, CreditCard, ArrowLeftRight } from 'lucide-react';
import { PAYMENT_METHODS, PAY_TYPE_LABELS } from '../../utils/constants';
import { cn } from '../../utils/cn';

const MODES = [
  { value: PAYMENT_METHODS.FULL, label: "To'liq" },
  { value: PAYMENT_METHODS.PARTIAL, label: 'Qisman' },
  { value: PAYMENT_METHODS.DEBT, label: 'Qarzga' },
];

const TYPES = [
  { value: PAYMENT_METHODS.CASH, Icon: Banknote },
  { value: PAYMENT_METHODS.CARD, Icon: CreditCard },
  { value: PAYMENT_METHODS.TRANSFER, Icon: ArrowLeftRight },
];

export default function PaymentSection({
  paymentMethod,
  setPaymentMethod,
  payType,
  setPayType,
  paidAmount,
  setPaidAmount,
  total
}) {
  const needsType = paymentMethod !== PAYMENT_METHODS.DEBT;

  return (
    <section data-no-autofocus className="space-y-2.5">
      {/* How much is paid now */}
      <div role="radiogroup" aria-label="To'lov" className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-gray-200/70">
        {MODES.map(({ value, label }) => {
          const active = paymentMethod === value;
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setPaymentMethod(value)}
              className={cn(
                'h-11 rounded-lg text-base font-semibold transition-colors',
                active ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              )}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* How it is paid — required, no default */}
      {needsType && (
        <div role="radiogroup" aria-label="To'lov turi" className="grid grid-cols-3 gap-2">
          {TYPES.map(({ value, Icon }) => {
            const active = payType === value;
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setPayType(value)}
                className={cn(
                  'flex items-center justify-center gap-2 h-14 rounded-xl border-2 text-base font-bold transition-colors',
                  active
                    ? 'border-blue-600 bg-blue-600 text-white'
                    : payType
                      ? 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                      : 'border-amber-400 bg-amber-50 text-gray-900 hover:bg-amber-100'
                )}
              >
                <Icon size={22} />
                {PAY_TYPE_LABELS[value]}
              </button>
            );
          })}
        </div>
      )}

      {paymentMethod === PAYMENT_METHODS.PARTIAL && (
        <label className="relative block">
          <span className="sr-only">Mijoz hozir to'laydi</span>
          <input
            type="number"
            inputMode="numeric"
            min="0"
            max={Number(total) || 0}
            value={isNaN(paidAmount) || !paidAmount ? '' : paidAmount}
            onChange={(e) => setPaidAmount(Number(e.target.value))}
            placeholder="Hozir to'lanadigan summa"
            autoFocus
            className="w-full h-14 pl-4 pr-16 text-xl font-semibold tabular-nums rounded-xl border-2 border-gray-200 bg-white focus:border-blue-500 outline-none placeholder:text-base placeholder:font-normal"
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-400 pointer-events-none">UZS</span>
        </label>
      )}
    </section>
  );
}
