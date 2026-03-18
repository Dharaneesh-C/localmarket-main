import React, { useState, useEffect, useRef } from 'react';
import {
  Box, Grid, Card, CardContent, Typography, Button, TextField,
  MenuItem, Chip, IconButton, Dialog, DialogTitle, DialogContent,
  DialogActions, Alert, CircularProgress, Switch,
  FormControlLabel, Divider, Avatar, LinearProgress,
} from '@mui/material';
import {
  AddRounded, EditRounded, DeleteRounded, StorefrontRounded,
  InventoryRounded, CheckCircleRounded, PauseCircleRounded,
  CloudUploadRounded, CloseRounded,
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { createProduct, getMyProducts, updateProduct, deleteProduct, getMerchantDashboard } from '../utils/api';
import AreaSelector from '../components/AreaSelector';
import Navbar from '../components/Navbar';
// Image hosting via ImgBB (free — no Firebase Storage upgrade needed)
const IMGBB_API_KEY = process.env.REACT_APP_IMGBB_API_KEY || 'f4509acb17c6d5497685c228f5267be8';

const CATEGORIES = ['Vegetables & Fruits', 'Dairy', 'Handmade Goods', 'Cooked Food', 'Other'];
const emptyForm = { title: '', description: '', price: '', unit: 'piece', category: 'Vegetables & Fruits', image_url: '' };

// ─── Image Upload Component ───────────────────────────────────────────────────
function ImageUploader({ value, onChange }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [preview, setPreview] = useState(value || null);
  const [error, setError] = useState('');

  // Sync preview when value changes (e.g. on edit open)
  useEffect(() => {
    setPreview(value || null);
  }, [value]);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file (JPG, PNG, WEBP).');
      return;
    }
    // Validate size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be under 5MB.');
      return;
    }

    setError('');
    setUploading(true);
    setUploadProgress(0);

    // Show local preview immediately
    const localUrl = URL.createObjectURL(file);
    setPreview(localUrl);

    try {
      // Upload to ImgBB (free image hosting)
      const formData = new FormData();
      formData.append('image', file);

      // Simulate progress (ImgBB doesn't support progress events)
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 10, 90));
      }, 200);

      const response = await fetch(
        `https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`,
        { method: 'POST', body: formData }
      );

      clearInterval(progressInterval);

      if (!response.ok) throw new Error('Upload failed');

      const data = await response.json();
      if (!data.success) throw new Error(data.error?.message || 'Upload failed');

      const downloadURL = data.data.url;
      setPreview(downloadURL);
      onChange(downloadURL);
      setUploadProgress(100);
      setUploading(false);
    } catch (err) {
      setError('Upload failed. Please get a free API key from imgbb.com and add it as REACT_APP_IMGBB_API_KEY in your .env file.');
      setPreview(null);
      setUploading(false);
    }
  };

  const handleRemove = () => {
    setPreview(null);
    onChange('');
    setUploadProgress(0);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <Box>
      <Typography variant="subtitle2" fontWeight={600} color="text.secondary" mb={1}>
        PRODUCT IMAGE (OPTIONAL)
      </Typography>

      {/* Preview */}
      {preview && (
        <Box sx={{ position: 'relative', mb: 1.5, display: 'inline-block' }}>
          <Box
            component="img"
            src={preview}
            alt="Preview"
            sx={{ width: '100%', maxHeight: 200, objectFit: 'cover', borderRadius: 2, display: 'block' }}
          />
          {!uploading && (
            <IconButton
              size="small"
              onClick={handleRemove}
              sx={{
                position: 'absolute', top: 6, right: 6,
                bgcolor: 'rgba(0,0,0,0.55)', color: 'white',
                '&:hover': { bgcolor: 'rgba(0,0,0,0.75)' },
              }}
            >
              <CloseRounded fontSize="small" />
            </IconButton>
          )}
        </Box>
      )}

      {/* Upload progress bar */}
      {uploading && (
        <Box sx={{ mb: 1.5 }}>
          <LinearProgress variant="determinate" value={uploadProgress} sx={{ borderRadius: 1 }} />
          <Typography variant="caption" color="text.secondary">Uploading... {uploadProgress}%</Typography>
        </Box>
      )}

      {/* Upload button */}
      {!preview && !uploading && (
        <Box
          onClick={() => inputRef.current?.click()}
          sx={{
            border: '2px dashed',
            borderColor: 'divider',
            borderRadius: 2,
            p: 3,
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s',
            '&:hover': { borderColor: 'primary.main', bgcolor: '#E1F5EE' },
          }}
        >
          <CloudUploadRounded sx={{ fontSize: 36, color: 'text.disabled', mb: 1 }} />
          <Typography variant="body2" color="text.secondary">
            Click to upload image
          </Typography>
          <Typography variant="caption" color="text.disabled">
            JPG, PNG, WEBP — max 5MB
          </Typography>
        </Box>
      )}

      {/* Change image button when preview exists */}
      {preview && !uploading && (
        <Button
          size="small"
          variant="outlined"
          startIcon={<CloudUploadRounded />}
          onClick={() => inputRef.current?.click()}
          sx={{ mt: 0.5 }}
        >
          Change Image
        </Button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      {error && (
        <Alert severity="error" sx={{ mt: 1 }} onClose={() => setError('')}>{error}</Alert>
      )}
    </Box>
  );
}

// ─── Main MerchantPage ────────────────────────────────────────────────────────
export default function MerchantPage() {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [stats, setStats] = useState({});
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [deliveryArea, setDeliveryArea] = useState(null);
  const [merchantLocation, setMerchantLocation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadData = async () => {
    try {
      const [prodRes, statsRes] = await Promise.all([getMyProducts(), getMerchantDashboard()]);
      setProducts(prodRes.data);
      setStats(statsRes.data);
    } catch (e) {
      console.error(e);
    } finally {
      setPageLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []); // eslint-disable-line

  const handleOpenAdd = () => {
    setEditProduct(null);
    setForm(emptyForm);
    setDeliveryArea(null);
    setMerchantLocation(null);
    setError('');
    setDialogOpen(true);
  };

  const handleOpenEdit = (product) => {
    setEditProduct(product);
    setForm({
      title: product.title,
      description: product.description,
      price: product.price,
      unit: product.unit,
      category: product.category,
      image_url: product.image_url || '',
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    setError('');
    if (!form.title || !form.price || !form.category) {
      setError('Please fill in all required fields.');
      return;
    }
    if (!editProduct && (!deliveryArea || !merchantLocation)) {
      setError('Please set your location and draw a delivery area on the map.');
      return;
    }
    setLoading(true);
    try {
      if (editProduct) {
        await updateProduct(editProduct.id, { ...form, price: parseFloat(form.price) });
        setSuccess('Product updated successfully!');
      } else {
        await createProduct({
          ...form,
          price: parseFloat(form.price),
          delivery_area: deliveryArea,
          merchant_location: merchantLocation,
        });
        setSuccess('Product posted! Buyers in your area have been notified. 🎉');
      }
      setDialogOpen(false);
      loadData();
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to save product.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (product) => {
    try {
      await updateProduct(product.id, { is_active: !product.is_active });
      loadData();
    } catch (e) {}
  };

  const handleDelete = async (productId) => {
    if (!window.confirm('Delete this product?')) return;
    try {
      await deleteProduct(productId);
      loadData();
    } catch (e) {}
  };

  if (pageLoading) return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <CircularProgress />
    </Box>
  );

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Navbar />
      <Box sx={{ maxWidth: 1100, mx: 'auto', p: { xs: 2, md: 3 } }}>
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Typography variant="h5" fontWeight={700}>Welcome, {user?.name} 👋</Typography>
            <Typography variant="body2" color="text.secondary">Manage your products and reach buyers nearby</Typography>
          </Box>
          <Button variant="contained" startIcon={<AddRounded />} onClick={handleOpenAdd} size="large">
            Post New Product
          </Button>
        </Box>

        {success && <Alert severity="success" onClose={() => setSuccess('')} sx={{ mb: 2 }}>{success}</Alert>}

        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[
            { label: 'Total Products', value: stats.total_products || 0, icon: <InventoryRounded />, color: '#1D9E75' },
            { label: 'Active Listings', value: stats.active_products || 0, icon: <CheckCircleRounded />, color: '#1D9E75' },
            { label: 'Paused', value: stats.paused_products || 0, icon: <PauseCircleRounded />, color: '#EF9F27' },
          ].map((s) => (
            <Grid item xs={12} sm={4} key={s.label}>
              <Card>
                <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar sx={{ bgcolor: s.color + '20', color: s.color }}>{s.icon}</Avatar>
                  <Box>
                    <Typography variant="h5" fontWeight={700}>{s.value}</Typography>
                    <Typography variant="body2" color="text.secondary">{s.label}</Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        <Typography variant="h6" fontWeight={600} mb={2}>Your Listings</Typography>
        {products.length === 0 ? (
          <Card sx={{ p: 5, textAlign: 'center' }}>
            <StorefrontRounded sx={{ fontSize: 60, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" color="text.secondary">No products yet</Typography>
            <Typography variant="body2" color="text.disabled" mb={2}>Post your first product to start reaching buyers</Typography>
            <Button variant="contained" startIcon={<AddRounded />} onClick={handleOpenAdd}>Post First Product</Button>
          </Card>
        ) : (
          <Grid container spacing={2}>
            {products.map((p) => (
              <Grid item xs={12} sm={6} md={4} key={p.id}>
                <Card>
                  {p.image_url && (
                    <Box
                      component="img"
                      src={p.image_url}
                      alt={p.title}
                      sx={{ width: '100%', height: 140, objectFit: 'cover' }}
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  )}
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Chip label={p.category} size="small" sx={{ bgcolor: '#E1F5EE', color: '#0F6E56', fontWeight: 500 }} />
                      <Chip label={p.is_active ? 'Live' : 'Paused'} size="small" color={p.is_active ? 'success' : 'warning'} />
                    </Box>
                    <Typography variant="h6" fontWeight={600} noWrap>{p.title}</Typography>
                    <Typography variant="body2" color="text.secondary" noWrap>{p.description}</Typography>
                    <Typography variant="h6" color="primary" fontWeight={700} mt={1}>₹{p.price}/{p.unit}</Typography>
                    <Divider sx={{ my: 1.5 }} />
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <FormControlLabel
                        control={<Switch checked={p.is_active} onChange={() => handleToggleActive(p)} size="small" color="primary" />}
                        label={<Typography variant="caption">{p.is_active ? 'Active' : 'Paused'}</Typography>}
                        sx={{ m: 0 }}
                      />
                      <Box>
                        <IconButton size="small" onClick={() => handleOpenEdit(p)}><EditRounded fontSize="small" /></IconButton>
                        <IconButton size="small" color="error" onClick={() => handleDelete(p.id)}><DeleteRounded fontSize="small" /></IconButton>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Box>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle fontWeight={700}>{editProduct ? 'Edit Product' : 'Post New Product'}</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ pt: 1 }}>
            <Grid item xs={12} sm={4}>
              <TextField label="Product Name *" value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })} fullWidth />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField label="Category *" select value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })} fullWidth>
                {CATEGORIES.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Price (₹) *" type="number" value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })} fullWidth />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Unit" value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })} fullWidth
                placeholder="e.g. kg, dozen, piece, bottle" />
            </Grid>
            <Grid item xs={12}>
              <TextField label="Description" value={form.description} multiline rows={2}
                onChange={(e) => setForm({ ...form, description: e.target.value })} fullWidth />
            </Grid>

            {/* ── Image Upload ── */}
            <Grid item xs={12}>
              <ImageUploader
                value={form.image_url}
                onChange={(url) => setForm({ ...form, image_url: url })}
              />
            </Grid>

            {!editProduct && (
              <Grid item xs={12}>
                <Typography variant="subtitle2" fontWeight={600} mb={1} color="text.secondary">
                  SET YOUR LOCATION & DELIVERY AREA
                </Typography>
                <AreaSelector onAreaChange={setDeliveryArea} onMerchantLocationChange={setMerchantLocation} />
              </Grid>
            )}
          </Grid>
          {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
        </DialogContent>
        <DialogActions sx={{ p: 2.5, gap: 1 }}>
          <Button onClick={() => setDialogOpen(false)} variant="outlined">Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" disabled={loading} sx={{ minWidth: 140 }}>
            {loading ? <CircularProgress size={22} color="inherit" /> : editProduct ? 'Save Changes' : 'Post & Notify Buyers'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
