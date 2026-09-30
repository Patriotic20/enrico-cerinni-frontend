import { useEffect, useMemo, useRef } from 'react';
import { Send, Image, AlertCircle, XCircle } from 'lucide-react';
import { Button, Card } from '../ui';
import toast from 'react-hot-toast';
import { ChannelStatus, RecipientPicker } from './shared';
import TelegramLinkCard from './TelegramLinkCard';

const TelegramBroadcast = ({
  sending,
  clients,
  telegramForm,
  setTelegramForm,
  handleTelegramBroadcast,
  telegramStatus,
  testTelegramConnection,
  openSettings,
  syncTelegramLinks,
}) => {
  const fileInputRef = useRef(null);
  const reachable = useMemo(() => clients.filter(c => c.reachable_by_telegram), [clients]);
  const connected = Boolean(telegramStatus?.connected);

  const previewUrl = useMemo(
    () => (telegramForm.image ? URL.createObjectURL(telegramForm.image) : null),
    [telegramForm.image]
  );
  useEffect(() => () => previewUrl && URL.revokeObjectURL(previewUrl), [previewUrl]);

  const setImage = (image) => {
    setTelegramForm(prev => ({ ...prev, image }));
    if (!image && fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Rasm hajmi 10MB dan katta bo\'lishi mumkin emas');
      return;
    }
    setImage(file);
  };

  const blocker = !connected
    ? 'Telegram bot ulanmagan'
    : !telegramForm.message.trim()
      ? 'Xabar matnini kiriting'
      : !telegramForm.sendToAll && telegramForm.selectedClients.length === 0
        ? 'Kamida bitta mijozni tanlang yoki "Barcha mijozlarga yuborish" ni belgilang'
        : null;

  return (
    <div className="space-y-4">
      <ChannelStatus
        status={telegramStatus}
        name="Telegram bot"
        connectedText={`Telegram bot ulangan${telegramStatus?.bot_username ? ` — @${telegramStatus.bot_username}` : ''}`}
        onConfigure={openSettings}
        onRetry={testTelegramConnection}
      />

      {connected && (
        <>
          <TelegramLinkCard clients={clients} syncTelegramLinks={syncTelegramLinks} />

          <Card className="p-4 space-y-3">
            <label className="block text-sm font-medium text-gray-700">Xabar matni</label>
            <textarea
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              value={telegramForm.message}
              onChange={(e) => setTelegramForm(prev => ({ ...prev, message: e.target.value }))}
              placeholder="Xabar matnini kiriting..."
              rows={4}
              maxLength={telegramForm.image ? 1024 : 2000}
            />
            <div className="text-right text-xs text-gray-500">
              {telegramForm.message.length}/{telegramForm.image ? '1024 (rasm izohi)' : 2000}
            </div>
          </Card>

          <Card className="p-4 space-y-3">
            <label className="block text-sm font-medium text-gray-700">Rasm (ixtiyoriy)</label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleImageChange}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            {previewUrl ? (
              <div className="relative inline-block">
                <img src={previewUrl} alt="Preview" className="h-32 object-cover rounded-lg shadow-sm" />
                <button
                  type="button"
                  onClick={() => setImage(null)}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                >
                  <XCircle size={16} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-gray-500"><Image size={16} /> Rasm tanlanmagan</div>
            )}
          </Card>

          <RecipientPicker
            clients={reachable}
            form={telegramForm}
            setForm={setTelegramForm}
            subtitle={reachable.length < clients.length ? `${clients.length - reachable.length} ta mijoz botga ulanmagan` : null}
          />
        </>
      )}

      <Card className="p-4">
        <div className="flex items-center justify-between gap-3">
          <span className={`flex items-center gap-2 text-sm ${blocker ? 'text-amber-600' : 'text-gray-600'}`}>
            {blocker ? <><AlertCircle size={14} />{blocker}</> : `Qabul qiluvchilar: ${telegramForm.sendToAll ? reachable.length : telegramForm.selectedClients.length} ta`}
          </span>
          <Button onClick={handleTelegramBroadcast} disabled={sending || Boolean(blocker)} loading={sending} className="flex items-center gap-2">
            <Send size={18} /> Telegram yuborish
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default TelegramBroadcast;
