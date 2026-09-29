import { Card } from '../ui/Card';
import { cn } from '../../utils/cn';

// Decimal columns arrive from the API as strings.
export const toNumber = (value) => {
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const shortMoney = (v) =>
  Math.abs(v) >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : Math.abs(v) >= 1e3 ? `${Math.round(v / 1e3)}K` : String(v);

export const dayLabel = (value) => {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value
    : `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`;
};

export const AXIS = { tick: { fontSize: 11, fill: '#6b7280' }, axisLine: false, tickLine: false };
export const GRID = { stroke: '#f0f0f0', vertical: false };
export const BLUE = '#3b82f6';

export const Kpi = ({ label, value, hint, tone }) => (
  <Card className="p-4">
    <div className="text-xs font-medium text-gray-500">{label}</div>
    <div className={cn('mt-1 text-lg font-semibold tabular-nums truncate',
      tone === 'bad' ? 'text-red-600' : tone === 'good' ? 'text-green-600' : 'text-gray-900')} title={String(value)}>
      {value}
    </div>
    {hint && <div className="text-xs text-gray-500 mt-0.5 truncate">{hint}</div>}
  </Card>
);

export const KpiRow = ({ children }) => (
  <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">{children}</div>
);

export const Panel = ({ title, subtitle, action, children, className }) => (
  <Card className={cn('p-4', className)}>
    <div className="flex items-start justify-between gap-3 mb-3">
      <div>
        <h3 className="text-sm font-semibold text-gray-900 m-0">{title}</h3>
        {subtitle && <p className="text-xs text-gray-500 m-0 mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
    {children}
  </Card>
);

export const Empty = ({ children = "Tanlangan davrda ma'lumot yo'q" }) => (
  <p className="text-sm text-gray-500 text-center py-8 m-0">{children}</p>
);

// Label / value / share-of-total rows. One hue: this shows magnitude, not identity.
export const ShareList = ({ rows, format }) => {
  const items = rows.filter(r => r.value > 0).sort((a, b) => b.value - a.value);
  const total = items.reduce((s, r) => s + r.value, 0);
  if (!items.length) return <Empty />;
  return (
    <ul className="space-y-2.5 m-0 p-0 list-none">
      {items.map(r => {
        const pct = (r.value / total) * 100;
        return (
          <li key={r.label} className="text-sm">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-gray-700 truncate">{r.label}</span>
              <span className="tabular-nums text-gray-900 font-medium whitespace-nowrap">
                {format(r.value)} <span className="text-xs text-gray-500 font-normal w-9 inline-block text-right">{Math.round(pct)}%</span>
              </span>
            </div>
            <div className="mt-1 h-1.5 rounded-full bg-gray-100">
              <div className="h-1.5 rounded-full bg-blue-500" style={{ width: `${pct}%` }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
};

export const ChartTooltip = ({ active, payload, label, labelFormat = (l) => l, format }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white px-3 py-2 border border-gray-200 rounded-lg shadow-lg text-sm">
      <div className="font-medium text-gray-900 mb-0.5">{labelFormat(label)}</div>
      {payload.map(p => (
        <div key={p.dataKey} className="flex items-center gap-2 text-gray-700">
          <span className="w-2 h-2 rounded-sm" style={{ background: p.color }} />
          {p.name}: <span className="tabular-nums font-medium text-gray-900">{format(p.value, p.dataKey)}</span>
        </div>
      ))}
    </div>
  );
};

export const Th = ({ children, right }) => (
  <th className={cn('px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap', right ? 'text-right' : 'text-left')}>
    {children}
  </th>
);
export const Td = ({ children, right, className }) => (
  <td className={cn('px-3 py-2 text-sm', right && 'text-right tabular-nums whitespace-nowrap', className)}>{children}</td>
);

export const SimpleTable = ({ head, children }) => (
  <div className="overflow-x-auto -mx-4">
    <table className="w-full">
      <thead className="bg-gray-50 border-y border-gray-200"><tr>{head}</tr></thead>
      <tbody className="divide-y divide-gray-100">{children}</tbody>
    </table>
  </div>
);

export const PAYMENT_LABELS = { cash: 'Naqd', card: 'Karta', transfer: "O'tkazma", debt: "Qarz qoldig'i" };
