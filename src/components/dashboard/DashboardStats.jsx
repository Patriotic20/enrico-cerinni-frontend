import { DollarSign, Package, Users, ShoppingCart, Receipt, Target } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatCurrency, formatNumber } from '../../utils/format';
import { cn } from '../../utils/cn';

// Compact KPI tile: label, value, optional hint line. `warn` tints the hint amber/red.
const Tile = ({ icon: Icon, label, value, hint, warn, to }) => {
  const body = (
    <div className="flex items-start gap-3 bg-white rounded-lg border border-gray-200 px-4 py-3 h-full hover:border-blue-300 transition-colors">
      <div className="p-2 rounded-md bg-blue-50 text-blue-600 shrink-0">
        <Icon size={16} />
      </div>
      <div className="min-w-0">
        <div className="text-xs text-gray-500 truncate">{label}</div>
        <div className="text-lg font-semibold text-gray-900 truncate">{value}</div>
        {hint && (
          <div className={cn('text-xs truncate', warn ? 'text-amber-600 font-medium' : 'text-gray-400')}>
            {hint}
          </div>
        )}
      </div>
    </div>
  );
  return to ? <Link to={to} className="block">{body}</Link> : body;
};

export default function DashboardStats({ stats }) {
  const salesCount = stats.totalSales || 0;
  const revenue = stats.monthlyRevenue || 0; // all-time completed-sales revenue (backend total_revenue)
  const avgOrder = salesCount > 0 ? revenue / salesCount : 0;
  const debtors = stats.clientsWithDebts || 0;
  const lowStock = stats.lowStockProducts || 0;

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      <Tile icon={DollarSign} label="Jami tushum" value={formatCurrency(revenue)} to="/sales" />
      <Tile icon={ShoppingCart} label="Sotuvlar soni" value={formatNumber(salesCount)} to="/sales" />
      <Tile icon={Target} label="O'rtacha chek" value={formatCurrency(avgOrder)} />
      <Tile icon={Receipt} label="Xarajatlar (30 kun)" value={formatCurrency(stats.monthlyExpenses || 0)} to="/finance" />
      <Tile
        icon={Users}
        label="Mijozlar"
        value={formatNumber(stats.totalClients || 0)}
        hint={debtors > 0 ? `${debtors} ta qarzdor` : 'Qarzdor yo\'q'}
        warn={debtors > 0}
        to={debtors > 0 ? '/debts' : '/clients'}
      />
      <Tile
        icon={Package}
        label="Mahsulotlar"
        value={formatNumber(stats.totalProducts || 0)}
        hint={lowStock > 0 ? `${lowStock} ta kam qoldi` : 'Zaxira yetarli'}
        warn={lowStock > 0}
        to="/inventory"
      />
    </div>
  );
}
