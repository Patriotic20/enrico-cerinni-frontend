import { Card } from '../ui/Card';
import { expenseCategoryLabel } from '../../utils/constants';
import { cn } from '../../utils/cn';

export const CATEGORY_COLORS = {
  supplier_costs: 'bg-orange-500',
  salary: 'bg-blue-500',
  daily_expenses: 'bg-violet-500',
  rent: 'bg-teal-500',
  utilities: 'bg-cyan-500',
  marketing: 'bg-pink-500',
  maintenance: 'bg-amber-500',
  other: 'bg-gray-400',
};

// Where the money went in the selected period: one stacked bar plus a legend
// whose rows filter the table below.
const FinanceStats = ({ stats, formatCurrency, activeCategory, onPick }) => {
  const rows = Object.entries(stats.byCategory || {})
    .filter(([, amount]) => amount > 0)
    .sort((a, b) => b[1] - a[1]);
  const total = stats.totalExpenses || 0;

  return (
    <Card className="p-4 h-full">
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900 m-0">Kategoriyalar bo'yicha</h3>
        <span className="text-xs text-gray-500">Bosing — filtrlash</span>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-gray-500 py-6 text-center">Bu davrda xarajat yo'q</p>
      ) : (
        <>
          <div className="flex h-2.5 rounded-full overflow-hidden bg-gray-100 mb-3">
            {rows.map(([key, amount]) => (
              <div key={key} className={CATEGORY_COLORS[key] || 'bg-gray-400'}
                style={{ width: `${(amount / total) * 100}%` }} title={expenseCategoryLabel(key)} />
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-0.5">
            {rows.map(([key, amount]) => (
              <button
                key={key}
                type="button"
                onClick={() => onPick(key)}
                className={cn(
                  'flex items-center gap-2 px-2 py-1.5 -mx-2 rounded-md text-sm text-left transition-colors',
                  activeCategory === key ? 'bg-red-50 ring-1 ring-red-200' : 'hover:bg-gray-50'
                )}
              >
                <span className={cn('w-2.5 h-2.5 rounded-sm shrink-0', CATEGORY_COLORS[key] || 'bg-gray-400')} />
                <span className="flex-1 truncate text-gray-700">{expenseCategoryLabel(key)}</span>
                <span className="tabular-nums font-medium text-gray-900">{formatCurrency(amount)}</span>
                <span className="w-10 text-right tabular-nums text-xs text-gray-500">
                  {Math.round((amount / total) * 100)}%
                </span>
              </button>
            ))}
          </div>
        </>
      )}
    </Card>
  );
};

export default FinanceStats;
