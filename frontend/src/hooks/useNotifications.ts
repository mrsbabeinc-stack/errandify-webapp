import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

export interface Notification {
  id: number;
  user_id: number;
  title: string;
  body: string;
  type: string;
  read: boolean;
  action_url?: string;
  created_at: string;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export function useNotifications(pollInterval = 10000) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await axios.get(`${API_URL}/api/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
        const notificationsList = response.data.data?.notifications || [];
        setNotifications(Array.isArray(notificationsList) ? notificationsList : []);
        setError(null);
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
      setError('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, pollInterval);
    return () => clearInterval(interval);
  }, [fetchNotifications, pollInterval]);

  const markAsRead = useCallback(
    async (notificationId: number) => {
      try {
        const token = localStorage.getItem('token');
        await axios.post(
          `${API_URL}/api/notifications/${notificationId}/read`,
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setNotifications((prev) =>
          prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
        );
      } catch (err) {
        console.error('Failed to mark notification as read:', err);
      }
    },
    []
  );

  const unreadCount = notifications.filter((n) => !n.read).length;

  return {
    notifications,
    unreadCount,
    loading,
    error,
    fetchNotifications,
    markAsRead,
  };
}
