import { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { formatCurrency } from '../../utils/format';
import TimePeriodSelector from './TimePeriodSelector';

export default function ExpenseBreakdownChart({ data = [], selectedPeriod = '1month', loading = false, onPeriodChange }) {
  const chartData = data;
  const totalExpenses = useMemo(
    () => chartData.reduce((acc, item) => acc + item.value, 0),
    [chartData]
  );
  // Copy before sort — Array.sort mutates, and chartData may be the live data prop
  const sortedExpenses = useMemo(
    () => [...chartData].sort((a, b) => b.value - a.value),
    [chartData]
  );

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      const percentage = ((data.value / totalExpenses) * 100).toFixed(1);
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="text-sm font-medium text-gray-900">{data.name}</p>
          <p className="text-sm text-gray-600">
            {`${formatCurrency(data.value)} (${percentage}%)`}
          </p>
        </div>
      );
    }
    return null;
  };

  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
    if (percent < 0.05) return null; // Don't show labels for slices smaller than 5%
    
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        fontSize={10}
        fontWeight="bold"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-200">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 mb-2">
        <h2 className="text-sm font-semibold text-gray-900">Xarajatlar taqsimoti</h2>
        <div className="flex flex-wrap items-center gap-2">
          {onPeriodChange && (
            <TimePeriodSelector 
              selectedPeriod={selectedPeriod}
              onPeriodChange={onPeriodChange}
            />
          )}
          <div className="text-right leading-tight">
            <p className="text-sm font-bold text-gray-900">{formatCurrency(totalExpenses)}</p>
            <p className="text-[10px] text-gray-500">Jami xarajatlar</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Pie Chart */}
        <div className="relative w-2/5 h-44 shrink-0">
          {/* Loading Overlay */}
          {loading && (
            <div className="absolute inset-0 bg-white bg-opacity-70 flex items-center justify-center z-10 rounded-lg">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            </div>
          )}

          {!loading && chartData.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center z-10 text-sm text-gray-500">
              Bu davrda ma'lumot yo'q
            </div>
          )}
          <div className={`h-full transition-opacity duration-300 ${loading ? 'opacity-50' : 'opacity-100'}`}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={renderCustomizedLabel}
                  innerRadius="45%"
                  outerRadius="95%"
                  dataKey="value"
                  animationDuration={800}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Legend with values, largest first; scrolls inside the card instead of growing it */}
        <ul className="flex-1 min-w-0 h-44 overflow-y-auto space-y-1 pr-1">
          {sortedExpenses.map((item, index) => (
            <li key={index} className="flex items-center justify-between gap-2 text-xs">
              <span className="flex items-center gap-1.5 min-w-0">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                <span className="truncate text-gray-700">{item.name}</span>
              </span>
              <span className="shrink-0 text-right">
                <b className="text-gray-900">{formatCurrency(item.value)}</b>
                <span className="text-gray-500 ml-1">{((item.value / totalExpenses) * 100).toFixed(0)}%</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
