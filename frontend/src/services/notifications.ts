export type NotificationTier = 'critical' | 'important' | 'info';
export type NotificationType = 'bid_accepted' | 'job_confirmed' | 'job_started' | 'job_completed' | 'dispute_raised' | 'bid_received' | 'bid_rejected' | 'message' | 'progress_update';

export interface Notification {
  id: string;
  type: NotificationType;
  tier: NotificationTier;
  title: string;
  message: string;
  action?: { label: string; path: string };
  timestamp: Date;
  read: boolean;
}

class NotificationService {
  private notifications: Notification[] = [];
  private listeners: Array<(notifications: Notification[]) => void> = [];

  subscribe(callback: (notifications: Notification[]) => void) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.notifications));
  }

  add(notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) {
    const newNotification: Notification = {
      ...notification,
      id: Date.now().toString(),
      timestamp: new Date(),
      read: false,
    };
    this.notifications.unshift(newNotification);
    this.notifyListeners();

    // Auto-dismiss non-critical after 5s
    if (notification.tier !== 'critical') {
      setTimeout(() => this.remove(newNotification.id), 5000);
    }

    return newNotification;
  }

  remove(id: string) {
    this.notifications = this.notifications.filter(n => n.id !== id);
    this.notifyListeners();
  }

  markAsRead(id: string) {
    const notif = this.notifications.find(n => n.id === id);
    if (notif) {
      notif.read = true;
      this.notifyListeners();
    }
  }

  getAll() {
    return this.notifications;
  }

  getUnread() {
    return this.notifications.filter(n => !n.read);
  }

  getByTier(tier: NotificationTier) {
    return this.notifications.filter(n => n.tier === tier);
  }

  clear() {
    this.notifications = [];
    this.notifyListeners();
  }
}

export const notificationService = new NotificationService();

// Preset notification templates
export const NotificationTemplates = {
  bidAccepted: (doerName: string, amount: number): Omit<Notification, 'id' | 'timestamp' | 'read'> => ({
    type: 'bid_accepted',
    tier: 'critical',
    title: '✅ Your bid was accepted!',
    message: `${doerName} accepted your $${amount} bid. Confirm within 24 hours.`,
    action: { label: 'Confirm Job', path: '/my-bids' },
  }),

  jobConfirmed: (askerName: string): Omit<Notification, 'id' | 'timestamp' | 'read'> => ({
    type: 'job_confirmed',
    tier: 'critical',
    title: '🟢 Job confirmed!',
    message: `${askerName} confirmed you'll do the job. Payment is held in escrow.`,
    action: { label: 'Start Job', path: '/my-bids' },
  }),

  jobStarted: (taskName: string): Omit<Notification, 'id' | 'timestamp' | 'read'> => ({
    type: 'job_started',
    tier: 'important',
    title: '🔄 Job started',
    message: `You started working on "${taskName}". Submit work proof when done.`,
    action: { label: 'View Task', path: '/errands' },
  }),

  bidRejected: (reason: string): Omit<Notification, 'id' | 'timestamp' | 'read'> => ({
    type: 'bid_rejected',
    tier: 'important',
    title: '❌ Bid rejected',
    message: `Your bid was rejected: ${reason}. Try another errand!`,
    action: { label: 'Browse Errands', path: '/browse' },
  }),

  messageReceived: (senderName: string): Omit<Notification, 'id' | 'timestamp' | 'read'> => ({
    type: 'message',
    tier: 'important',
    title: '💬 New message',
    message: `${senderName} sent you a message`,
    action: { label: 'Open MyChat', path: '/chat' },
  }),

  timeout24h: (action: string): Omit<Notification, 'id' | 'timestamp' | 'read'> => ({
    type: 'bid_accepted',
    tier: 'critical',
    title: '⏰ 1 hour left!',
    message: `${action} within 1 hour or job reopens for other doers.`,
    action: { label: 'Act Now', path: '/my-bids' },
  }),

  timeout48h: (): Omit<Notification, 'id' | 'timestamp' | 'read'> => ({
    type: 'job_completed',
    tier: 'critical',
    title: '⏰ Dispute window closing',
    message: 'You have 1 hour left to raise a dispute. After that, payment is auto-released.',
    action: { label: 'Review Job', path: '/errands' },
  }),
};
