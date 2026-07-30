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
