import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

// Replace with your Firebase project config
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || 'your-api-key',
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || 'your-project.firebaseapp.com',
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || 'your-project-id',
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || 'your-project.appspot.com',
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || '000000000',
  appId: process.env.REACT_APP_FIREBASE_APP_ID || 'your-app-id',
};

const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

export const requestNotificationPermission = async () => {
  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return null;

    const token = await getToken(messaging, {
      vapidKey: process.env.REACT_APP_FIREBASE_VAPID_KEY,
    });
    console.log('FCM Token:', token);
    return token;
  } catch (err) {
    console.error('FCM permission error:', err);
    return null;
  }
};

export const onForegroundMessage = (callback) => {
  return onMessage(messaging, (payload) => {
    console.log('FCM foreground message:', payload);
    callback(payload);
  });
};

export default app;
