/**
 * Performance Report Component
 *
 * Period-over-period business performance: growth, margin trend, inventory
 * turnover and customer retention.
 */

import { TrendingUp, TrendingDown, Minus, Repeat, Users, Percent } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { Card } from '../ui';
import { formatCurrency } from '../../utils/format';

const toNumber = (value) => {
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

// Every metric is a period-over-period comparison, so the sign carries meaning.
const DeltaCard = ({ title, value, suffix = '%', hint, icon: Icon }) => {
  const numeric = toNumber(value);
  const Arrow = numeric > 0 ? TrendingUp : numeric < 0 ? TrendingDown : Minus;
  const tone = numeric > 0 ? 'text-green-600' : numeric < 0 ? 'text-red-600' : 'text-gray-500';

  return (
    <Card className="p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <div className={`flex items-center gap-1 mt-1 ${tone}`}>
            <Arrow size={18} />
            <p className="text-2xl font-bold">
              {numeric > 0 ? '+' : ''}{numeric.toFixed(2)}{suffix}
            </p>
          </div>
          {hint && <p className="text-xs text-gray-500 mt-1">{hint}</p>}
        </div>
        {Icon && <Icon className="text-gray-400" size={22} />}
      </div>
    </Card>
  );
};

const PlainCard = ({ title, value, hint, icon: Icon }) => (
  <Card className="p-6">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        {hint && <p className="text-xs text-gray-500 mt-1">{hint}</p>}
      </div>
      {Icon && <Icon className="text-gray-400" size={22} />}
    </div>
  </Card>
);

const PerformanceReport = ({ data = {} }) => {
  const metrics = data?.metrics || {};
  const monthly = (data?.monthly_performance || []).map((row) => ({
    month: row.month,
    revenue: toNumber(row.revenue),
    revenue_growth: toNumber(row.revenue_growth),
    sales_growth: toNumber(row.sales_growth),
  }));

  const GrowthTooltip = ({ active, payload, label }) => {
    if (!active || !payload || payload.length === 0) return null;
    const row = payload[0].payload;
    return (
      <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
        <p className="text-sm font-medium text-gray-900 mb-1">{label}</p>
        <p className="text-sm text-gray-700">{formatCurrency(row.revenue)}</p>
        <p className="text-sm text-blue-600">Daromad o'sishi: {row.revenue_growth}%</p>
        <p className="text-sm text-green-600">Sotuv o'sishi: {row.sales_growth}%</p>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <DeltaCard
          title="Daromad o'sishi"
          value={metrics.revenue_growth_rate}
          hint="Oldingi shu uzunlikdagi davrga nisbatan"
          icon={TrendingUp}
        />
        <DeltaCard
          title="Sotuvlar o'sishi"
          value={metrics.sales_growth_rate}
          hint="Sotuvlar soni bo'yicha"
          icon={TrendingUp}
        />
        <DeltaCard
          title="Foyda marjasi o'zgarishi"
          value={metrics.profit_margin_trend}
          suffix=" p.p."
          hint="Foiz punktlarida"
          icon={Percent}
        />
        <PlainCard
          title="Zaxira aylanishi"
          value={toNumber(metrics.inventory_turnover).toFixed(2)}
          hint="Sotilgan tovar tannarxi / ombor qiymati"
          icon={Repeat}
        />
        <PlainCard
          title="Mijozlarni ushlab qolish"
          value={`${toNumber(metrics.customer_retention_rate).toFixed(2)}%`}
          hint="Oldingi davr xaridorlaridan qaytganlari"
          icon={Users}
        />
      </div>

      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900">Oylik o'sish dinamikasi</h3>
        <p className="text-sm text-gray-600 mt-1 mb-4">
          Har bir oy oldingi oyga nisbatan, oxirgi 6 oy
        </p>

        {/* ResponsiveContainer sizes against its parent, so it sits directly
            inside the element that carries the height. */}
        <div className="h-72">
          {monthly.length === 0 ? (
            <div className="h-full bg-gray-50 rounded-lg flex items-center justify-center">
              <p className="text-gray-500">Ma'lumot yo'q</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthly} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#6b7280' }} />
                <YAxis
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                  tickFormatter={(value) => `${value}%`}
                />
                <Tooltip content={<GrowthTooltip />} />
                <Legend />
                <Bar dataKey="revenue_growth" name="Daromad o'sishi" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="sales_growth" name="Sotuv o'sishi" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>
    </div>
  );
};

export default PerformanceReport;
