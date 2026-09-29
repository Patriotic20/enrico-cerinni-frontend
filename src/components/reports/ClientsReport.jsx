import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatCurrency, formatNumber } from '../../utils/format';
import { toNumber, AXIS, GRID, BLUE, Kpi, KpiRow, Panel, Empty, ShareList, ChartTooltip, Th, Td, SimpleTable } from './shared';

const SEGMENT_LABELS = {
  new: 'Yangi (davrda qo\'shilgan)',
  active: 'Faol (davrda xarid qilgan)',
  inactive: 'Nofaol (avval xarid qilgan)',
  never_bought: 'Hali xarid qilmagan',
};

export const clientsCsv = (data) => ({
  header: ['#', 'Mijoz', 'Telefon', 'Xaridlar soni', 'Jami summa', 'Oxirgi xarid'],
  rows: (data?.top_clients || []).map((c, i) => [
    i + 1, c.client_name, c.phone || '', c.order_count, toNumber(c.total_purchases),
    new Date(c.last_purchase_date).toLocaleDateString('uz-UZ'),
  ]),
});

const ClientsReport = ({ data }) => {
  const m = data?.metrics || {};
  const top = data?.top_clients || [];
  const trend = data?.client_acquisition_trend || [];

  return (
    <div className="space-y-4">
      <KpiRow>
        <Kpi label="Jami mijozlar" value={formatNumber(m.total_clients)} />
        <Kpi label="Faol" value={formatNumber(m.active_clients)} hint="Davrda xarid qilgan" />
        <Kpi label="Yangi" value={formatNumber(m.new_clients)} hint="Davrda qo'shilgan" />
        <Kpi label="O'rtacha chek" value={formatCurrency(toNumber(m.avg_order_value))} hint="Mijozli sotuvlar" />
        <Kpi label="Mijoz qiymati" value={formatCurrency(toNumber(m.customer_lifetime_value))} hint="Bir mijozning jami xaridi" />
      </KpiRow>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Panel title="Eng yaxshi mijozlar" subtitle="Davrdagi xarid summasi bo'yicha, top 10" className="xl:col-span-2">
          {top.length ? (
            <SimpleTable head={<><Th>#</Th><Th>Mijoz</Th><Th right>Xaridlar</Th><Th right>Summa</Th><Th right>Oxirgi</Th></>}>
              {top.map((c, i) => (
                <tr key={c.client_id} className="hover:bg-gray-50">
                  <Td className="text-gray-500 w-8">{i + 1}</Td>
                  <Td>
                    <div className="font-medium text-gray-900">{c.client_name}</div>
                    {c.phone && <div className="text-xs text-gray-500">{c.phone}</div>}
                  </Td>
                  <Td right>{c.order_count}</Td>
                  <Td right className="font-medium text-gray-900">{formatCurrency(toNumber(c.total_purchases))}</Td>
                  <Td right className="text-gray-600">{new Date(c.last_purchase_date).toLocaleDateString('uz-UZ')}</Td>
                </tr>
              ))}
            </SimpleTable>
          ) : <Empty />}
        </Panel>

        <div className="space-y-4">
          <Panel title="Mijozlar holati">
            <ShareList format={(v) => `${v} ta`}
              rows={Object.entries(data?.clients_by_segment || {}).map(([k, v]) => ({ label: SEGMENT_LABELS[k] || k, value: v }))} />
          </Panel>
          <Panel title="Yangi mijozlar" subtitle="Oxirgi 6 oy">
            {trend.length ? (
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={trend} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
                    <CartesianGrid {...GRID} />
                    <XAxis dataKey="month" {...AXIS} />
                    <YAxis {...AXIS} width={28} allowDecimals={false} />
                    <Tooltip cursor={{ fill: '#f3f4f6' }} content={<ChartTooltip format={(v) => `${v} ta`} />} />
                    <Bar dataKey="new_clients" name="Yangi" fill={BLUE} radius={[4, 4, 0, 0]} maxBarSize={28} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : <Empty />}
          </Panel>
        </div>
      </div>
    </div>
  );
};

export default ClientsReport;
