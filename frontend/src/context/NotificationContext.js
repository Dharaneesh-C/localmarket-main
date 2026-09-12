import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import { useWebSocket } from '../hooks/useWebSocket';
import { playArrivalAlarm, stopAlarm } from '../utils/alarm';
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotificationApi,
} from '../utils/api';
import { onForegroundMessage } from '../utils/firebase';

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

  // ISSUE 1 FIX — root cause of the duplicate notification panel entries:
  // this app has TWO independent delivery channels for the same backend
  // event — (1) polling, which fetches the real Firestore-backed
  // notification record, and (2) the FCM foreground listener, which used to
  // build its OWN fabricated entry (a client-generated `Date.now()` id, not
  // the real backend id) and push it into the SAME `notifications` list via
  // this same handleMessage function. Both paths fired for the same event
  // within moments of each other, so the panel ended up with two entries
  // that were never able to be recognized as "the same notification"
  // because their ids never matched.
  //
  // Fix: polling is now the ONLY writer to the `notifications` list/
  // unreadCount (authoritative, real backend ids, so id-based dedup below
  // actually works). The FCM foreground listener still fires an immediate
  // native/system-style alert (sound, browser Notification, Android bridge
  // toast) for responsiveness, but no longer inserts a list entry — the
  // real entry arrives via the next poll (at most ~8s later) instead.
  // `knownNotifIdsRef` is the id-based dedup for the polling path itself
  // (defense in depth against any overlapping poll responses).
  const knownNotifIdsRef = useRef(new Set());
  // Suppresses a second native/system alert firing for the SAME event when
  // it arrives via the other channel shortly after (FCM foreground fires
  // near-instantly; polling brings the same event moments later, or vice
  // versa if FCM is delayed). Keyed by a coarse signature of the event
  // (type + the most identifying field + body text), not a real id — this
  // only needs to catch near-duplicate alerts within a short window.
  const recentlyAlertedRef = useRef(new Map()); // eventSignature -> expiry ms

  const alertEventSignature = (n) =>
    `${n.type || ''}:${n.order_id || n.product_id || n.message_id || n.reminder_id || ''}:${n.body || ''}`;

  const shouldSuppressDuplicateAlert = (n) => {
    const key = alertEventSignature(n);
    const now = Date.now();
    // Clear anything stale while we're here rather than growing forever.
    for (const [k, expiry] of recentlyAlertedRef.current) {
      if (expiry < now) recentlyAlertedRef.current.delete(k);
    }
    if (recentlyAlertedRef.current.has(key)) return true;
    recentlyAlertedRef.current.set(key, now + 15000); // 15s window
    return false;
  };

  // Shared native/system-style alert — sound/toast/browser Notification.
  // Used by BOTH the polling path and the FCM foreground path, with
  // shouldSuppressDuplicateAlert() ensuring only one of them actually fires
  // it per real-world event.
  const alertForNotification = useCallback((newNotif) => {
    if (shouldSuppressDuplicateAlert(newNotif)) return;

    const isAndroid = typeof window.AndroidBridge !== 'undefined';
    const showNotif = (title, body, requireInteraction = false) => {
      if (isAndroid) {
        try { window.AndroidBridge.showNotification(title, body); } catch (e) {}
      } else if (notificationsSupported && Notification.permission === 'granted') {
        new Notification(title, { body, icon: '/logo192.png', requireInteraction });
      }
    };

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

  // Polling-only: the authoritative writer to the in-app notification list.
  const handleMessage = useCallback((data) => {
    const newNotif = normalizeNotification(data);

    if (knownNotifIdsRef.current.has(newNotif.id)) return; // already have it
    knownNotifIdsRef.current.add(newNotif.id);

    setNotifications((prev) => [newNotif, ...prev].slice(0, 50));
    if (!newNotif.read) {
      setUnreadCount((prev) => prev + 1);
    }

    alertForNotification(newNotif);
  }, [alertForNotification]);

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
        knownNotifIdsRef.current = new Set();
        return;
      }

      try {
        const res = await getNotifications();
        const history = (res.data || []).map(normalizeNotification);

        setNotifications(history);
        setUnreadCount(history.filter((n) => !n.read).length);
        // Seed the known-ids set from history so a poll that happens to
        // return something already covered by the initial load load can
        // never be double-inserted.
        knownNotifIdsRef.current = new Set(history.map((n) => n.id));
      } catch (err) {
        console.error('Failed to load notifications', err);
      }
    };

    loadNotifications();
  }, [user]);
  useEffect(() => {
  if (!user) return;

  let unsubscribe = () => {};
  let mounted = true;

  const setupForegroundListener = async () => {
    const listener = await onForegroundMessage((payload) => {
      console.log("📩 Foreground FCM:", payload);

      // ISSUE 1 FIX: this used to call handleMessage(...) with a fabricated
      // local id, which inserted a SECOND, never-matchable entry into the
      // notifications list alongside the real one polling brings in — see
      // the long comment above handleMessage's declaration for the full
      // root-cause explanation. FCM's job here is only to alert the user
      // immediately (sound/toast) while the app is open; the authoritative
      // list entry comes exclusively from polling now.
      alertForNotification({
        title: payload.data?.title,
        body: payload.data?.body,
        type: payload.data?.type,
        product_id: payload.data?.product_id,
        order_id: payload.data?.order_id,
        message_id: payload.data?.message_id,
        reminder_id: payload.data?.reminder_id,
      });
    });

    if (mounted) {
      unsubscribe = listener;
    }
  };

  setupForegroundListener();

  return () => {
    mounted = false;
    unsubscribe();
  };
}, [user, alertForNotification]);
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
