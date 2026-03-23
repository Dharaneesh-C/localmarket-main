import React, { useState, useEffect, useRef } from 'react';
import { Box, Typography, Chip, Button } from '@mui/material';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';

// ─── Icons ────────────────────────────────────────────────────────────────────
const merchantSelfIcon = L.divIcon({
  html: `
    <div style="position:relative;width:42px;height:42px;">
      <div style="position:absolute;inset:0;background:rgba(29,158,117,0.2);border-radius:50%;animation:selfPing 1.2s ease-out infinite;"></div>
      <div style="position:absolute;inset:6px;background:#1D9E75;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(29,158,117,0.5);display:flex;align-items:center;justify-content:center;font-size:16px;">🛵</div>
    </div>
    <style>@keyframes selfPing{0%{transform:scale(1);opacity:0.7}70%{transform:scale(2.1);opacity:0}100%{transform:scale(2.1);opacity:0}}</style>
  `,
  iconSize: [42, 42], iconAnchor: [21, 21], className: '',
});

const makeBuyerIcon = (label, isPending) => L.divIcon({
  html: `
    <div style="position:relative;">
      <div style="
        background:${isPending ? '#EF9F27' : '#378ADD'};
        width:36px;height:36px;border-radius:50%;
        border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);
        display:flex;align-items:center;justify-content:center;font-size:16px;
      ">🏠</div>
      <div style="
        position:absolute;top:-8px;right:-8px;
        background:${isPending ? '#FF6B35' : '#1D9E75'};
        color:white;border-radius:50%;
        width:18px;height:18px;
        display:flex;align-items:center;justify-content:center;
        font-size:10px;font-weight:bold;border:2px solid white;
      ">${isPending ? '!' : '✓'}</div>
    </div>
  `,
  iconSize: [36, 36], iconAnchor: [18, 18], className: '',
});

// Auto-fit map to show all markers
function FitBounds({ points }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    try {
      const bounds = L.latLngBounds(points.map(p => [p[0], p[1]]));
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    } catch (e) {}
  }, [points, map]); // eslint-disable-line
  return null;
}

// Move merchant marker smoothly
function MoveMerchant({ pos }) {
  const map = useMap();
  const prev = useRef(null);
  useEffect(() => {
    if (!pos) return;
    if (!prev.current ||
      Math.abs(prev.current[0] - pos[0]) > 0.0001 ||
      Math.abs(prev.current[1] - pos[1]) > 0.0001) {
      prev.current = pos;
    }
  }, [pos, map]); // eslint-disable-line
  return null;
}

