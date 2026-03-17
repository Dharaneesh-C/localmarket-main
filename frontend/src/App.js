import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { SnackbarProvider } from 'notistack';
import theme from './utils/theme';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import AuthPage from './pages/AuthPage';
import MerchantPage from './pages/MerchantPage';
import BuyerPage from './pages/BuyerPage';
import { CircularProgress, Box } from '@mui/material';

function ProtectedRoute({ children, requiredRole }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <CircularProgress />
    </Box>
  );
  if (!user) return <Navigate to="/" replace />;
  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to={user.role === 'merchant' ? '/merchant' : '/buyer'} replace />;
  }
  return children;
}

function AppRoutes() {
  const { user, loading } = useAuth();
  if (loading) return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <CircularProgress />
    </Box>
  );
  return (
    <Routes>
      <Route path="/" element={
        user ? <Navigate to={user.role === 'merchant' ? '/merchant' : '/buyer'} replace /> : <AuthPage />
      } />
      <Route path="/merchant" element={
        <ProtectedRoute requiredRole="merchant"><MerchantPage /></ProtectedRoute>
      } />
      <Route path="/buyer" element={
        <ProtectedRoute requiredRole="buyer"><BuyerPage /></ProtectedRoute>
      } />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <SnackbarProvider maxSnack={3} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <BrowserRouter>
          <AuthProvider>
            <NotificationProvider>
              <AppRoutes />
            </NotificationProvider>
          </AuthProvider>
        </BrowserRouter>
      </SnackbarProvider>
    </ThemeProvider>
  );
}
