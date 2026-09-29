import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import {
  ArrowLeft, Edit, Wallet, Receipt, Calculator, Package, Percent, AlertCircle, XCircle, Banknote, Phone, Trophy,
} from 'lucide-react';
import toast from 'react-hot-toast';
import PageLayout from '../components/layout/PageLayout';
import { Card } from '../components/ui/Card';
import { Button, LoadingSpinner } from '../components/ui';
import Modal from '../components/modals/Modal';
import EmployeeModal from '../components/modals/EmployeeModal';
import { SalesTable, SalesPagination, SaleDetailsModal } from '../components/sales';
import { PeriodPicker, Kpi, PlanBar, defaultPeriod, initials } from '../components/employees/shared';
import { employeesAPI, financeAPI } from '../api';
import useSales, { ymd } from '../hooks/useSales';
import { formatCurrency, compactAmount } from '../utils/format';

const dayTick = (d) => d.slice(8, 10);

// Salary for the period = fixed salary + commission earned in it. Prefilled,
// editable: advances, bonuses and deductions are the manager's call.
const PaySalaryModal = ({ isOpen, onClose, employee, kpi, period, onPaid }) => {
  const suggested = Math.round((employee?.salary || 0) + (kpi?.commission || 0));
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(ymd(new Date()));
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setAmount(String(suggested));
    setDate(ymd(new Date()));
    setNotes(`${period.start} — ${period.end}: oklad ${formatCurrency(employee?.salary)} + komissiya ${formatCurrency(kpi?.commission)}`);
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = async (e) => {
    e.preventDefault();
    const value = parseFloat(amount);
    if (!(value > 0)) return toast.error("Summani to'g'ri kiriting");
    setSaving(true);
    try {
      await financeAPI.createSalaryPayment({
        employee_id: employee.id,
        amount: value,
        payment_date: new Date(`${date}T12:00:00`).toISOString(),
        notes: notes || null,
      });
      toast.success("Ish haqi to'landi");
      onPaid();
    } catch (error) {
      console.error('Error paying salary:', error);
      toast.error("Ish haqini saqlashda xatolik");
    } finally {
      setSaving(false);
    }
  };

  const field = 'w-full px-2.5 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500';
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Ish haqi to'lash" size="sm">
      <form onSubmit={submit} className="space-y-4">
        <div className="rounded-lg bg-gray-50 border border-gray-200 p-3 text-sm space-y-1">
          <div className="flex justify-between"><span className="text-gray-600">Oklad</span><span className="tabular-nums">{formatCurrency(employee?.salary)}</span></div>
          <div className="flex justify-between"><span className="text-gray-600">Komissiya ({kpi?.commission_rate || 0}%)</span><span className="tabular-nums text-green-700">+ {formatCurrency(kpi?.commission)}</span></div>
          <div className="flex justify-between font-semibold border-t border-gray-200 pt-1"><span>Tavsiya</span><span className="tabular-nums">{formatCurrency(suggested)}</span></div>
        </div>
        <label className="block">
          <span className="block text-xs font-medium text-gray-700 mb-1">Summa *</span>
          <input type="number" min="0" step="1000" value={amount} onChange={(e) => setAmount(e.target.value)} className={field} />
        </label>
        <label className="block">
          <span className="block text-xs font-medium text-gray-700 mb-1">To'lov sanasi *</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={field} required />
        </label>
        <label className="block">
          <span className="block text-xs font-medium text-gray-700 mb-1">Izoh</span>
          <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className={field} />
        </label>
        <div className="flex justify-end gap-2 pt-2 border-t border-gray-200">
          <Button type="button" variant="secondary" size="sm" onClick={onClose} disabled={saving}>Bekor qilish</Button>
          <Button type="submit" size="sm" loading={saving}>To'lash</Button>
        </div>
      </form>
    </Modal>
  );
};

