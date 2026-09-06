import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box, Grid, Card, CardContent, Typography, Button,
  Chip, TextField, InputAdornment, CircularProgress, Alert,
  Dialog, DialogTitle, DialogContent, DialogActions, IconButton,
  Divider, Fade, Select, MenuItem, FormControl,
  InputLabel, Collapse, Slider, Rating, useMediaQuery,
} from '@mui/material';
import {
  SearchRounded, CloseRounded,
  DirectionsRounded, StorefrontRounded, RefreshRounded,
  ShoppingCartRounded, ListAltRounded, AddRounded, RemoveRounded,
  FilterAltRounded, SortRounded, TuneRounded,
  FavoriteRounded, FavoriteBorderRounded, RepeatRounded, PaymentsRounded,
  MicRounded, MicOffRounded, CancelRounded, PhoneRounded,
  PlaceRounded, ChatBubbleRounded, NotificationsActiveRounded, DeleteOutlineRounded,
} from '@mui/icons-material';

import Navbar from '../components/Navbar';
import BottomNav from '../components/BottomNav';
import SideNav from '../components/SideNav';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { getNearbyProducts, placeOrder, getMyOrders, submitReview, toggleFavourite, confirmPayment, getAddresses, cancelOrder, getMessages, createReminder, getReminders, deleteReminder } from '../utils/api';

