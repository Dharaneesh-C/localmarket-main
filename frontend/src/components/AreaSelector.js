import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import { Box, Button, Typography, Alert } from '@mui/material';
import { MyLocationRounded, DeleteRounded } from '@mui/icons-material';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default marker icons broken by webpack
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const merchantIcon = L.divIcon({
  html: `<div style="background:#1D9E75;width:28px;height:28px;border-radius:50% 50% 50% 0;
    transform:rotate(-45deg);border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3)"></div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 28],
  className: '',
});

function LocationPicker({ onLocationPick, isDrawing }) {
  useMapEvents({
    click(e) {
      if (!isDrawing) onLocationPick(e.latlng);
    },
  });
  return null;
}

function DrawHandler({ onPolygonComplete, isDrawing }) {
  const map = useMapEvents({});
  const pointsRef = useRef([]);
  const polylineRef = useRef(null);
  const dotsRef = useRef([]);

  useEffect(() => {
    if (!isDrawing) {
      pointsRef.current = [];
      if (polylineRef.current) { map.removeLayer(polylineRef.current); polylineRef.current = null; }
      dotsRef.current.forEach(d => map.removeLayer(d));
      dotsRef.current = [];
      return;
    }

    const handleClick = (e) => {
      const pt = e.latlng;
      pointsRef.current = [...pointsRef.current, pt];
      const dot = L.circleMarker(pt, { radius: 5, color: '#1D9E75', fillColor: '#1D9E75', fillOpacity: 1 }).addTo(map);
      dotsRef.current.push(dot);
      if (polylineRef.current) map.removeLayer(polylineRef.current);
      if (pointsRef.current.length > 1) {
        polylineRef.current = L.polyline(pointsRef.current, { color: '#1D9E75', dashArray: '6', weight: 2 }).addTo(map);
      }
    };

    const handleDblClick = (e) => {
      L.DomEvent.stop(e);
      if (pointsRef.current.length < 3) return;
      const coords = pointsRef.current.map(p => [p.lng, p.lat]);
      coords.push(coords[0]);
      onPolygonComplete({ type: 'Polygon', coordinates: [coords] }, [...pointsRef.current]);
      pointsRef.current = [];
      if (polylineRef.current) { map.removeLayer(polylineRef.current); polylineRef.current = null; }
      dotsRef.current.forEach(d => map.removeLayer(d));
      dotsRef.current = [];
    };

    map.on('click', handleClick);
    map.on('dblclick', handleDblClick);
    return () => { map.off('click', handleClick); map.off('dblclick', handleDblClick); };
  }, [isDrawing, map, onPolygonComplete]);

  return null;
}

function PolygonDisplay({ positions }) {
  const map = useMapEvents({});
  const polyRef = useRef(null);
  useEffect(() => {
    if (polyRef.current) { map.removeLayer(polyRef.current); polyRef.current = null; }
    if (positions && positions.length > 2) {
      polyRef.current = L.polygon(positions, { color: '#1D9E75', fillColor: '#1D9E75', fillOpacity: 0.2, weight: 2 }).addTo(map);
    }
    return () => { if (polyRef.current) map.removeLayer(polyRef.current); };
  }, [positions, map]);
  return null;
}

export default function AreaSelector({ onAreaChange, onMerchantLocationChange }) {
  const [merchantLocation, setMerchantLocation] = useState(null);
  const [polygonPositions, setPolygonPositions] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);

  const handleLocationPick = (latlng) => {
    setMerchantLocation(latlng);
    onMerchantLocationChange({ type: 'Point', coordinates: [latlng.lng, latlng.lat] });
  };

  const handlePolygonComplete = (geoJson, positions) => {
    setPolygonPositions(positions);
    onAreaChange(geoJson);
    setIsDrawing(false);
  };

  const clearAll = () => {
    setPolygonPositions([]);
    setMerchantLocation(null);
    onAreaChange(null);
  };

  const useMyLocation = () => {
    navigator.geolocation?.getCurrentPosition((pos) => {
      const latlng = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      setMerchantLocation(latlng);
      onMerchantLocationChange({ type: 'Point', coordinates: [latlng.lng, latlng.lat] });
    });
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', gap: 1, mb: 1, flexWrap: 'wrap' }}>
        <Button size="small" variant="outlined" startIcon={<MyLocationRounded />} onClick={useMyLocation}>
          Use My Location
        </Button>
        <Button
          size="small"
          variant={isDrawing ? 'contained' : 'outlined'}
          color={isDrawing ? 'warning' : 'primary'}
          onClick={() => setIsDrawing(!isDrawing)}
        >
          {isDrawing ? '✏️ Drawing... (double-click to finish)' : '✏️ Draw Delivery Area'}
        </Button>
        {(polygonPositions.length > 0 || merchantLocation) && (
          <Button size="small" variant="outlined" color="error" startIcon={<DeleteRounded />} onClick={clearAll}>
            Clear
          </Button>
        )}
      </Box>

      <Typography variant="caption" color="text.secondary" display="block" mb={1}>
        📍 Click map to set your location &nbsp;·&nbsp; ✏️ Click "Draw", click points on map, then double-click to finish area
      </Typography>

      <Box sx={{ borderRadius: 3, overflow: 'hidden', border: '1px solid #e0e0e0' }}>
        <MapContainer
          center={[11.3027, 76.9389]}
          zoom={14}
          style={{ width: '100%', height: '350px' }}
          doubleClickZoom={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <LocationPicker onLocationPick={handleLocationPick} isDrawing={isDrawing} />
          <DrawHandler onPolygonComplete={handlePolygonComplete} isDrawing={isDrawing} />
          <PolygonDisplay positions={polygonPositions} />
          {merchantLocation && (
            <Marker position={merchantLocation} icon={merchantIcon}>
              <Popup>Your location 📍</Popup>
            </Marker>
          )}
        </MapContainer>
      </Box>

      {polygonPositions.length > 0 && (
        <Alert severity="success" sx={{ mt: 1, py: 0.5 }}>✅ Delivery area set ({polygonPositions.length} points)</Alert>
      )}
      {merchantLocation && (
        <Alert severity="info" sx={{ mt: 1, py: 0.5 }}>
          📍 Location: {merchantLocation.lat.toFixed(4)}, {merchantLocation.lng.toFixed(4)}
        </Alert>
      )}
    </Box>
  );
}
