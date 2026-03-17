import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { useWebSocket } from '../hooks/useWebSocket';

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const handleMessage = useCallback((data) => {
    if (data.type === 'new_product' || data.type === 'product_update') {
      const newNotif = {
        id: Date.now(),
        ...data,
        read: false,
        timestamp: new Date().toISOString(),
      };
      setNotifications((prev) => [newNotif, ...prev].slice(0, 50));
      setUnreadCount((prev) => prev + 1);

      // Browser notification
      if (Notification.permission === 'granted') {
        new Notification(data.title, {
          body: data.body,
          icon: '/logo192.png',
        });
      }
    }
  }, []);

  useWebSocket(user?.id, handleMessage);

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const markRead = (id) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  const clearAll = () => {
    setNotifications([]);
    setUnreadCount(0);
  };

  // Request browser notification permission
  useEffect(() => {
    if (user?.role === 'buyer' && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, [user]);

  return (
    <NotificationContext.Provider
      value={{ notifications, unreadCount, markAllRead, markRead, clearAll }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => useContext(NotificationContext);
