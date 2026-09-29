import { useState, useEffect, useCallback } from 'react';
import { financeAPI } from '../api';

const EMPTY_STATS = {
  totalExpenses: 0,
  monthlyExpenses: 0,
  byCategory: {},
  count: 0,
};

// The list endpoint caps `size` at 100; the page used to show only the first
// 20 rows while the totals covered everything, so walk every page instead.
// ponytail: fine for thousands of rows; move search/paging server-side past that.
const fetchAllExpenses = async (params) => {
  const items = [];
  for (let page = 1; ; page++) {
    const res = await financeAPI.getExpenses({ ...params, page, size: 100 });
    if (!res.success) throw new Error('expenses');
    items.push(...(res.data.items || []));
    if (page >= (res.data.pagination?.pages || 1)) return items;
  }
};

// `period` is { start, end } as YYYY-MM-DD strings; '' means open-ended.
export const useFinance = (period = { start: '', end: '' }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [salaryPayments, setSalaryPayments] = useState([]);
  const [stats, setStats] = useState(EMPTY_STATS);

  const { start, end } = period;

  // Stats and the expense list follow the selected period; suppliers and
  // employees are directories, not period data.
  const loadPeriodData = useCallback(async () => {
    const params = {};
    if (start) params.start_date = start;
    if (end) params.end_date = end;

    const [statsRes, items] = await Promise.all([
      financeAPI.getExpenseStats(params),
      fetchAllExpenses(params),
    ]);
    if (statsRes.success) {
      const byCategory = {};
      Object.entries(statsRes.data.by_category || {}).forEach(([k, v]) => {
        byCategory[k] = parseFloat(v) || 0;
      });
      setStats({
        totalExpenses: parseFloat(statsRes.data.total_expenses) || 0,
        monthlyExpenses: parseFloat(statsRes.data.monthly_expenses) || 0,
        byCategory,
        count: statsRes.data.count || 0,
      });
    }
    setExpenses(items);
  }, [start, end]);

  const loadDirectories = useCallback(async () => {
    const [suppliersRes, employeesRes, paymentsRes] = await Promise.all([
      financeAPI.getSuppliers().catch(() => ({ success: false })),
      financeAPI.getEmployees().catch(() => ({ success: false })),
      financeAPI.getSalaryPayments().catch(() => ({ success: false })),
    ]);
    if (suppliersRes.success) setSuppliers(suppliersRes.data.items || []);
    if (employeesRes.success) setEmployees(employeesRes.data.items || []);
    if (paymentsRes.success) setSalaryPayments(paymentsRes.data.items || []);
    if (![suppliersRes, employeesRes, paymentsRes].every(r => r.success)) {
      throw new Error('directories');
    }
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([loadPeriodData(), loadDirectories()]);
    } catch (err) {
      console.error('Error loading finance data:', err);
      setError('Ba\'zi moliyaviy ma\'lumotlarni yuklab bo\'lmadi');
    } finally {
      setLoading(false);
    }
  }, [loadPeriodData, loadDirectories]);

  const reloadPeriod = useCallback(async () => {
    setLoading(true);
    try {
      await loadPeriodData();
      setError(null);
    } catch (err) {
      console.error('Error loading expenses:', err);
      setError('Xarajatlarni yuklab bo\'lmadi');
    } finally {
      setLoading(false);
    }
  }, [loadPeriodData]);

  const handleDeleteExpense = useCallback(async (id) => {
    try {
      await financeAPI.deleteExpense(id);
      await reloadPeriod();
    } catch (err) {
      console.error('Error deleting expense:', err);
      setError('Xarajatni o\'chirishda xatolik yuz berdi');
    }
  }, [reloadPeriod]);

  const handleDeleteSupplier = useCallback(async (id) => {
    try {
      await financeAPI.deleteSupplier(id);
      setSuppliers(prev => prev.filter(s => s.id !== id));
    } catch (err) {
      console.error('Error deleting supplier:', err);
      setError('Yetkazib beruvchini o\'chirishda xatolik yuz berdi');
    }
  }, []);

  useEffect(() => {
    loadDirectories().catch(() => setError('Ba\'zi moliyaviy ma\'lumotlarni yuklab bo\'lmadi'));
  }, [loadDirectories]);

  useEffect(() => {
    reloadPeriod();
  }, [reloadPeriod]);

  return {
    loading,
    error,
    expenses,
    suppliers,
    employees,
    salaryPayments,
    stats,
    loadData,
    reloadPeriod,
    refreshData: loadData,
    handleDeleteExpense,
    handleDeleteSupplier,
  };
};
