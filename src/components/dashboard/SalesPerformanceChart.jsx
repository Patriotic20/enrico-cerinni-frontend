import { useMemo } from 'react';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { formatCurrency, compactAmount } from '../../utils/format';
import TimePeriodSelector from './TimePeriodSelector';

export default function SalesPerformanceChart({ data = [], selectedPeriod = '1month', loading = false, onPeriodChange }) {
  // Default sample data if no data provided
  const defaultData = [
    { month: 'Yan', sales: 850000, orders: 45, avgOrder: 18889, growth: 12 },
    { month: 'Fev', sales: 920000, orders: 52, avgOrder: 17692, growth: 8 },
    { month: 'Mar', sales: 780000, orders: 38, avgOrder: 20526, growth: -15 },
    { month: 'Apr', sales: 1150000, orders: 58, avgOrder: 19828, growth: 47 },
    { month: 'May', sales: 1050000, orders: 55, avgOrder: 19091, growth: -9 },
    { month: 'Iyun', sales: 1200000, orders: 62, avgOrder: 19355, growth: 14 },
    { month: 'Iyul', sales: 1100000, orders: 56, avgOrder: 19643, growth: -8 },
  ];

  const chartData = data.length > 0 ? data : defaultData;

  const { totalSales, totalOrders, avgOrder } = useMemo(() => ({
    totalSales: chartData.reduce((acc, item) => acc + (item.sales || 0), 0),
    totalOrders: chartData.reduce((acc, item) => acc + (item.orders || 0), 0),
    avgOrder: chartData.length > 0
      ? chartData.reduce((acc, item) => acc + (item.avgOrder || 0), 0) / chartData.length
      : 0,
  }), [chartData]);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0]?.payload;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="text-sm font-medium text-gray-900 mb-2">{`${label}`}</p>
          <p className="text-sm text-blue-600">
            {`Sotuvlar: ${formatCurrency(data?.sales || 0)}`}
          </p>
          <p className="text-sm text-green-600">
            {`Buyurtmalar: ${data?.orders || 0} ta`}
          </p>
          <p className="text-sm text-purple-600">
            {`O'rtacha: ${formatCurrency(data?.avgOrder || 0)}`}
          </p>
          <p className="text-sm text-orange-600">
            {`O'sish: ${data?.growth > 0 ? '+' : ''}${data?.growth || 0}%`}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-200">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 mb-2">
        <h2 className="text-sm font-semibold text-gray-900">Sotuv ko'rsatkichlari</h2>
        <div className="flex flex-wrap items-center gap-2">
          {onPeriodChange && (
            <TimePeriodSelector 
              selectedPeriod={selectedPeriod}
              onPeriodChange={onPeriodChange}
            />
          )}
          <div className="flex items-center gap-2 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span className="text-gray-600">Sotuvlar</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-gray-600">Buyurtmalar</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
              <span className="text-gray-600">O'sish %</span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="relative h-44">
        {/* Loading Overlay */}
        {loading && (
          <div className="absolute inset-0 bg-white bg-opacity-70 flex items-center justify-center z-10 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span className="text-sm text-gray-600 font-medium">Ma'lumotlar yuklanmoqda...</span>
            </div>
          </div>
        )}
        
        <div className={`h-full transition-opacity duration-300 ${loading ? 'opacity-50' : 'opacity-100'}`}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 5, right: 5, left: -5, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="month" 
                tick={{ fontSize: 10, fill: '#6b7280' }}
                axisLine={{ stroke: '#e5e7eb' }}
              />
              <YAxis 
                yAxisId="left"
                tick={{ fontSize: 10, fill: '#6b7280' }}
                axisLine={{ stroke: '#e5e7eb' }}
                tickFormatter={compactAmount}
              />
              <YAxis 
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 10, fill: '#6b7280' }}
                axisLine={{ stroke: '#e5e7eb' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar 
                yAxisId="left"
                dataKey="sales" 
                fill="#3b82f6" 
                name="Sotuvlar"
                radius={[2, 2, 0, 0]}
                animationDuration={800}
              />
              <Bar 
                yAxisId="right"
                dataKey="orders" 
                fill="#10b981" 
                name="Buyurtmalar"
                radius={[2, 2, 0, 0]}
                animationDuration={800}
              />
              <Line 
                yAxisId="right"
                type="monotone" 
                dataKey="growth" 
                stroke="#f97316" 
                strokeWidth={2}
                dot={{ fill: '#f97316', strokeWidth: 1, r: 2 }}
                name="O'sish %"
                animationDuration={800}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      {/* Performance Summary */}
      <div className="mt-2 pt-2 border-t border-gray-100 flex justify-between gap-2 text-xs text-gray-500">
        <span>Sotuv: <b className="text-blue-600">{formatCurrency(totalSales)}</b></span>
        <span>Buyurtma: <b className="text-green-600">{totalOrders}</b></span>
        <span>O'rtacha: <b className="text-purple-600">{formatCurrency(avgOrder)}</b></span>
      </div>
    </div>
  );
}
