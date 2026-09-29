import { useEffect, useState } from 'react';
import { Smartphone, Bot, Lock, Loader2, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button, Card } from '../ui';
import { marketingAPI } from '../../api/marketing';

// Secrets are write-only: the API only reports whether they are set, so the
// password/token inputs start empty and an empty input means "keep current".
const inputClass = 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent';

const SOURCE_LABEL = { platform: 'Platformada saqlangan', env: 'Server .env faylidan' };

const Field = ({ label, hint, ...props }) => (
  <label className="block">
    <span className="block text-sm font-medium text-gray-700 mb-1">{label}</span>
    <input className={inputClass} {...props} />
    {hint && <span className="block text-xs text-gray-500 mt-1">{hint}</span>}
  </label>
);

const errorText = (e) => e?.response?.data?.detail || e?.response?.data?.message || 'Saqlashda xatolik';

const IntegrationSettings = ({ onSaved }) => {
  const [current, setCurrent] = useState(null);
  const [saving, setSaving] = useState(null); // 'eskiz' | 'telegram' | null
  const [eskiz, setEskiz] = useState({ email: '', password: '', sender: '' });
  const [token, setToken] = useState('');

  const applyView = (view) => {
    setCurrent(view);
    setEskiz({ email: view.eskiz.email || '', password: '', sender: view.eskiz.sender || '' });
    setToken('');
  };

  useEffect(() => {
    marketingAPI.getIntegrationSettings()
      .then(r => r.success && applyView(r.data))
      .catch(e => toast.error(errorText(e)));
  }, []);

  const save = async (section, payload) => {
    setSaving(section);
    try {
      const r = await marketingAPI.updateIntegrationSettings(payload);
      applyView(r.data);
      toast.success('Sozlamalar saqlandi');
      onSaved?.();
    } catch (e) {
      toast.error(errorText(e));
    } finally {
      setSaving(null);
    }
  };

  if (!current) {
    return <div className="flex items-center gap-2 text-sm text-gray-500 p-6"><Loader2 size={16} className="animate-spin" /> Yuklanmoqda...</div>;
  }

  const Status = ({ info }) => (
    <span className={`text-xs px-2 py-1 rounded ${info.configured ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
      {info.configured ? SOURCE_LABEL[info.source] || 'Sozlangan' : 'Sozlanmagan'}
    </span>
  );

  return (
    <div className="space-y-4">
      <p className="flex items-center gap-2 text-xs text-gray-500">
        <Lock size={14} /> Parol va tokenlar shifrlangan holda saqlanadi va hech qachon qayta ko'rsatilmaydi. Faqat administrator o'zgartira oladi.
      </p>

      <Card className="p-4">
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            save('eskiz', {
              eskiz_email: eskiz.email,
              eskiz_password: eskiz.password || null,
              sms_from_number: eskiz.sender,
            });
          }}
        >
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-2 font-semibold text-gray-900"><Smartphone size={18} /> Eskiz SMS</h3>
            <Status info={current.eskiz} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Field label="Email (my.eskiz.uz)" type="email" autoComplete="off" required
              value={eskiz.email} onChange={e => setEskiz(p => ({ ...p, email: e.target.value }))} />
            <Field label="Parol" type="password" autoComplete="new-password"
              required={!current.eskiz.password_set}
              placeholder={current.eskiz.password_set ? "•••••••• (o'zgartirmaslik uchun bo'sh qoldiring)" : ''}
              value={eskiz.password} onChange={e => setEskiz(p => ({ ...p, password: e.target.value }))} />
            <Field label="Jo'natuvchi nomi" maxLength={11} hint="Test akkaunt uchun: 4546"
              value={eskiz.sender} onChange={e => setEskiz(p => ({ ...p, sender: e.target.value }))} />
          </div>
          <div className="flex justify-end gap-2">
            {current.eskiz.source === 'platform' && (
              <Button type="button" variant="outline" size="sm" disabled={Boolean(saving)}
                onClick={() => window.confirm("Eskiz sozlamalari o'chirilsinmi?") &&
                  save('eskiz', { eskiz_email: '', eskiz_password: '', sms_from_number: '' })}>
                <Trash2 size={14} className="mr-1" /> O'chirish
              </Button>
            )}
            <Button type="submit" size="sm" loading={saving === 'eskiz'} disabled={Boolean(saving)}>Saqlash va tekshirish</Button>
          </div>
        </form>
      </Card>

      <Card className="p-4">
        <form
          className="space-y-3"
          onSubmit={(e) => { e.preventDefault(); save('telegram', { telegram_bot_token: token }); }}
        >
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-2 font-semibold text-gray-900"><Bot size={18} /> Telegram bot</h3>
            <Status info={current.telegram} />
          </div>
          <Field label="Bot token (@BotFather)" type="password" autoComplete="new-password" required
            placeholder={current.telegram.token_hint ? `Hozirgi: ${current.telegram.token_hint} — yangisini kiriting` : '123456789:AA...'}
            value={token} onChange={e => setToken(e.target.value)} />
          <div className="flex justify-end gap-2">
            {current.telegram.source === 'platform' && (
              <Button type="button" variant="outline" size="sm" disabled={Boolean(saving)}
                onClick={() => window.confirm("Telegram bot tokeni o'chirilsinmi?") && save('telegram', { telegram_bot_token: '' })}>
                <Trash2 size={14} className="mr-1" /> O'chirish
              </Button>
            )}
            <Button type="submit" size="sm" loading={saving === 'telegram'} disabled={Boolean(saving)}>Saqlash va tekshirish</Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default IntegrationSettings;
