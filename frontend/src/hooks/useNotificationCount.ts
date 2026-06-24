import { useState, useEffect } from 'react';
import axios from 'axios';

export function useNotificationCount(refreshInterval: number = 3000) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCount = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        setUnreadCount(0);
        return;
      }

      const response = await axios.get(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/notifications`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        setUnreadCount(response.data.data.unread_count || 0);
        setError(null);
      }
    } catch (err) {
      console.error('[useNotificationCount] Error:', err);
      setError('Failed to fetch notification count');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCount();
    const interval = setInterval(fetchCount, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval]);

  return { unreadCount, loading, error, refetch: fetchCount };
}
