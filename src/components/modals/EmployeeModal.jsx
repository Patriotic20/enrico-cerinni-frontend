import { useState, useEffect } from 'react';
import { Users, DollarSign, Calendar, Phone, Mail, Target, Percent, KeyRound } from 'lucide-react';
import { getApiErrorMessage } from '../../utils/api';
import { financeAPI } from '../../api/finance';
import Modal from './Modal';
import toast from 'react-hot-toast';
import MoneyInput from '../ui/MoneyInput';

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
    is_seller: true,
    commission_rate: '',
    monthly_target: '',
    pin: '',
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
        is_seller: employee.is_seller ?? true,
        commission_rate: employee.commission_rate ? String(employee.commission_rate) : '',
        monthly_target: employee.monthly_target ? String(employee.monthly_target) : '',
        pin: '',
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
        is_seller: true,
        commission_rate: '',
        monthly_target: '',
        pin: '',
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

    const rate = parseFloat(formData.commission_rate || 0);
    if (rate < 0 || rate > 100) {
      newErrors.commission_rate = '0 dan 100 gacha';
    }

    if (parseFloat(formData.monthly_target || 0) < 0) {
      newErrors.monthly_target = 'Manfiy bo\'lmasin';
    }

    if (formData.pin && !/^\d{4,6}$/.test(formData.pin)) {
      newErrors.pin = '4–6 ta raqam';
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
        is_seller: formData.is_seller,
        commission_rate: formData.is_seller ? parseFloat(formData.commission_rate || 0) : 0,
        monthly_target: formData.is_seller ? parseFloat(formData.monthly_target || 0) : 0,
        // Only sent when typed: an empty field keeps the current PIN.
        ...(formData.is_seller && formData.pin ? { pin: formData.pin } : {}),
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
      toast.error(getApiErrorMessage(error, 'Xodimni saqlashda xatolik yuz berdi'));
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
            <MoneyInput
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

        {/* Seller KPI settings: only sellers are offered at checkout. */}
        <div className="rounded-lg border border-gray-200 p-3 space-y-3">
          <label className="flex items-center gap-2 text-sm font-medium text-gray-800 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.is_seller}
              onChange={(e) => handleInputChange('is_seller', e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            Sotuvchi
            <span className="text-xs font-normal text-gray-500">— kassada tanlanadi, KPI hisoblanadi</span>
          </label>
          {formData.is_seller && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="commission_rate" className="flex items-center gap-1.5 text-xs font-medium text-gray-700 mb-1">
                  <Percent size={14} className="text-green-500" />
                  Komissiya, %
                </label>
                <input
                  type="number"
                  id="commission_rate"
                  value={formData.commission_rate}
                  onChange={(e) => handleInputChange('commission_rate', e.target.value)}
                  placeholder="0"
                  min="0"
                  max="100"
                  step="0.1"
                  className={`w-full px-2.5 py-1.5 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-blue-500/30 focus:border-blue-500 transition-colors ${
                    errors.commission_rate ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                />
                {errors.commission_rate && <span className="text-red-600 text-xs mt-0.5 block">{errors.commission_rate}</span>}
              </div>
              <div>
                <label htmlFor="monthly_target" className="flex items-center gap-1.5 text-xs font-medium text-gray-700 mb-1">
                  <Target size={14} className="text-orange-500" />
                  Oylik reja (so'm)
                </label>
                <MoneyInput
                  id="monthly_target"
                  value={formData.monthly_target}
                  onChange={(e) => handleInputChange('monthly_target', e.target.value)}
                  placeholder="0 — rejasiz"
                  min="0"
                  step="1000"
                  className={`w-full px-2.5 py-1.5 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-blue-500/30 focus:border-blue-500 transition-colors ${
                    errors.monthly_target ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                />
                {errors.monthly_target && <span className="text-red-600 text-xs mt-0.5 block">{errors.monthly_target}</span>}
              </div>
              <div className="col-span-2">
                <label htmlFor="pin" className="flex items-center gap-1.5 text-xs font-medium text-gray-700 mb-1">
                  <KeyRound size={14} className="text-blue-500" />
                  Mobil ilova PIN (/m)
                </label>
                <input
                  type="password"
                  id="pin"
                  inputMode="numeric"
                  autoComplete="new-password"
                  maxLength={6}
                  value={formData.pin}
                  onChange={(e) => handleInputChange('pin', e.target.value.replace(/\D/g, ''))}
                  placeholder={employee ? "Bo'sh — o'zgarmaydi" : '4–6 raqam, ixtiyoriy'}
                  className={`w-full px-2.5 py-1.5 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-blue-500/30 focus:border-blue-500 transition-colors ${
                    errors.pin ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                />
                {errors.pin
                  ? <span className="text-red-600 text-xs mt-0.5 block">{errors.pin}</span>
                  : <span className="text-gray-500 text-xs mt-0.5 block">Sotuvchi telefon raqami + shu PIN bilan kiradi</span>}
              </div>
            </div>
          )}
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