export default function EmployeeDetailPage() {
  const { id } = useParams();
  const [period, setPeriod] = useState(defaultPeriod);
  const [employee, setEmployee] = useState(null);
  const [data, setData] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);

  // The seller's own sales, through the same hook/table as the sales page.
  const sales = useSales();
  const { filters, setDateRange, handleFilterChange, loadSales } = sales;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [kpiRes, empRes, payRes] = await Promise.all([
        employeesAPI.getEmployeeKpi(id, { start_date: period.start, end_date: period.end }),
        financeAPI.getEmployees({ size: 100 }),
        financeAPI.getSalaryPayments({ employee_id: id, limit: 10 }),
      ]);
      setData(kpiRes.data);
      setEmployee((empRes.data?.items || []).find(e => String(e.id) === String(id)) || null);
      setPayments(payRes.data?.items || []);
    } catch (error) {
      console.error('Error loading employee:', error);
      toast.error("Ma'lumotlarni yuklab bo'lmadi");
    } finally {
      setLoading(false);
    }
  }, [id, period.start, period.end]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    handleFilterChange('seller_id', String(id));
    setDateRange(period.start, period.end);
  }, [id, period.start, period.end]); // eslint-disable-line react-hooks/exhaustive-deps

  // Only once the filters point at this seller — the hook starts unfiltered.
  const ready = filters.seller_id === String(id) && filters.start_date === period.start && filters.end_date === period.end;
  useEffect(() => {
    if (ready) loadSales();
  }, [ready, filters, sales.pagination.page, sales.pagination.limit]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!data && loading) {
    return (
      <PageLayout>
        <div className="flex items-center justify-center py-24"><LoadingSpinner message="Yuklanmoqda..." size="lg" /></div>
      </PageLayout>
    );
  }
  if (!data) {
    return (
      <PageLayout>
        <div className="py-24 text-center text-gray-500">
          Xodim topilmadi. <Link to="/employees" className="text-blue-600">Orqaga</Link>
        </div>
      </PageLayout>
    );
  }

  const k = data.kpi;
  const name = employee?.name || k.name;

  return (
    <PageLayout maxWidth="full" spacing="sm" className="bg-gray-50 min-h-screen">
      <div className="space-y-4">
        <Link to="/employees" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900">
          <ArrowLeft size={14} /> Xodimlar
        </Link>

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="w-12 h-12 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-base font-semibold">
              {initials(name)}
            </span>
            <div>
              <h1 className="text-xl font-bold text-gray-900 m-0 flex items-center gap-2">
                {name}
                {!k.is_active && <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700">Nofaol</span>}
              </h1>
              <p className="text-sm text-gray-500 m-0 flex flex-wrap items-center gap-x-3">
                <span>{k.position}</span>
                {k.phone && <span className="inline-flex items-center gap-1"><Phone size={12} /> {k.phone}</span>}
                <span>Oklad {formatCurrency(k.salary)}</span>
                {k.is_seller && <span>Komissiya {k.commission_rate}%</span>}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <PeriodPicker period={period} onChange={setPeriod} />
            <Button variant="secondary" size="sm" className="whitespace-nowrap" onClick={() => setEditOpen(true)} disabled={!employee}>
              <Edit size={14} className="mr-1" /> Tahrirlash
            </Button>
            <Button size="sm" className="whitespace-nowrap" onClick={() => setPayOpen(true)} disabled={!employee}>
              <Banknote size={14} className="mr-1" /> Ish haqi to'lash
            </Button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 2xl:grid-cols-7 gap-3">
          <Kpi icon={Wallet} tone="blue" label="Tushum" value={formatCurrency(k.revenue)}
            hint={k.rank ? `Reytingda ${k.rank}-o'rin / ${data.ranked}` : 'Reytingda yo\'q'} />
          <Kpi icon={Receipt} label="Sotuvlar" value={k.sales_count} />
          <Kpi icon={Calculator} label="O'rtacha chek" value={formatCurrency(k.avg_check)} />
          <Kpi icon={Package} label="Mahsulot" value={`${k.items_sold} dona`}
            hint={k.sales_count ? `Chekda ${(k.items_sold / k.sales_count).toFixed(1)} dona` : null} />
          <Kpi icon={Percent} tone="green" label="Komissiya" value={formatCurrency(k.commission)} hint={`${k.commission_rate}% tushumdan`} />
          <Kpi icon={AlertCircle} tone="orange" label="Qarzga sotuv" value={k.debt_sales}
            hint={`Qoldiq ${formatCurrency(k.outstanding)}`} />
          <Kpi icon={XCircle} tone="red" label="Bekor qilingan" value={k.cancelled_sales} />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 items-start">
          {/* Daily trend */}
          <Card className="p-4 xl:col-span-2">
            <h2 className="text-sm font-semibold text-gray-900 m-0 mb-3">Kunlik tushum</h2>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={data.daily} margin={{ left: 0, right: 8 }}>
                <CartesianGrid vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="date" tickFormatter={dayTick} tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false}
                  interval={data.daily.length > 31 ? 'preserveStartEnd' : 0} />
                <YAxis tickFormatter={compactAmount} tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} width={48} />
                <Tooltip
                  labelFormatter={(d) => new Date(d).toLocaleDateString('uz-UZ', { day: 'numeric', month: 'long', weekday: 'short' })}
                  formatter={(v, _n, p) => [`${formatCurrency(v)} · ${p.payload.sales_count} ta`, 'Tushum']}
                  cursor={{ fill: '#f3f4f6' }}
                />
                <Bar dataKey="revenue" fill="#2563eb" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <div className="space-y-4">
            {/* Plan */}
            <Card className="p-4">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-semibold text-gray-900 m-0 flex items-center gap-1.5"><Trophy size={14} className="text-amber-500" /> Reja</h2>
                {k.target_pct != null && <span className="text-lg font-bold tabular-nums">{Math.round(k.target_pct)}%</span>}
              </div>
              {k.target_pct == null ? (
                <p className="text-sm text-gray-500 m-0">
                  Oylik reja belgilanmagan. <button type="button" onClick={() => setEditOpen(true)} className="text-blue-600 hover:underline">Reja qo'yish</button>
                </p>
              ) : (
                <>
                  <PlanBar pct={k.target_pct} className="h-2.5" />
                  <div className="flex justify-between text-xs text-gray-500 mt-2 tabular-nums">
                    <span>{formatCurrency(k.revenue)}</span>
                    <span>Reja: {formatCurrency(k.target)}</span>
                  </div>
                  {k.revenue < k.target && (
                    <p className="text-xs text-gray-600 mt-2 m-0">Rejagacha: <span className="font-medium">{formatCurrency(k.target - k.revenue)}</span></p>
                  )}
                </>
              )}
            </Card>

            {/* Salary history */}
            <Card className="p-4">
              <h2 className="text-sm font-semibold text-gray-900 m-0 mb-2">Oxirgi ish haqi to'lovlari</h2>
              {payments.length === 0 ? (
                <p className="text-sm text-gray-500 m-0">To'lovlar yo'q</p>
              ) : (
                <ul className="divide-y divide-gray-100 m-0 p-0 list-none">
                  {payments.map(p => (
                    <li key={p.id} className="flex justify-between py-1.5 text-sm">
                      <span className="text-gray-600">{new Date(p.payment_date).toLocaleDateString('uz-UZ')}</span>
                      <span className="font-medium tabular-nums">{formatCurrency(p.amount)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </div>

        {/* Seller's sales */}
        <Card className="p-4">
          <h2 className="text-sm font-semibold text-gray-900 m-0 mb-3">Sotuvlari</h2>
          {sales.sales.length === 0 ? (
            <p className="text-sm text-gray-500 py-8 text-center m-0">{sales.loading ? 'Yuklanmoqda...' : "Bu davrda sotuv yo'q"}</p>
          ) : (
            <>
              <SalesTable
                sales={sales.sales}
                onViewSale={sales.handleViewSale}
                onCancelSale={async (saleId) => { await sales.handleCancelSale(saleId); load(); }}
                formatTime={sales.formatTime}
                formatCurrency={sales.formatCurrency}
                getStatusBadge={sales.getStatusBadge}
              />
              <div className="pt-4 mt-2 border-t border-gray-100">
                <SalesPagination
                  pagination={sales.pagination}
                  onPageChange={sales.handlePageChange}
                  onPageSizeChange={sales.handlePageSizeChange}
                />
              </div>
            </>
          )}
        </Card>

        <SaleDetailsModal
          selectedSale={sales.selectedSale}
          showSaleModal={sales.showSaleModal}
          onClose={() => sales.setShowSaleModal(false)}
          formatDate={sales.formatDate}
          formatCurrency={sales.formatCurrency}
          getStatusBadge={sales.getStatusBadge}
        />
        <EmployeeModal
          isOpen={editOpen}
          onClose={() => setEditOpen(false)}
          employee={employee}
          onSuccess={() => { setEditOpen(false); load(); }}
        />
        <PaySalaryModal
          isOpen={payOpen}
          onClose={() => setPayOpen(false)}
          employee={employee}
          kpi={k}
          period={period}
          onPaid={() => { setPayOpen(false); load(); }}
        />
      </div>
    </PageLayout>
  );
}
