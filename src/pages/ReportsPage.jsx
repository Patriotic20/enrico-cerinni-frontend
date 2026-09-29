import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { TrendingUp, DollarSign, Package, Users, Activity, Download, RefreshCw, AlertCircle } from 'lucide-react';
import PageLayout from '../components/layout/PageLayout';
import { Button, LoadingSpinner } from '../components/ui';
import { reportsAPI } from '../api';
import { ymd } from '../hooks/useSales';
import { downloadCsv } from '../utils/csv';
import { cn } from '../utils/cn';
import {
  SalesReport, salesCsv,
  FinanceReport, financeCsv,
  InventoryReport, inventoryCsv,
  ClientsReport, clientsCsv,
  PerformanceReport, performanceCsv,
} from '../components/reports';

const REPORTS = [
  { id: 'sales', title: 'Sotuvlar', icon: TrendingUp, Component: SalesReport, csv: salesCsv, load: reportsAPI.getSalesReport },
  { id: 'finance', title: 'Moliya', icon: DollarSign, Component: FinanceReport, csv: financeCsv, load: reportsAPI.getFinanceReport },
  { id: 'inventory', title: 'Inventar', icon: Package, Component: InventoryReport, csv: inventoryCsv, load: reportsAPI.getInventoryReport },
  { id: 'clients', title: 'Mijozlar', icon: Users, Component: ClientsReport, csv: clientsCsv, load: reportsAPI.getClientsReport },
  { id: 'performance', title: "O'sish", icon: Activity, Component: PerformanceReport, csv: performanceCsv, load: reportsAPI.getPerformanceReport },
];

const presets = () => {
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth(), d = now.getDate();
  const today = ymd(now);
  return [
    { label: '7 kun', start: ymd(new Date(y, m, d - 6)), end: today },
    { label: '30 kun', start: ymd(new Date(y, m, d - 29)), end: today },
    { label: 'Bu oy', start: ymd(new Date(y, m, 1)), end: today },
    { label: "O'tgan oy", start: ymd(new Date(y, m - 1, 1)), end: ymd(new Date(y, m, 0)) },
    { label: 'Bu yil', start: ymd(new Date(y, 0, 1)), end: today },
  ];
};

const dateInput = 'h-8 rounded-lg border border-gray-200 bg-white px-2 text-sm text-gray-800 focus:outline-none focus:border-blue-500';

export default function ReportsPage() {
  const [params, setParams] = useSearchParams();
  const report = REPORTS.find(r => r.id === params.get('tab')) || REPORTS[0];
  const [range, setRange] = useState(() => presets()[2]); // Bu oy
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    report.load({ start_date: range.start, end_date: range.end })
      .then(res => {
        if (cancelled) return;
        if (res.success) setData(res.data);
        else setError(res.message || 'Hisobotni yuklab bo\'lmadi');
      })
      .catch(err => !cancelled && setError(err.message || 'Hisobotni yuklab bo\'lmadi'))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [report, range.start, range.end, reloadKey]);

  const selectTab = (id) => {
    setData(null); // another report's data has a different shape
    setParams({ tab: id }, { replace: true });
  };

  const exportCsv = () => {
    const { header, rows } = report.csv(data);
    downloadCsv(`hisobot-${report.id}-${range.start}_${range.end}.csv`, header, rows);
  };

  const { Component } = report;

  return (
    <PageLayout maxWidth="full" spacing="sm" className="bg-gray-50 min-h-screen">
      <div className="space-y-4">
        {/* Header: title, period, export */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900 m-0">Hisobotlar</h1>
            <p className="text-sm text-gray-500 m-0">Biznes ko'rsatkichlari tanlangan davr uchun</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-lg bg-gray-100 p-0.5">
              {presets().map(p => {
                const active = range.start === p.start && range.end === p.end;
                return (
                  <button key={p.label} type="button" onClick={() => setRange(p)}
                    className={cn('px-3 py-1.5 text-sm rounded-md transition-colors',
                      active ? 'bg-white text-gray-900 font-medium shadow-sm' : 'text-gray-600 hover:text-gray-900')}>
                    {p.label}
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-1 text-sm text-gray-500">
              <input type="date" value={range.start} max={range.end} aria-label="Boshlanish sanasi" className={dateInput}
                onChange={(e) => e.target.value && setRange(r => ({ ...r, start: e.target.value }))} />
              —
              <input type="date" value={range.end} min={range.start} aria-label="Tugash sanasi" className={dateInput}
                onChange={(e) => e.target.value && setRange(r => ({ ...r, end: e.target.value }))} />
            </div>
            <Button variant="secondary" size="sm" onClick={() => setReloadKey(k => k + 1)} disabled={loading} title="Yangilash" className="px-2">
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </Button>
            <Button size="sm" onClick={exportCsv} disabled={!data || loading}>
              <Download size={14} className="mr-1" /> CSV
            </Button>
          </div>
        </div>

        {/* Report tabs */}
        <div className="flex gap-1 border-b border-gray-200 overflow-x-auto" role="tablist">
          {REPORTS.map(({ id, title, icon: Icon }) => {
            const active = report.id === id;
            return (
              <button key={id} role="tab" aria-selected={active} onClick={() => selectTab(id)}
                className={cn('flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors',
                  active ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-600 hover:text-gray-900')}>
                <Icon size={16} /> {title}
              </button>
            );
          })}
        </div>

        {error ? (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <span className="flex items-center gap-2"><AlertCircle size={16} /> {error}</span>
            <button onClick={() => setReloadKey(k => k + 1)} className="font-medium hover:underline">Qayta urinish</button>
          </div>
        ) : !data ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <LoadingSpinner message="Hisobot yuklanmoqda..." size="lg" />
          </div>
        ) : (
          // Keep the previous numbers on screen while a new period loads.
          <div className={cn('transition-opacity', loading && 'opacity-50 pointer-events-none')}>
            <Component data={data} />
          </div>
        )}
      </div>
    </PageLayout>
  );
}
