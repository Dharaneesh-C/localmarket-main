import React, { useState, useEffect } from 'react';
import {
  Box, Card, CardContent, Typography, Switch, Button,
  Divider, TextField, IconButton, Alert, Chip, Avatar,
  Dialog, DialogTitle, DialogContent, DialogActions, CircularProgress,
} from '@mui/material';
import {
  DarkModeRounded, LanguageRounded, HomeRounded,
  DeleteRounded, AddRounded, QrCodeRounded,
  LocationOnRounded, CloseRounded,
} from '@mui/icons-material';
import { QRCodeSVG } from 'qrcode.react';
import Navbar from '../components/Navbar';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';
import { getAddresses, saveAddress, deleteAddress, updateMerchantProfile } from '../utils/api';

// ─── UPI QR Code Section ─────────────────────────────────────────────────────
function UPISection({ user, t }) {
  const [upiId, setUpiId] = useState(user?.upi_id || '');
  const [showQR, setShowQR] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [amount, setAmount] = useState('');

  const upiUrl = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(user?.name || 'Merchant')}&am=${amount || ''}&cu=INR`;

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateMerchantProfile({ upi_id: upiId });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  return (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <QrCodeRounded color="primary" />
          <Typography fontWeight={700}>{t('upiId')} & QR Code</Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
          <TextField
            size="small" fullWidth
            label={t('upiId')}
            placeholder={t('upiHint')}
            value={upiId}
            onChange={(e) => setUpiId(e.target.value)}
          />
          <Button variant="outlined" onClick={handleSave} disabled={saving || !upiId}>
            {saving ? <CircularProgress size={18} /> : saved ? '✅' : 'Save'}
          </Button>
        </Box>

        {upiId && (
          <Box sx={{ mt: 2 }}>
            <TextField
              size="small" fullWidth
              label="Amount (optional)"
              placeholder="e.g. 50"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              type="number"
              sx={{ mb: 1.5 }}
            />
            <Button
              variant="contained" fullWidth startIcon={<QrCodeRounded />}
              onClick={() => setShowQR(true)}
            >
              Show QR Code to Buyer
            </Button>
          </Box>
        )}

        {/* QR Dialog */}
        <Dialog open={showQR} onClose={() => setShowQR(false)} maxWidth="xs" fullWidth
          PaperProps={{ sx: { borderRadius: 3 } }}>
          <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography fontWeight={700}>{t('scanToPay')}</Typography>
            <IconButton onClick={() => setShowQR(false)}><CloseRounded /></IconButton>
          </DialogTitle>
          <DialogContent>
            <Box sx={{ textAlign: 'center', py: 2 }}>
              <Box sx={{ display: 'inline-block', p: 2, bgcolor: 'white', borderRadius: 2, boxShadow: 3 }}>
                <QRCodeSVG value={upiUrl} size={220} level="H" />
              </Box>
              <Typography variant="body2" color="text.secondary" mt={2}>
                UPI ID: <strong>{upiId}</strong>
              </Typography>
              {amount && (
                <Chip
                  label={`${t('payAmount')}${amount}`}
                  color="primary" sx={{ mt: 1, fontWeight: 700, fontSize: 16 }}
                />
              )}
              <Typography variant="caption" color="text.secondary" display="block" mt={1}>
                Works with PhonePe, GPay, Paytm, any UPI app
              </Typography>
            </Box>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

// ─── Address Book Section ────────────────────────────────────────────────────
function AddressBook({ t }) {
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ label: '', address_text: '', lat: '', lng: '' });
  const [saving, setSaving] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getAddresses()
      .then(res => setAddresses(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleGetCurrentLocation = () => {
    setGettingLocation(true);
    navigator.geolocation?.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setForm(f => ({ ...f, lat: latitude.toFixed(6), lng: longitude.toFixed(6) }));
        // Reverse geocode using Nominatim (free)
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
          );
          const data = await res.json();
          setForm(f => ({ ...f, address_text: data.display_name || `${latitude}, ${longitude}` }));
        } catch {
          setForm(f => ({ ...f, address_text: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}` }));
        }
        setGettingLocation(false);
      },
      () => { setGettingLocation(false); setError('Location access denied.'); }
    );
  };

  const handleSave = async () => {
    if (!form.label || !form.address_text || !form.lat || !form.lng) {
      setError('All fields required'); return;
    }
    setSaving(true);
    try {
      const res = await saveAddress({
        label: form.label,
        address_text: form.address_text,
        lat: parseFloat(form.lat),
        lng: parseFloat(form.lng),
      });
      setAddresses(res.data.addresses);
      setAddOpen(false);
      setForm({ label: '', address_text: '', lat: '', lng: '' });
      setError('');
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to save.');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    try {
      const res = await deleteAddress(id);
      setAddresses(res.data.addresses);
    } catch (e) { console.error(e); }
  };

  const LABEL_ICONS = { [t('homeLabel')]: '🏠', [t('workLabel')]: '💼', Home: '🏠', Work: '💼', வீடு: '🏠', வேலை: '💼' };

  return (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <HomeRounded color="primary" />
            <Typography fontWeight={700}>{t('addressBook')}</Typography>
          </Box>
          <Button size="small" startIcon={<AddRounded />} variant="outlined"
            onClick={() => setAddOpen(true)} disabled={addresses.length >= 5}>
            {t('addAddress')}
          </Button>
        </Box>

        {loading ? <CircularProgress size={24} /> : addresses.length === 0 ? (
          <Typography variant="body2" color="text.disabled">
            No saved addresses yet. Add your home or work address for faster ordering.
          </Typography>
        ) : (
          addresses.map((a) => (
            <Box key={a.id} sx={{
              display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
              p: 1.5, mb: 1, bgcolor: 'background.default', borderRadius: 2,
            }}>
              <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                <Avatar sx={{ width: 32, height: 32, bgcolor: '#E1F5EE', fontSize: 16 }}>
                  {LABEL_ICONS[a.label] || '📍'}
                </Avatar>
                <Box>
                  <Typography variant="body2" fontWeight={600}>{a.label}</Typography>
                  <Typography variant="caption" color="text.secondary">{a.address_text}</Typography>
                </Box>
              </Box>
              <IconButton size="small" color="error" onClick={() => handleDelete(a.id)}>
                <DeleteRounded fontSize="small" />
              </IconButton>
            </Box>
          ))
        )}

        {/* Add Dialog */}
        <Dialog open={addOpen} onClose={() => setAddOpen(false)} maxWidth="xs" fullWidth
          PaperProps={{ sx: { borderRadius: 3 } }}>
          <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography fontWeight={700}>{t('addAddress')}</Typography>
            <IconButton onClick={() => setAddOpen(false)}><CloseRounded /></IconButton>
          </DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
              {[t('homeLabel'), t('workLabel'), t('otherLabel')].map(l => (
                <Chip key={l} label={`${LABEL_ICONS[l] || '📍'} ${l}`}
                  onClick={() => setForm(f => ({ ...f, label: l }))}
                  color={form.label === l ? 'primary' : 'default'}
                  variant={form.label === l ? 'filled' : 'outlined'}
                  sx={{ cursor: 'pointer' }}
                />
              ))}
            </Box>
            <Button fullWidth variant="outlined" startIcon={<LocationOnRounded />}
              onClick={handleGetCurrentLocation} disabled={gettingLocation} sx={{ mb: 2 }}>
              {gettingLocation ? 'Getting location...' : 'Use Current Location'}
            </Button>
            <TextField
              label={t('addressText')} value={form.address_text} fullWidth size="small"
              onChange={e => setForm(f => ({ ...f, address_text: e.target.value }))} sx={{ mb: 1.5 }}
            />
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField label="Latitude" value={form.lat} size="small" fullWidth
                onChange={e => setForm(f => ({ ...f, lat: e.target.value }))} />
              <TextField label="Longitude" value={form.lng} size="small" fullWidth
                onChange={e => setForm(f => ({ ...f, lng: e.target.value }))} />
            </Box>
            {error && <Alert severity="error" sx={{ mt: 1 }}>{error}</Alert>}
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button variant="contained" fullWidth onClick={handleSave} disabled={saving}>
              {saving ? <CircularProgress size={18} color="inherit" /> : t('saveAddress')}
            </Button>
          </DialogActions>
        </Dialog>
      </CardContent>
    </Card>
  );
}

