import { useState, useMemo, useEffect } from 'react';
import { Plus, Edit, Trash2, Search, X, SearchX, Receipt, ArrowUpDown } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui';
import { EXPENSE_CATEGORY_LABELS, expenseCategoryLabel } from '../../utils/constants';
import { CATEGORY_COLORS } from './FinanceStats';
import { cn } from '../../utils/cn';

const control = 'h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-800 focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/15';

const ExpensesTab = ({
  expenses,
  category,
  onCategoryChange,
  formatCurrency,
  formatDate,
  onAddExpense,
  onEditExpense,
  onDeleteExpense,
  loading = false
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sort, setSort] = useState({ key: 'date', dir: 'desc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const filteredExpenses = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    const rows = expenses.filter(e =>
      (category === 'all' || e.category === category) &&
      (!q || e.description?.toLowerCase().includes(q) || e.notes?.toLowerCase().includes(q))
    );
    const sign = sort.dir === 'asc' ? 1 : -1;
    return rows.sort((a, b) => sign * (sort.key === 'amount'
      ? Number(a.amount) - Number(b.amount)
      : String(a.date).localeCompare(String(b.date))));
  }, [expenses, searchTerm, category, sort]);

  useEffect(() => setCurrentPage(1), [searchTerm, category, pageSize, expenses]);

  const filteredTotal = filteredExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const totalPages = Math.max(1, Math.ceil(filteredExpenses.length / pageSize));
  const pageRows = filteredExpenses.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const isFiltered = searchTerm || category !== 'all';

  const resetFilters = () => { setSearchTerm(''); onCategoryChange('all'); };
  const toggleSort = (key) => setSort(s => ({ key, dir: s.key === key && s.dir === 'desc' ? 'asc' : 'desc' }));

  const SortHeader = ({ k, children, className }) => (
    <th className={cn('px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wider', className)}>
      <button type="button" onClick={() => toggleSort(k)}
        className={cn('inline-flex items-center gap-1 uppercase hover:text-gray-900', sort.key === k && 'text-gray-900')}>
        {children} <ArrowUpDown size={12} />
      </button>
    </th>
  );

  return (
    <Card className="p-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            placeholder="Nomi yoki izoh bo'yicha qidirish..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={cn(control, 'w-full pl-9')}
          />
        </div>
        <select value={category} onChange={(e) => onCategoryChange(e.target.value)} className={control} aria-label="Kategoriya">
          <option value="all">Barcha kategoriyalar</option>
          {Object.entries(EXPENSE_CATEGORY_LABELS).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
        {isFiltered && (
          <button type="button" onClick={resetFilters}
            className="h-9 inline-flex items-center gap-1 px-3 rounded-lg text-sm text-gray-600 hover:bg-gray-100">
            <X size={14} /> Tozalash
          </button>
        )}
      </div>

      {/* Table */}
      <div className="mt-4">
        {loading ? (
          <div className="animate-pulse space-y-2">
            {[...Array(6)].map((_, i) => <div key={i} className="h-11 bg-gray-100 rounded" />)}
          </div>
        ) : pageRows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-center">
            {expenses.length === 0 ? (
              <>
                <Receipt size={40} className="text-gray-300 mb-3" />
                <h3 className="text-base font-medium text-gray-900 mb-1">Bu davrda xarajat yo'q</h3>
                <p className="text-sm text-gray-500 mb-4">Davrni o'zgartiring yoki yangi xarajat qo'shing</p>
                <Button size="sm" onClick={onAddExpense}><Plus size={14} className="mr-1" /> Xarajat qo'shish</Button>
              </>
            ) : (
              <>
                <SearchX size={40} className="text-gray-300 mb-3" />
                <h3 className="text-base font-medium text-gray-900 mb-1">Hech narsa topilmadi</h3>
                <p className="text-sm text-gray-500 mb-4">Filtrlarga mos xarajat yo'q</p>
                <Button size="sm" variant="secondary" onClick={resetFilters}>Filtrlarni tozalash</Button>
              </>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto -mx-4">
              <table className="w-full">
                <thead className="bg-gray-50 border-y border-gray-200">
                  <tr>
                    <SortHeader k="date" className="text-left w-32">Sana</SortHeader>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Xarajat</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kategoriya</th>
                    <SortHeader k="amount" className="text-right">Summa</SortHeader>
                    <th className="px-4 py-2.5 w-24"><span className="sr-only">Amallar</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {pageRows.map((expense) => (
                    <tr key={expense.id} className="group hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-2.5 text-sm text-gray-600 whitespace-nowrap tabular-nums">{formatDate(expense.date)}</td>
                      <td className="px-4 py-2.5 text-sm max-w-md">
                        <div className="font-medium text-gray-900 truncate">{expense.description}</div>
                        {expense.notes && <div className="text-xs text-gray-500 truncate" title={expense.notes}>{expense.notes}</div>}
                      </td>
                      <td className="px-4 py-2.5 text-sm">
                        <button type="button" onClick={() => onCategoryChange(expense.category)}
                          className="inline-flex items-center gap-1.5 text-gray-700 hover:text-gray-900 whitespace-nowrap">
                          <span className={cn('w-2 h-2 rounded-sm', CATEGORY_COLORS[expense.category] || 'bg-gray-400')} />
                          {expenseCategoryLabel(expense.category)}
                        </button>
                      </td>
                      <td className="px-4 py-2.5 text-sm text-right font-semibold text-gray-900 tabular-nums whitespace-nowrap">
                        {formatCurrency(expense.amount)}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex justify-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                          <button className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-md"
                            onClick={() => onEditExpense(expense)} title="Tahrirlash" aria-label="Tahrirlash">
                            <Edit size={15} />
                          </button>
                          <button className="p-1.5 text-red-600 hover:bg-red-50 rounded-md"
                            onClick={() => onDeleteExpense(expense.id)} title="O'chirish" aria-label="O'chirish">
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t border-gray-200 bg-gray-50">
                  <tr>
                    <td colSpan={3} className="px-4 py-2.5 text-sm text-gray-600">
                      {filteredExpenses.length} ta xarajat{isFiltered && ` (${expenses.length} tadan)`}
                    </td>
                    <td className="px-4 py-2.5 text-sm text-right font-bold text-gray-900 tabular-nums whitespace-nowrap">
                      {formatCurrency(filteredTotal)}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-3 text-sm text-gray-600">
              <label className="flex items-center gap-2">
                Sahifada
                <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))} className={cn(control, 'h-8 px-2')}>
                  {[10, 20, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </label>
              {totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <span className="tabular-nums">{currentPage} / {totalPages}</span>
                  <Button size="sm" variant="secondary" disabled={currentPage === 1}
                    onClick={() => setCurrentPage(p => p - 1)}>Oldingi</Button>
                  <Button size="sm" variant="secondary" disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(p => p + 1)}>Keyingi</Button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </Card>
  );
};

export default ExpensesTab;
