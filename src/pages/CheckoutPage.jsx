/**
 * Checkout Page
 * 
 * Point of sale interface for processing customer transactions.
 * Includes product search, cart management, client selection, and payment processing.
 * 
 * @page
 */

import { useEffect, useState, useCallback, Suspense } from 'react';
import logger from '../utils/logger';
import PageLayout from '../components/layout/PageLayout';
import ClientModal from '../components/modals/ClientModal';
import Modal from '../components/modals/Modal';
import toast from 'react-hot-toast';
import { cartsAPI } from '../api';
import { getApiErrorMessage } from '../utils/api';
import { useConfirm } from '../contexts/ConfirmContext';
import { LoadingSpinner } from '../components/ui';
import { CheckCircle2, Loader2, Smartphone, X } from 'lucide-react';
import { PAYMENT_METHODS } from '../utils/constants';
import { formatCurrency } from '../utils/format';
import {
  ProductSearch,
  CartItems,
  ClientSection,
  SellerSection,
  PaymentSection,
  PaymentConfirmationModal,
  DebtWarningModal,
  ReceiptModal
} from '../components/checkout';
import { useCheckout } from '../hooks/useCheckout';
import { useAuth } from '../contexts/AuthContext';

// Carts sellers sent from their phones (/m). Opening one fills the ticket;
// paying it turns the seller's stock reservation into the sale.
const PendingCarts = ({ checkout }) => {
  const confirm = useConfirm();
  const [carts, setCarts] = useState([]);
  const [open, setOpen] = useState(false);

  const load = useCallback(() => {
    cartsAPI.getPending()
      .then(res => setCarts(res.data || []))
      .catch(error => logger.error('Error loading pending carts:', error));
  }, []);

  // ponytail: polling; switch to SSE/websocket if 30s feels slow at the till.
  useEffect(() => {
    load();
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, [load, checkout.cartId]);

  const cancel = async (cart) => {
    const ok = await confirm({
      title: 'Savatni bekor qilish',
      message: `${cart.seller_name} savati #${cart.id} bekor qilinsinmi?`,
      description: 'Band qilingan mahsulotlar omborga qaytadi.',
    });
    if (!ok) return;
    try {
      await cartsAPI.cancel(cart.id);
      if (checkout.cartId === cart.id) checkout.resetForm();
      load();
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    }
  };

  if (checkout.cartId) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-xl bg-blue-50 px-3 py-2 text-sm text-blue-900 ring-1 ring-blue-200">
        <span className="flex items-center gap-2"><Smartphone size={16} /> Sotuvchi savati #{checkout.cartId}</span>
        <button type="button" onClick={checkout.resetForm} aria-label="Savatni yopish" className="rounded-full p-1 hover:bg-blue-100">
          <X size={16} />
        </button>
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => { load(); setOpen(true); }}
        className={`w-full flex items-center justify-between rounded-xl px-3 py-2 text-sm font-medium ring-1 transition-colors ${
          carts.length ? 'bg-amber-50 text-amber-900 ring-amber-300 hover:bg-amber-100' : 'bg-gray-50 text-gray-600 ring-gray-200 hover:bg-gray-100'
        }`}
      >
        <span className="flex items-center gap-2"><Smartphone size={16} /> Sotuvchilardan savatlar</span>
        <span className="rounded-full bg-white px-2 font-bold tabular-nums">{carts.length}</span>
      </button>
      <Modal isOpen={open} onClose={() => setOpen(false)} title="Sotuvchilardan savatlar" size="md">
        {carts.length === 0 ? (
          <p className="py-6 text-center text-sm text-gray-500">Kutilayotgan savat yo'q</p>
        ) : (
          <ul className="space-y-3">
            {carts.map(c => (
              <li key={c.id} className="rounded-xl border border-gray-200 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-gray-900">#{c.id} · {c.seller_name}</p>
                  <p className="font-bold tabular-nums text-gray-900">{formatCurrency(c.total)}</p>
                </div>
                <p className="text-xs text-gray-500">
                  {new Date(c.created_at).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}
                  {c.client_name ? ` · ${c.client_name}` : ''}
                </p>
                <ul className="mt-1 text-sm text-gray-700">
                  {c.items.map(i => (
                    <li key={i.product_variant_id}>
                      {i.quantity} × {i.product_name} <span className="text-gray-500">{[i.color_name, i.size_name].filter(Boolean).join(' · ')}</span>
                    </li>
                  ))}
                </ul>
                {c.notes && <p className="mt-1 text-sm italic text-gray-600">“{c.notes}”</p>}
                <div className="mt-2 flex justify-end gap-2">
                  <button type="button" onClick={() => cancel(c)} className="rounded-lg px-3 py-1.5 text-sm font-medium text-red-600 ring-1 ring-red-200 hover:bg-red-50">
                    Bekor qilish
                  </button>
                  <button
                    type="button"
                    onClick={() => { checkout.loadCart(c); setOpen(false); }}
                    className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-700"
                  >
                    Kassaga olish
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Modal>
    </>
  );
};

// Right-hand "ticket": who (seller, client) -> what (cart) -> how (payment) -> pay.
// Fixed to the viewport on desktop so the cart and the pay button never scroll away.
const TicketPanel = ({ checkout }) => {
  const total = Number(checkout.total) || 0;
  const owing = [PAYMENT_METHODS.PARTIAL, PAYMENT_METHODS.DEBT].includes(checkout.paymentMethod) && total > 0;
  const needType = checkout.cart.length > 0 && checkout.paymentMethod !== PAYMENT_METHODS.DEBT && !checkout.payType;
  const disabled = checkout.cart.length === 0 || checkout.loading || needType;
  // % width on small laptops/tablets so the product column isn't squeezed to ~270px
  return (
    <aside className="lg:w-[45%] xl:w-[500px] 2xl:w-[540px] shrink-0 flex flex-col min-h-0 bg-white rounded-2xl border border-gray-200 shadow-sm lg:overflow-hidden">
      <div className="p-4 space-y-3 border-b border-gray-100">
        <PendingCarts checkout={checkout} />
        <SellerSection
          sellers={checkout.sellers}
          sellerId={checkout.sellerId}
          onSelect={checkout.selectSeller}
          error={checkout.sellerError}
        />
        <ClientSection
          selectedClient={checkout.selectedClient}
          clientDebt={checkout.clientDebt}
          setShowClientModal={checkout.setShowClientModal}
          setSelectedClient={checkout.setSelectedClient}
        />
      </div>

      <CartItems
        cart={checkout.cart}
        updateQuantity={checkout.updateQuantity}
        updatePrice={checkout.updatePrice}
        removeFromCart={checkout.removeFromCart}
        clearCart={checkout.clearCart}
      />

      {/* Stacked layout (< lg): keep payment + pay button pinned while the cart scrolls by */}
      <div className="border-t border-gray-200 bg-gray-50 p-4 space-y-3 max-lg:sticky max-lg:bottom-0 max-lg:z-10 max-lg:rounded-b-2xl">
        <PaymentSection
          paymentMethod={checkout.paymentMethod}
          setPaymentMethod={checkout.setPaymentMethod}
          payType={checkout.payType}
          setPayType={checkout.setPayType}
          paidAmount={checkout.paidAmount}
          setPaidAmount={checkout.setPaidAmount}
          total={checkout.total}
          remainingAmount={checkout.remainingAmount}
          clientDebt={checkout.clientDebt}
        />
        {owing && (
          <div className="flex justify-between text-base">
            <span className="text-gray-600">Hozir: <b className="text-gray-900 tabular-nums">{formatCurrency(Number(checkout.paidAmount) || 0)}</b></span>
            <span className="text-gray-600">Qarz: <b className="text-red-600 tabular-nums">{formatCurrency(Number(checkout.remainingAmount) || 0)}</b></span>
          </div>
        )}
        <button
          type="button"
          onClick={checkout.handleCheckout}
          disabled={disabled}
          className="w-full h-[72px] px-5 flex items-center justify-between gap-3 rounded-xl bg-emerald-600 text-white shadow-sm hover:bg-emerald-700 active:bg-emerald-800 active:scale-[0.99] transition disabled:bg-gray-300 disabled:text-gray-500 disabled:shadow-none disabled:cursor-not-allowed"
        >
          <span className="flex items-center gap-2.5 text-lg font-bold">
            {checkout.loading
              ? <Loader2 size={24} className="animate-spin" />
              : <CheckCircle2 size={24} />}
            {needType ? "To'lov turini tanlang" : "To'lash"}
          </span>
          <span className="text-3xl font-bold tabular-nums tracking-tight">{formatCurrency(total)}</span>
        </button>
      </div>
    </aside>
  );
};

// Main checkout content component
const CheckoutContent = () => {
  const checkout = useCheckout();

  return (
    <>
      {/* Layout pads 1.5rem top/bottom on desktop, header is mobile-only. */}
      <div className="flex flex-col lg:flex-row gap-4 lg:h-[calc(100dvh-3rem)]">
        <section className="flex-1 min-w-0 min-h-0 flex flex-col">
          <ProductSearch
            searchTerm={checkout.searchTerm}
            setSearchTerm={checkout.setSearchTerm}
            searchResults={checkout.searchResults}
            searchLoading={checkout.searchLoading}
            isSearchFocused={checkout.isSearchFocused}
            setIsSearchFocused={checkout.setIsSearchFocused}
            addToCart={checkout.addToCart}
            addManyToCart={checkout.addManyToCart}
            onBarcodeScan={checkout.handleBarcodeScan}
            onSearch={checkout.searchProducts}
          />
        </section>
        <TicketPanel checkout={checkout} />
      </div>

      {/* Modals */}
      <ClientModal
        isOpen={checkout.showClientModal}
        onClose={() => checkout.setShowClientModal(false)}
        onClientSelect={checkout.selectClient}
        selectedClient={checkout.selectedClient}
      />

      <PaymentConfirmationModal
        paymentModal={checkout.paymentModal}
        setPaymentModal={checkout.setPaymentModal}
        total={checkout.total}
        paymentMethod={checkout.paymentMethod}
        payType={checkout.payType}
        paidAmount={checkout.paidAmount}
        remainingAmount={checkout.remainingAmount}
        selectedClient={checkout.selectedClient}
        sellerName={checkout.sellers.find(s => s.id === checkout.sellerId)?.name}
        itemCount={checkout.cart.reduce((n, i) => n + (Number(i.quantity) || 0), 0)}
        clientDebt={checkout.clientDebt}
        loading={checkout.loading}
        processPayment={checkout.processPayment}
      />

      <DebtWarningModal
        showDebtWarning={checkout.showDebtWarning}
        setShowDebtWarning={checkout.setShowDebtWarning}
        debtWarning={checkout.debtWarning}
        onContinue={checkout.handleCheckoutContinue}
      />

      <ReceiptModal
        showReceipt={checkout.showReceipt}
        currentSale={checkout.currentSale}
        cart={checkout.cart}
        selectedClient={checkout.selectedClient}
        clientName={checkout.clientName}
        clientPhone={checkout.clientPhone}
        total={checkout.total}
        paymentMethod={checkout.paymentMethod}
        payType={checkout.payType}
        paidAmount={checkout.paidAmount}
        remainingAmount={checkout.remainingAmount}
        resetForm={checkout.resetForm}
      />
    </>
  );
};

// Loading component
const CheckoutLoading = () => (
  <div className="flex items-center justify-center min-h-[400px]">
    <LoadingSpinner 
      message="Autentifikatsiya tekshirilmoqda..." 
      size="lg" 
    />
  </div>
);

/**
 * Main Checkout Page Component
 */
export default function CheckoutPage() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();

  // Handle authentication
  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated()) {
        logger.info('Redirecting to login - not authenticated');
        window.location.href = '/login';
      } else {
        logger.debug('Authentication successful, staying on checkout page');
      }
    } else {
      logger.debug('Still loading authentication...');
    }
  }, [authLoading, user, isAuthenticated]);

  // Show loading during authentication check
  if (authLoading) {
    return (
        <PageLayout>
          <CheckoutLoading />
        </PageLayout>
    );
  }

  return (
      // No PageLayout here: the POS fills the viewport, its padding/title would force a page scroll.
      <Suspense fallback={<CheckoutLoading />}>
        <CheckoutContent />
      </Suspense>
  );
} 