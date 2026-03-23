import React, { useState, useMemo } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, CssBaseline, createTheme } from '@mui/material';
import { SnackbarProvider } from 'notistack';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { SettingsProvider } from './context/SettingsContext';
import AuthPage from './pages/AuthPage';
import MerchantPage from './pages/MerchantPage';
import BuyerPage from './pages/BuyerPage';
import AdminDashboard from './pages/AdminDashboard';
import { CircularProgress, Box } from '@mui/material';

// Base theme tokens shared between light and dark
const baseTheme = {
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", sans-serif',
    h4: { fontWeight: 700 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
  },
  shape: { borderRadius: 12 },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          textTransform: 'none',
          fontWeight: 600,
          padding: '10px 20px',
        },
        containedPrimary: {
          boxShadow: '0 4px 14px rgba(29,158,117,0.3)',
          '&:hover': { boxShadow: '0 6px 18px rgba(29,158,117,0.4)' },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0 2px 12px rgba(0,0,0,0.07)',
          border: '1px solid rgba(0,0,0,0.05)',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: { '& .MuiOutlinedInput-root': { borderRadius: 10 } },
      },
    },
    MuiChip: {
      styleOverrides: { root: { borderRadius: 8, fontWeight: 500 } },
    },
    MuiAppBar: {
      styleOverrides: {
        root: { boxShadow: '0 1px 8px rgba(0,0,0,0.08)' },
      },
    },
  },
};

function buildTheme(dark) {
  return createTheme({
    ...baseTheme,
    palette: {
      mode: dark ? 'dark' : 'light',
      primary: { main: '#1D9E75', light: '#5DCAA5', dark: '#0F6E56', contrastText: '#fff' },
      secondary: { main: '#FF6B35', light: '#FF9A6C', dark: '#C4400A', contrastText: '#fff' },
      background: {
        default: dark ? '#121212' : '#F5F7F6',
        paper: dark ? '#1E1E1E' : '#FFFFFF',
      },
      success: { main: '#1D9E75' },
      warning: { main: '#EF9F27' },
      error: { main: '#E24B4A' },
    },
  });
}

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
      <Route path="/admin" element={
        <ProtectedRoute><AdminDashboard /></ProtectedRoute>
      } />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  const [darkMode, setDarkMode] = useState(
    () => localStorage.getItem('nearsell_dark') === 'true'
  );
  const theme = useMemo(() => buildTheme(darkMode), [darkMode]);

  return (
    <SettingsProvider onThemeChange={setDarkMode}>
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
    </SettingsProvider>
  );
}
