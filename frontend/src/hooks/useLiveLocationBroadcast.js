/**
 * useLiveLocationBroadcast — Merchant side
 * When merchant has an accepted order, continuously sends their GPS to backend
 * every 10 seconds so buyer can track them on the map.
 */
import { useEffect, useRef, useCallback } from 'react';
import { updateMerchantLiveLocation } from '../utils/api';

export function useLiveLocationBroadcast(orderId, active) {
  const intervalRef = useRef(null);
  const watchRef = useRef(null);
  const latestPositionRef = useRef(null);

  const sendLocation = useCallback(async () => {
    if (!orderId || !latestPositionRef.current) return;
    const { lat, lng } = latestPositionRef.current;
    try {
      await updateMerchantLiveLocation(orderId, lat, lng);
    } catch (e) {
      console.warn('Live location send failed:', e.message);
    }
  }, [orderId]);

  useEffect(() => {
    if (!active || !orderId) return;

    // Watch GPS position continuously
    if (navigator.geolocation) {
      watchRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          latestPositionRef.current = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          };
        },
        (err) => console.warn('Geolocation error:', err.message),
        { enableHighAccuracy: true, maximumAge: 5000 }
      );
    }

    // Send to backend every 10 seconds
    sendLocation(); // send immediately on start
    intervalRef.current = setInterval(sendLocation, 10000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (watchRef.current) navigator.geolocation.clearWatch(watchRef.current);
    };
  }, [active, orderId, sendLocation]);
}
