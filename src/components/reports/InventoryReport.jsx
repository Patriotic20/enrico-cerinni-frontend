import { Link } from 'react-router-dom';
import { formatCurrency, formatNumber } from '../../utils/format';
import { cn } from '../../utils/cn';
import { toNumber, Kpi, KpiRow, Panel, Empty, ShareList, Th, Td, SimpleTable } from './shared';

// Days until the item runs out at the period's sales pace.
const daysLeft = (p) => (p.movement_velocity > 0 ? Math.floor(p.current_stock / p.movement_velocity) : null);

export const inventoryCsv = (data) => ({
  header: ['Holat', 'Mahsulot', 'Variant', 'Qoldiq', 'Sotildi (davr)', 'Kuniga', 'Necha kunga yetadi'],
  rows: [
    ...(data?.low_stock_products || []).map(p => ['Kam/tugagan', p.product_name, p.variant_name, p.current_stock, p.sold_quantity, p.movement_velocity, daysLeft(p) ?? '']),
    ...(data?.top_moving_products || []).map(p => ['Tez sotilayotgan', p.product_name, p.variant_name, p.current_stock, p.sold_quantity, p.movement_velocity, daysLeft(p) ?? '']),
  ],
});

const MovementTable = ({ rows }) => (
  <SimpleTable head={<><Th>Mahsulot</Th><Th right>Qoldiq</Th><Th right>Sotildi</Th><Th right>Yetadi</Th></>}>
    {rows.map(p => {
      const left = daysLeft(p);
      return (
        <tr key={`${p.product_id}-${p.variant_name}`} className="hover:bg-gray-50">
          <Td>
            <Link to={`/inventory/${p.product_id}`} className="font-medium text-gray-900 hover:text-blue-600">{p.product_name}</Link>
            <div className="text-xs text-gray-500">{p.variant_name}</div>
          </Td>
          <Td right className={cn('font-medium', p.current_stock <= 0 ? 'text-red-600' : 'text-gray-900')}>
            {p.current_stock <= 0 ? 'Tugagan' : p.current_stock}
          </Td>
          <Td right>{p.sold_quantity}</Td>
          <Td right className={cn(left !== null && left < 7 && 'text-red-600 font-medium')}>
            {left === null ? '—' : `${left} kun`}
          </Td>
        </tr>
      );
    })}
  </SimpleTable>
);

const InventoryReport = ({ data }) => {
  const m = data?.metrics || {};
  const low = data?.low_stock_products || [];
  const top = data?.top_moving_products || [];

  return (
    <div className="space-y-4">
      <KpiRow>
        <Kpi label="Mahsulotlar" value={formatNumber(m.total_products)} hint={`${formatNumber(m.total_variants)} ta variant`} />
        <Kpi label="Kam qolgan" value={formatNumber(m.low_stock_items)} tone={m.low_stock_items ? 'bad' : undefined} hint="Minimal darajada yoki past" />
        <Kpi label="Tugagan" value={formatNumber(m.out_of_stock_items)} tone={m.out_of_stock_items ? 'bad' : undefined} />
        <Kpi label="Zaxira qiymati" value={formatCurrency(toNumber(m.total_inventory_value))} hint="Sotuv narxida" />
      </KpiRow>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Panel title="To'ldirish kerak" subtitle="Tugagan va kam qolgan variantlar; «Yetadi» — davrdagi sotuv sur'atida">
          {low.length ? <MovementTable rows={low} /> : <Empty>Hamma variant yetarli</Empty>}
        </Panel>
        <Panel title="Eng tez sotilayotganlar" subtitle="Tanlangan davrda sotilgan dona bo'yicha">
          {top.length ? <MovementTable rows={top} /> : <Empty />}
        </Panel>
      </div>

      <Panel title="Qoldiq kategoriyalar bo'yicha" subtitle="Ombordagi dona">
        <ShareList format={(v) => `${formatNumber(v)} dona`}
          rows={Object.entries(data?.inventory_by_category || {}).map(([k, v]) => ({ label: k, value: v }))} />
      </Panel>
    </div>
  );
};

export default InventoryReport;
