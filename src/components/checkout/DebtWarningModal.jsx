import { useEffect, useRef } from 'react';
import { AlertTriangle } from 'lucide-react';
import Modal from '../modals/Modal';

export default function DebtWarningModal({
  showDebtWarning,
  setShowDebtWarning,
  debtWarning,
  onContinue
}) {
  // Debt warning (can continue) vs validation error (blocks)
  const isDebtWarning = debtWarning && debtWarning.includes('Davom etishni xohlaysizmi?');

  // Modal focuses its container on open; this runs after it, so Enter hits the primary action.
  const primaryRef = useRef(null);
  useEffect(() => {
    if (showDebtWarning) primaryRef.current?.focus();
  }, [showDebtWarning]);

  const handleClose = () => setShowDebtWarning(false);
  const handleContinue = () => {
    setShowDebtWarning(false);
    onContinue?.();
  };

  return (
    <Modal isOpen={showDebtWarning} onClose={handleClose} title="Diqqat" size="sm">
      <div className="space-y-6 text-center">
        <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto">
          <AlertTriangle size={40} className="text-amber-600" />
        </div>
        <p className="m-0 text-lg text-gray-800 leading-relaxed">{debtWarning}</p>
        {isDebtWarning ? (
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="h-14 rounded-xl border-2 border-gray-200 bg-white text-base font-semibold text-gray-700 hover:bg-gray-50"
            >
              Bekor qilish
            </button>
            <button
              type="button"
              ref={primaryRef}
              onClick={handleContinue}
              className="h-14 rounded-xl bg-amber-500 text-white text-base font-bold hover:bg-amber-600"
            >
              Davom etish
            </button>
          </div>
        ) : (
          <button
            type="button"
            ref={primaryRef}
            onClick={handleClose}
            className="w-full h-14 rounded-xl bg-blue-600 text-white text-base font-bold hover:bg-blue-700"
          >
            Tushundim
          </button>
        )}
      </div>
    </Modal>
  );
}
