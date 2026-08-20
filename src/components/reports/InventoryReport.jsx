/**
 * Inventory Report Component
 *
 * Inventory analytics including stock levels, product movement,
 * low stock alerts, and inventory valuation.
 */

import { Package, AlertTriangle, TrendingUp, XCircle } from 'lucide-react';
import { Card } from '../ui';
import { formatCurrency } from '../../utils/format';

const toNumber = (value) => {
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const MetricCard = ({ title, value, icon: Icon, color }) => (
  <Card className="p-6">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
      </div>
      <Icon className={color} size={24} />
    </div>
  </Card>
);

const ProductTable = ({ title, subtitle, rows, emptyText, valueLabel, valueOf }) => (
  <Card className="p-6">
    <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
    <p className="text-sm text-gray-600 mt-1 mb-4">{subtitle}</p>

    {rows.length === 0 ? (
      <p className="text-sm text-gray-500 text-center py-8">{emptyText}</p>
    ) : (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Mahsulot</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Variant</th>
              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Qoldiq</th>
              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">{valueLabel}</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {rows.map((row, index) => (
              <tr key={`${row.product_id}-${row.variant_name}-${index}`} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-medium text-gray-900">{row.product_name}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{row.variant_name}</td>
                <td className={`px-4 py-3 text-sm text-right font-semibold ${
                  toNumber(row.current_stock) === 0 ? 'text-red-600' : 'text-gray-900'
                }`}>
                  {toNumber(row.current_stock)} dona
                </td>
                <td className="px-4 py-3 text-sm text-right text-gray-900">{valueOf(row)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </Card>
);

const InventoryReport = ({ data = {} }) => {
  const metrics = data?.metrics || {};
  const lowStock = data?.low_stock_products || [];
  const topMoving = data?.top_moving_products || [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <MetricCard
          title="Jami mahsulotlar"
          value={`${toNumber(metrics.total_products).toLocaleString()} (${toNumber(metrics.total_variants).toLocaleString()} variant)`}
          icon={Package}
          color="text-blue-600"
        />
        <MetricCard
          title="Kam qolgan"
          value={`${toNumber(metrics.low_stock_items).toLocaleString()} ta`}
          icon={AlertTriangle}
          color="text-red-600"
        />
        <MetricCard
          title="Tugagan"
          value={`${toNumber(metrics.out_of_stock_items).toLocaleString()} ta`}
          icon={XCircle}
          color="text-orange-600"
        />
        <MetricCard
          title="Inventar qiymati"
          value={formatCurrency(toNumber(metrics.total_inventory_value))}
          icon={TrendingUp}
          color="text-green-600"
        />
      </div>

      <ProductTable
        title="Kam qolgan mahsulotlar"
        subtitle="Zaxirasi minimal darajadan past bo'lgan variantlar"
        rows={lowStock}
        emptyText="Kam qolgan mahsulot yo'q"
        valueLabel="Sotilgan"
        valueOf={(row) => `${toNumber(row.sold_quantity)} dona`}
      />

      <ProductTable
        title="Eng ko'p harakatdagi mahsulotlar"
        subtitle="Tanlangan davrda eng tez sotilgan variantlar"
        rows={topMoving}
        emptyText="Ma'lumot yo'q"
        valueLabel="Tezlik"
        valueOf={(row) => toNumber(row.movement_velocity).toFixed(2)}
      />
    </div>
  );
};

export default InventoryReport;
