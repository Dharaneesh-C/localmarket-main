importScripts('https://www.gstatic.com/firebasejs/10.9.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.9.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyAxWzWgK5NlUFC5hSTWRVhA7GdGvy668Fw",
  authDomain: "dharaneesh04.firebaseapp.com",
  projectId: "dharaneesh04",
  storageBucket: "dharaneesh04.firebasestorage.app",
  messagingSenderId: "297825227745",
  appId: "1:297825227745:web:e1b39179ff1f70676bf8a0",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('Background FCM message:', payload);

  // FIX: the backend now sends DATA-ONLY messages (see fcm_service.py) so that
  // Android's native app reliably routes every push through
  // MyFirebaseMessagingService.onMessageReceived(), even when backgrounded/killed.
  // A side effect: payload.notification no longer exists for ANY client, including
  // this web/PWA service worker — it must read title/body from payload.data instead.
  // Reading payload.notification here would throw (Cannot read properties of
  // undefined) and silently drop the notification.
  const title = payload.data?.title || 'NearSell';
  const body = payload.data?.body || 'You have a new notification.';

  self.registration.showNotification(title, {
    body,
    icon: '/logo192.png',
    badge: '/logo192.png',
    vibrate: [300, 200, 300, 200, 300],
    // Same tag+order_id groups repeated arrival pings for the same order into
    // one notification instead of stacking duplicates.
    tag: payload.data?.order_id || undefined,
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
