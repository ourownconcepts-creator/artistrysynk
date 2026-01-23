// Service Worker for Push Notifications
const CACHE_NAME = 'artistrysynk-cache-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('push', (event) => {
  if (!event.data) {
    console.log('Push event received but no data');
    return;
  }

  try {
    const data = event.data.json();
    
    const options = {
      body: data.body || 'You have a new notification',
      icon: data.icon || '/favicon.ico',
      badge: '/favicon.ico',
      vibrate: [100, 50, 100],
      data: {
        dateOfArrival: Date.now(),
        url: data.url || '/',
        ...data.data
      },
      actions: data.actions || [],
      tag: data.tag || 'default',
      renotify: data.renotify || false,
      requireInteraction: data.requireInteraction || false
    };

    event.waitUntil(
      self.registration.showNotification(
        data.title || 'ArtistrySynk',
        options
      )
    );
  } catch (error) {
    console.error('Error processing push event:', error);
    
    // Fallback notification
    event.waitUntil(
      self.registration.showNotification('ArtistrySynk', {
        body: event.data.text() || 'You have a new notification',
        icon: '/favicon.ico'
      })
    );
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const url = event.notification.data?.url || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // If a window is already open, focus it
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            return client.focus().then(() => {
              if ('navigate' in client) {
                return client.navigate(url);
              }
            });
          }
        }
        // Otherwise, open a new window
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
  );
});

self.addEventListener('notificationclose', (event) => {
  console.log('Notification closed:', event.notification.tag);
});

// Handle background sync for offline actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-notifications') {
    event.waitUntil(syncNotifications());
  }
});

async function syncNotifications() {
  // Placeholder for syncing pending notifications when back online
  console.log('Syncing notifications...');
}

// Fetch event for caching strategies (optional)
self.addEventListener('fetch', (event) => {
  // Only cache same-origin requests
  if (event.request.url.startsWith(self.location.origin)) {
    // Network-first strategy for API calls
    if (event.request.url.includes('/api/') || event.request.url.includes('/functions/')) {
      event.respondWith(
        fetch(event.request)
          .catch(() => caches.match(event.request))
      );
    }
  }
});
