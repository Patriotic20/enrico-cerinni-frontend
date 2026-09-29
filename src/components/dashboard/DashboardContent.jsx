import DashboardStats from './DashboardStats';
import RecentTransactions from './RecentTransactions';
import TopProducts from './TopProducts';
import CashflowChart from './CashflowChart';
import ProfitChart from './ProfitChart';
import SalesPerformanceChart from './SalesPerformanceChart';
import ExpenseBreakdownChart from './ExpenseBreakdownChart';

// One-screen owner view: KPI row + 3x2 grid of compact cards on xl screens.
export default function DashboardContent({ stats, recentTransactions, chartData = {}, selectedPeriods = {}, chartLoading = {}, onPeriodChange }) {
  return (
    <div className="space-y-3">
      <DashboardStats stats={stats} />

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
        <CashflowChart
          data={chartData.cashflow}
          selectedPeriod={selectedPeriods.cashflow}
          loading={chartLoading.cashflow}
          onPeriodChange={(period) => onPeriodChange('cashflow', period)}
        />
        <ProfitChart
          data={chartData.profit}
          selectedPeriod={selectedPeriods.profit}
          loading={chartLoading.profit}
          onPeriodChange={(period) => onPeriodChange('profit', period)}
        />
        <SalesPerformanceChart
          data={chartData.salesPerformance}
          selectedPeriod={selectedPeriods.salesPerformance}
          loading={chartLoading.salesPerformance}
          onPeriodChange={(period) => onPeriodChange('salesPerformance', period)}
        />
        <ExpenseBreakdownChart
          data={chartData.expenseBreakdown}
          selectedPeriod={selectedPeriods.expenseBreakdown}
          loading={chartLoading.expenseBreakdown}
          onPeriodChange={(period) => onPeriodChange('expenseBreakdown', period)}
        />
        <RecentTransactions transactions={recentTransactions} />
        <TopProducts products={stats.topProducts} />
      </div>
    </div>
  );
}
