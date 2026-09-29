import { Card } from '../ui/Card';
import { cn } from '../../utils/cn';
import { ymd } from '../../hooks/useSales';

// KPI periods always have both ends: "Bu oy" runs to the month's last day so
// plan completion is measured against the whole month's plan.
export const kpiPresets = () => {
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth(), d = now.getDate();
  return [
    { label: 'Bugun', start: ymd(now), end: ymd(now) },
    { label: '7 kun', start: ymd(new Date(y, m, d - 6)), end: ymd(now) },
    { label: 'Bu oy', start: ymd(new Date(y, m, 1)), end: ymd(new Date(y, m + 1, 0)) },
    { label: "O'tgan oy", start: ymd(new Date(y, m - 1, 1)), end: ymd(new Date(y, m, 0)) },
    { label: 'Bu yil', start: ymd(new Date(y, 0, 1)), end: ymd(new Date(y, 11, 31)) },
  ];
};

export const defaultPeriod = () => kpiPresets()[2];

const control = 'h-9 rounded-lg border border-gray-200 bg-white px-2 text-sm text-gray-800 focus:outline-none focus:border-blue-500';

export const PeriodPicker = ({ period, onChange }) => (
  <div className="flex flex-wrap items-center gap-2">
    <div className="inline-flex rounded-lg bg-gray-100 p-0.5">
      {kpiPresets().map(p => {
        const active = period.start === p.start && period.end === p.end;
        return (
          <button
            key={p.label}
            type="button"
            onClick={() => onChange(p)}
            className={cn(
              'px-3 py-1.5 text-sm rounded-md transition-colors',
              active ? 'bg-white text-gray-900 font-medium shadow-sm' : 'text-gray-600 hover:text-gray-900'
            )}
          >
            {p.label}
          </button>
        );
      })}
    </div>
    <div className="flex items-center gap-1.5 text-sm text-gray-500">
      <input type="date" value={period.start} max={period.end} aria-label="Boshlanish sanasi"
        onChange={(e) => e.target.value && onChange({ label: '', start: e.target.value, end: period.end })}
        className={control} />
      <span>—</span>
      <input type="date" value={period.end} min={period.start} aria-label="Tugash sanasi"
        onChange={(e) => e.target.value && onChange({ label: '', start: period.start, end: e.target.value })}
        className={control} />
    </div>
  </div>
);

const TONES = {
  gray: 'bg-gray-100 text-gray-600',
  blue: 'bg-blue-100 text-blue-600',
  green: 'bg-green-100 text-green-600',
  orange: 'bg-orange-100 text-orange-600',
  red: 'bg-red-100 text-red-600',
  purple: 'bg-purple-100 text-purple-600',
};

export const Kpi = ({ icon: Icon, label, value, hint, tone = 'gray', children }) => (
  <Card className="p-4">
    <div className="flex items-center gap-2 text-xs font-medium text-gray-500">
      <span className={cn('w-7 h-7 rounded-md flex items-center justify-center', TONES[tone])}>
        <Icon size={15} />
      </span>
      {label}
    </div>
    <div className="mt-2 text-lg font-semibold text-gray-900 tabular-nums truncate" title={String(value)}>{value}</div>
    {hint && <div className="text-xs text-gray-500 mt-0.5">{hint}</div>}
    {children}
  </Card>
);

// <70% behind, <100% close, >=100% done.
export const planTone = (pct) =>
  pct == null ? 'bg-gray-300' : pct >= 100 ? 'bg-green-500' : pct >= 70 ? 'bg-amber-500' : 'bg-red-500';

export const PlanBar = ({ pct, className }) => (
  <div className={cn('h-1.5 rounded-full bg-gray-100 overflow-hidden', className)}>
    <div className={cn('h-full rounded-full', planTone(pct))} style={{ width: `${Math.min(pct || 0, 100)}%` }} />
  </div>
);

export const initials = (name = '') =>
  name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');

export const MEDALS = { 1: '🥇', 2: '🥈', 3: '🥉' };
