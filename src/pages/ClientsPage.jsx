/**
 * Clients Page
 *
 * Customer desk: KPIs, behaviour segments (VIP, loyal, at risk, bad debtors…)
 * with a marketing tip per segment, top customers / risky debtors, and a
 * working table with bulk messaging and CSV export.
 *
 * @page
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Search, Plus, Trash2, Edit, MessageSquare, Phone, MapPin, Users, Download,
  Crown, Heart, Sparkles, UserCheck, AlertTriangle, UserX, Ban, UserPlus,
  TrendingUp, Wallet, Receipt, Repeat, Send, X, Lightbulb,
} from 'lucide-react';
import toast from 'react-hot-toast';
import PageLayout from '../components/layout/PageLayout';
import { Button, Card } from '../components/ui';
import Table from '../components/tables/Table';
import ClientManagementModal from '../components/modals/ClientManagementModal';
import ClientMessagingModal from '../components/modals/ClientMessagingModal';
import { clientsAPI } from '../api';
import { useAuth } from '../contexts/AuthContext';
import { isStaff } from '../utils/constants';
import { downloadCsv } from '../utils/csv';
import { cn } from '../utils/cn';

const PAGE_SIZE = 15;
const DAY = 86_400_000;

// Checked top to bottom; a client lands in the first segment that matches.
const SEGMENTS = [
  {
    key: 'bad_debt', label: 'Muammoli qarzdor', icon: Ban,
    badge: 'bg-red-50 text-red-700 ring-red-200', dot: 'bg-red-500',
    rule: 'Qarz 60 kundan eski yoki xaridlarning yarmidan ko\'pi',
    tip: 'Qarz eslatmasi yuboring, yangi nasiyani to\'xtating. To\'lov jadvalini kelishib oling.',
  },
  {
    key: 'vip', label: 'VIP', icon: Crown,
    badge: 'bg-amber-50 text-amber-700 ring-amber-200', dot: 'bg-amber-500',
    rule: 'Xarid summasi bo\'yicha top 20%, oxirgi 90 kunda faol',
    tip: 'Yangi kolleksiyaga birinchi taklif qiling, shaxsiy chegirma yoki sovg\'a bering.',
  },
  {
    key: 'new', label: 'Yangi', icon: Sparkles,
    badge: 'bg-blue-50 text-blue-700 ring-blue-200', dot: 'bg-blue-500',
    rule: 'Birinchi xarid oxirgi 30 kunda',
    tip: 'Rahmat xabarini yuboring va ikkinchi xarid uchun bonus taklif qiling.',
  },
  {
    key: 'loyal', label: 'Sodiq', icon: Heart,
    badge: 'bg-emerald-50 text-emerald-700 ring-emerald-200', dot: 'bg-emerald-500',
    rule: '3+ xarid, oxirgi 90 kunda faol',
    tip: 'Sodiqlik bonusi bering, do\'stini olib kelsa chegirma taklif qiling.',
  },
  {
    key: 'regular', label: 'Faol', icon: UserCheck,
    badge: 'bg-sky-50 text-sky-700 ring-sky-200', dot: 'bg-sky-500',
    rule: 'Oxirgi 60 kunda xarid qilgan',
    tip: 'Yangi kelgan mahsulotlar haqida xabar bering — sodiq mijozga aylantiring.',
  },
  {
    key: 'at_risk', label: 'Xavf ostida', icon: AlertTriangle,
    badge: 'bg-orange-50 text-orange-700 ring-orange-200', dot: 'bg-orange-500',
    rule: '60–180 kundan beri xarid yo\'q',
    tip: '"Sizni sog\'indik" xabari va 10% chegirma bilan qaytaring.',
  },
  {
    key: 'lost', label: 'Yo\'qotilgan', icon: UserX,
    badge: 'bg-gray-100 text-gray-700 ring-gray-200', dot: 'bg-gray-400',
    rule: '180 kundan ortiq xarid yo\'q',
    tip: 'Kuchli qaytarish taklifi (15–20%) yuboring yoki ro\'yxatni tozalang.',
  },
  {
    key: 'none', label: 'Xarid qilmagan', icon: UserPlus,
    badge: 'bg-violet-50 text-violet-700 ring-violet-200', dot: 'bg-violet-400',
    rule: 'Ro\'yxatda bor, lekin xarid yo\'q',
    tip: 'Birinchi xarid uchun maxsus taklif yuboring.',
  },
];
const SEGMENT_BY_KEY = Object.fromEntries(SEGMENTS.map(s => [s.key, s]));

const money = (n) => `${Math.round(Number(n) || 0).toLocaleString('ru-RU')} UZS`;
const daysSince = (d, now) => (d ? Math.floor((now - new Date(d)) / DAY) : null);
const ago = (days) => {
  if (days == null) return '—';
  if (days <= 0) return 'Bugun';
  if (days === 1) return 'Kecha';
  if (days < 30) return `${days} kun oldin`;
  if (days < 365) return `${Math.floor(days / 30)} oy oldin`;
  return `${Math.floor(days / 365)} yil oldin`;
};
const initials = (c) => `${c.first_name?.[0] || ''}${c.last_name?.[0] || ''}`.toUpperCase() || '?';

// Add derived metrics + segment to each client. VIP threshold is the 80th
// percentile of spend among buyers, so it adapts as the shop grows.
function enrich(raw) {
  const now = Date.now();
  const spends = raw.filter(c => c.orders > 0).map(c => c.spent).sort((a, b) => a - b);
  const vipLine = spends.length ? spends[Math.floor(spends.length * 0.8)] : Infinity;

  return raw.map(c => {
    const recency = daysSince(c.last_purchase_date, now);
    const debtAge = daysSince(c.oldest_debt_date, now) ?? 0;
    const tenure = daysSince(c.first_purchase_date, now);
    let segment;
    if (c.debt_amount > 0 && (debtAge > 60 || c.debt_amount > c.spent * 0.5)) segment = 'bad_debt';
    else if (!c.orders) segment = 'none';
    else if (c.spent >= vipLine && recency <= 90) segment = 'vip';
    else if (tenure <= 30) segment = 'new';
    else if (c.orders >= 3 && recency <= 90) segment = 'loyal';
    else if (recency <= 60) segment = 'regular';
    else if (recency <= 180) segment = 'at_risk';
    else segment = 'lost';

    return {
      ...c,
      name: `${c.first_name || ''} ${c.last_name || ''}`.trim() || 'Noma\'lum',
      recency,
      debtAge,
      avgCheck: c.orders ? c.spent / c.orders : 0,
      segment,
      // Sort key for the "last purchase" column; never-bought sorts last.
      last_ts: c.last_purchase_date ? new Date(c.last_purchase_date).getTime() : 0,
      isNew: daysSince(c.created_at, now) <= 30,
    };
  });
}

const Kpi = ({ icon: Icon, label, value, sub, tone }) => (
  <Card padding="sm" className="flex items-start gap-3">
    <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0', tone)}>
      <Icon size={18} />
    </div>
    <div className="min-w-0">
      <p className="text-xs text-gray-500 m-0">{label}</p>
      <p className="text-lg font-bold text-gray-900 m-0 truncate">{value}</p>
      {sub && <p className="text-xs text-gray-500 m-0 truncate">{sub}</p>}
    </div>
  </Card>
);

const SegmentBadge = ({ segment }) => {
  const s = SEGMENT_BY_KEY[segment];
  return (
    <span className={cn('inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium ring-1 ring-inset', s.badge)}>
      <s.icon size={10} />{s.label}
    </span>
  );
};

const MiniList = ({ title, icon: Icon, items, empty, render, footer }) => (
  <Card padding="none" className="overflow-hidden">
    <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
      <Icon size={16} className="text-gray-500" />
      <h3 className="text-sm font-semibold text-gray-900 m-0">{title}</h3>
    </div>
    {items.length ? <ul className="divide-y divide-gray-100">{items.map(render)}</ul>
      : <p className="px-4 py-6 text-sm text-gray-500 text-center">{empty}</p>}
    {footer && <div className="px-4 py-2.5 bg-gray-50 text-xs text-gray-600 border-t border-gray-100">{footer}</div>}
  </Card>
);

export default function ClientsPage() {
  // Deleting and messaging clients are staff-only; the API rejects them for cashiers.
  const canManage = isStaff(useAuth().user);

  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [segment, setSegment] = useState('all');
  const [sort, setSort] = useState({ key: 'spent', dir: 'desc' });
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState([]);
  const [modal, setModal] = useState({ isOpen: false, mode: 'add', client: null, loading: false, deleting: false });
  const [messaging, setMessaging] = useState({ isOpen: false, client: null, ids: [] });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await clientsAPI.getInsights();
      setClients(enrich(res.data || []));
    } catch {
      toast.error('Mijozlarni yuklashda xatolik');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ---- Overview numbers -------------------------------------------------
  const stats = useMemo(() => {
    const buyers = clients.filter(c => c.orders > 0);
    const revenue = buyers.reduce((s, c) => s + c.spent, 0);
    const orders = buyers.reduce((s, c) => s + c.orders, 0);
    const debtors = clients.filter(c => c.debt_amount > 0);
    const bySpend = [...buyers].sort((a, b) => b.spent - a.spent);
    const top20 = bySpend.slice(0, Math.max(1, Math.ceil(bySpend.length * 0.2)));
    const counts = Object.fromEntries(SEGMENTS.map(s => [s.key, { n: 0, revenue: 0 }]));
    clients.forEach(c => { counts[c.segment].n++; counts[c.segment].revenue += c.spent; });
    return {
      total: clients.length,
      newCount: clients.filter(c => c.isNew).length,
      active30: clients.filter(c => c.recency != null && c.recency <= 30).length,
      revenue,
      ltv: buyers.length ? revenue / buyers.length : 0,
      avgCheck: orders ? revenue / orders : 0,
      repeatRate: buyers.length ? buyers.filter(c => c.orders >= 2).length / buyers.length : 0,
      debt: debtors.reduce((s, c) => s + c.debt_amount, 0),
      debtors: debtors.length,
      topCustomers: bySpend.slice(0, 5),
      topShare: revenue ? top20.reduce((s, c) => s + c.spent, 0) / revenue : 0,
      riskyDebtors: [...debtors].sort((a, b) => b.debt_amount - a.debt_amount).slice(0, 5),
      counts,
    };
  }, [clients]);

  // ---- Table data -------------------------------------------------------
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = clients.filter(c =>
      (segment === 'all' || c.segment === segment) &&
      (!q || c.name.toLowerCase().includes(q) || c.phone?.includes(q) || c.address?.toLowerCase().includes(q)));
    const { key, dir } = sort;
    return list.sort((a, b) => (a[key] < b[key] ? -1 : a[key] > b[key] ? 1 : 0) * (dir === 'asc' ? 1 : -1));
  }, [clients, search, segment, sort]);

  useEffect(() => { setPage(1); }, [search, segment]);
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // ---- Actions ----------------------------------------------------------
  const openModal = (mode, client = null) => setModal({ isOpen: true, mode, client, loading: false, deleting: false });
  const closeModal = () => setModal(m => ({ ...m, isOpen: false, client: null }));
  const message = (ids, client = null) => setMessaging({ isOpen: true, client, ids });

  const save = async (data) => {
    setModal(m => ({ ...m, loading: true }));
    try {
      const res = modal.mode === 'edit'
        ? await clientsAPI.updateClient(modal.client.id, data)
        : await clientsAPI.createClient(data);
      if (res?.success === false) throw new Error(res.message);
      toast.success(modal.mode === 'edit' ? 'Mijoz yangilandi' : 'Mijoz qo\'shildi');
      closeModal();
      load();
    } catch (e) {
      toast.error(e.message || 'Saqlashda xatolik');
      setModal(m => ({ ...m, loading: false }));
    }
  };

  const remove = async (id) => {
    const ids = id === 'bulk' ? selected : [id];
    setModal(m => ({ ...m, deleting: true }));
    try {
      await Promise.all(ids.map(i => clientsAPI.deleteClient(i)));
      toast.success(`${ids.length} ta mijoz o'chirildi`);
      setSelected(s => s.filter(i => !ids.includes(i)));
      closeModal();
      load();
    } catch {
      toast.error('Mijozni o\'chirishda xatolik yuz berdi');
      setModal(m => ({ ...m, deleting: false }));
    }
  };

  const exportCsv = (rows, name) => downloadCsv(
    `mijozlar-${name}-${new Date().toISOString().slice(0, 10)}.csv`,
    ['Ism', 'Telefon', 'Segment', 'Xaridlar', 'Jami xarid', 'O\'rtacha chek', 'Qarz', 'Oxirgi xarid', 'Manzil'],
    rows.map(c => [c.name, c.phone, SEGMENT_BY_KEY[c.segment].label, c.orders, Math.round(c.spent),
      Math.round(c.avgCheck), Math.round(c.debt_amount), c.last_purchase_date?.slice(0, 10), c.address]),
  );

  const activeSeg = SEGMENT_BY_KEY[segment];
  const segmentIds = filtered.map(c => c.id);

  const columns = [
    {
      key: 'name', label: 'Mijoz', width: '24%',
      render: (_, c) => {
        const s = SEGMENT_BY_KEY[c.segment];
        return (
          <div className="flex items-center gap-2.5">
            <div className={cn('w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0', s.dot)}>
              {initials(c)}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate m-0">{c.name}</p>
              <SegmentBadge segment={c.segment} />
            </div>
          </div>
        );
      },
    },
    {
      key: 'phone', label: 'Aloqa', width: '22%', sortable: false,
      render: (_, c) => (
        <div className="space-y-0.5 min-w-0">
          {c.phone ? (
            <a href={`tel:${c.phone}`} onClick={e => e.stopPropagation()}
              className="flex items-center gap-1 text-sm text-blue-600 hover:underline">
              <Phone className="h-3 w-3" />{c.phone}
              {c.telegram_chat_id && <Send className="h-3 w-3 text-sky-500 ml-1" aria-label="Telegram ulangan" />}
            </a>
          ) : <span className="text-sm text-gray-400">—</span>}
          {c.address && (
            <div className="flex items-center gap-1 text-xs text-gray-500 truncate">
              <MapPin className="h-3 w-3 flex-shrink-0" /><span className="truncate">{c.address}</span>
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'orders', label: 'Xaridlar', align: 'right',
      render: (_, c) => (
        <div className="text-right">
          <p className="text-sm font-medium text-gray-900 m-0">{c.orders} ta</p>
          {c.orders > 0 && <p className="text-xs text-gray-500 m-0">o'rt. {money(c.avgCheck)}</p>}
        </div>
      ),
    },
    {
      key: 'spent', label: 'Jami xarid', align: 'right',
      render: v => <span className="text-sm font-semibold text-gray-900">{money(v)}</span>,
    },
    {
      key: 'debt_amount', label: 'Qarz', align: 'right',
      render: (v, c) => v > 0 ? (
        <div className="text-right">
          <span className="text-sm font-semibold text-red-600">{money(v)}</span>
          {c.debtAge > 0 && <p className={cn('text-xs m-0', c.debtAge > 60 ? 'text-red-500' : 'text-gray-500')}>{c.debtAge} kun</p>}
        </div>
      ) : <span className="text-xs text-emerald-600">Qarzi yo'q</span>,
    },
    {
      key: 'last_ts', label: 'Oxirgi xarid',
      render: (_, c) => (
        <div className="text-sm">
          <p className="text-gray-900 m-0">{ago(c.recency)}</p>
          {c.last_purchase_date && <p className="text-xs text-gray-500 m-0">{c.last_purchase_date.slice(0, 10)}</p>}
        </div>
      ),
    },
    {
      key: 'actions', label: '', align: 'right', sortable: false,
      render: (_, c) => (
        <div className="flex items-center justify-end gap-0.5" onClick={e => e.stopPropagation()}>
          {canManage && (
            <button type="button" title="Xabar yuborish" onClick={() => message([c.id], c)}
              className="p-1.5 rounded text-gray-500 hover:text-blue-600 hover:bg-blue-50">
              <MessageSquare size={15} />
            </button>
          )}
          <button type="button" title="Tahrirlash" onClick={() => openModal('edit', c)}
            className="p-1.5 rounded text-gray-500 hover:text-emerald-600 hover:bg-emerald-50">
            <Edit size={15} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <PageLayout maxWidth="full" spacing="sm" className="bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 m-0">Mijozlar</h1>
          <p className="text-sm text-gray-500 m-0">Mijozlar bazasi, segmentlar va marketing takliflari</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => exportCsv(filtered, segment)}>
            <Download size={14} className="mr-1" />CSV
          </Button>
          {canManage && (
            <Button variant="outline" size="sm" onClick={() => message([])}>
              <Send size={14} className="mr-1" />Hammaga xabar
            </Button>
          )}
          <Button size="sm" onClick={() => openModal('add')}>
            <Plus size={16} className="mr-1" />Yangi mijoz
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
        <Kpi icon={Users} tone="bg-blue-50 text-blue-600" label="Jami mijozlar" value={stats.total}
          sub={`+${stats.newCount} yangi (30 kun)`} />
        <Kpi icon={TrendingUp} tone="bg-emerald-50 text-emerald-600" label="Faol (30 kun)" value={stats.active30}
          sub={`${stats.total ? Math.round(stats.active30 / stats.total * 100) : 0}% bazadan`} />
        <Kpi icon={Wallet} tone="bg-indigo-50 text-indigo-600" label="Mijozlar tushumi" value={money(stats.revenue)}
          sub={`O'rt. LTV: ${money(stats.ltv)}`} />
        <Kpi icon={Receipt} tone="bg-amber-50 text-amber-600" label="O'rtacha chek" value={money(stats.avgCheck)}
          sub={<><Repeat size={10} className="inline mr-1" />Qayta xarid: {Math.round(stats.repeatRate * 100)}%</>} />
        <Kpi icon={AlertTriangle} tone="bg-red-50 text-red-600" label="Qarzdorlik" value={money(stats.debt)}
          sub={`${stats.debtors} ta qarzdor`} />
      </div>

      {/* Segments */}
      <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-2 mb-3">
        {SEGMENTS.map(s => {
          const { n, revenue } = stats.counts[s.key];
          const active = segment === s.key;
          return (
            <button key={s.key} type="button" title={s.rule}
              onClick={() => setSegment(active ? 'all' : s.key)}
              className={cn('text-left rounded-lg border bg-white p-3 transition hover:shadow-sm',
                active ? 'border-blue-500 ring-2 ring-blue-100' : 'border-gray-200')}>
              <div className="flex items-center gap-1.5">
                <span className={cn('w-2 h-2 rounded-full', s.dot)} />
                <span className="text-xs font-medium text-gray-600 truncate">{s.label}</span>
              </div>
              <p className="text-xl font-bold text-gray-900 m-0 mt-1">{n}</p>
              <p className="text-[11px] text-gray-500 m-0">
                {stats.revenue ? Math.round(revenue / stats.revenue * 100) : 0}% tushum
              </p>
            </button>
          );
        })}
      </div>

      {/* Marketing tip for the chosen segment */}
      {activeSeg && (
        <div className={cn('flex flex-col sm:flex-row sm:items-center gap-3 rounded-lg px-4 py-3 mb-4 ring-1 ring-inset', activeSeg.badge)}>
          <Lightbulb size={18} className="flex-shrink-0" />
          <div className="flex-1 text-sm">
            <span className="font-semibold">{activeSeg.label}:</span> {activeSeg.rule}.
            <span className="block text-gray-700">Tavsiya: {activeSeg.tip}</span>
          </div>
          <div className="flex gap-2">
            {canManage && segmentIds.length > 0 && (
              <Button size="sm" onClick={() => message(segmentIds)}>
                <Send size={14} className="mr-1" />Segmentga xabar ({segmentIds.length})
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => setSegment('all')} title="Filtrni olib tashlash">
              <X size={14} />
            </Button>
          </div>
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        {/* Work table */}
        <Card padding="none" className="overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 flex flex-col md:flex-row md:items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Ism, telefon yoki manzil bo'yicha qidirish..."
                className="w-full h-9 pl-9 pr-3 text-sm rounded-md border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" />
            </div>
            <select value={segment} onChange={e => setSegment(e.target.value)}
              className="h-9 px-2 text-sm rounded-md border border-gray-300 bg-white">
              <option value="all">Barcha segmentlar</option>
              {SEGMENTS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
            <span className="text-xs text-gray-500 whitespace-nowrap">{filtered.length} ta mijoz</span>
          </div>

          {selected.length > 0 && (
            <div className="px-4 py-2 bg-blue-50 border-b border-blue-100 flex items-center gap-2 text-sm">
              <span className="font-medium text-blue-800">{selected.length} ta tanlandi</span>
              <div className="ml-auto flex gap-2">
                {canManage && (
                  <Button size="sm" variant="outline" onClick={() => message(selected)}>
                    <MessageSquare size={14} className="mr-1" />Xabar
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={() => exportCsv(clients.filter(c => selected.includes(c.id)), 'tanlangan')}>
                  <Download size={14} className="mr-1" />CSV
                </Button>
                {canManage && (
                  <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50"
                    onClick={() => openModal('delete', { id: 'bulk', first_name: `${selected.length} ta`, last_name: 'mijoz' })}>
                    <Trash2 size={14} className="mr-1" />O'chirish
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => setSelected([])}><X size={14} /></Button>
              </div>
            </div>
          )}

          <Table
            columns={columns}
            data={pageRows}
            loading={loading}
            selectable
            selectedRows={selected}
            onSelectionChange={setSelected}
            onRowClick={c => openModal('details', c)}
            sortable
            sortColumn={sort.key}
            sortDirection={sort.dir}
            onSort={(key, dir) => setSort({ key, dir })}
            pagination
            pageSize={PAGE_SIZE}
            currentPage={page}
            onPageChange={setPage}
            totalItems={filtered.length}
            emptyMessage="Mos mijozlar topilmadi"
            className="border-0"
          />
        </Card>

        {/* Insight sidebar */}
        <div className="space-y-4">
          <MiniList
            title="Eng yaxshi mijozlar" icon={Crown} items={stats.topCustomers} empty="Hali xaridlar yo'q"
            footer={stats.revenue > 0 && <>Top 20% mijozlar tushumning <b>{Math.round(stats.topShare * 100)}%</b> ini beradi</>}
            render={(c, i) => (
              <li key={c.id} onClick={() => openModal('details', c)}
                className="px-4 py-2.5 flex items-center gap-3 cursor-pointer hover:bg-gray-50">
                <span className="w-5 text-xs font-bold text-gray-400">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate m-0">{c.name}</p>
                  <p className="text-xs text-gray-500 m-0">{c.orders} ta xarid · {ago(c.recency)}</p>
                </div>
                <span className="text-sm font-semibold text-gray-900 whitespace-nowrap">{money(c.spent)}</span>
              </li>
            )}
          />
          <MiniList
            title="Diqqat: yirik qarzdorlar" icon={AlertTriangle} items={stats.riskyDebtors} empty="Qarzdorlar yo'q"
            render={c => (
              <li key={c.id} className="px-4 py-2.5 flex items-center gap-3">
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => openModal('details', c)}>
                  <p className="text-sm font-medium text-gray-900 truncate m-0">{c.name}</p>
                  <p className={cn('text-xs m-0', c.debtAge > 60 ? 'text-red-500' : 'text-gray-500')}>
                    {money(c.debt_amount)}{c.debtAge > 0 && ` · ${c.debtAge} kun`}
                  </p>
                </div>
                {c.phone && (
                  <a href={`tel:${c.phone}`} title="Qo'ng'iroq" className="p-1.5 rounded text-gray-500 hover:text-blue-600 hover:bg-blue-50">
                    <Phone size={15} />
                  </a>
                )}
                {canManage && (
                  <button type="button" title="Eslatma yuborish" onClick={() => message([c.id], c)}
                    className="p-1.5 rounded text-gray-500 hover:text-blue-600 hover:bg-blue-50">
                    <MessageSquare size={15} />
                  </button>
                )}
              </li>
            )}
          />
        </div>
      </div>

      <ClientManagementModal
        isOpen={modal.isOpen}
        onClose={closeModal}
        mode={modal.mode}
        client={modal.client}
        onSubmit={save}
        onDelete={remove}
        loading={modal.loading}
        deleting={modal.deleting}
      />

      <ClientMessagingModal
        isOpen={messaging.isOpen}
        onClose={() => setMessaging({ isOpen: false, client: null, ids: [] })}
        client={messaging.client}
        selectedClients={messaging.ids}
        allClients={clients}
      />
    </PageLayout>
  );
}
