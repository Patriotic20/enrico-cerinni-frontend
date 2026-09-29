import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import {
  Plus, RefreshCw, Wallet, Receipt, Target, Percent, Users, Edit, UserX, AlertCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import PageLayout from '../components/layout/PageLayout';
import { Card } from '../components/ui/Card';
import { Button, LoadingSpinner } from '../components/ui';
import EmployeeModal from '../components/modals/EmployeeModal';
import {
  PeriodPicker, Kpi, PlanBar, defaultPeriod, initials, MEDALS,
} from '../components/employees/shared';
import { employeesAPI, financeAPI } from '../api';
import { useConfirm } from '../contexts/ConfirmContext';
import { formatCurrency, compactAmount } from '../utils/format';
import { cn } from '../utils/cn';

export default function EmployeesPage() {
  const navigate = useNavigate();
  const confirm = useConfirm();
  const [period, setPeriod] = useState(defaultPeriod);
  const [board, setBoard] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInactive, setShowInactive] = useState(false);
  const [modal, setModal] = useState({ open: false, employee: null });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [kpiRes, empRes] = await Promise.all([
        employeesAPI.getKpi({ start_date: period.start, end_date: period.end }),
        financeAPI.getEmployees({ size: 100 }),
      ]);
      setBoard(kpiRes.data);
      setEmployees(empRes.data?.items || []);
    } catch (error) {
      console.error('Error loading employees KPI:', error);
      toast.error("Ma'lumotlarni yuklab bo'lmadi");
    } finally {
      setLoading(false);
    }
  }, [period.start, period.end]);

  useEffect(() => { load(); }, [load]);

  // Every employee, with their KPI when they have one. Sellers first by
  // revenue; people who don't sell (warehouse, accounting) go last.
  const rows = useMemo(() => {
    const kpi = new Map((board?.items || []).map(k => [k.id, k]));
    return employees
      .filter(e => showInactive || e.is_active)
      .map(e => ({ ...e, kpi: kpi.get(e.id) }))
      .sort((a, b) =>
        (b.is_seller - a.is_seller)
        || ((b.kpi?.revenue || 0) - (a.kpi?.revenue || 0))
        || a.name.localeCompare(b.name));
  }, [board, employees, showInactive]);

  const inactiveCount = employees.filter(e => !e.is_active).length;
  const chartData = (board?.items || [])
    .filter(k => k.revenue > 0)
    .map(k => ({ name: k.name.split(' ')[0], revenue: k.revenue, id: k.id }));
  const totals = board?.totals;

  const handleDeactivate = async (employee) => {
    const ok = await confirm({
      title: "Xodimni o'chirish",
      message: `${employee.name} ni o'chirmoqchimisiz?`,
      description: "Sotuv yoki ish haqi tarixi bo'lsa, xodim o'chirilmaydi — nofaol qilinadi va KPI tarixi saqlanadi.",
      confirmText: "Ha, o'chirish",
      variant: 'danger',
    });
    if (!ok) return;
    try {
      const res = await financeAPI.deleteEmployee(employee.id);
      toast.success(res.message?.includes('deactivated') ? 'Xodim nofaol qilindi' : "Xodim o'chirildi");
      load();
    } catch (error) {
      console.error('Error deleting employee:', error);
      toast.error("Xodimni o'chirishda xatolik");
    }
  };

  return (
    <PageLayout maxWidth="full" spacing="sm" className="bg-gray-50 min-h-screen">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900 m-0">Xodimlar</h1>
            <p className="text-sm text-gray-500 m-0">Sotuvchilar KPI, reja bajarilishi va komissiya</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <PeriodPicker period={period} onChange={setPeriod} />
            <Button variant="secondary" size="sm" onClick={load} disabled={loading} title="Yangilash" className="px-2">
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </Button>
            <Button size="sm" className="whitespace-nowrap" onClick={() => setModal({ open: true, employee: null })}>
              <Plus size={14} className="mr-1" /> Xodim qo'shish
            </Button>
          </div>
        </div>

        {!board && loading ? (
          <div className="flex items-center justify-center py-24">
            <LoadingSpinner message="Yuklanmoqda..." size="lg" />
          </div>
        ) : totals && (
          <>
            {/* Team KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              <Kpi icon={Wallet} tone="blue" label="Tushum" value={formatCurrency(totals.revenue)}
                hint={`${totals.items_sold} dona mahsulot`} />
              <Kpi icon={Receipt} label="Sotuvlar" value={totals.sales_count}
                hint={`O'rtacha chek ${formatCurrency(totals.avg_check)}`} />
              <Kpi icon={Target} tone="orange" label="Reja bajarilishi"
                value={totals.target_pct == null ? 'Reja yo\'q' : `${Math.round(totals.target_pct)}%`}
                hint={totals.target ? `Reja: ${formatCurrency(totals.target)}` : 'Xodimlarga oylik reja qo\'ying'}>
                {totals.target_pct != null && <PlanBar pct={totals.target_pct} className="mt-2" />}
              </Kpi>
              <Kpi icon={Percent} tone="green" label="Komissiya" value={formatCurrency(totals.commission)}
                hint="Bekor qilinganlarsiz" />
              <Kpi icon={Users} tone="purple" label="Faol sotuvchilar" value={totals.active_sellers}
                hint="Davrda sotuv qilganlar" />
            </div>

            {board.unassigned && (
              <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
                <AlertCircle size={16} className="shrink-0" />
                {board.unassigned.sales_count} ta sotuv ({formatCurrency(board.unassigned.revenue)}) sotuvchisiz —
                sotuvchi tanlash joriy qilinishidan oldingi sotuvlar.
              </div>
            )}

            <div className="grid grid-cols-1 2xl:grid-cols-3 gap-4 items-start">
              {/* Leaderboard */}
              <Card className="p-0 2xl:col-span-2 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                  <h2 className="text-sm font-semibold text-gray-900 m-0">Reyting</h2>
                  {inactiveCount > 0 && (
                    <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                      <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)}
                        className="h-3.5 w-3.5 rounded border-gray-300" />
                      Nofaollarni ko'rsatish ({inactiveCount})
                    </label>
                  )}
                </div>
                <div className={cn('overflow-x-auto transition-opacity', loading && 'opacity-50')}>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs uppercase tracking-wide text-gray-500 border-b border-gray-200">
                        <th className="py-2.5 px-3 font-medium w-10">#</th>
                        <th className="py-2.5 px-3 font-medium">Xodim</th>
                        <th className="py-2.5 px-3 font-medium text-right">Sotuv</th>
                        <th className="py-2.5 px-3 font-medium text-right">Tushum</th>
                        <th className="py-2.5 px-3 font-medium text-right">O'rt. chek</th>
                        <th className="py-2.5 px-3 font-medium text-right">Dona</th>
                        <th className="py-2.5 px-3 font-medium min-w-[140px]">Reja</th>
                        <th className="py-2.5 px-3 font-medium text-right">Komissiya</th>
                        <th className="py-2.5 px-3 font-medium text-right" title="Qarzga sotuvlar / bekor qilinganlar">Qarz / bekor</th>
                        <th className="py-2.5 px-3 w-20" />
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map(e => {
                        const k = e.kpi;
                        return (
                          <tr key={e.id} onClick={() => navigate(`/employees/${e.id}`)}
                            className={cn('border-b border-gray-100 cursor-pointer hover:bg-blue-50/40', !e.is_active && 'opacity-55')}>
                            <td className="px-3 py-2.5 text-center">
                              {k?.rank ? (MEDALS[k.rank] || <span className="text-gray-500 tabular-nums">{k.rank}</span>) : <span className="text-gray-300">—</span>}
                            </td>
                            <td className="px-3 py-2.5">
                              <div className="flex items-center gap-2.5">
                                <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-semibold shrink-0">
                                  {initials(e.name)}
                                </span>
                                <div className="min-w-0">
                                  <div className="font-medium text-gray-900 truncate">{e.name}</div>
                                  <div className="text-xs text-gray-500 truncate">
                                    {e.position}
                                    {!e.is_seller && ' · sotuvchi emas'}
                                    {!e.is_active && ' · nofaol'}
                                  </div>
                                </div>
                              </div>
                            </td>
                            {k ? (
                              <>
                                <td className="px-3 py-2.5 text-right tabular-nums">{k.sales_count}</td>
                                <td className="px-3 py-2.5 text-right tabular-nums font-semibold text-gray-900 whitespace-nowrap">{formatCurrency(k.revenue)}</td>
                                <td className="px-3 py-2.5 text-right tabular-nums text-gray-700 whitespace-nowrap">{formatCurrency(k.avg_check)}</td>
                                <td className="px-3 py-2.5 text-right tabular-nums text-gray-700">{k.items_sold}</td>
                                <td className="px-3 py-2.5">
                                  {k.target_pct == null ? (
                                    <span className="text-xs text-gray-400">Reja yo'q</span>
                                  ) : (
                                    <div title={`${formatCurrency(k.revenue)} / ${formatCurrency(k.target)}`}>
                                      <div className="text-xs text-gray-700 tabular-nums mb-1">{Math.round(k.target_pct)}%</div>
                                      <PlanBar pct={k.target_pct} />
                                    </div>
                                  )}
                                </td>
                                <td className="px-3 py-2.5 text-right tabular-nums whitespace-nowrap">
                                  <div className="text-green-700 font-medium">{formatCurrency(k.commission)}</div>
                                  <div className="text-xs text-gray-400">{k.commission_rate}%</div>
                                </td>
                                <td className="px-3 py-2.5 text-right tabular-nums text-xs">
                                  <span className={k.debt_sales ? 'text-orange-600' : 'text-gray-400'}>{k.debt_sales}</span>
                                  <span className="text-gray-300"> / </span>
                                  <span className={k.cancelled_sales ? 'text-red-600' : 'text-gray-400'}>{k.cancelled_sales}</span>
                                </td>
                              </>
                            ) : (
                              <td colSpan={7} className="px-3 py-2.5 text-xs text-gray-400">KPI hisoblanmaydi</td>
                            )}
                            <td className="px-3 py-2.5">
                              <div className="flex justify-end gap-0.5">
                                <button type="button" title="Tahrirlash" aria-label="Tahrirlash"
                                  onClick={(ev) => { ev.stopPropagation(); setModal({ open: true, employee: e }); }}
                                  className="p-1.5 rounded-md text-gray-500 hover:text-blue-600 hover:bg-blue-50">
                                  <Edit size={15} />
                                </button>
                                {e.is_active && (
                                  <button type="button" title="O'chirish" aria-label="O'chirish"
                                    onClick={(ev) => { ev.stopPropagation(); handleDeactivate(e); }}
                                    className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50">
                                    <UserX size={15} />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {rows.length === 0 && (
                        <tr>
                          <td colSpan={10} className="px-3 py-12 text-center text-sm text-gray-500">
                            Hali xodimlar yo'q. "Xodim qo'shish" tugmasini bosing.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>

              {/* Revenue comparison */}
              <Card className="p-4">
                <h2 className="text-sm font-semibold text-gray-900 m-0 mb-3">Tushum bo'yicha taqqoslash</h2>
                {chartData.length === 0 ? (
                  <p className="text-sm text-gray-500 py-12 text-center m-0">Bu davrda sotuv yo'q</p>
                ) : (
                  <ResponsiveContainer width="100%" height={Math.max(160, chartData.length * 44)}>
                    <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 16 }}>
                      <XAxis type="number" tickFormatter={compactAmount} tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="name" width={70} tick={{ fontSize: 12, fill: '#374151' }} axisLine={false} tickLine={false} />
                      <Tooltip formatter={(v) => [formatCurrency(v), 'Tushum']} cursor={{ fill: '#f3f4f6' }} />
                      <Bar dataKey="revenue" radius={[0, 4, 4, 0]} onClick={(d) => navigate(`/employees/${d.id}`)} className="cursor-pointer">
                        {chartData.map((d, i) => <Cell key={d.id} fill={i === 0 ? '#2563eb' : '#93c5fd'} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </Card>
            </div>
          </>
        )}

        <EmployeeModal
          isOpen={modal.open}
          onClose={() => setModal({ open: false, employee: null })}
          employee={modal.employee}
          onSuccess={() => { setModal({ open: false, employee: null }); load(); }}
        />
      </div>
    </PageLayout>
  );
}
