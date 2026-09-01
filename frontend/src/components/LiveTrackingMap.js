import React, { useState, useEffect, useRef } from 'react';
import { Box, Typography, Chip, CircularProgress } from '@mui/material';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { getMerchantLiveLocation } from '../utils/api';

// Animated pulsing merchant marker
const liveMerchantIcon = L.divIcon({
  html: `
    <div style="position:relative;width:44px;height:44px;">
      <div style="
        position:absolute;inset:0;
        background:rgba(255,107,53,0.25);
        border-radius:50%;
        animation:ping 1.4s ease-in-out infinite;
      "></div>
      <div style="
        position:absolute;inset:6px;
        background:#FF6B35;
        border-radius:50%;
        border:3px solid white;
        box-shadow:0 2px 10px rgba(255,107,53,0.5);
        display:flex;align-items:center;justify-content:center;
        font-size:16px;
      ">🛵</div>
    </div>
    <style>
      @keyframes ping {
        0%   { transform: scale(1);   opacity: 0.8; }
        70%  { transform: scale(2.2); opacity: 0;   }
        100% { transform: scale(2.2); opacity: 0;   }
      }
    </style>
  `,
  iconSize: [44, 44],
  iconAnchor: [22, 22],
  className: '',
});

const buyerIcon = L.divIcon({
  html: `<div style="width:18px;height:18px;background:#378ADD;border-radius:50%;border:3px solid white;box-shadow:0 0 0 3px rgba(55,138,221,0.3)"></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
  className: '',
});

// Auto-pan when merchant moves
function MoveMap({ center }) {
  const map = useMap();
  const prevCenter = useRef(null);
  useEffect(() => {
    if (!center) return;
    // Only pan if position changed meaningfully
    if (
      !prevCenter.current ||
      Math.abs(prevCenter.current[0] - center[0]) > 0.0001 ||
      Math.abs(prevCenter.current[1] - center[1]) > 0.0001
    ) {
      map.panTo(center, { animate: true, duration: 1 });
      prevCenter.current = center;
    }
  }, [center, map]);
  return null;
}

export default function LiveTrackingMap({ order, buyerLocation, embedded = false }) {
  // `embedded`: when this map is rendered directly beneath another orange
  // card (e.g. the "merchant is on the way" banner on the Home tab), it
  // drops its own border/rounded-top/margin so the banner and map read as
  // ONE connected card instead of two separate orange boxes touching each
  // other — which is what caused the visual overlap reported during mobile
  // testing. Standalone usage (e.g. inside My Orders) is unaffected.
  const [merchantPos, setMerchantPos] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [loadingFirst, setLoadingFirst] = useState(true);
  const [error, setError] = useState('');
  const intervalRef = useRef(null);

  const fetchLocation = async () => {
    try {
      const res = await getMerchantLiveLocation(order.id);
      if (res.data.available) {
        setMerchantPos([res.data.lat, res.data.lng]);
        setLastUpdated(new Date());
        setError('');
      }
    } catch (e) {
      setError('Could not fetch merchant location.');
    } finally {
      setLoadingFirst(false);
    }
  };

  useEffect(() => {
    if (!order?.id) return;
    fetchLocation();
    intervalRef.current = setInterval(fetchLocation, 10000);
    return () => clearInterval(intervalRef.current);
  }, [order?.id]); // eslint-disable-line

  const mapCenter = merchantPos || buyerLocation || [11.3027, 76.9389];

  return (
    <Box sx={{
      borderRadius: embedded ? '0 0 8px 8px' : 2,
      overflow: 'hidden',
      border: embedded ? 'none' : '2px solid #FF6B35',
      borderTop: embedded ? '1px solid rgba(255,255,255,0.35)' : undefined,
      mb: embedded ? 0 : 2,
      width: '100%',
      boxSizing: 'border-box',
    }}>
      {/* Header */}
      <Box sx={{
        bgcolor: '#FF6B35', color: 'white',
        px: 2, py: 1,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ fontSize: 18 }}>🛵</Box>
          <Typography fontWeight={700} fontSize={14}>
            {order.merchant_name} is on the way!
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {merchantPos && (
            <Box sx={{
              width: 8, height: 8, borderRadius: '50%', bgcolor: '#4cff91',
              animation: 'blink 1s ease-in-out infinite',
              '@keyframes blink': { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.2 } },
            }} />
          )}
          <Chip
            label={merchantPos ? 'LIVE' : 'Waiting...'}
            size="small"
            sx={{
              bgcolor: merchantPos ? '#4cff91' : 'rgba(255,255,255,0.3)',
              color: merchantPos ? '#1a1a1a' : 'white',
              fontWeight: 700, fontSize: 10,
            }}
          />
        </Box>
      </Box>

      {/* Map */}
      {loadingFirst ? (
        <Box sx={{ height: { xs: 220, sm: 280 }, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#f5f5f5' }}>
          <CircularProgress size={32} />
          <Typography variant="body2" color="text.secondary" ml={2}>
            Waiting for merchant location...
          </Typography>
        </Box>
      ) : (
        <MapContainer
          center={mapCenter}
          zoom={15}
          style={{ width: '100%', height: window.innerWidth < 600 ? 220 : 280 }}
          scrollWheelZoom={false}
          zoomControl={false}
        >
          <TileLayer
            attribution='&copy; OpenStreetMap'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {merchantPos && <MoveMap center={merchantPos} />}

          {/* Merchant live marker */}
          {merchantPos && (
            <Marker position={merchantPos} icon={liveMerchantIcon}>
              <Popup>
                <Typography fontWeight={700} fontSize={13}>🛵 {order.merchant_name}</Typography>
                <Typography fontSize={12} color="text.secondary">
                  On the way with your order
                </Typography>
                {lastUpdated && (
                  <Typography fontSize={11} color="text.disabled">
                    Updated: {lastUpdated.toLocaleTimeString()}
                  </Typography>
                )}
              </Popup>
            </Marker>
          )}

          {/* Buyer location */}
          {buyerLocation && (
            <Marker position={buyerLocation} icon={buyerIcon}>
              <Popup><Typography fontWeight={600} fontSize={13}>📍 Your location</Typography></Popup>
            </Marker>
          )}
        </MapContainer>
      )}

      {/* Footer */}
      <Box sx={{ px: 2, py: 1, bgcolor: '#fff8f5', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="caption" color="text.secondary">
          {merchantPos
            ? `Last updated: ${lastUpdated?.toLocaleTimeString() || '—'} • refreshes every 10s`
            : 'Merchant will appear when they start moving'}
        </Typography>
        {error && <Typography variant="caption" color="error">{error}</Typography>}
      </Box>
    </Box>
  );
}
