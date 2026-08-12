import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  FavoriteRounded, FavoriteBorderRounded, RepeatRounded, PaymentsRounded,
  MicRounded, MicOffRounded, CancelRounded, PhoneRounded,
} from '@mui/icons-material';

import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { getNearbyProducts, placeOrder, getMyOrders, submitReview, toggleFavourite, confirmPayment, getAddresses, cancelOrder } from '../utils/api';

import { stopAlarm } from '../utils/alarm';
import { useVoiceSearch } from '../hooks/useVoiceSearch';
import LiveTrackingMap from '../components/LiveTrackingMap';
import OrderChat from '../components/OrderChat';
import BuyerDashboard from '../components/BuyerDashboard';
import MerchantPublicPage from './MerchantPublicPage';
import { ProductGridSkeleton, OrderCardSkeleton } from '../components/Skeletons';
import SettingsPage from './SettingsPage';
import { useSettings } from '../context/SettingsContext';
import { QRCodeSVG } from 'qrcode.react';

const CATEGORY_EMOJI = { 'Vegetables & Fruits': '🥦', Dairy: '🥛', 'Handmade Goods': '🧶', 'Cooked Food': '🍱', Other: '📦' };
const getCategoryEmoji = (cat) => CATEGORY_EMOJI[cat] || '📦';
const CATEGORIES = ['All', 'Vegetables & Fruits', 'Dairy', 'Handmade Goods', 'Cooked Food', 'Other'];

const statusColor = { pending: 'warning', accepted: 'success', rejected: 'error', completed: 'success', cancelled: 'default' };
const statusLabel = { pending: '⏳ Pending', accepted: '✅ Accepted', rejected: '❌ Rejected', completed: '🎉 Completed', cancelled: '🚫 Cancelled' };
const PAGE_SIZE = 12;

