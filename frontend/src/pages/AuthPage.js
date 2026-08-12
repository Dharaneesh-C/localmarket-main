import React, { useState, useMemo } from 'react';
import {
  Box, Card, CardContent, TextField, Button, Typography,
  Alert, CircularProgress, InputAdornment, IconButton,
  Divider, Chip, LinearProgress,
} from '@mui/material';
import {
  Visibility, VisibilityOff, StorefrontRounded,
  PhoneRounded, PersonRounded, EmailRounded, LockRounded,
} from '@mui/icons-material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { loginUser, registerUser, forgotPassword, verifyOTP, resetPassword } from '../utils/api';
import { useAuth } from '../context/AuthContext';

// Password strength checker
function getPasswordStrength(password) {
  if (!password) return { score: 0, label: '', color: '' };
  let score = 0;
  if (password.length >= 6) score++;
  if (password.length >= 10) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  const levels = [
    { label: '', color: '' },
    { label: 'Weak', color: '#e53935' },
    { label: 'Fair', color: '#EF9F27' },
    { label: 'Good', color: '#1D9E75' },
    { label: 'Strong', color: '#1D9E75' },
    { label: 'Very Strong', color: '#0F6E56' },
  ];
  return { score, ...levels[score] };
}

// Role selection card
function RoleCard({ value, selected, onClick, icon, title, description }) {
  return (
    <Box
      onClick={() => onClick(value)}
      sx={{
        flex: 1, p: 2, borderRadius: 2, cursor: 'pointer',
        border: '2px solid',
        borderColor: selected ? 'primary.main' : 'divider',
        bgcolor: selected ? '#E1F5EE' : 'background.paper',
        transition: 'all 0.15s',
        textAlign: 'center',
        '&:hover': { borderColor: 'primary.main', bgcolor: '#E1F5EE' },
      }}
    >
      <Box sx={{ fontSize: 28, mb: 0.5 }}>{icon}</Box>
      <Typography variant="body2" fontWeight={700} color={selected ? 'primary.dark' : 'text.primary'}>
        {title}
      </Typography>
      <Typography variant="caption" color="text.secondary">{description}</Typography>
    </Box>
  );
}

