// Service Worker for Push Notifications
const CACHE_NAME = 'artistry-cache-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('push', (event) => {
  if (!event.data) return;
  
  try {
    const data = event.data.json();
    
    const options = {
      body: data.body || 'You have a new notification',
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      vibrate: [100, 50, 100],
      data: {
        dateOfArrival: Date.now(),
        url: data.url || '/',
        ...data
      },
      actions: data.actions || [
        { action: 'open', title: 'Open' },
        { action: 'close', title: 'Dismiss' }
      ]
    };

    event.waitUntil(
      self.registration.showNotification(data.title || 'Artistry', options)
    );
  } catch (error) {
    // Fallback for non-JSON push data
    const text = event.data.text();
    event.waitUntil(
      self.registration.showNotification('Artistry', {
        body: text,
        icon: '/favicon.ico'
      })
    );
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'close') return;

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Check if there's already a window open
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          if (urlToOpen !== '/') {
            client.navigate(urlToOpen);
          }
          return;
        }
      }
      // If no window is open, open a new one
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Handle background sync for offline actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-notifications') {
    event.waitUntil(syncNotifications());
  }
});

async function syncNotifications() {
  // Sync any pending notification reads when back online
  try {
    const cache = await caches.open(CACHE_NAME);
    const requests = await cache.keys();
    // Process cached notification acknowledgments
    for (const request of requests) {
      if (request.url.includes('/api/notifications/ack')) {
        await fetch(request);
        await cache.delete(request);
      }
    }
  } catch (error) {
    // Silent fail - will retry on next sync
  }
}

// Periodic background sync for checking new notifications
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'check-notifications') {
    event.waitUntil(checkForNewNotifications());
  }
});

async function checkForNewNotifications() {
  // This would check for new notifications in a real implementation
  // For now, this is a placeholder for future functionality
}
