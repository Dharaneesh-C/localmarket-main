import React, { createContext, useContext, useState, useEffect } from 'react';
import { getMe, updateFCMToken, updateLocation } from '../utils/api';

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
