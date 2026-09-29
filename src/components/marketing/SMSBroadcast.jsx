import { useMemo } from 'react';
import { Send, AlertCircle, MessageSquare, RotateCcw, Loader2 } from 'lucide-react';
import { Button, Card } from '../ui';
import { ChannelStatus, RecipientPicker } from './shared';

// Eskiz only delivers texts matching a template approved in the my.eskiz.uz
// cabinet, so the message is always exactly one of those templates.
const STATUS_LABELS = {
  service: 'Tasdiqlangan (servis)',
  reklama: 'Tasdiqlangan (reklama)',
  moderation: 'Moderatsiyada',
  inproccess: 'Ko\'rib chiqilmoqda',
  rejected: 'Rad etilgan',
};

// Cyrillic/non-GSM text is UCS-2: 70 chars per SMS (67 per part when split).
const smsParts = (text) => {
  const unicode = /[^\x00-\x7F]/.test(text);
  const [single, multi] = unicode ? [70, 67] : [160, 153];
  return text.length <= single ? 1 : Math.ceil(text.length / multi);
};

const SMSBroadcast = ({
  sending,
  clients,
  smsForm,
  setSmsForm,
  handleSMSBroadcast,
  smsStatus,
  smsTemplates,
  testSmsConnection,
  openSettings,
}) => {
  const reachable = useMemo(() => clients.filter(c => c.reachable_by_sms), [clients]);
  const connected = Boolean(smsStatus?.connected);
  const selected = smsTemplates.items.find(t => t.id === smsForm.templateId);
  const edited = selected && smsForm.message !== selected.text;

  const selectTemplate = (t) => setSmsForm(prev => ({ ...prev, templateId: t.id, message: t.text }));

  const blocker = !connected
    ? 'SMS provayder ulanmagan'
    : !selected
      ? 'Bitta SMS shablonini tanlang'
      : !smsForm.sendToAll && smsForm.selectedClients.length === 0
        ? 'Kamida bitta mijozni tanlang yoki "Barcha mijozlarga yuborish" ni belgilang'
        : null;

  return (
    <div className="space-y-4">
      <ChannelStatus
        status={smsStatus}
        name="SMS provayder (Eskiz)"
        connectedText={`Eskiz ulangan — ${smsStatus?.balance != null ? `limit: ${smsStatus.balance} SMS, ` : ''}jo'natuvchi: ${smsStatus?.sender ?? '—'}`}
        onConfigure={openSettings}
        onRetry={testSmsConnection}
      />

      {connected && (
        <Card className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <MessageSquare className="text-blue-600" size={20} />
            <h3 className="text-lg font-semibold text-gray-900">SMS shablon (bittasini tanlang)</h3>
          </div>
          <p className="text-xs text-gray-500">
            Eskiz faqat my.eskiz.uz kabinetida tasdiqlangan shablon matnini yuboradi. Yangi shablon kabinetda qo'shiladi.
          </p>

          {!smsTemplates.loaded && (
            <div className="flex items-center gap-2 text-sm text-gray-500"><Loader2 size={16} className="animate-spin" /> Shablonlar yuklanmoqda...</div>
          )}
          {smsTemplates.error && (
            <div className="flex items-start gap-2 text-sm text-red-600"><AlertCircle size={16} className="mt-0.5 shrink-0" />{smsTemplates.error}</div>
          )}
          {smsTemplates.loaded && !smsTemplates.error && smsTemplates.items.length === 0 && (
            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
              Eskiz kabinetida shablon yo'q. Test akkaunt faqat "This is test from Eskiz" matnini yubora oladi.
            </p>
          )}

          <div className="space-y-2 max-h-72 overflow-y-auto">
            {smsTemplates.items.map(t => (
              <label
                key={t.id}
                className={`flex items-start gap-3 p-3 border rounded-lg transition-colors ${
                  !t.approved ? 'opacity-60 cursor-not-allowed border-gray-200'
                    : smsForm.templateId === t.id ? 'border-blue-500 bg-blue-50 cursor-pointer'
                      : 'border-gray-200 hover:bg-gray-50 cursor-pointer'
                }`}
              >
                <input
                  type="radio"
                  name="sms-template"
                  className="mt-1"
                  disabled={!t.approved}
                  checked={smsForm.templateId === t.id}
                  onChange={() => selectTemplate(t)}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900 whitespace-pre-wrap break-words">{t.text}</p>
                  <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded ${t.approved ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                    {STATUS_LABELS[t.status] || t.status || 'Holati noma\'lum'}
                  </span>
                </div>
              </label>
            ))}
          </div>
        </Card>
      )}

      {selected && (
        <Card className="p-4 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700">Xabar matni</label>
            {edited && (
              <button type="button" onClick={() => selectTemplate(selected)} className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
                <RotateCcw size={12} /> Shablonga qaytarish
              </button>
            )}
          </div>
          <textarea
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            value={smsForm.message}
            onChange={(e) => setSmsForm(prev => ({ ...prev, message: e.target.value }))}
            rows={4}
          />
          <div className="flex justify-between text-xs text-gray-500">
            <span>{edited ? "Faqat o'zgaruvchi qismlarni o'zgartiring — boshqa matnni Eskiz rad etadi" : ''}</span>
            <span>{smsForm.message.length} belgi · {smsParts(smsForm.message)} SMS</span>
          </div>
        </Card>
      )}

      {connected && (
        <RecipientPicker
          clients={reachable}
          form={smsForm}
          setForm={setSmsForm}
          subtitle={reachable.length < clients.length ? `${clients.length - reachable.length} ta mijozda telefon raqami yo'q` : null}
        />
      )}

      <Card className="p-4">
        <div className="flex items-center justify-between gap-3">
          <span className={`flex items-center gap-2 text-sm ${blocker ? 'text-amber-600' : 'text-gray-600'}`}>
            {blocker ? <><AlertCircle size={14} />{blocker}</> : `Qabul qiluvchilar: ${smsForm.sendToAll ? reachable.length : smsForm.selectedClients.length} ta`}
          </span>
          <Button onClick={handleSMSBroadcast} disabled={sending || Boolean(blocker)} loading={sending} className="flex items-center gap-2">
            <Send size={18} /> SMS yuborish
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default SMSBroadcast;
