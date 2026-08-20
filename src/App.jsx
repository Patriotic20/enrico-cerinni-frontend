import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AppProvider } from './contexts/AppContext';
import { ConfirmProvider } from './contexts/ConfirmContext';
import ErrorBoundary from './components/ui/ErrorBoundary';
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
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

const FullScreenLoader = () => (
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

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <FullScreenLoader />;
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
            <ConfirmProvider>
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

                  {/* Unknown URLs render a 404 page instead of a blank screen */}
                  <Route path="*" element={<NotFoundPage />} />
                </Routes>
              </Suspense>
              {/* Notification styling lives here so every toast in the app
                  matches the site design instead of the browser's own dialog. */}
              <Toaster
                position="top-right"
                gutter={12}
                toastOptions={{
                  duration: 4000,
                  style: {
                    background: '#ffffff',
                    color: '#111827',
                    border: '1px solid #e5e7eb',
                    borderRadius: '0.5rem',
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
                    padding: '12px 16px',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    maxWidth: '420px',
                    // Validation messages join several lines with \n.
                    whiteSpace: 'pre-line',
                  },
                  success: {
                    duration: 3000,
                    iconTheme: { primary: '#059669', secondary: '#ffffff' },
                    style: { borderLeft: '4px solid #059669' },
                  },
                  error: {
                    duration: 5000,
                    iconTheme: { primary: '#dc2626', secondary: '#ffffff' },
                    style: { borderLeft: '4px solid #dc2626' },
                  },
                }}
              />
            </ConfirmProvider>
          </AuthProvider>
        </AppProvider>
      </ErrorBoundary>
    </BrowserRouter>
  );
};

export default App;
