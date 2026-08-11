/**
 * Confirm Context
 *
 * Promise-based replacement for the native `window.confirm()`.
 * Wrap the app in `<ConfirmProvider>` and call `useConfirm()` anywhere:
 *
 * @example
 * const confirm = useConfirm();
 * if (!(await confirm('Bu mahsulotni o\'chirishni xohlaysizmi?'))) return;
 *
 * @example
 * const ok = await confirm({
 *   title: 'Sotuvni bekor qilish',
 *   message: 'Bu sotuvni bekor qilishni xohlaysizmi?',
 *   confirmText: 'Ha, bekor qilish',
 *   variant: 'warning',
 * });
 */

import { createContext, useContext, useCallback, useRef, useState } from 'react';
import ConfirmDialog from '../components/ui/ConfirmDialog';

const ConfirmContext = createContext(null);

const DEFAULT_OPTIONS = {
  title: 'Tasdiqlash',
  message: '',
  description: '',
  confirmText: 'Ha, tasdiqlayman',
  cancelText: 'Bekor qilish',
  variant: 'danger',
};

export const ConfirmProvider = ({ children }) => {
  const [options, setOptions] = useState(null);
  const resolverRef = useRef(null);

  // Accepts either a message string or a full options object.
  const confirm = useCallback((input) => {
    const next = typeof input === 'string' ? { message: input } : (input || {});

    return new Promise((resolve) => {
      resolverRef.current = resolve;
      setOptions({ ...DEFAULT_OPTIONS, ...next });
    });
  }, []);

  const settle = useCallback((result) => {
    setOptions(null);
    resolverRef.current?.(result);
    resolverRef.current = null;
  }, []);

  const handleConfirm = useCallback(() => settle(true), [settle]);
  const handleCancel = useCallback(() => settle(false), [settle]);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <ConfirmDialog
        isOpen={Boolean(options)}
        {...(options || {})}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </ConfirmContext.Provider>
  );
};

/**
 * Returns the `confirm(options) => Promise<boolean>` function.
 * Falls back to `window.confirm` if the provider is missing, so a component
 * rendered outside the tree never crashes.
 */
export const useConfirm = () => {
  const confirm = useContext(ConfirmContext);

  if (!confirm) {
    return (input) =>
      Promise.resolve(
        window.confirm(typeof input === 'string' ? input : input?.message || '')
      );
  }

  return confirm;
};

export default ConfirmContext;
