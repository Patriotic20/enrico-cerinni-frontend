import { useState, useEffect } from 'react';
import { PAYMENT_METHODS, ERROR_MESSAGES } from '../utils/constants';
import { formatCurrency } from '../utils/format';

export const usePayment = (total, clientDebt = 0) => {
  const [paymentMethod, setPaymentMethod] = useState(PAYMENT_METHODS.FULL);
  // Cash / card / transfer. No default: the cashier must pick it, or every sale
  // silently lands in the "cash" column of the reports.
  const [payType, setPayType] = useState(null);
  const [paidAmount, setPaidAmount] = useState(0);
  const [showDebtWarning, setShowDebtWarning] = useState(false);
  const [debtWarning, setDebtWarning] = useState('');

  // Update paid amount when payment method changes
  useEffect(() => {
    const validTotal = Number(total) || 0;
    
    if (paymentMethod === PAYMENT_METHODS.FULL) {
      setPaidAmount(validTotal);
    } else if (paymentMethod === PAYMENT_METHODS.DEBT) {
      setPaidAmount(0);
    } else if (paymentMethod === PAYMENT_METHODS.PARTIAL) {
      // Let the cashier type the amount. Coming from "To'liq" the field held the
      // full total, which partial validation then rejects — start empty instead.
      if (paidAmount >= validTotal) {
        setPaidAmount(0);
      }
    }
  }, [paymentMethod, total]);

  const remainingAmount = (Number(total) || 0) - (Number(paidAmount) || 0);

  const validatePayment = () => {
    // For partial payment validation
    if (paymentMethod === PAYMENT_METHODS.PARTIAL) {
      if (paidAmount >= total) {
        setDebtWarning(ERROR_MESSAGES.PAYMENT_VALIDATION.FULL_PAYMENT_ENTERED);
        setShowDebtWarning(true);
        return false;
      }
      
      if (paidAmount <= 0) {
        setDebtWarning(ERROR_MESSAGES.PAYMENT_VALIDATION.AMOUNT_REQUIRED);
        setShowDebtWarning(true);
        return false;
      }
    }

    // For debt payment - allow it even if client has existing debt
    // The warning should be shown but not block the payment
    // Existing debt: ask first. The warning's "Davom etish" opens the
    // confirmation, so returning true here stacked both modals at once.
    if (paymentMethod === PAYMENT_METHODS.DEBT && clientDebt > 0) {
      setDebtWarning(`${ERROR_MESSAGES.PAYMENT_VALIDATION.CLIENT_DEBT} ${formatCurrency(Number(clientDebt))}. Davom etishni xohlaysizmi?`);
      setShowDebtWarning(true);
      return false;
    }

    return true;
  };

  // ponytail: a pure debt sale receives no money, so it has no real type; it is
  // stored as cash. Record the type on the later debt payment if reports need it.
  const getBackendPaymentMethod = () =>
    paymentMethod === PAYMENT_METHODS.DEBT ? PAYMENT_METHODS.CASH : (payType || PAYMENT_METHODS.CASH);

  const resetPayment = () => {
    setPaymentMethod(PAYMENT_METHODS.FULL);
    setPayType(null);
    setPaidAmount(0);
    setShowDebtWarning(false);
    setDebtWarning('');
  };

  return {
    paymentMethod,
    paidAmount,
    remainingAmount,
    showDebtWarning,
    debtWarning,
    setPaymentMethod,
    payType,
    setPayType,
    setPaidAmount,
    setShowDebtWarning,
    setDebtWarning,
    validatePayment,
    getBackendPaymentMethod,
    resetPayment,
  };
}; 