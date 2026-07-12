// ArtistrySynk Service Worker - PWA + Push Notifications
const CACHE_NAME = 'artistrysynk-cache-v4';
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/favicon.ico'
];

const isAppShellAsset = (pathname) =>
  pathname.startsWith('/assets/') || pathname.match(/\.(js|css)$/);

const isStaticMediaAsset = (pathname) =>
  pathname.match(/\.(png|jpg|jpeg|webp|svg|woff2?|ttf|ico)$/);

// Install: pre-cache static shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
});

// Allow the page to trigger activation of a waiting SW
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => clients.claim())
  );
});

// Fetch: always prefer fresh app code on live site
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and cross-origin
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  // Never cache OAuth or edge function calls
  if (url.pathname.startsWith('/~oauth') || url.pathname.includes('/functions/')) return;

  // API calls: network only
  if (url.pathname.includes('/rest/') || url.pathname.includes('/auth/')) return;

  // Navigation: network-first with offline fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return res;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match('/')))
    );
    return;
  }

  // Fresh app bundles first so published updates show up immediately
  if (isAppShellAsset(url.pathname)) {
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return res;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Images/fonts/icons: cache-first
  if (isStaticMediaAsset(url.pathname)) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((res) => {
            if (res.ok) {
              const clone = res.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
            }
            return res;
          })
      )
    );
    return;
  }
});

// Push notifications
self.addEventListener('push', (event) => {
  if (!event.data) return;
  try {
    const data = event.data.json();
    const options = {
      body: data.body || 'You have a new notification',
      icon: data.icon || '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      vibrate: [100, 50, 100],
      data: { dateOfArrival: Date.now(), url: data.url || '/', ...data.data },
      actions: data.actions || [],
      tag: data.tag || 'default',
      renotify: data.renotify || false,
      requireInteraction: data.requireInteraction || false
    };
    event.waitUntil(self.registration.showNotification(data.title || 'ArtistrySynk', options));
  } catch (error) {
    event.waitUntil(
      self.registration.showNotification('ArtistrySynk', {
        body: event.data.text() || 'You have a new notification',
        icon: '/icons/icon-192.png'
      })
    );
  }
});

// Notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus().then(() => ('navigate' in client ? client.navigate(url) : null));
        }
      }
      return clients.openWindow ? clients.openWindow(url) : null;
    })
  );
});

self.addEventListener('notificationclose', () => {});

// Background sync
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-notifications') {
    event.waitUntil(Promise.resolve());
  }
});
