import { Link } from 'react-router-dom';
import { Wallet, ArrowRight } from 'lucide-react';

// Salary payments ledger. Employees themselves (and paying them, with the
// commission earned) are managed on the Xodimlar page.
const SalaryTab = ({ payments, formatCurrency, formatDate }) => {
  const total = payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Ish haqi to'lovlari</h2>
          <p className="text-sm text-gray-600">
            Jami: <span className="font-semibold text-gray-900 tabular-nums">{formatCurrency(total)}</span>
          </p>
        </div>
        <Link
          to="/employees"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          Xodimlarni boshqarish <ArrowRight size={14} />
        </Link>
      </div>

      {payments.length === 0 ? (
        <div className="p-8 text-center">
          <Wallet size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 text-sm">Hali ish haqi to'lanmagan</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200 text-xs text-gray-500 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium">Sana</th>
                <th className="px-4 py-2.5 text-left font-medium">Xodim</th>
                <th className="px-4 py-2.5 text-left font-medium">Izoh</th>
                <th className="px-4 py-2.5 text-right font-medium">Summa</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {payments.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">{formatDate(p.payment_date)}</td>
                  <td className="px-4 py-2.5 font-medium text-gray-900">
                    <Link to={`/employees/${p.employee_id}`} className="hover:text-blue-600">
                      {p.employee_name || `#${p.employee_id}`}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 text-gray-500">{p.notes || '—'}</td>
                  <td className="px-4 py-2.5 text-right font-semibold text-gray-900 tabular-nums">{formatCurrency(p.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default SalaryTab;
