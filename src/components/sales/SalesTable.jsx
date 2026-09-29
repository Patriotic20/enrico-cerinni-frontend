import { Eye, XCircle, Wallet, CreditCard, Banknote, ArrowLeftRight } from 'lucide-react';
import { cn } from '../../utils/cn';
import { paymentLabel, ymd } from '../../hooks/useSales';

const PAYMENT_ICONS = { cash: Banknote, card: CreditCard, transfer: ArrowLeftRight };

const dayLabel = (key) => {
  const today = new Date();
  const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
  if (key === ymd(today)) return 'Bugun';
  if (key === ymd(yesterday)) return 'Kecha';
  return new Date(key).toLocaleDateString('uz-UZ', { day: 'numeric', month: 'long', weekday: 'long' });
};

const IconBtn = ({ title, className, onClick, children }) => (
  <button
    type="button"
    title={title}
    aria-label={title}
    onClick={(e) => { e.stopPropagation(); onClick(); }}
    className={cn('p-1.5 rounded-md transition-colors', className)}
  >
    {children}
  </button>
);

export default function SalesTable({
  sales,
  onViewSale,
  onCancelSale,
  onPayDebt,
  formatTime,
  formatCurrency,
  getStatusBadge
}) {
  // Group this page's rows by local day so the list reads like a register.
  const days = [];
  for (const sale of sales) {
    const key = ymd(new Date(sale.created_at));
    let day = days[days.length - 1];
    if (!day || day.key !== key) days.push(day = { key, sales: [], total: 0 });
    day.sales.push(sale);
    // Amounts arrive as decimal strings; += would concatenate them.
    if (sale.status !== 'cancelled') day.total += Number(sale.total_amount) || 0;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wide text-gray-500 border-b border-gray-200">
            <th className="py-2.5 px-3 font-medium">Chek / vaqt</th>
            <th className="py-2.5 px-3 font-medium">Mijoz / sotuvchi</th>
            <th className="py-2.5 px-3 font-medium">Mahsulotlar</th>
            <th className="py-2.5 px-3 font-medium">To'lov</th>
            <th className="py-2.5 px-3 font-medium text-right">Summa</th>
            <th className="py-2.5 px-3 font-medium">Holat</th>
            <th className="py-2.5 px-3 w-24" />
          </tr>
        </thead>
        {days.map(day => (
          <tbody key={day.key}>
            <tr className="bg-gray-50">
              <td colSpan={7} className="px-3 py-1.5 text-xs">
                <span className="font-semibold text-gray-700 capitalize">{dayLabel(day.key)}</span>
                <span className="text-gray-500"> · {day.sales.length} ta · </span>
                <span className="font-medium text-gray-700 tabular-nums">{formatCurrency(day.total)}</span>
              </td>
            </tr>
            {day.sales.map(sale => {
              const cancelled = sale.status === 'cancelled';
              const hasDebt = sale.status === 'debt' || sale.status === 'partially_paid';
              const debt = sale.total_amount - sale.paid_amount;
              const paidPct = sale.total_amount > 0 ? (sale.paid_amount / sale.total_amount) * 100 : 0;
              const qty = sale.items.reduce((n, i) => n + i.quantity, 0);
              const first = sale.items[0];
              const PayIcon = PAYMENT_ICONS[sale.payment_method] || Wallet;
              return (
                <tr
                  key={sale.id}
                  onClick={() => onViewSale(sale.id)}
                  className={cn(
                    'border-b border-gray-100 cursor-pointer hover:bg-blue-50/40 transition-colors',
                    cancelled && 'opacity-55'
                  )}
                >
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <div className="font-mono text-xs text-blue-600">{sale.receipt_number}</div>
                    <div className="text-xs text-gray-500">{formatTime(sale.created_at)}</div>
                  </td>
                  <td className="px-3 py-2.5">
                    {sale.client_name
                      ? <span className="text-gray-900">{sale.client_name}</span>
                      : <span className="text-gray-400">Mijozsiz</span>}
                    {sale.seller_name && (
                      <div className="text-xs text-gray-500">Sotuvchi: {sale.seller_name}</div>
                    )}
                  </td>
                  <td className="px-3 py-2.5 max-w-[260px]">
                    {first ? (
                      <>
                        <div className="truncate text-gray-900" title={sale.items.map(i => i.product_name).join(', ')}>
                          {first.product_name}
                          {sale.items.length > 1 && <span className="text-gray-500"> +{sale.items.length - 1}</span>}
                        </div>
                        <div className="text-xs text-gray-500">{qty} dona</div>
                      </>
                    ) : <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap text-gray-700">
                    <span className="inline-flex items-center gap-1.5">
                      <PayIcon size={14} className="text-gray-400" />
                      {paymentLabel(sale.payment_method)}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right whitespace-nowrap tabular-nums">
                    <div className={cn('font-semibold text-gray-900', cancelled && 'line-through')}>
                      {formatCurrency(sale.total_amount)}
                    </div>
                    {hasDebt && (
                      <div className="mt-1 ml-auto w-36">
                        <div className="h-1.5 rounded-full bg-red-100 overflow-hidden">
                          <div className="h-full bg-green-500" style={{ width: `${paidPct}%` }} />
                        </div>
                        <div className="text-xs text-red-600 mt-0.5">Qarz: {formatCurrency(debt)}</div>
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2.5">{getStatusBadge(sale.status)}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center justify-end gap-0.5">
                      {hasDebt && onPayDebt && (
                        <IconBtn title="Qarzni to'lash" onClick={() => onPayDebt(sale)} className="text-green-600 hover:bg-green-50">
                          <Wallet size={16} />
                        </IconBtn>
                      )}
                      <IconBtn title="Ko'rish" onClick={() => onViewSale(sale.id)} className="text-gray-500 hover:text-blue-600 hover:bg-blue-50">
                        <Eye size={16} />
                      </IconBtn>
                      {sale.status === 'completed' && onCancelSale && (
                        <IconBtn title="Bekor qilish" onClick={() => onCancelSale(sale.id)} className="text-gray-400 hover:text-red-600 hover:bg-red-50">
                          <XCircle size={16} />
                        </IconBtn>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        ))}
      </table>
    </div>
  );
}
