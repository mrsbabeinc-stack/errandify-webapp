import { useEffect, useState, useCallback } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || window.location.origin;
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';

interface PushSubscriptionJSON {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export function usePushNotifications() {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check if push notifications are supported
  useEffect(() => {
    const supported =
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window;

    setIsSupported(supported);

    if (supported) {
      checkSubscription();
    } else {
      setIsLoading(false);
    }
  }, []);

  const checkSubscription = useCallback(async () => {
    try {
      if (!('serviceWorker' in navigator)) {
        setIsLoading(false);
        return;
      }

      const registration = await navigator.serviceWorker.getRegistration();
      if (!registration) {
        setIsLoading(false);
        return;
      }

      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
    } catch (err) {
      console.error('Error checking push subscription:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const subscribe = useCallback(async () => {
    if (!isSupported) {
      setError('Push notifications not supported in this browser');
      return false;
    }

    try {
      setError(null);

      // Request notification permission
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setError('Notification permission denied');
        return false;
      }

      // Register service worker
      let registration;
      try {
        registration = await navigator.serviceWorker.register(
          '/service-worker.js',
          { scope: '/' }
        );
      } catch (swErr) {
        console.warn('Service worker registration failed (expected in dev):', swErr);
        setError('Push notifications require HTTPS in production');
        return false;
      }

      // Subscribe to push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      // Send subscription to backend
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_URL}/api/push/subscribe`,
        {
          subscription: subscription.toJSON(),
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setIsSubscribed(true);
      return true;
    } catch (err) {
      console.error('Error subscribing to push:', err);
      const message = err instanceof Error ? err.message : 'Failed to subscribe';
      // Only show certain errors to user
      if (message.includes('Service Worker')) {
        setError('Push notifications require HTTPS in production');
      } else if (!message.includes('Subscription failed')) {
        setError(message);
      }
      return false;
    }
  }, [isSupported]);

  const unsubscribe = useCallback(async () => {
    try {
      setError(null);

      const registration = await navigator.serviceWorker.getRegistration();
      if (!registration) return false;

      const subscription = await registration.pushManager.getSubscription();
      if (!subscription) return false;

      // Unsubscribe from browser
      await subscription.unsubscribe();

      // Notify backend
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_URL}/api/push/unsubscribe`,
        {
          endpoint: subscription.endpoint,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setIsSubscribed(false);
      return true;
    } catch (err) {
      console.error('Error unsubscribing from push:', err);
      setError(err instanceof Error ? err.message : 'Failed to unsubscribe');
      return false;
    }
  }, []);

  return {
    isSupported,
    isSubscribed,
    isLoading,
    error,
    subscribe,
    unsubscribe,
  };
}

// Helper function to convert VAPID key
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}
