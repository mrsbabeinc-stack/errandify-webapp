// Push Notifications Manager
// Handles Service Worker registration, push subscription, and notification management

export interface PushNotificationData {
  title: string;
  body: string;
  tag?: string;
  url?: string;
  data?: Record<string, any>;
  icon?: string;
  badge?: string;
}

let registration: ServiceWorkerRegistration | null = null;

/**
 * Initialize push notifications on app load
 */
export async function initPushNotifications() {
  try {
    // Check browser support
    if (!('serviceWorker' in navigator)) {
      console.warn('Service Workers not supported');
      return false;
    }

    if (!('PushManager' in window)) {
      console.warn('Push Manager not supported');
      return false;
    }

    if (!('Notification' in window)) {
      console.warn('Notifications not supported');
      return false;
    }

    // Register service worker - DISABLED FOR DEVELOPMENT
    // registration = await navigator.serviceWorker.register('/service-worker.js');
    // console.log('Service Worker registered:', registration);
    return false;

    // Request permission if not already granted
    if (Notification.permission === 'default') {
      await requestNotificationPermission();
    }

    // Subscribe to push if permission granted
    if (Notification.permission === 'granted') {
      await subscribeToPush();
    }

    // Listen for online/offline events
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return true;
  } catch (error) {
    console.error('Failed to initialize push notifications:', error);
    return false;
  }
}

/**
 * Request user permission for notifications
 */
async function requestNotificationPermission(): Promise<boolean> {
  try {
    const permission = await Notification.requestPermission();
    console.log('Notification permission:', permission);

    if (permission === 'granted') {
      await subscribeToPush();
      return true;
    }
    return false;
  } catch (error) {
    console.error('Failed to request notification permission:', error);
    return false;
  }
}

/**
 * Subscribe to push notifications
 */
async function subscribeToPush(): Promise<PushSubscription | null> {
  try {
    if (!registration) {
      console.error('Service Worker not registered');
      return null;
    }

    const existingSubscription = await registration.pushManager.getSubscription();

    if (existingSubscription) {
      console.log('Already subscribed to push notifications');
      return existingSubscription;
    }

    // Create new subscription
    // Was process.env.REACT_APP_VAPID_PUBLIC_KEY — a Create React App name in a
    // Vite project, so `process` was undefined and this threw before it could
    // even check for the key. Vite exposes env vars on import.meta.env.
    const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
    if (!vapidPublicKey) {
      console.warn('VAPID public key not configured');
      return null;
    }

    const newSubscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    });

    console.log('Subscribed to push notifications:', newSubscription);

    // Send subscription to backend
    await sendSubscriptionToBackend(newSubscription);

    return newSubscription;
  } catch (error) {
    console.error('Failed to subscribe to push:', error);
    return null;
  }
}

/**
 * Send subscription to backend
 */
async function sendSubscriptionToBackend(subscription: PushSubscription): Promise<void> {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      console.warn('No auth token available');
      return;
    }

    const response = await fetch('/api/notifications/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        subscription: subscription.toJSON(),
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    console.log('Push subscription sent to backend');
  } catch (error) {
    console.error('Failed to send subscription to backend:', error);
  }
}

/**
 * Show a push notification
 */
export async function showPushNotification(data: PushNotificationData): Promise<void> {
  try {
    if (!registration) {
      console.error('Service Worker not registered');
      return;
    }

    if (Notification.permission !== 'granted') {
      console.warn('Push notifications not permitted');
      return;
    }

    await registration.showNotification(data.title, {
      body: data.body,
      tag: data.tag || 'errandify-notification',
      icon: data.icon || '/errandify-icon-192.png',
      badge: data.badge || '/errandify-badge-72.png',
      data: data.data || {},
      vibrate: [100, 50, 100],
      requireInteraction: false,
    });
  } catch (error) {
    console.error('Failed to show notification:', error);
  }
}

/**
 * Queue notification for offline delivery
 */
export async function queueNotificationForOffline(data: PushNotificationData): Promise<void> {
  try {
    const db = await openIndexedDB();
    const transaction = db.transaction('notificationQueue', 'readwrite');
    const store = transaction.objectStore('notificationQueue');

    const queuedNotification = {
      id: Date.now(),
      title: data.title,
      body: data.body,
      options: {
        body: data.body,
        icon: data.icon || '/errandify-icon-192.png',
        badge: data.badge || '/errandify-badge-72.png',
        tag: data.tag || 'errandify-notification',
        data: data.data || {},
      },
      createdAt: new Date().toISOString(),
    };

    store.add(queuedNotification);
    console.log('Notification queued for offline delivery:', queuedNotification.id);
  } catch (error) {
    console.error('Failed to queue notification:', error);
  }
}

/**
 * Open IndexedDB
 */
function openIndexedDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('ErrandifyDB', 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('notificationQueue')) {
        db.createObjectStore('notificationQueue', { keyPath: 'id' });
      }
    };
  });
}

/**
 * Get notification permission status
 */
export function getNotificationPermissionStatus(): NotificationPermission {
  return Notification.permission;
}

/**
 * Request permission manually (for settings page)
 */
export async function requestNotificationPermissionManual(): Promise<boolean> {
  return await requestNotificationPermission();
}

/**
 * Check if push notifications are supported
 */
export function isPushNotificationSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

/**
 * Handle when user comes back online
 */
function handleOnline(): void {
  console.log('User is back online');
  // Trigger background sync for queued notifications
  if (registration && 'sync' in registration) {
    registration.sync.register('sync-notifications').catch((error) => {
      console.error('Failed to register sync:', error);
    });
  }
}

/**
 * Handle when user goes offline
 */
function handleOffline(): void {
  console.log('User is offline');
  // Notifications will be queued automatically
}

/**
 * Unsubscribe from push notifications
 */
export async function unsubscribeFromPush(): Promise<void> {
  try {
    if (!registration) return;

    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      await subscription.unsubscribe();
      console.log('Unsubscribed from push notifications');
    }
  } catch (error) {
    console.error('Failed to unsubscribe from push:', error);
  }
}

/**
 * Convert VAPID key from base64 to Uint8Array
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
