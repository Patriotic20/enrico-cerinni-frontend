import { UserPlus, X, ChevronRight } from 'lucide-react';
import { formatCurrency } from '../../utils/format';

export default function ClientSection({
  selectedClient,
  clientDebt,
  setShowClientModal,
  setSelectedClient
}) {
  const debt = Number(clientDebt) || 0;

  if (!selectedClient) {
    return (
      <button
        type="button"
        onClick={() => setShowClientModal(true)}
        className="w-full flex items-center gap-3 h-14 px-3 rounded-xl border-2 border-dashed border-gray-300 text-left hover:border-blue-500 hover:bg-blue-50/50 transition-colors"
      >
        <UserPlus size={22} className="text-gray-500 shrink-0" />
        <span className="flex-1 min-w-0 text-base font-semibold text-gray-800">
          Mijoz <span className="font-normal text-gray-500">· ixtiyoriy</span>
        </span>
        <ChevronRight size={20} className="text-gray-500" />
      </button>
    );
  }

  const name = selectedClient.first_name && selectedClient.last_name
    ? `${selectedClient.first_name} ${selectedClient.last_name}`.trim()
    : selectedClient.name || '';

  return (
    <div className="flex items-center gap-2 h-14 pl-2 pr-1 rounded-xl border-2 border-purple-200 bg-purple-50/50">
      <button
        type="button"
        onClick={() => setShowClientModal(true)}
        title="O'zgartirish"
        className="flex-1 min-w-0 flex items-center gap-2.5 text-left"
      >
        <span className="w-10 h-10 rounded-full bg-purple-600 text-white flex items-center justify-center text-base font-bold shrink-0">
          {name.charAt(0).toUpperCase()}
        </span>
        <span className="min-w-0">
          <span className="block text-base font-semibold text-gray-900 truncate">{name}</span>
          {selectedClient.phone && <span className="block text-xs text-gray-500">{selectedClient.phone}</span>}
        </span>
      </button>
      {debt > 0 && (
        <span className="px-2 py-1 rounded-md bg-amber-100 text-amber-800 text-xs font-semibold whitespace-nowrap">
          Qarz: {formatCurrency(debt)}
        </span>
      )}
      <button
        type="button"
        aria-label="Mijozni olib tashlash"
        onClick={() => setSelectedClient(null)}
        className="w-11 h-11 flex items-center justify-center rounded-lg text-gray-500 hover:text-gray-800 hover:bg-white"
      >
        <X size={20} />
      </button>
    </div>
  );
}
