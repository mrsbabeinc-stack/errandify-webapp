// Notification store utility

export interface Notification {
  id: string;
  type: 'message' | 'offer' | 'status' | 'system';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  relatedId?: number; // errand/conversation id
  action?: {
    label: string;
    url: string;
  };
}

const NOTIFICATIONS_KEY = 'appNotifications';

export const getNotifications = (): Notification[] => {
  try {
    const stored = localStorage.getItem(NOTIFICATIONS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

export const addNotification = (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>): void => {
  const notifications = getNotifications();
  const newNotification: Notification = {
    ...notification,
    id: `notif-${Date.now()}`,
    timestamp: new Date().toISOString(),
    read: false,
  };

  notifications.unshift(newNotification);
  // Keep only last 50 notifications
  if (notifications.length > 50) {
    notifications.pop();
  }

  localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(notifications));
};

export const markNotificationAsRead = (id: string): void => {
  const notifications = getNotifications();
  const notification = notifications.find((n) => n.id === id);
  if (notification) {
    notification.read = true;
    localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(notifications));
  }
};

export const markAllAsRead = (): void => {
  const notifications = getNotifications();
  notifications.forEach((n) => (n.read = true));
  localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(notifications));
};

export const deleteNotification = (id: string): void => {
  const notifications = getNotifications().filter((n) => n.id !== id);
  localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(notifications));
};

export const getUnreadCount = (): number => {
  return getNotifications().filter((n) => !n.read).length;
};

export const clearAllNotifications = (): void => {
  localStorage.removeItem(NOTIFICATIONS_KEY);
};
