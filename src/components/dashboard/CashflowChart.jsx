import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { formatCurrency, compactAmount } from '../../utils/format';
import TimePeriodSelector from './TimePeriodSelector';

export default function CashflowChart({ data = [], selectedPeriod = '1month', loading = false, onPeriodChange }) {
  // Default sample data if no data provided
  const defaultData = [
    { month: 'Yan', income: 850000, expenses: 450000, netFlow: 400000 },
    { month: 'Fev', income: 920000, expenses: 480000, netFlow: 440000 },
    { month: 'Mar', income: 780000, expenses: 520000, netFlow: 260000 },
    { month: 'Apr', income: 1150000, expenses: 490000, netFlow: 660000 },
    { month: 'May', income: 1050000, expenses: 510000, netFlow: 540000 },
    { month: 'Iyun', income: 1200000, expenses: 530000, netFlow: 670000 },
    { month: 'Iyul', income: 1100000, expenses: 550000, netFlow: 550000 },
  ];

  const chartData = data.length > 0 ? data : defaultData;

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="text-sm font-medium text-gray-900 mb-2">{`${label}`}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {`${entry.name}: ${formatCurrency(entry.value)}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-200">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 mb-2">
        <h2 className="text-sm font-semibold text-gray-900">Pul oqimi tahlili</h2>
        <div className="flex flex-wrap items-center gap-2">
          {onPeriodChange && (
            <TimePeriodSelector 
              selectedPeriod={selectedPeriod}
              onPeriodChange={onPeriodChange}
            />
          )}
          <div className="flex items-center gap-2 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-gray-600">Tushum</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              <span className="text-gray-600">Xarajat</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span className="text-gray-600">Sof oqim</span>
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
            <LineChart data={chartData} margin={{ top: 5, right: 5, left: -5, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="month" 
                tick={{ fontSize: 10, fill: '#6b7280' }}
                axisLine={{ stroke: '#e5e7eb' }}
              />
              <YAxis 
                tick={{ fontSize: 10, fill: '#6b7280' }}
                axisLine={{ stroke: '#e5e7eb' }}
                tickFormatter={compactAmount}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line 
                type="monotone" 
                dataKey="income" 
                stroke="#10b981" 
                strokeWidth={2}
                dot={{ fill: '#10b981', strokeWidth: 1, r: 2 }}
                name="Tushum"
                animationDuration={800}
              />
              <Line 
                type="monotone" 
                dataKey="expenses" 
                stroke="#ef4444" 
                strokeWidth={2}
                dot={{ fill: '#ef4444', strokeWidth: 1, r: 2 }}
                name="Xarajat"
                animationDuration={800}
              />
              <Line 
                type="monotone" 
                dataKey="netFlow" 
                stroke="#3b82f6" 
                strokeWidth={2}
                dot={{ fill: '#3b82f6', strokeWidth: 1, r: 2 }}
                name="Sof oqim"
                animationDuration={800}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
