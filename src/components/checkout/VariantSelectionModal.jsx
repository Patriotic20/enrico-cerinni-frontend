import { useState, useEffect } from 'react';
import { Check } from 'lucide-react';
import Modal from '../modals/Modal';
import Button from '../ui/Button';

/**
 * Variant picker for the checkout flow.
 *
 * Several variants can be selected at once — each confirmed variant becomes its
 * own cart line. `onVariantSelect` therefore always receives an array, even for
 * a single pick.
 */
export default function VariantSelectionModal({
  isOpen,
  onClose,
  product,
  onVariantSelect,
  scannedVariantSku = null,
  loading = false
}) {
  const [selectedIds, setSelectedIds] = useState([]);

  const getAvailableVariants = () => {
    if (!product || !product.variants) {
      return [];
    }
    return product.variants.filter(variant => variant.stock_quantity > 0);
  };

  const availableVariants = getAvailableVariants();

  // Pre-select the scanned variant when the modal opens; reset on close.
  useEffect(() => {
    if (isOpen && scannedVariantSku && product?.variants) {
      const scannedVariant = product.variants.find(variant =>
        variant.sku && variant.sku.toLowerCase() === scannedVariantSku.toLowerCase()
      );
      if (scannedVariant) {
        setSelectedIds([scannedVariant.id]);
      }
    } else if (!isOpen) {
      setSelectedIds([]);
    }
  }, [isOpen, scannedVariantSku, product]);

  // Don't render if product is null or doesn't have variants
  if (!product || !product.variants || product.variants.length === 0) {
    return (
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Variant tanlash"
        size="lg"
      >
        <div className="text-center py-8">
          <p className="text-gray-500">Mahsulot ma'lumotlari topilmadi.</p>
        </div>
      </Modal>
    );
  }

  const isSelected = (variant) => selectedIds.includes(variant.id);
  const allSelected = availableVariants.length > 0 && selectedIds.length === availableVariants.length;

  const toggleVariant = (variant) => {
    setSelectedIds(current =>
      current.includes(variant.id)
        ? current.filter(id => id !== variant.id)
        : [...current, variant.id]
    );
  };

  const toggleAll = () => {
    setSelectedIds(allSelected ? [] : availableVariants.map(variant => variant.id));
  };

  const handleConfirm = () => {
    if (selectedIds.length === 0) {
      return;
    }

    // Keep the on-screen order rather than the order the user clicked in.
    const variantProducts = availableVariants
      .filter(variant => selectedIds.includes(variant.id))
      .map(variant => ({
        ...product,
        id: variant.id,
        price: variant.price,
        stock_quantity: variant.stock_quantity,
        sku: variant.sku,
        color_name: variant.color_name,
        size_name: variant.size_name,
        variant_id: variant.id
      }));

    onVariantSelect(variantProducts);
    onClose();
  };

  const getColorVariants = () => {
    const colorGroups = {};

    availableVariants.forEach(variant => {
      const colorName = variant.color_name || 'Noma\'lum';
      if (!colorGroups[colorName]) {
        colorGroups[colorName] = [];
      }
      colorGroups[colorName].push(variant);
    });

    return colorGroups;
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${product?.name} - Variant tanlash`}
      size="lg"
    >
      <div className="space-y-4">
        {/* Product Info */}
        <div className="text-center bg-gray-50 rounded-lg p-2 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{product?.name}</h3>
          <p className="text-sm text-gray-600">
            {product?.brand_name} • {product?.season_name}
          </p>
        </div>

        {/* Selection summary */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">
            {selectedIds.length > 0
              ? `${selectedIds.length} ta variant tanlandi`
              : 'Bir nechta variantni tanlash mumkin'}
          </p>
          <button
            type="button"
            onClick={toggleAll}
            disabled={loading || availableVariants.length === 0}
            className="text-sm font-medium text-blue-600 hover:text-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {allSelected ? 'Tanlovni tozalash' : 'Hammasini tanlash'}
          </button>
        </div>

        {/* Variants */}
        <div className="space-y-4">
          {Object.entries(getColorVariants()).map(([colorName, variants]) => (
            <div key={colorName} className="space-y-2">
              <h4 className="text-sm font-semibold text-gray-900 border-b border-gray-200 pb-2">{colorName}</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {variants.map(variant => (
                  <button
                    key={variant.id}
                    type="button"
                    aria-pressed={isSelected(variant)}
                    className={`relative p-2 border-2 rounded-lg text-left transition-all duration-200 ${
                      isSelected(variant)
                        ? 'border-blue-500 bg-gradient-to-r from-blue-50 to-blue-100 shadow-md'
                        : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                    } ${variant.stock_quantity <= 0 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    onClick={() => toggleVariant(variant)}
                    disabled={variant.stock_quantity <= 0 || loading}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-sm font-semibold text-gray-900">{variant.size_name}</span>
                      <span className="text-sm font-bold text-green-600">{variant.price} UZS</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-500">
                        {variant.stock_quantity} dona
                      </span>
                      {isSelected(variant) && (
                        <Check size={16} className="text-blue-600" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t border-gray-200">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={loading}
            fullWidth
          >
            Bekor qilish
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={selectedIds.length === 0 || loading}
            loading={loading}
            fullWidth
          >
            {selectedIds.length > 1 ? `Tanlash (${selectedIds.length})` : 'Tanlash'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
