import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AppProvider } from './contexts/AppContext';
import ErrorBoundary from './components/ui/ErrorBoundary';
import Notification from './components/ui/Notification';
import { Toaster } from 'react-hot-toast';

// Login stays eager (first paint, public route)
import LoginPage from './pages/LoginPage';

// Lazy-load protected pages — each becomes its own chunk, loaded on demand
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const CheckoutPage = lazy(() => import('./pages/CheckoutPage'));
const SalesPage = lazy(() => import('./pages/SalesPage'));
const InventoryPage = lazy(() => import('./pages/InventoryPage'));
const ProductDetailPage = lazy(() => import('./pages/ProductDetailPage'));
const ClientsPage = lazy(() => import('./pages/ClientsPage'));
const FinancePage = lazy(() => import('./pages/FinancePage'));
const DebtsPage = lazy(() => import('./pages/DebtsPage'));
const MarketingPage = lazy(() => import('./pages/MarketingPage'));
const ReportsPage = lazy(() => import('./pages/ReportsPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        fontSize: '1.125rem',
        color: '#6b7280'
      }}>
        Yuklanmoqda...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

const PageFallback = () => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    fontSize: '1.125rem',
    color: '#6b7280'
  }}>
    Yuklanmoqda...
  </div>
);

const App = () => {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <AppProvider>
          <AuthProvider>
            <Suspense fallback={<PageFallback />}>
            <Routes>
              {/* Public Route */}
              <Route path="/login" element={<LoginPage />} />
              
              {/* Protected Routes */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
              <Route path="/checkout" element={<ProtectedRoute><CheckoutPage /></ProtectedRoute>} />
              <Route path="/sales" element={<ProtectedRoute><SalesPage /></ProtectedRoute>} />
              <Route path="/inventory" element={<ProtectedRoute><InventoryPage /></ProtectedRoute>} />
              <Route path="/inventory/:id" element={<ProtectedRoute><ProductDetailPage /></ProtectedRoute>} />
              <Route path="/clients" element={<ProtectedRoute><ClientsPage /></ProtectedRoute>} />
              <Route path="/finance" element={<ProtectedRoute><FinancePage /></ProtectedRoute>} />
              <Route path="/debts" element={<ProtectedRoute><DebtsPage /></ProtectedRoute>} />
              <Route path="/marketing" element={<ProtectedRoute><MarketingPage /></ProtectedRoute>} />
              <Route path="/reports" element={<ProtectedRoute><ReportsPage /></ProtectedRoute>} />
              <Route path="/settings/*" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
            </Routes>
            </Suspense>
            <Notification />
            <Toaster position="top-right" />
          </AuthProvider>
        </AppProvider>
      </ErrorBoundary>
    </BrowserRouter>
  );
};

export default App;
