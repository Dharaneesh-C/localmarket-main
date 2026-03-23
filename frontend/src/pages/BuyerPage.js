import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Grid, Card, CardContent, Typography, Button,
  Chip, TextField, InputAdornment, CircularProgress, Alert,
  Dialog, DialogTitle, DialogContent, DialogActions, IconButton,
  Divider, Fade, Tab, Tabs, Select, MenuItem, FormControl,
  InputLabel, Collapse, Slider, Rating,
} from '@mui/material';
import {
  SearchRounded, CloseRounded,
  DirectionsRounded, StorefrontRounded, RefreshRounded,
  ShoppingCartRounded, ListAltRounded, AddRounded, RemoveRounded,
  FilterAltRounded, SortRounded, TuneRounded,
} from '@mui/icons-material';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { getNearbyProducts, placeOrder, getMyOrders, submitReview } from '../utils/api';
import { stopAlarm } from '../utils/alarm';

// Fix leaflet icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const userIcon = L.divIcon({
  html: `<div style="width:18px;height:18px;background:#378ADD;border-radius:50%;border:3px solid white;box-shadow:0 0 0 3px rgba(55,138,221,0.3)"></div>`,
  iconSize: [18, 18], iconAnchor: [9, 9], className: '',
});

const merchantIcon = L.divIcon({
  html: `<div style="background:#1D9E75;width:32px;height:32px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3)"></div>`,
  iconSize: [32, 32], iconAnchor: [16, 32], className: '',
});

function RecenterMap({ center }) {
  const map = useMap();
  useEffect(() => { if (center) map.setView(center, 14); }, [center, map]);
  return null;
}

const CATEGORY_EMOJI = { 'Vegetables & Fruits': '🥦', Dairy: '🥛', 'Handmade Goods': '🧶', 'Cooked Food': '🍱', Other: '📦' };
const getCategoryEmoji = (cat) => CATEGORY_EMOJI[cat] || '📦';
const CATEGORIES = ['All', 'Vegetables & Fruits', 'Dairy', 'Handmade Goods', 'Cooked Food', 'Other'];

const statusColor = { pending: 'warning', accepted: 'success', rejected: 'error', completed: 'success' };
const statusLabel = { pending: '⏳ Pending', accepted: '✅ Accepted', rejected: '❌ Rejected', completed: '🎉 Completed' };

