import { useState, useEffect } from 'react';
import { salesAPI } from '../api';
import { useConfirm } from '../contexts/ConfirmContext';
import toast from 'react-hot-toast';

// Local YYYY-MM-DD; toISOString() would shift to UTC and give yesterday
// before 05:00 in Tashkent.
export const ymd = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const EMPTY_FILTERS = {
  search: '',
  start_date: '',
  end_date: '',
  client_id: '',
  seller_id: '',
  status: '',
  payment_method: '',
  min_amount: '',
  max_amount: ''
};

const activeParams = (filters) =>
  Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== '' && v != null));

const PAYMENT_LABELS = { cash: 'Naqd', card: 'Karta', transfer: "O'tkazma" };
export const paymentLabel = (m) => PAYMENT_LABELS[m] || m || '—';

export default function useSales() {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSale, setSelectedSale] = useState(null);
  const [showSaleModal, setShowSaleModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showDebtPaymentModal, setShowDebtPaymentModal] = useState(false);
  const [selectedDebtSale, setSelectedDebtSale] = useState(null);
  const [clientDebts, setClientDebts] = useState([]);
  const [debtHistory, setDebtHistory] = useState([]);
  const [stats, setStats] = useState({
    total_sales: 0,
    total_revenue: 0,
    paid_amount: 0,
    outstanding: 0,
    avg_order_value: 0,
    debt_sales: 0,
    cancelled_sales: 0
  });
  // Default to this month so the list and the KPI cards describe the same set.
  const [filters, setFilters] = useState(() => {
    const now = new Date();
    return { ...EMPTY_FILTERS, start_date: ymd(new Date(now.getFullYear(), now.getMonth(), 1)) };
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  });
  const confirm = useConfirm();

  const loadSales = async () => {
    setLoading(true);
    try {
      const filteredParams = activeParams(filters);

      // The API's page-size parameter is `size`; `limit` is ignored, which
      // pinned every page to the server default of 10 and made the page-size
      // selector a no-op.
      const params = {
        page: pagination.page,
        size: pagination.limit,
        ...filteredParams
      };

      const response = await salesAPI.getSales(params);
      
      if (response.success && response.data) {
        setSales(response.data.items || []);
        setPagination(prev => ({
          ...prev,
          total: response.data.pagination?.total || 0,
          pages: response.data.pagination?.pages || 0
        }));
      }
    } catch (error) {
      console.error('Error loading sales:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      // Same filters as the list, so the cards always match the table.
      const statsParams = activeParams(filters);

      const response = await salesAPI.getSalesStats(statsParams);
      if (response.success && response.data) {
        setStats(response.data);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleViewSale = async (saleId) => {
    try {
      const response = await salesAPI.getSale(saleId);
      if (response.success && response.data) {
        setSelectedSale(response.data);
        setShowSaleModal(true);
      }
    } catch (error) {
      console.error('Error loading sale details:', error);
    }
  };

  const handleCancelSale = async (saleId) => {
    const confirmed = await confirm({
      title: 'Sotuvni bekor qilish',
      message: 'Bu sotuvni bekor qilishni xohlaysizmi?',
      description: 'Sotuv bekor qilinadi va mahsulotlar omborga qaytariladi.',
      confirmText: 'Ha, bekor qilish',
      cancelText: 'Yo\'q',
      variant: 'warning',
    });
    if (!confirmed) {
      return;
    }

    try {
      const response = await salesAPI.cancelSale(saleId);
      if (response.success) {
        toast.success('Sotuv muvaffaqiyatli bekor qilindi');
        loadSales();
        loadStats();
      }
    } catch (error) {
      console.error('Error cancelling sale:', error);
      toast.error('Sotuvni bekor qilishda xatolik yuz berdi');
    }
  };

  const handlePayDebt = async (saleId, paymentAmount) => {
    try {
      const response = await salesAPI.paySaleDebt(saleId, paymentAmount);
      if (response.success) {
        toast.success('Qarzdorlik muvaffaqiyatli to\'landi');
        setShowDebtPaymentModal(false);
        setSelectedDebtSale(null);
        loadSales();
        loadStats();
      }
    } catch (error) {
      console.error('Error paying debt:', error);
      toast.error('Qarzdorlik to\'lashda xatolik yuz berdi');
    }
  };

  const handleViewClientDebts = async (clientId) => {
    try {
      const response = await salesAPI.getClientDebts(clientId);
      if (response.success && response.data) {
        setClientDebts(response.data);
        // You can show this in a modal or navigate to a debt page
        console.log('Client debts:', response.data);
      }
    } catch (error) {
      console.error('Error loading client debts:', error);
    }
  };

  const handleViewDebtHistory = async (clientId) => {
    try {
      const response = await salesAPI.getClientDebtHistory(clientId);
      if (response.success && response.data) {
        setDebtHistory(response.data);
        // You can show this in a modal or navigate to a debt history page
        console.log('Debt history:', response.data);
      }
    } catch (error) {
      console.error('Error loading debt history:', error);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const setDateRange = (start_date, end_date) => {
    setFilters(prev => ({ ...prev, start_date, end_date }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const handlePageSizeChange = (newSize) => {
    setPagination(prev => ({ 
      ...prev, 
      page: 1, 
      limit: parseInt(newSize) 
    }));
  };

  const clearFilters = () => {
    setFilters(EMPTY_FILTERS);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  // CSV of every sale matching the current filters (not just this page).
  const exportReport = async () => {
    const id = toast.loading('Eksport tayyorlanmoqda...');
    try {
      const rows = [];
      for (let page = 1, pages = 1; page <= pages; page++) {
        const res = await salesAPI.getSales({ ...activeParams(filters), page, size: 100 });
        rows.push(...(res.data?.items || []));
        pages = res.data?.pagination?.pages || 1;
      }
      const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
      const header = ['Chek', 'Sana', 'Mijoz', 'Sotuvchi', 'Mahsulotlar', 'Soni', "To'lov", 'Summa', "To'langan", 'Qarz', 'Holat'];
      const lines = rows.map(s => [
        s.receipt_number,
        new Date(s.created_at).toLocaleString('uz-UZ'),
        s.client_name || '',
        s.seller_name || '',
        s.items.map(i => `${i.product_name} (${i.color_name}/${i.size_name}) x${i.quantity}`).join('; '),
        s.items.reduce((n, i) => n + i.quantity, 0),
        paymentLabel(s.payment_method),
        s.total_amount,
        s.paid_amount,
        s.status === 'cancelled' ? 0 : s.total_amount - s.paid_amount,
        s.status
      ].map(esc).join(','));
      // BOM so Excel opens UTF-8 correctly.
      const blob = new Blob(['﻿' + [header.map(esc).join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `sotuvlar_${ymd(new Date())}.csv`;
      a.click();
      URL.revokeObjectURL(a.href);
      toast.success(`${rows.length} ta sotuv eksport qilindi`, { id });
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Eksportda xatolik', { id });
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('uz-UZ');
  };

  const formatTime = (dateString) =>
    new Date(dateString).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('uz-UZ', {
      style: 'currency',
      currency: 'UZS'
    }).format(amount);
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      completed: { 
        label: 'Tugatildi', 
        className: 'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200' 
      },
      cancelled: { 
        label: 'Bekor qilindi', 
        className: 'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200' 
      },
      pending: { 
        label: 'Kutilmoqda', 
        className: 'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-200' 
      },
      debt: { 
        label: 'Qarzdorlik', 
        className: 'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800 border border-orange-200' 
      },
      partially_paid: { 
        label: 'Qisman to\'langan', 
        className: 'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200' 
      }
    };
    
    const statusInfo = statusMap[status] || { 
      label: status, 
      className: 'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200' 
    };
    
    return (
      <span className={statusInfo.className}>
        {statusInfo.label}
      </span>
    );
  };

  return {
    // State
    sales,
    loading,
    selectedSale,
    showSaleModal,
    showFilters,
    showDebtPaymentModal,
    selectedDebtSale,
    clientDebts,
    debtHistory,
    stats,
    filters,
    pagination,
    
    // Actions
    setShowSaleModal,
    setShowFilters,
    setShowDebtPaymentModal,
    setSelectedDebtSale,
    loadSales,
    loadStats,
    handleViewSale,
    handleCancelSale,
    handlePayDebt,
    handleViewClientDebts,
    handleViewDebtHistory,
    handleFilterChange,
    setDateRange,
    handlePageChange,
    handlePageSizeChange,
    clearFilters,
    exportReport,
    
    // Utilities
    formatDate,
    formatTime,
    formatCurrency,
    getStatusBadge
  };
} 