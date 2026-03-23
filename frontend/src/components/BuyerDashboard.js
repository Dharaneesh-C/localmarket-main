import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Card, CardContent, Avatar,
  Chip, Button, CircularProgress,
} from '@mui/material';
import {
  WbSunnyRounded, NightsStayRounded, WbTwilightRounded,
  RepeatRounded, StorefrontRounded,
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { getMyOrders } from '../utils/api';

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return { text: 'Good morning', icon: <WbSunnyRounded sx={{ color: '#EF9F27' }} /> };
  if (h < 17) return { text: 'Good afternoon', icon: <WbTwilightRounded sx={{ color: '#FF6B35' }} /> };
  return { text: 'Good evening', icon: <NightsStayRounded sx={{ color: '#378ADD' }} /> };
}

const WEATHER_TIPS = {
  morning: '☕ Great morning to order fresh milk or vegetables!',
  hot: '🥤 It\'s hot today — order cold drinks or fresh juice nearby!',
  rainy: '🌧️ Rainy day — perfect time to order cooked food!',
  evening: '🌅 Evening snack time — check what\'s available nearby!',
};

function getWeatherTip() {
  const h = new Date().getHours();
  if (h < 10) return WEATHER_TIPS.morning;
  if (h < 15) return WEATHER_TIPS.hot;
  if (h < 18) return WEATHER_TIPS.rainy;
  return WEATHER_TIPS.evening;
}

export default function BuyerDashboard({ onReorder, onViewFavourites, favourites }) {
  const { user } = useAuth();
  const [lastOrder, setLastOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const greeting = getGreeting();

  useEffect(() => {
    getMyOrders()
      .then(res => {
        const orders = res.data || [];
        // Get most recent completed or pending order
        const recent = orders.find(o => ['completed', 'pending', 'accepted'].includes(o.status));
        setLastOrder(recent || null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const uniqueFavMerchants = favourites?.slice(0, 4) || [];

  return (
    <Box sx={{ mb: 3 }}>
      {/* Greeting card */}
      <Card sx={{
        background: 'linear-gradient(135deg, #1D9E75 0%, #5DCAA5 100%)',
        color: 'white', mb: 2, overflow: 'visible',
      }}>
        <CardContent sx={{ pb: '16px !important' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                {greeting.icon}
                <Typography variant="h6" fontWeight={700}>
                  {greeting.text}, {user?.name?.split(' ')[0]} 👋
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                {getWeatherTip()}
              </Typography>
            </Box>
            <Avatar sx={{
              width: 48, height: 48, bgcolor: 'rgba(255,255,255,0.25)',
              fontSize: 20, fontWeight: 700,
            }}>
              {user?.name?.[0]?.toUpperCase()}
            </Avatar>
          </Box>
        </CardContent>
      </Card>

      {/* Last Order — quick reorder */}
      {!loading && lastOrder && (
        <Card sx={{ mb: 2, border: '1px solid #E1F5EE' }}>
          <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
            <Typography variant="caption" fontWeight={700} color="text.secondary">
              🔄 QUICK REORDER
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 0.5 }}>
              <Box>
                <Typography variant="body2" fontWeight={600} noWrap sx={{ maxWidth: 180 }}>
                  {lastOrder.product_title}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  from {lastOrder.merchant_name} · ₹{lastOrder.total_price}
                </Typography>
              </Box>
              <Button
                size="small" variant="contained"
                startIcon={<RepeatRounded fontSize="small" />}
                onClick={() => onReorder(lastOrder)}
                sx={{ minWidth: 100, py: 0.5 }}
              >
                Reorder
              </Button>
            </Box>
          </CardContent>
        </Card>
      )}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 1 }}>
          <CircularProgress size={20} />
        </Box>
      )}

      {/* Favourite Merchants quick strip */}
      {uniqueFavMerchants.length > 0 && (
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="caption" fontWeight={700} color="text.secondary">
              ❤️ FAVOURITE MERCHANTS
            </Typography>
            <Button size="small" sx={{ fontSize: 11, py: 0 }} onClick={onViewFavourites}>
              View all
            </Button>
          </Box>
          <Box sx={{ display: 'flex', gap: 1, overflowX: 'auto', pb: 0.5 }}>
            {uniqueFavMerchants.map(fav => (
              <Chip
                key={fav.merchant_id}
                icon={<StorefrontRounded sx={{ fontSize: 14 }} />}
                label={fav.merchant_name}
                size="small"
                onClick={() => onViewFavourites(fav.merchant_name)}
                sx={{
                  cursor: 'pointer', whiteSpace: 'nowrap',
                  bgcolor: '#fff0f0', color: '#c62828',
                  border: '1px solid #ffcdd2',
                  '&:hover': { bgcolor: '#ffcdd2' },
                }}
              />
            ))}
          </Box>
        </Box>
      )}
    </Box>
  );
}
