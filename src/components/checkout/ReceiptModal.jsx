import { useEffect, useRef } from 'react';
import { Printer, CheckCircle2, Plus } from 'lucide-react';
import Modal from '../modals/Modal';
import { formatCurrency } from '../../utils/format';
import { PAY_TYPE_LABELS } from '../../utils/constants';

export default function ReceiptModal({
  showReceipt,
  currentSale,
  cart,
  selectedClient,
  clientName,
  clientPhone,
  total,
  paymentMethod,
  payType,
  paidAmount,
  remainingAmount,
  resetForm
}) {
  // "Yangi sotuv" is the next step after nearly every sale — focus it.
  const newSaleRef = useRef(null);
  useEffect(() => {
    if (showReceipt) newSaleRef.current?.focus();
  }, [showReceipt]);

  const name = selectedClient
    ? `${selectedClient.first_name || ''} ${selectedClient.last_name || ''}`.trim() || selectedClient.name
    : clientName;
  const phone = selectedClient ? selectedClient.phone : clientPhone;
  const items = currentSale
    ? currentSale.items.map(i => ({ name: i.product_name, qty: i.quantity, price: Number(i.unit_price), sum: Number(i.total_price) }))
    : cart.map(i => ({ name: i.name, qty: i.quantity, price: Number(i.price) || 0, sum: (Number(i.quantity) || 0) * (Number(i.price) || 0), meta: [i.color_name, i.size_name].filter(Boolean).join(' · ') }));
  const grandTotal = currentSale ? Number(currentSale.total_amount) : Number(total) || 0;

  return (
    // The sale is already saved, so closing starts a fresh sale — leaving the
    // old cart on screen invited ringing it up twice.
    <Modal isOpen={showReceipt} onClose={resetForm} title="Sotuv yakunlandi" size="md">
      <div className="space-y-5">
        <div className="flex items-center gap-3 rounded-xl bg-emerald-50 border border-emerald-100 p-4 print:hidden">
          <CheckCircle2 size={36} className="text-emerald-600 shrink-0" />
          <div>
            <p className="m-0 text-lg font-bold text-gray-900">{formatCurrency(grandTotal)}</p>
            <p className="m-0 text-sm text-emerald-700">Sotuv muvaffaqiyatli saqlandi</p>
          </div>
        </div>

        <div id="receipt" className="rounded-xl border border-gray-200 p-5 text-gray-900">
          <div className="text-center pb-3 border-b border-dashed border-gray-300">
            <h2 className="m-0 text-xl font-bold">Enrico Cerrini</h2>
            <p className="m-0 text-sm text-gray-600">Kiyim do'koni</p>
            <p className="m-0 mt-1 text-xs text-gray-500">{new Date().toLocaleString('uz-UZ')}</p>
            {currentSale && <p className="m-0 text-xs text-gray-500">Chek № {currentSale.receipt_number}</p>}
          </div>

          <div className="py-3 border-b border-dashed border-gray-300 text-sm space-y-0.5">
            {name && <p className="m-0"><span className="text-gray-500">Mijoz:</span> {name}</p>}
            {phone && <p className="m-0"><span className="text-gray-500">Telefon:</span> {phone}</p>}
            {currentSale?.seller_name && <p className="m-0"><span className="text-gray-500">Sotuvchi:</span> {currentSale.seller_name}</p>}
          </div>

          <ul className="m-0 p-0 list-none py-3 border-b border-dashed border-gray-300 space-y-2">
            {items.map((it, idx) => (
              <li key={idx} className="flex justify-between gap-3 text-sm">
                <div className="min-w-0">
                  <p className="m-0 font-medium">{it.name}</p>
                  {it.meta && <p className="m-0 text-xs text-gray-500">{it.meta}</p>}
                  <p className="m-0 text-xs text-gray-500 tabular-nums">{it.qty} × {formatCurrency(it.price)}</p>
                </div>
                <span className="font-semibold tabular-nums whitespace-nowrap">{formatCurrency(it.sum)}</span>
              </li>
            ))}
          </ul>

          <div className="pt-3 space-y-1">
            <div className="flex justify-between text-lg font-bold">
              <span>Jami</span>
              <span className="tabular-nums">{formatCurrency(grandTotal)}</span>
            </div>
            {paymentMethod !== 'debt' && payType && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">To'lov turi</span>
                <span>{PAY_TYPE_LABELS[payType]}</span>
              </div>
            )}
            {paymentMethod !== 'full' && (
              <>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">To'langan</span>
                  <span className="tabular-nums">{formatCurrency(Number(paidAmount) || 0)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Qarz</span>
                  <span className="tabular-nums font-semibold">{formatCurrency(Number(remainingAmount) || 0)}</span>
                </div>
              </>
            )}
          </div>
          <p className="m-0 mt-4 text-center text-sm text-gray-500">Xaridingiz uchun rahmat!</p>
        </div>

        <div className="grid grid-cols-[1fr_2fr] gap-3 print:hidden">
          <button
            type="button"
            onClick={() => window.print()}
            className="h-14 flex items-center justify-center gap-2 rounded-xl border-2 border-gray-200 bg-white text-base font-semibold text-gray-700 hover:bg-gray-50"
          >
            <Printer size={20} /> Chop etish
          </button>
          <button
            ref={newSaleRef}
            type="button"
            onClick={resetForm}
            className="h-14 flex items-center justify-center gap-2 rounded-xl bg-blue-600 text-white text-lg font-bold hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-200"
          >
            <Plus size={22} /> Yangi sotuv
          </button>
        </div>
      </div>
    </Modal>
  );
}
