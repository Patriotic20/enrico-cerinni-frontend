/**
 * Seller App (/m)
 *
 * Phone-first app for sellers on the shop floor: sign in with phone + PIN,
 * scan or search products, fill a basket (and the client's card) and send it
 * to the cashier, who takes the payment. Sending reserves the stock. Sellers
 * also follow their own KPI here.
 *
 * @page
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Routes, Route, Navigate, NavLink, useNavigate } from 'react-router-dom';
import {
  ShoppingBag, ClipboardList, BarChart3, LogOut, Search, Camera, X, Loader2, Package,
  Minus, Plus, Trash2, UserPlus, User, Send, SearchX, Clock,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { useConfirm } from '../contexts/ConfirmContext';
import { productsAPI, clientsAPI, sellerAPI } from '../api';
import { useProductSearch } from '../hooks/useProductSearch';
import { CameraScanner, CAN_SCAN } from '../components/ui/CameraScanner';
import { getApiErrorMessage, toArray } from '../utils/api';
import { isBarcode } from '../utils/barcode';
import { formatCurrency, formatDate } from '../utils/format';
import { cn } from '../utils/cn';

const money = formatCurrency;
const fullName = (c) => [c?.first_name, c?.last_name].filter(Boolean).join(' ') || c?.name || '';

// ─── Login ──────────────────────────────────────────────────────────────────

const LoginScreen = () => {
  const { pinLogin, user } = useAuth();
  const navigate = useNavigate();
  const [phone, setPhone] = useState('+998 ');
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);

  if (user?.role === 'seller') return <Navigate to="/m" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    const res = await pinLogin(phone, pin);
    setBusy(false);
    if (res.success) navigate('/m', { replace: true });
    else {
      setPin('');
      toast.error(res.error);
    }
  };

  return (
    <div className="flex min-h-dvh flex-col justify-center bg-gray-50 px-6">
      <form onSubmit={submit} className="mx-auto w-full max-w-sm space-y-4">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/30">
            <ShoppingBag size={32} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Sotuvchi</h1>
          <p className="text-sm text-gray-500">Telefon raqam va PIN bilan kiring</p>
        </div>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-700">Telefon</span>
          <input
            type="tel" inputMode="tel" autoComplete="username" required value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="h-14 w-full rounded-2xl bg-white px-4 text-lg ring-1 ring-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-700">PIN</span>
          <input
            type="password" inputMode="numeric" autoComplete="current-password" required
            pattern="\d{4,6}" minLength={4} maxLength={6} value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
            className="h-14 w-full rounded-2xl bg-white px-4 text-center text-2xl tracking-[0.5em] ring-1 ring-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </label>
        <button
          type="submit" disabled={busy || pin.length < 4}
          className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 text-lg font-semibold text-white shadow-md active:scale-[0.99] disabled:bg-gray-300"
        >
          {busy && <Loader2 size={20} className="animate-spin" />} Kirish
        </button>
      </form>
    </div>
  );
};

// ─── Shell ──────────────────────────────────────────────────────────────────

const NAV = [
  { to: '/m', end: true, label: 'Savat', icon: ShoppingBag },
  { to: '/m/carts', label: 'Savatlarim', icon: ClipboardList },
  { to: '/m/kpi', label: 'KPI', icon: BarChart3 },
];

const Shell = ({ children, basketCount }) => {
  const { user, logout } = useAuth();
  return (
    <div className="min-h-dvh bg-gray-50 pb-20">
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-gray-200 bg-white/95 px-4 backdrop-blur">
        <p className="truncate font-semibold text-gray-900">{fullName(user) || 'Sotuvchi'}</p>
        <button onClick={logout} aria-label="Chiqish" className="flex h-10 w-10 items-center justify-center rounded-full text-gray-500 active:bg-gray-100">
          <LogOut size={20} />
        </button>
      </header>
      <main className="mx-auto w-full max-w-xl px-4 pt-3">{children}</main>
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-3 border-t border-gray-200 bg-white pb-[env(safe-area-inset-bottom)]">
        {NAV.map(({ to, end, label, icon: Icon }) => (
          <NavLink
            key={to} to={to} end={end}
            className={({ isActive }) => cn(
              'relative flex h-16 flex-col items-center justify-center gap-0.5 text-xs font-medium',
              isActive ? 'text-blue-600' : 'text-gray-500',
            )}
          >
            <Icon size={22} />
            {label}
            {to === '/m' && basketCount > 0 && (
              <span className="absolute right-[calc(50%-22px)] top-2 min-w-5 rounded-full bg-blue-600 px-1.5 text-[11px] font-bold leading-5 text-white">
                {basketCount}
              </span>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
};

// ─── Basket screen ──────────────────────────────────────────────────────────

const activeVariants = (product) => (product.variants || []).filter((v) => v.is_active !== false);

// Colour rows × size chips; a tap adds one unit.
const VariantSheet = ({ product, inBasket, onAdd, onClose }) => {
  const byColor = useMemo(() => {
    const map = new Map();
    activeVariants(product).forEach((v) => {
      const key = v.color_name || '—';
      if (!map.has(key)) map.set(key, { hex: v.color_hex, items: [] });
      map.get(key).items.push(v);
    });
    map.forEach((g) => g.items.sort((a, b) =>
      String(a.size_name).localeCompare(String(b.size_name), undefined, { numeric: true })));
    return [...map.entries()];
  }, [product]);

  return (
    <div className="fixed inset-0 z-40 flex items-end bg-black/40" onClick={onClose}>
      <div
        role="dialog" aria-label={product.name}
        className="max-h-[80dvh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-lg font-bold text-gray-900">{product.name}</p>
            <p className="text-sm text-gray-500">{product.brand_name || product.sku}</p>
          </div>
          <button onClick={onClose} aria-label="Yopish" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100">
            <X size={20} />
          </button>
        </div>
        {byColor.length === 0 && <p className="text-sm text-gray-500">Variantlar yo'q</p>}
        <div className="space-y-4">
          {byColor.map(([color, { hex, items }]) => (
            <div key={color}>
              <div className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700">
                <span className="h-4 w-4 rounded-full ring-1 ring-gray-300" style={{ background: hex || '#e5e7eb' }} />
                {color}
              </div>
              <div className="flex flex-wrap gap-2">
                {items.map((v) => {
                  const taken = inBasket(v.id);
                  const left = v.stock_quantity - taken;
                  return (
                    <button
                      key={v.id}
                      disabled={left <= 0}
                      onClick={() => onAdd(product, v)}
                      className={cn(
                        'min-w-[4.5rem] rounded-xl px-3 py-2 text-center ring-1 transition active:scale-95',
                        left > 0 ? 'bg-white ring-gray-300' : 'bg-gray-100 text-gray-400 ring-gray-200',
                        taken > 0 && 'ring-2 ring-blue-500',
                      )}
                    >
                      <span className="block text-base font-bold">{v.size_name || '—'}</span>
                      <span className="block text-xs">{money(v.price)}</span>
                      <span className="block text-xs text-gray-500">
                        {taken > 0 ? `savatda ${taken} · ` : ''}{v.stock_quantity} dona
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Pick an existing client or fill a new client card on the spot.
const ClientPicker = ({ client, onChange }) => {
  const [term, setTerm] = useState('');
  const [results, setResults] = useState([]);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ first_name: '', last_name: '', phone: '+998 ' });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const t = term.trim();
    if (t.length < 2) { setResults([]); return; }
    let cancelled = false;
    const id = setTimeout(() => {
      clientsAPI.getClients({ search: t, size: 5 })
        .then((res) => !cancelled && setResults(toArray(res.data)))
        .catch(() => !cancelled && setResults([]));
    }, 300);
    return () => { cancelled = true; clearTimeout(id); };
  }, [term]);

  const create = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await clientsAPI.createClient({
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        phone: form.phone.trim() || null,
      });
      if (!res.success) throw new Error(res.message);
      onChange(res.data);
      setCreating(false);
      toast.success('Mijoz kartasi yaratildi');
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  if (client) {
    return (
      <div className="flex items-center gap-3 rounded-2xl bg-blue-50 p-3 ring-1 ring-blue-200">
        <User size={20} className="text-blue-600" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-gray-900">{fullName(client)}</p>
          {client.phone && <p className="text-sm text-gray-600">{client.phone}</p>}
        </div>
        <button onClick={() => onChange(null)} aria-label="Mijozni olib tashlash" className="flex h-10 w-10 items-center justify-center rounded-full text-gray-500 active:bg-blue-100">
          <X size={18} />
        </button>
      </div>
    );
  }

  const input = 'h-12 w-full rounded-xl bg-white px-3 text-base ring-1 ring-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500';

  if (creating) {
    return (
      <form onSubmit={create} className="space-y-2 rounded-2xl bg-gray-50 p-3 ring-1 ring-gray-200">
        <p className="text-sm font-semibold text-gray-800">Yangi mijoz kartasi</p>
        <div className="grid grid-cols-2 gap-2">
          <input required aria-label="Ism" placeholder="Ism" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} className={input} />
          <input required aria-label="Familiya" placeholder="Familiya" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} className={input} />
        </div>
        <input type="tel" inputMode="tel" aria-label="Telefon" placeholder="Telefon" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={input} />
        <div className="flex gap-2">
          <button type="button" onClick={() => setCreating(false)} className="h-11 flex-1 rounded-xl bg-white font-medium text-gray-700 ring-1 ring-gray-200">Bekor</button>
          <button type="submit" disabled={busy} className="h-11 flex-1 rounded-xl bg-blue-600 font-semibold text-white disabled:bg-gray-300">Saqlash</button>
        </div>
      </form>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          type="search" value={term} onChange={(e) => setTerm(e.target.value)}
          placeholder="Mijoz: ism yoki telefon" aria-label="Mijoz qidirish" className={input}
        />
        <button onClick={() => setCreating(true)} aria-label="Yangi mijoz" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white text-blue-600 ring-1 ring-gray-200">
          <UserPlus size={20} />
        </button>
      </div>
      {results.map((c) => (
        <button key={c.id} onClick={() => { onChange(c); setTerm(''); }} className="flex w-full items-center justify-between rounded-xl bg-white px-3 py-2 text-left ring-1 ring-gray-200 active:bg-gray-50">
          <span className="font-medium text-gray-900">{fullName(c)}</span>
          <span className="text-sm text-gray-500">{c.phone}</span>
        </button>
      ))}
    </div>
  );
};

const BasketSheet = ({ basket, setQty, client, setClient, onSent, onClose }) => {
  const [notes, setNotes] = useState('');
  const [sending, setSending] = useState(false);
  const total = basket.reduce((s, i) => s + i.price * i.quantity, 0);

  const send = async () => {
    setSending(true);
    try {
      const res = await sellerAPI.createCart({
        client_id: client?.id ?? null,
        notes: notes.trim() || null,
        items: basket.map((i) => ({ product_variant_id: i.id, quantity: i.quantity })),
      });
      if (!res.success) throw new Error(res.message);
      toast.success(`Kassaga yuborildi — savat #${res.data.id}`);
      onSent();
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-end bg-black/40" onClick={onClose}>
      <div
        role="dialog" aria-label="Savat"
        className="flex max-h-[92dvh] w-full flex-col rounded-t-3xl bg-white"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 pb-3">
          <p className="text-lg font-bold text-gray-900">Savat</p>
          <button onClick={onClose} aria-label="Yopish" className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto px-5">
          <ul className="divide-y divide-gray-100">
            {basket.map((i) => (
              <li key={i.id} className="flex items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-gray-900">{i.name}</p>
                  <p className="text-sm text-gray-500">{[i.color_name, i.size_name].filter(Boolean).join(' · ')}</p>
                  <p className="text-sm font-bold text-blue-600">{money(i.price * i.quantity)}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => setQty(i.id, i.quantity - 1)} aria-label="Kamaytirish" className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 active:bg-gray-200">
                    {i.quantity === 1 ? <Trash2 size={18} className="text-red-600" /> : <Minus size={18} />}
                  </button>
                  <span className="w-8 text-center text-lg font-bold tabular-nums">{i.quantity}</span>
                  <button
                    onClick={() => setQty(i.id, i.quantity + 1)} disabled={i.quantity >= i.stock_quantity}
                    aria-label="Ko'paytirish" className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 active:bg-gray-200 disabled:opacity-40"
                  >
                    <Plus size={18} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
          <ClientPicker client={client} onChange={setClient} />
          <textarea
            value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} rows={2}
            placeholder="Izoh kassirga (ixtiyoriy)" aria-label="Izoh"
            className="w-full rounded-xl bg-white p-3 text-base ring-1 ring-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="border-t border-gray-100 p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
          <button
            onClick={send} disabled={sending || basket.length === 0}
            className="flex h-16 w-full items-center justify-between rounded-2xl bg-emerald-600 px-5 text-white shadow-md active:scale-[0.99] disabled:bg-gray-300"
          >
            <span className="flex items-center gap-2 text-lg font-bold">
              {sending ? <Loader2 size={22} className="animate-spin" /> : <Send size={22} />} Kassaga yuborish
            </span>
            <span className="text-xl font-bold tabular-nums">{money(total)}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

const BasketScreen = ({ basket, setBasket, client, setClient }) => {
  const inputRef = useRef(null);
  const { searchTerm, setSearchTerm, searchResults, searchLoading, clearSearch } = useProductSearch({ skipBarcodes: true });
  const [picked, setPicked] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [showBasket, setShowBasket] = useState(false);

  const inBasket = useCallback((id) => basket.find((i) => i.id === id)?.quantity || 0, [basket]);

  const add = (product, v) => {
    if (inBasket(v.id) >= v.stock_quantity) return toast.error('Omborda boshqa qolmagan');
    setBasket((items) => items.some((i) => i.id === v.id)
      ? items.map((i) => (i.id === v.id ? { ...i, quantity: i.quantity + 1 } : i))
      : [...items, {
        id: v.id, name: product.name, sku: v.sku, price: Number(v.price) || 0,
        color_name: v.color_name, size_name: v.size_name, stock_quantity: v.stock_quantity, quantity: 1,
      }]);
    navigator.vibrate?.(30);
  };

  const setQty = (id, qty) => setBasket((items) => (qty <= 0
    ? items.filter((i) => i.id !== id)
    : items.map((i) => (i.id === id ? { ...i, quantity: Math.min(qty, i.stock_quantity) } : i))));

  // A scanned code is an exact variant: add it straight away.
  const lookup = async (code) => {
    setScanning(false);
    try {
      const res = await productsAPI.getProductByBarcode(code);
      const variant = res.success && activeVariants(res.data).find((v) => v.sku?.toLowerCase() === code.toLowerCase());
      if (variant) {
        add(res.data, variant);
        toast.success(`${res.data.name} · ${[variant.color_name, variant.size_name].filter(Boolean).join(' ')}`);
        setSearchTerm('');
      } else if (res.success) {
        setPicked(res.data);
      } else {
        setSearchTerm(code);
      }
    } catch {
      setSearchTerm(code);
    }
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && isBarcode(searchTerm.trim())) lookup(searchTerm.trim());
  };

  const count = basket.reduce((n, i) => n + i.quantity, 0);
  const total = basket.reduce((s, i) => s + i.price * i.quantity, 0);

  return (
    <>
      <div className="sticky top-14 z-20 -mx-4 bg-gray-50 px-4 pb-3 pt-1">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={20} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              ref={inputRef} type="search" inputMode="search" enterKeyHint="search" autoComplete="off"
              value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} onKeyDown={onKeyDown}
              placeholder="Nomi, firma yoki kod" aria-label="Mahsulot qidirish"
              className="h-14 w-full rounded-2xl bg-white pl-11 pr-11 text-lg shadow-sm ring-1 ring-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {searchLoading ? (
              <Loader2 size={20} className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin text-blue-500" />
            ) : searchTerm && (
              <button onClick={clearSearch} aria-label="Tozalash" className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full text-gray-500">
                <X size={20} />
              </button>
            )}
          </div>
          {CAN_SCAN && (
            <button onClick={() => setScanning(true)} aria-label="Kamera bilan skanerlash" className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-md active:scale-95">
              <Camera size={26} />
            </button>
          )}
        </div>
      </div>

      {!searchLoading && searchResults.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-center text-gray-500">
          <SearchX size={44} className="mb-2 text-gray-300" />
          <p className="font-medium text-gray-700">Hech narsa topilmadi</p>
        </div>
      ) : (
        <ul className="space-y-2 pb-24">
          {searchResults.map((p) => {
            const vs = activeVariants(p);
            const stock = vs.reduce((s, v) => s + (v.stock_quantity || 0), 0);
            const prices = vs.map((v) => Number(v.price) || 0);
            const min = prices.length ? Math.min(...prices) : 0;
            return (
              <li key={p.id}>
                <button onClick={() => setPicked(p)} className="flex w-full items-center gap-3 rounded-2xl bg-white p-3 text-left shadow-sm ring-1 ring-gray-200 active:bg-gray-50">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-blue-50">
                    {p.image_url
                      ? <img src={p.image_url} alt={p.name} className="h-full w-full object-cover" loading="lazy" />
                      : <Package size={24} className="text-blue-500" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-gray-900">{p.name}</p>
                    <p className="truncate text-sm text-gray-500">{p.brand_name || p.sku}</p>
                    <p className="text-sm font-bold text-blue-600">{money(min)}</p>
                  </div>
                  <span className={cn('rounded-full px-2.5 py-1 text-xs font-bold', stock ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500')}>
                    {stock} dona
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {count > 0 && (
        <button
          onClick={() => setShowBasket(true)}
          className="fixed inset-x-4 bottom-20 z-30 mx-auto flex h-14 max-w-xl items-center justify-between rounded-2xl bg-emerald-600 px-5 text-white shadow-lg active:scale-[0.99]"
        >
          <span className="flex items-center gap-2 font-semibold"><ShoppingBag size={20} /> Savat · {count} ta</span>
          <span className="text-lg font-bold tabular-nums">{money(total)}</span>
        </button>
      )}

      {picked && <VariantSheet product={picked} inBasket={inBasket} onAdd={add} onClose={() => setPicked(null)} />}
      {showBasket && (
        <BasketSheet
          basket={basket} setQty={setQty} client={client} setClient={setClient}
          onClose={() => setShowBasket(false)}
          onSent={() => {
            setBasket([]);
            setClient(null);
            setShowBasket(false);
            clearSearch(); // refetch: the sent items left stock
          }}
        />
      )}
      {scanning && <CameraScanner onDetect={lookup} onClose={() => setScanning(false)} />}
    </>
  );
};

// ─── My carts ───────────────────────────────────────────────────────────────

const STATUS = {
  pending: { label: 'Kassada kutmoqda', cls: 'bg-amber-50 text-amber-800 ring-amber-200' },
  completed: { label: "To'landi", cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  cancelled: { label: 'Bekor qilindi', cls: 'bg-gray-100 text-gray-600 ring-gray-200' },
};

const time = (iso) => formatDate(iso, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

const CartsScreen = () => {
  const confirm = useConfirm();
  const [carts, setCarts] = useState(null);

  const load = useCallback(() => {
    sellerAPI.getCarts()
      .then((res) => setCarts(res.data || []))
      .catch((err) => { setCarts([]); toast.error(getApiErrorMessage(err)); });
  }, []);

  // Refresh while open so "paid" shows up without pulling.
  useEffect(() => {
    load();
    const id = setInterval(load, 20000);
    return () => clearInterval(id);
  }, [load]);

  const cancel = async (cart) => {
    const ok = await confirm({
      title: 'Savatni bekor qilish',
      message: `Savat #${cart.id} bekor qilinsinmi?`,
      description: 'Mahsulotlar omborga qaytadi.',
    });
    if (!ok) return;
    try {
      await sellerAPI.cancelCart(cart.id);
      load();
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  };

  if (!carts) return <div className="flex justify-center py-16"><Loader2 className="animate-spin text-blue-500" /></div>;
  if (!carts.length) return <p className="py-16 text-center text-gray-500">Hali savat yuborilmagan</p>;

  return (
    <ul className="space-y-3 pb-4">
      {carts.map((c) => (
        <li key={c.id} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-200">
          <div className="flex items-center justify-between gap-2">
            <p className="font-bold text-gray-900">#{c.id} · {money(c.total)}</p>
            <span className={cn('rounded-full px-2.5 py-1 text-xs font-semibold ring-1', STATUS[c.status]?.cls)}>
              {STATUS[c.status]?.label || c.status}
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            {time(c.created_at)}{c.client_name ? ` · ${c.client_name}` : ''}
          </p>
          <ul className="mt-2 space-y-0.5 text-sm text-gray-700">
            {c.items.map((i) => (
              <li key={i.product_variant_id}>
                {i.quantity} × {i.product_name} <span className="text-gray-500">{[i.color_name, i.size_name].filter(Boolean).join(' · ')}</span>
              </li>
            ))}
          </ul>
          {c.status === 'pending' && (
            <div className="mt-3 flex items-center justify-between">
              <span className="flex items-center gap-1 text-xs text-gray-500">
                <Clock size={14} /> {time(c.expires_at)} gacha band
              </span>
              <button onClick={() => cancel(c)} className="rounded-xl px-3 py-2 text-sm font-medium text-red-600 ring-1 ring-red-200 active:bg-red-50">
                Bekor qilish
              </button>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
};

// ─── KPI ────────────────────────────────────────────────────────────────────

const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const monthRange = (offset) => {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const last = new Date(now.getFullYear(), now.getMonth() + offset + 1, 0);
  return { start_date: iso(first), end_date: iso(last) };
};

const Tile = ({ label, value, sub }) => (
  <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-200">
    <p className="text-xs font-medium text-gray-500">{label}</p>
    <p className="mt-1 text-xl font-bold tabular-nums text-gray-900">{value}</p>
    {sub && <p className="text-xs text-gray-500">{sub}</p>}
  </div>
);

const KpiScreen = () => {
  const [offset, setOffset] = useState(0);
  const [data, setData] = useState(null);
  const [day, setDay] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setData(null);
    setDay(null);
    sellerAPI.getMe(monthRange(offset))
      .then((res) => !cancelled && setData(res.data))
      .catch((err) => toast.error(getApiErrorMessage(err)));
    return () => { cancelled = true; };
  }, [offset]);

  const k = data?.kpi;
  const pct = k?.target_pct;
  const maxDay = Math.max(1, ...(data?.daily || []).map((d) => d.revenue));
  const shown = day ?? data?.daily?.findLast((d) => d.revenue > 0);

  return (
    <div className="space-y-3 pb-4">
      <div role="radiogroup" aria-label="Davr" className="grid grid-cols-2 gap-1 rounded-2xl bg-gray-200/70 p-1">
        {[[0, 'Bu oy'], [-1, "O'tgan oy"]].map(([o, label]) => (
          <button
            key={o} role="radio" aria-checked={offset === o} onClick={() => setOffset(o)}
            className={cn('h-10 rounded-xl text-sm font-semibold', offset === o ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600')}
          >
            {label}
          </button>
        ))}
      </div>

      {!k ? (
        <div className="flex justify-center py-16"><Loader2 className="animate-spin text-blue-500" /></div>
      ) : (
        <>
          <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-200">
            <p className="text-sm font-medium text-gray-500">Tushum</p>
            <p className="text-3xl font-bold tabular-nums tracking-tight text-gray-900">{money(k.revenue)}</p>
            {k.target > 0 ? (
              <>
                <div
                  role="meter" aria-label="Reja bajarilishi" aria-valuemin={0} aria-valuemax={100}
                  aria-valuenow={Math.round(Math.min(pct, 100))}
                  className="mt-3 h-3 overflow-hidden rounded-full bg-gray-100"
                >
                  <div className="h-full rounded-full bg-blue-600" style={{ width: `${Math.min(pct, 100)}%` }} />
                </div>
                <p className="mt-1.5 flex justify-between text-sm text-gray-600">
                  <span><b className="text-gray-900">{Math.round(pct)}%</b> reja</span>
                  <span>Reja: {money(k.target)}</span>
                </p>
              </>
            ) : (
              <p className="mt-1 text-sm text-gray-500">Reja belgilanmagan</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Tile label="Komissiya" value={money(k.commission)} sub={`${k.commission_rate}% tushumdan`} />
            <Tile label="Reyting" value={k.rank ? `${k.rank} / ${data.ranked}` : '—'} sub="sotuvchilar orasida" />
            <Tile label="Sotuvlar" value={k.sales_count} sub={`${k.items_sold} dona mahsulot`} />
            <Tile label="O'rtacha chek" value={money(k.avg_check)} />
          </div>

          <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-200">
            <div className="mb-3 flex items-baseline justify-between gap-2">
              <p className="text-sm font-semibold text-gray-800">Kunlik tushum</p>
              {shown && (
                <p className="text-sm text-gray-600">
                  {formatDate(shown.date, { month: 'short', day: 'numeric' })}: <b className="tabular-nums text-gray-900">{money(shown.revenue)}</b>
                </p>
              )}
            </div>
            {/* One bar per day; tap a bar to read it. */}
            <div className="flex h-28 items-end gap-[2px]" role="list" aria-label="Kunlik tushum">
              {data.daily.map((d) => (
                <button
                  key={d.date} role="listitem" onClick={() => setDay(d)}
                  aria-label={`${d.date}: ${money(d.revenue)}, ${d.sales_count} ta sotuv`}
                  className="flex h-full min-w-0 flex-1 items-end"
                >
                  <span
                    className={cn('w-full rounded-t-[4px]', shown?.date === d.date ? 'bg-blue-700' : 'bg-blue-400')}
                    style={{ height: d.revenue ? `${Math.max(4, (d.revenue / maxDay) * 100)}%` : '2px', opacity: d.revenue ? 1 : 0.35 }}
                  />
                </button>
              ))}
            </div>
            <div className="mt-1 flex justify-between text-xs text-gray-500">
              <span>{formatDate(data.start_date, { month: 'short', day: 'numeric' })}</span>
              <span>{formatDate(data.end_date, { month: 'short', day: 'numeric' })}</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// ─── App ────────────────────────────────────────────────────────────────────

