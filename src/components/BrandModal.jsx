import { useState, useEffect } from 'react';
import Button from './ui/Button';
import Input from './forms/Input';
import Modal from './modals/Modal';

const BrandModal = ({ isOpen, onClose, onSave, brand, mode = 'add' }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    logo_url: ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && brand) {
        setFormData({
          name: brand.name || '',
          description: brand.description || '',
          logo_url: brand.logo_url || ''
        });
      } else {
        setFormData({
          name: '',
          description: '',
          logo_url: ''
        });
      }
      setErrors({});
    }
  }, [isOpen, mode, brand]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Brend nomi majburiy';
    }

    if (formData.name.trim().length < 2) {
      newErrors.name = 'Brend nomi kamida 2 belgi bo\'lishi kerak';
    }

    if (formData.name.trim().length > 50) {
      newErrors.name = 'Brend nomi 50 belgidan oshmasligi kerak';
    }

    if (formData.description && formData.description.length > 500) {
      newErrors.description = 'Tavsif 500 belgidan oshmasligi kerak';
    }

    if (formData.logo_url && !isValidUrl(formData.logo_url)) {
      newErrors.logo_url = 'Noto\'g\'ri URL format';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isValidUrl = (string) => {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      await onSave(formData);
    } catch (error) {
      console.error('Error saving brand:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={mode === 'add' ? 'Yangi brend' : 'Brendni tahrirlash'} size="sm">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Brend nomi *
            </label>
            <Input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="Brend nomini kiriting"
              error={errors.name}
              required
              className="text-sm"
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Tavsif
            </label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Brend haqida qisqacha ma'lumot"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:border-blue-400 transition-colors focus:outline-none focus:ring-1 focus:ring-blue-400/30 resize-none"
              rows={2}
            />
            {errors.description && (
              <span className="text-xs text-red-600 mt-0.5 block">{errors.description}</span>
            )}
          </div>

          <div>
            <label htmlFor="logo_url" className="block text-sm font-medium text-gray-700 mb-1">
              Logo URL
            </label>
            <Input
              id="logo_url"
              type="url"
              value={formData.logo_url}
              onChange={(e) => handleInputChange('logo_url', e.target.value)}
              placeholder="https://example.com/logo.png"
              error={errors.logo_url}
              className="text-sm"
            />
          </div>

          <div className="flex gap-2 pt-3">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={loading}
              className="flex-1 text-sm py-2"
            >
              Bekor qilish
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={loading}
              loading={loading}
              className="flex-1 text-sm py-2"
            >
              {mode === 'add' ? 'Qo\'shish' : 'Saqlash'}
            </Button>
          </div>
        </form>
    </Modal>
  );
};

export default BrandModal; 