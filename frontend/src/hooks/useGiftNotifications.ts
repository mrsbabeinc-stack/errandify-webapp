import { useEffect, useState } from 'react';
import axios from 'axios';

interface GiftNotification {
  id: number;
  title: string;
  message: string;
  data: {
    senderId: number;
    senderName: string;
    points: number;
  };
}

export function useGiftNotifications() {
  const [notifications, setNotifications] = useState<GiftNotification[]>([]);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(
          `${import.meta.env.VITE_API_URL || window.location.origin}/api/notifications`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        // Filter only gift notifications that haven't been read
        const giftNotifs = response.data.data
          ?.filter((n: any) => n.type === 'gift_received' && !n.is_read)
          ?.map((n: any) => ({
            id: n.id,
            title: n.title,
            message: n.message,
            data: typeof n.data === 'string' ? JSON.parse(n.data) : n.data,
          })) || [];

        setNotifications(giftNotifs);
      } catch (error) {
        console.error('Failed to fetch notifications:', error);
      }
    };

    fetchNotifications();

    // Poll every 5 seconds for new notifications
    const interval = setInterval(fetchNotifications, 5000);
    return () => clearInterval(interval);
  }, []);

  const dismissNotification = async (notificationId: number) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `${import.meta.env.VITE_API_URL || window.location.origin}/api/notifications/${notificationId}/read`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setNotifications(notifications.filter(n => n.id !== notificationId));
    } catch (error) {
      console.error('Failed to dismiss notification:', error);
    }
  };

  return { notifications, dismissNotification };
}
