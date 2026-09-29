import { DollarSign, Package } from 'lucide-react';
import { formatCurrency } from '../../utils/format';

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
                {transaction.type === 'sale' ? (
                  <DollarSign size={12} className="text-green-600" />
                ) : (
                  <Package size={12} className="text-blue-600" />
                )}
                <span>
                  {transaction.type === 'sale' 
                    ? `${transaction.client || 'Unknown'}ga sotuv`
                    : `${transaction.supplier || 'Unknown'}dan xarid`
                  }
                </span>
              </div>
              <span className="text-[10px] text-gray-400 pl-5">
                {transaction.date ? new Date(transaction.date).toLocaleDateString() : 'No date'}
              </span>
            </div>
            <div className="text-xs font-semibold shrink-0">
              <span className={(transaction.amount || 0) > 0 ? 'text-green-600' : 'text-red-600'}>
                {(transaction.amount || 0) > 0 ? '+' : ''}{formatCurrency(Math.abs(transaction.amount || 0))}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 