// ─── Main Settings Page ───────────────────────────────────────────────────────
export default function SettingsPage({ onBack }) {
  const { user } = useAuth();
  const { language, darkMode, t, toggleLanguage, toggleDarkMode } = useSettings();
  const [installPrompt, setInstallPrompt] = useState(null);
  const [installed, setInstalled] = useState(false);

  // Whether background push delivery is reliable (battery optimization
  // disabled + notifications enabled). null = not running inside the Android
  // app, so this section doesn't apply.
  const [bgDeliveryReliable, setBgDeliveryReliable] = useState(null);

  const isAndroid = typeof window.AndroidBridge !== 'undefined';

  const checkBgDelivery = () => {
    if (isAndroid && typeof window.AndroidBridge.isBackgroundDeliveryReliable === 'function') {
      setBgDeliveryReliable(window.AndroidBridge.isBackgroundDeliveryReliable());
    }
  };

  useEffect(() => {
    checkBgDelivery();
    // Re-check whenever the user comes back to this tab/page — e.g. after
    // returning from the system battery-optimization settings screen.
    const onVisible = () => { if (!document.hidden) checkBgDelivery(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []); // eslint-disable-line

  const handleFixBgDelivery = () => {
    if (isAndroid && typeof window.AndroidBridge.requestBackgroundDeliveryPermission === 'function') {
      window.AndroidBridge.requestBackgroundDeliveryPermission();
    }
  };

  // Capture PWA install prompt
  useEffect(() => {
    const handler = (e) => { e.preventDefault(); setInstallPrompt(e); };
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => setInstalled(true));
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') setInstalled(true);
    setInstallPrompt(null);
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Navbar />
      <Box sx={{ maxWidth: 600, mx: 'auto', p: { xs: 2, md: 3 } }}>

        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Typography variant="h5" fontWeight={700}>{t('settingsTitle')}</Typography>
          <Button variant="outlined" onClick={onBack}>← Back</Button>
        </Box>

        {/* Background notification reliability — only relevant inside the Android app */}
        {isAndroid && bgDeliveryReliable === false && (
          <Alert
            severity="warning"
            sx={{ mb: 2 }}
            action={
              <Button color="inherit" size="small" onClick={handleFixBgDelivery}>
                FIX NOW
              </Button>
            }
          >
            <Typography fontWeight={700}>Notifications may be delayed</Typography>
            <Typography variant="body2">
              NearSell doesn't have permission to run in the background on this
              phone yet. Merchant-arrival alerts may be slow or missed while the
              app is minimized. Tap "Fix Now" and choose "Allow" / "No restrictions".
            </Typography>
          </Alert>
        )}
        {isAndroid && bgDeliveryReliable === true && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Background notifications are set up correctly on this device.
          </Alert>
        )}

        {/* Appearance */}
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="subtitle2" color="text.secondary" fontWeight={600} mb={2}>
              APPEARANCE
            </Typography>

            {/* Dark Mode */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <DarkModeRounded color="action" />
                <Box>
                  <Typography fontWeight={600}>{t('darkMode')}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Saves battery on AMOLED screens
                  </Typography>
                </Box>
              </Box>
              <Switch checked={darkMode} onChange={toggleDarkMode} color="primary" />
            </Box>

            <Divider sx={{ my: 1.5 }} />

            {/* Language */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <LanguageRounded color="action" />
                <Box>
                  <Typography fontWeight={600}>{t('language')}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    மொழி தேர்வு / Language selection
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Chip label="English" onClick={() => language !== 'en' && toggleLanguage()}
                  color={language === 'en' ? 'primary' : 'default'}
                  variant={language === 'en' ? 'filled' : 'outlined'}
                  sx={{ cursor: 'pointer', fontWeight: 600 }} />
                <Chip label="தமிழ்" onClick={() => language !== 'ta' && toggleLanguage()}
                  color={language === 'ta' ? 'primary' : 'default'}
                  variant={language === 'ta' ? 'filled' : 'outlined'}
                  sx={{ cursor: 'pointer', fontWeight: 600 }} />
              </Box>
            </Box>
          </CardContent>
        </Card>

        {/* PWA Install */}
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="subtitle2" color="text.secondary" fontWeight={600} mb={2}>
              APP INSTALL
            </Typography>
            {installed ? (
              <Alert severity="success">✅ NearSell is installed on your phone!</Alert>
            ) : installPrompt ? (
              <Box>
                <Typography variant="body2" color="text.secondary" mb={1.5}>
                  Install NearSell on your home screen for the best experience — works like a real app, no Play Store needed.
                </Typography>
                <Button variant="contained" fullWidth onClick={handleInstall}>
                  📲 Install NearSell App
                </Button>
              </Box>
            ) : (
              <Alert severity="info" sx={{ fontSize: 13 }}>
                To install: tap the browser menu (⋮) → "Add to Home Screen"
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* UPI QR — merchants only */}
        {user?.role === 'merchant' && <UPISection user={user} t={t} />}

        {/* Address Book — buyers only */}
        {user?.role === 'buyer' && <AddressBook t={t} />}

      </Box>
    </Box>
  );
}
