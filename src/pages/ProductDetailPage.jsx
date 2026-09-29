import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, Trash2, AlertCircle } from 'lucide-react';
import Button from '../components/ui/Button';
import Modal from '../components/modals/Modal';
import ProductForm from '../components/forms/ProductForm';
import ProductVariants from '../components/inventory/ProductVariants';
import VariantCreationModal from '../components/modals/VariantCreationModal';
import { useProductDetail } from '../hooks';
import { useConfirm } from '../contexts/ConfirmContext';
import toast from 'react-hot-toast';
import { formatNumber } from '../utils/format';
import { summarizeVariants } from '../utils/stock';

const TONES = {
  red: 'text-red-600',
  amber: 'text-amber-600',
  green: 'text-green-600',
};

const Stat = ({ label, value, hint, tone }) => (
  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 min-w-0">
    <div className="text-xs text-gray-500">{label}</div>
    <div className={`text-lg font-semibold tabular-nums truncate ${TONES[tone] || 'text-gray-900'}`}>{value}</div>
    {hint && <div className="text-xs text-gray-500 truncate">{hint}</div>}
  </div>
);

export default function ProductDetailPage() {
  const params = useParams();
  const navigate = useNavigate();
  const [showEditModal, setShowEditModal] = useState(false);
  const [showVariantModal, setShowVariantModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const confirm = useConfirm();

  const { 
    product, 
    brands, 
    seasons,
    categories,
    variants,
    variantsLoading,
    loading, 
    error, 
    updateProduct, 
    deleteProduct,
    updateVariant,
    deleteVariant,
    loadVariants
  } = useProductDetail(params.id);

  const handleEditProduct = async (productData) => {
    const result = await updateProduct(productData);
    if (result.success) {
      setShowEditModal(false);
    } else {
      toast.error(result.error || 'Mahsulot yangilanmadi');
    }
  };

  const handleDeleteProduct = async () => {
    const confirmed = await confirm({
      title: 'Mahsulotni o\'chirish',
      message: 'Bu mahsulotni o\'chirishni xohlaysizmi?',
      description: 'Mahsulot va uning barcha variantlari o\'chiriladi. Bu amalni qaytarib bo\'lmaydi.',
      confirmText: 'Ha, o\'chirish',
      variant: 'danger',
    });
    if (!confirmed) return;

    setIsDeleting(true);
    const result = await deleteProduct();
    setIsDeleting(false);
    
    if (result.success) {
      navigate('/inventory');
    } else {
      toast.error(result.error || 'Mahsulot o\'chirilmadi');
    }
  };

  const handleVariantCreated = () => {
    // Reload variants after creation
    loadVariants(params.id);
  };

  if (loading) {
    return (
        <div className="flex items-center justify-center min-h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="ml-3">Mahsulot ma'lumotlari yuklanmoqda...</p>
        </div>
    );
  }

  if (error || !product) {
    return (
        <div className="flex flex-col items-center justify-center min-h-64 space-y-4">
          <AlertCircle size={48} className="text-red-500" />
          <h2 className="text-xl font-semibold text-gray-900">Mahsulot topilmadi</h2>
          <p className="text-gray-600 text-center">{error || 'Siz qidirayotgan mahsulot mavjud emas yoki o\'chirilgan'}</p>
          <Button onClick={() => navigate('/inventory')}>
            <ArrowLeft size={16} />
            Inventar sahifasiga qaytish
          </Button>
        </div>
    );
  }

  const { total, count, low, out } = summarizeVariants(variants);
  const prices = variants.map(v => Number(v.price));
  const minPrice = prices.length ? Math.round(Math.min(...prices)) : 0;
  const maxPrice = prices.length ? Math.round(Math.max(...prices)) : 0;
  const retailValue = variants.reduce((sum, v) => sum + Number(v.price) * v.stock_quantity, 0);
  const costValue = variants.reduce((sum, v) => sum + Number(v.cost_price || 0) * v.stock_quantity, 0);
  const hasCost = variants.some(v => v.cost_price != null);
  const meta = [product.brand_name, product.category_name, product.season_name].filter(Boolean);

  return (
      <div className="space-y-4">
        {/* Header */}
        <div>
          <button
            onClick={() => navigate('/inventory')}
            className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 mb-2"
          >
            <ArrowLeft size={16} /> Inventar
          </button>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-2xl font-bold text-gray-900 m-0">{product.name}</h1>
              <p className="text-sm text-gray-500 m-0 mt-1">
                <span className="font-mono">{product.sku}</span>
                {meta.map(item => <span key={item}> · {item}</span>)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={() => setShowEditModal(true)}>
                <Edit size={16} className="mr-1" />
                Tahrirlash
              </Button>
              <Button variant="danger" size="sm" onClick={handleDeleteProduct} disabled={isDeleting}>
                <Trash2 size={16} className="mr-1" />
                {isDeleting ? 'O\'chirilmoqda...' : 'O\'chirish'}
              </Button>
            </div>
          </div>
        </div>

        {/* Key numbers */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Stat label="Jami zapas" value={`${formatNumber(total)} dona`} hint={`${count} variant`} />
          <Stat
            label="Diqqat talab"
            value={out + low === 0 ? 'Hammasi joyida' : `${out + low} variant`}
            hint={out + low === 0 ? 'Kam qolgan variant yo\'q' : `${out} tugagan · ${low} kam`}
            tone={out > 0 ? 'red' : low > 0 ? 'amber' : 'green'}
          />
          <Stat
            label="Narx (UZS)"
            value={minPrice === maxPrice ? formatNumber(minPrice) : `${formatNumber(minPrice)} – ${formatNumber(maxPrice)}`}
            hint={minPrice === maxPrice ? 'Barcha variantlarda bir xil' : 'Eng arzon – eng qimmat'}
          />
          <Stat
            label="Ombor qiymati (UZS)"
            value={formatNumber(Math.round(retailValue))}
            hint={hasCost ? `Tannarx bo'yicha: ${formatNumber(Math.round(costValue))}` : 'Sotuv narxida'}
          />
        </div>

        <ProductVariants
          variants={variants}
          loading={variantsLoading}
          onUpdateVariant={updateVariant}
          onDeleteVariant={deleteVariant}
          onAddVariant={() => setShowVariantModal(true)}
        />

        {/* Description + record info */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          {product.description && (
            <>
              <h3 className="text-sm font-semibold text-gray-900 mb-1">Tavsif</h3>
              <p className="text-sm text-gray-700 leading-relaxed mb-3">{product.description}</p>
            </>
          )}
          <p className="text-xs text-gray-500 m-0">
            ID {product.id} · Yaratilgan {new Date(product.created_at).toLocaleDateString('uz-UZ')}
            {product.updated_at && <> · Yangilangan {new Date(product.updated_at).toLocaleDateString('uz-UZ')}</>}
          </p>
        </div>

        {/* Edit Product Modal */}
        <Modal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          title="Mahsulotni tahrirlash"
        >
          <ProductForm
            product={product}
            brands={brands || []}
            seasons={seasons || []}
            categories={categories || []}
            onSubmit={handleEditProduct}
            onCancel={() => setShowEditModal(false)}
          />
        </Modal>

        {/* Variant Creation Modal */}
        <VariantCreationModal
          isOpen={showVariantModal}
          onClose={() => setShowVariantModal(false)}
          product={product}
          onVariantCreated={handleVariantCreated}
        />
      </div>
  );
} 