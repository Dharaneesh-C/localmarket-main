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
    // Always add to notification list
    const newNotif = {
      id: Date.now(),
      ...data,
      read: false,
      timestamp: new Date().toISOString(),
    };
    setNotifications((prev) => [newNotif, ...prev].slice(0, 50));
    setUnreadCount((prev) => prev + 1);

    // 🔔 Merchant arrived — trigger alarm
    if (data.type === 'merchant_arrived') {
      playArrivalAlarm();
      // Browser notification too
      if (notificationsSupported && Notification.permission === 'granted') {
        new Notification(data.title, {
          body: data.body,
          icon: '/logo192.png',
          requireInteraction: true, // stays on screen until dismissed
        });
      }
      return;
    }

    // Regular notifications
    if (notificationsSupported && Notification.permission === 'granted') {
      new Notification(data.title, {
        body: data.body,
        icon: '/logo192.png',
      });
    }
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
    if (user?.role === 'buyer' && notificationsSupported && Notification.permission === 'default') {
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
