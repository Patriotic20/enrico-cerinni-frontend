import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatCurrency, formatNumber } from '../../utils/format';
import { cn } from '../../utils/cn';
import {
  toNumber, shortMoney, dayLabel, AXIS, GRID, BLUE,
  Kpi, KpiRow, Panel, Empty, ShareList, ChartTooltip, Th, Td, SimpleTable, PAYMENT_LABELS
} from './shared';

export const salesCsv = (data) => ({
  header: ['#', 'Mahsulot', 'Variant', 'Sotildi (dona)', 'Tushum'],
  rows: (data?.top_products || []).map((p, i) => [i + 1, p.product_name, p.variant_name, p.sales_count, toNumber(p.total_revenue)]),
});

const SalesReport = ({ data }) => {
  const [metric, setMetric] = useState('revenue');
  const m = data?.metrics || {};
  const revenue = toNumber(m.total_revenue);
  const trend = (data?.sales_trend || []).map(p => ({
    date: p.date, revenue: toNumber(p.revenue), sales: toNumber(p.sales_count),
  }));
  const products = data?.top_products || [];
  const topRevenue = Math.max(...products.map(p => toNumber(p.total_revenue)), 1);
  const isRevenue = metric === 'revenue';
  const fmt = (v) => (isRevenue ? formatCurrency(v) : `${v} ta`);
  const salesDays = trend.filter(d => d.sales > 0).length;

  return (
    <div className="space-y-4">
      <KpiRow>
        <Kpi label="Tushum" value={formatCurrency(revenue)}
          hint={salesDays ? `Kuniga o'rtacha ${formatCurrency(revenue / trend.length)}` : null} />
        <Kpi label="Sotuvlar" value={formatNumber(m.total_sales)} hint={`${formatNumber(m.items_sold)} dona mahsulot`} />
        <Kpi label="O'rtacha chek" value={formatCurrency(toNumber(m.avg_order_value))}
          hint={m.total_sales ? `${(m.items_sold / m.total_sales).toFixed(1)} dona / chek` : null} />
        <Kpi label="Xaridorlar" value={formatNumber(m.unique_clients)} hint="Ro'yxatdagi mijozlar" />
        <Kpi label="Qarz qoldig'i" value={formatCurrency(toNumber(m.outstanding))}
          tone={toNumber(m.outstanding) > 0 ? 'bad' : undefined}
          hint={revenue ? `Tushumning ${Math.round((toNumber(m.outstanding) / revenue) * 100)}%` : null} />
      </KpiRow>

      <Panel
        title={isRevenue ? 'Kunlik tushum' : 'Kunlik sotuvlar soni'}
        subtitle={`${trend.length} kun, ${salesDays} kunda sotuv bo'lgan`}
        action={
          <div className="inline-flex rounded-lg bg-gray-100 p-0.5 text-sm">
            {[['revenue', 'Tushum'], ['sales', 'Soni']].map(([k, label]) => (
              <button key={k} type="button" onClick={() => setMetric(k)}
                className={cn('px-3 py-1 rounded-md', metric === k ? 'bg-white shadow-sm font-medium text-gray-900' : 'text-gray-600')}>
                {label}
              </button>
            ))}
          </div>
        }
      >
        {trend.length ? (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid {...GRID} />
                <XAxis dataKey="date" tickFormatter={dayLabel} {...AXIS} minTickGap={16} />
                <YAxis {...AXIS} width={48} allowDecimals={false} tickFormatter={isRevenue ? shortMoney : undefined} />
                <Tooltip cursor={{ fill: '#f3f4f6' }}
                  content={<ChartTooltip labelFormat={dayLabel} format={(v) => fmt(v)} />} />
                <Bar dataKey={metric} name={isRevenue ? 'Tushum' : 'Sotuvlar'} fill={BLUE} radius={[4, 4, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : <Empty />}
      </Panel>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Panel title="Eng ko'p sotilgan mahsulotlar" subtitle="Sotilgan dona bo'yicha, top 10" className="xl:col-span-2">
          {products.length ? (
            <SimpleTable head={<><Th>#</Th><Th>Mahsulot</Th><Th right>Dona</Th><Th right>Tushum</Th></>}>
              {products.map((p, i) => (
                <tr key={`${p.product_id}-${p.variant_name}`} className="hover:bg-gray-50">
                  <Td className="text-gray-500 w-8">{i + 1}</Td>
                  <Td>
                    <div className="font-medium text-gray-900">{p.product_name}</div>
                    <div className="text-xs text-gray-500">{p.variant_name}</div>
                  </Td>
                  <Td right>{p.sales_count}</Td>
                  <Td right className="w-48">
                    <div className="font-medium text-gray-900">{formatCurrency(toNumber(p.total_revenue))}</div>
                    <div className="mt-1 h-1 rounded-full bg-gray-100">
                      <div className="h-1 rounded-full bg-blue-500 ml-auto" style={{ width: `${(toNumber(p.total_revenue) / topRevenue) * 100}%` }} />
                    </div>
                  </Td>
                </tr>
              ))}
            </SimpleTable>
          ) : <Empty />}
        </Panel>

        <div className="space-y-4">
          <Panel title="To'lov turlari">
            <ShareList format={formatCurrency}
              rows={Object.entries(data?.sales_by_payment_method || {}).map(([k, v]) => ({ label: PAYMENT_LABELS[k] || k, value: toNumber(v) }))} />
          </Panel>
          <Panel title="Kategoriyalar">
            <ShareList format={formatCurrency}
              rows={Object.entries(data?.sales_by_category || {}).map(([k, v]) => ({ label: k, value: toNumber(v) }))} />
          </Panel>
        </div>
      </div>
    </div>
  );
};

export default SalesReport;