export default function SellerApp() {
  const { user, loading } = useAuth();
  // Lifted here so switching tabs keeps the basket.
  const [basket, setBasket] = useState([]);
  const [client, setClient] = useState(null);

  // Installable as its own home-screen app (scope /m) without making the
  // back office installable too, so the manifest is only linked here.
  useEffect(() => {
    const link = Object.assign(document.createElement('link'), { rel: 'manifest', href: '/m.webmanifest' });
    document.head.appendChild(link);
    return () => link.remove();
  }, []);

  if (loading) {
    return <div className="flex min-h-dvh items-center justify-center text-gray-500">Yuklanmoqda...</div>;
  }

  return (
    <Routes>
      <Route path="login" element={<LoginScreen />} />
      <Route
        path="*"
        element={
          user?.role !== 'seller' ? (
            // A back-office user who opens /m goes back to their own app.
            <Navigate to={user ? '/' : '/m/login'} replace />
          ) : (
            <Shell basketCount={basket.reduce((n, i) => n + i.quantity, 0)}>
              <Routes>
                <Route index element={<BasketScreen basket={basket} setBasket={setBasket} client={client} setClient={setClient} />} />
                <Route path="carts" element={<CartsScreen />} />
                <Route path="kpi" element={<KpiScreen />} />
                <Route path="*" element={<Navigate to="/m" replace />} />
              </Routes>
            </Shell>
          )
        }
      />
    </Routes>
  );
}
