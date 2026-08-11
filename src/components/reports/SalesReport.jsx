/**
 * Sales Report Component
 * 
 * Detailed sales analytics with charts, metrics, and data tables.
 * Includes sales trends, top products, and performance metrics.
 */

import { useState } from 'react';
import {
  TrendingUp,
  ShoppingCart,
  Package,
  Users,
  Calendar,
  Download,
  FileText,
  DollarSign
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { Card, Button } from '../ui';
import { cn } from '../../utils/cn';
import { formatCurrency } from '../../utils/format';

// Decimal columns arrive from the API as strings, so every number has to be
// parsed before it reaches a chart or a toLocaleString call.
const toNumber = (value) => {
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const SalesReport = ({ data = {}, dateRange, onDateRangeChange }) => {
  const [selectedMetric, setSelectedMetric] = useState('revenue');

  const metrics = data?.metrics || {};

  const salesMetrics = {
    totalRevenue: toNumber(metrics.total_revenue),
    totalSales: toNumber(metrics.total_sales),
    avgOrderValue: toNumber(metrics.avg_order_value),
    conversionRate: toNumber(metrics.conversion_rate),
    topProducts: (data?.top_products || []).map(product => ({
      name: product.product_name,
      variant: product.variant_name,
      sales: toNumber(product.sales_count),
      revenue: toNumber(product.total_revenue)
    })),
    salesTrend: (data?.sales_trend || []).map(point => ({
      date: point.date,
      sales: toNumber(point.sales_count),
      revenue: toNumber(point.revenue)
    }))
  };

  const isRevenueMetric = selectedMetric === 'revenue';

  const formatTrendDate = (value) => {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return `${String(parsed.getDate()).padStart(2, '0')}.${String(parsed.getMonth() + 1).padStart(2, '0')}`;
  };

  const formatTrendValue = (value) =>
    isRevenueMetric ? formatCurrency(value) : `${value} ta`;

  const TrendTooltip = ({ active, payload, label }) => {
    if (!active || !payload || payload.length === 0) return null;

    return (
      <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
        <p className="text-sm font-medium text-gray-900 mb-1">{formatTrendDate(label)}</p>
        <p className="text-sm text-blue-600">{formatTrendValue(payload[0].value)}</p>
      </div>
    );
  };

  const MetricCard = ({ title, value, icon: Icon, color }) => (
    <Card className="p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
        <div className={cn(
          'w-12 h-12 rounded-lg flex items-center justify-center',
          color
        )}>
          <Icon size={24} className="text-white" />
        </div>
      </div>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <MetricCard
          title="Umumiy daromad"
          value={formatCurrency(salesMetrics.totalRevenue)}
          icon={DollarSign}
          color="bg-gradient-to-r from-green-500 to-green-600"
        />
        <MetricCard
          title="Sotuvlar soni"
          value={salesMetrics.totalSales.toLocaleString()}
          icon={ShoppingCart}
          color="bg-gradient-to-r from-blue-500 to-blue-600"
        />
        <MetricCard
          title="O'rtacha buyurtma"
          value={formatCurrency(salesMetrics.avgOrderValue)}
          icon={Package}
          color="bg-gradient-to-r from-purple-500 to-purple-600"
        />
        <MetricCard
          title="Konversiya"
          value={`${salesMetrics.conversionRate}%`}
          icon={Users}
          color="bg-gradient-to-r from-orange-500 to-orange-600"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Sales Trend Chart */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Sotuv tendensiyasi
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Tanlangan davrdagi kunlik sotuv ko'rsatkichlari
              </p>
            </div>
            <div className="flex items-center gap-2">
              <select 
                className="text-sm border border-gray-300 rounded-lg px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={selectedMetric}
                onChange={(e) => setSelectedMetric(e.target.value)}
              >
                <option value="revenue">Daromad</option>
                <option value="sales">Sotuvlar</option>
              </select>
              <Button variant="outline" size="sm">
                <Download size={16} />
              </Button>
            </div>
          </div>
          
          {/* ResponsiveContainer sizes itself against its parent, so it must sit
              directly inside the element that carries the height. */}
          <div className="h-64">
            {salesMetrics.salesTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={salesMetrics.salesTrend}
                  margin={{ top: 10, right: 20, left: 10, bottom: 5 }}
                >
                  <defs>
                    <linearGradient id="salesTrendFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatTrendDate}
                    tick={{ fontSize: 12, fill: '#6b7280' }}
                    axisLine={{ stroke: '#e5e7eb' }}
                  />
                  <YAxis
                    tick={{ fontSize: 12, fill: '#6b7280' }}
                    axisLine={{ stroke: '#e5e7eb' }}
                    width={isRevenueMetric ? 60 : 40}
                    tickFormatter={(value) =>
                      isRevenueMetric ? `${(value / 1000000).toFixed(1)}M` : value
                    }
                  />
                  <Tooltip content={<TrendTooltip />} />
                  <Area
                    type="monotone"
                    dataKey={isRevenueMetric ? 'revenue' : 'sales'}
                    stroke="#3b82f6"
                    strokeWidth={2}
                    fill="url(#salesTrendFill)"
                    dot={{ fill: '#3b82f6', strokeWidth: 2, r: 3 }}
                    name={isRevenueMetric ? 'Daromad' : 'Sotuvlar'}
                    animationDuration={600}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full bg-gray-50 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <TrendingUp className="mx-auto text-gray-400 mb-2" size={48} />
                  <p className="text-gray-500">Tanlangan davrda sotuvlar yo'q</p>
                  <p className="text-xs text-gray-400 mt-1">Boshqa davrni tanlab ko'ring</p>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Top Products */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Eng ko'p sotilgan mahsulotlar
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Tanlangan davrdagi eng mashhur mahsulotlar
              </p>
            </div>
            <Button variant="outline" size="sm">
              <FileText size={16} />
            </Button>
          </div>

          <div className="space-y-4">
            {salesMetrics.topProducts.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-8">
                Tanlangan davrda sotuvlar yo'q
              </p>
            )}
            {salesMetrics.topProducts.map((product, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <span className="text-sm font-semibold text-blue-600">
                      {index + 1}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{product.name}</p>
                    <p className="text-sm text-gray-600">
                      {product.variant ? `${product.variant} • ` : ''}{product.sales} ta sotildi
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">
                    {formatCurrency(product.revenue)}
                  </p>
                  <p className="text-sm text-gray-600">daromad</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Detailed Sales Table */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Batafsil sotuv ma'lumotlari
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Barcha sotuvlarning to'liq ro'yxati
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Calendar size={16} />
              Filtr
            </Button>
            <Button variant="outline" size="sm">
              <FileText size={16} />
              Excel
            </Button>
            <Button size="sm">
              <Download size={16} />
              PDF
            </Button>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sotuv ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sana
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Mijoz
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Mahsulotlar
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Summa
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  To'lov usuli
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Holat
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                    #S{1000 + i}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    2024-01-{10 + i}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    Mijoz {i}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {Math.floor(Math.random() * 5) + 1} ta mahsulot
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {(Math.random() * 500000 + 50000).toLocaleString()} UZS
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {Math.random() > 0.5 ? 'Naqd' : 'Karta'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Bajarildi
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span>Ko'rsatilmoqda:</span>
            <select className="border border-gray-300 rounded px-2 py-1 text-sm">
              <option>10</option>
              <option>25</option>
              <option>50</option>
            </select>
            <span>dan 1-10 gacha, jami 156 ta</span>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled>
              Oldingi
            </Button>
            <Button variant="outline" size="sm" className="bg-blue-50 text-blue-600 border-blue-200">
              1
            </Button>
            <Button variant="outline" size="sm">
              2
            </Button>
            <Button variant="outline" size="sm">
              3
            </Button>
            <Button variant="outline" size="sm">
              Keyingi
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default SalesReport;
