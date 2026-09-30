/**
 * Modal Component
 * 
 * A flexible modal dialog component with consistent styling and accessibility features.
 * Supports multiple sizes, custom content, and proper focus management.
 * 
 * @component
 * @example
 * <Modal
 *   isOpen={showModal}
 *   onClose={handleClose}
 *   title="Modal Title"
 *   size="lg"
 * >
 *   <p>Modal content goes here</p>
 * </Modal>
 */

import { useEffect, useRef, useCallback, useId } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '../../utils/cn';
import { openLayer, closeLayer, isTopLayer, trapTab } from '../../utils/modalStack';

const Modal = ({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  size = 'md',
  closeOnOverlayClick = true,
  closeOnEscape = true,
  showCloseButton = true,
  className,
  headerClassName,
  contentClassName,
  overlayClassName,
  ...props 
}) => {
  const modalRef = useRef(null);
  const previousFocusRef = useRef(null);
  const layerRef = useRef(null);
  const titleId = useId();

  // Size configurations - made more compact
  const sizeClasses = {
    small: 'max-w-sm',
    medium: 'max-w-md', 
    large: 'max-w-lg',
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-2xl',
    '2xl': 'max-w-4xl',
    full: 'max-w-full mx-3',
  };

  // Keys go to the top-most dialog only: one Esc closes one layer, and a
  // ConfirmDialog opened over this modal keeps its keys to itself.
  const handleKeyDown = useCallback((e) => {
    if (!isTopLayer(layerRef.current)) return;
    if (e.key === 'Escape' && closeOnEscape) {
      onClose();
    }
    trapTab(e, modalRef.current);
  }, [closeOnEscape, onClose]);

  // Handle overlay click
  const handleOverlayClick = useCallback((e) => {
    if (closeOnOverlayClick && e.target === e.currentTarget) {
      onClose();
    }
  }, [closeOnOverlayClick, onClose]);

  // Focus + body-scroll: run once per open. Must NOT depend on handleKeyDown,
  // else re-running steals focus from inputs on every parent re-render.
  useEffect(() => {
    if (!isOpen) return;
    previousFocusRef.current = document.activeElement;
    layerRef.current = openLayer();
    // Respect autoFocus on a child: React focuses it before this effect runs.
    if (modalRef.current && !modalRef.current.contains(document.activeElement)) {
      modalRef.current.focus();
    }
    return () => {
      closeLayer(layerRef.current);
      if (previousFocusRef.current) {
        previousFocusRef.current.focus();
      }
    };
  }, [isOpen]);

  // Keydown listener tracks latest handleKeyDown without touching focus.
  useEffect(() => {
    if (!isOpen) return;
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleKeyDown]);

  // Don't render if not open
  if (!isOpen) return null;

  const modalContent = (
    <div 
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center p-3',
        'bg-black/40 backdrop-blur-sm',
        overlayClassName
      )}
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? titleId : undefined}
    >
      <div 
        ref={modalRef}
        className={cn(
          'relative w-full bg-white rounded-lg shadow-xl border border-gray-200',
          'max-h-[90dvh] overflow-hidden',
          sizeClasses[size],
          className
        )}
        onClick={(e) => e.stopPropagation()}
        tabIndex={-1}
        {...props}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div className={cn(
            'flex items-center justify-between px-4 py-3',
            'border-b border-gray-100',
            headerClassName
          )}>
            {title && (
              <h2 
                id={titleId}
                className="text-lg font-semibold text-gray-900 truncate"
              >
                {title}
              </h2>
            )}
            
            {showCloseButton && (
              <button 
                type="button"
                onClick={onClose}
                className={cn(
                  'flex items-center justify-center w-10 h-10 -mr-2',
                  'text-gray-500 hover:text-gray-600',
                  'hover:bg-gray-100 rounded-md',
                  'transition-colors duration-200',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
                  !title && 'ml-auto'
                )}
                aria-label="Yopish"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        )}
        
        {/* Content */}
        <div className={cn(
          'px-4 py-4 overflow-y-auto',
          'max-h-[calc(90dvh-60px)]', // Account for smaller header
          contentClassName
        )}>
          {children}
        </div>
      </div>
    </div>
  );

  // Use portal to render modal at document body level
  return typeof document !== 'undefined' 
    ? createPortal(modalContent, document.body)
    : null;
};

// Modal compound components for better composition
const ModalHeader = ({ children, className, ...props }) => (
  <div className={cn('px-6 py-4 border-b border-gray-200', className)} {...props}>
    {children}
  </div>
);

const ModalBody = ({ children, className, ...props }) => (
  <div className={cn('px-6 py-4', className)} {...props}>
    {children}
  </div>
);

const ModalFooter = ({ children, className, ...props }) => (
  <div className={cn(
    'flex items-center justify-end gap-3 px-6 py-4',
    'border-t border-gray-200 bg-gray-50/50',
    className
  )} {...props}>
    {children}
  </div>
);

Modal.Header = ModalHeader;
Modal.Body = ModalBody;
Modal.Footer = ModalFooter;

export default Modal; 