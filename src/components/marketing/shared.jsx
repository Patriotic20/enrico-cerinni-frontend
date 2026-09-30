import { useState } from 'react';
import { AlertCircle, CheckCircle, XCircle, Settings, Search, Loader2 } from 'lucide-react';
import { Button, Card } from '../ui';

/**
 * Provider status card. `status` comes from /marketing/{sms,telegram}/test:
 * null = checking, configured=false = credentials missing, connected=false = broken.
 */
export const ChannelStatus = ({ status, name, connectedText, onRetry, onConfigure }) => {
  if (status == null) {
    return (
      <Card className="p-4 flex items-center gap-2 text-sm text-gray-600">
        <Loader2 size={16} className="animate-spin" /> {name} ulanishi tekshirilmoqda...
      </Card>
    );
  }

  if (status.configured === false) {
    return (
      <Card className="p-4 bg-amber-50 border border-amber-200">
        <div className="flex items-start gap-3">
          <Settings size={20} className="text-amber-600 shrink-0 mt-0.5" />
          <div className="text-sm flex-1">
            <p className="font-semibold text-amber-800">{name} sozlanmagan</p>
            <p className="text-amber-700 mt-1">
              {onConfigure
                ? "Xabar yuborish o'chirilgan. Ulanish ma'lumotlarini \"Sozlamalar\" bo'limida kiriting."
                : "Xabar yuborish o'chirilgan. Sozlash uchun administratorga murojaat qiling."}
            </p>
          </div>
          {onConfigure && <Button size="sm" onClick={onConfigure}>Sozlash</Button>}
        </div>
      </Card>
    );
  }

  const ok = Boolean(status.connected);
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-3">
        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium ${
          ok ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'
        }`}>
          {ok ? <CheckCircle size={16} /> : <XCircle size={16} />}
          <span>{ok ? connectedText : `${name} ulanmagan`}</span>
        </div>
        <div className="flex gap-2">
          {onConfigure && <Button variant="outline" size="sm" onClick={onConfigure}><Settings size={14} /></Button>}
          <Button variant="outline" size="sm" onClick={onRetry}>Qayta tekshirish</Button>
        </div>
      </div>
      {!ok && status.error && (
        <div className="mt-2 flex items-start gap-2 text-xs text-red-600">
          <AlertCircle size={14} className="mt-0.5 shrink-0" />
          <span>{status.error}</span>
        </div>
      )}
    </Card>
  );
};

/** Recipient selection over the clients reachable through one channel. */
export const RecipientPicker = ({ clients, form, setForm, subtitle }) => {
  const [search, setSearch] = useState('');
  const selected = form.selectedClients;

  const q = search.trim().toLowerCase().replace(/[\s-]/g, '');
  const visible = q
    ? clients.filter(c =>
        `${c.first_name}${c.last_name}`.toLowerCase().replace(/\s/g, '').includes(q) ||
        (c.phone || '').replace(/[\s-]/g, '').includes(q))
    : clients;

  const update = (patch) => setForm(prev => ({ ...prev, ...patch }));
  const toggle = (id) => update({
    selectedClients: selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id],
  });

  return (
    <Card className="p-4 space-y-3">
      <label className="block text-sm font-medium text-gray-700">Qabul qiluvchilar</label>

      <label className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200 cursor-pointer">
        <input
          type="checkbox"
          checked={form.sendToAll}
          onChange={(e) => update({ sendToAll: e.target.checked, selectedClients: [] })}
          className="w-4 h-4"
        />
        <span className="text-sm font-medium text-gray-900">Barcha mijozlarga yuborish ({clients.length} ta)</span>
      </label>

      {!form.sendToAll && (
        <>
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <span className="text-sm font-medium text-gray-700">Tanlangan: {selected.length} ta</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => update({ selectedClients: clients.map(c => c.id) })}
                disabled={clients.length === 0 || selected.length === clients.length}>
                Hammasini tanlash
              </Button>
              <Button variant="outline" size="sm" onClick={() => update({ selectedClients: [] })} disabled={selected.length === 0}>
                Tozalash
              </Button>
            </div>
          </div>

          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Ism yoki telefon bo'yicha qidirish..."
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="max-h-56 overflow-y-auto space-y-1 border border-gray-200 rounded-lg p-2">
            {visible.length === 0 && <p className="p-3 text-sm text-gray-500 text-center">Hech narsa topilmadi</p>}
            {visible.map(c => (
              <label key={c.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer">
                <input type="checkbox" checked={selected.includes(c.id)} onChange={() => toggle(c.id)} className="w-4 h-4" />
                <div className="flex-1">
                  <span className="block text-sm font-medium text-gray-900">{c.first_name} {c.last_name}</span>
                  <span className="block text-xs text-gray-500">{c.phone}</span>
                </div>
              </label>
            ))}
          </div>
        </>
      )}
      {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
    </Card>
  );
};
