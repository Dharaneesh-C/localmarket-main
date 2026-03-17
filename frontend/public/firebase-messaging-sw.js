importScripts('https://www.gstatic.com/firebasejs/10.9.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.9.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: self.FIREBASE_API_KEY || 'your-api-key',
  authDomain: self.FIREBASE_AUTH_DOMAIN || 'your-project.firebaseapp.com',
  projectId: self.FIREBASE_PROJECT_ID || 'your-project-id',
  storageBucket: self.FIREBASE_STORAGE_BUCKET || 'your-project.appspot.com',
  messagingSenderId: self.FIREBASE_MESSAGING_SENDER_ID || '000',
  appId: self.FIREBASE_APP_ID || 'your-app-id',
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('Background FCM message:', payload);
  const { title, body } = payload.notification;
  self.registration.showNotification(title, {
    body,
    icon: '/logo192.png',
    badge: '/logo192.png',
    data: payload.data,
  });
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const productId = event.notification.data?.product_id;
  if (productId) {
    event.waitUntil(clients.openWindow(`/buyer?product=${productId}`));
  }
});
