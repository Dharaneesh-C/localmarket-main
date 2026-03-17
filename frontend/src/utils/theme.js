import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1D9E75',
      light: '#5DCAA5',
      dark: '#0F6E56',
      contrastText: '#fff',
    },
    secondary: {
      main: '#FF6B35',
      light: '#FF9A6C',
      dark: '#C4400A',
      contrastText: '#fff',
    },
    background: {
      default: '#F5F7F6',
      paper: '#FFFFFF',
    },
    success: { main: '#1D9E75' },
    warning: { main: '#EF9F27' },
    error: { main: '#E24B4A' },
  },
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
        root: {
          '& .MuiOutlinedInput-root': { borderRadius: 10 },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: 8, fontWeight: 500 },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: '0 1px 8px rgba(0,0,0,0.08)',
          backgroundColor: '#FFFFFF',
          color: '#1a1a1a',
        },
      },
    },
  },
});

export default theme;
