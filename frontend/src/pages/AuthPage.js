import React, { useState } from 'react';
import {
  Box, Card, CardContent, TextField, Button, Typography,
  ToggleButtonGroup, ToggleButton, Alert, CircularProgress,
  InputAdornment, IconButton, Divider, Chip,
} from '@mui/material';
import { Visibility, VisibilityOff, StorefrontRounded, PeopleRounded } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { loginUser, registerUser } from '../utils/api';
import { useAuth } from '../context/AuthContext';

export default function AuthPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [mode, setMode] = useState('login');
  const [role, setRole] = useState('buyer');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '' });

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      let res;
      if (mode === 'login') {
        res = await loginUser({ email: form.email, password: form.password });
      } else {
        res = await registerUser({ ...form, role });
      }
      const { access_token, user_id, name, role: userRole } = res.data;
      login(access_token, { id: user_id, name, role: userRole, email: form.email });
      navigate(userRole === 'merchant' ? '/merchant' : '/buyer');
    } catch (err) {
      setError(err.response?.data?.detail || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #E1F5EE 0%, #F5F7F6 50%, #E1F5EE 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2,
      }}
    >
      <Card sx={{ width: '100%', maxWidth: 440, p: 1 }}>
        <CardContent sx={{ p: 3 }}>
          {/* Logo */}
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Box
              sx={{
                width: 56, height: 56, borderRadius: 3,
                background: 'linear-gradient(135deg, #1D9E75, #5DCAA5)',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                mb: 1.5,
              }}
            >
              <StorefrontRounded sx={{ color: 'white', fontSize: 28 }} />
            </Box>
            <Typography variant="h5" fontWeight={700} color="primary.dark">
              LocalMart
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Your hyperlocal marketplace
            </Typography>
          </Box>

          {/* Mode Toggle */}
          <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
            <Button
              fullWidth
              variant={mode === 'login' ? 'contained' : 'outlined'}
              onClick={() => { setMode('login'); setError(''); }}
            >
              Sign In
            </Button>
            <Button
              fullWidth
              variant={mode === 'register' ? 'contained' : 'outlined'}
              onClick={() => { setMode('register'); setError(''); }}
            >
              Register
            </Button>
          </Box>

          {/* Role Selector (Register only) */}
          {mode === 'register' && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" color="text.secondary" mb={1}>I am a...</Typography>
              <ToggleButtonGroup
                value={role}
                exclusive
                onChange={(_, val) => val && setRole(val)}
                fullWidth
                sx={{ gap: 1 }}
              >
                <ToggleButton value="buyer" sx={{ borderRadius: '10px !important', gap: 1 }}>
                  <PeopleRounded fontSize="small" /> Buyer
                </ToggleButton>
                <ToggleButton value="merchant" sx={{ borderRadius: '10px !important', gap: 1 }}>
                  <StorefrontRounded fontSize="small" /> Merchant
                </ToggleButton>
              </ToggleButtonGroup>
            </Box>
          )}

          {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

          <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {mode === 'register' && (
              <>
                <TextField label="Full Name" name="name" value={form.name} onChange={handleChange} required fullWidth />
                <TextField label="Phone Number" name="phone" value={form.phone} onChange={handleChange} fullWidth />
              </>
            )}
            <TextField label="Email Address" name="email" type="email" value={form.email} onChange={handleChange} required fullWidth />
            <TextField
              label="Password"
              name="password"
              type={showPass ? 'text' : 'password'}
              value={form.password}
              onChange={handleChange}
              required
              fullWidth
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowPass(!showPass)} edge="end">
                      {showPass ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <Button
              type="submit"
              variant="contained"
              fullWidth
              size="large"
              disabled={loading}
              sx={{ mt: 1, py: 1.5 }}
            >
              {loading ? <CircularProgress size={24} color="inherit" /> : mode === 'login' ? 'Sign In' : 'Create Account'}
            </Button>
          </Box>

          <Divider sx={{ my: 2.5 }}>
            <Chip label="Demo accounts" size="small" />
          </Divider>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button size="small" fullWidth variant="outlined"
              onClick={() => { setForm({ email: 'merchant@demo.com', password: 'demo123', name: '', phone: '' }); setMode('login'); }}>
              Merchant Demo
            </Button>
            <Button size="small" fullWidth variant="outlined"
              onClick={() => { setForm({ email: 'buyer@demo.com', password: 'demo123', name: '', phone: '' }); setMode('login'); }}>
              Buyer Demo
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
