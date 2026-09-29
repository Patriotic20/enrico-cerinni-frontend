import { useEffect, useMemo, useState } from 'react';
import { RefreshCw, Wallet, Users, TrendingUp, Search, Plus, Receipt, CreditCard, X, Phone, ChevronRight, AlertTriangle, Send, ShoppingBag, Clock } from 'lucide-react';
import PageLayout from '../components/layout/PageLayout';
import DebtPaymentModal from '../components/modals/DebtPaymentModal';
import AddDebtModal from '../components/modals/AddDebtModal';
import { LoadingSpinner } from '../components/ui';
import { useAuth } from '../contexts/AuthContext';
import { clientsAPI, salesAPI } from '../api';
import { isStaff } from '../utils/constants';
import { formatNumber } from '../utils/format';
import toast from 'react-hot-toast';

// Whole sums read faster than "25,142,526.90" in a debt list.
const money = (v) => formatNumber(Math.round(Number(v) || 0));
const initials = (c) => `${c.first_name?.[0] || ''}${c.last_name?.[0] || ''}`.toUpperCase() || '?';
const fullName = (c) => `${c.first_name || ''} ${c.last_name || ''}`.trim();
const DAY = 86400000;
const daysSince = (d) => (d ? Math.max(0, Math.floor((Date.now() - new Date(d)) / DAY)) : null);
const shortDate = (d) => (d ? new Date(d).toLocaleDateString('uz-UZ') : '—');

// Aging buckets by the oldest unpaid sale. Manual debts with no sale count as fresh.
const BUCKETS = [
  { key: 'b30', label: '0–30 kun', max: 30, bar: 'bg-amber-400', chip: 'bg-amber-50 text-amber-700 border-amber-200' },
  { key: 'b60', label: '31–60 kun', max: 60, bar: 'bg-orange-500', chip: 'bg-orange-50 text-orange-700 border-orange-200' },
  { key: 'b90', label: '61–90 kun', max: 90, bar: 'bg-red-500', chip: 'bg-red-50 text-red-700 border-red-200' },
  { key: 'b90p', label: '90+ kun', max: Infinity, bar: 'bg-red-800', chip: 'bg-red-100 text-red-900 border-red-300' },
];
const bucketOf = (age) => BUCKETS.find(b => age <= b.max);

const SORTS = {
  debt_desc: { label: 'Qarz: ko\'pdan kamga', fn: (a, b) => b.debt_amount - a.debt_amount },
  debt_asc: { label: 'Qarz: kamdan ko\'pga', fn: (a, b) => a.debt_amount - b.debt_amount },
  age_desc: { label: 'Eng eski qarz', fn: (a, b) => b.age - a.age },
  ratio_desc: { label: 'To\'lanmagan ulush', fn: (a, b) => b.ratio - a.ratio },
  name_asc: { label: 'Ism bo\'yicha', fn: (a, b) => a.name.localeCompare(b.name) },
};

