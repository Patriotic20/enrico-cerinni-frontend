import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, RefreshCw, Wallet, CalendarDays, Receipt, AlertCircle } from 'lucide-react';
import PageLayout from '../components/layout/PageLayout';
import ExpenseModal from '../components/modals/ExpenseModal';
import SupplierModal from '../components/modals/SupplierModal';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui';
import {
  FinanceStats,
  FinanceTabs,
  ExpensesTab,
  SuppliersTab,
  SalaryTab
} from '../components/finance';
import { useFinance } from '../hooks/useFinance';
import { useConfirm } from '../contexts/ConfirmContext';
import { ymd } from '../hooks/useSales';
import { formatCurrency, formatDate } from '../utils/finance';
import { cn } from '../utils/cn';

const presets = () => {
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth(), d = now.getDate();
  return [
    { label: 'Bugun', start: ymd(now), end: '' },
    { label: '7 kun', start: ymd(new Date(y, m, d - 6)), end: '' },
    { label: 'Bu oy', start: ymd(new Date(y, m, 1)), end: '' },
    { label: "O'tgan oy", start: ymd(new Date(y, m - 1, 1)), end: ymd(new Date(y, m, 0)) },
    { label: 'Bu yil', start: ymd(new Date(y, 0, 1)), end: '' },
    { label: 'Hammasi', start: '', end: '' },
  ];
};

const TAB_ACTIONS = {
  expenses: 'Xarajat qo\'shish',
  suppliers: 'Yetkazib beruvchi',
  salary: 'Xodimlar',
};

const Kpi = ({ icon: Icon, label, value, hint, tone = 'gray' }) => {
  const tones = {
    gray: 'bg-gray-100 text-gray-600',
    red: 'bg-red-100 text-red-600',
    orange: 'bg-orange-100 text-orange-600',
  };
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 text-xs font-medium text-gray-500">
        <span className={cn('w-7 h-7 rounded-md flex items-center justify-center', tones[tone])}>
          <Icon size={15} />
        </span>
        {label}
      </div>
      <div className="mt-2 text-lg font-semibold text-gray-900 tabular-nums truncate" title={String(value)}>{value}</div>
      {hint && <div className="text-xs text-gray-500 mt-0.5">{hint}</div>}
    </Card>
  );
};

