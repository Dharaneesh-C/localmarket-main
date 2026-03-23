import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box, Grid, Card, CardContent, Typography, Button, TextField,
  MenuItem, Chip, IconButton, Dialog, DialogTitle, DialogContent,
  DialogActions, Alert, CircularProgress, Switch,
  FormControlLabel, Divider, Avatar, LinearProgress, Tab, Tabs,
} from '@mui/material';
import {
  AddRounded, EditRounded, DeleteRounded, StorefrontRounded,
  InventoryRounded, CheckCircleRounded, PauseCircleRounded,
  CloudUploadRounded, CloseRounded, ListAltRounded,
  PersonPinCircleRounded, BarChartRounded,
} from '@mui/icons-material';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useAuth } from '../context/AuthContext';
import {
  createProduct, getMyProducts, updateProduct, deleteProduct,
  getMerchantDashboard, getMerchantOrders, updateOrderStatus, merchantArrived,
} from '../utils/api';
import MerchantRouteMap from '../components/MerchantRouteMap';
import OrderChat from '../components/OrderChat';
import BulkUpload from '../components/BulkUpload';
import MerchantProfilePage from './MerchantProfilePage';
import MerchantAnalyticsPage from './MerchantAnalyticsPage';
import SettingsPage from './SettingsPage';
import { useLiveLocationBroadcast } from '../hooks/useLiveLocationBroadcast';
import { useSettings } from '../context/SettingsContext';
import AreaSelector from '../components/AreaSelector';
import Navbar from '../components/Navbar';

// Fix leaflet icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const buyerIcon = L.divIcon({
  html: `<div style="background:#FF6B35;width:28px;height:28px;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;font-size:14px;">👤</div>`,
  iconSize: [28, 28], iconAnchor: [14, 14], className: '',
});

const statusColor = { pending: 'warning', accepted: 'success', rejected: 'error', completed: 'success' };
const statusLabel = { pending: '⏳ Pending', accepted: '✅ Accepted', rejected: '❌ Rejected', completed: '🎉 Completed' };

const IMGBB_API_KEY = process.env.REACT_APP_IMGBB_API_KEY || 'f4509acb17c6d5497685c228f5267be8';
const CATEGORIES = ['Vegetables & Fruits', 'Dairy', 'Handmade Goods', 'Cooked Food', 'Other'];
const emptyForm = { title: '', description: '', price: '', unit: 'piece', category: 'Vegetables & Fruits', image_url: '', stock: '', delivery_time_minutes: '', available_from: '', available_until: '' };

// ─── Image Uploader ───────────────────────────────────────────────────────────
function ImageUploader({ value, onChange }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [preview, setPreview] = useState(value || null);
  const [error, setError] = useState('');

  useEffect(() => { setPreview(value || null); }, [value]);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('Please select an image file.'); return; }
    if (file.size > 5 * 1024 * 1024) { setError('Image must be under 5MB.'); return; }

    setError('');
    setUploading(true);
    setUploadProgress(0);
    setPreview(URL.createObjectURL(file));

    try {
      const formData = new FormData();
      formData.append('image', file);
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 10, 90));
      }, 200);
      const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method: 'POST', body: formData });
      clearInterval(progressInterval);
      if (!response.ok) throw new Error('Upload failed');
      const data = await response.json();
      if (!data.success) throw new Error(data.error?.message || 'Upload failed');
      setPreview(data.data.url);
      onChange(data.data.url);
      setUploadProgress(100);
    } catch (err) {
      setError('Upload failed. Please try again.');
      setPreview(null);
    } finally {
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
      {preview && (
        <Box sx={{ position: 'relative', mb: 1.5, display: 'inline-block', width: '100%' }}>
          <Box component="img" src={preview} alt="Preview"
            sx={{ width: '100%', maxHeight: 200, objectFit: 'cover', borderRadius: 2, display: 'block' }} />
          {!uploading && (
            <IconButton size="small" onClick={handleRemove}
              sx={{ position: 'absolute', top: 6, right: 6, bgcolor: 'rgba(0,0,0,0.55)', color: 'white', '&:hover': { bgcolor: 'rgba(0,0,0,0.75)' } }}>
              <CloseRounded fontSize="small" />
            </IconButton>
          )}
        </Box>
      )}
      {uploading && (
        <Box sx={{ mb: 1.5 }}>
          <LinearProgress variant="determinate" value={uploadProgress} sx={{ borderRadius: 1 }} />
          <Typography variant="caption" color="text.secondary">Uploading... {uploadProgress}%</Typography>
        </Box>
      )}
      {!preview && !uploading && (
        <Box onClick={() => inputRef.current?.click()}
          sx={{ border: '2px dashed', borderColor: 'divider', borderRadius: 2, p: 3, textAlign: 'center', cursor: 'pointer', '&:hover': { borderColor: 'primary.main', bgcolor: '#E1F5EE' } }}>
          <CloudUploadRounded sx={{ fontSize: 36, color: 'text.disabled', mb: 1 }} />
          <Typography variant="body2" color="text.secondary">Click to upload image</Typography>
          <Typography variant="caption" color="text.disabled">JPG, PNG, WEBP — max 5MB</Typography>
        </Box>
      )}
      {preview && !uploading && (
        <Button size="small" variant="outlined" startIcon={<CloudUploadRounded />}
          onClick={() => inputRef.current?.click()} sx={{ mt: 0.5 }}>
          Change Image
        </Button>
      )}
      <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />
      {error && <Alert severity="error" sx={{ mt: 1 }} onClose={() => setError('')}>{error}</Alert>}
    </Box>
  );
}

