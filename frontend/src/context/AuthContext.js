import React, { createContext, useContext, useState, useEffect } from 'react';
import { getMe, updateFCMToken, updateLocation } from '../utils/api';
import { requestNotificationPermission } from '../utils/firebase';

const AuthContext = createContext(null);

// Decode JWT payload without a library — checks exp claim
function isTokenExpired(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (!payload.exp) return false;
    // exp is in seconds; add 30s buffer
    return Date.now() / 1000 > payload.exp - 30;
  } catch {
    return true; // malformed token = treat as expired
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }

    // Check expiry locally first — avoids API call for definitely-expired tokens
    if (isTokenExpired(token)) {
      localStorage.removeItem('token');
      setLoading(false);
      return;
    }

    // Token looks valid — verify with server
    getMe()
      .then((res) => setUser(res.data))
      .catch(() => {
        localStorage.removeItem('token');
      })
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => {
  const setupFCM = async () => {
    if (!user) return;

    try {
      // BUG FIX: when running inside the Android app, we must upload the NATIVE
      // Android FCM token (from AndroidBridge.getFCMToken()), not the web/VAPID
      // token from requestNotificationPermission(). The backend pushes to
      // whichever token is stored — if it's the web token, the native
      // MyFirebaseMessagingService (with the custom sound channel, wake lock,
      // etc.) is never reached, because it's a completely different push
      // registration living in the WebView's browser engine instead of the OS.
      const isAndroid = typeof window.AndroidBridge !== 'undefined'
        && typeof window.AndroidBridge.getFCMToken === 'function';

      if (isAndroid) {
        // Native token may not be fetched yet on first cold launch — retry a
        // few times with a short delay instead of giving up after one empty read.
        let token = '';
        for (let attempt = 0; attempt < 6 && !token; attempt++) {
          token = window.AndroidBridge.getFCMToken();
          if (!token) await new Promise((r) => setTimeout(r, 1000));
        }
        if (token) {
          await saveFCMToken(token);
        } else {
          console.warn('Native FCM token not available yet after retries.');
        }
        return;
      }

      // Plain browser / PWA (not inside the Android app) — use web push.
      const token = await requestNotificationPermission();

      if (token) {
        await saveFCMToken(token);
      }
    } catch (err) {
      console.error("FCM setup failed:", err);
    }
  };

  setupFCM();
}, [user]);

  const login = (token, userData) => {
    localStorage.setItem('token', token);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const res = await getMe();
      setUser(res.data);
    } catch (e) {}
  };

  const saveFCMToken = async (token) => {
    try {
      await updateFCMToken(token);
    } catch (e) {}
  };

  const saveLocation = async (lat, lng) => {
    try {
      await updateLocation({ type: 'Point', coordinates: [lng, lat] });
    } catch (e) {}
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser, saveFCMToken, saveLocation }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
