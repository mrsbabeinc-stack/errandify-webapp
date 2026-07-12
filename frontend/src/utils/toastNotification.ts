/**
 * Toast Notification Utility
 * Makes it easy to show bottom-right toast notifications
 *
 * Usage:
 * import { showToast, showToastSuccess, showToastError } from '@/utils/toastNotification';
 *
 * // Simple usage
 * showToastSuccess('Profile updated!');
 * showToastError('Failed to upload');
 * showToastWarning('Leave rejected');
 * showToastInfo('New message received');
 *
 * // Advanced usage
 * showToast({
 *   type: 'success',
 *   title: 'Success!',
 *   body: 'Your profile has been updated',
 *   icon: '✓',
 *   actionLabel: 'View Profile',
 *   actionUrl: '/profile',
 *   duration: 5000
 * });
 */

import { useNotificationToast } from '../context/NotificationContext';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastConfig {
  type: ToastType;
  title: string;
  body?: string;
  icon?: string;
  actionLabel?: string;
  actionUrl?: string;
  duration?: number;
}

/**
 * Global toast notification function (requires context)
 * Use inside React components with the useNotificationToast hook
 */
export const useToastNotification = () => {
  const { addToast } = useNotificationToast();

  const showToast = (config: ToastConfig) => {
    addToast({
      type: config.type,
      title: config.title,
      body: config.body || '',
      icon: config.icon,
      actionLabel: config.actionLabel,
      actionUrl: config.actionUrl,
      duration: config.duration ?? 5000,
    });
  };

  const showSuccess = (title: string, body?: string, duration = 5000) => {
    showToast({
      type: 'success',
      title,
      body: body || title,
      icon: '✓',
      duration,
    });
  };

  const showError = (title: string, body?: string, duration = 5000) => {
    showToast({
      type: 'error',
      title,
      body: body || title,
      icon: '✗',
      duration,
    });
  };

  const showWarning = (title: string, body?: string, duration = 5000) => {
    showToast({
      type: 'warning',
      title,
      body: body || title,
      icon: '⚠️',
      duration,
    });
  };

  const showInfo = (title: string, body?: string, duration = 5000) => {
    showToast({
      type: 'info',
      title,
      body: body || title,
      icon: 'ℹ️',
      duration,
    });
  };

  return {
    showToast,
    showSuccess,
    showError,
    showWarning,
    showInfo,
  };
};

/**
 * Pre-built toast message templates
 */
export const toastMessages = {
  success: {
    saved: (item: string) => ({ title: `${item} saved`, body: `Your ${item} has been saved successfully` }),
    created: (item: string) => ({ title: `${item} created`, body: `Your ${item} has been created successfully` }),
    updated: (item: string) => ({ title: `${item} updated`, body: `Your ${item} has been updated successfully` }),
    deleted: (item: string) => ({ title: `${item} deleted`, body: `Your ${item} has been deleted successfully` }),
    submitted: (item: string) => ({ title: `${item} submitted`, body: `Your ${item} has been submitted successfully` }),
    approved: (item: string) => ({ title: `${item} approved`, body: `Your ${item} has been approved` }),
    completed: (item: string) => ({ title: `${item} completed`, body: `Your ${item} has been completed` }),
    uploaded: (item: string) => ({ title: `${item} uploaded`, body: `Your ${item} has been uploaded successfully` }),
  },

  error: {
    failed: (action: string) => ({ title: 'Failed', body: `Failed to ${action}. Please try again.` }),
    required: (field: string) => ({ title: 'Required field', body: `${field} is required` }),
    invalid: (field: string) => ({ title: 'Invalid input', body: `${field} is invalid` }),
    notFound: (item: string) => ({ title: 'Not found', body: `${item} not found` }),
    unauthorized: () => ({ title: 'Unauthorized', body: 'You do not have permission to do this' }),
    networkError: () => ({ title: 'Network error', body: 'Please check your connection and try again' }),
  },

  warning: {
    rejected: (item: string) => ({ title: 'Rejected', body: `Your ${item} has been rejected` }),
    cancelled: (item: string) => ({ title: 'Cancelled', body: `Your ${item} has been cancelled` }),
    expiring: (item: string) => ({ title: 'Expiring soon', body: `Your ${item} is expiring soon` }),
    insufficientBalance: (resource: string) => ({ title: 'Low balance', body: `Insufficient ${resource}` }),
  },

  info: {
    welcome: (name: string) => ({ title: 'Welcome!', body: `Welcome back, ${name}!` }),
    processing: () => ({ title: 'Processing', body: 'Your request is being processed...' }),
    hint: (message: string) => ({ title: 'Hint', body: message }),
  },
};
