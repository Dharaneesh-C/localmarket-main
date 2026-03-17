import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Grid, Card, CardContent, Typography, Button,
  Chip, TextField, InputAdornment, CircularProgress, Alert,
  Dialog, DialogTitle, DialogContent, IconButton, Divider, Fade,
} from '@mui/material';
import {
  SearchRounded, LocationOnRounded, CloseRounded,
  DirectionsRounded, StorefrontRounded, RefreshRounded, CategoryRounded,
} from '@mui/icons-material';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { getNearbyProducts } from '../utils/api';

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

const getCategoryEmoji = (cat) => {
  const map = { 'Vegetables & Fruits': '🥦', Dairy: '🥛', 'Handmade Goods': '🧶', 'Cooked Food': '🍱', Other: '📦' };
  return map[cat] || '📦';
};

export default function BuyerPage() {
  const { saveLocation } = useAuth();
  const { notifications } = useNotifications();
  const [products, setProducts] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [locationError, setLocationError] = useState('');

  const loadProducts = useCallback(async (lat, lng) => {
    setLoading(true);
    try {
      const res = await getNearbyProducts(lat, lng);
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

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (notifications.length > 0 && userLocation) {
      loadProducts(userLocation[0], userLocation[1]);
    }
  }, [notifications.length]); // eslint-disable-line

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(products.filter(p =>
      p.title.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      p.merchant_name.toLowerCase().includes(q)
    ));
  }, [search, products]);

  const openDirections = (product) => {
    const [lng, lat] = product.merchant_location.coordinates;
    window.open(`https://www.openstreetmap.org/directions?from=&to=${lat},${lng}`, '_blank');
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Navbar />
      <Box sx={{ maxWidth: 1100, mx: 'auto', p: { xs: 2, md: 3 } }}>

        <Box sx={{ mb: 3 }}>
          <Typography variant="h5" fontWeight={700}>Nearby Products 📍</Typography>
          <Typography variant="body2" color="text.secondary">Merchants selling in your area right now</Typography>
        </Box>

        {locationError && <Alert severity="warning" sx={{ mb: 2 }}>{locationError}</Alert>}

        <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
          <TextField
            placeholder="Search products, merchants, categories..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            fullWidth size="small"
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchRounded color="action" /></InputAdornment> }}
          />
          <Button variant="outlined" startIcon={<RefreshRounded />}
            onClick={() => userLocation && loadProducts(userLocation[0], userLocation[1])}>
            Refresh
          </Button>
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
                        <Button size="small" variant="contained" fullWidth sx={{ mt: 1, fontSize: 11 }}
                          onClick={() => setSelectedProduct(p)}>
                          View Details
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
            <Typography variant="body2" color="text.disabled">
              Check back later — merchants will notify you when they're in your area
            </Typography>
          </Card>
        ) : (
          <Grid container spacing={2}>
            {filtered.map((p) => (
              <Grid item xs={12} sm={6} md={4} key={p.id}>
                <Fade in>
                  <Card
                    sx={{ cursor: 'pointer', transition: 'all 0.2s', '&:hover': { transform: 'translateY(-2px)', boxShadow: 4 } }}
                    onClick={() => setSelectedProduct(p)}
                  >
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
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1.5 }}>
                        <Typography variant="h6" color="primary" fontWeight={700}>
                          ₹{p.price}
                          <Typography component="span" variant="caption" color="text.secondary">/{p.unit}</Typography>
                        </Typography>
                        <Typography variant="caption" color="text.secondary">by {p.merchant_name}</Typography>
                      </Box>
                    </CardContent>
                  </Card>
                </Fade>
              </Grid>
            ))}
          </Grid>
        )}
      </Box>

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
                <Chip icon={<CategoryRounded />} label={selectedProduct.category} size="small" />
                <Chip label={`📍 ${selectedProduct.distance_km} km away`} size="small" color="primary" variant="outlined" />
              </Box>
              <Typography variant="body2" color="text.secondary" mb={2}>{selectedProduct.description}</Typography>
              <Typography variant="h5" color="primary" fontWeight={700} mb={2}>
                ₹{selectedProduct.price}
                <Typography component="span" variant="body2" color="text.secondary"> per {selectedProduct.unit}</Typography>
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Box sx={{ bgcolor: 'background.default', borderRadius: 2, p: 2 }}>
                <Typography variant="subtitle2" fontWeight={600} mb={1}>Merchant Info</Typography>
                <Typography variant="body2">👤 {selectedProduct.merchant_name}</Typography>
                {selectedProduct.merchant_phone && (
                  <Typography variant="body2">📞 {selectedProduct.merchant_phone}</Typography>
                )}
              </Box>
              <Box sx={{ display: 'flex', gap: 1.5, mt: 2.5 }}>
                <Button fullWidth variant="contained" startIcon={<DirectionsRounded />}
                  onClick={() => openDirections(selectedProduct)}>
                  Get Directions
                </Button>
                <Button fullWidth variant="outlined" startIcon={<LocationOnRounded />}
                  onClick={() => {
                    const [lng, lat] = selectedProduct.merchant_location.coordinates;
                    window.open(`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}&zoom=16`, '_blank');
                  }}>
                  View on Map
                </Button>
              </Box>
            </DialogContent>
          </>
        )}
      </Dialog>
    </Box>
  );
}
