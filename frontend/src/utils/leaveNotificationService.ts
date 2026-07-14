/**
 * Leave Management Notification Service
 * Handles notifications for leave workflows
 */

export type NotificationType =
  | 'leave-applied'
  | 'leave-approved'
  | 'leave-rejected'
  | 'marked-unavailable'
  | 'recurring-approved'
  | 'holiday-blocked';

export interface LeaveNotification {
  id: string;
  type: NotificationType;
  staffName: string;
  title: string;
  message: string;
  emoji: string;
  relatedDates?: string;
  managerNote?: string;
  timestamp: string;
  isRead: boolean;
}

/**
 * Generate notification for staff applying leave
 * Sent to: Manager/Owner
 */
export function createApplicationNotification(
  staffName: string,
  dates: string,
  reason: string,
  notes?: string
): LeaveNotification {
  return {
    id: `notif-${Date.now()}`,
    type: 'leave-applied',
    staffName,
    title: `${staffName} requested leave`,
    message: `Dates: ${dates}\nReason: ${reason}${notes ? `\nNotes: ${notes}` : ''}`,
    emoji: '📋',
    relatedDates: dates,
    timestamp: new Date().toISOString(),
    isRead: false,
  };
}

/**
 * Generate notification for approved leave
 * Sent to: Staff
 */
export function createApprovedNotification(
  staffName: string,
  dates: string,
  reason: string
): LeaveNotification {
  return {
    id: `notif-${Date.now()}`,
    type: 'leave-approved',
    staffName,
    title: '✅ Your leave has been approved!',
    message: `Your leave application has been approved.\n\nDates: ${dates}\nReason: ${reason}\n\nYou are now marked unavailable. The team won't assign you any errands during this time.`,
    emoji: '✅',
    relatedDates: dates,
    timestamp: new Date().toISOString(),
    isRead: false,
  };
}

/**
 * Generate notification for rejected leave
 * Sent to: Staff
 */
export function createRejectedNotification(
  staffName: string,
  dates: string,
  reason: string,
  managerNote?: string
): LeaveNotification {
  return {
    id: `notif-${Date.now()}`,
    type: 'leave-rejected',
    staffName,
    title: '❌ Your leave application was not approved',
    message: `Your leave request was not approved.\n\nDates: ${dates}\nReason: ${reason}${managerNote ? `\n\nManager's Note: "${managerNote}"` : ''}`,
    emoji: '❌',
    relatedDates: dates,
    managerNote,
    timestamp: new Date().toISOString(),
    isRead: false,
  };
}

/**
 * Generate notification for admin marking staff unavailable
 * Sent to: Staff
 */
export function createMarkedUnavailableNotification(
  staffName: string,
  date: string,
  reason: string,
  managerName: string
): LeaveNotification {
  return {
    id: `notif-${Date.now()}`,
    type: 'marked-unavailable',
    staffName,
    title: '⚠️ You have been marked unavailable',
    message: `${managerName} has marked you unavailable on ${date}.\n\nReason: ${reason}\n\nYou won't receive errand allocations on this date.`,
    emoji: '⚠️',
    relatedDates: date,
    timestamp: new Date().toISOString(),
    isRead: false,
  };
}

/**
 * Generate notification for recurring pattern approved
 * Sent to: Staff
 */
export function createRecurringApprovedNotification(
  staffName: string,
  pattern: string,
  daysPerYear: number
): LeaveNotification {
  return {
    id: `notif-${Date.now()}`,
    type: 'recurring-approved',
    staffName,
    title: '✅ Your recurring pattern has been approved!',
    message: `Your recurring leave pattern has been approved.\n\nPattern: ${pattern}\nEstimated: ~${daysPerYear} days/year unavailable\n\nYou are now blocked from errand allocation on these days.`,
    emoji: '✅',
    timestamp: new Date().toISOString(),
    isRead: false,
  };
}

/**
 * Generate notification for public holiday
 * Sent to: All staff
 */
export function createHolidayNotification(
  holidayName: string,
  date: string,
  emoji: string = '🇸🇬'
): LeaveNotification {
  return {
    id: `notif-${Date.now()}`,
    type: 'holiday-blocked',
    staffName: 'System',
    title: `${emoji} Singapore Public Holiday - ${holidayName}`,
    message: `Company is closed on ${new Date(date).toLocaleDateString()}.\n\nNo errand allocations on this date.`,
    emoji,
    relatedDates: date,
    timestamp: new Date().toISOString(),
    isRead: false,
  };
}

/**
 * Store notifications in localStorage
 */
export function saveNotifications(notifications: LeaveNotification[]): void {
  localStorage.setItem('leaveNotifications', JSON.stringify(notifications));
}

/**
 * Load notifications from localStorage
 */
export function loadNotifications(): LeaveNotification[] {
  try {
    const saved = localStorage.getItem('leaveNotifications');
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

/**
 * Add notification
 */
export function addNotification(notification: LeaveNotification): void {
  const notifications = loadNotifications();
  notifications.unshift(notification); // Add to front
  saveNotifications(notifications.slice(0, 100)); // Keep last 100
}

/**
 * Mark notification as read
 */
export function markAsRead(notificationId: string): void {
  const notifications = loadNotifications();
  const notif = notifications.find(n => n.id === notificationId);
  if (notif) {
    notif.isRead = true;
    saveNotifications(notifications);
  }
}

/**
 * Mark all notifications as read
 */
export function markAllAsRead(): void {
  const notifications = loadNotifications();
  notifications.forEach(n => {
    n.isRead = true;
  });
  saveNotifications(notifications);
}

/**
 * Get unread count
 */
export function getUnreadCount(): number {
  return loadNotifications().filter(n => !n.isRead).length;
}

/**
 * Delete notification
 */
export function deleteNotification(notificationId: string): void {
  const notifications = loadNotifications();
  const filtered = notifications.filter(n => n.id !== notificationId);
  saveNotifications(filtered);
}

/**
 * Clear all notifications
 */
export function clearAllNotifications(): void {
  localStorage.removeItem('leaveNotifications');
}

/**
 * Get notifications by type
 */
export function getNotificationsByType(type: NotificationType): LeaveNotification[] {
  return loadNotifications().filter(n => n.type === type);
}

/**
 * Get recent notifications
 */
export function getRecentNotifications(count: number = 10): LeaveNotification[] {
  return loadNotifications().slice(0, count);
}
