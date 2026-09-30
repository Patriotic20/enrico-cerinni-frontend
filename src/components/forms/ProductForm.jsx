import { useState, useEffect } from 'react';
import { Scan, Package, Tag, Hash, FileText, Calendar, Zap } from 'lucide-react';
import Button from '../ui/Button';
import Modal from '../modals/Modal';
import toast from 'react-hot-toast';

// Module-level so it keeps its typed input across ProductForm re-renders.
const SKUScanner = ({ isOpen, onClose, onScan }) => {
  const [scannedCode, setScannedCode] = useState('');

  // Start each opening with an empty field.
  useEffect(() => {
    if (isOpen) setScannedCode('');
  }, [isOpen]);

  const handleScanSubmit = (e) => {
    e.preventDefault();
    if (scannedCode.trim()) {
      onScan(scannedCode.trim());
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="SKU Kodini Kiriting" size="md">
      <form onSubmit={handleScanSubmit} className="space-y-4">
        <input
          type="text"
          value={scannedCode}
          onChange={(e) => setScannedCode(e.target.value)}
          placeholder="SKU kodini kiriting..."
          aria-label="SKU kodi"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
          autoFocus
        />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={onClose}>
            Bekor qilish
          </Button>
          <Button type="submit" variant="primary" size="sm">
            Qo'shish
          </Button>
        </div>
      </form>
    </Modal>
  );
};

const ProductForm = ({ product, brands, categories, seasons, onSubmit, onCancel, loading = false }) => {
  const [formData, setFormData] = useState({
    name: '',
    brand_id: '',
    category_id: '',
    season_id: '',
    sku: '',
    description: ''
  });

  const [showScanner, setShowScanner] = useState(false);

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || '',
        brand_id: product.brand_id || '',
        category_id: product.category_id || '',
        season_id: product.season_id || '',
        sku: product.sku || '',
        description: product.description || ''
      });
    } else {
      setFormData({
        name: '',
        brand_id: '',
        category_id: '',
        season_id: '',
        sku: '',
        description: ''
      });
    }
  }, [product, brands, seasons]);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('Mahsulot nomi talab qilinadi');
      return;
    }
    if (!formData.brand_id) {
      toast.error('Brend tanlash talab qilinadi');
      return;
    }
    if (!formData.category_id) {
      toast.error('Kategoriya tanlash talab qilinadi');
      return;
    }
    if (!formData.season_id) {
      toast.error('Fasl tanlash talab qilinadi');
      return;
    }

    onSubmit(formData);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleScanSKU = (scannedSKU) => {
    setFormData(prev => ({
      ...prev,
      sku: scannedSKU
    }));
    setShowScanner(false);
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 border border-green-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-green-600 rounded-lg flex items-center justify-center shadow-md">
              <Package size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{product ? 'Mahsulotni tahrirlash' : 'Yangi mahsulot qo\'shish'}</h2>
              <p className="text-sm text-gray-600">Mahsulot ma'lumotlarini to'ldiring</p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {/* Product Name - Full Width */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <Package size={16} />
              <span>Mahsulot nomi *</span>
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
              required
              disabled={loading}
              placeholder="Mahsulot nomini kiriting..."
            />
          </div>

          {/* Brand, Category, Season - 3 columns */}
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Tag size={16} />
                <span>Brend *</span>
              </label>
              <select
                name="brand_id"
                value={formData.brand_id}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                required
                disabled={loading}
              >
                <option value="">Tanlang</option>
                {brands?.map(brand => (
                  <option key={brand.id} value={brand.id}>
                    {brand.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Zap size={16} />
                <span>Kategoriya *</span>
              </label>
              <select
                name="category_id"
                value={formData.category_id}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                required
                disabled={loading}
              >
                <option value="">Tanlang</option>
                {categories?.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Calendar size={16} />
                <span>Fasl *</span>
              </label>
              <select
                name="season_id"
                value={formData.season_id}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                required
                disabled={loading}
              >
                <option value="">Tanlang</option>
                {seasons?.map(season => (
                  <option key={season.id} value={season.id}>
                    {season.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* SKU - Full Width */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <Hash size={16} />
              <span>SKU</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                name="sku"
                value={formData.sku}
                onChange={handleChange}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                placeholder="SKU kodini kiriting..."
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowScanner(true)}
                className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 transition-all duration-200"
                disabled={loading}
                title="SKU skanerlash"
              >
                <Scan size={16} />
              </button>
            </div>
          </div>

          {/* Description - Full Width */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <FileText size={16} />
              <span>Tavsif</span>
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
              rows="3"
              placeholder="Mahsulot haqida qisqacha ma'lumot..."
              disabled={loading}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <Button 
            type="button" 
            variant="secondary" 
            onClick={onCancel}
            disabled={loading}
            size="sm"
          >
            Bekor qilish
          </Button>
          <Button 
            type="submit"
            loading={loading}
            size="sm"
          >
            {product ? 'Yangilash' : 'Qo\'shish'}
          </Button>
        </div>
      </form>

      <SKUScanner
        isOpen={showScanner}
        onClose={() => setShowScanner(false)}
        onScan={handleScanSKU}
      />
    </>
  );
};

export default ProductForm; 