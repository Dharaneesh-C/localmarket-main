import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { useWebSocket } from '../hooks/useWebSocket';
import { playArrivalAlarm, stopAlarm } from '../utils/alarm';

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const notificationsSupported = typeof window !== 'undefined' && 'Notification' in window;

  const handleMessage = useCallback((data) => {
    const newNotif = {
      id: Date.now(),
      ...data,
      read: false,
      timestamp: new Date().toISOString(),
    };
    setNotifications((prev) => [newNotif, ...prev].slice(0, 50));
    setUnreadCount((prev) => prev + 1);

    // Check if running inside Android WebView
    const isAndroid = typeof window.AndroidBridge !== 'undefined';

    // Helper to show notification — uses Android bridge OR browser API
    const showNotif = (title, body, requireInteraction = false) => {
      if (isAndroid) {
        try { window.AndroidBridge.showNotification(title, body); } catch (e) {}
      } else if (notificationsSupported && Notification.permission === 'granted') {
        new Notification(title, { body, icon: '/logo192.png', requireInteraction });
      }
    };

    // 🔔 Merchant arrived — trigger alarm for buyer
    if (data.type === 'merchant_arrived') {
      playArrivalAlarm();
      showNotif(data.title, data.body, true);
      return;
    }

    // 🛒 New order — browser notification for merchant
    if (data.type === 'new_order') {
      showNotif(data.title || '🛒 New Order!', data.body, true);
      return;
    }

    // All other notifications
    showNotif(data.title, data.body);
  }, [notificationsSupported]);

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

  useEffect(() => {
    // Request browser notification permission for ALL users (both buyer and merchant)
    // Merchant needs it for new order alerts, buyer needs it for merchant_arrived alarm
    if (user && notificationsSupported && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, [notificationsSupported, user]);

  return (
    <NotificationContext.Provider
      value={{ notifications, unreadCount, markAllRead, markRead, clearAll, stopAlarm }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => useContext(NotificationContext);