export default function MerchantRouteMap({ orders, onRefresh }) {
  const [myPos, setMyPos] = useState(null);
  const watchRef = useRef(null);

  // Watch merchant's own GPS continuously
  useEffect(() => {
    if (!navigator.geolocation) return;
    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => setMyPos([pos.coords.latitude, pos.coords.longitude]),
      () => {},
      { enableHighAccuracy: true, maximumAge: 5000 }
    );
    return () => {
      if (watchRef.current) navigator.geolocation.clearWatch(watchRef.current);
    };
  }, []);

  // Only show accepted orders with buyer location
  const acceptedOrders = orders.filter(
    o => o.status === 'accepted' && o.buyer_location?.coordinates
  );
  const pendingOrders = orders.filter(
    o => o.status === 'pending' && o.buyer_location?.coordinates
  );
  const visibleOrders = [...acceptedOrders, ...pendingOrders];

  if (visibleOrders.length === 0 && !myPos) return null;

  // Build all points for FitBounds
  const allPoints = [];
  if (myPos) allPoints.push(myPos);
  visibleOrders.forEach(o => {
    const [lng, lat] = o.buyer_location.coordinates;
    allPoints.push([lat, lng]);
  });

  const mapCenter = myPos || (allPoints.length > 0 ? allPoints[0] : [11.3027, 76.9389]);

  return (
    <Box sx={{ borderRadius: 2, overflow: 'hidden', border: '1px solid #e0e0e0', mb: 3 }}>
      {/* Header */}
      <Box sx={{
        bgcolor: '#1D9E75', color: 'white', px: 2, py: 1.2,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <Box>
          <Typography fontWeight={700} fontSize={15}>
            🗺️ Live Delivery Map
          </Typography>
          <Typography fontSize={12} sx={{ opacity: 0.85 }}>
            {acceptedOrders.length} active {acceptedOrders.length === 1 ? 'delivery' : 'deliveries'}
            {pendingOrders.length > 0 && ` · ${pendingOrders.length} pending`}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {myPos && (
            <Chip
              label="📡 GPS ON"
              size="small"
              sx={{ bgcolor: '#4cff91', color: '#1a1a1a', fontWeight: 700, fontSize: 10 }}
            />
          )}
          <Button size="small" onClick={onRefresh}
            sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.5)', fontSize: 11 }}
            variant="outlined">
            Refresh
          </Button>
        </Box>
      </Box>

      {/* Map */}
      <MapContainer
        center={mapCenter}
        zoom={13}
        style={{ width: '100%', height: 360 }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {allPoints.length > 0 && <FitBounds points={allPoints} />}
        {myPos && <MoveMerchant pos={myPos} />}

        {/* Merchant's own position */}
        {myPos && (
          <Marker position={myPos} icon={merchantSelfIcon}>
            <Popup>
              <Typography fontWeight={700} fontSize={13}>📍 Your location</Typography>
              <Typography fontSize={11} color="text.secondary">Updating every 5s</Typography>
            </Popup>
          </Marker>
        )}

        {/* Buyer markers + route lines */}
        {visibleOrders.map(o => {
          const [lng, lat] = o.buyer_location.coordinates;
          const isPending = o.status === 'pending';
          const buyerPos = [lat, lng];
          const routePoints = myPos ? [myPos, buyerPos] : null;

          return (
            <React.Fragment key={o.id}>
              {/* Route line from merchant to buyer — only for accepted orders */}
              {routePoints && !isPending && (
                <Polyline
                  positions={routePoints}
                  pathOptions={{
                    color: '#1D9E75',
                    weight: 4,
                    opacity: 0.8,
                    dashArray: '8 6',
                  }}
                />
              )}

              {/* Buyer marker */}
              <Marker position={buyerPos} icon={makeBuyerIcon(o.buyer_name, isPending)}>
                <Popup>
                  <Box sx={{ minWidth: 170 }}>
                    <Typography fontWeight={700} fontSize={13}>{o.buyer_name}</Typography>
                    <Typography fontSize={12} color="text.secondary">{o.product_title}</Typography>
                    <Typography fontSize={12}>
                      {o.quantity} {o.unit} — <strong>₹{o.total_price}</strong>
                    </Typography>
                    {o.buyer_phone && (
                      <Typography fontSize={12} mt={0.3}>📞 {o.buyer_phone}</Typography>
                    )}
                    <Chip
                      label={isPending ? '⏳ Pending' : '🚚 On the way'}
                      size="small"
                      color={isPending ? 'warning' : 'success'}
                      sx={{ mt: 0.5, fontSize: 10 }}
                    />
                    {myPos && !isPending && (
                      <Button size="small" variant="outlined" fullWidth sx={{ mt: 1, fontSize: 11 }}
                        onClick={() => window.open(
                          `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${myPos[0]},${myPos[1]};${lat},${lng}`,
                          '_blank'
                        )}>
                        🗺️ Open Navigation
                      </Button>
                    )}
                  </Box>
                </Popup>
              </Marker>
            </React.Fragment>
          );
        })}
      </MapContainer>

      {/* Legend */}
      <Box sx={{ px: 2, py: 1, bgcolor: 'background.paper', display: 'flex', gap: 3, flexWrap: 'wrap' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
          <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: '#1D9E75' }} />
          <Typography variant="caption" color="text.secondary">Your location</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
          <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: '#378ADD' }} />
          <Typography variant="caption" color="text.secondary">Accepted — on the way</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
          <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: '#EF9F27' }} />
          <Typography variant="caption" color="text.secondary">Pending order</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
          <Box sx={{ width: 30, height: 3, bgcolor: '#1D9E75', borderRadius: 1 }} />
          <Typography variant="caption" color="text.secondary">Route to buyer</Typography>
        </Box>
      </Box>
    </Box>
  );
}
