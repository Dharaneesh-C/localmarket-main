import React, { useState } from 'react';
import {
  Box, Card, CardContent, Typography, Button, TextField,
  Avatar, Alert, CircularProgress, Divider, Grid, Chip,
} from '@mui/material';
import {
  StorefrontRounded, EditRounded, SaveRounded,
  AccessTimeRounded, DeliveryDiningRounded,
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { updateMerchantProfile } from '../utils/api';
import Navbar from '../components/Navbar';

const IMGBB_API_KEY = process.env.REACT_APP_IMGBB_API_KEY || 'f4509acb17c6d5497685c228f5267be8';

export default function MerchantProfilePage({ onBack }) {
  const { user, refreshUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const [form, setForm] = useState({
    bio: user?.bio || '',
    photo_url: user?.photo_url || '',
    working_hours: user?.working_hours || '',
    delivery_time_minutes: user?.delivery_time_minutes || '',
  });

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('Please select an image.'); return; }
    if (file.size > 5 * 1024 * 1024) { setError('Image must be under 5MB.'); return; }

    setUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method: 'POST', body: formData });
      const data = await res.json();
      if (data.success) setForm(f => ({ ...f, photo_url: data.data.url }));
      else throw new Error('Upload failed');
    } catch (err) {
      setError('Photo upload failed. Try again.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    setError('');
    try {
      await updateMerchantProfile({
        bio: form.bio || null,
        photo_url: form.photo_url || null,
        working_hours: form.working_hours || null,
        delivery_time_minutes: form.delivery_time_minutes ? parseInt(form.delivery_time_minutes) : null,
      });
      await refreshUser();
      setSuccess('Profile updated successfully!');
      setEditing(false);
      setTimeout(() => setSuccess(''), 3000);
    } catch (e) {
      setError('Failed to update profile. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Navbar />
      <Box sx={{ maxWidth: 700, mx: 'auto', p: { xs: 2, md: 3 } }}>

        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Typography variant="h5" fontWeight={700}>My Profile</Typography>
          <Button variant="outlined" onClick={onBack}>← Back</Button>
        </Box>

        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
        {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

        <Card>
          <CardContent>
            {/* Photo + Name */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 3 }}>
              <Box sx={{ position: 'relative' }}>
                <Avatar
                  src={form.photo_url || user?.photo_url}
                  sx={{ width: 80, height: 80, bgcolor: 'primary.main', fontSize: 32 }}
                >
                  {user?.name?.[0]?.toUpperCase()}
                </Avatar>
                {editing && (
                  <Box
                    component="label"
                    sx={{
                      position: 'absolute', bottom: -4, right: -4,
                      bgcolor: 'primary.main', borderRadius: '50%',
                      width: 28, height: 28, display: 'flex',
                      alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', border: '2px solid white',
                    }}
                  >
                    {uploadingPhoto
                      ? <CircularProgress size={14} sx={{ color: 'white' }} />
                      : <EditRounded sx={{ fontSize: 14, color: 'white' }} />}
                    <input type="file" accept="image/*" hidden onChange={handlePhotoUpload} />
                  </Box>
                )}
              </Box>
              <Box>
                <Typography variant="h6" fontWeight={700}>{user?.name}</Typography>
                <Typography variant="body2" color="text.secondary">{user?.email}</Typography>
                <Typography variant="body2" color="text.secondary">{user?.phone}</Typography>
                <Chip label="Merchant" size="small" color="primary" sx={{ mt: 0.5 }} />
              </Box>
            </Box>

            <Divider sx={{ mb: 2 }} />

            {/* Stats */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={6}>
                <Box sx={{ textAlign: 'center', bgcolor: '#E1F5EE', borderRadius: 2, p: 2 }}>
                  <Typography variant="h5" fontWeight={700} color="primary">
                    {user?.rating_avg > 0 ? `⭐ ${user?.rating_avg}` : '—'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Rating ({user?.rating_count || 0} reviews)
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6}>
                <Box sx={{ textAlign: 'center', bgcolor: '#E1F5EE', borderRadius: 2, p: 2 }}>
                  <Typography variant="h5" fontWeight={700} color="primary">
                    <StorefrontRounded />
                  </Typography>
                  <Typography variant="caption" color="text.secondary">Active Merchant</Typography>
                </Box>
              </Grid>
            </Grid>

            {/* Bio */}
            <Typography variant="subtitle2" fontWeight={600} color="text.secondary" mb={1}>BIO</Typography>
            {editing ? (
              <TextField
                value={form.bio}
                onChange={(e) => setForm(f => ({ ...f, bio: e.target.value }))}
                fullWidth multiline rows={3}
                placeholder="Tell buyers about yourself, your products, your story..."
                sx={{ mb: 2 }}
              />
            ) : (
              <Typography variant="body2" color={user?.bio ? 'text.primary' : 'text.disabled'} sx={{ mb: 2 }}>
                {user?.bio || 'No bio added yet. Click Edit to add one.'}
              </Typography>
            )}

            <Divider sx={{ mb: 2 }} />

            {/* Working Hours */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <AccessTimeRounded fontSize="small" color="action" />
              <Typography variant="subtitle2" fontWeight={600} color="text.secondary">WORKING HOURS</Typography>
            </Box>
            {editing ? (
              <TextField
                value={form.working_hours}
                onChange={(e) => setForm(f => ({ ...f, working_hours: e.target.value }))}
                fullWidth size="small"
                placeholder="e.g. Mon-Sat 8AM-8PM, Sunday Closed"
                sx={{ mb: 2 }}
              />
            ) : (
              <Typography variant="body2" color={user?.working_hours ? 'text.primary' : 'text.disabled'} sx={{ mb: 2 }}>
                {user?.working_hours || 'Not set'}
              </Typography>
            )}

            {/* Delivery Time */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <DeliveryDiningRounded fontSize="small" color="action" />
              <Typography variant="subtitle2" fontWeight={600} color="text.secondary">DELIVERY TIME ESTIMATE</Typography>
            </Box>
            {editing ? (
              <TextField
                value={form.delivery_time_minutes}
                onChange={(e) => setForm(f => ({ ...f, delivery_time_minutes: e.target.value }))}
                fullWidth size="small" type="number"
                placeholder="Minutes — e.g. 30"
                inputProps={{ min: 1 }}
                sx={{ mb: 2 }}
              />
            ) : (
              <Typography variant="body2" color={user?.delivery_time_minutes ? 'text.primary' : 'text.disabled'} sx={{ mb: 2 }}>
                {user?.delivery_time_minutes ? `⏱ Ready in ${user.delivery_time_minutes} minutes` : 'Not set'}
              </Typography>
            )}

            <Divider sx={{ mb: 2 }} />

            {/* Actions */}
            {editing ? (
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button variant="outlined" onClick={() => setEditing(false)} fullWidth>Cancel</Button>
                <Button
                  variant="contained" onClick={handleSave} fullWidth
                  disabled={loading} startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <SaveRounded />}
                >
                  Save Profile
                </Button>
              </Box>
            ) : (
              <Button
                variant="contained" fullWidth startIcon={<EditRounded />}
                onClick={() => setEditing(true)}
              >
                Edit Profile
              </Button>
            )}
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}