// ─── Orders Tab ───────────────────────────────────────────────────────────────
function OrdersTab() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [arrivedId, setArrivedId] = useState(null);
  const [arrivedSuccess, setArrivedSuccess] = useState('');

  // Find first accepted order — broadcast live location for it
  const acceptedOrder = orders.find(o => o.status === 'accepted');
  useLiveLocationBroadcast(acceptedOrder?.id, !!acceptedOrder);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getMerchantOrders();
      setOrders(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleArrived = async (orderId) => {
    setArrivedId(orderId);
    try {
      await merchantArrived(orderId);
      setArrivedSuccess('🔔 Buyer has been alerted! Their phone is ringing.');
      setTimeout(() => setArrivedSuccess(''), 5000);
    } catch (e) {
      console.error(e);
    } finally {
      setArrivedId(null);
    }
  };

  const handleStatus = async (orderId, status) => {
    setUpdatingId(orderId);
    try {
      await updateOrderStatus(orderId, status);
      await load();
    } catch (e) {
      console.error(e);
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) return (
    <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
      <CircularProgress />
    </Box>
  );

  if (orders.length === 0) return (
    <Card sx={{ p: 5, textAlign: 'center', mt: 2 }}>
      <ListAltRounded sx={{ fontSize: 56, color: 'text.disabled', mb: 1 }} />
      <Typography variant="h6" color="text.secondary">No orders yet</Typography>
      <Typography variant="body2" color="text.disabled">When buyers place orders, they will appear here</Typography>
    </Card>
  );

  return (
    <Box sx={{ mt: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" fontWeight={600}>Incoming Orders</Typography>
        <Button size="small" variant="outlined" onClick={load}>Refresh</Button>
      </Box>
      {arrivedSuccess && <Alert severity="success" sx={{ mb: 2 }}>{arrivedSuccess}</Alert>}
              {acceptedOrder && (
                <Alert severity="info" sx={{ mb: 2 }}
                  icon={<Box sx={{ fontSize: 16 }}>📡</Box>}>
                  <strong>Live tracking active</strong> — Your location is being shared with the buyer every 10 seconds.
                </Alert>
              )}
      <Grid container spacing={2}>
        {orders.map((o) => {
          const buyerLoc = o.buyer_location;
          const hasBuyerMap = buyerLoc && buyerLoc.coordinates && buyerLoc.coordinates.length === 2;
          const bLng = hasBuyerMap ? buyerLoc.coordinates[0] : null;
          const bLat = hasBuyerMap ? buyerLoc.coordinates[1] : null;

          return (
            <Grid item xs={12} md={6} key={o.id}>
              <Card sx={{ border: o.status === 'pending' ? '2px solid #EF9F27' : '1px solid rgba(0,0,0,0.08)' }}>
                <CardContent>
                  {/* Header */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                    <Typography fontWeight={700} noWrap sx={{ maxWidth: '60%' }}>{o.product_title}</Typography>
                    <Chip label={statusLabel[o.status] || o.status} size="small" color={statusColor[o.status] || 'default'} />
                  </Box>

                  {/* Buyer info */}
                  <Typography variant="body2">👤 {o.buyer_name}</Typography>
                  {o.buyer_phone && <Typography variant="body2">📞 {o.buyer_phone}</Typography>}
                  <Typography variant="body2" mt={0.5}>
                    {o.quantity} {o.unit} — <strong>₹{o.total_price}</strong>
                  </Typography>
                  {o.note && (
                    <Typography variant="caption" color="text.secondary" display="block">📝 {o.note}</Typography>
                  )}
                  <Typography variant="caption" color="text.disabled" display="block" mb={1}>
                    {new Date(o.created_at).toLocaleString()}
                  </Typography>

                  {/* Buyer location mini map */}
                  {hasBuyerMap && (
                    <Box sx={{ borderRadius: 2, overflow: 'hidden', border: '1px solid #e0e0e0', mb: 1.5 }}>
                      <MapContainer
                        center={[bLat, bLng]}
                        zoom={15}
                        style={{ width: '100%', height: 180 }}
                        zoomControl={false}
                        dragging={false}
                        scrollWheelZoom={false}
                        attributionControl={false}
                      >
                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                        <Marker position={[bLat, bLng]} icon={buyerIcon}>
                          <Popup>{o.buyer_name}&apos;s location</Popup>
                        </Marker>
                      </MapContainer>
                      <Button
                        size="small" fullWidth startIcon={<PersonPinCircleRounded />}
                        onClick={() => window.open(`https://www.openstreetmap.org/?mlat=${bLat}&mlon=${bLng}&zoom=16`, '_blank')}
                        sx={{ borderRadius: 0, py: 0.5, fontSize: 11 }}
                      >
                        Open buyer location
                      </Button>
                    </Box>
                  )}

                  {/* 💬 Chat */}
                  {['pending', 'accepted'].includes(o.status) && (
                    <OrderChat orderId={o.id} orderStatus={o.status} />
                  )}

                  {/* Action buttons */}
                  {o.status === 'pending' && (
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button size="small" fullWidth variant="contained" color="success"
                        disabled={updatingId === o.id}
                        onClick={() => handleStatus(o.id, 'accepted')}>
                        {updatingId === o.id ? <CircularProgress size={16} color="inherit" /> : 'Accept'}
                      </Button>
                      <Button size="small" fullWidth variant="outlined" color="error"
                        disabled={updatingId === o.id}
                        onClick={() => handleStatus(o.id, 'rejected')}>
                        Reject
                      </Button>
                    </Box>
                  )}
                  {o.status === 'accepted' && (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      {/* Arrived alarm button */}
                      <Button
                        size="small" fullWidth variant="contained"
                        disabled={arrivedId === o.id}
                        onClick={() => handleArrived(o.id)}
                        sx={{
                          bgcolor: '#FF6B35',
                          '&:hover': { bgcolor: '#C4400A' },
                          fontWeight: 700,
                          fontSize: 13,
                          py: 1,
                        }}
                      >
                        {arrivedId === o.id
                          ? <CircularProgress size={16} color="inherit" />
                          : '🔔 I\'ve Arrived! Ring Buyer'}
                      </Button>
                      <Button size="small" fullWidth variant="outlined"
                        disabled={updatingId === o.id}
                        onClick={() => handleStatus(o.id, 'completed')}>
                        {updatingId === o.id ? <CircularProgress size={16} color="inherit" /> : '✅ Mark as Completed'}
                      </Button>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
}

// ─── Main MerchantPage ────────────────────────────────────────────────────────
export default function MerchantPage() {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [stats, setStats] = useState({});
  const [orders, setOrders] = useState([]);
  const { t } = useSettings();
  const [activeTab, setActiveTab] = useState(0);
  const [showProfile, setShowProfile] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
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
      const [prodRes, statsRes, ordersRes] = await Promise.all([
        getMyProducts(),
        getMerchantDashboard(),
        getMerchantOrders(),
      ]);
      setProducts(prodRes.data);
      setStats(statsRes.data);
      setOrders(ordersRes.data);
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

  if (showProfile) return <MerchantProfilePage onBack={() => setShowProfile(false)} />;
  if (showAnalytics) return <MerchantAnalyticsPage onBack={() => setShowAnalytics(false)} />;
  if (showSettings) return <SettingsPage onBack={() => setShowSettings(false)} />;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Navbar onOpenSettings={() => setShowSettings(true)} />
      <Box sx={{ maxWidth: 1100, mx: 'auto', p: { xs: 2, md: 3 } }}>

        {/* Header */}
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Typography variant="h5" fontWeight={700}>{t('welcomeMerchant')}, {user?.name} 👋</Typography>
            <Typography variant="body2" color="text.secondary">{t('manageProducts')}</Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Button variant="outlined" startIcon={<StorefrontRounded />} onClick={() => setShowProfile(true)}>
              {t('myProfile')}
            </Button>
            <Button variant="outlined" startIcon={<BarChartRounded />} onClick={() => setShowAnalytics(true)}
              sx={{ color: '#378ADD', borderColor: '#378ADD' }}>
              {t('analytics')}
            </Button>
            <Button variant="outlined" startIcon={<CloudUploadRounded />} onClick={() => setBulkOpen(true)}
              sx={{ color: '#9B59B6', borderColor: '#9B59B6' }}>
              Bulk Upload
            </Button>
            <Button variant="contained" startIcon={<AddRounded />} onClick={handleOpenAdd} size="large">
              {t('postNewProduct')}
            </Button>
          </Box>
        </Box>

        {success && <Alert severity="success" onClose={() => setSuccess('')} sx={{ mb: 2 }}>{success}</Alert>}

        {/* Tabs */}
        {(() => {
          const pendingCount = orders.filter(o => o.status === 'pending').length;
          return (
            <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ mb: 3 }}>
              <Tab label="My Products" icon={<StorefrontRounded fontSize="small" />} iconPosition="start" />
              <Tab
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                    Orders
                    {pendingCount > 0 && (
                      <Box sx={{
                        bgcolor: '#FF6B35', color: 'white',
                        borderRadius: '10px', fontSize: 10,
                        fontWeight: 700, px: 0.8, py: 0.1, lineHeight: 1.6,
                      }}>
                        {pendingCount}
                      </Box>
                    )}
                  </Box>
                }
                icon={<ListAltRounded fontSize="small" />}
                iconPosition="start"
              />
            </Tabs>
          );
        })()}

        {/* ── Orders Tab ── */}
        {activeTab === 1 && <OrdersTab />}

        {/* ── Products Tab ── */}
        {activeTab === 0 && (
          <>
            {/* Stats */}
            {(() => {
              const pendingOrders = orders.filter(o => o.status === 'pending').length;
              const activeOrders = orders.filter(o => o.status === 'accepted').length;
              const statCards = [
                { label: 'Total Products', value: stats.total_products || 0, icon: <InventoryRounded />, color: '#1D9E75' },
                { label: 'Active Listings', value: stats.active_products || 0, icon: <CheckCircleRounded />, color: '#1D9E75' },
                { label: 'Paused', value: stats.paused_products || 0, icon: <PauseCircleRounded />, color: '#EF9F27' },
                { label: 'Pending Orders', value: pendingOrders, icon: <ListAltRounded />, color: pendingOrders > 0 ? '#FF6B35' : '#888' },
                { label: 'Active Deliveries', value: activeOrders, icon: <PersonPinCircleRounded />, color: activeOrders > 0 ? '#378ADD' : '#888' },
              ];
              return (
                <Grid container spacing={2} sx={{ mb: 3 }}>
                  {statCards.map((s) => (
                    <Grid item xs={6} sm={4} md={2.4} key={s.label}>
                      <Card sx={{ border: (s.label === 'Pending Orders' && s.value > 0) ? '2px solid #FF6B35' : 'none' }}>
                        <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: '12px !important' }}>
                          <Avatar sx={{ bgcolor: s.color + '20', color: s.color, width: 36, height: 36 }}>{s.icon}</Avatar>
                          <Box>
                            <Typography variant="h6" fontWeight={700} lineHeight={1}>{s.value}</Typography>
                            <Typography variant="caption" color="text.secondary">{s.label}</Typography>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              );
            })()}

            {/* ── Live Delivery Route Map (Swiggy/Zomato style) ── */}
            <MerchantRouteMap orders={orders} onRefresh={loadData} />

            {/* Product listings */}
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
                        <Box component="img" src={p.image_url} alt={p.title}
                          sx={{ width: '100%', height: 140, objectFit: 'cover' }}
                          onError={(e) => { e.target.style.display = 'none'; }} />
                      )}
                      <CardContent>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Chip label={p.category} size="small" sx={{ bgcolor: '#E1F5EE', color: '#0F6E56', fontWeight: 500 }} />
                          <Chip label={p.is_active ? 'Live' : 'Paused'} size="small" color={p.is_active ? 'success' : 'warning'} />
                        </Box>
                        <Typography variant="h6" fontWeight={600} noWrap>{p.title}</Typography>
                        <Typography variant="body2" color="text.secondary" noWrap>{p.description}</Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5, flexWrap: 'wrap' }}>
                          <Typography variant="h6" color="primary" fontWeight={700}>₹{p.price}/{p.unit}</Typography>
                          {p.stock !== null && p.stock !== undefined && (
                            <Chip
                              label={p.stock <= 0 ? 'Sold Out' : `📦 ${p.stock} left`}
                              size="small"
                              sx={{ fontSize: 10,
                                bgcolor: p.stock <= 0 ? '#ffebee' : '#E1F5EE',
                                color: p.stock <= 0 ? '#c62828' : '#0F6E56',
                              }}
                            />
                          )}
                          {p.rating_count > 0 && (
                            <Typography variant="caption" color="text.secondary">⭐ {p.rating_avg} ({p.rating_count})</Typography>
                          )}
                          {(p.available_from || p.available_until) && (
                            <Chip
                              label={`⏰ ${p.available_from || '00:00'} – ${p.available_until || '23:59'}`}
                              size="small"
                              sx={{ fontSize: 9, bgcolor: '#E6F1FB', color: '#185FA5' }}
                            />
                          )}
                        </Box>
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
          </>
        )}

      </Box>

      {/* Bulk Upload Dialog */}
      <Dialog open={bulkOpen} onClose={() => setBulkOpen(false)} maxWidth="md" fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography fontWeight={700}>📦 Bulk Product Upload</Typography>
          <IconButton onClick={() => setBulkOpen(false)}><CloseRounded /></IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <BulkUpload
            merchantLocation={merchantLocation}
            deliveryArea={deliveryArea}
            onDone={() => { setBulkOpen(false); loadData(); }}
          />
        </DialogContent>
      </Dialog>

      {/* Add / Edit Product Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle fontWeight={700}>{editProduct ? 'Edit Product' : 'Post New Product'}</DialogTitle>
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
            <Grid item xs={12} sm={6}>
              <TextField
                label="Delivery Time (minutes, optional)"
                type="number"
                value={form.delivery_time_minutes}
                onChange={(e) => setForm({ ...form, delivery_time_minutes: e.target.value })}
                fullWidth
                placeholder="e.g. 30"
                inputProps={{ min: 1 }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Stock Quantity (leave empty = unlimited)"
                type="number"
                value={form.stock}
                onChange={(e) => setForm({ ...form, stock: e.target.value === '' ? '' : parseInt(e.target.value) })}
                fullWidth
                placeholder="e.g. 10"
                inputProps={{ min: 0 }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Box sx={{ bgcolor: '#F5F7F6', borderRadius: 2, p: 1.5, height: '100%', display: 'flex', alignItems: 'center' }}>
                <Typography variant="caption" color="text.secondary">
                  📦 Stock auto-pauses when it runs out. Leave empty for unlimited.
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Available From (IST, optional)"
                type="time"
                value={form.available_from}
                onChange={(e) => setForm({ ...form, available_from: e.target.value })}
                fullWidth InputLabelProps={{ shrink: true }}
                helperText="e.g. 06:00 for morning milk"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Available Until (IST, optional)"
                type="time"
                value={form.available_until}
                onChange={(e) => setForm({ ...form, available_until: e.target.value })}
                fullWidth InputLabelProps={{ shrink: true }}
                helperText="Product auto-pauses after this time"
              />
            </Grid>
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
