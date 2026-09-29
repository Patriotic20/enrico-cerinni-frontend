/**
 * Checkout Page
 * 
 * Point of sale interface for processing customer transactions.
 * Includes product search, cart management, client selection, and payment processing.
 * 
 * @page
 */

import { useEffect, Suspense } from 'react';
import logger from '../utils/logger';
import PageLayout from '../components/layout/PageLayout';
import ClientModal from '../components/modals/ClientModal';
import { LoadingSpinner } from '../components/ui';
import { CheckCircle2, Loader2 } from 'lucide-react';
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

// Right-hand "ticket": who (seller, client) -> what (cart) -> how (payment) -> pay.
// Fixed to the viewport on desktop so the cart and the pay button never scroll away.
const TicketPanel = ({ checkout }) => {
  const total = Number(checkout.total) || 0;
  const owing = [PAYMENT_METHODS.PARTIAL, PAYMENT_METHODS.DEBT].includes(checkout.paymentMethod) && total > 0;
  const needType = checkout.cart.length > 0 && checkout.paymentMethod !== PAYMENT_METHODS.DEBT && !checkout.payType;
  const disabled = checkout.cart.length === 0 || checkout.loading || needType;
  return (
    <aside className="lg:w-[500px] xl:w-[540px] shrink-0 flex flex-col min-h-0 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="p-4 space-y-3 border-b border-gray-100">
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

      <div className="border-t border-gray-200 bg-gray-50 p-4 space-y-3">
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