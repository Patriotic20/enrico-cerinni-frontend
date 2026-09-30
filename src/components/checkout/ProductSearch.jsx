import { Search, SearchX, X, ScanBarcode } from 'lucide-react';
import { useState, useRef, useEffect, useCallback } from 'react';
import VariantSelectionModal from './VariantSelectionModal';
import ProductGrid from './ProductGrid';
import toast from 'react-hot-toast';
import { isBarcode } from '../../utils/barcode';
import { ERROR_MESSAGES } from '../../utils/constants';

export default function ProductSearch({
  searchTerm,
  setSearchTerm,
  searchResults,
  searchLoading,
  isSearchFocused,
  setIsSearchFocused,
  addToCart,
  addManyToCart,
  onBarcodeScan,
  onSearch
}) {
  const [showVariantModal, setShowVariantModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [scannedVariantSku, setScannedVariantSku] = useState(null);
  const [isProcessingBarcode, setIsProcessingBarcode] = useState(false);
  const inputRef = useRef(null);
  const scanTimeoutRef = useRef(null);
  // Auto-focus management for cashier convenience
  useEffect(() => {
    const focusInput = () => {
      if (inputRef.current && !showVariantModal) {
        inputRef.current.focus();
      }
    };

    // Focus on mount
    focusInput();

    // Smart focus management - only refocus if user isn't interacting with other inputs
    const handleGlobalClick = (e) => {
      // Don't refocus if user clicked on an input, textarea, button, or any interactive element
      if (e.target && (
        e.target.tagName === 'INPUT' ||
        e.target.tagName === 'TEXTAREA' ||
        e.target.tagName === 'BUTTON' ||
        e.target.tagName === 'SELECT' ||
        e.target.isContentEditable ||
        e.target.closest('input') ||
        e.target.closest('textarea') ||
        e.target.closest('button') ||
        e.target.closest('select') ||
        e.target.closest('[contenteditable]') ||
        // Don't refocus if clicking inside payment or cart sections
        e.target.closest('[data-no-autofocus]')
      )) {
        return;
      }

      // Only refocus if the current active element is not an input
      const activeElement = document.activeElement;
      if (activeElement && (
        activeElement.tagName === 'INPUT' ||
        activeElement.tagName === 'TEXTAREA' ||
        activeElement.tagName === 'BUTTON' ||
        activeElement.tagName === 'SELECT' ||
        activeElement.isContentEditable
      )) {
        return;
      }

      setTimeout(focusInput, 100);
    };

    // Focus when variant modal closes
    if (!showVariantModal) {
      setTimeout(focusInput, 100);
    }

    // Handle keyboard input for barcode scanning
    const handleGlobalKeyDown = (e) => {
      // Only auto-focus on alphanumeric keys, not on special keys
      if (!/^[a-zA-Z0-9]$/.test(e.key)) {
        return;
      }

      // Don't interfere if user is already typing in an input
      const activeElement = document.activeElement;
      if (activeElement && (
        activeElement.tagName === 'INPUT' ||
        activeElement.tagName === 'TEXTAREA' ||
        activeElement.tagName === 'SELECT' ||
        activeElement.isContentEditable
      )) {
        return;
      }

      // Focus the search input for barcode scanning
      if (inputRef.current && !showVariantModal) {
        inputRef.current.focus();
      }
    };

    document.addEventListener('click', handleGlobalClick);
    document.addEventListener('keydown', handleGlobalKeyDown);
    
    return () => {
      document.removeEventListener('click', handleGlobalClick);
      document.removeEventListener('keydown', handleGlobalKeyDown);
      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current);
      }
    };
  }, [showVariantModal]);

  // Stable so the memoized ProductGrid skips re-rendering on every keystroke.
  const handleAddToCart = useCallback((product, scannedSku = null) => {
    // Safety check - don't proceed if product is null/undefined
    if (!product) {
      console.warn('handleAddToCart called with null/undefined product');
      return;
    }

    if (product && product.variants && product.variants.length > 0) {
      setSelectedProduct(product);
      setScannedVariantSku(scannedSku);
      setShowVariantModal(true);
    } else {
      addToCart(product);
      // Clear search and refocus after adding to cart
      setSearchTerm('');
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 100);
    }
  }, [addToCart, setSearchTerm]);

  // The modal always hands back an array — one cart line per chosen variant.
  const handleVariantSelect = (variantProducts) => {
    const selected = Array.isArray(variantProducts) ? variantProducts : [variantProducts];

    if (addManyToCart) {
      addManyToCart(selected);
    } else {
      selected.forEach(addToCart);
    }

    setShowVariantModal(false);
    // Clear search and refocus after adding variant
    setSearchTerm('');
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 100);
  };

  // A scan miss only means no variant matched the code exactly — the regular
  // search may well list the product just below, so this stays a hint rather
  // than an error, which would contradict the results on screen.
  // Barcode terms skip the debounced text search, so run it here on a miss.
  const notifyScanMiss = (code) => {
    toast(`"${code}" bo'yicha aniq moslik yo'q — ro'yxatdan tanlang`, {
      icon: '🔎',
    });
    onSearch?.(code);
  };

  // Run a barcode scan for the given code. Shared by the debounced input
  // handler and the Enter key handler so a code is only scanned once it's
  // fully entered (hardware scanners burst characters, then send Enter).
  const runBarcodeScan = async (code) => {
    if (!code || isProcessingBarcode) {
      return;
    }

    setIsProcessingBarcode(true);
    try {
      const scannedProduct = await onBarcodeScan(code);
      if (scannedProduct) {
        // Pass the scanned SKU so modal can pre-select the correct variant
        handleAddToCart(scannedProduct, code);
      } else {
        // Keep the typed code: the exact-SKU lookup missed it, but the regular
        // search below may still match, so the dropdown stays useful. Clearing
        // here used to wipe the input with no explanation.
        notifyScanMiss(code);
      }
    } catch (error) {
      console.error('Barcode scan error:', error?.message);
      if (error?.message === ERROR_MESSAGES.PRODUCT_OUT_OF_STOCK) toast.error(error.message);
      else notifyScanMiss(code);
      setSelectedProduct(null);
      setScannedVariantSku(null);
      setShowVariantModal(false);
    } finally {
      setIsProcessingBarcode(false);
      // Ensure input stays focused for the next scan
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 100);
    }
  };

  // Handle barcode scanning directly in the search input.
  // Debounce the scan so it fires once the full code is entered, not on every
  // keystroke — otherwise a code longer than 8 chars scans a truncated prefix.
  const handleInputChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);

    if (scanTimeoutRef.current) {
      clearTimeout(scanTimeoutRef.current);
    }

    const trimmed = value.trim();
    if (isBarcode(trimmed)) {
      scanTimeoutRef.current = setTimeout(() => {
        runBarcodeScan(trimmed);
      }, 120);
    }
  };

  const handleKeyPress = async (e) => {
    if (e.key === 'Enter' && searchTerm.trim()) {
      e.preventDefault();

      // Enter ends a scan early — cancel the pending debounced scan
      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current);
      }

      const trimmed = searchTerm.trim();
      if (isBarcode(trimmed)) {
        await runBarcodeScan(trimmed);
      } else if (searchResults.length > 0) {
        // If not a barcode but we have search results, add first result
        handleAddToCart(searchResults[0]);
      }
    }
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
      <div className="relative shrink-0">
        <Search size={22} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          autoComplete="off"
          placeholder="Mahsulot nomi, SKU yoki shtrix-kod..."
          aria-label="Mahsulot qidirish"
          value={searchTerm}
          onChange={handleInputChange}
          onKeyDown={handleKeyPress}
          onFocus={() => setIsSearchFocused(true)}
          onBlur={() => setIsSearchFocused(false)}
          className="w-full h-14 pl-12 pr-36 text-lg rounded-xl border-2 border-gray-200 bg-gray-50 placeholder:text-gray-400 focus:border-blue-500 focus:bg-white outline-none transition-colors"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
          {isProcessingBarcode || searchLoading ? (
            <span className="flex items-center gap-2 px-3 text-sm text-blue-600">
              <span className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              Qidirilmoqda
            </span>
          ) : searchTerm ? (
            <button
              type="button"
              aria-label="Tozalash"
              onClick={() => { setSearchTerm(''); inputRef.current?.focus(); }}
              className="w-10 h-10 flex items-center justify-center rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100"
            >
              <X size={20} />
            </button>
          ) : (
            <span className="hidden sm:flex items-center gap-1.5 px-3 h-9 rounded-lg bg-white border border-gray-200 text-xs text-gray-500">
              <ScanBarcode size={16} /> Skaner tayyor
            </span>
          )}
        </div>
      </div>

      {/* Kept mounted while a new search loads so scroll and chip survive */}
      {searchResults.length > 0 && (
        <ProductGrid
          products={searchResults}
          title={searchTerm.trim() ? 'Natijalar' : 'Barchasi'}
          onAdd={handleAddToCart}
          dimmed={searchLoading}
        />
      )}

      {!searchLoading && searchTerm.trim() && searchResults.length === 0 && (
        <div className="mt-4 flex flex-col items-center py-8 text-center">
          <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mb-3">
            <SearchX size={26} className="text-gray-500" />
          </div>
          <p className="m-0 text-base font-medium text-gray-700">Mahsulot topilmadi</p>
          <p className="m-0 text-sm text-gray-500 mt-1">Boshqa nom yoki kod bilan urinib ko'ring</p>
        </div>
      )}

      <VariantSelectionModal
        isOpen={showVariantModal}
        onClose={() => {
          setShowVariantModal(false);
          setScannedVariantSku(null);
          // Clear search input if no variant was selected
          setSearchTerm('');
          setTimeout(() => {
            if (inputRef.current) {
              inputRef.current.focus();
            }
          }, 100);
        }}
        product={selectedProduct}
        scannedVariantSku={scannedVariantSku}
        onVariantSelect={handleVariantSelect}
      />
    </div>
  );
}
