import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { RefreshCw, Download, Plus, Receipt, Wallet, CheckCircle2, AlertCircle, Calculator, SearchX } from 'lucide-react';
import PageLayout from '../components/layout/PageLayout';
import { Card } from '../components/ui/Card';
import { Button, LoadingSpinner } from '../components/ui';
import {
  SalesFilters,
  SalesPagination,
  SaleDetailsModal,
  SalesTable
} from '../components/sales';
import SaleDebtPaymentModal from '../components/modals/SaleDebtPaymentModal';
import { useAuth } from '../contexts/AuthContext';
import useSales from '../hooks/useSales';
import { employeesAPI } from '../api';
import { useDebounce } from '../hooks/useDebounce';
import { cn } from '../utils/cn';

const Kpi = ({ icon: Icon, label, value, hint, tone = 'gray' }) => {
  const tones = {
    gray: 'bg-gray-100 text-gray-600',
    green: 'bg-green-100 text-green-600',
    blue: 'bg-blue-100 text-blue-600',
    red: 'bg-red-100 text-red-600',
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

export default function SalesPage() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const {
    sales,
    loading,
    selectedSale,
    showSaleModal,
    showDebtPaymentModal,
    selectedDebtSale,
    stats,
    filters,
    pagination,
    setShowSaleModal,
    setShowDebtPaymentModal,
    setSelectedDebtSale,
    loadSales,
    loadStats,
    handleViewSale,
    handleCancelSale,
    handlePayDebt,
    handleFilterChange,
    setDateRange,
    handlePageChange,
    handlePageSizeChange,
    clearFilters,
    exportReport,
    formatDate,
    formatTime,
    formatCurrency,
    getStatusBadge
  } = useSales();

  useEffect(() => {
    if (!authLoading && !isAuthenticated()) {
      window.location.href = '/login';
    }
  }, [authLoading, user]);

  // Debounce filters so typing in search fires one request after the user
  // stops, not two API calls per keystroke. Page changes stay instant.
  const debouncedFilters = useDebounce(filters, 400);

  const [sellers, setSellers] = useState([]);
  useEffect(() => {
    employeesAPI.getSellers().then(r => setSellers(r.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (!authLoading && isAuthenticated()) {
      loadSales();
    }
  }, [debouncedFilters, pagination.page, pagination.limit, authLoading]);

  useEffect(() => {
    if (!authLoading && isAuthenticated()) {
      loadStats();
    }
  }, [debouncedFilters, authLoading]);

  const handlePayDebtClick = (sale) => {
    setSelectedDebtSale(sale);
    setShowDebtPaymentModal(true);
  };

  const handleDebtPayment = async (saleId, paymentAmount) => {
    try {
      await handlePayDebt(saleId, paymentAmount);
      setShowDebtPaymentModal(false);
      setSelectedDebtSale(null);
    } catch (error) {
      console.error('Error processing debt payment:', error);
    }
  };

  const handleRefresh = () => {
    loadSales();
    loadStats();
  };

  if (authLoading) {
    return (
      <PageLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <LoadingSpinner message="Autentifikatsiya tekshirilmoqda..." size="lg" />
        </div>
      </PageLayout>
    );
  }

  const paidPct = stats.total_revenue > 0 ? Math.round((stats.paid_amount / stats.total_revenue) * 100) : 0;

  return (
    <PageLayout maxWidth="full" spacing="sm" className="bg-gray-50 min-h-screen">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900 m-0">Sotuvlar</h1>
            <p className="text-sm text-gray-500 m-0">Cheklar tarixi, to'lovlar va qarzlar</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={handleRefresh} disabled={loading} title="Yangilash" className="px-2">
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </Button>
            <Button variant="secondary" size="sm" onClick={exportReport} disabled={!pagination.total}>
              <Download size={14} className="mr-1" /> CSV
            </Button>
            <Link to="/checkout">
              <Button size="sm">
                <Plus size={14} className="mr-1" /> Yangi sotuv
              </Button>
            </Link>
          </div>
        </div>

        {/* KPIs — computed server-side over exactly the filters below */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <Kpi icon={Receipt} label="Sotuvlar" value={stats.total_sales}
            hint={stats.cancelled_sales ? `${stats.cancelled_sales} ta bekor qilingan` : 'Bekor qilinganlarsiz'} />
          <Kpi icon={Wallet} label="Tushum" tone="blue" value={formatCurrency(stats.total_revenue)} />
          <Kpi icon={CheckCircle2} label="To'langan" tone="green" value={formatCurrency(stats.paid_amount)}
            hint={`Tushumning ${paidPct}%`} />
          <Kpi icon={AlertCircle} label="Qarz qoldig'i" tone="red" value={formatCurrency(stats.outstanding)}
            hint={`${stats.debt_sales} ta sotuvda`} />
          <Kpi icon={Calculator} label="O'rtacha chek" value={formatCurrency(stats.avg_order_value)} />
        </div>

        {/* Filters + table */}
        <Card className="p-4">
          <SalesFilters
            filters={filters}
            sellers={sellers}
            onFilterChange={handleFilterChange}
            onDateRange={setDateRange}
            onClearFilters={clearFilters}
          />

          <div className="mt-4 min-h-[400px]">
            {loading && sales.length === 0 ? (
              <div className="flex items-center justify-center py-16">
                <LoadingSpinner message="Ma'lumotlar yuklanmoqda..." size="lg" />
              </div>
            ) : sales.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <SearchX size={40} className="text-gray-300 mb-3" />
                <h3 className="text-base font-medium text-gray-900 mb-1">Sotuv topilmadi</h3>
                <p className="text-sm text-gray-500 mb-4">Tanlangan davr yoki filtrlarda sotuv yo'q</p>
                <Button onClick={clearFilters} size="sm" variant="secondary">Barcha sotuvlarni ko'rsatish</Button>
              </div>
            ) : (
              <div className={cn('transition-opacity', loading && 'opacity-50 pointer-events-none')}>
                <SalesTable
                  sales={sales}
                  onViewSale={handleViewSale}
                  onCancelSale={handleCancelSale}
                  onPayDebt={handlePayDebtClick}
                  formatTime={formatTime}
                  formatCurrency={formatCurrency}
                  getStatusBadge={getStatusBadge}
                />
                <div className="pt-4 mt-2 border-t border-gray-100">
                  <SalesPagination
                    pagination={pagination}
                    onPageChange={handlePageChange}
                    onPageSizeChange={handlePageSizeChange}
                  />
                </div>
              </div>
            )}
          </div>
        </Card>

        <SaleDetailsModal
          selectedSale={selectedSale}
          showSaleModal={showSaleModal}
          onClose={() => setShowSaleModal(false)}
          formatDate={formatDate}
          formatCurrency={formatCurrency}
          getStatusBadge={getStatusBadge}
        />

        <SaleDebtPaymentModal
          sale={selectedDebtSale}
          isOpen={showDebtPaymentModal}
          onClose={() => {
            setShowDebtPaymentModal(false);
            setSelectedDebtSale(null);
          }}
          onPayDebt={handleDebtPayment}
          formatCurrency={formatCurrency}
        />
      </div>
    </PageLayout>
  );
}
