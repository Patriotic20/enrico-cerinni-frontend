import { Search, X } from 'lucide-react';
import { cn } from '../../utils/cn';
import { ymd } from '../../hooks/useSales';
import MoneyInput from '../ui/MoneyInput';

const presets = () => {
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth(), d = now.getDate();
  return [
    { label: 'Bugun', start: ymd(now), end: ymd(now) },
    { label: 'Kecha', start: ymd(new Date(y, m, d - 1)), end: ymd(new Date(y, m, d - 1)) },
    { label: '7 kun', start: ymd(new Date(y, m, d - 6)), end: '' },
    { label: 'Bu oy', start: ymd(new Date(y, m, 1)), end: '' },
    { label: "O'tgan oy", start: ymd(new Date(y, m - 1, 1)), end: ymd(new Date(y, m, 0)) },
    { label: 'Hammasi', start: '', end: '' },
  ];
};

const control = 'h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15';

export default function SalesFilters({ filters, sellers = [], onFilterChange, onDateRange, onClearFilters }) {
  const hasExtra = filters.search || filters.seller_id || filters.status || filters.payment_method || filters.min_amount || filters.max_amount;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="search"
            placeholder="Chek raqami yoki mijoz ismi..."
            value={filters.search}
            onChange={(e) => onFilterChange('search', e.target.value)}
            className={cn(control, 'w-full pl-9')}
          />
        </div>
        {sellers.length > 0 && (
          <select value={filters.seller_id} onChange={(e) => onFilterChange('seller_id', e.target.value)} className={control} aria-label="Sotuvchi">
            <option value="">Barcha sotuvchilar</option>
            {sellers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        )}
        <select value={filters.status} onChange={(e) => onFilterChange('status', e.target.value)} className={control} aria-label="Holat">
          <option value="">Barcha holatlar</option>
          <option value="completed">Tugatildi</option>
          <option value="partially_paid">Qisman to'langan</option>
          <option value="debt">Qarzdorlik</option>
          <option value="pending">Kutilmoqda</option>
          <option value="cancelled">Bekor qilindi</option>
        </select>
        <select value={filters.payment_method} onChange={(e) => onFilterChange('payment_method', e.target.value)} className={control} aria-label="To'lov turi">
          <option value="">Barcha to'lovlar</option>
          <option value="cash">Naqd</option>
          <option value="card">Karta</option>
          <option value="transfer">O'tkazma</option>
        </select>
        <MoneyInput min="0" placeholder="Min summa" value={filters.min_amount}
          onChange={(e) => onFilterChange('min_amount', e.target.value)} className={cn(control, 'w-32')} />
        <MoneyInput min="0" placeholder="Max summa" value={filters.max_amount}
          onChange={(e) => onFilterChange('max_amount', e.target.value)} className={cn(control, 'w-32')} />
        {hasExtra && (
          <button type="button" onClick={onClearFilters}
            className="h-9 inline-flex items-center gap-1 px-3 rounded-lg text-sm text-gray-600 hover:bg-gray-100">
            <X size={14} /> Tozalash
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-lg bg-gray-100 p-0.5">
          {presets().map(p => {
            const active = filters.start_date === p.start && filters.end_date === p.end;
            return (
              <button
                key={p.label}
                type="button"
                onClick={() => onDateRange(p.start, p.end)}
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
        <div className="flex items-center gap-1.5 text-sm text-gray-500">
          <input type="date" value={filters.start_date} max={filters.end_date || undefined}
            onChange={(e) => onFilterChange('start_date', e.target.value)} className={control} aria-label="Boshlanish sanasi" />
          <span>—</span>
          <input type="date" value={filters.end_date} min={filters.start_date || undefined}
            onChange={(e) => onFilterChange('end_date', e.target.value)} className={control} aria-label="Tugash sanasi" />
        </div>
      </div>
    </div>
  );
}
