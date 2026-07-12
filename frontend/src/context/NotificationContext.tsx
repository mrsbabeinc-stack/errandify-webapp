import React, { createContext, useContext, useState, useCallback } from 'react';

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  body: string;
  icon?: string;
  actionLabel?: string;
  actionUrl?: string;
  duration?: number; // ms, 0 = no auto-dismiss
}

interface NotificationContextType {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  clearAllToasts: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    const duration = toast.duration ?? 10000; // Default 10 seconds
    const newToast: Toast = {
      ...toast,
      id,
      duration: duration,
    };

    setToasts((prev) => [...prev, newToast]);

    // Auto-dismiss if duration > 0
    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const clearAllToasts = useCallback(() => {
    setToasts([]);
  }, []);

  return (
    <NotificationContext.Provider value={{ toasts, addToast, removeToast, clearAllToasts }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotificationToast() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotificationToast must be used within NotificationProvider');
  }
  return context;
}
