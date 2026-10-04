import { useState, useEffect } from 'react';
import { Check } from 'lucide-react';
import Modal from '../modals/Modal';
import { formatCurrency, productTitle } from '../../utils/format';

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
    } else if (isOpen && product?.variants) {
      // Only one in stock — nothing to choose, just confirm.
      const inStock = product.variants.filter(v => v.stock_quantity > 0);
      if (inStock.length === 1) setSelectedIds([inStock[0].id]);
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
        name: productTitle(product),
        id: variant.id,
        price: variant.price,
        stock_quantity: variant.stock_quantity,
        sku: variant.sku,
        color_name: variant.color_name,
        color_hex: variant.color_hex,
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

    // Sizes in order (48, 50, 52) so the eye finds the right one fast.
    Object.values(colorGroups).forEach(group =>
      group.sort((a, b) => String(a.size_name).localeCompare(String(b.size_name), undefined, { numeric: true }))
    );
    return colorGroups;
  };

  const selectedTotal = availableVariants
    .filter(variant => selectedIds.includes(variant.id))
    .reduce((sum, variant) => sum + (Number(variant.price) || 0), 0);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={productTitle(product)}
      size="xl"
    >
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-3">
          <p className="m-0 text-base text-gray-600">
            {[product?.brand_name, product?.season_name].filter(Boolean).join(' · ') || "O'lcham tanlang"}
          </p>
          <button
            type="button"
            onClick={toggleAll}
            disabled={loading || availableVariants.length === 0}
            className="h-11 px-4 rounded-lg text-base font-medium text-blue-600 hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {allSelected ? 'Tozalash' : 'Hammasini tanlash'}
          </button>
        </div>

        {availableVariants.length === 0 && (
          <p className="m-0 py-8 text-center text-base text-gray-500">Barcha variantlar tugagan</p>
        )}

        {Object.entries(getColorVariants()).map(([colorName, variants]) => (
          <div key={colorName} className="space-y-2.5">
            <h4 className="m-0 flex items-center gap-2 text-base font-semibold text-gray-900">
              <span
                className="w-5 h-5 rounded-full border border-gray-300"
                style={{ backgroundColor: variants[0].color_hex || '#e5e7eb' }}
              />
              {colorName}
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {variants.map(variant => {
                const selected = isSelected(variant);
                return (
                  <button
                    key={variant.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => toggleVariant(variant)}
                    disabled={loading}
                    className={`relative min-h-[92px] p-3 rounded-xl border-2 text-left transition-colors ${
                      selected
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {selected && (
                      <span className="absolute top-2 right-2 w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center">
                        <Check size={16} />
                      </span>
                    )}
                    <span className="block text-2xl font-bold text-gray-900">{variant.size_name || '—'}</span>
                    <span className="block mt-1 text-sm font-semibold text-gray-800 tabular-nums">{formatCurrency(Number(variant.price) || 0)}</span>
                    <span className={`block text-xs ${variant.stock_quantity <= 2 ? 'text-amber-600' : 'text-gray-500'}`}>
                      {variant.stock_quantity} dona qoldi
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        <div className="grid grid-cols-[1fr_2fr] gap-3 pt-4 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="h-14 rounded-xl border-2 border-gray-200 bg-white text-base font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Bekor qilish
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={selectedIds.length === 0 || loading}
            className="h-14 px-3 rounded-xl bg-blue-600 text-white text-lg font-bold hover:bg-blue-700 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed truncate"
          >
            {selectedIds.length === 0
              ? "O'lcham tanlang"
              : `Savatga qo'shish (${selectedIds.length}) · ${formatCurrency(selectedTotal)}`}
          </button>
        </div>
      </div>
    </Modal>
  );
}
