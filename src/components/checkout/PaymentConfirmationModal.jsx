import { useEffect, useRef } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';
import Modal from '../modals/Modal';
import { PAYMENT_METHODS, PAY_TYPE_LABELS } from '../../utils/constants';
import { formatCurrency } from '../../utils/format';

const METHOD_LABELS = {
  [PAYMENT_METHODS.FULL]: "To'liq to'lov",
  [PAYMENT_METHODS.PARTIAL]: "Qisman to'lov",
  [PAYMENT_METHODS.DEBT]: 'Qarzga',
};

const Row = ({ label, children, className = 'text-gray-900' }) => (
  <div className="flex justify-between items-center py-3 text-base">
    <span className="text-gray-500">{label}</span>
    <span className={`font-semibold tabular-nums ${className}`}>{children}</span>
  </div>
);

// Client is optional for full payment; useCheckout blocks partial/debt sales
// without one before this opens.
export default function PaymentConfirmationModal({
  paymentModal,
  setPaymentModal,
  total,
  paymentMethod,
  payType,
  paidAmount,
  remainingAmount,
  selectedClient,
  sellerName,
  itemCount,
  clientDebt,
  loading,
  processPayment
}) {
  const confirmRef = useRef(null);
  // Focus the confirm button so the cashier can just press Enter.
  useEffect(() => {
    if (paymentModal) confirmRef.current?.focus();
  }, [paymentModal]);

  const close = () => !loading && setPaymentModal(false);
  const clientName = selectedClient
    ? `${selectedClient.first_name || ''} ${selectedClient.last_name || ''}`.trim() || selectedClient.name
    : null;

  return (
    <Modal isOpen={paymentModal} onClose={close} title="Sotuvni tasdiqlash" size="md">
      <div className="space-y-5">
        <div className="text-center rounded-2xl bg-emerald-50 border border-emerald-100 py-5">
          <p className="m-0 text-sm font-medium text-emerald-700">Jami summa</p>
          <p className="m-0 mt-1 text-4xl font-bold text-gray-900 tabular-nums tracking-tight">
            {formatCurrency(Number(total) || 0)}
          </p>
          <p className="m-0 mt-1 text-sm text-gray-500">{itemCount} dona mahsulot</p>
        </div>

        <div className="divide-y divide-gray-100">
          <Row label="Mijoz">{clientName || <span className="text-gray-400 font-normal">Tanlanmagan</span>}</Row>
          <Row label="Sotuvchi">{sellerName || '—'}</Row>
          <Row label="To'lov">
            {METHOD_LABELS[paymentMethod]}
            {paymentMethod !== PAYMENT_METHODS.DEBT && payType && ` · ${PAY_TYPE_LABELS[payType]}`}
          </Row>
          {paymentMethod !== PAYMENT_METHODS.FULL && (
            <>
              <Row label="Hozir to'lanadi" className="text-blue-600">{formatCurrency(Number(paidAmount) || 0)}</Row>
              <Row label="Qarzga qoladi" className="text-red-600">{formatCurrency(Number(remainingAmount) || 0)}</Row>
            </>
          )}
          {(Number(clientDebt) || 0) > 0 && (
            <Row label="Avvalgi qarz" className="text-amber-700">{formatCurrency(Number(clientDebt))}</Row>
          )}
        </div>

        <div className="grid grid-cols-[1fr_2fr] gap-3">
          <button
            type="button"
            onClick={close}
            disabled={loading}
            className="h-14 rounded-xl border-2 border-gray-200 bg-white text-base font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Orqaga
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={processPayment}
            disabled={loading}
            className="h-14 flex items-center justify-center gap-2 rounded-xl bg-emerald-600 text-white text-lg font-bold hover:bg-emerald-700 focus:outline-none focus:ring-4 focus:ring-emerald-200 disabled:opacity-60"
          >
            {loading ? <Loader2 size={22} className="animate-spin" /> : <CheckCircle2 size={22} />}
            {loading ? 'Saqlanmoqda...' : 'Tasdiqlash'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
