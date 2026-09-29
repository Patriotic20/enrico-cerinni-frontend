import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { formatCurrency } from '../../utils/format';
import { cn } from '../../utils/cn';
import {
  toNumber, shortMoney, AXIS, GRID, BLUE,
  Kpi, KpiRow, Panel, Empty, ShareList, ChartTooltip, Th, Td, SimpleTable, PAYMENT_LABELS
} from './shared';

const ORANGE = '#f97316';

const EXPENSE_LABELS = {
  suppliers: 'Yetkazib beruvchilar', salaries: 'Ish haqi', rent: 'Ijara',
  utilities: 'Kommunal', marketing: 'Marketing', other: 'Boshqa',
};

export const financeCsv = (data) => ({
  header: ['Oy', 'Tushum', 'Xarajat', 'Foyda'],
  rows: (data?.monthly_data || []).map(r => [r.month, toNumber(r.revenue), toNumber(r.expenses), toNumber(r.profit)]),
});

const FinanceReport = ({ data }) => {
  const m = data?.metrics || {};
  const profit = toNumber(m.net_profit);
  const margin = toNumber(m.profit_margin);
  const monthly = (data?.monthly_data || []).map(r => ({
    month: r.month, revenue: toNumber(r.revenue), expenses: toNumber(r.expenses), profit: toNumber(r.profit),
  }));
  const pm = data?.payment_methods || {};

  return (
    <div className="space-y-4">
      <KpiRow>
        <Kpi label="Tushum" value={formatCurrency(toNumber(m.total_revenue))} />
        <Kpi label="Xarajatlar" value={formatCurrency(toNumber(m.total_expenses))} hint="Ish haqi va xaridlar bilan" />
        <Kpi label="Sof foyda" value={formatCurrency(profit)} tone={profit < 0 ? 'bad' : 'good'} />
        <Kpi label="Foyda marjasi" value={`${margin.toFixed(1)}%`} tone={margin < 0 ? 'bad' : undefined} hint="Foyda / tushum" />
        <Kpi label="Qarz qoldig'i" value={formatCurrency(toNumber(pm.debt))} hint="Davrdagi to'lanmagan sotuvlar" />
      </KpiRow>

      <Panel title="Oylik tushum va xarajat" subtitle="Oxirgi 6 oy — davr tanlovidan qat'i nazar">
        {monthly.some(r => r.revenue || r.expenses) ? (
          <>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthly} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barGap={2}>
                  <CartesianGrid {...GRID} />
                  <XAxis dataKey="month" {...AXIS} />
                  <YAxis {...AXIS} width={48} tickFormatter={shortMoney} />
                  <Tooltip cursor={{ fill: '#f3f4f6' }} content={<ChartTooltip format={(v) => formatCurrency(v)} />} />
                  <Legend iconType="square" iconSize={10} wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="revenue" name="Tushum" fill={BLUE} radius={[4, 4, 0, 0]} maxBarSize={32} />
                  <Bar dataKey="expenses" name="Xarajat" fill={ORANGE} radius={[4, 4, 0, 0]} maxBarSize={32} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3">
              <SimpleTable head={<><Th>Oy</Th><Th right>Tushum</Th><Th right>Xarajat</Th><Th right>Foyda</Th></>}>
                {[...monthly].reverse().map(r => (
                  <tr key={r.month}>
                    <Td className="text-gray-700">{r.month}</Td>
                    <Td right>{formatCurrency(r.revenue)}</Td>
                    <Td right>{formatCurrency(r.expenses)}</Td>
                    <Td right className={cn('font-medium', r.profit < 0 ? 'text-red-600' : 'text-green-700')}>{formatCurrency(r.profit)}</Td>
                  </tr>
                ))}
              </SimpleTable>
            </div>
          </>
        ) : <Empty />}
      </Panel>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel title="Xarajatlar tarkibi">
          <ShareList format={formatCurrency}
            rows={Object.entries(data?.expense_breakdown || {}).map(([k, v]) => ({ label: EXPENSE_LABELS[k] || k, value: toNumber(v) }))} />
        </Panel>
        <Panel title="Tushum to'lov turlari bo'yicha">
          <ShareList format={formatCurrency}
            rows={['cash', 'card', 'transfer'].map(k => ({ label: PAYMENT_LABELS[k], value: toNumber(pm[k]) }))} />
        </Panel>
      </div>
    </div>
  );
};

export default FinanceReport;
