import { Link, useLocation } from 'react-router-dom';
import {
  Home,
  ShoppingCart,
  Package,
  Users,
  DollarSign,
  Settings,
  LogOut,
  X,
  Receipt,
  MessageSquare,
  AlertCircle,
  BarChart3,
  UserCheck,
  ScanSearch
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { NAVIGATION_ITEMS, isStaff } from '../../utils/constants';

const iconMap = {
  Home,
  ShoppingCart,
  Package,
  Users,
  DollarSign,
  Settings,
  Receipt,
  MessageSquare,
  AlertCircle,
  BarChart3,
  UserCheck,
  ScanSearch,
};

const ROLE_LABELS = { admin: 'Administrator', manager: 'Menejer', user: 'Kassir' };

const Sidebar = ({ isOpen, onClose }) => {
  const { user, logout } = useAuth();
  const pathname = useLocation().pathname;

  // Group visible items, preserving declaration order of groups.
  const groups = [];
  for (const item of NAVIGATION_ITEMS) {
    if (item.staffOnly && !isStaff(user)) continue;
    const label = item.group || '';
    let g = groups.find((x) => x.label === label);
    if (!g) groups.push((g = { label, items: [] }));
    g.items.push(item);
  }

  // Nested routes (/inventory/42, /settings/brands) keep their parent highlighted.
  const isActive = (href) => pathname === href || pathname.startsWith(href + '/');

  return (
    <>
      {/* Mobile sidebar overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300"
          onClick={onClose}
        />
      )}

      <aside className={`w-48 bg-white text-gray-600 flex flex-col fixed top-0 left-0 h-screen z-50 transform transition-transform duration-300 ease-in-out border-r border-gray-200 overflow-hidden md:translate-x-0 ${isOpen ? 'translate-x-0 shadow-xl' : '-translate-x-full'}`}>
        <div className="h-14 px-4 border-b border-gray-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center shrink-0">
              <span className="text-white font-bold text-sm">EC</span>
            </div>
            <h1 className="m-0 text-sm font-bold text-gray-900 truncate">Enrico Cerrini</h1>
          </div>
          <button
            className="bg-transparent border-none text-gray-500 cursor-pointer p-1.5 rounded-lg hover:bg-gray-100 hover:text-gray-600 md:hidden"
            onClick={onClose}
            aria-label="Yopish"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 px-2 py-3 overflow-y-auto overflow-x-hidden space-y-4">
          {groups.map((group) => (
            <div key={group.label || 'main'}>
              {group.label && (
                <div className="px-2.5 mb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                  {group.label}
                </div>
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = iconMap[item.icon];
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.href}
                      to={item.href}
                      onClick={onClose}
                      aria-current={active ? 'page' : undefined}
                      className={`relative flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium transition-colors duration-150 group ${
                        active
                          ? 'bg-blue-50 text-blue-700'
                          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                      }`}
                    >
                      {active && <span className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r bg-blue-600" />}
                      <Icon
                        size={18}
                        className={active ? 'text-blue-600' : 'text-gray-500 group-hover:text-gray-600'}
                      />
                      <span className="truncate">{item.name}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="p-2 border-t border-gray-100 shrink-0">
          <div className="flex items-center gap-2 p-1.5 rounded-lg">
            <div className="w-8 h-8 bg-gradient-to-br from-gray-400 to-gray-600 rounded-full flex items-center justify-center shrink-0">
              <span className="text-white font-semibold text-sm">
                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <span className="block font-semibold text-gray-900 text-sm truncate">{user?.name || 'Foydalanuvchi'}</span>
              <span className="block text-[11px] text-gray-500 truncate">{ROLE_LABELS[user?.role] || user?.email}</span>
            </div>
            <button
              className="p-1.5 rounded-lg text-gray-500 bg-transparent border-none cursor-pointer hover:bg-red-50 hover:text-red-600 transition-colors shrink-0"
              onClick={logout}
              title="Chiqish"
              aria-label="Chiqish"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