export default function AuthPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [searchParams] = useSearchParams();
  // Coming from the landing page CTAs (e.g. "Sell on NearSell" → ?mode=signup&role=merchant)
  const [mode, setMode] = useState(searchParams.get('mode') === 'signup' ? 'signup' : 'login');
  const [role, setRole] = useState(searchParams.get('role') === 'merchant' ? 'merchant' : 'buyer');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '', otp: '', phone: '' });

  const passwordStrength = useMemo(() => getPasswordStrength(form.password), [form.password]);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const setAuthMode = (nextMode) => {
    setMode(nextMode);
    setError('');
    setSuccess('');
  };

  const validate = () => {
    if (!form.email.trim()) return 'Email is required.';
    if (!/^\S+@\S+\.\S+$/.test(form.email)) return 'Enter a valid email address.';
    if (mode === 'forgot') return null;
    if (mode === 'verify') return /^\d{6}$/.test(form.otp) ? null : 'OTP must be exactly 6 digits.';
    if (mode === 'reset') {
      if (form.password.length < 6) return 'Password must be at least 6 characters.';
      return form.password === form.confirmPassword ? null : 'Passwords do not match.';
    }
    if (mode === 'register') {
      if (!form.name.trim()) return 'Full name is required.';
      if (!form.phone.trim()) return 'Phone number is required.';
      if (!/^\d{10}$/.test(form.phone.replace(/\s/g, '')))
        return 'Enter a valid 10-digit phone number.';
      if (form.password.length < 6) return 'Password must be at least 6 characters.';
    }
    if (!form.password.trim()) return 'Password is required.';
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    const validationError = validate();
    if (validationError) { setError(validationError); return; }
    setLoading(true);
    try {
      let res;
      if (mode === 'forgot') {
        await forgotPassword({ email: form.email });
        setAuthMode('verify');
        setSuccess('We sent a 6-digit OTP to your email address.');
      } else if (mode === 'verify') {
        await verifyOTP({ email: form.email, otp: form.otp });
        setAuthMode('reset');
        setSuccess('OTP verified. Choose your new password.');
      } else if (mode === 'reset') {
        await resetPassword({ email: form.email, otp: form.otp, new_password: form.password });
        setForm({ name: '', email: form.email, password: '', confirmPassword: '', otp: '', phone: '' });
        setMode('login');
        setSuccess('Password reset successfully. Please sign in with your new password.');
      } else if (mode === 'login') {
        res = await loginUser({ email: form.email, password: form.password });
      } else {
        res = await registerUser({ ...form, role });
      }
      if (res) {
        const { access_token, user_id, name, role: userRole } = res.data;
        login(access_token, { id: user_id, name, role: userRole, email: form.email });
        navigate(userRole === 'merchant' ? '/merchant' : '/buyer');
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #E1F5EE 0%, #F5F7F6 50%, #E8F0FF 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2,
    }}>
      <Card sx={{ width: '100%', maxWidth: 460, p: 1 }}>
        <CardContent sx={{ p: 3 }}>

          {/* Logo */}
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Box sx={{
              width: 64, height: 64, borderRadius: 3,
              background: 'linear-gradient(135deg, #1D9E75, #5DCAA5)',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', mb: 1.5,
              boxShadow: '0 8px 24px rgba(29,158,117,0.3)',
            }}>
              <StorefrontRounded sx={{ color: 'white', fontSize: 32 }} />
            </Box>
            <Typography variant="h5" fontWeight={800} color="primary.dark">
              NearSell
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Buy fresh from local merchants near you
            </Typography>
          </Box>

          {/* Mode Toggle */}
          {['login', 'register'].includes(mode) ? (
            <Box sx={{ display: 'flex', gap: 1, mb: 3, bgcolor: 'background.default', borderRadius: 2, p: 0.5 }}>
              {['login', 'register'].map((m) => (
                <Button key={m} fullWidth variant={mode === m ? 'contained' : 'text'}
                  onClick={() => setAuthMode(m)} sx={{ borderRadius: 1.5, py: 1 }}>
                  {m === 'login' ? 'Sign In' : 'Create Account'}
                </Button>
              ))}
            </Box>
          ) : (
            <Box sx={{ mb: 3, textAlign: 'center' }}>
              <Typography variant="h6" fontWeight={700}>
                {mode === 'forgot' ? 'Reset your password' : mode === 'verify' ? 'Verify your OTP' : 'Set a new password'}
              </Typography>
              <Typography variant="body2" color="text.secondary" mt={0.5}>
                {mode === 'forgot' ? 'Enter your account email to receive an OTP.' : `For ${form.email}`}
              </Typography>
            </Box>
          )}

          {/* Role Selector — register only */}
          {mode === 'register' && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" color="text.secondary" fontWeight={600} mb={1.5}>
                I want to...
              </Typography>
              <Box sx={{ display: 'flex', gap: 1.5 }}>
                <RoleCard
                  value="buyer"
                  selected={role === 'buyer'}
                  onClick={setRole}
                  icon="🛒"
                  title="Buy Products"
                  description="Browse & order from merchants"
                />
                <RoleCard
                  value="merchant"
                  selected={role === 'merchant'}
                  onClick={setRole}
                  icon="🏪"
                  title="Sell Products"
                  description="List & sell to nearby buyers"
                />
              </Box>
            </Box>
          )}

          {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}
          {success && <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }}>{success}</Alert>}

          <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>

            {mode === 'register' && (
              <>
                <TextField
                  label="Full Name *" name="name" value={form.name}
                  onChange={handleChange} required fullWidth
                  InputProps={{ startAdornment: <InputAdornment position="start"><PersonRounded color="action" fontSize="small" /></InputAdornment> }}
                />
                <TextField
                  label="Phone Number *" name="phone" value={form.phone}
                  onChange={handleChange} required fullWidth
                  placeholder="10-digit mobile number"
                  inputProps={{ maxLength: 10 }}
                  InputProps={{ startAdornment: <InputAdornment position="start"><PhoneRounded color="action" fontSize="small" /></InputAdornment> }}
                  helperText="Required — merchants will contact you on this number"
                />
              </>
            )}

            {!['verify', 'reset'].includes(mode) && (
              <TextField
                label="Email Address *" name="email" type="email"
                value={form.email} onChange={handleChange} required fullWidth
                InputProps={{ startAdornment: <InputAdornment position="start"><EmailRounded color="action" fontSize="small" /></InputAdornment> }}
              />
            )}

            {mode === 'verify' && (
              <TextField label="6-digit OTP" name="otp" value={form.otp} onChange={handleChange}
                required fullWidth autoFocus inputProps={{ inputMode: 'numeric', maxLength: 6, pattern: '\\d{6}' }}
                helperText="Enter the code sent to your email." />
            )}

            {['login', 'register', 'reset'].includes(mode) && <Box>
              <TextField
                label={mode === 'reset' ? 'New Password *' : 'Password *'} name="password"
                type={showPass ? 'text' : 'password'}
                value={form.password} onChange={handleChange}
                required fullWidth
                InputProps={{
                  startAdornment: <InputAdornment position="start"><LockRounded color="action" fontSize="small" /></InputAdornment>,
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowPass(!showPass)} edge="end" size="small">
                        {showPass ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
              {/* Password strength bar — register only */}
              {mode === 'register' && form.password && (
                <Box sx={{ mt: 0.8 }}>
                  <LinearProgress
                    variant="determinate"
                    value={(passwordStrength.score / 5) * 100}
                    sx={{
                      height: 4, borderRadius: 2,
                      bgcolor: '#e0e0e0',
                      '& .MuiLinearProgress-bar': { bgcolor: passwordStrength.color, borderRadius: 2 },
                    }}
                  />
                  <Typography variant="caption" sx={{ color: passwordStrength.color, fontWeight: 600 }}>
                    {passwordStrength.label}
                  </Typography>
                </Box>
              )}
            </Box>}

            {mode === 'reset' && (
              <TextField label="Confirm New Password *" name="confirmPassword"
                type={showPass ? 'text' : 'password'} value={form.confirmPassword} onChange={handleChange}
                required fullWidth
                InputProps={{ startAdornment: <InputAdornment position="start"><LockRounded color="action" fontSize="small" /></InputAdornment> }} />
            )}

            {mode === 'login' && (
              <Button variant="text" size="small" onClick={() => setAuthMode('forgot')} sx={{ alignSelf: 'flex-end', mt: -1 }}>
                Forgot Password?
              </Button>
            )}

            <Button type="submit" variant="contained" fullWidth size="large"
              disabled={loading} sx={{ mt: 0.5, py: 1.5, fontSize: 15 }}>
              {loading
                ? <CircularProgress size={24} color="inherit" />
                : mode === 'login' ? 'Sign In'
                  : mode === 'register' ? `Create ${role === 'merchant' ? 'Merchant' : 'Buyer'} Account`
                    : mode === 'forgot' ? 'Send OTP'
                      : mode === 'verify' ? 'Verify OTP' : 'Reset Password'}
            </Button>
            {['forgot', 'verify', 'reset'].includes(mode) && (
              <Button variant="text" onClick={() => setAuthMode('login')}>Back to Sign In</Button>
            )}
          </Box>

          {['login', 'register'].includes(mode) && <>
          <Divider sx={{ my: 2.5 }}><Chip label="Demo accounts" size="small" /></Divider>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button size="small" fullWidth variant="outlined"
              onClick={() => { setForm({ email: 'merchant@demo.com', password: 'demo123', name: '', phone: '' }); setMode('login'); }}>
              🏪 Merchant Demo
            </Button>
            <Button size="small" fullWidth variant="outlined"
              onClick={() => { setForm({ email: 'buyer@demo.com', password: 'demo123', name: '', phone: '' }); setMode('login'); }}>
              🛒 Buyer Demo
            </Button>
          </Box>
          </>}

        </CardContent>
      </Card>
    </Box>
  );
}
