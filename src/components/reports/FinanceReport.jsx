/**
 * Finance Report Component
 * 
 * Comprehensive financial analytics including revenue, expenses, profit margins,
 * and cash flow analysis with interactive charts and detailed breakdowns.
 */

import { useEffect, useState } from 'react';
import { 
  DollarSign,
  TrendingUp, 
  TrendingDown,
  CreditCard,
  PieChart,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Download,
  FileText,
  Wallet
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { Card, Button } from '../ui';
import { cn } from '../../utils/cn';
import { formatCurrency } from '../../utils/format';
import { dashboardAPI } from '../../api';

// Transaction amounts are always stored positive; the type says which way the
// money moved (see the dashboard service).
const INCOME_TYPES = ['sale', 'debt_payment'];

const TRANSACTION_LABELS = {
  sale: 'Sotuv',
  debt_payment: 'Qarz to\'lovi',
  purchase: 'Xarid',
  expense: 'Xarajat',
  refund: 'Qaytarish',
};

const EXPENSE_LABELS = {
  suppliers: 'Yetkazib beruvchilar',
  salaries: 'Maoshlar',
  rent: 'Ijara',
  utilities: 'Kommunal',
  marketing: 'Marketing',
  other: 'Boshqa',
};

const formatTxDate = (value) => {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '—' : parsed.toLocaleDateString('uz-UZ');
};

const FinanceReport = ({ data = {}, dateRange, onDateRangeChange }) => {
  // The finance report payload carries no transaction list, so the table used
  // to be filled with Math.random() rows that changed on every re-render.
  const [transactions, setTransactions] = useState([]);
  const [transactionsLoading, setTransactionsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setTransactionsLoading(true);
    dashboardAPI.getRecentTransactions(15)
      .then(res => {
        if (!cancelled && res?.success) setTransactions(res.data || []);
      })
      .catch(() => { if (!cancelled) setTransactions([]); })
      .finally(() => { if (!cancelled) setTransactionsLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [selectedView, setSelectedView] = useState('overview');

  // Everything below reads the /reports/finance payload. It used to be a
  // literal object of invented numbers (25.4M revenue against a real 185M),
  // which made the whole page authoritative-looking fiction.
  const metrics = data?.metrics || {};
  const breakdown = data?.expense_breakdown || {};
  const paymentMethods = data?.payment_methods || {};

  const pctOfRevenue = (value) =>
    financeData.totalRevenue > 0
      ? ((value / financeData.totalRevenue) * 100).toFixed(1)
      : '0.0';

  const num = (value) => {
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const financeData = {
    totalRevenue: num(metrics.total_revenue),
    totalExpenses: num(metrics.total_expenses),
    netProfit: num(metrics.net_profit),
    profitMargin: Number(num(metrics.profit_margin).toFixed(1)),
    cashFlow: num(metrics.cash_flow),
    expenses: {
      suppliers: num(breakdown.suppliers),
      salaries: num(breakdown.salaries),
      rent: num(breakdown.rent),
      utilities: num(breakdown.utilities),
      marketing: num(breakdown.marketing),
      other: num(breakdown.other),
    },
    monthlyData: (data?.monthly_data || []).map((row) => ({
      month: row.month,
      revenue: num(row.revenue),
      expenses: num(row.expenses),
      profit: num(row.profit),
    })),
    paymentMethods: {
      cash: num(paymentMethods.cash),
      card: num(paymentMethods.card),
      transfer: num(paymentMethods.transfer),
      debt: num(paymentMethods.debt),
    },
  };

  const MetricCard = ({ title, value, change, changeType, icon: Icon, color, subtitle }) => (
    <Card className="p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {subtitle && (
            <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
          )}
          {/* Only rendered when a real comparison is supplied. The values that
              used to sit here were hardcoded literals next to live amounts. */}
          {change && (
            <div className="flex items-center gap-1 mt-2">
              {changeType === 'increase' ? (
                <ArrowUpRight className="text-green-600" size={16} />
              ) : (
                <ArrowDownRight className="text-red-600" size={16} />
              )}
              <span className={cn(
                'text-sm font-medium',
                changeType === 'increase' ? 'text-green-600' : 'text-red-600'
              )}>
                {change}
              </span>
              <span className="text-sm text-gray-500">o'tgan oyga nisbatan</span>
            </div>
          )}
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

  const ExpenseBreakdown = () => (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Xarajatlar taqsimoti
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Asosiy xarajat kategoriyalari
          </p>
        </div>
        <Button variant="outline" size="sm">
          <PieChart size={16} />
        </Button>
      </div>

      <div className="space-y-4">
        {Object.entries(financeData.expenses).map(([category, amount], index) => {
          // Guard the division: with no expenses in the period this printed NaN%.
          const percentage = financeData.totalExpenses > 0
            ? ((amount / financeData.totalExpenses) * 100).toFixed(1)
            : '0.0';
          const colors = [
            'bg-blue-500',
            'bg-green-500',
            'bg-yellow-500',
            'bg-purple-500',
            'bg-red-500'
          ];
          
          return (
            <div key={category} className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1">
                <div className={cn('w-3 h-3 rounded-full', colors[index])}></div>
                <span className="text-sm font-medium text-gray-900 capitalize">
                  {EXPENSE_LABELS[category] || category}
                </span>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-gray-900">
                  {amount.toLocaleString()} UZS
                </p>
                <p className="text-xs text-gray-500">{percentage}%</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-gray-900">Jami xarajat</span>
          <span className="text-lg font-bold text-gray-900">
            {financeData.totalExpenses.toLocaleString()} UZS
          </span>
        </div>
      </div>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Key Financial Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <MetricCard
          title="Umumiy daromad"
          value={`${financeData.totalRevenue.toLocaleString()} UZS`}
          icon={DollarSign}
          color="bg-gradient-to-r from-green-500 to-green-600"
        />
        <MetricCard
          title="Umumiy xarajat"
          value={`${financeData.totalExpenses.toLocaleString()} UZS`}
          icon={CreditCard}
          color="bg-gradient-to-r from-red-500 to-red-600"
        />
        <MetricCard
          title="Sof foyda"
          value={`${financeData.netProfit.toLocaleString()} UZS`}
          icon={TrendingUp}
          color="bg-gradient-to-r from-blue-500 to-blue-600"
          subtitle={`${financeData.profitMargin}% foyda marjasi`}
        />
        <MetricCard
          title="Pul oqimi"
          value={`${financeData.cashFlow.toLocaleString()} UZS`}
          icon={Wallet}
          color="bg-gradient-to-r from-purple-500 to-purple-600"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Revenue vs Expenses Chart */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Daromad vs Xarajat
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Oylik moliyaviy ko'rsatkichlar
              </p>
            </div>
            <div className="flex items-center gap-2">
              <select 
                className="text-sm border border-gray-300 rounded-lg px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
              >
                <option value="week">Haftalik</option>
                <option value="month">Oylik</option>
                <option value="quarter">Choraklik</option>
              </select>
              <Button variant="outline" size="sm">
                <Download size={16} />
              </Button>
            </div>
          </div>
          
          {/* ResponsiveContainer sizes against its parent, so it sits directly
              inside the element carrying the height. */}
          <div className="h-64">
            {financeData.monthlyData.length === 0 ? (
              <div className="h-full bg-gray-50 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <BarChart3 className="mx-auto text-gray-400 mb-2" size={48} />
                  <p className="text-gray-500">Ma'lumot yo'q</p>
                </div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={financeData.monthlyData} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#6b7280' }} />
                  <YAxis
                    tick={{ fontSize: 12, fill: '#6b7280' }}
                    width={60}
                    tickFormatter={(value) => `${(value / 1000000).toFixed(0)}M`}
                  />
                  <Tooltip
                    formatter={(value, name) => [formatCurrency(value), name]}
                    contentStyle={{ borderRadius: '0.5rem', border: '1px solid #e5e7eb' }}
                  />
                  <Legend />
                  <Bar dataKey="revenue" name="Daromad" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expenses" name="Xarajat" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="profit" name="Foyda" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        {/* Expense Breakdown */}
        <ExpenseBreakdown />
      </div>

      {/* Payment Methods Analysis */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                To'lov usullari
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Daromad taqsimoti
              </p>
            </div>
            <PieChart className="text-gray-400" size={20} />
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="text-sm font-medium text-gray-900">Naqd</span>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-gray-900">
                  {financeData.paymentMethods.cash.toLocaleString()} UZS
                </p>
                <p className="text-xs text-gray-500">
                  {pctOfRevenue(financeData.paymentMethods.cash)}%
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <span className="text-sm font-medium text-gray-900">Karta</span>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-gray-900">
                  {financeData.paymentMethods.card.toLocaleString()} UZS
                </p>
                <p className="text-xs text-gray-500">
                  {pctOfRevenue(financeData.paymentMethods.card)}%
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <span className="text-sm font-medium text-gray-900">Qarz</span>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-gray-900">
                  {financeData.paymentMethods.debt.toLocaleString()} UZS
                </p>
                <p className="text-xs text-gray-500">
                  {pctOfRevenue(financeData.paymentMethods.debt)}%
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Profit Margin Trend */}
        <Card className="p-6 xl:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Foyda marjasi tendensiyasi
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Oylik foyda ko'rsatkichlari
              </p>
            </div>
            <Button variant="outline" size="sm">
              <FileText size={16} />
            </Button>
          </div>

          <div className="h-48 bg-gray-50 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <TrendingUp className="mx-auto text-gray-400 mb-2" size={40} />
              <p className="text-gray-500">Foyda marjasi grafigi</p>
              <p className="text-xs text-gray-400 mt-1">Oylik foyda o'sish ko'rsatkichlari</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Detailed Financial Table */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Moliyaviy operatsiyalar
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Barcha moliyaviy operatsiyalarning batafsil ro'yxati
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
                  Sana
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tavsif
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Kategoriya
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Daromad
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Xarajat
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {transactions.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-sm text-gray-500">
                    {transactionsLoading ? 'Yuklanmoqda...' : 'Amaliyotlar topilmadi'}
                  </td>
                </tr>
              )}
              {transactions.map((tx) => {
                const income = INCOME_TYPES.includes(tx.type);
                const amount = Number(tx.amount) || 0;

                return (
                  <tr key={tx.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatTxDate(tx.created_at)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{tx.description}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {TRANSACTION_LABELS[tx.type] || tx.type}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                      {income ? `+${amount.toLocaleString()} UZS` : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-red-600">
                      {income ? '-' : `-${amount.toLocaleString()} UZS`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default FinanceReport;
