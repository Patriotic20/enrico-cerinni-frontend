import { useState, useEffect, useCallback } from 'react';
import { Search, UserPlus, User, Phone, ArrowLeft } from 'lucide-react';
import Modal from './Modal';
import { formatCurrency } from '../../utils/format';
import { clientsAPI } from '../../api';
import toast from 'react-hot-toast';

const ClientModal = ({ 
  isOpen, 
  onClose, 
  onClientSelect,
  selectedClient = null 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [clients, setClients] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [newClient, setNewClient] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    address: '',
    notes: ''
  });

  // Load initial clients list
  const loadClients = useCallback(async () => {
    setLoading(true);
    try {
      const response = await clientsAPI.getClients({
        size: 20
      });
      
      if (response.success && response.data) {
        setClients(response.data.items || []);
      } else {
        setClients([]);
      }
    } catch (error) {
      console.error('Error loading clients:', error);
      setClients([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Search clients
  const searchClients = useCallback(async (term) => {
    if (!term.trim()) {
      setSearchResults([]);
      return;
    }

    setSearchLoading(true);
    try {
      const response = await clientsAPI.getClients({
        search: term,
        size: 10
      });
      
      if (response.success && response.data) {
        setSearchResults(response.data.items || []);
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Error searching clients:', error);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  }, []);

  // Load initial clients when modal opens
  useEffect(() => {
    if (isOpen && !showCreateForm) {
      loadClients();
    }
  }, [isOpen, showCreateForm, loadClients]);

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchTerm.trim()) {
        searchClients(searchTerm);
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, searchClients]);

  // Handle client selection
  const handleClientSelect = (client) => {
    onClientSelect(client);
    onClose();
    setSearchTerm('');
    setSearchResults([]);
    setShowCreateForm(false);
    setNewClient({ first_name: '', last_name: '', phone: '', address: '', notes: '' });
  };

  // Handle create new client
  const handleCreateClient = async () => {
    if (!newClient.first_name.trim() || !newClient.last_name.trim()) {
      toast.error('Iltimos, mijoz ismi va familiyasini kiriting');
      return;
    }

    setCreateLoading(true);
    try {
      const response = await clientsAPI.createClient(newClient);
      
      if (response.success && response.data) {
        handleClientSelect(response.data);
      } else {
        throw new Error('Client creation failed');
      }
    } catch (error) {
      console.error('Error creating client:', error);
      toast.error('Mijoz yaratishda xatolik yuz berdi. Iltimos, qaytadan urinib ko\'ring.');
    } finally {
      setCreateLoading(false);
    }
  };

  // Handle modal close
  const handleClose = () => {
    onClose();
    setSearchTerm('');
    setSearchResults([]);
    setShowCreateForm(false);
    setNewClient({ first_name: '', last_name: '', phone: '', address: '', notes: '' });
  };

  const isSearching = searchTerm.trim() && searchLoading;
  const list = searchTerm.trim() ? searchResults : clients;
  const busy = loading || isSearching;
  const inputCls = 'w-full h-12 px-4 text-base rounded-xl border-2 border-gray-200 focus:border-blue-500 outline-none';

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={showCreateForm ? "Yangi mijoz" : "Mijozni tanlash"}
      size="md"
    >
      {!showCreateForm ? (
        <div className="space-y-4">
          <div className="relative">
            <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              autoFocus
              placeholder="Ism yoki telefon raqami..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`${inputCls} h-14 pl-12 text-lg`}
            />
          </div>

          <button
            type="button"
            onClick={() => setShowCreateForm(true)}
            className="w-full h-14 flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-blue-300 text-base font-semibold text-blue-700 hover:bg-blue-50"
          >
            <UserPlus size={20} /> Yangi mijoz qo'shish
          </button>

          {busy ? (
            <div className="flex items-center justify-center gap-3 py-10 text-base text-gray-500">
              <span className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              {loading ? 'Yuklanmoqda...' : 'Qidirilmoqda...'}
            </div>
          ) : list.length === 0 ? (
            <div className="text-center py-10">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <User size={30} className="text-gray-400" />
              </div>
              <p className="m-0 text-base font-semibold text-gray-800">
                {searchTerm.trim() ? 'Mijoz topilmadi' : "Hali mijozlar yo'q"}
              </p>
              <p className="m-0 mt-1 text-sm text-gray-500">Yuqoridagi tugma orqali yangi mijoz qo'shing</p>
            </div>
          ) : (
            <div>
              {!searchTerm.trim() && (
                <p className="m-0 mb-2 text-sm font-semibold text-gray-500">So'nggi mijozlar</p>
              )}
              <ul className="m-0 p-0 list-none space-y-2 max-h-[45vh] overflow-y-auto">
                {list.map(client => {
                  const active = selectedClient?.id === client.id;
                  const debt = Number(client.debt_amount) || 0;
                  return (
                    <li key={client.id}>
                      <button
                        type="button"
                        onClick={() => handleClientSelect(client)}
                        className={`w-full flex items-center gap-3 min-h-[64px] p-3 rounded-xl border-2 text-left transition-colors ${
                          active ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-blue-400 hover:bg-blue-50/50'
                        }`}
                      >
                        <span className="w-11 h-11 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-base font-bold shrink-0">
                          {(client.first_name || '?').charAt(0).toUpperCase()}
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className="block text-base font-semibold text-gray-900 truncate">
                            {client.first_name} {client.last_name}
                          </span>
                          {client.phone && (
                            <span className="flex items-center gap-1 text-sm text-gray-500">
                              <Phone size={13} /> {client.phone}
                            </span>
                          )}
                        </span>
                        {debt > 0 && (
                          <span className="px-2 py-1 rounded-md bg-amber-100 text-amber-800 text-xs font-semibold whitespace-nowrap">
                            Qarz: {formatCurrency(debt)}
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      ) : (
        <form
          className="space-y-4"
          onSubmit={(e) => { e.preventDefault(); handleCreateClient(); }}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Ism <span className="text-red-500">*</span></span>
              <input
                autoFocus
                value={newClient.first_name}
                onChange={(e) => setNewClient({ ...newClient, first_name: e.target.value })}
                className={`${inputCls} mt-1.5`}
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Familiya <span className="text-red-500">*</span></span>
              <input
                value={newClient.last_name}
                onChange={(e) => setNewClient({ ...newClient, last_name: e.target.value })}
                className={`${inputCls} mt-1.5`}
              />
            </label>
          </div>
          <label className="block">
            <span className="text-sm font-medium text-gray-700">Telefon</span>
            <input
              type="tel"
              inputMode="tel"
              value={newClient.phone}
              onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
              placeholder="+998 90 123 45 67"
              className={`${inputCls} mt-1.5`}
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-gray-700">Manzil</span>
            <input
              value={newClient.address}
              onChange={(e) => setNewClient({ ...newClient, address: e.target.value })}
              className={`${inputCls} mt-1.5`}
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-gray-700">Izoh</span>
            <input
              value={newClient.notes}
              onChange={(e) => setNewClient({ ...newClient, notes: e.target.value })}
              className={`${inputCls} mt-1.5`}
            />
          </label>

          <div className="grid grid-cols-[1fr_2fr] gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowCreateForm(false)}
              className="h-14 flex items-center justify-center gap-2 rounded-xl border-2 border-gray-200 bg-white text-base font-semibold text-gray-700 hover:bg-gray-50"
            >
              <ArrowLeft size={18} /> Orqaga
            </button>
            <button
              type="submit"
              disabled={!newClient.first_name.trim() || !newClient.last_name.trim() || createLoading}
              className="h-14 rounded-xl bg-blue-600 text-white text-lg font-bold hover:bg-blue-700 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed"
            >
              {createLoading ? 'Saqlanmoqda...' : 'Saqlash va tanlash'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
};

export default ClientModal;
