import { useState } from 'react';
import { Link2, Copy, RefreshCw, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button, Card } from '../ui';
import { marketingAPI } from '../../api/marketing';

// A bot can only message people who pressed Start on it. Each client gets a
// personal link; once they press Start, "Tekshirish" (or the next page load /
// broadcast) saves their chat and they appear in the recipient list.
const TelegramLinkCard = ({ clients, syncTelegramLinks }) => {
  const unlinked = clients.filter(c => !c.reachable_by_telegram);
  const [clientId, setClientId] = useState('');
  const [url, setUrl] = useState(null);
  const [checking, setChecking] = useState(false);

  const pick = async (id) => {
    setClientId(id);
    setUrl(null);
    if (!id) return;
    try {
      const r = await marketingAPI.getTelegramLink(id);
      setUrl(r.data.url);
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Havola yaratib bo\'lmadi');
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Havola nusxalandi');
    } catch {
      toast.error('Nusxalab bo\'lmadi — havolani qo\'lda belgilang');
    }
  };

  const check = async () => {
    setChecking(true);
    const linked = await syncTelegramLinks();
    setChecking(false);
    if (linked === null) toast.error('Tekshirishda xatolik');
    else if (linked.length === 0) toast('Hali hech kim Start bosmagan', { icon: 'ℹ️' });
    else setUrl(null);
  };

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 font-semibold text-gray-900"><Link2 size={18} /> Mijozni botga ulash</h3>
        <Button variant="outline" size="sm" onClick={check} loading={checking}>
          <RefreshCw size={14} /> Tekshirish
        </Button>
      </div>
      <p className="text-xs text-gray-500">
        Telegram bot faqat botda <b>Start</b> bosgan mijozga xabar yubora oladi. Mijozni tanlang, havolani unga yuboring
        (SMS, QR yoki o'zingiz ochib bering) — u Start bosgach "Tekshirish" ni bosing.
      </p>

      <select
        value={clientId}
        onChange={(e) => pick(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      >
        <option value="">Mijozni tanlang ({unlinked.length} ta ulanmagan)</option>
        {unlinked.map(c => (
          <option key={c.id} value={c.id}>{c.first_name} {c.last_name}{c.phone ? ` — ${c.phone}` : ''}</option>
        ))}
      </select>

      {url && (
        <div className="flex flex-col sm:flex-row gap-2">
          <input readOnly value={url} onFocus={(e) => e.target.select()}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm font-mono" />
          <Button variant="outline" size="sm" onClick={copy}><Copy size={14} /> Nusxalash</Button>
          <a href={url} target="_blank" rel="noreferrer"
            className="inline-flex items-center justify-center gap-1 px-3 py-1.5 text-sm font-medium rounded-md border border-gray-300 hover:bg-gray-50">
            <ExternalLink size={14} /> Ochish
          </a>
        </div>
      )}
    </Card>
  );
};

export default TelegramLinkCard;
