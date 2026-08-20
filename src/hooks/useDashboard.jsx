import { useState, useEffect } from 'react';
import { useApi } from './useApi';
import { dashboardAPI } from '../api';

export function useDashboard() {
  const [stats, setStats] = useState({
    totalSales: 0,
    totalProducts: 0,
    totalClients: 0,
    clientsWithDebts: 0,
    monthlyRevenue: 0,
    monthlyExpenses: 0,
    totalOrders: 0,
  });

  const [recentTransactions, setRecentTransactions] = useState([]);
  const [chartData, setChartData] = useState({
    cashflow: [],
    profit: [],
    salesPerformance: [],
    expenseBreakdown: [],
  });
  // Each chart carries its own period. They used to share one value, so
  // changing the range on any chart silently moved the other three.
  const DEFAULT_PERIOD = '1month';
  const [selectedPeriods, setSelectedPeriods] = useState({
    cashflow: DEFAULT_PERIOD,
    profit: DEFAULT_PERIOD,
    salesPerformance: DEFAULT_PERIOD,
    expenseBreakdown: DEFAULT_PERIOD,
  });
  const [chartLoading, setChartLoading] = useState({
    cashflow: false,
    profit: false,
    salesPerformance: false,
    expenseBreakdown: false,
  });
  const { loading, error, callApi } = useApi();

  const CHART_FETCHERS = {
    cashflow: (period) => dashboardAPI.getCashflowData(period),
    profit: (period) => dashboardAPI.getProfitData(period),
    salesPerformance: (period) => dashboardAPI.getSalesPerformanceData(period),
    expenseBreakdown: (period) => dashboardAPI.getExpenseBreakdownData(period),
  };

  const loadChart = async (key, period) => {
    setChartLoading(prev => ({ ...prev, [key]: true }));
    try {
      const response = await callApi(() => CHART_FETCHERS[key](period));
      setChartData(prev => ({
        ...prev,
        [key]: response?.success ? (response.data || []) : [],
      }));
    } catch (err) {
      console.error(`Error loading ${key} chart:`, err);
      setChartData(prev => ({ ...prev, [key]: [] }));
    } finally {
      setChartLoading(prev => ({ ...prev, [key]: false }));
    }
  };

  const loadChartData = async (periods = selectedPeriods) => {
    await Promise.allSettled(
      Object.keys(CHART_FETCHERS).map(key => loadChart(key, periods[key]))
    );
  };

  const loadDashboardData = async () => {
    try {
      // Fire stats, transactions and charts together instead of serially —
      // they are independent, so a waterfall just adds round-trips.
      const [statsResult, transactionsResult] = await Promise.allSettled([
        callApi(dashboardAPI.getStats),
        callApi(() => dashboardAPI.getRecentTransactions(10)),
        loadChartData(),
      ]);

      if (statsResult.status === 'fulfilled') {
        const statsResponse = statsResult.value;
        if (statsResponse.success && statsResponse.data) {
          const apiData = statsResponse.data;
          setStats({
            totalSales: apiData.total_sales || 0,
            totalProducts: apiData.total_products || 0,
            totalClients: apiData.total_clients || 0,
            clientsWithDebts: apiData.clients_with_debts || 0,
            monthlyRevenue: apiData.total_revenue || 0,
            monthlyExpenses: apiData.monthly_expenses || 0,
            totalOrders: apiData.total_orders || 0,
          });
        }
      }

      if (transactionsResult.status === 'fulfilled') {
        const transactionsResponse = transactionsResult.value;
        if (transactionsResponse.success && transactionsResponse.data) {
          setRecentTransactions(transactionsResponse.data || []);
        }
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  };

  // Only the chart the user touched is refetched.
  const handlePeriodChange = async (chartKey, newPeriod) => {
    setSelectedPeriods(prev => ({ ...prev, [chartKey]: newPeriod }));
    await loadChart(chartKey, newPeriod);
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  return {
    stats,
    recentTransactions,
    chartData,
    selectedPeriods,
    loading,
    chartLoading,
    error,
    refreshData: loadDashboardData,
    handlePeriodChange,
  };
} 