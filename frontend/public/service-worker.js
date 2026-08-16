/* eslint-disable no-restricted-globals */

// BUG FIX: CACHE_NAME was a hardcoded string ('nearsell-v1') that never
// changed between deploys, and index.html (an unhashed URL) was in
// STATIC_ASSETS. Every deploy produces a new content-hashed JS bundle
// (e.g. main.abc123.js), but index.html is what references that hash —
// so once index.html got cached once, phones kept serving that stale
// index.html forever, which pointed at the OLD JS bundle. Code fixes
// (like the ?mode=signup routing fix) would ship correctly to Vercel but
// never actually reach anyone whose browser/PWA had already cached the
// old index.html. This is why "works on laptop, broken on phone" — the
// laptop's cache happened to be cleared/newer, the phone's wasn't.
//
// Fix: bump this on every meaningful SW change, AND — more importantly —
// never cache index.html / navigation requests at all. Only long-lived,
// content-hashed static assets (JS/CSS under /static/) are safe to
// cache, because their URL itself changes when the content changes.
const CACHE_NAME = 'nearsell-v2-no-html-cache';

// ─── Install ──────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// ─── Activate: clean out every old cache (including the old v1 that may
// still be holding a stale index.html on returning users' devices) ────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ─── Fetch ────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Skip non-GET and API calls
  if (request.method !== 'GET') return;
  if (request.url.includes('/api/')) return;

  // Navigation requests (the HTML document itself, i.e. index.html via the
  // SPA rewrite) — ALWAYS go to the network. Never serve a cached copy,
  // even as an offline fallback, because a stale index.html silently
  // un-ships every JS fix that's already deployed. If the network is down,
  // let it fail naturally rather than resurrect old code.
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request));
    return;
  }

  // Everything else (content-hashed JS/CSS/images under /static/) is safe
  // to cache long-term, since a code change always produces a new URL.
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
});

// ─── Push Notifications ───────────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  let data = { title: 'NearSell', body: 'You have a new notification', type: 'general' };
  try {
    data = event.data.json();
  } catch (e) {}

  const options = {
    body: data.body,
    icon: '/logo192.png',
    badge: '/logo192.png',
    tag: data.order_id || 'nearsell-notif',
    renotify: true,
    requireInteraction: data.type === 'merchant_arrived' || data.type === 'new_order',
    vibrate: [200, 100, 200],
    data: { url: data.url || '/', type: data.type },
    actions: data.type === 'new_order'
      ? [{ action: 'view', title: 'View Order' }]
      : [],
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// ─── Notification click ───────────────────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});
