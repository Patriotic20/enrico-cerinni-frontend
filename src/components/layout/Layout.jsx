import { useState, Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

// Mounted once as the parent route: sidebar/header persist across page
// navigation, and only the content area suspends while a lazy page loads.
const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleMenuClick = () => {
    setSidebarOpen(true);
  };

  const handleSidebarClose = () => {
    setSidebarOpen(false);
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar isOpen={sidebarOpen} onClose={handleSidebarClose} />

      {/* Main content */}
      <main className="flex-1 ml-0 bg-gray-50 min-h-screen md:ml-48">
        <Header onMenuClick={handleMenuClick} />
        <div className="px-4 py-4 lg:p-6">
          <Suspense fallback={<div className="py-12 text-center text-gray-500">Yuklanmoqda...</div>}>
            <Outlet />
          </Suspense>
        </div>
      </main>
    </div>
  );
};

export default Layout; 