function Kpi({ icon: Icon, tone, label, value, unit, hint }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${tone}`}>
        <Icon size={18} />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-gray-500 m-0">{label}</p>
        <p className="text-xl font-bold text-gray-900 m-0 tabular-nums whitespace-nowrap">
          {value} <span className="text-sm font-medium text-gray-400">{unit}</span>
        </p>
        {hint && <p className="text-[11px] text-gray-400 m-0 truncate">{hint}</p>}
      </div>
    </div>
  );
}

export default function DebtsPage() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [allClients, setAllClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState(null);
  const [clientDebts, setClientDebts] = useState([]);
  const [clientTransactions, setClientTransactions] = useState([]);
  const [showDebtModal, setShowDebtModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showAddDebtModal, setShowAddDebtModal] = useState(false);
  const [activeTab, setActiveTab] = useState('sales');
  const [search, setSearch] = useState('');
  const [bucket, setBucket] = useState('all');
  const [sortBy, setSortBy] = useState('debt_desc');

  useEffect(() => {
    if (!authLoading && !isAuthenticated()) {
      window.location.href = '/login';
    }
  }, [authLoading, user]);

  useEffect(() => {
    if (!authLoading && isAuthenticated()) {
      refreshAll();
    }
  }, [authLoading]);

  // One insights call gives debt, debt age, spend and orders per client;
  // search/filter/sort then run locally on that list.
  // ponytail: loads every client, fine for a few thousand (same as ClientsPage).
  const refreshAll = async () => {
    setLoading(true);
    try {
      const response = await clientsAPI.getInsights();
      if (response?.success) setAllClients(response.data || []);
    } catch (error) {
      console.error('Error loading debts:', error);
      toast.error('Qarzdorliklarni yuklab bo\'lmadi');
    } finally {
      setLoading(false);
    }
  };

  const debtors = useMemo(() => allClients
    .filter(c => c.debt_amount > 0)
    .map(c => {
      const age = daysSince(c.oldest_debt_date) ?? 0;
      return {
        ...c,
        name: fullName(c) || 'Noma\'lum',
        age,
        bucket: bucketOf(age),
        sinceLast: daysSince(c.last_purchase_date),
        // Share of everything they ever bought that is still unpaid.
        ratio: c.spent ? Math.min(1, c.debt_amount / c.spent) : 1,
      };
    }), [allClients]);

  const stats = useMemo(() => {
    const total = debtors.reduce((s, c) => s + c.debt_amount, 0);
    const spentAll = allClients.reduce((s, c) => s + (c.spent || 0), 0);
    const byBucket = Object.fromEntries(BUCKETS.map(b => [b.key, { sum: 0, count: 0 }]));
    debtors.forEach(c => { byBucket[c.bucket.key].sum += c.debt_amount; byBucket[c.bucket.key].count++; });
    return {
      total,
      byBucket,
      overdue: byBucket.b90.sum + byBucket.b90p.sum,
      overdueCount: byBucket.b90.count + byBucket.b90p.count,
      // Weighted by amount: "how old is the average unpaid sum".
      avgAge: total ? Math.round(debtors.reduce((s, c) => s + c.age * c.debt_amount, 0) / total) : 0,
      count: debtors.length,
      clientCount: allClients.length,
      avg: debtors.length ? total / debtors.length : 0,
      max: Math.max(0, ...debtors.map(c => c.debt_amount)),
      shareOfSales: spentAll ? (total / spentAll) * 100 : 0,
    };
  }, [debtors, allClients]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return debtors
      .filter(c => bucket === 'all' || c.bucket.key === bucket)
      .filter(c => !q || c.name.toLowerCase().includes(q) || (c.phone || '').includes(q))
      .sort(SORTS[sortBy].fn);
  }, [debtors, bucket, search, sortBy]);
  const rowsTotal = rows.reduce((s, c) => s + c.debt_amount, 0);

  const handleViewClientDebts = async (client) => {
    try {
      const [salesResponse, transactionsResponse] = await Promise.all([
        salesAPI.getClientDebts(client.id),
        salesAPI.getClientDebtHistory(client.id)
      ]);
      setClientDebts(salesResponse.success ? salesResponse.data || [] : []);
      setClientTransactions(transactionsResponse.success ? transactionsResponse.data || [] : []);
      setSelectedClient(client);
      setActiveTab('sales');
      setShowDebtModal(true);
    } catch (error) {
      console.error('Error loading client debts:', error);
      toast.error('Tafsilotlarni yuklab bo\'lmadi');
    }
  };

  const handlePaymentClick = (client) => {
    setSelectedClient(client);
    setShowPaymentModal(true);
  };

  // DebtPaymentModal already posted the payment — this only reacts to it.
  // Calling the API again here charged the client twice for every payment.
  const handlePaymentCompleted = () => {
    toast.success('To\'lov muvaffaqiyatli amalga oshirildi');
    setShowPaymentModal(false);
    setShowDebtModal(false);
    setSelectedClient(null);
    setClientDebts([]);
    setClientTransactions([]);
    refreshAll();
  };

  const formatDate = (d) => new Date(d).toLocaleDateString('uz-UZ');
  const formatDateTime = (d) => new Date(d).toLocaleString('uz-UZ');

  if (authLoading) {
    return (
      <PageLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <LoadingSpinner message="Autentifikatsiya tekshirilmoqda..." size="lg" />
        </div>
      </PageLayout>
    );
  }

  const bucketBtn = (active) => `text-left rounded-lg border px-3 py-2 transition-colors ${
    active ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'
  }`;

  return (
    <PageLayout
      title="Qarzdorliklar"
      subtitle="Mijozlar qarzdorliklarini boshqarish va to'lovlarni kuzatish"
      maxWidth="full"
      spacing="sm"
      className="bg-gray-50 min-h-screen"
    >
      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 mb-3">
        <Kpi icon={Wallet} tone="bg-red-50 text-red-600" label="Jami qarz" value={money(stats.total)} unit="UZS"
          hint={`Umumiy savdoning ${stats.shareOfSales.toFixed(1)}% to'lanmagan`} />
        <Kpi icon={Users} tone="bg-blue-50 text-blue-600" label="Qarzdor mijozlar" value={stats.count} unit="ta"
          hint={`${stats.clientCount} mijozning ${stats.clientCount ? Math.round(stats.count / stats.clientCount * 100) : 0}%`} />
        <Kpi icon={TrendingUp} tone="bg-amber-50 text-amber-600" label="O'rtacha qarz" value={money(stats.avg)} unit="UZS"
          hint={`Eng kattasi: ${money(stats.max)} UZS`} />
        <Kpi icon={AlertTriangle} tone="bg-red-100 text-red-800" label="60 kundan oshgan" value={money(stats.overdue)} unit="UZS"
          hint={`${stats.overdueCount} mijoz · o'rtacha qarz yoshi ${stats.avgAge} kun`} />
      </div>

      {/* Aging: where the money is stuck, doubling as a one-click filter */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-3">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <p className="text-sm font-semibold text-gray-900 m-0 flex items-center gap-1.5">
            <Clock size={15} className="text-gray-400" /> Qarz muddati bo'yicha
          </p>
          <p className="text-xs text-gray-400 m-0">Eng eski to'lanmagan chekdan hisoblanadi</p>
        </div>
        <div className="flex h-3 rounded-full overflow-hidden bg-gray-100 mb-3">
          {BUCKETS.map(b => stats.byBucket[b.key].sum > 0 && (
            <div key={b.key} className={b.bar} title={`${b.label}: ${money(stats.byBucket[b.key].sum)} UZS`}
              style={{ width: `${(stats.byBucket[b.key].sum / (stats.total || 1)) * 100}%` }} />
          ))}
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-2">
          <button onClick={() => setBucket('all')} className={bucketBtn(bucket === 'all')}>
            <p className="text-xs text-gray-500 m-0">Hammasi · {stats.count} ta</p>
            <p className="text-sm font-bold text-gray-900 m-0 tabular-nums">{money(stats.total)}</p>
          </button>
          {BUCKETS.map(b => {
            const s = stats.byBucket[b.key];
            return (
              <button key={b.key} onClick={() => setBucket(bucket === b.key ? 'all' : b.key)} className={bucketBtn(bucket === b.key)}>
                <p className="text-xs text-gray-500 m-0 flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${b.bar}`} /> {b.label} · {s.count} ta
                </p>
                <p className="text-sm font-bold text-gray-900 m-0 tabular-nums">
                  {money(s.sum)}{' '}
                  <span className="text-[11px] font-medium text-gray-400">{stats.total ? Math.round(s.sum / stats.total * 100) : 0}%</span>
                </p>
              </button>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2 p-3 border-b border-gray-200">
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Mijoz ismi yoki telefon raqami..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
            />
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="py-2 pl-3 pr-8 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          >
            {Object.entries(SORTS).map(([k, s]) => <option key={k} value={k}>{s.label}</option>)}
          </select>
          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={refreshAll}
              disabled={loading}
              title="Yangilash"
              className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
            {isStaff(user) && (
              <button
                onClick={() => setShowAddDebtModal(true)}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-red-600 hover:bg-red-700 text-white rounded-lg"
              >
                <Plus size={16} />
                <span>Qarz qo'shish</span>
              </button>
            )}
          </div>
        </div>

        {/* List */}
        {loading && debtors.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <LoadingSpinner message="Ma'lumotlar yuklanmoqda..." size="lg" />
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 rounded-full bg-green-50 text-green-600 flex items-center justify-center mb-3">
              <Wallet size={26} />
            </div>
            <h3 className="text-base font-semibold text-gray-900 mb-1">Qarzdorliklar topilmadi</h3>
            <p className="text-sm text-gray-500">
              {debtors.length ? 'Filtr bo\'yicha mos mijoz yo\'q' : 'Qarzdorligi bo\'lgan mijozlar mavjud emas'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-[11px] uppercase tracking-wide text-gray-500">
                  <th className="w-10 px-4 py-2.5 text-left font-semibold">#</th>
                  <th className="px-4 py-2.5 text-left font-semibold">Mijoz</th>
                  <th className="px-4 py-2.5 text-left font-semibold">Muddati</th>
                  <th className="px-4 py-2.5 text-left font-semibold hidden lg:table-cell">Xaridlar</th>
                  <th className="px-4 py-2.5 text-left font-semibold hidden md:table-cell w-[18%]">To'lanmagan ulush</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Qarzdorlik</th>
                  <th className="px-4 py-2.5 text-right font-semibold w-40">Amallar</th>
                </tr>
              </thead>
              <tbody className={`divide-y divide-gray-100 ${loading ? 'opacity-60' : ''}`}>
                {rows.map((c, i) => {
                  const pctOfTotal = stats.total ? (c.debt_amount / stats.total) * 100 : 0;
                  const ratioPct = Math.round(c.ratio * 100);
                  return (
                    <tr
                      key={c.id}
                      onClick={() => handleViewClientDebts(c)}
                      className="group hover:bg-gray-50 cursor-pointer"
                    >
                      <td className="px-4 py-3 text-gray-400 tabular-nums">{i + 1}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-full border text-xs font-semibold flex items-center justify-center shrink-0 ${c.bucket.chip}`}>
                            {initials(c)}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 m-0 truncate flex items-center gap-1.5">
                              {c.name}
                              {c.telegram_chat_id && <Send size={12} className="text-sky-500 shrink-0" aria-label="Telegram ulangan" />}
                            </p>
                            <p className="text-xs text-gray-500 m-0 tabular-nums">{c.phone || '—'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-block px-2 py-0.5 rounded-md border text-xs font-semibold tabular-nums ${c.bucket.chip}`}>
                          {c.oldest_debt_date ? `${c.age} kun` : 'Qo\'lda'}
                        </span>
                        <p className="text-[11px] text-gray-400 m-0 mt-0.5">
                          {c.oldest_debt_date ? `${shortDate(c.oldest_debt_date)} dan` : 'chek yo\'q'}
                        </p>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell whitespace-nowrap">
                        <p className="text-gray-900 m-0 tabular-nums flex items-center gap-1">
                          <ShoppingBag size={12} className="text-gray-400" /> {c.orders} ta · {money(c.spent)}
                        </p>
                        <p className="text-[11px] text-gray-400 m-0">
                          Oxirgi: {c.sinceLast == null ? '—' : c.sinceLast === 0 ? 'bugun' : `${c.sinceLast} kun oldin`}
                        </p>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <div className="flex items-center gap-2" title="Jami xariddan to'lanmagan qismi">
                          <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${ratioPct >= 50 ? 'bg-red-500' : ratioPct >= 25 ? 'bg-orange-400' : 'bg-amber-300'}`}
                              style={{ width: `${ratioPct}%` }}
                            />
                          </div>
                          <span className="w-9 text-right text-xs text-gray-500 tabular-nums">{ratioPct}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <p className="m-0">
                          <span className="font-semibold text-red-600 tabular-nums">{money(c.debt_amount)}</span>
                          <span className="text-xs text-gray-400 ml-1">UZS</span>
                        </p>
                        <p className="text-[11px] text-gray-400 m-0 tabular-nums">jami qarzning {pctOfTotal.toFixed(1)}%</p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1.5">
                          {c.phone && (
                            <a
                              href={`tel:${c.phone}`}
                              onClick={(e) => e.stopPropagation()}
                              title="Qo'ng'iroq qilish"
                              className="p-1.5 rounded-md border border-gray-200 text-gray-500 hover:text-blue-600 hover:border-blue-200"
                            >
                              <Phone size={13} />
                            </a>
                          )}
                          <button
                            onClick={(e) => { e.stopPropagation(); handlePaymentClick(c); }}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-green-600 hover:bg-green-700 text-white rounded-md"
                          >
                            <CreditCard size={13} />
                            To'lov
                          </button>
                          <ChevronRight size={16} className="text-gray-300 group-hover:text-gray-500" />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 text-xs text-gray-500 border-t border-gray-200">
                  <td colSpan={5} className="px-4 py-2.5">
                    {rows.length} ta mijoz{rows.length !== debtors.length && ` (${debtors.length} tadan)`}
                  </td>
                  <td className="px-4 py-2.5 text-right font-semibold text-gray-900 tabular-nums whitespace-nowrap">{money(rowsTotal)} UZS</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Debt Details Modal */}
      {showDebtModal && selectedClient && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setShowDebtModal(false)}>
          <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-50 text-red-600 text-sm font-semibold flex items-center justify-center">
                  {initials(selectedClient)}
                </div>
                <div>
                  <h2 className="text-base font-bold text-gray-900 m-0">{fullName(selectedClient)}</h2>
                  <p className="text-xs text-gray-500 m-0 flex items-center gap-1">
                    <Phone size={11} /> {selectedClient.phone || '—'}
                  </p>
                </div>
              </div>
              <button
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                onClick={() => setShowDebtModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-2 gap-3 p-4 pb-0">
              <div className="rounded-lg bg-red-50 px-3 py-2">
                <p className="text-xs text-red-600 m-0">Jami qarzdorlik</p>
                <p className="text-lg font-bold text-red-700 m-0 tabular-nums">{money(selectedClient.debt_amount)} UZS</p>
              </div>
              <div className="rounded-lg bg-gray-50 px-3 py-2">
                <p className="text-xs text-gray-500 m-0">Qarzli cheklar</p>
                <p className="text-lg font-bold text-gray-900 m-0 tabular-nums">{clientDebts.length} ta</p>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 px-4 pt-3 border-b border-gray-200">
              {[
                { key: 'sales', label: 'Sotuvlar', icon: Receipt, count: clientDebts.length },
                { key: 'transactions', label: 'Tranzaksiyalar', icon: CreditCard, count: clientTransactions.length }
              ].map(({ key, label, icon: Icon, count }) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                    activeTab === key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Icon size={14} />
                  {label}
                  <span className="text-xs text-gray-400">{count}</span>
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto">
              {activeTab === 'sales' && (
                clientDebts.length > 0 ? (
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-white">
                      <tr className="text-[11px] uppercase tracking-wide text-gray-500 border-b border-gray-100">
                        <th className="px-4 py-2 text-left font-semibold">Chek</th>
                        <th className="px-4 py-2 text-left font-semibold">Sana</th>
                        <th className="px-4 py-2 text-right font-semibold">Jami</th>
                        <th className="px-4 py-2 text-right font-semibold">To'langan</th>
                        <th className="px-4 py-2 text-right font-semibold">Qoldi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 tabular-nums">
                      {clientDebts.map((sale) => (
                        <tr key={sale.id}>
                          <td className="px-4 py-2 font-medium text-gray-900">#{sale.receipt_number}</td>
                          <td className="px-4 py-2 text-gray-500">{formatDate(sale.created_at)}</td>
                          <td className="px-4 py-2 text-right text-gray-900">{money(sale.total_amount)}</td>
                          <td className="px-4 py-2 text-right text-green-600">{money(sale.paid_amount)}</td>
                          <td className="px-4 py-2 text-right font-semibold text-red-600">{money(sale.total_amount - sale.paid_amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-gray-500 text-center py-10 text-sm">Qarzdorlik sotuvlari topilmadi</p>
                )
              )}

              {activeTab === 'transactions' && (
                clientTransactions.length > 0 ? (
                  <ul className="divide-y divide-gray-100">
                    {clientTransactions.map((t) => {
                      const isPayment = t.type === 'debt_payment';
                      return (
                        <li key={t.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                          <div className="flex items-center gap-3">
                            <span className={`px-2 py-0.5 rounded text-xs font-semibold ${isPayment ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                              {isPayment ? 'To\'lov' : t.type === 'sale' ? 'Sotuv' : t.type}
                            </span>
                            <span className="text-gray-500 text-xs">{formatDateTime(t.created_at)}</span>
                          </div>
                          <span className={`font-semibold tabular-nums ${isPayment ? 'text-green-600' : 'text-red-600'}`}>
                            {isPayment ? '−' : '+'}{money(t.amount)}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="text-gray-500 text-center py-10 text-sm">Qarzdorlik tranzaksiyalari topilmadi</p>
                )
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2 p-4 border-t border-gray-200">
              <button
                onClick={() => setShowDebtModal(false)}
                className="px-4 py-2 text-sm bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Yopish
              </button>
              {/* Was an inline form calling an undefined handleProcessPayment — crashed on click. */}
              <button
                onClick={() => setShowPaymentModal(true)}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-green-600 hover:bg-green-700 text-white rounded-lg"
              >
                <CreditCard size={15} />
                To'lov qilish
              </button>
            </div>
          </div>
        </div>
      )}

      <AddDebtModal
        isOpen={showAddDebtModal}
        onClose={() => setShowAddDebtModal(false)}
        onAdded={refreshAll}
      />

      <DebtPaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        client={selectedClient}
        currentDebt={selectedClient?.debt_amount || 0}
        onPaymentComplete={handlePaymentCompleted}
      />
    </PageLayout>
  );
}