// ─── Order Dialog ─────────────────────────────────────────────────────────────
function OrderDialog({ product, userLocation, onClose, onSuccess }) {
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState(null); // null = live GPS
  const ADDR_ICONS = { Home: '🏠', Work: '💼', 'வீடு': '🏠', 'வேலை': '💼' };

  useEffect(() => {
    getAddresses().then(r => setSavedAddresses(r.data || [])).catch(() => {});
  }, []);

  const totalPrice = parseFloat((product.price * quantity).toFixed(2));

  const getBuyerLocation = () => {
    if (selectedAddress)
      return { type: 'Point', coordinates: [selectedAddress.lng, selectedAddress.lat] };
    return userLocation
      ? { type: 'Point', coordinates: [userLocation[1], userLocation[0]] }
      : null;
  };

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
        merchant_upi_id: product.merchant_upi_id || null,
        buyer_location: getBuyerLocation(),
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

        {/* Product summary */}
        <Box sx={{ bgcolor: '#E1F5EE', borderRadius: 2, p: 2, mb: 2 }}>
          <Typography fontWeight={600}>{product.title}</Typography>
          <Typography variant="body2" color="text.secondary">by {product.merchant_name}</Typography>
          <Typography variant="h6" color="primary" fontWeight={700} mt={0.5}>
            ₹{product.price}/{product.unit}
          </Typography>
        </Box>

        {/* Quantity */}
        <Typography variant="subtitle2" fontWeight={600} mb={1}>Quantity</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <IconButton onClick={() => setQuantity(Math.max(1, quantity - 1))}
            sx={{ border: '1px solid', borderColor: 'divider' }}>
            <RemoveRounded />
          </IconButton>
          <Typography variant="h6" fontWeight={700} sx={{ minWidth: 40, textAlign: 'center' }}>
            {quantity}
          </Typography>
          <IconButton onClick={() => setQuantity(quantity + 1)}
            sx={{ border: '1px solid', borderColor: 'divider' }}>
            <AddRounded />
          </IconButton>
          <Typography variant="body2" color="text.secondary">{product.unit}</Typography>
        </Box>

        {/* Delivery location picker */}
        <Typography variant="subtitle2" fontWeight={600} mb={1}>📍 Delivery Location</Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.8, mb: 2 }}>
          <Box onClick={() => setSelectedAddress(null)} sx={{
            p: 1.5, borderRadius: 2, cursor: 'pointer', border: '2px solid',
            borderColor: selectedAddress === null ? 'primary.main' : 'divider',
            bgcolor: selectedAddress === null ? '#E1F5EE' : 'transparent',
          }}>
            <Typography variant="body2" fontWeight={600}>📱 Current GPS location</Typography>
            {userLocation && (
              <Typography variant="caption" color="text.secondary">
                {userLocation[0].toFixed(4)}, {userLocation[1].toFixed(4)}
              </Typography>
            )}
          </Box>
          {savedAddresses.map(a => (
            <Box key={a.id} onClick={() => setSelectedAddress(a)} sx={{
              p: 1.5, borderRadius: 2, cursor: 'pointer', border: '2px solid',
              borderColor: selectedAddress?.id === a.id ? 'primary.main' : 'divider',
              bgcolor: selectedAddress?.id === a.id ? '#E1F5EE' : 'transparent',
            }}>
              <Typography variant="body2" fontWeight={600}>
                {ADDR_ICONS[a.label] || '📍'} {a.label}
              </Typography>
              <Typography variant="caption" color="text.secondary" noWrap>
                {a.address_text}
              </Typography>
            </Box>
          ))}
        </Box>

        {/* Note */}
        <TextField label="Note to merchant (optional)" value={note}
          onChange={(e) => setNote(e.target.value)}
          fullWidth multiline rows={2}
          placeholder="e.g. Please pack separately" sx={{ mb: 2 }}
        />

        {/* Total */}
        <Box sx={{ bgcolor: '#f5f5f5', borderRadius: 2, p: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="body2" color="text.secondary">Total</Typography>
            <Typography variant="h6" fontWeight={700} color="primary">₹{totalPrice}</Typography>
          </Box>
          <Typography variant="caption" color="text.secondary">
            {selectedAddress
              ? `🏠 Delivering to: ${selectedAddress.label}`
              : '📱 Using current GPS location'}
          </Typography>
        </Box>

        {error && <Alert severity="error" sx={{ mt: 1.5 }}>{error}</Alert>}
      </DialogContent>
      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button onClick={onClose} variant="outlined">Cancel</Button>
        <Button onClick={handleOrder} variant="contained" disabled={loading}
          startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <ShoppingCartRounded />}
          fullWidth>
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

// ─── UPI Pay Button ────────────────────────────────────────────────────────────
function UPIPayButton({ order }) {
  const [open, setOpen] = useState(false);
  const upiUrl = `upi://pay?pa=${order.merchant_upi_id}&pn=${encodeURIComponent(order.merchant_name)}&am=${order.total_price}&cu=INR&tn=NearSell+Order`;
  return (
    <>
      <Button size="small" variant="outlined" fullWidth sx={{ mt: 1, borderColor: '#FF6B35', color: '#FF6B35' }}
        onClick={() => setOpen(true)}>
        💸 Pay ₹{order.total_price} via UPI
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="xs" fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Typography fontWeight={700}>Scan to Pay</Typography>
          <IconButton onClick={() => setOpen(false)}><CloseRounded /></IconButton>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ textAlign: 'center', py: 2 }}>
            <Box sx={{ display: 'inline-block', p: 2, bgcolor: 'white', borderRadius: 2, boxShadow: 3 }}>
              <QRCodeSVG value={upiUrl} size={200} level="H" />
            </Box>
            <Typography variant="body2" mt={2}>UPI: <strong>{order.merchant_upi_id}</strong></Typography>
            <Chip label={`Pay ₹${order.total_price}`} color="primary" sx={{ mt: 1, fontWeight: 700, fontSize: 15 }} />
            <Typography variant="caption" color="text.secondary" display="block" mt={1}>
              Works with PhonePe, GPay, Paytm, BHIM & all UPI apps
            </Typography>
          </Box>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── My Orders Tab ────────────────────────────────────────────────────────────
function MyOrdersTab({ onReorder, buyerLocation }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reviewed, setReviewed] = useState({});
  const [confirmedPayments, setConfirmedPayments] = useState({});
  const [cancellingId, setCancellingId] = useState(null);

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

  const handleConfirmPayment = async (orderId) => {
    try {
      await confirmPayment(orderId);
      setConfirmedPayments(p => ({ ...p, [orderId]: true }));
    } catch (e) { console.error(e); }
  };

  const handleCancel = async (orderId) => {
    if (!window.confirm('Cancel this order? This cannot be undone.')) return;
    setCancellingId(orderId);
    try {
      await cancelOrder(orderId);
      await load(); // refresh list
    } catch (e) { console.error(e); }
    finally { setCancellingId(null); }
  };

  if (loading) return <Box sx={{ mt: 2 }}><OrderCardSkeleton count={4} /></Box>;

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

                {/* 📡 Live tracking map for accepted orders */}
                {o.status === 'accepted' && (
                  <LiveTrackingMap order={o} buyerLocation={buyerLocation} />
                )}

                {/* 💬 Chat for active orders */}
                {['pending', 'accepted'].includes(o.status) && (
                  <OrderChat orderId={o.id} orderStatus={o.status} />
                )}

                {/* Cancel Order — only for pending */}
                {o.status === 'pending' && (
                  <Button
                    size="small" variant="outlined" fullWidth color="error"
                    startIcon={cancellingId === o.id ? <CircularProgress size={14} color="inherit" /> : <CancelRounded />}
                    sx={{ mt: 1 }}
                    disabled={cancellingId === o.id}
                    onClick={() => handleCancel(o.id)}
                  >
                    {cancellingId === o.id ? 'Cancelling...' : 'Cancel Order'}
                  </Button>
                )}

                {/* Repeat Order button */}
                <Button
                  size="small" variant="outlined" fullWidth
                  startIcon={<RepeatRounded />}
                  sx={{ mt: 1 }}
                  onClick={() => onReorder(o)}
                >
                  Repeat Order
                </Button>

                {/* UPI QR Pay button */}
                {o.status === 'completed' && o.merchant_upi_id && (
                  <UPIPayButton order={o} />
                )}

                {/* COD Confirmation */}
                {o.status === 'completed' && !o.payment_confirmed && !confirmedPayments[o.id] && (
                  <Button
                    size="small" variant="contained" fullWidth
                    startIcon={<PaymentsRounded />}
                    sx={{ mt: 1, bgcolor: '#1D9E75' }}
                    onClick={() => handleConfirmPayment(o.id)}
                  >
                    💵 Confirm Cash Payment
                  </Button>
                )}
                {(o.payment_confirmed || confirmedPayments[o.id]) && (
                  <Alert severity="success" sx={{ mt: 1, py: 0.5 }}>💵 Cash payment confirmed</Alert>
                )}

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
  const { notifications, markRead } = useNotifications();
  const { t } = useSettings();
  const [showSettings, setShowSettings] = useState(false);
  const [products, setProducts] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [orderProduct, setOrderProduct] = useState(null);
  const [reorderProduct, setReorderProduct] = useState(null);
  const [locationError, setLocationError] = useState('');
  const [activeTab, setActiveTab] = useState(0);
  const [orderSuccess, setOrderSuccess] = useState('');
  const [alarmNotif, setAlarmNotif] = useState(null);
  const [viewMerchantId, setViewMerchantId] = useState(null);
  const [activeOrders, setActiveOrders] = useState([]); // accepted orders for live tracking
  const [favourites, setFavourites] = useState(() => {
    try { return JSON.parse(localStorage.getItem('favourites') || '[]'); } catch { return []; }
  });
  // Filters
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedMerchant, setSelectedMerchant] = useState('All');
  const [sortBy, setSortBy] = useState('distance'); // distance | price_asc | price_desc
  const [radius, setRadius] = useState(20); // km
  const [voiceLang, setVoiceLang] = useState('ta-IN'); // Tamil default
  const [searchHistory, setSearchHistory] = useState(() => {
    try { return JSON.parse(localStorage.getItem('nearsell_search_history') || '[]'); } catch { return []; }
  });
  const [showHistory, setShowHistory] = useState(false);

  const saveSearchHistory = (term) => {
    if (!term.trim()) return;
    const updated = [term, ...searchHistory.filter(s => s !== term)].slice(0, 5);
    setSearchHistory(updated);
    localStorage.setItem('nearsell_search_history', JSON.stringify(updated));
  };

  // Voice search
  const { listening, supported: voiceSupported, error: voiceError,
    startListening, stopListening } = useVoiceSearch({
    onResult: (text) => { setSearch(text); saveSearchHistory(text); },
    language: voiceLang,
  });

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
  }, [radius]); // eslint-disable-line react-hooks/exhaustive-deps

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

  // BUG FIX: previously this effect depended on [notifications.length] to detect
  // "a new arrival happened." That's fragile — it only reacts to the array
  // literally growing, but dismissAlarm() below never marked the notification
  // read, so the app's read/unread state was never consistent with what the
  // buyer actually saw. Combined with remounts (switching tabs) or multiple
  // notifications landing in the same poll batch, the length-based check could
  // miss a genuinely new arrival, leaving "Stop Alarm" never reappearing.
  //
  // FIX: track the id of the last notification we've already alerted on, in a
  // ref. Any render where the newest unread 'merchant_arrived' notification has
  // a DIFFERENT id than the last one we alerted on re-triggers the banner —
  // this is correct regardless of array length transitions, batched inserts,
  // or component remounts.
  // BUG FIX (found after real-device testing): previously this only looked at
  // notifications[0] — the single newest item. But buyers also receive other
  // notification types (order_update, payment_confirmed, order_cancelled). If
  // ANY of those arrives around the same time as/after a merchant_arrived
  // notification, it gets prepended in front of it, pushing the arrival to
  // index 1+ — and checking only index 0 would silently miss it. This is what
  // caused "Stop Alarm sometimes appears, sometimes doesn't": it depended
  // entirely on whether an unrelated notification happened to land on top.
  //
  // FIX: scan the whole array for the newest unread 'merchant_arrived' entry,
  // not just the newest entry overall.
  const lastAlertedIdRef = useRef(null);

  useEffect(() => {
    const latestArrival = notifications.find(
      (n) => n.type === 'merchant_arrived' && !n.read
    );

    if (latestArrival && latestArrival.id !== lastAlertedIdRef.current) {
      lastAlertedIdRef.current = latestArrival.id;
      setAlarmNotif(latestArrival);
    }

    if (userLocation) {
      loadProducts(userLocation[0], userLocation[1]);
    }
  }, [notifications, userLocation, loadProducts]);

  const dismissAlarm = () => {
    stopAlarm();
    // BUG FIX: previously the notification was never marked read here, so its
    // `read` flag stayed false forever — inconsistent with what the buyer had
    // actually acknowledged, both locally and on the backend.
    if (alarmNotif?.id) {
      markRead(alarmNotif.id);
    }
    setAlarmNotif(null);
  };

  // Poll for active (accepted) orders to show live tracking on Browse tab
  const loadActiveOrders = useCallback(async () => {
    try {
      const res = await getMyOrders();
      setActiveOrders((res.data || []).filter(o => o.status === 'accepted'));
    } catch (e) {}
  }, []);

  useEffect(() => {
    loadActiveOrders();
    const interval = setInterval(loadActiveOrders, 15000);
    return () => clearInterval(interval);
  }, [loadActiveOrders]);

  const handleToggleFavourite = async (merchant_id, merchant_name) => {
    try {
      const res = await toggleFavourite({ merchant_id, merchant_name });
      const updated = res.data.favourites || [];
      setFavourites(updated);
      localStorage.setItem('favourites', JSON.stringify(updated));
    } catch (e) { console.error(e); }
  };

  const isFavourite = (merchant_id) => favourites.some(f => f.merchant_id === merchant_id);

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
    setVisibleCount(PAGE_SIZE); // reset pagination on filter change
  }, [search, products, selectedCategory, selectedMerchant, sortBy]); // eslint-disable-line

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

  if (showSettings) return <SettingsPage onBack={() => setShowSettings(false)} />;
  if (viewMerchantId) return (
    <MerchantPublicPage
      merchantId={viewMerchantId}
      userLocation={userLocation}
      onBack={() => setViewMerchantId(null)}
      onOrder={(p) => { setViewMerchantId(null); setOrderProduct(p); }}
    />
  );

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Navbar onOpenSettings={() => setShowSettings(true)} />

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

        <BuyerDashboard
          favourites={favourites}
          onReorder={(order) => {
            setReorderProduct({
              id: order.product_id,
              title: order.product_title,
              price: order.total_price / order.quantity,
              unit: order.unit,
              merchant_id: order.merchant_id,
              merchant_name: order.merchant_name,
              sold_out: false,
            });
          }}
          onViewFavourites={(merchantName) => {
            if (merchantName) setSelectedMerchant(merchantName);
            setShowFilters(true);
          }}
        />

        {/* Tabs */}
        <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ mb: 2 }}>
          <Tab label={t('browseProducts')} icon={<StorefrontRounded fontSize="small" />} iconPosition="start" />
          <Tab label={t('myOrders')} icon={<ListAltRounded fontSize="small" />} iconPosition="start" />
        </Tabs>

        {/* ── Browse Tab ── */}
        {activeTab === 0 && (
          <>
            {locationError && <Alert severity="warning" sx={{ mb: 2 }}>{locationError}</Alert>}
            {orderSuccess && <Alert severity="success" sx={{ mb: 2 }}>{orderSuccess}</Alert>}

            {/* Search + Filter bar */}
            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', gap: 1, mb: 1.5, position: 'relative' }}>
                <TextField
                  placeholder={listening ? '🎤 Listening...' : t('searchPlaceholder')}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onFocus={() => setShowHistory(true)}
                  onBlur={() => setTimeout(() => setShowHistory(false), 200)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { saveSearchHistory(search); setShowHistory(false); } }}
                  fullWidth size="small"
                  sx={listening ? { '& .MuiOutlinedInput-root': { borderColor: '#FF6B35', boxShadow: '0 0 0 2px rgba(255,107,53,0.2)' } } : {}}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchRounded color="action" />
                      </InputAdornment>
                    ),
                    endAdornment: voiceSupported ? (
                      <InputAdornment position="end">
                        {/* Language toggle */}
                        <Chip
                          label={voiceLang === 'ta-IN' ? '🇮🇳 த' : '🇮🇳 EN'}
                          size="small"
                          onClick={() => setVoiceLang(v => v === 'ta-IN' ? 'en-IN' : 'ta-IN')}
                          sx={{ mr: 0.5, fontSize: 10, cursor: 'pointer', height: 20 }}
                        />
                        {/* Mic button */}
                        <IconButton
                          size="small"
                          onClick={listening ? stopListening : startListening}
                          sx={{
                            color: listening ? '#FF6B35' : 'text.secondary',
                            animation: listening ? 'micPulse 1s ease-in-out infinite' : 'none',
                            '@keyframes micPulse': {
                              '0%,100%': { transform: 'scale(1)' },
                              '50%': { transform: 'scale(1.2)' },
                            },
                          }}
                        >
                          {listening ? <MicRounded /> : <MicOffRounded />}
                        </IconButton>
                      </InputAdornment>
                    ) : null,
                  }}
                />
                {voiceError && (
                  <Typography variant="caption" color="error" sx={{ position: 'absolute', mt: 5, zIndex: 1 }}>
                    {voiceError}
                  </Typography>
                )}
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

              {/* Recent search history chips */}
              {showHistory && searchHistory.length > 0 && (
                <Box sx={{
                  position: 'absolute', zIndex: 100, left: 0, right: 0,
                  bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider',
                  borderRadius: 2, p: 1.5, boxShadow: 3, mt: 0.5,
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="caption" fontWeight={600} color="text.secondary">🕐 RECENT SEARCHES</Typography>
                    <Button size="small" color="error" sx={{ fontSize: 10, py: 0, minWidth: 0 }}
                      onClick={() => { setSearchHistory([]); localStorage.removeItem('nearsell_search_history'); }}>
                      Clear
                    </Button>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 0.8, flexWrap: 'wrap' }}>
                    {searchHistory.map(term => (
                      <Chip
                        key={term}
                        label={term}
                        size="small"
                        onClick={() => { setSearch(term); setShowHistory(false); saveSearchHistory(term); }}
                        sx={{ cursor: 'pointer', fontSize: 12 }}
                      />
                    ))}
                  </Box>
                </Box>
              )}

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

            {/* Live tracking banner — shows when any accepted order exists */}
            {activeOrders.length > 0 && (
              <Box sx={{ mb: 3 }}>
                {activeOrders.map(o => (
                  <Box key={o.id} sx={{ mb: 2 }}>
                    <Box sx={{
                      bgcolor: '#FF6B35', color: 'white', px: 2, py: 1,
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      borderRadius: '8px 8px 0 0',
                    }}>
                      <Typography fontWeight={700} fontSize={14}>
                        🛥 {o.merchant_name} is on the way with your order!
                      </Typography>
                      <Button size="small" onClick={() => setActiveTab(1)}
                        sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.6)', fontSize: 11 }}
                        variant="outlined">Track</Button>
                    </Box>
                    <LiveTrackingMap order={o} buyerLocation={userLocation} />
                  </Box>
                ))}
              </Box>
            )}

            {loading ? (
              <ProductGridSkeleton count={6} />
            ) : filtered.length === 0 ? (
              <Card sx={{ p: 5, textAlign: 'center' }}>
                <StorefrontRounded sx={{ fontSize: 56, color: 'text.disabled', mb: 1 }} />
                <Typography variant="h6" color="text.secondary">No products found nearby</Typography>
              </Card>
            ) : (
              <>
              <Grid container spacing={2}>
                {filtered.slice(0, visibleCount).map((p) => (
                  <Grid item xs={12} sm={6} md={4} key={p.id}>
                    <Fade in>
                      <Card sx={{ cursor: 'pointer', transition: 'all 0.2s', '&:hover': { transform: 'translateY(-2px)', boxShadow: 4 } }}>
                        {p.image_url ? (
                          <Box sx={{ position: 'relative' }}>
                            <Box component="img" src={p.image_url} alt={p.title}
                              loading="lazy"
                              sx={{ width: '100%', height: 130, objectFit: 'cover' }}
                              onError={(e) => { e.target.style.display = 'none'; }} />
                            {p.images && p.images.length > 1 && (
                              <Chip label={`📷 ${p.images.length}`} size="small"
                                sx={{ position: 'absolute', bottom: 6, right: 6, bgcolor: 'rgba(0,0,0,0.6)', color: 'white', height: 20 }} />
                            )}
                          </Box>
                        ) : (
                          <Box sx={{ height: 90, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            bgcolor: '#E1F5EE', fontSize: 38 }}>
                            {getCategoryEmoji(p.category)}
                          </Box>
                        )}
                        <CardContent sx={{ pb: '12px !important' }}>
                          {/* Top row: category + distance + fav */}
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                            <Chip label={p.category} size="small" sx={{ bgcolor: '#E1F5EE', color: '#0F6E56', fontSize: 10 }} />
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
                              <Typography variant="caption" color="text.secondary">📍 {p.distance_km}km</Typography>
                              <IconButton size="small"
                                onClick={(e) => { e.stopPropagation(); handleToggleFavourite(p.merchant_id, p.merchant_name); }}
                                sx={{ color: isFavourite(p.merchant_id) ? '#e53935' : 'text.disabled', p: 0.3 }}>
                                {isFavourite(p.merchant_id) ? <FavoriteRounded sx={{ fontSize: 16 }} /> : <FavoriteBorderRounded sx={{ fontSize: 16 }} />}
                              </IconButton>
                            </Box>
                          </Box>

                          {/* Title */}
                          <Typography variant="subtitle1" fontWeight={700} noWrap>{p.title}</Typography>

                          {/* Merchant + rating on same row */}
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 0.3 }}>
                            <Typography
                              variant="caption" color="primary" noWrap
                              sx={{ maxWidth: '55%', cursor: 'pointer', textDecoration: 'underline', textDecorationStyle: 'dotted' }}
                              onClick={(e) => { e.stopPropagation(); setViewMerchantId(p.merchant_id); }}
                            >
                              by {p.merchant_name}
                            </Typography>
                            {p.rating_count > 0 && (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
                                <Typography variant="caption" color="#EF9F27" fontWeight={700}>⭐ {p.rating_avg}</Typography>
                                <Typography variant="caption" color="text.disabled">({p.rating_count})</Typography>
                              </Box>
                            )}
                          </Box>

                          {/* Price row */}
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 1 }}>
                            <Typography variant="h6" color="primary" fontWeight={700} lineHeight={1}>
                              ₹{p.price}
                              <Typography component="span" variant="caption" color="text.secondary">/{p.unit}</Typography>
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                              {p.delivery_time_minutes && (
                                <Chip label={`⏱${p.delivery_time_minutes}m`} size="small"
                                  sx={{ fontSize: 9, height: 18, bgcolor: '#E1F5EE', color: '#0F6E56' }} />
                              )}
                              {(p.available_from || p.available_until) && (
                                <Chip
                                  label={`⏰ ${p.available_from || '00:00'}–${p.available_until || '23:59'}`}
                                  size="small"
                                  sx={{ fontSize: 9, height: 18, bgcolor: '#E6F1FB', color: '#185FA5' }}
                                />
                              )}
                              {p.sold_out && (
                                <Chip label="Sold Out" size="small"
                                  sx={{ fontSize: 9, height: 18, bgcolor: '#ffebee', color: '#c62828' }} />
                              )}
                            </Box>
                          </Box>

                          {/* Buttons */}
                          <Box sx={{ display: 'flex', gap: 1, mt: 1.2 }}>
                            <Button size="small" variant="outlined" fullWidth
                              sx={{ py: 0.5, fontSize: 12 }}
                              onClick={() => setSelectedProduct(p)}>
                              {t('details')}
                            </Button>
                            <Button size="small" variant="contained" fullWidth
                              sx={{ py: 0.5, fontSize: 12 }}
                              startIcon={<ShoppingCartRounded sx={{ fontSize: '14px !important' }} />}
                              onClick={() => setOrderProduct(p)}
                              disabled={p.sold_out}>
                              {p.sold_out ? t('soldOut') : t('order')}
                            </Button>
                          </Box>
                        </CardContent>
                      </Card>
                    </Fade>
                  </Grid>
                ))}
              </Grid>
              {/* Load More */}
              {visibleCount < filtered.length && (
                <Box sx={{ textAlign: 'center', mt: 3 }}>
                  <Typography variant="caption" color="text.secondary" display="block" mb={1}>
                    Showing {visibleCount} of {filtered.length} products
                  </Typography>
                  <Button
                    variant="outlined" size="large"
                    onClick={() => setVisibleCount(v => v + PAGE_SIZE)}
                    sx={{ minWidth: 180 }}
                  >
                    Load More ({Math.min(PAGE_SIZE, filtered.length - visibleCount)} more)
                  </Button>
                </Box>
              )}
              </>
            )}
          </>
        )}

        {/* ── My Orders Tab ── */}
        {activeTab === 1 && (
          <MyOrdersTab
            buyerLocation={userLocation}
            onReorder={(order) => {
              // Build a product-like object from the past order for OrderDialog
              setReorderProduct({
                id: order.product_id,
                title: order.product_title,
                price: order.total_price / order.quantity,
                unit: order.unit,
                merchant_id: order.merchant_id,
                merchant_name: order.merchant_name,
                sold_out: false,
              });
              setActiveTab(0); // switch to browse tab
            }}
          />
        )}
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
              {selectedProduct.images && selectedProduct.images.length > 1 ? (
                <Box sx={{ display: 'flex', gap: 1, overflowX: 'auto', mb: 2, pb: 0.5, scrollSnapType: 'x mandatory' }}>
                  {selectedProduct.images.map((url, idx) => (
                    <Box key={idx} component="img" src={url} alt={`${selectedProduct.title} ${idx + 1}`}
                      loading="lazy"
                      sx={{ minWidth: '85%', height: 200, borderRadius: 2, objectFit: 'cover', scrollSnapAlign: 'start' }} />
                  ))}
                </Box>
              ) : selectedProduct.image_url && (
                <Box component="img" src={selectedProduct.image_url} alt={selectedProduct.title}
                  loading="lazy"
                  sx={{ width: '100%', borderRadius: 2, mb: 2, maxHeight: 200, objectFit: 'cover' }} />
              )}
              <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                <Chip label={selectedProduct.category} size="small" />
                <Chip label={`📍 ${selectedProduct.distance_km} km away`} size="small" color="primary" variant="outlined" />
                {(selectedProduct.available_from || selectedProduct.available_until) && (
                  <Chip
                    label={`⏰ Available ${selectedProduct.available_from || '00:00'} – ${selectedProduct.available_until || '23:59'}`}
                    size="small" sx={{ bgcolor: '#E6F1FB', color: '#185FA5' }}
                  />
                )}
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
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 0.5 }}>
                    <Typography variant="body2">📞 {selectedProduct.merchant_phone}</Typography>
                    <Button
                      size="small" variant="outlined" color="success"
                      startIcon={<PhoneRounded />}
                      component="a"
                      href={`tel:${selectedProduct.merchant_phone}`}
                      sx={{ minWidth: 80, fontSize: 11 }}
                    >
                      Call
                    </Button>
                  </Box>
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

      {/* Repeat Order Dialog */}
      {reorderProduct && (
        <OrderDialog
          product={reorderProduct}
          userLocation={userLocation}
          onClose={() => setReorderProduct(null)}
          onSuccess={() => {
            setReorderProduct(null);
            setOrderSuccess('Repeat order placed! 🎉');
            setTimeout(() => setOrderSuccess(''), 5000);
          }}
        />
      )}
    </Box>
  );
}
