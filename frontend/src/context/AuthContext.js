import React, { createContext, useContext, useState, useEffect } from 'react';
import { getMe, updateFCMToken, updateLocation } from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      getMe()
        .then((res) => setUser(res.data))
        .catch(() => localStorage.removeItem('token'))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
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
