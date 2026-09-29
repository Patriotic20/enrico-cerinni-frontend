import { MessageSquare, Smartphone, Bot, Users, UserX, TrendingUp, CheckCircle, XCircle } from 'lucide-react';
import { Card, LoadingSpinner } from '../ui';

// Fields match MarketingStats in the backend (app/schemas/marketing.py).
const MarketingStats = ({ stats, loading }) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <LoadingSpinner message="Statistikalar yuklanmoqda..." size="lg" />
      </div>
    );
  }

  if (!stats) {
    return <p className="text-center py-12 text-gray-600">Statistikalarni yuklab bo'lmadi</p>;
  }

  const sent = stats.total_messages_sent;
  const failed = stats.total_messages_failed;
  const rate = sent + failed > 0 ? Math.round((sent / (sent + failed)) * 100) : null;

  const cards = [
    { title: 'Faol mijozlar', value: stats.total_clients, icon: Users, color: 'bg-indigo-50 text-indigo-600 border-indigo-200' },
    { title: 'SMS orqali yetib boriladi', value: stats.sms_reachable, icon: Smartphone, color: 'bg-green-50 text-green-600 border-green-200' },
    { title: 'Telegram orqali yetib boriladi', value: stats.telegram_reachable, icon: Bot, color: 'bg-purple-50 text-purple-600 border-purple-200' },
    { title: 'Aloqa kanali yo\'q', value: stats.unreachable, icon: UserX, color: 'bg-gray-50 text-gray-600 border-gray-200' },
    { title: 'Jami yuborishlar', value: stats.total_broadcasts, icon: MessageSquare, color: 'bg-blue-50 text-blue-600 border-blue-200' },
    { title: 'Yetkazish foizi', value: rate == null ? '—' : `${rate}%`, icon: TrendingUp,
      color: rate == null || rate >= 90 ? 'bg-green-50 text-green-600 border-green-200' : rate >= 70 ? 'bg-yellow-50 text-yellow-600 border-yellow-200' : 'bg-red-50 text-red-600 border-red-200' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map(({ title, value, icon: Icon, color }) => (
          <Card key={title} className="p-4">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center border ${color}`}>
                <Icon size={24} />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900">{value}</h3>
                <p className="text-sm text-gray-600">{title}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card className="p-4 space-y-3">
        <h3 className="text-lg font-semibold text-gray-900">Xabarlar</h3>
        <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
          <span className="flex items-center gap-2 text-sm font-medium text-green-800"><CheckCircle size={16} /> Yuborilgan</span>
          <span className="text-lg font-bold text-green-600">{sent}</span>
        </div>
        <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
          <span className="flex items-center gap-2 text-sm font-medium text-red-800"><XCircle size={16} /> Xatolik</span>
          <span className="text-lg font-bold text-red-600">{failed}</span>
        </div>
        {stats.last_broadcast_at && (
          <p className="text-xs text-gray-500">
            Oxirgi yuborish: {new Date(stats.last_broadcast_at).toLocaleString('uz-UZ')}
          </p>
        )}
      </Card>
    </div>
  );
};

export default MarketingStats;
