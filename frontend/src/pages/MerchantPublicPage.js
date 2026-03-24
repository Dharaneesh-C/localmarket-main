import React, { useState, useEffect } from 'react';
import {
  Box, Card, CardContent, Typography, Avatar, Chip,
  Grid, Button, CircularProgress, Alert, Divider, Rating,
} from '@mui/material';
import {
  StorefrontRounded, StarRounded, AccessTimeRounded,
  PhoneRounded, ArrowBackRounded, ShoppingCartRounded,
} from '@mui/icons-material';
import Navbar from '../components/Navbar';
import { ProductGridSkeleton } from '../components/Skeletons';
import { getMerchantProfile, getNearbyProducts } from '../utils/api';

export default function MerchantPublicPage({ merchantId, onBack, onOrder, userLocation }) {
  const [profile, setProfile] = useState(null);
  const [products, setProducts] = useState([]);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!merchantId) return;

    // Load merchant profile
    getMerchantProfile(merchantId)
      .then(res => setProfile(res.data))
      .catch(() => setError('Merchant not found'))
      .finally(() => setLoadingProfile(false));

    // Load merchant products by filtering nearby products
    const lat = userLocation?.[0] || 11.3027;
    const lng = userLocation?.[1] || 76.9389;
    getNearbyProducts(lat, lng, 100) // wide radius to catch all their products
      .then(res => {
        const merchantProducts = (res.data || []).filter(
          p => p.merchant_id === merchantId && !p.sold_out
        );
        setProducts(merchantProducts);
      })
      .catch(() => {})
      .finally(() => setLoadingProducts(false));
  }, [merchantId, userLocation]);

  const CATEGORY_EMOJI = {
    'Vegetables & Fruits': '🥦', Dairy: '🥛',
    'Handmade Goods': '🧶', 'Cooked Food': '🍱', Other: '📦',
  };

  if (error) return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Navbar />
      <Box sx={{ maxWidth: 700, mx: 'auto', p: 3 }}>
        <Button startIcon={<ArrowBackRounded />} onClick={onBack} sx={{ mb: 2 }}>Back</Button>
        <Alert severity="error">{error}</Alert>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Navbar />
      <Box sx={{ maxWidth: 900, mx: 'auto', p: { xs: 2, md: 3 } }}>

        <Button startIcon={<ArrowBackRounded />} onClick={onBack} sx={{ mb: 2 }}>
          Back to Products
        </Button>

        {/* Merchant Profile Card */}
        {loadingProfile ? (
          <Card sx={{ mb: 3, p: 3 }}>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <CircularProgress size={48} />
              <Box sx={{ flex: 1 }}>
                <Typography variant="h6">Loading...</Typography>
              </Box>
            </Box>
          </Card>
        ) : profile && (
          <Card sx={{ mb: 3, overflow: 'hidden' }}>
            {/* Green header banner */}
            <Box sx={{
              background: 'linear-gradient(135deg, #1D9E75, #5DCAA5)',
              p: 3, display: 'flex', alignItems: 'center', gap: 2,
            }}>
              <Avatar
                src={profile.photo_url}
                sx={{ width: 72, height: 72, bgcolor: 'white', color: '#1D9E75', fontSize: 28, fontWeight: 700, border: '3px solid white', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}
              >
                {profile.name?.[0]?.toUpperCase()}
              </Avatar>
              <Box sx={{ flex: 1 }}>
                <Typography variant="h5" fontWeight={800} color="white">{profile.name}</Typography>
                {profile.rating_count > 0 && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.3 }}>
                    <Rating value={profile.rating_avg} precision={0.1} size="small" readOnly
                      sx={{ '& .MuiRating-iconFilled': { color: '#FFD700' } }} />
                    <Typography variant="body2" color="white" sx={{ opacity: 0.9 }}>
                      {profile.rating_avg} ({profile.rating_count} reviews)
                    </Typography>
                  </Box>
                )}
              </Box>
              <StorefrontRounded sx={{ color: 'rgba(255,255,255,0.5)', fontSize: 40 }} />
            </Box>

            <CardContent>
              {/* Bio */}
              {profile.bio && (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2, fontStyle: 'italic' }}>
                  "{profile.bio}"
                </Typography>
              )}

              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                {/* Working hours */}
                {profile.working_hours && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                    <AccessTimeRounded fontSize="small" color="action" />
                    <Typography variant="body2">{profile.working_hours}</Typography>
                  </Box>
                )}

                {/* Delivery time */}
                {profile.delivery_time_minutes && (
                  <Chip
                    label={`⏱ ~${profile.delivery_time_minutes} min delivery`}
                    size="small" sx={{ bgcolor: '#E1F5EE', color: '#0F6E56' }}
                  />
                )}

                {/* Call button */}
                {profile.phone && (
                  <Button
                    size="small" variant="outlined" color="success"
                    startIcon={<PhoneRounded />}
                    component="a" href={`tel:${profile.phone}`}
                    sx={{ fontSize: 12 }}
                  >
                    {profile.phone}
                  </Button>
                )}
              </Box>
            </CardContent>
          </Card>
        )}

        {/* Products */}
        <Typography variant="h6" fontWeight={700} mb={2}>
          🛒 Products by {profile?.name || 'this merchant'}
        </Typography>

        {loadingProducts ? (
          <ProductGridSkeleton count={6} />
        ) : products.length === 0 ? (
          <Card sx={{ p: 5, textAlign: 'center' }}>
            <StorefrontRounded sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
            <Typography color="text.secondary">No active products right now</Typography>
          </Card>
        ) : (
          <Grid container spacing={2}>
            {products.map(p => (
              <Grid item xs={12} sm={6} md={4} key={p.id}>
                <Card sx={{ transition: 'all 0.2s', '&:hover': { transform: 'translateY(-2px)', boxShadow: 4 } }}>
                  {p.image_url ? (
                    <Box component="img" src={p.image_url} alt={p.title} loading="lazy"
                      sx={{ width: '100%', height: 130, objectFit: 'cover' }}
                      onError={e => { e.target.style.display = 'none'; }} />
                  ) : (
                    <Box sx={{ height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#E1F5EE', fontSize: 36 }}>
                      {CATEGORY_EMOJI[p.category] || '📦'}
                    </Box>
                  )}
                  <CardContent sx={{ pb: '12px !important' }}>
                    <Chip label={p.category} size="small" sx={{ bgcolor: '#E1F5EE', color: '#0F6E56', fontSize: 10, mb: 0.5 }} />
                    <Typography variant="subtitle1" fontWeight={700} noWrap>{p.title}</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 1 }}>
                      <Typography variant="h6" color="primary" fontWeight={700} lineHeight={1}>
                        ₹{p.price}
                        <Typography component="span" variant="caption" color="text.secondary">/{p.unit}</Typography>
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        {p.delivery_time_minutes && (
                          <Chip label={`⏱${p.delivery_time_minutes}m`} size="small"
                            sx={{ fontSize: 9, height: 18, bgcolor: '#E1F5EE', color: '#0F6E56' }} />
                        )}
                        {(p.available_from || p.available_until) && (
                          <Chip label={`⏰${p.available_from || '00:00'}-${p.available_until || '23:59'}`} size="small"
                            sx={{ fontSize: 9, height: 18, bgcolor: '#E6F1FB', color: '#185FA5' }} />
                        )}
                      </Box>
                    </Box>
                    <Button
                      size="small" variant="contained" fullWidth
                      startIcon={<ShoppingCartRounded sx={{ fontSize: '14px !important' }} />}
                      sx={{ mt: 1.2, py: 0.5, fontSize: 12 }}
                      onClick={() => onOrder(p)}
                    >
                      Order
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Box>
    </Box>
  );
}
