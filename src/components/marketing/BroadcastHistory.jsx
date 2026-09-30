import { useState } from 'react';
import { History, Smartphone, Bot, Search, Calendar, Users } from 'lucide-react';
import { Card, LoadingSpinner } from '../ui';

// Rows match BroadcastHistoryItem in the backend (app/schemas/marketing.py).
const outcome = (b) => {
  if (b.attempted === 0) return { key: 'none', text: 'Yuborilmadi', color: 'bg-gray-100 text-gray-700 border-gray-200' };
  if (b.failed === 0) return { key: 'success', text: 'Muvaffaqiyatli', color: 'bg-green-100 text-green-800 border-green-200' };
  if (b.sent > 0) return { key: 'partial', text: 'Qisman', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' };
  return { key: 'failed', text: 'Xatolik', color: 'bg-red-100 text-red-800 border-red-200' };
};

const selectClass = 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent';

const BroadcastHistory = ({ broadcastHistory, loading }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <LoadingSpinner message="Tarix yuklanmoqda..." size="lg" />
      </div>
    );
  }

  const term = searchTerm.toLowerCase();
  const rows = broadcastHistory.filter(b =>
    b.message.toLowerCase().includes(term) &&
    (filterType === 'all' || b.channel === filterType) &&
    (filterStatus === 'all' || outcome(b).key === filterStatus)
  );

  return (
    <div className="space-y-4">
      <Card className="p-4 space-y-4">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Xabar matnida qidirish..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`${selectClass} pl-10`}
          />
        </div>
        <div className="flex flex-col sm:flex-row gap-4">
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className={selectClass}>
            <option value="all">Barcha kanallar</option>
            <option value="sms">SMS</option>
            <option value="telegram">Telegram</option>
          </select>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className={selectClass}>
            <option value="all">Barcha holatlar</option>
            <option value="success">Muvaffaqiyatli</option>
            <option value="partial">Qisman</option>
            <option value="failed">Xatolik</option>
            <option value="none">Yuborilmadi</option>
          </select>
        </div>
      </Card>

      <Card className="p-4">
        {rows.length === 0 ? (
          <div className="text-center py-12">
            <History size={32} className="text-gray-500 mx-auto mb-3" />
            <p className="text-gray-600">Yuborishlar tarixi bo'sh</p>
          </div>
        ) : (
          <div className="space-y-3">
            {rows.map(b => {
              const o = outcome(b);
              return (
                <div key={b.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium border ${
                      b.channel === 'sms' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-purple-50 text-purple-700 border-purple-200'
                    }`}>
                      {b.channel === 'sms' ? <Smartphone size={16} /> : <Bot size={16} />}
                      {b.channel === 'sms' ? 'SMS' : 'Telegram'}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${o.color}`}>{o.text}</span>
                  </div>
                  <p className="text-gray-900 mb-2 whitespace-pre-wrap break-words">{b.message}</p>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                    <span className="flex items-center gap-1"><Users size={14} />{b.attempted} / {b.total_recipients} ta</span>
                    <span className="text-green-600">Yuborildi: {b.sent}</span>
                    {b.failed > 0 && <span className="text-red-600">Xatolik: {b.failed}</span>}
                    {b.created_at && (
                      <span className="flex items-center gap-1"><Calendar size={14} />{new Date(b.created_at).toLocaleString('uz-UZ')}</span>
                    )}
                  </div>
                  {b.error_summary && (
                    <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700 break-words">
                      {b.error_summary}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
};

export default BroadcastHistory;