// ─── Order Dialog ─────────────────────────────────────────────────────────────
function OrderDialog({ product, userLocation, onClose, onSuccess }) {
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const totalPrice = parseFloat((product.price * quantity).toFixed(2));

  const handleOrder = async () => {
    setLoading(true);
    setError('');
    try {
      await placeOrder({
        product_id: product.id,
        product_title: product.title,
        quantity,
        unit: product.unit,
        total_price: totalPrice,
        merchant_id: product.merchant_id,
        merchant_name: product.merchant_name,
        buyer_location: userLocation
          ? { type: 'Point', coordinates: [userLocation[1], userLocation[0]] }
          : null,
        note: note.trim() || null,
      });
      onSuccess();
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to place order. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography fontWeight={700}>Place Order</Typography>
        <IconButton onClick={onClose}><CloseRounded /></IconButton>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ bgcolor: '#E1F5EE', borderRadius: 2, p: 2, mb: 2 }}>
          <Typography fontWeight={600}>{product.title}</Typography>
          <Typography variant="body2" color="text.secondary">by {product.merchant_name}</Typography>
          <Typography variant="h6" color="primary" fontWeight={700} mt={0.5}>
            ₹{product.price}/{product.unit}
          </Typography>
        </Box>

        <Typography variant="subtitle2" fontWeight={600} mb={1}>Quantity</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <IconButton
            onClick={() => setQuantity(Math.max(1, quantity - 1))}
            sx={{ border: '1px solid', borderColor: 'divider' }}
          >
            <RemoveRounded />
          </IconButton>
          <Typography variant="h6" fontWeight={700} sx={{ minWidth: 40, textAlign: 'center' }}>
            {quantity}
          </Typography>
          <IconButton
            onClick={() => setQuantity(quantity + 1)}
            sx={{ border: '1px solid', borderColor: 'divider' }}
          >
            <AddRounded />
          </IconButton>
          <Typography variant="body2" color="text.secondary">{product.unit}</Typography>
        </Box>

        <TextField
          label="Note to merchant (optional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          fullWidth
          multiline
          rows={2}
          placeholder="e.g. Please pack separately"
          sx={{ mb: 2 }}
        />

        <Box sx={{ bgcolor: '#f5f5f5', borderRadius: 2, p: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="body2" color="text.secondary">Total</Typography>
            <Typography variant="h6" fontWeight={700} color="primary">₹{totalPrice}</Typography>
          </Box>
          {userLocation && (
            <Typography variant="caption" color="text.secondary">
              📍 Your location will be shared with the merchant
            </Typography>
          )}
        </Box>

        {error && <Alert severity="error" sx={{ mt: 1.5 }}>{error}</Alert>}
      </DialogContent>
      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button onClick={onClose} variant="outlined">Cancel</Button>
        <Button
          onClick={handleOrder}
          variant="contained"
          disabled={loading}
          startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <ShoppingCartRounded />}
          fullWidth
        >
          {loading ? 'Placing...' : `Order — ₹${totalPrice}`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ─── Review Form ─────────────────────────────────────────────────────────────
function ReviewForm({ order, onDone }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async () => {
    if (!rating) return;
    setLoading(true);
    try {
      await submitReview({
        order_id: order.id,
        product_id: order.product_id,
        merchant_id: order.merchant_id,
        rating,
        comment: comment.trim() || null,
      });
      setDone(true);
      onDone();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (done) return <Alert severity="success" sx={{ mt: 1 }}>Thanks for your review! ⭐</Alert>;

  return (
    <Box sx={{ mt: 1.5, bgcolor: '#F5F7F6', borderRadius: 2, p: 1.5 }}>
      <Typography variant="caption" fontWeight={600} color="text.secondary" display="block" mb={0.5}>
        RATE THIS ORDER
      </Typography>
      <Rating
        value={rating}
        onChange={(_, v) => setRating(v)}
        size="large"
      />
      <TextField
        placeholder="Write a comment (optional)"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        fullWidth size="small" multiline rows={2}
        sx={{ mt: 1, mb: 1 }}
      />
      <Button
        size="small" variant="contained" onClick={handleSubmit}
        disabled={!rating || loading}
      >
        {loading ? <CircularProgress size={16} color="inherit" /> : 'Submit Review'}
      </Button>
    </Box>
  );
}

// ─── My Orders Tab ────────────────────────────────────────────────────────────
function MyOrdersTab() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reviewed, setReviewed] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getMyOrders();
      setOrders(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>;

  if (orders.length === 0) return (
    <Card sx={{ p: 5, textAlign: 'center', mt: 2 }}>
      <ListAltRounded sx={{ fontSize: 56, color: 'text.disabled', mb: 1 }} />
      <Typography variant="h6" color="text.secondary">No orders yet</Typography>
      <Typography variant="body2" color="text.disabled">Your placed orders will appear here</Typography>
    </Card>
  );

  return (
    <Box sx={{ mt: 2 }}>
      <Button size="small" variant="outlined" onClick={load} sx={{ mb: 2 }}>Refresh</Button>
      <Grid container spacing={2}>
        {orders.map((o) => (
          <Grid item xs={12} sm={6} key={o.id}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography fontWeight={600} noWrap sx={{ maxWidth: '60%' }}>{o.product_title}</Typography>
                  <Chip
                    label={statusLabel[o.status] || o.status}
                    size="small"
                    color={statusColor[o.status] || 'default'}
                  />
                </Box>
                <Typography variant="body2" color="text.secondary">from {o.merchant_name}</Typography>
                <Typography variant="body2" mt={0.5}>
                  {o.quantity} {o.unit} × ₹{(o.total_price / o.quantity).toFixed(0)} = <strong>₹{o.total_price}</strong>
                </Typography>
                {o.note && <Typography variant="caption" color="text.secondary">Note: {o.note}</Typography>}
                <Typography variant="caption" color="text.disabled" display="block" mt={0.5}>
                  {new Date(o.created_at).toLocaleString()}
                </Typography>
                {/* Review form for completed orders */}
                {o.status === 'completed' && !reviewed[o.id] && (
                  <ReviewForm order={o} onDone={() => setReviewed(r => ({...r, [o.id]: true}))} />
                )}
                {reviewed[o.id] && (
                  <Alert severity="success" sx={{ mt: 1 }}>Review submitted! ⭐</Alert>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}

// ─── Main BuyerPage ───────────────────────────────────────────────────────────
export default function BuyerPage() {
  const { saveLocation } = useAuth();
  const { notifications } = useNotifications();
  const [products, setProducts] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [orderProduct, setOrderProduct] = useState(null);
  const [locationError, setLocationError] = useState('');
  const [activeTab, setActiveTab] = useState(0);
  const [orderSuccess, setOrderSuccess] = useState('');
  const [alarmNotif, setAlarmNotif] = useState(null);
  // Filters
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedMerchant, setSelectedMerchant] = useState('All');
  const [sortBy, setSortBy] = useState('distance'); // distance | price_asc | price_desc
  const [radius, setRadius] = useState(20); // km

  const loadProducts = useCallback(async (lat, lng, r) => {
    setLoading(true);
    try {
      const res = await getNearbyProducts(lat, lng, r || radius);
      setProducts(res.data);
      setFiltered(res.data);
    } catch (e) {
      console.error('Failed to load products', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setUserLocation([latitude, longitude]);
        saveLocation(latitude, longitude);
        loadProducts(latitude, longitude);
      },
      () => {
        setLocationError('Location access denied. Using default location (Mettupalayam).');
        const fallback = [11.3027, 76.9389];
        setUserLocation(fallback);
        loadProducts(fallback[0], fallback[1]);
      }
    );
  }, [loadProducts, saveLocation]);

  useEffect(() => {
    if (notifications.length > 0) {
      const latest = notifications[0];
      if (latest && latest.type === 'merchant_arrived' && !latest.read) {
        setAlarmNotif(latest);
      }
      if (userLocation) {
        loadProducts(userLocation[0], userLocation[1]);
      }
    }
  }, [notifications.length]); // eslint-disable-line

  const dismissAlarm = () => {
    stopAlarm();
    setAlarmNotif(null);
  };

  useEffect(() => {
    const q = search.toLowerCase();
    let result = products.filter(p =>
      (p.title.toLowerCase().includes(q) ||
       p.category.toLowerCase().includes(q) ||
       p.merchant_name.toLowerCase().includes(q))
      && (selectedCategory === 'All' || p.category === selectedCategory)
      && (selectedMerchant === 'All' || p.merchant_name === selectedMerchant)
    );
    // Sort
    if (sortBy === 'distance') result.sort((a, b) => (a.distance_km || 0) - (b.distance_km || 0));
    else if (sortBy === 'price_asc') result.sort((a, b) => a.price - b.price);
    else if (sortBy === 'price_desc') result.sort((a, b) => b.price - a.price);
    setFiltered(result);
  }, [search, products, selectedCategory, selectedMerchant, sortBy]);

  const openDirections = (product) => {
    const [lng, lat] = product.merchant_location.coordinates;
    window.open(`https://www.openstreetmap.org/directions?from=&to=${lat},${lng}`, '_blank');
  };

  const handleOrderSuccess = () => {
    setOrderProduct(null);
    setSelectedProduct(null);
    setOrderSuccess('Order placed! The merchant has been notified. 🎉');
    setTimeout(() => setOrderSuccess(''), 5000);
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Navbar />

      {/* 🔔 Merchant Arrived Alarm Banner */}
      {alarmNotif && (
        <Box sx={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
          bgcolor: '#FF6B35', color: 'white',
          p: 2, textAlign: 'center',
          boxShadow: '0 4px 20px rgba(255,107,53,0.6)',
          animation: 'pulse 0.5s ease-in-out infinite alternate',
          '@keyframes pulse': {
            from: { opacity: 1 },
            to: { opacity: 0.85 },
          },
        }}>
          <Typography variant="h5" fontWeight={800} sx={{ letterSpacing: 1 }}>
            🔔 YOUR MERCHANT HAS ARRIVED! 🔔
          </Typography>
          <Typography variant="body1" sx={{ mt: 0.5, opacity: 0.95 }}>
            {alarmNotif.body}
          </Typography>
          <Button
            variant="outlined"
            onClick={dismissAlarm}
            sx={{ mt: 1.5, color: 'white', borderColor: 'white', fontWeight: 700,
              '&:hover': { bgcolor: 'rgba(255,255,255,0.2)', borderColor: 'white' } }}
          >
            ✅ OK, I Got It — Stop Alarm
          </Button>
        </Box>
      )}

      <Box sx={{ maxWidth: 1100, mx: 'auto', p: { xs: 2, md: 3 }, mt: alarmNotif ? '140px' : 0 }}>

        <Box sx={{ mb: 3 }}>
          <Typography variant="h5" fontWeight={700}>Nearby Products 📍</Typography>
          <Typography variant="body2" color="text.secondary">Merchants selling in your area right now</Typography>
        </Box>

        {/* Tabs */}
        <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ mb: 2 }}>
          <Tab label="Browse Products" icon={<StorefrontRounded fontSize="small" />} iconPosition="start" />
          <Tab label="My Orders" icon={<ListAltRounded fontSize="small" />} iconPosition="start" />
        </Tabs>

        {/* ── Browse Tab ── */}
        {activeTab === 0 && (
          <>
            {locationError && <Alert severity="warning" sx={{ mb: 2 }}>{locationError}</Alert>}
            {orderSuccess && <Alert severity="success" sx={{ mb: 2 }}>{orderSuccess}</Alert>}

            {/* Search + Filter bar */}
            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', gap: 1, mb: 1.5 }}>
                <TextField
                  placeholder="Search products, merchants..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  fullWidth size="small"
                  InputProps={{ startAdornment: <InputAdornment position="start"><SearchRounded color="action" /></InputAdornment> }}
                />
                <Button
                  variant="outlined" size="small"
                  startIcon={<TuneRounded />}
                  onClick={() => setShowFilters(v => !v)}
                  sx={{ whiteSpace: 'nowrap', minWidth: 100,
                    ...(showFilters && { bgcolor: '#E1F5EE', borderColor: 'primary.main', color: 'primary.main' })
                  }}
                >
                  Filters {(selectedCategory !== 'All' || selectedMerchant !== 'All' || sortBy !== 'distance') &&
                    <Chip label={[selectedCategory !== 'All', selectedMerchant !== 'All', sortBy !== 'distance'].filter(Boolean).length}
                      size="small" color="primary" sx={{ ml: 0.5, height: 18, fontSize: 10 }} />}
                </Button>
                <Button variant="outlined" size="small" startIcon={<RefreshRounded />}
                  onClick={() => userLocation && loadProducts(userLocation[0], userLocation[1])}>
                  Refresh
                </Button>
              </Box>

              {/* Expandable filter panel */}
              <Collapse in={showFilters}>
                <Box sx={{ bgcolor: '#F5F7F6', borderRadius: 2, p: 2, mb: 1.5 }}>

                  {/* Category filter chips */}
                  <Typography variant="caption" fontWeight={600} color="text.secondary" display="block" mb={1}>
                    <FilterAltRounded sx={{ fontSize: 13, mr: 0.5, verticalAlign: 'middle' }} />
                    CATEGORY
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                    {CATEGORIES.map((cat) => (
                      <Chip
                        key={cat}
                        label={cat === 'All' ? '📦 All' : `${getCategoryEmoji(cat)} ${cat}`}
                        size="small"
                        onClick={() => setSelectedCategory(cat)}
                        sx={{
                          cursor: 'pointer',
                          fontWeight: selectedCategory === cat ? 700 : 400,
                          bgcolor: selectedCategory === cat ? '#1D9E75' : 'white',
                          color: selectedCategory === cat ? 'white' : 'text.primary',
                          border: '1px solid',
                          borderColor: selectedCategory === cat ? '#1D9E75' : '#e0e0e0',
                          '&:hover': { bgcolor: selectedCategory === cat ? '#0F6E56' : '#E1F5EE' },
                        }}
                      />
                    ))}
                  </Box>

                  {/* Radius slider */}
                  <Typography variant="caption" fontWeight={600} color="text.secondary" display="block" mb={1}>
                    📍 SEARCH RADIUS — {radius} km
                  </Typography>
                  <Slider
                    value={radius}
                    min={1} max={50} step={1}
                    marks={[{value:1,label:'1km'},{value:10,label:'10km'},{value:25,label:'25km'},{value:50,label:'50km'}]}
                    onChange={(_, v) => setRadius(v)}
                    onChangeCommitted={(_, v) => {
                      if (userLocation) loadProducts(userLocation[0], userLocation[1], v);
                    }}
                    sx={{ mb: 3, color: '#1D9E75' }}
                  />

                  <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    {/* Merchant filter */}
                    <FormControl size="small" sx={{ minWidth: 200, flex: 1 }}>
                      <InputLabel>Filter by Merchant</InputLabel>
                      <Select
                        value={selectedMerchant}
                        label="Filter by Merchant"
                        onChange={(e) => setSelectedMerchant(e.target.value)}
                      >
                        <MenuItem value="All">All Merchants</MenuItem>
                        {[...new Set(products.map(p => p.merchant_name))].sort().map(name => (
                          <MenuItem key={name} value={name}>
                            🏪 {name} ({products.filter(p => p.merchant_name === name).length} items)
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>

                    {/* Sort */}
                    <FormControl size="small" sx={{ minWidth: 180, flex: 1 }}>
                      <InputLabel><SortRounded sx={{ fontSize: 14, mr: 0.5 }} />Sort By</InputLabel>
                      <Select
                        value={sortBy}
                        label="Sort By"
                        onChange={(e) => setSortBy(e.target.value)}
                      >
                        <MenuItem value="distance">📍 Nearest First</MenuItem>
                        <MenuItem value="price_asc">₹ Price: Low to High</MenuItem>
                        <MenuItem value="price_desc">₹₹ Price: High to Low</MenuItem>
                      </Select>
                    </FormControl>
                  </Box>

                  {/* Active filters summary + clear */}
                  {(selectedCategory !== 'All' || selectedMerchant !== 'All' || sortBy !== 'distance') && (
                    <Box sx={{ mt: 1.5, display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                      <Typography variant="caption" color="text.secondary">Active:</Typography>
                      {selectedCategory !== 'All' && (
                        <Chip label={selectedCategory} size="small" color="primary" variant="outlined"
                          onDelete={() => setSelectedCategory('All')} />
                      )}
                      {selectedMerchant !== 'All' && (
                        <Chip label={selectedMerchant} size="small" color="secondary" variant="outlined"
                          onDelete={() => setSelectedMerchant('All')} />
                      )}
                      {sortBy !== 'distance' && (
                        <Chip label={sortBy === 'price_asc' ? 'Price ↑' : 'Price ↓'} size="small" variant="outlined"
                          onDelete={() => setSortBy('distance')} />
                      )}
                      <Button size="small" color="error" sx={{ fontSize: 11, py: 0 }}
                        onClick={() => { setSelectedCategory('All'); setSelectedMerchant('All'); setSortBy('distance'); }}>
                        Clear All
                      </Button>
                    </Box>
                  )}
                </Box>
              </Collapse>

              {/* Result count */}
              <Typography variant="caption" color="text.secondary">
                Showing {filtered.length} of {products.length} products
                {selectedCategory !== 'All' && ` in ${selectedCategory}`}
                {selectedMerchant !== 'All' && ` from ${selectedMerchant}`}
              </Typography>
            </Box>

            {userLocation && (
              <Box sx={{ borderRadius: 3, overflow: 'hidden', border: '1px solid #e0e0e0', mb: 3 }}>
                <MapContainer center={userLocation} zoom={14} style={{ width: '100%', height: '380px' }}>
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <RecenterMap center={userLocation} />
                  <Marker position={userLocation} icon={userIcon}>
                    <Popup><b>You are here</b></Popup>
                  </Marker>
                  {filtered.map((p) => {
                    const [lng, lat] = p.merchant_location.coordinates;
                    return (
                      <Marker key={p.id} position={[lat, lng]} icon={merchantIcon}>
                        <Popup>
                          <Box sx={{ minWidth: 160 }}>
                            <Typography fontWeight={600} fontSize={13}>{p.title}</Typography>
                            <Typography fontSize={12} color="text.secondary">{p.merchant_name}</Typography>
                            <Typography fontSize={13} fontWeight={700} color="primary.main">₹{p.price}/{p.unit}</Typography>
                            <Typography fontSize={12} color="text.secondary">📍 {p.distance_km} km away</Typography>
                            <Button size="small" variant="contained" fullWidth sx={{ mt: 0.5, fontSize: 11 }}
                              onClick={() => setOrderProduct(p)}>
                              Order Now
                            </Button>
                          </Box>
                        </Popup>
                      </Marker>
                    );
                  })}
                </MapContainer>
              </Box>
            )}

            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
            ) : filtered.length === 0 ? (
              <Card sx={{ p: 5, textAlign: 'center' }}>
                <StorefrontRounded sx={{ fontSize: 56, color: 'text.disabled', mb: 1 }} />
                <Typography variant="h6" color="text.secondary">No products found nearby</Typography>
              </Card>
            ) : (
              <Grid container spacing={2}>
                {filtered.map((p) => (
                  <Grid item xs={12} sm={6} md={4} key={p.id}>
                    <Fade in>
                      <Card sx={{ cursor: 'pointer', transition: 'all 0.2s', '&:hover': { transform: 'translateY(-2px)', boxShadow: 4 } }}>
                        {p.image_url ? (
                          <Box component="img" src={p.image_url} alt={p.title}
                            sx={{ width: '100%', height: 130, objectFit: 'cover' }}
                            onError={(e) => { e.target.style.display = 'none'; }} />
                        ) : (
                          <Box sx={{ height: 90, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            bgcolor: '#E1F5EE', fontSize: 38 }}>
                            {getCategoryEmoji(p.category)}
                          </Box>
                        )}
                        <CardContent>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                            <Chip label={p.category} size="small" sx={{ bgcolor: '#E1F5EE', color: '#0F6E56', fontSize: 11 }} />
                            <Typography variant="caption" color="text.secondary">📍 {p.distance_km} km</Typography>
                          </Box>
                          <Typography variant="subtitle1" fontWeight={600} noWrap>{p.title}</Typography>
                          <Typography variant="caption" color="text.secondary" display="block" noWrap>{p.description}</Typography>

                          {/* Rating */}
                          {p.rating_count > 0 && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                              <Rating value={p.rating_avg} precision={0.1} size="small" readOnly />
                              <Typography variant="caption" color="text.secondary">({p.rating_count})</Typography>
                            </Box>
                          )}

                          {/* Stock badge */}
                          {p.stock !== null && p.stock !== undefined && (
                            <Chip
                              label={p.sold_out ? 'Sold Out' : `${p.stock} left`}
                              size="small"
                              sx={{ mt: 0.5, fontSize: 10,
                                bgcolor: p.sold_out ? '#ffebee' : '#E1F5EE',
                                color: p.sold_out ? '#c62828' : '#0F6E56',
                              }}
                            />
                          )}

                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
                            <Typography variant="h6" color="primary" fontWeight={700}>
                              ₹{p.price}
                              <Typography component="span" variant="caption" color="text.secondary">/{p.unit}</Typography>
                            </Typography>
                            <Typography variant="caption" color="text.secondary">by {p.merchant_name}</Typography>
                          </Box>
                          <Box sx={{ display: 'flex', gap: 1, mt: 1.5 }}>
                            <Button size="small" variant="outlined" fullWidth
                              onClick={() => setSelectedProduct(p)}>
                              Details
                            </Button>
                            <Button size="small" variant="contained" fullWidth
                              startIcon={<ShoppingCartRounded fontSize="small" />}
                              onClick={() => setOrderProduct(p)}
                              disabled={p.sold_out}>
                              {p.sold_out ? 'Sold Out' : 'Order'}
                            </Button>
                          </Box>
                        </CardContent>
                      </Card>
                    </Fade>
                  </Grid>
                ))}
              </Grid>
            )}
          </>
        )}

        {/* ── My Orders Tab ── */}
        {activeTab === 1 && <MyOrdersTab />}
      </Box>

      {/* Product Detail Dialog */}
      <Dialog open={!!selectedProduct} onClose={() => setSelectedProduct(null)} maxWidth="sm" fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}>
        {selectedProduct && (
          <>
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography fontWeight={700}>{selectedProduct.title}</Typography>
              <IconButton onClick={() => setSelectedProduct(null)}><CloseRounded /></IconButton>
            </DialogTitle>
            <DialogContent>
              {selectedProduct.image_url && (
                <Box component="img" src={selectedProduct.image_url} alt={selectedProduct.title}
                  sx={{ width: '100%', borderRadius: 2, mb: 2, maxHeight: 200, objectFit: 'cover' }} />
              )}
              <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                <Chip label={selectedProduct.category} size="small" />
                <Chip label={`📍 ${selectedProduct.distance_km} km away`} size="small" color="primary" variant="outlined" />
              </Box>
              <Typography variant="body2" color="text.secondary" mb={2}>{selectedProduct.description}</Typography>
              <Typography variant="h5" color="primary" fontWeight={700} mb={2}>
                ₹{selectedProduct.price}
                <Typography component="span" variant="body2" color="text.secondary"> per {selectedProduct.unit}</Typography>
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Box sx={{ bgcolor: 'background.default', borderRadius: 2, p: 2, mb: 2 }}>
                <Typography variant="subtitle2" fontWeight={600} mb={1}>Merchant Info</Typography>
                <Typography variant="body2">👤 {selectedProduct.merchant_name}</Typography>
                {selectedProduct.merchant_phone && (
                  <Typography variant="body2">📞 {selectedProduct.merchant_phone}</Typography>
                )}
              </Box>
              <Box sx={{ display: 'flex', gap: 1.5 }}>
                <Button fullWidth variant="outlined" startIcon={<DirectionsRounded />}
                  onClick={() => openDirections(selectedProduct)}>
                  Directions
                </Button>
                <Button fullWidth variant="contained" startIcon={<ShoppingCartRounded />}
                  onClick={() => { setSelectedProduct(null); setOrderProduct(selectedProduct); }}>
                  Order Now
                </Button>
              </Box>
            </DialogContent>
          </>
        )}
      </Dialog>

      {/* Order Dialog */}
      {orderProduct && (
        <OrderDialog
          product={orderProduct}
          userLocation={userLocation}
          onClose={() => setOrderProduct(null)}
          onSuccess={handleOrderSuccess}
        />
      )}
    </Box>
  );
}
