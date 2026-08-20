/**
 * Clients Report Component
 *
 * Customer analytics: totals, activity and the highest-value clients.
 */

import { Users, UserPlus, UserCheck, Crown } from 'lucide-react';
import { Card } from '../ui';
import { formatCurrency } from '../../utils/format';

const toNumber = (value) => {
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatDate = (value) => {
  if (!value) return '—';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '—' : parsed.toLocaleDateString('uz-UZ');
};

const MetricCard = ({ title, value, icon: Icon, color }) => (
  <Card className="p-6">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
      </div>
      <Icon className={color} size={24} />
    </div>
  </Card>
);

const ClientsReport = ({ data = {} }) => {
  const metrics = data?.metrics || {};
  const topClients = data?.top_clients || [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard
          title="Jami mijozlar"
          value={toNumber(metrics.total_clients).toLocaleString()}
          icon={Users}
          color="text-blue-600"
        />
        <MetricCard
          title="Faol mijozlar"
          value={toNumber(metrics.active_clients).toLocaleString()}
          icon={UserCheck}
          color="text-green-600"
        />
        <MetricCard
          title="Yangi mijozlar"
          value={toNumber(metrics.new_clients).toLocaleString()}
          icon={UserPlus}
          color="text-purple-600"
        />
      </div>

      <Card className="p-6">
        <div className="flex items-center gap-2 mb-1">
          <Crown className="text-amber-500" size={18} />
          <h3 className="text-lg font-semibold text-gray-900">Eng yaxshi mijozlar</h3>
        </div>
        <p className="text-sm text-gray-600 mb-4">Xarid summasi bo'yicha yetakchi mijozlar</p>

        {topClients.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-8">Tanlangan davrda xaridlar yo'q</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Mijoz</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Telefon</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Xaridlar</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Summa</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Oxirgi xarid</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {topClients.map((client, index) => (
                  <tr key={client.client_id ?? index} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-500">{index + 1}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{client.client_name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{client.phone || '—'}</td>
                    <td className="px-4 py-3 text-sm text-right text-gray-900">{toNumber(client.order_count)} ta</td>
                    <td className="px-4 py-3 text-sm text-right font-semibold text-gray-900">
                      {formatCurrency(toNumber(client.total_purchases))}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-gray-600">
                      {formatDate(client.last_purchase_date)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};

export default ClientsReport;