const FinancePage = () => {
  const [activeTab, setActiveTab] = useState('expenses');
  const [period, setPeriod] = useState(() => presets()[2]); // Bu oy
  const [category, setCategory] = useState('all');
  const confirm = useConfirm();

  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [supplierModalOpen, setSupplierModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const navigate = useNavigate();

  const {
    loading,
    error,
    expenses,
    suppliers,
    salaryPayments,
    stats,
    handleDeleteExpense,
    handleDeleteSupplier,
    loadData,
    reloadPeriod,
  } = useFinance(period);

  const confirmDelete = (title, onYes) => async (id) => {
    const ok = await confirm({
      title,
      message: 'Rostdan ham o\'chirmoqchimisiz?',
      description: 'Bu amalni qaytarib bo\'lmaydi.',
      confirmText: 'Ha, o\'chirish',
      variant: 'danger',
    });
    if (ok) onYes(id);
  };

  const openExpense = (expense = null) => { setEditingExpense(expense); setExpenseModalOpen(true); };
  const openSupplier = (supplier = null) => { setEditingSupplier(supplier); setSupplierModalOpen(true); };

  const addAction = { expenses: openExpense, suppliers: openSupplier, salary: () => navigate('/employees') }[activeTab];

  // Salary and stock purchases live in their own tables, so their slice of
  // the breakdown opens the matching tab instead of filtering expense rows.
  const handlePickCategory = (key) => {
    if (key === 'salary') return setActiveTab('salary');
    if (key === 'supplier_costs' && !expenses.some(e => e.category === key)) return setActiveTab('suppliers');
    setActiveTab('expenses');
    setCategory(prev => (prev === key ? 'all' : key));
  };

  return (
    <PageLayout maxWidth="full" spacing="sm" className="bg-gray-50 min-h-screen">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900 m-0">Xarajatlar</h1>
            <p className="text-sm text-gray-500 m-0">Xarajatlar, yetkazib beruvchilar va ish haqi</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-lg bg-gray-100 p-0.5">
              {presets().map(p => {
                const active = period.start === p.start && period.end === p.end;
                return (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => setPeriod(p)}
                    className={cn(
                      'px-3 py-1.5 text-sm rounded-md transition-colors',
                      active ? 'bg-white text-gray-900 font-medium shadow-sm' : 'text-gray-600 hover:text-gray-900'
                    )}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
            <Button variant="secondary" size="sm" onClick={loadData} disabled={loading} title="Yangilash" className="px-2">
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </Button>
            <Button size="sm" onClick={() => addAction()}>
              <Plus size={14} className="mr-1" /> {TAB_ACTIONS[activeTab]}
            </Button>
          </div>
        </div>

        {error && (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
            <span className="flex items-center gap-2"><AlertCircle size={16} /> {error}</span>
            <button onClick={loadData} disabled={loading} className="font-medium hover:underline disabled:opacity-50">
              Qayta urinish
            </button>
          </div>
        )}

        {/* KPIs + breakdown — all for the selected period, except "Bu oy" */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <div className="grid grid-cols-2 lg:grid-cols-1 gap-3">
            <Kpi icon={Wallet} tone="red" label={`Jami xarajat · ${period.label}`}
              value={formatCurrency(stats.totalExpenses)}
              hint={`${stats.count} ta yozuv + ish haqi va xaridlar`} />
            <Kpi icon={CalendarDays} tone="orange" label="Joriy oy"
              value={formatCurrency(stats.monthlyExpenses)}
              hint={`Kuniga o'rtacha ${formatCurrency(stats.monthlyExpenses / new Date().getDate())}`} />
          </div>
          <div className="lg:col-span-2">
            <FinanceStats
              stats={stats}
              formatCurrency={formatCurrency}
              activeCategory={activeTab === 'expenses' ? category : null}
              onPick={handlePickCategory}
            />
          </div>
        </div>

        <FinanceTabs
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          counts={{ expenses: expenses.length, suppliers: suppliers.length, salary: salaryPayments.length }}
        />

        {activeTab === 'expenses' && (
          <ExpensesTab
            expenses={expenses}
            category={category}
            onCategoryChange={setCategory}
            formatCurrency={formatCurrency}
            formatDate={formatDate}
            onAddExpense={() => openExpense()}
            onEditExpense={openExpense}
            onDeleteExpense={confirmDelete('Xarajatni o\'chirish', handleDeleteExpense)}
            loading={loading && expenses.length === 0}
          />
        )}

        {activeTab === 'suppliers' && (
          <SuppliersTab
            suppliers={suppliers}
            formatDate={formatDate}
            onAddSupplier={() => openSupplier()}
            onEditSupplier={openSupplier}
            onDeleteSupplier={confirmDelete('Yetkazib beruvchini o\'chirish', handleDeleteSupplier)}
            loading={loading && suppliers.length === 0}
          />
        )}

        {activeTab === 'salary' && (
          <SalaryTab
            payments={salaryPayments}
            formatCurrency={formatCurrency}
            formatDate={formatDate}
          />
        )}

        <ExpenseModal
          isOpen={expenseModalOpen}
          onClose={() => { setExpenseModalOpen(false); setEditingExpense(null); }}
          expense={editingExpense}
          onSuccess={() => { reloadPeriod(); setExpenseModalOpen(false); setEditingExpense(null); }}
        />
        <SupplierModal
          isOpen={supplierModalOpen}
          onClose={() => { setSupplierModalOpen(false); setEditingSupplier(null); }}
          supplier={editingSupplier}
          onSuccess={() => { loadData(); setSupplierModalOpen(false); setEditingSupplier(null); }}
        />
      </div>
    </PageLayout>
  );
};

export default FinancePage;
