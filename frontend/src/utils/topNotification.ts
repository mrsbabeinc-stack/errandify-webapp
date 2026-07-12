/**
 * Top Notification Utility
 * Makes it easy to show top-of-screen notifications from anywhere in the app
 *
 * Usage:
 * import { showTopNotification } from '@/utils/topNotification';
 *
 * showTopNotification('success', 'Profile updated successfully!', '✓');
 * showTopNotification('error', 'Failed to upload file', '✗');
 * showTopNotification('warning', 'Leave request rejected', '⚠️');
 * showTopNotification('info', 'New message received', 'ℹ️');
 */

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

interface TopNotificationConfig {
  type: NotificationType;
  message: string;
  icon?: string;
  duration?: number;
  dismissible?: boolean;
}

export const showTopNotification = (
  type: NotificationType,
  message: string,
  icon?: string,
  duration: number = 4000
): void => {
  if (typeof window === 'undefined') return;

  (window as any).topNotification?.({
    type,
    message,
    icon,
    duration,
    dismissible: true,
  });
};

// Shorthand functions for common notification types
export const showSuccess = (message: string, icon = '✓', duration = 4000): void => {
  showTopNotification('success', message, icon, duration);
};

export const showError = (message: string, icon = '✗', duration = 4000): void => {
  showTopNotification('error', message, icon, duration);
};

export const showWarning = (message: string, icon = '⚠️', duration = 4000): void => {
  showTopNotification('warning', message, icon, duration);
};

export const showInfo = (message: string, icon = 'ℹ️', duration = 4000): void => {
  showTopNotification('info', message, icon, duration);
};

/**
 * Common notification messages for standard operations
 */
export const notifications = {
  // Success messages
  success: {
    saved: (item: string) => `✓ ${item} saved successfully`,
    created: (item: string) => `✓ ${item} created successfully`,
    updated: (item: string) => `✓ ${item} updated successfully`,
    deleted: (item: string) => `✓ ${item} deleted successfully`,
    submitted: (item: string) => `✓ ${item} submitted successfully`,
    approved: (item: string) => `✓ ${item} approved`,
    completed: (item: string) => `✓ ${item} completed`,
    uploaded: (item: string) => `✓ ${item} uploaded successfully`,
  },

  // Error messages
  error: {
    failed: (action: string) => `✗ Failed to ${action}. Please try again.`,
    required: (field: string) => `✗ ${field} is required`,
    invalid: (field: string) => `✗ ${field} is invalid`,
    notFound: (item: string) => `✗ ${item} not found`,
    unauthorized: () => '✗ You do not have permission to do this',
    networkError: () => '✗ Network error. Please check your connection.',
  },

  // Warning messages
  warning: {
    rejected: (item: string) => `${item} has been rejected`,
    cancelled: (item: string) => `${item} has been cancelled`,
    confirm: (action: string) => `⚠️ Are you sure you want to ${action}?`,
    insufficientBalance: (resource: string) => `⚠️ Insufficient ${resource}`,
    expiring: (item: string) => `⚠️ ${item} is expiring soon`,
  },

  // Info messages
  info: {
    loading: (action: string) => `ℹ️ ${action}...`,
    processing: () => 'ℹ️ Processing your request...',
    welcome: (name: string) => `ℹ️ Welcome, ${name}!`,
    hint: (message: string) => `ℹ️ ${message}`,
  },
};
