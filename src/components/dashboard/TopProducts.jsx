import { formatCurrency, formatNumber } from '../../utils/format';

export default function TopProducts({ products = [] }) {
  const max = Math.max(1, ...products.map((p) => p.total_sold || 0));

  return (
    <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-200">
      <h2 className="text-sm font-semibold text-gray-900 mb-3">Eng ko'p sotilganlar</h2>
      {products.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-4">Hali sotuvlar yo'q</p>
      ) : (
        <ul className="flex flex-col gap-2 h-44 overflow-y-auto pr-1">
          {products.map((p, i) => (
            <li key={p.name}>
              <div className="flex items-center justify-between text-xs">
                <span className="truncate text-gray-700">
                  <span className="text-gray-400 mr-2">{i + 1}.</span>{p.name}
                </span>
                <span className="shrink-0 ml-2 font-medium text-gray-900">{formatCurrency(p.total_revenue)}</span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <div className="h-1.5 flex-1 rounded-full bg-gray-100">
                  <div className="h-1.5 rounded-full bg-blue-500" style={{ width: `${((p.total_sold || 0) / max) * 100}%` }} />
                </div>
                <span className="text-[10px] text-gray-500 w-14 text-right">{formatNumber(p.total_sold)} dona</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
