import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import {
  Box, Button, Typography, Slider, Chip, Alert,
} from '@mui/material';
import { MyLocationRounded } from '@mui/icons-material';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const merchantIcon = L.divIcon({
  html: `<div style="background:#1D9E75;width:32px;height:32px;border-radius:50%;
    border:3px solid white;box-shadow:0 2px 10px rgba(0,0,0,0.3);
    display:flex;align-items:center;justify-content:center;font-size:16px;">🏪</div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  className: '',
});

// Fly map to location when merchant sets GPS
function MapFlyTo({ position }) {
  const map = useMap();
  useEffect(() => {
    if (position) map.flyTo(position, 13, { duration: 1.2 });
  }, [position, map]);
  return null;
}

const RADIUS_MARKS = [
  { value: 1, label: '1 km' },
  { value: 3, label: '3 km' },
  { value: 5, label: '5 km' },
  { value: 10, label: '10 km' },
  { value: 15, label: '15 km' },
  { value: 20, label: '20 km' },
];

export default function AreaSelector({ onAreaChange, onMerchantLocationChange }) {
  const [location, setLocation] = useState(null);       // { lat, lng }
  const [radius, setRadius] = useState(5);               // km
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState('');

  // Notify parent whenever location or radius changes
  useEffect(() => {
    if (!location) return;
    // Send merchant location
    onMerchantLocationChange({ type: 'Point', coordinates: [location.lng, location.lat] });
    // Send delivery area as null — radius is handled separately via delivery_radius_km
    onAreaChange(null, radius);
  }, [location, radius]); // eslint-disable-line

  const handleUseMyLocation = () => {
    setLocating(true);
    setLocError('');
    navigator.geolocation?.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setLocation(loc);
        setLocating(false);
      },
      () => {
        setLocError('Location access denied. Please allow location or tap on the map.');
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Tap on map to set location
  function MapClickHandler() {
    const { useMapEvents } = require('react-leaflet');
    useMapEvents({
      click(e) {
        setLocation({ lat: e.latlng.lat, lng: e.latlng.lng });
      },
    });
    return null;
  }

  return (
    <Box>
      {/* Step 1 — Set Location */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle2" fontWeight={700} color="text.secondary" mb={1}>
          STEP 1 — SET YOUR LOCATION
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
          <Button
            variant="contained"
            startIcon={<MyLocationRounded />}
            onClick={handleUseMyLocation}
            disabled={locating}
            sx={{ bgcolor: '#1D9E75', '&:hover': { bgcolor: '#0F6E56' } }}
          >
            {locating ? 'Getting location...' : '📍 Use My Current Location'}
          </Button>
          <Typography variant="caption" color="text.secondary" sx={{ alignSelf: 'center' }}>
            or tap anywhere on the map
          </Typography>
        </Box>
        {locError && <Alert severity="warning" sx={{ mb: 1, py: 0.5 }}>{locError}</Alert>}
        {location && (
          <Alert severity="success" sx={{ py: 0.5 }}>
            ✅ Location set: {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
          </Alert>
        )}
      </Box>

      {/* Step 2 — Set Delivery Radius */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle2" fontWeight={700} color="text.secondary" mb={1}>
          STEP 2 — SET DELIVERY RADIUS
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 0.5 }}>
          <Typography variant="body1" fontWeight={700} color="primary" sx={{ minWidth: 60 }}>
            {radius} km
          </Typography>
          <Chip
            label={radius <= 3 ? '🏘️ Neighbourhood' : radius <= 7 ? '🏙️ Town area' : radius <= 12 ? '🗺️ Wide area' : '🌍 Large area'}
            size="small"
            sx={{
              bgcolor: radius <= 3 ? '#E1F5EE' : radius <= 7 ? '#FFF8E1' : radius <= 12 ? '#E3F2FD' : '#FCE4EC',
              color: radius <= 3 ? '#0F6E56' : radius <= 7 ? '#F57F17' : radius <= 12 ? '#1565C0' : '#C62828',
              fontWeight: 600,
            }}
          />
        </Box>
        <Slider
          value={radius}
          min={1}
          max={20}
          step={1}
          marks={RADIUS_MARKS}
          onChange={(_, v) => setRadius(v)}
          sx={{
            color: '#1D9E75',
            '& .MuiSlider-markLabel': { fontSize: 10 },
            mb: 1,
          }}
        />
        <Typography variant="caption" color="text.secondary">
          Buyers within <strong>{radius} km</strong> of your location will see your product and get notified.
        </Typography>
      </Box>

      {/* Map Preview */}
      <Box sx={{ borderRadius: 3, overflow: 'hidden', border: '2px solid #e0e0e0' }}>
        <MapContainer
          center={location ? [location.lat, location.lng] : [11.3027, 76.9389]}
          zoom={12}
          style={{ width: '100%', height: '320px' }}
        >
          <TileLayer
            attribution='&copy; OpenStreetMap'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapClickHandler />
          {location && (
            <>
              <MapFlyTo position={[location.lat, location.lng]} />
              <Marker position={[location.lat, location.lng]} icon={merchantIcon}>
                <Popup>Your location 🏪</Popup>
              </Marker>
              <Circle
                center={[location.lat, location.lng]}
                radius={radius * 1000} // metres
                pathOptions={{
                  color: '#1D9E75',
                  fillColor: '#1D9E75',
                  fillOpacity: 0.12,
                  weight: 2,
                  dashArray: '6',
                }}
              />
            </>
          )}
        </MapContainer>
      </Box>

      {!location && (
        <Alert severity="info" sx={{ mt: 1, py: 0.5 }}>
          Tap <strong>"Use My Current Location"</strong> or click anywhere on the map to set your position
        </Alert>
      )}

      {location && (
        <Alert severity="success" sx={{ mt: 1, py: 0.5 }}>
          🎯 Delivery zone: <strong>{radius} km radius</strong> around your location.
          The green circle shows which buyers will see your product.
        </Alert>
      )}
    </Box>
  );
}
