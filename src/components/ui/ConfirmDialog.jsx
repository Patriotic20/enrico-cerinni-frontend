/**
 * ConfirmDialog Component
 *
 * A styled replacement for the native `window.confirm()` dialog.
 * Rendered through a portal so it always sits above page content.
 *
 * @component
 * @example
 * <ConfirmDialog
 *   isOpen={isOpen}
 *   title="Mahsulotni o'chirish"
 *   message="Bu mahsulotni o'chirishni xohlaysizmi?"
 *   variant="danger"
 *   onConfirm={handleConfirm}
 *   onCancel={handleCancel}
 * />
 */

import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Trash2, Info, HelpCircle } from 'lucide-react';
import { cn } from '../../utils/cn';
import Button from './Button';

/**
 * Visual presets per variant: icon, icon colors and confirm button style.
 */
const VARIANT_STYLES = {
  danger: {
    Icon: Trash2,
    iconWrapper: 'bg-red-100 text-red-600',
    confirmVariant: 'danger',
  },
  warning: {
    Icon: AlertTriangle,
    iconWrapper: 'bg-yellow-100 text-yellow-600',
    confirmVariant: 'warning',
  },
  info: {
    Icon: Info,
    iconWrapper: 'bg-blue-100 text-blue-600',
    confirmVariant: 'primary',
  },
  question: {
    Icon: HelpCircle,
    iconWrapper: 'bg-gray-100 text-gray-600',
    confirmVariant: 'primary',
  },
};

const ConfirmDialog = ({
  isOpen,
  title = 'Tasdiqlash',
  message,
  description,
  confirmText = 'Ha, tasdiqlayman',
  cancelText = 'Bekor qilish',
  variant = 'danger',
  loading = false,
  onConfirm,
  onCancel,
}) => {
  const confirmButtonRef = useRef(null);
  const previousFocusRef = useRef(null);

  // Keyboard shortcuts: Escape cancels, Enter confirms.
  useEffect(() => {
    if (!isOpen) return undefined;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel?.();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        onConfirm?.();
      }
    };

    previousFocusRef.current = document.activeElement;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown);

    // Focus the confirm action so keyboard users land on it immediately.
    confirmButtonRef.current?.focus();

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
      previousFocusRef.current?.focus?.();
    };
  }, [isOpen, onCancel, onConfirm]);

  if (!isOpen) return null;

  const { Icon, iconWrapper, confirmVariant } =
    VARIANT_STYLES[variant] || VARIANT_STYLES.danger;

  const dialog = (
    <div
      className="fixed inset-0 z-[1050] flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm animate-confirm-fade"
      onClick={() => !loading && onCancel?.()}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      <div
        className="relative w-full max-w-md overflow-hidden bg-white rounded-2xl shadow-2xl ring-1 ring-gray-900/5 animate-confirm-pop"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex gap-4 px-6 pt-6 pb-5">
          <div
            className={cn(
              'flex items-center justify-center flex-shrink-0 w-12 h-12 rounded-full',
              iconWrapper
            )}
          >
            <Icon className="w-6 h-6" aria-hidden="true" />
          </div>

          <div className="flex-1 min-w-0 pt-0.5">
            <h2
              id="confirm-dialog-title"
              className="text-base font-semibold text-gray-900"
            >
              {title}
            </h2>
            {message && (
              <p className="mt-1.5 text-sm leading-relaxed text-gray-600">
                {message}
              </p>
            )}
            {description && (
              <p className="mt-2 text-xs leading-relaxed text-gray-500">
                {description}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-col-reverse gap-2 px-6 py-4 border-t border-gray-100 bg-gray-50 sm:flex-row sm:justify-end">
          <Button
            variant="secondary"
            size="md"
            disabled={loading}
            onClick={() => onCancel?.()}
          >
            {cancelText}
          </Button>
          <Button
            ref={confirmButtonRef}
            variant={confirmVariant}
            size="md"
            loading={loading}
            onClick={() => onConfirm?.()}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined'
    ? createPortal(dialog, document.body)
    : null;
};

export default ConfirmDialog;
