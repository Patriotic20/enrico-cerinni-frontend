import { useState, useEffect } from 'react';
import { X, Users, DollarSign, Calendar, Phone, Mail } from 'lucide-react';
import { financeAPI } from '../../api/finance';
import Modal from './Modal';
import toast from 'react-hot-toast';

const EmployeeModal = ({ isOpen, onClose, employee = null, onSuccess }) => {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    position: '',
    phone: '',
    email: '',
    salary: '',
    hire_date: new Date().toISOString().split('T')[0],
    is_active: true,
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (employee) {
      setFormData({
        first_name: employee.first_name || '',
        last_name: employee.last_name || '',
        position: employee.position || '',
        phone: employee.phone || '',
        email: employee.email || '',
        salary: employee.salary || '',
        hire_date: employee.hire_date ? new Date(employee.hire_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        is_active: employee.is_active ?? true,
      });
    } else {
      setFormData({
        first_name: '',
        last_name: '',
        position: '',
        phone: '',
        email: '',
        salary: '',
        hire_date: new Date().toISOString().split('T')[0],
        is_active: true,
      });
    }
    setErrors({});
  }, [employee, isOpen]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.first_name.trim()) {
      newErrors.first_name = 'Xodim ismi kiritilishi shart';
    }

    if (!formData.last_name.trim()) {
      newErrors.last_name = 'Familiya kiritilishi shart';
    }

    if (!formData.position.trim()) {
      newErrors.position = 'Lavozim kiritilishi shart';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Telefon raqami kiritilishi shart';
    }

    if (!formData.salary || parseFloat(formData.salary) <= 0) {
      newErrors.salary = 'To\'g\'ri ish haqi kiriting';
    }

    if (!formData.hire_date) {
      newErrors.hire_date = 'Ishga qabul qilish sanasi kiritilishi shart';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'To\'g\'ri email manzilini kiriting';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);

      // Format data for API
      const apiData = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        position: formData.position,
        phone: formData.phone || null,
        email: formData.email || null,
        salary: parseFloat(formData.salary),
        hire_date: new Date(formData.hire_date).toISOString(),
        is_active: formData.is_active,
      };

      if (employee) {
        await financeAPI.updateEmployee(employee.id, apiData);
        toast.success('Xodim muvaffaqiyatli yangilandi');
      } else {
        await financeAPI.createEmployee(apiData);
        toast.success('Xodim muvaffaqiyatli qo\'shildi');
      }

      onSuccess();
    } catch (error) {
      console.error('Error saving employee:', error);
      toast.error('Xodimni saqlashda xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={employee ? 'Xodimni tahrirlash' : 'Yangi xodim qo\'shish'}
      size="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="first_name" className="flex items-center gap-1.5 text-xs font-medium text-gray-700 mb-1">
              <Users size={14} className="text-blue-500" />
              Ism *
            </label>
            <input
              type="text"
              id="first_name"
              value={formData.first_name}
              onChange={(e) => handleInputChange('first_name', e.target.value)}
              placeholder="Ism"
              className={`w-full px-2.5 py-1.5 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-blue-500/30 focus:border-blue-500 transition-colors ${
                errors.first_name ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
            />
            {errors.first_name && <span className="text-red-600 text-xs mt-0.5 block">{errors.first_name}</span>}
          </div>

          <div>
            <label htmlFor="last_name" className="flex items-center gap-1.5 text-xs font-medium text-gray-700 mb-1">
              <Users size={14} className="text-blue-500" />
              Familiya *
            </label>
            <input
              type="text"
              id="last_name"
              value={formData.last_name}
              onChange={(e) => handleInputChange('last_name', e.target.value)}
              placeholder="Familiya"
              className={`w-full px-2.5 py-1.5 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-blue-500/30 focus:border-blue-500 transition-colors ${
                errors.last_name ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
            />
            {errors.last_name && <span className="text-red-600 text-xs mt-0.5 block">{errors.last_name}</span>}
          </div>
        </div>

        <div>
          <label htmlFor="position" className="block text-xs font-medium text-gray-700 mb-1">
            Lavozim *
          </label>
          <input
            type="text"
            id="position"
            value={formData.position}
            onChange={(e) => handleInputChange('position', e.target.value)}
            placeholder="Masalan: Do'kon menejeri"
            className={`w-full px-2.5 py-1.5 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-blue-500/30 focus:border-blue-500 transition-colors ${
              errors.position ? 'border-red-300 bg-red-50' : 'border-gray-300'
            }`}
          />
          {errors.position && <span className="text-red-600 text-xs mt-0.5 block">{errors.position}</span>}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="phone" className="flex items-center gap-1.5 text-xs font-medium text-gray-700 mb-1">
              <Phone size={14} className="text-green-500" />
              Telefon *
            </label>
            <input
              type="tel"
              id="phone"
              value={formData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              placeholder="+998 XX XXX XX XX"
              className={`w-full px-2.5 py-1.5 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-blue-500/30 focus:border-blue-500 transition-colors ${
                errors.phone ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
            />
            {errors.phone && <span className="text-red-600 text-xs mt-0.5 block">{errors.phone}</span>}
          </div>

          <div>
            <label htmlFor="email" className="flex items-center gap-1.5 text-xs font-medium text-gray-700 mb-1">
              <Mail size={14} className="text-purple-500" />
              Email
            </label>
            <input
              type="email"
              id="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              placeholder="example@email.com"
              className={`w-full px-2.5 py-1.5 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-blue-500/30 focus:border-blue-500 transition-colors ${
                errors.email ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
            />
            {errors.email && <span className="text-red-600 text-xs mt-0.5 block">{errors.email}</span>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="salary" className="flex items-center gap-1.5 text-xs font-medium text-gray-700 mb-1">
              <DollarSign size={14} className="text-green-500" />
              Ish haqi *
            </label>
            <input
              type="number"
              id="salary"
              value={formData.salary}
              onChange={(e) => handleInputChange('salary', e.target.value)}
              placeholder="0"
              min="0"
              step="0.01"
              className={`w-full px-2.5 py-1.5 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-blue-500/30 focus:border-blue-500 transition-colors ${
                errors.salary ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
            />
            {errors.salary && <span className="text-red-600 text-xs mt-0.5 block">{errors.salary}</span>}
          </div>

          <div>
            <label htmlFor="hireDate" className="flex items-center gap-1.5 text-xs font-medium text-gray-700 mb-1">
              <Calendar size={14} className="text-orange-500" />
              Ishga kirgan sana *
            </label>
            <input
              type="date"
              id="hireDate"
              value={formData.hire_date}
              onChange={(e) => handleInputChange('hire_date', e.target.value)}
              className={`w-full px-2.5 py-1.5 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-blue-500/30 focus:border-blue-500 transition-colors ${
                errors.hire_date ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
            />
            {errors.hire_date && <span className="text-red-600 text-xs mt-0.5 block">{errors.hire_date}</span>}
          </div>
        </div>

        <div>
          <label htmlFor="status" className="block text-xs font-medium text-gray-700 mb-1">
            Holat
          </label>
          <select
            id="status"
            value={formData.is_active ? 'active' : 'inactive'}
            onChange={(e) => handleInputChange('is_active', e.target.value === 'active')}
            className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500/30 focus:border-blue-500 transition-colors"
          >
            <option value="active">Faol</option>
            <option value="inactive">Faol emas</option>
          </select>
        </div>

        <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-200">
          <button
            type="button"
            className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-gray-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={onClose}
            disabled={loading}
          >
            Bekor qilish
          </button>
          <button
            type="submit"
            className="px-3 py-1.5 text-xs font-medium text-white bg-blue-500 border border-transparent rounded hover:bg-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={loading}
          >
            {loading ? 'Saqlanmoqda...' : (employee ? 'Yangilash' : 'Qo\'shish')}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default EmployeeModal; 