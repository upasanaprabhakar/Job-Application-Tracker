import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import useAuthStore from './store/authStore';
import ProtectedRoute from './components/common/ProtectedRoute';
import Landing from './pages/Landing';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import Dashboard from './pages/dashboard/Dashboard';
import ApplicationsPage from './pages/applications/ApplicationsPage';
import ApplicationDetail from './pages/applications/ApplicationDetail';
import ApplicationForm from './pages/applications/ApplicationForm';
import CalendarPage from './pages/calendar/CalendarPage';
import AnalyticsPage from './pages/analytics/AnalyticsPage';
import DocumentsPage from './pages/documents/DocumentsPage';
import SettingsPage  from './pages/settings/SettingsPage';
import { initializeAuth } from './api/axios';

const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false, retry: 1 } },
});

function App() {
  const { isAuthenticated, logout } = useAuthStore();
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    const restore = async () => {
      if (isAuthenticated) {
        const ok = await initializeAuth();
        if (!ok) logout();
      }
      setAuthReady(true);
    };
    restore();
  }, []);

  if (!authReady) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#12131a' }}>
        <div style={{ width: 34, height: 34, borderRadius: '50%', border: '2px solid #00c896', borderTopColor: 'transparent', animation: 'spin 0.7s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{ style: { background: '#1e1f2c', color: '#ededf1', border: '1px solid rgba(255,255,255,0.1)', fontSize: 13 } }}
        />
        <Routes>
          <Route path="/" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Landing />} />
          <Route path="/login"    element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />

          <Route path="/applications"          element={<ProtectedRoute><ApplicationsPage /></ProtectedRoute>} />
          <Route path="/applications/new"      element={<ProtectedRoute><ApplicationForm /></ProtectedRoute>} />
          <Route path="/applications/:id"      element={<ProtectedRoute><ApplicationDetail /></ProtectedRoute>} />
          <Route path="/applications/:id/edit" element={<ProtectedRoute><ApplicationForm /></ProtectedRoute>} />

          <Route path="/calendar"   element={<ProtectedRoute><CalendarPage /></ProtectedRoute>} />
          <Route path="/analytics"  element={<ProtectedRoute><AnalyticsPage /></ProtectedRoute>} />
          <Route path="/documents"  element={<ProtectedRoute><DocumentsPage /></ProtectedRoute>} />
          <Route path="/settings"   element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />

          <Route path="*" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;