import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { useWebSocket } from '../hooks/useWebSocket';
import { playArrivalAlarm, stopAlarm } from '../utils/alarm';
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotificationApi,
} from '../utils/api';

const NotificationContext = createContext(null);

const normalizeNotification = ({ id, read = false, timestamp, message = {} }) => ({
  id,
  read,
  timestamp,
  ...(message || {}),
});

export function NotificationProvider({ children }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const notificationsSupported = typeof window !== 'undefined' && 'Notification' in window;

  const handleMessage = useCallback((data) => {
    const newNotif = normalizeNotification(data);
    setNotifications((prev) => [newNotif, ...prev].slice(0, 50));
    if (!newNotif.read) {
      setUnreadCount((prev) => prev + 1);
    }

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
    if (newNotif.type === 'merchant_arrived') {
      playArrivalAlarm();
      showNotif(newNotif.title, newNotif.body, true);
      return;
    }

    if (newNotif.type === 'new_order') {
      showNotif(newNotif.title || '🛒 New Order!', newNotif.body, true);
      return;
    }

    showNotif(newNotif.title, newNotif.body);
  }, [notificationsSupported]);

  useWebSocket(user?.id, handleMessage);

  const markAllRead = async () => {
    try {
      await markAllNotificationsRead();

      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all notifications as read', err);
    }
  };

  const markRead = async (id) => {
    const notification = notifications.find((item) => item.id === id);
    if (!notification || notification.read) return;

    try {
      await markNotificationRead(id);

      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark notification as read', err);
    }
  };

  const clearAll = () => {
    setNotifications([]);
    setUnreadCount(0);
  };
  useEffect(() => {
    const loadNotifications = async () => {
      if (!user) {
        setNotifications([]);
        setUnreadCount(0);
        return;
      }

      try {
        const res = await getNotifications();
        const history = (res.data || []).map(normalizeNotification);

        setNotifications(history);
        setUnreadCount(history.filter((n) => !n.read).length);
      } catch (err) {
        console.error('Failed to load notifications', err);
      }
    };

    loadNotifications();
  }, [user]);
  useEffect(() => {
    // Request browser notification permission for ALL users (both buyer and merchant)
    // Merchant needs it for new order alerts, buyer needs it for merchant_arrived alarm
    if (user && notificationsSupported && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, [notificationsSupported, user]);
  const removeNotification = async (id) => {
    const notification = notifications.find((item) => item.id === id);
    if (!notification) return;

    try {
      await deleteNotificationApi(id);

      setNotifications((prev) => prev.filter((n) => n.id !== id));
      if (!notification.read) {
        setUnreadCount((count) => Math.max(0, count - 1));
      }
    } catch (err) {
      console.error('Failed to delete notification', err);
    }
  };
  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        markAllRead,
        markRead,
        removeNotification,
        clearAll,
        stopAlarm,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => useContext(NotificationContext);
