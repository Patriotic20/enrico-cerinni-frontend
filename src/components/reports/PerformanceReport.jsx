import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { formatCurrency } from '../../utils/format';
import { cn } from '../../utils/cn';
import { toNumber, shortMoney, AXIS, GRID, BLUE, Kpi, KpiRow, Panel, Empty, ChartTooltip, Th, Td, SimpleTable } from './shared';

const signed = (v, unit = '%') => `${v > 0 ? '+' : ''}${v.toFixed(1)}${unit}`;
const tone = (v) => (v > 0 ? 'good' : v < 0 ? 'bad' : undefined);

export const performanceCsv = (data) => ({
  header: ['Oy', 'Tushum', "Tushum o'sishi %", "Sotuvlar o'sishi %"],
  rows: (data?.monthly_performance || []).map(r => [r.month, r.revenue, r.revenue_growth, r.sales_growth]),
});

const Delta = ({ value }) => (
  <span className={cn('inline-flex items-center gap-1', value > 0 ? 'text-green-700' : value < 0 ? 'text-red-600' : 'text-gray-500')}>
    {value > 0 ? <TrendingUp size={13} /> : value < 0 ? <TrendingDown size={13} /> : null}
    {signed(value)}
  </span>
);

const PerformanceReport = ({ data }) => {
  const m = data?.metrics || {};
  const monthly = (data?.monthly_performance || []).map(r => ({ ...r, revenue: toNumber(r.revenue) }));
  const n = (k) => toNumber(m[k]);

  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-500 m-0">Tanlangan davr xuddi shu uzunlikdagi oldingi davr bilan solishtiriladi.</p>
      <KpiRow>
        <Kpi label="Tushum o'sishi" value={signed(n('revenue_growth_rate'))} tone={tone(n('revenue_growth_rate'))} />
        <Kpi label="Sotuvlar soni o'sishi" value={signed(n('sales_growth_rate'))} tone={tone(n('sales_growth_rate'))} />
        <Kpi label="Foyda marjasi o'zgarishi" value={signed(n('profit_margin_trend'), ' p.p.')} tone={tone(n('profit_margin_trend'))} />
        <Kpi label="Qaytgan mijozlar" value={`${n('customer_retention_rate').toFixed(0)}%`} hint="Oldingi davr xaridorlaridan" />
        <Kpi label="Zaxira aylanishi" value={`${n('inventory_turnover').toFixed(2)}×`} hint="Sotilgan tannarx / zaxira tannarxi" />
      </KpiRow>

      <Panel title="Oylik tushum" subtitle="Oxirgi 6 oy va oldingi oyga nisbatan o'zgarish">
        {monthly.length ? (
          <>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthly} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid {...GRID} />
                  <XAxis dataKey="month" {...AXIS} />
                  <YAxis {...AXIS} width={48} tickFormatter={shortMoney} />
                  <Tooltip cursor={{ fill: '#f3f4f6' }} content={<ChartTooltip format={(v) => formatCurrency(v)} />} />
                  <Bar dataKey="revenue" name="Tushum" fill={BLUE} radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3">
              <SimpleTable head={<><Th>Oy</Th><Th right>Tushum</Th><Th right>Tushum o'sishi</Th><Th right>Sotuvlar o'sishi</Th></>}>
                {[...monthly].reverse().map(r => (
                  <tr key={r.month}>
                    <Td className="text-gray-700">{r.month}</Td>
                    <Td right>{formatCurrency(r.revenue)}</Td>
                    <Td right><Delta value={toNumber(r.revenue_growth)} /></Td>
                    <Td right><Delta value={toNumber(r.sales_growth)} /></Td>
                  </tr>
                ))}
              </SimpleTable>
            </div>
          </>
        ) : <Empty />}
      </Panel>
    </div>
  );
};

export default PerformanceReport;
