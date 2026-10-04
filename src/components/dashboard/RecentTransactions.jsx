import { DollarSign, Package } from 'lucide-react';
import { formatCurrency, formatDate } from '../../utils/format';

const TYPE_LABELS = {
  sale: 'Sotuv',
  debt_payment: "Qarz to'lovi",
  refund: 'Qaytarish',
  purchase: 'Xarid',
  expense: 'Xarajat',
};
const OUTFLOW = ['refund', 'purchase', 'expense'];

export default function RecentTransactions({ transactions }) {
  if (!transactions || transactions.length === 0) {
    return (
      <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-200">
        <h2 className="text-sm font-semibold text-gray-900 mb-2">So'nggi operatsiyalar</h2>
        <div className="flex flex-col gap-1 h-44 overflow-y-auto pr-1">
          <p className="text-sm text-gray-500 text-center py-4">So'nggi operatsiyalar yo'q</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-200">
      <h2 className="text-sm font-semibold text-gray-900 mb-2">So'nggi operatsiyalar</h2>
      <div className="flex flex-col gap-1 h-44 overflow-y-auto pr-1">
        {transactions.map((transaction) => (
          <div key={transaction.id} className="flex items-center justify-between px-2 py-1 rounded-md bg-gray-50 transition-colors hover:bg-gray-100">
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2 text-xs font-medium text-gray-600 truncate">
                {['sale', 'debt_payment'].includes(transaction.type) ? (
                  <DollarSign size={12} className="text-green-600" />
                ) : (
                  <Package size={12} className="text-blue-600" />
                )}
                <span className="truncate">{TYPE_LABELS[transaction.type] || transaction.type}</span>
              </div>
              <span className="text-[10px] text-gray-500 pl-5 truncate">
                {formatDate(transaction.created_at)}{transaction.description && ` · ${transaction.description}`}
              </span>
            </div>
            <div className="text-xs font-semibold shrink-0">
              {/* Direction comes from the type: purchases are stored positive, refunds negative. */}
              <span className={OUTFLOW.includes(transaction.type) ? 'text-red-600' : 'text-green-600'}>
                {OUTFLOW.includes(transaction.type) ? '−' : '+'}{formatCurrency(Math.abs(transaction.amount || 0))}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 