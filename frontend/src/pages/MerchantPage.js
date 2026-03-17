import React, { useState, useEffect } from 'react';
import {
  Box, Grid, Card, CardContent, Typography, Button, TextField,
  MenuItem, Chip, IconButton, Dialog, DialogTitle, DialogContent,
  DialogActions, Alert, CircularProgress, Fab, Tooltip, Switch,
  FormControlLabel, Divider, Avatar,
} from '@mui/material';
import {
  AddRounded, EditRounded, DeleteRounded, StorefrontRounded,
  InventoryRounded, CheckCircleRounded, PauseCircleRounded,
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { createProduct, getMyProducts, updateProduct, deleteProduct, getMerchantDashboard } from '../utils/api';
import AreaSelector from '../components/AreaSelector';
import Navbar from '../components/Navbar';

const CATEGORIES = ['Vegetables & Fruits', 'Dairy', 'Handmade Goods', 'Cooked Food', 'Other'];

const emptyForm = { title: '', description: '', price: '', unit: 'piece', category: 'Vegetables & Fruits', image_url: '' };

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

  useEffect(() => { loadData(); }, []);

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

        {/* Header */}
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

        {/* Stats */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[
            { label: 'Total Products', value: stats.total_products || 0, icon: <InventoryRounded />, color: '#1D9E75' },
            { label: 'Active Listings', value: stats.active_products || 0, icon: <CheckCircleRounded />, color: '#1D9E75' },
            { label: 'Paused', value: stats.paused_products || 0, icon: <PauseCircleRounded />, color: '#EF9F27' },
          ].map((s) => (
            <Grid item xs={12} sm={4} key={s.label}>
              <Card>
                <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar sx={{ bgcolor: s.color + '20', color: s.color }}>
                    {s.icon}
                  </Avatar>
                  <Box>
                    <Typography variant="h5" fontWeight={700}>{s.value}</Typography>
                    <Typography variant="body2" color="text.secondary">{s.label}</Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Products */}
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
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Chip
                        label={p.category}
                        size="small"
                        sx={{ bgcolor: '#E1F5EE', color: '#0F6E56', fontWeight: 500 }}
                      />
                      <Chip
                        label={p.is_active ? 'Live' : 'Paused'}
                        size="small"
                        color={p.is_active ? 'success' : 'warning'}
                      />
                    </Box>
                    <Typography variant="h6" fontWeight={600} noWrap>{p.title}</Typography>
                    <Typography variant="body2" color="text.secondary" noWrap>{p.description}</Typography>
                    <Typography variant="h6" color="primary" fontWeight={700} mt={1}>
                      ₹{p.price}/{p.unit}
                    </Typography>
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

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle fontWeight={700}>
          {editProduct ? 'Edit Product' : 'Post New Product'}
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ pt: 1 }}>
            <Grid item xs={12} sm={8}>
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
            <Grid item xs={12}>
              <TextField label="Image URL (optional)" value={form.image_url}
                onChange={(e) => setForm({ ...form, image_url: e.target.value })} fullWidth />
            </Grid>

            {!editProduct && (
              <Grid item xs={12}>
                <Typography variant="subtitle2" fontWeight={600} mb={1} color="text.secondary">
                  SET YOUR LOCATION & DELIVERY AREA
                </Typography>
                <AreaSelector
                  onAreaChange={setDeliveryArea}
                  onMerchantLocationChange={setMerchantLocation}
                />
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
