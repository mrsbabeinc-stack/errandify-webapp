// Notification service for managing notifications
import axios from 'axios';

export interface Notification {
  id: string;
  userId: number;
  type: string;
  title: string;
  message: string;
  relatedErrandId?: number;
  read: boolean;
  tier: 'critical' | 'important' | 'info';
  action?: {
    label: string;
    path: string;
  };
  createdAt: string;
}

class NotificationService {
  private subscribers: Set<(notifications: Notification[]) => void> = new Set();
  private notifications: Notification[] = [];
  private pollInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startPolling();
  }

  subscribe(callback: (notifications: Notification[]) => void) {
    this.subscribers.add(callback);
    // Send current notifications immediately
    callback(this.notifications);
    // Return unsubscribe function
    return () => {
      this.subscribers.delete(callback);
    };
  }

  private notifySubscribers() {
    this.subscribers.forEach(callback => callback(this.notifications));
  }

  private startPolling() {
    // Poll for new notifications every 5 seconds
    this.pollInterval = setInterval(() => {
      this.fetchNotifications();
    }, 5000);
  }

  stopPolling() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  private async fetchNotifications() {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await axios.get(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/notifications`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success) {
        const notificationData = Array.isArray(response.data.data) ? response.data.data : [];
        // Transform database notifications to UI format
        this.notifications = notificationData.map((notif: any) => ({
          id: notif.id?.toString() || `notif_${Date.now()}`,
          userId: notif.user_id,
          type: notif.type || 'info',
          title: notif.title || 'Notification',
          message: notif.message || '',
          relatedErrandId: notif.related_errand_id,
          read: notif.is_read || false,
          tier: this.getTier(notif.type),
          action: this.getAction(notif.type, notif.related_errand_id),
          createdAt: notif.created_at,
        }));

        this.notifySubscribers();
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      this.notifications = [];
      this.notifySubscribers();
    }
  }

  private getTier(type: string): 'critical' | 'important' | 'info' {
    const criticalTypes = ['bid_accepted', 'payment_released', 'dispute_raised'];
    const importantTypes = ['bid_placed', 'task_completed', 'rating_received', 'payment_sent'];

    if (criticalTypes.includes(type)) return 'critical';
    if (importantTypes.includes(type)) return 'important';
    return 'info';
  }

  private getAction(type: string, errandId?: number) {
    if (!errandId) return undefined;

    const actions: Record<string, { label: string; pathPrefix: string }> = {
      bid_placed: { label: 'View Offers', pathPrefix: '/errand/' },
      bid_accepted: { label: 'Start Job', pathPrefix: '/errand/' },
      task_completed: { label: 'Review Work', pathPrefix: '/errand/' },
      rating_received: { label: 'View Rating', pathPrefix: '/profile/' },
      payment_released: { label: 'View Details', pathPrefix: '/my-offer' },
      payment_sent: { label: 'View Details', pathPrefix: '/my-offer' },
    };

    const action = actions[type];
    if (!action) return undefined;

    return {
      label: action.label,
      path: `${action.pathPrefix}${errandId}`,
    };
  }

  async markAsRead(notificationId: string) {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      await axios.patch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/notifications/${notificationId}/read`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      // Update local state
      const notif = this.notifications.find(n => n.id === notificationId);
      if (notif) {
        notif.read = true;
        this.notifySubscribers();
      }
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  }

  async clear() {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      await axios.delete(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/notifications`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      this.notifications = [];
      this.notifySubscribers();
    } catch (error) {
      console.error('Failed to clear notifications:', error);
    }
  }

  destroy() {
    this.stopPolling();
    this.subscribers.clear();
  }
}

export const notificationService = new NotificationService();
