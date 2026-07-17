/**
 * Errandify-themed toast notification system
 * Centralized notification utility for the entire app
 */

import { useNotificationToast } from '../context/NotificationContext';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ErrandifyToastOptions {
  title: string;
  body: string;
  type?: ToastType;
  duration?: number;
  icon?: string;
  actionLabel?: string;
  actionUrl?: string;
}

/**
 * Hook-based toast notifications - use inside React components
 */
export function useErrandifyToast() {
  const { addToast } = useNotificationToast();

  const success = (title: string, body: string, duration = 5000) => {
    addToast({
      title,
      body,
      type: 'success',
      duration,
      icon: '✓',
    });
  };

  const error = (title: string, body: string, duration = 7000) => {
    addToast({
      title,
      body,
      type: 'error',
      duration,
      icon: '✕',
    });
  };

  const warning = (title: string, body: string, duration = 6000) => {
    addToast({
      title,
      body,
      type: 'warning',
      duration,
      icon: '⚠',
    });
  };

  const info = (title: string, body: string, duration = 5000) => {
    addToast({
      title,
      body,
      type: 'info',
      duration,
      icon: 'ℹ',
    });
  };

  const custom = (options: ErrandifyToastOptions) => {
    addToast({
      title: options.title,
      body: options.body,
      type: options.type || 'info',
      duration: options.duration || 5000,
      icon: options.icon,
      actionLabel: options.actionLabel,
      actionUrl: options.actionUrl,
    });
  };

  return {
    success,
    error,
    warning,
    info,
    custom,
  };
}

/**
 * Standalone toast notifications - use outside React components
 * Dispatches custom events that components can listen to
 */
export const errandifyToastStandalone = {
  success: (title: string, body: string) => {
    window.dispatchEvent(
      new CustomEvent('errandify-toast', {
        detail: { title, body, type: 'success', icon: '✓' },
      })
    );
  },
  error: (title: string, body: string) => {
    window.dispatchEvent(
      new CustomEvent('errandify-toast', {
        detail: { title, body, type: 'error', icon: '✕' },
      })
    );
  },
  warning: (title: string, body: string) => {
    window.dispatchEvent(
      new CustomEvent('errandify-toast', {
        detail: { title, body, type: 'warning', icon: '⚠' },
      })
    );
  },
  info: (title: string, body: string) => {
    window.dispatchEvent(
      new CustomEvent('errandify-toast', {
        detail: { title, body, type: 'info', icon: 'ℹ' },
      })
    );
  },
};

/**
 * Common toast messages for frequent operations
 */
export const commonToasts = {
  saved: () => ({
    title: '✓ Saved',
    body: 'Changes saved successfully',
  }),
  deleted: () => ({
    title: '✓ Deleted',
    body: 'Item deleted successfully',
  }),
  created: () => ({
    title: '✓ Created',
    body: 'Item created successfully',
  }),
  updated: () => ({
    title: '✓ Updated',
    body: 'Item updated successfully',
  }),
  error: (message?: string) => ({
    title: '✕ Error',
    body: message || 'An error occurred',
  }),
  loading: () => ({
    title: '⏳ Loading',
    body: 'Please wait...',
  }),
  copied: () => ({
    title: '✓ Copied',
    body: 'Copied to clipboard',
  }),
  networkError: () => ({
    title: '✕ Network Error',
    body: 'Unable to connect. Please check your internet.',
  }),
  unauthorized: () => ({
    title: '✕ Unauthorized',
    body: 'You do not have permission for this action',
  }),
  notFound: () => ({
    title: '✕ Not Found',
    body: 'The item you requested was not found',
  }),
};
