import { Receipt, Building2, Users } from 'lucide-react';
import { cn } from '../../utils/cn';

const TABS = [
  { id: 'expenses', name: 'Xarajatlar', icon: Receipt },
  { id: 'suppliers', name: 'Yetkazib beruvchilar', icon: Building2 },
  { id: 'salary', name: 'Ish haqi', icon: Users },
];

const FinanceTabs = ({ activeTab, setActiveTab, counts = {} }) => (
  <div className="flex gap-1 border-b border-gray-200 overflow-x-auto" role="tablist">
    {TABS.map(({ id, name, icon: Icon }) => {
      const active = activeTab === id;
      return (
        <button
          key={id}
          role="tab"
          aria-selected={active}
          onClick={() => setActiveTab(id)}
          className={cn(
            'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors',
            active ? 'border-red-600 text-red-700' : 'border-transparent text-gray-600 hover:text-gray-900'
          )}
        >
          <Icon size={16} />
          {name}
          {counts[id] != null && (
            <span className={cn('px-1.5 rounded-full text-xs tabular-nums',
              active ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600')}>
              {counts[id]}
            </span>
          )}
        </button>
      );
    })}
  </div>
);

export default FinanceTabs;
