import { useState, useEffect } from 'react';
import Modal from './Modal';
import Button from '../ui/Button';
import Input from '../forms/Input';
import { AlertCircle, DollarSign, Search, User } from 'lucide-react';
import { clientsAPI } from '../../api/clients';

export default function AddDebtModal({ isOpen, onClose, onAdded }) {
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) loadClients();
  }, [isOpen]);

  const loadClients = async () => {
    try {
      const response = await clientsAPI.getClients({ limit: 100, offset: 0 });
      if (response.success && response.data) {
        setClients(response.data.items || []);
      }
    } catch (err) {
      console.error('Error loading clients:', err);
      setError('Mijozlarni yuklashda xatolik yuz berdi');
    }
  };

  const resetModal = () => {
    setSelectedClient(null);
    setAmount('');
    setSearchTerm('');
    setError('');
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  const handleAdd = async () => {
    if (!selectedClient) {
      setError('Iltimos, mijozni tanlang');
      return;
    }
    const value = Number(amount);
    if (!value || value <= 0) {
      setError('Iltimos, qarz summasini kiriting');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const currentDebt = Number(selectedClient.debt_amount) || 0;
      const newDebt = currentDebt + value;
      const response = await clientsAPI.updateDebt(selectedClient.id, newDebt);
      if (response.success) {
        onAdded?.();
        handleClose();
      } else {
        setError(response.message || 'Qarz qo\'shishda xatolik yuz berdi');
      }
    } catch (err) {
      console.error('Add debt error:', err);
      setError(err.response?.data?.detail || 'Qarz qo\'shishda xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  };

  const filteredClients = clients.filter(client =>
    client.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (client.phone && client.phone.includes(searchTerm))
  );

  const currentDebt = selectedClient ? (Number(selectedClient.debt_amount) || 0) : 0;
  const value = Number(amount) || 0;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Qarz qo'shish" size="lg">
      <div className="space-y-4">
        <div>
          <h3 className="text-base font-semibold mb-2">Mijozni tanlang</h3>
          <div className="relative mb-2">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              placeholder="Mijozlarni qidirish..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="max-h-52 overflow-y-auto border border-gray-200 rounded-md divide-y">
            {filteredClients.length === 0 ? (
              <div className="flex flex-col items-center py-6 text-gray-500">
                <User size={40} />
                <p className="text-sm mt-2">Mijozlar topilmadi</p>
              </div>
            ) : (
              filteredClients.map(client => (
                <div
                  key={client.id}
                  className={`flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50 ${
                    selectedClient?.id === client.id ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => { setSelectedClient(client); setError(''); }}
                >
                  <div>
                    <h4 className="text-sm font-medium m-0">{client.first_name} {client.last_name}</h4>
                    {client.phone && <p className="text-xs text-gray-500 m-0">{client.phone}</p>}
                  </div>
                  <span className="text-xs text-red-600">
                    Qarz: {(Number(client.debt_amount) || 0).toFixed(2)} UZS
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {selectedClient && (
          <div className="space-y-2">
            <h3 className="text-base font-semibold">Qarz ma'lumotlari</h3>
            <p className="text-sm"><strong>Mijoz:</strong> {selectedClient.first_name} {selectedClient.last_name}</p>
            <p className="text-sm"><strong>Joriy qarz:</strong> {currentDebt.toFixed(2)} UZS</p>

            <Input
              label="Qarz summasi (UZS)"
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ''))}
              placeholder="0"
              icon={DollarSign}
            />

            {value > 0 && (
              <p className="text-sm text-gray-600">
                Yangi qarz: <span className="font-semibold text-red-600">{(currentDebt + value).toFixed(2)} UZS</span>
              </p>
            )}
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 text-red-600 text-sm">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <Button
            onClick={handleAdd}
            disabled={loading || !selectedClient || value <= 0}
          >
            {loading ? 'Yuklanmoqda...' : 'Qarz qo\'shish'}
          </Button>
          <Button variant="secondary" onClick={handleClose}>Bekor qilish</Button>
        </div>
      </div>
    </Modal>
  );
}