import { stopAlarm } from '../utils/alarm';
import { useVoiceSearch } from '../hooks/useVoiceSearch';
import { normalizeSearchQuery } from '../utils/searchNormalize';
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
    <Dialog open onClose={onClose} fullWidth
      maxWidth="xs"
      // BUG FIX (mobile UI audit): fullScreen on very small phones prevents
      // the modal's own scroll container fighting the viewport, and the
      // Slide-free default transition keeps this simple. maxWidth="xs" still
      // caps width on tablets/desktop; on phones the Paper's width:100%
      // (from fullWidth) plus this sx already constrains it — the real fix
      // for content overflow is inside (word-wrap, box-sizing), not here.
      PaperProps={{ sx: { borderRadius: 3, width: '100%', maxWidth: { xs: '100%', sm: 444 }, m: { xs: 1.5, sm: 3 } } }}>
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
        {/* BUG FIX (mobile UI audit): these cards previously used
            Typography `noWrap`, which sets white-space: nowrap with no
            overflow handling on the parent — so a long saved address (e.g.
            a full village/district/state/pincode string) rendered on a
            single line and spilled out past the card's right edge instead
            of wrapping, getting visually clipped by the dialog on narrow
            Android screens. Fixed by wrapping normally (word-break +
            overflow-wrap) and making sure each card is a proper
            box-sizing: border-box block that can't exceed the dialog width. */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.8, mb: 2, width: '100%' }}>
          <Box onClick={() => setSelectedAddress(null)} sx={{
            p: 1.5, borderRadius: 2, cursor: 'pointer', border: '2px solid',
            borderColor: selectedAddress === null ? 'primary.main' : 'divider',
            bgcolor: selectedAddress === null ? '#E1F5EE' : 'transparent',
            width: '100%', boxSizing: 'border-box', overflow: 'hidden',
          }}>
            <Typography variant="body2" fontWeight={600}>📱 Current GPS location</Typography>
            {userLocation && (
              <Typography variant="caption" color="text.secondary"
                sx={{ display: 'block', wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                {userLocation[0].toFixed(4)}, {userLocation[1].toFixed(4)}
              </Typography>
            )}
          </Box>
          {savedAddresses.map(a => (
            <Box key={a.id} onClick={() => setSelectedAddress(a)} sx={{
              p: 1.5, borderRadius: 2, cursor: 'pointer', border: '2px solid',
              borderColor: selectedAddress?.id === a.id ? 'primary.main' : 'divider',
              bgcolor: selectedAddress?.id === a.id ? '#E1F5EE' : 'transparent',
              width: '100%', boxSizing: 'border-box', overflow: 'hidden',
            }}>
              <Typography variant="body2" fontWeight={600}>
                {ADDR_ICONS[a.label] || '📍'} {a.label}
              </Typography>
              <Typography variant="caption" color="text.secondary"
                sx={{
                  display: 'block',
                  whiteSpace: 'normal',
                  wordBreak: 'break-word',
                  overflowWrap: 'break-word',
                }}>
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
// `compact`: mobile-only rendering mode. Instead of embedding the full
// LiveTrackingMap and OrderChat inline in every card (which is what desktop
// still does, unchanged), it shows clean "Track" / "Chat" buttons that hand
// off to the dedicated Live/Chat pages via onTrack/onChat. This matches the
// requested mobile architecture:
//   Orders page: Order -> Track (if active) / Chat / Repeat Order
// without duplicating the live-tracking or chat logic anywhere new.
function MyOrdersTab({ onReorder, buyerLocation, compact = false, onTrack, onChat }) {
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

                {/* 📡 Live tracking map for accepted orders (desktop: inline; mobile: Track button → Live page) */}
                {o.status === 'accepted' && (
                  compact ? (
                    <Button size="small" variant="contained" fullWidth
                      startIcon={<PlaceRounded />}
                      sx={{ mt: 1, bgcolor: '#FF6B35', '&:hover': { bgcolor: '#C4400A' } }}
                      onClick={() => onTrack?.(o)}>
                      Track Order
                    </Button>
                  ) : (
                    <LiveTrackingMap order={o} buyerLocation={buyerLocation} />
                  )
                )}

                {/* 💬 Chat for active orders (desktop: inline; mobile: Chat button → Chat page) */}
                {['pending', 'accepted'].includes(o.status) && (
                  compact ? (
                    <Button size="small" variant="outlined" fullWidth
                      startIcon={<ChatBubbleRounded />}
                      sx={{ mt: 1 }}
                      onClick={() => onChat?.(o)}>
                      Chat
                    </Button>
                  ) : (
                    <OrderChat orderId={o.id} orderStatus={o.status} />
                  )
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
// ─── Live View (dedicated mobile Live tab) ──────────────────────────────────
// Reuses LiveTrackingMap as-is (no duplicated tracking logic). If more than
// one order is being delivered at once, a simple chip selector lets the
// buyer switch between them instead of stacking every map at once.
function LiveView({ activeOrders, buyerLocation }) {
  const [selectedId, setSelectedId] = useState(null);
  const current = activeOrders.find(o => o.id === selectedId) || activeOrders[0];

  if (activeOrders.length === 0) {
    return (
      <Card sx={{ p: 5, textAlign: 'center', mt: 2 }}>
        <PlaceRounded sx={{ fontSize: 56, color: 'text.disabled', mb: 1 }} />
        <Typography variant="h6" color="text.secondary">No active delivery</Typography>
        <Typography variant="body2" color="text.disabled">
          Your live delivery tracking will appear here when a merchant is on the way.
        </Typography>
      </Card>
    );
  }

  return (
    <Box sx={{ mt: 2 }}>
      {activeOrders.length > 1 && (
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
          {activeOrders.map(o => (
            <Chip
              key={o.id}
              label={o.product_title}
              onClick={() => setSelectedId(o.id)}
              sx={{
                cursor: 'pointer',
                fontWeight: (current?.id === o.id) ? 700 : 400,
                bgcolor: (current?.id === o.id) ? '#FF6B35' : 'white',
                color: (current?.id === o.id) ? 'white' : 'text.primary',
                border: '1px solid', borderColor: (current?.id === o.id) ? '#FF6B35' : '#e0e0e0',
              }}
            />
          ))}
        </Box>
      )}
      {current && (
        <Box sx={{ borderRadius: 2, overflow: 'hidden', border: '2px solid #FF6B35' }}>
          <Box sx={{ bgcolor: '#FF6B35', color: 'white', px: 2, py: 1.2 }}>
            <Typography fontWeight={700} fontSize={14}>
              Ordered: {current.product_title} · from {current.merchant_name}
            </Typography>
          </Box>
          <LiveTrackingMap order={current} buyerLocation={buyerLocation} embedded />
        </Box>
      )}
    </Box>
  );
}

// ─── Chat List View (dedicated mobile Chat tab) ──────────────────────────
// Lists the buyer's chat-eligible orders (pending/accepted — matching the
// existing rule already used for the inline OrderChat on desktop) and opens
// the existing OrderChat component when one is tapped. No new chat backend
// or endpoints — reuses GET/POST /api/orders/{id}/messages via OrderChat.
function ChatListView({ focusedOrderId, onOpenedOrder }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openOrderId, setOpenOrderId] = useState(focusedOrderId || null);
  const [previews, setPreviews] = useState({}); // orderId -> { lastText, awaitingReply }

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await getMyOrders();
        const eligible = (res.data || []).filter(o => ['pending', 'accepted'].includes(o.status));
        setOrders(eligible);

        // Best-effort last-message preview per conversation. This is a one-time
        // fetch per order (not a poll loop) purely to populate the list —
        // OrderChat itself handles live polling once a conversation is opened.
        const results = await Promise.all(eligible.map(async (o) => {
          try {
            const r = await getMessages(o.id);
            const msgs = r.data || [];
            const last = msgs[msgs.length - 1];
            return [o.id, {
              lastText: last ? last.text : 'No messages yet',
              // Heuristic "awaiting reply" badge: last message wasn't sent by
              // the buyer themselves. There's no persisted read/unread flag
              // on messages, so this is the closest honest signal available
              // without adding new backend state.
              awaitingReply: !!last && last.sender_role !== 'buyer',
            }];
          } catch {
            return [o.id, { lastText: '', awaitingReply: false }];
          }
        }));
        setPreviews(Object.fromEntries(results));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [focusedOrderId]);

  useEffect(() => {
    if (focusedOrderId) setOpenOrderId(focusedOrderId);
  }, [focusedOrderId]);

  if (loading) return <Box sx={{ mt: 2 }}><OrderCardSkeleton count={3} /></Box>;

  if (orders.length === 0) {
    return (
      <Card sx={{ p: 5, textAlign: 'center', mt: 2 }}>
        <ChatBubbleRounded sx={{ fontSize: 56, color: 'text.disabled', mb: 1 }} />
        <Typography variant="h6" color="text.secondary">No conversations yet</Typography>
        <Typography variant="body2" color="text.disabled">
          Chats for your active orders will appear here.
        </Typography>
      </Card>
    );
  }

  return (
    <Box sx={{ mt: 2 }}>
      {orders.map(o => {
        const isOpen = openOrderId === o.id;
        const preview = previews[o.id] || {};
        return (
          <Card key={o.id} sx={{ mb: 1.5 }}>
            <Box
              onClick={() => { setOpenOrderId(isOpen ? null : o.id); onOpenedOrder?.(null); }}
              sx={{ p: 1.5, display: 'flex', alignItems: 'center', gap: 1.5, cursor: 'pointer' }}
            >
              <Box sx={{
                width: 40, height: 40, borderRadius: '50%', bgcolor: '#1D9E75', color: 'white',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, flexShrink: 0,
              }}>
                {o.merchant_name?.[0]?.toUpperCase() || 'M'}
              </Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography fontWeight={700} fontSize={14} noWrap>{o.merchant_name}</Typography>
                <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
                  {o.product_title} • Order #{o.id.slice(-6)}
                </Typography>
                {preview.lastText && (
                  <Typography variant="caption" color="text.disabled" noWrap sx={{ display: 'block' }}>
                    {preview.lastText}
                  </Typography>
                )}
              </Box>
              {preview.awaitingReply && (
                <Chip label="Reply" size="small" color="secondary" sx={{ fontSize: 10, height: 20 }} />
              )}
            </Box>
            {isOpen && (
              <Box sx={{ px: 1.5, pb: 1.5 }}>
                <OrderChat orderId={o.id} orderStatus={o.status} forceOpen />
              </Box>
            )}
          </Card>
        );
      })}
    </Box>
  );
}

// ─── Reminders View (Issue 5 — "notify me when available") ─────────────
// Not a 5th bottom-nav tab (per the spec's own preference to avoid a
// cramped phone nav) — reached via a bell icon near the search bar, and
// listed as a normal SideNav item on tablet/desktop where there's room.
function RemindersView() {
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getReminders();
      setReminders(res.data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleRemove = async (id) => {
    try {
      await deleteReminder(id);
      setReminders(r => r.filter(x => x.id !== id));
    } catch (e) { console.error(e); }
  };

  if (loading) return <Box sx={{ mt: 2 }}><OrderCardSkeleton count={3} /></Box>;

  if (reminders.length === 0) {
    return (
      <Card sx={{ p: 5, textAlign: 'center', mt: 2 }}>
        <NotificationsActiveRounded sx={{ fontSize: 56, color: 'text.disabled', mb: 1 }} />
        <Typography variant="h6" color="text.secondary">No reminders yet</Typography>
        <Typography variant="body2" color="text.disabled">
          Search for something that's not available nearby, then tap "Notify me when available" to set a reminder.
        </Typography>
      </Card>
    );
  }

  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="h6" fontWeight={600} mb={2}>Your Reminders</Typography>
      <Grid container spacing={2}>
        {reminders.map(r => (
          <Grid item xs={12} sm={6} key={r.id}>
            <Card sx={{ border: r.available ? '2px solid #1D9E75' : '1px solid rgba(0,0,0,0.08)' }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Typography fontWeight={700}>{r.search_term}</Typography>
                  <IconButton size="small" onClick={() => handleRemove(r.id)}><DeleteOutlineRounded fontSize="small" /></IconButton>
                </Box>
                <Typography variant="caption" color="text.disabled" display="block" mb={1}>
                  Added {r.created_at ? new Date(r.created_at).toLocaleDateString() : ''}
                </Typography>
                {r.available ? (
                  <Alert severity="success" sx={{ py: 0.5 }}>
                    🔔 Available now{r.matched_merchant_name ? ` from ${r.matched_merchant_name}` : ''}!
                  </Alert>
                ) : (
                  <Chip label="Watching — not available yet" size="small" sx={{ bgcolor: '#F5F7F6' }} />
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}

export default function BuyerPage() {
  const { saveLocation } = useAuth();
  const { notifications, markRead } = useNotifications();
  const { t } = useSettings();
  // BUG FIX (this round): previously this was <600px while SideNav/BottomNav
  // switch at 768px — so between 600-767px, BOTH the old desktop Tabs AND
  // the new BottomNav rendered at once, with content routed by `activeTab`
  // (Tabs) while the visible nav was actually BottomNav (driven by
  // `mainView`), a real navigation/content mismatch. Widened to 768px so
  // one breakpoint drives layout, nav, AND content consistently everywhere.
  const isMobile = useMediaQuery('(max-width:767.95px)');
  // Nav state — now the single source of truth for content routing on ALL
  // screen sizes (phone via BottomNav, tablet/desktop via SideNav). The old
  // `activeTab`/Tabs split is removed below in favor of this one state.
  const [mainView, setMainView] = useState('home');
  const [focusedChatOrderId, setFocusedChatOrderId] = useState(null);
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
  // ISSUE 4 FIX: this used to be a single global '' | 'saving' | 'saved'
  // string shared by every search. Once a buyer created ONE reminder (e.g.
  // "tomato"), this flipped to 'saved' and stayed there — so searching
  // "onion" next showed the already-saved state instead of a working
  // "Notify me" button, and the only way to reset it was a full browser
  // refresh. Keying the status by the normalized search term lets each
  // search term track its own reminder state independently, so multiple
  // reminders can be created back-to-back with no refresh needed.
  const [reminderStatusByTerm, setReminderStatusByTerm] = useState({}); // { [normalizedTerm]: 'saving' | 'saved' }

  const saveSearchHistory = (term) => {
    if (!term.trim()) return;
    const updated = [term, ...searchHistory.filter(s => s !== term)].slice(0, 5);
    setSearchHistory(updated);
    localStorage.setItem('nearsell_search_history', JSON.stringify(updated));
  };

  // Voice search
  // ISSUE 3 FIX: the Web Speech API often appends trailing punctuation to
  // recognized phrases ("mouse" -> "mouse."), which silently broke product
  // search ("mouse." never matches a product titled "Mouse"). Normalize the
  // transcript once, right here at the source, so both the search box and
  // everything downstream (filtering, search history, reminders) only ever
  // see the clean term.
  const { listening, supported: voiceSupported, error: voiceError,
    startListening, stopListening } = useVoiceSearch({
    onResult: (text) => {
      const normalized = normalizeSearchQuery(text);
      setSearch(normalized);
      saveSearchHistory(normalized);
    },
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

  // Issue 5 — "Notify me when available": saves a reminder for the current
  // search term when nothing matches nearby. Reuses the same `search` state
  // already driving the product filter above — no separate search UI.
  const handleSetReminder = async () => {
    const term = search.trim();
    if (!term) return;
    const key = normalizeSearchQuery(term);
    setReminderStatusByTerm(prev => ({ ...prev, [key]: 'saving' }));
    try {
      await createReminder({ search_term: term });
      // Backend returns already_existed: true if this normalized term already
      // had an active reminder — surfaced as a distinct message below rather
      // than silently showing the same "saved" state either way.
      setReminderStatusByTerm(prev => ({ ...prev, [key]: 'saved' }));
    } catch (e) {
      console.error(e);
      setReminderStatusByTerm(prev => ({ ...prev, [key]: '' }));
    }
  };

  const currentReminderStatus = reminderStatusByTerm[normalizeSearchQuery(search)] || '';

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

      {/* ISSUE 3 FIX (responsive tablet/desktop navigation): SideNav renders
          nothing below 768px (its own media query), so phone layout is
          unaffected. At >=768px it replaces the desktop Tabs visually —
          `mainView` already drives content on mobile; reusing it here means
          tablet/desktop just get another way to set the same state, no
          parallel navigation model to maintain. Reminders is included here
          since desktop/tablet has room for a 5th item, per the spec. */}
      <Box sx={{ display: 'flex' }}>
        <SideNav
          value={mainView}
          onChange={setMainView}
          items={[
            { key: 'home', label: 'Home', icon: StorefrontRounded },
            { key: 'live', label: 'Live', icon: PlaceRounded },
            { key: 'reminders', label: 'Reminders', icon: NotificationsActiveRounded },
            { key: 'chat', label: 'Chat', icon: ChatBubbleRounded },
            { key: 'orders', label: 'Orders', icon: ListAltRounded },
          ]}
        />
        <Box sx={{ flex: 1, minWidth: 0 }}>
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

        {/* Old desktop Tabs UI removed — SideNav (>=768px) / BottomNav
            (<768px) now drive `mainView` consistently everywhere, so there's
            only one navigation implementation instead of two competing ones. */}

        {/* ── Browse / Home content ── */}
        {mainView === 'home' && (
          <>
            {locationError && <Alert severity="warning" sx={{ mb: 2 }}>{locationError}</Alert>}
            {orderSuccess && <Alert severity="success" sx={{ mb: 2 }}>{orderSuccess}</Alert>}

            {/* Search + Filter bar */}
            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', gap: 1, mb: 1.5 }}>
                {/* ISSUE 2 FIX: this wrapper is scoped to ONLY the search field
                    (not the whole flex row with the Filters/Refresh buttons), and
                    is the positioned ancestor the Recent Searches dropdown below
                    anchors to. Previously the dropdown was a sibling of this row
                    with no positioned ancestor of its own scoped this tightly, so
                    it positioned itself against a distant ancestor and rendered
                    as a near-full-page block instead of a small popover under the
                    search field. */}
                <Box sx={{ position: 'relative', flex: 1, minWidth: 0 }}>
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

                {/* Recent search history — compact popover anchored directly below
                    the search field only (see wrapper Box above), capped to a
                    reasonable height with internal scroll instead of growing to
                    cover most of the page. */}
                {showHistory && searchHistory.length > 0 && (
                  <Box sx={{
                    position: 'absolute', zIndex: 100, top: '100%', left: 0, right: 0,
                    bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider',
                    borderRadius: 2, p: 1.5, boxShadow: 3, mt: 0.5,
                    maxHeight: 240, overflowY: 'auto',
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
                </Box>
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

            {/* Live tracking banner — shows when any accepted order exists.
                BUG FIX (mobile UI audit): the banner and the map below it are
                now wrapped in ONE bordered card (instead of two separate
                bordered/rounded boxes stacked with no gap), and LiveTrackingMap
                is told `embedded` so it doesn't draw its own competing border/
                radius. This removes the "two orange boxes overlapping" glitch
                seen on real devices while keeping normal document flow (no
                absolute positioning, no negative margins).
                On mobile the full map has moved to the dedicated Live tab
                (per the requested bottom-nav architecture), so Home only
                shows a slim banner that deep-links there via "Track". */}
            {activeOrders.length > 0 && (
              <Box sx={{ mb: 3 }}>
                {activeOrders.map(o => (
                  <Box key={o.id} sx={{
                    mb: 2, borderRadius: 2, overflow: 'hidden',
                    border: '2px solid #FF6B35', boxSizing: 'border-box', width: '100%',
                  }}>
                    <Box sx={{
                      bgcolor: '#FF6B35', color: 'white', px: 2, py: 1,
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      gap: 1, flexWrap: 'wrap',
                    }}>
                      <Typography fontWeight={700} fontSize={14} sx={{ wordBreak: 'break-word' }}>
                        🛥 {o.merchant_name} is on the way with your order!
                      </Typography>
                      <Button size="small" onClick={() => setMainView('live')}
                        sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.6)', fontSize: 11, flexShrink: 0 }}
                        variant="outlined">Track</Button>
                    </Box>
                    {/* Desktop: full embedded map, unchanged from before this fix.
                        Mobile: no map here — it lives on the Live tab. */}
                    {!isMobile && (
                      <LiveTrackingMap order={o} buyerLocation={userLocation} embedded />
                    )}
                  </Box>
                ))}
              </Box>
            )}

            {loading ? (
              <ProductGridSkeleton count={6} />
            ) : filtered.length === 0 ? (
              <Card sx={{ p: 5, textAlign: 'center' }}>
                <StorefrontRounded sx={{ fontSize: 56, color: 'text.disabled', mb: 1 }} />
                <Typography variant="h6" color="text.secondary">
                  {search.trim() ? `No "${search.trim()}" available near you right now.` : 'No products found nearby'}
                </Typography>
                {/* Issue 5 — "Notify me when available": only offered for an
                    actual search term (a reminder needs something to match
                    against later), not for the generic empty-radius case. */}
                {search.trim() && (
                  currentReminderStatus === 'saved' ? (
                    <Alert severity="success" sx={{ mt: 2, display: 'inline-flex' }}>
                      🔔 We'll notify you when "{search.trim()}" is available nearby.
                    </Alert>
                  ) : (
                    <Button
                      variant="contained" sx={{ mt: 2 }}
                      startIcon={currentReminderStatus === 'saving' ? <CircularProgress size={16} color="inherit" /> : <NotificationsActiveRounded />}
                      onClick={handleSetReminder}
                      disabled={currentReminderStatus === 'saving'}
                    >
                      {currentReminderStatus === 'saving' ? 'Saving...' : 'Notify me when available'}
                    </Button>
                  )
                )}
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

        {/* ── My Orders content ── */}
        {mainView === 'orders' && (
          <MyOrdersTab
            buyerLocation={userLocation}
            compact={isMobile}
            onTrack={() => setMainView('live')}
            onChat={(order) => { setFocusedChatOrderId(order.id); setMainView('chat'); }}
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
              setMainView('home');
            }}
          />
        )}

        {/* ── Live tab ── */}
        {mainView === 'live' && (
          <LiveView activeOrders={activeOrders} buyerLocation={userLocation} />
        )}

        {/* ── Chat tab ── */}
        {mainView === 'chat' && (
          <ChatListView
            focusedOrderId={focusedChatOrderId}
            onOpenedOrder={() => setFocusedChatOrderId(null)}
          />
        )}

        {/* ── Reminders tab (Issue 5) ── */}
        {mainView === 'reminders' && <RemindersView />}
      </Box>

      {/* Fixed mobile bottom navigation. Hidden at >=768px via BottomNav's
          own responsive sx — SideNav above is the only nav there. */}
      <BottomNav
        value={mainView}
        onChange={setMainView}
        hasActiveDelivery={activeOrders.length > 0}
        chatBadgeCount={0}
      />
      {/* Bottom padding so page content isn't hidden behind the fixed nav on mobile */}
      <Box sx={{ display: { xs: 'block', sm: 'none' }, height: 64 }} />
        </Box>
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
