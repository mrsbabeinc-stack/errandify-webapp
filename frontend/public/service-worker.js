// Service Worker for Push Notifications
// Handles background sync, push events, and offline notifications

const CACHE_NAME = 'errandify-v31-referral-tracking';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
];

// Install event - cache essential files
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Cache opened, adding files');
      return cache.addAll(urlsToCache).catch((error) => {
        console.warn('Some files failed to cache:', error);
      });
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Push event - Handle incoming push notifications
self.addEventListener('push', (event) => {
  console.log('Push event received:', event);

  let notificationData = {
    title: 'Errandify',
    body: 'New notification',
    icon: '/errandify-icon-192.png',
    badge: '/errandify-badge-72.png',
    tag: 'errandify-notification',
    data: {},
  };

  if (event.data) {
    try {
      const data = event.data.json();
      notificationData = {
        ...notificationData,
        ...data,
      };
    } catch (error) {
      console.error('Failed to parse push data:', error);
      notificationData.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(notificationData.title, {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      tag: notificationData.tag,
      data: notificationData.data,
      actions: [
        {
          action: 'open',
          title: 'Open',
        },
        {
          action: 'close',
          title: 'Close',
        },
      ],
      vibrate: [100, 50, 100],
      requireInteraction: false,
    })
  );
});

// Notification click event - Open app when notification is clicked
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event.notification.tag);

  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  // Build URL based on notification data
  let url = '/';
  if (event.notification.data && event.notification.data.url) {
    url = event.notification.data.url;
  }

  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      // Check if app is already open
      for (let client of clientList) {
        if (client.url === url && 'focus' in client) {
          return client.focus();
        }
      }
      // Open app if not already open
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});

// Background sync - Sync notifications when back online
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-notifications') {
    event.waitUntil(syncQueuedNotifications());
  }
});

async function syncQueuedNotifications() {
  try {
    const db = await openIndexedDB();
    if (!db.objectStoreNames.contains('notificationQueue')) {
      console.log('notificationQueue store does not exist yet');
      return;
    }

    const transaction = db.transaction('notificationQueue', 'readonly');
    const store = transaction.objectStore('notificationQueue');
    const allNotifications = await getAllFromStore(store);

    console.log('Syncing queued notifications:', allNotifications.length);

    for (let notification of allNotifications) {
      try {
        await self.registration.showNotification(notification.title, {
          body: notification.body,
          icon: notification.options?.icon || '/errandify-icon-192.png',
          badge: notification.options?.badge || '/errandify-badge-72.png',
          tag: notification.options?.tag || 'errandify-notification',
          data: notification.options?.data || {},
        });

        // Remove from queue after showing
        const deleteTransaction = db.transaction('notificationQueue', 'readwrite');
        const deleteStore = deleteTransaction.objectStore('notificationQueue');
        deleteStore.delete(notification.id);
      } catch (error) {
        console.error('Failed to show queued notification:', error);
      }
    }
  } catch (error) {
    console.error('Sync notifications failed:', error);
    throw error; // Retry sync
  }
}

function getAllFromStore(store) {
  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

function openIndexedDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('ErrandifyDB', 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('notificationQueue')) {
        db.createObjectStore('notificationQueue', { keyPath: 'id' });
      }
    };
  });
}

// Fetch event - Network first strategy with fallback to cache
// BUT: Always fetch CSS, JS, and HTML from network to ensure fresh styles
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {
    return;
  }

  const url = new URL(event.request.url);

  // Always fetch CSS, JS, and HTML from network (no caching)
  if (url.pathname.endsWith('.css') ||
      url.pathname.endsWith('.js') ||
      url.pathname.endsWith('.html') ||
      url.pathname.endsWith('/') ||
      url.pathname === '/create-errand') {
    event.respondWith(fetch(event.request));
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (!response || response.status !== 200 || response.type === 'error') {
          return response;
        }
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        return response;
      })
      .catch(() => {
        return caches.match(event.request).then((response) => {
          return response || new Response('Offline - page not cached', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers({
              'Content-Type': 'text/plain',
            }),
          });
        });
      })
  );
});

console.log('Service Worker loaded and ready');
