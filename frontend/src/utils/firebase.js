import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, isSupported, onMessage } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
};

const hasFirebaseConfig = Object.values(firebaseConfig).every(Boolean);
const app = hasFirebaseConfig ? initializeApp(firebaseConfig) : null;

const getMessagingInstance = async () => {
  if (!app || !(await isSupported())) {
    return null;
  }

  return getMessaging(app);
};

export const requestNotificationPermission = async () => {
  try {
    if (!('Notification' in window)) return null;
    if (!hasFirebaseConfig) {
      console.warn('Firebase web config is incomplete. Push notifications are disabled.');
      return null;
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return null;

    const messaging = await getMessagingInstance();
    if (!messaging) return null;

    const registration = await navigator.serviceWorker.register(
  "/firebase-messaging-sw.js"
);

const token = await getToken(messaging, {
  vapidKey: process.env.REACT_APP_FIREBASE_VAPID_KEY,
  serviceWorkerRegistration: registration,
});
    console.log('FCM Token:', token);
    return token;
  } catch (err) {
    console.error('FCM permission error:', err);
    return null;
  }
};

export const onForegroundMessage = async (callback) => {
  const messaging = await getMessagingInstance();
  if (!messaging) {
    return () => {};
  }

  return onMessage(messaging, (payload) => {
    console.log('FCM foreground message:', payload);
    callback(payload);
  });
};

export default app;
