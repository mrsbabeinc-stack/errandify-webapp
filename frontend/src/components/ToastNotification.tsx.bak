import React, { useEffect, useState } from 'react';

export interface Toast {
  id: string;
  type: 'critical' | 'success' | 'info' | 'warning';
  title: string;
  message: string;
  duration?: number; // milliseconds, default 5000
  onClose?: () => void;
}

interface ToastNotificationProps {
  toast: Toast;
  onClose: () => void;
}

const ToastNotification: React.FC<ToastNotificationProps> = ({ toast, onClose }) => {
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    const duration = toast.duration || 5000;
    const timer = setTimeout(() => {
      setIsClosing(true);
      setTimeout(() => {
        onClose();
      }, 300);
    }, duration);

    return () => clearTimeout(timer);
  }, [toast.duration, onClose]);

  const handleManualClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 300);
  };

  const typeConfig = {
    critical: {
      bgColor: 'bg-red-50',
      borderColor: 'border-l-4 border-red-500',
      textColor: 'text-red-900',
      titleColor: 'text-red-900',
    },
    success: {
      bgColor: 'bg-green-50',
      borderColor: 'border-l-4 border-green-500',
      textColor: 'text-green-900',
      titleColor: 'text-green-900',
    },
    info: {
      bgColor: 'bg-blue-50',
      borderColor: 'border-l-4 border-blue-500',
      textColor: 'text-blue-900',
      titleColor: 'text-blue-900',
    },
    warning: {
      bgColor: 'bg-yellow-50',
      borderColor: 'border-l-4 border-yellow-500',
      textColor: 'text-yellow-900',
      titleColor: 'text-yellow-900',
    },
  };

  const config = typeConfig[toast.type];

  return (
    <div
      className={`
        fixed top-10 left-1/2 -translate-x-1/2 z-50 max-w-md w-full mx-auto
        transform transition-all duration-300 ease-in-out
        ${isClosing ? 'translate-y-0 opacity-0' : 'translate-y-0 opacity-100'}
      `}
    >
      <div
        className={`
          ${config.bgColor} ${config.borderColor}
          rounded-lg shadow-lg p-4 flex gap-3 items-start
        `}
      >
        {/* Close Button */}
        <button
          onClick={handleManualClose}
          className="ml-auto flex-shrink-0 text-gray-400 hover:text-gray-600 transition"
          aria-label="Close notification"
        >
          <svg
            className="w-5 h-5"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>

        {/* Content */}
        <div className="flex-1 pr-3">
          <p className={`font-semibold text-sm ${config.titleColor}`}>
            {toast.title}
          </p>
          <p className={`text-sm mt-1 ${config.textColor} opacity-90`}>
            {toast.message}
          </p>
        </div>
      </div>
    </div>
  );
};

export default ToastNotification;

// Toast Container Component - manages multiple toasts
interface ToastContainerProps {
  toasts: Toast[];
  onClose: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onClose }) => {
  return (
    <div className="fixed top-0 left-0 right-0 pointer-events-none z-50">
      <div className="flex flex-col gap-3 p-4 max-w-md mx-auto pointer-events-auto">
        {toasts.map((toast) => (
          <ToastNotification
            key={toast.id}
            toast={toast}
            onClose={() => onClose(toast.id)}
          />
        ))}
      </div>
    </div>
  );
};

// Hook for using toasts in components
export const useToast = () => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (toast: Omit<Toast, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    const newToast: Toast = {
      ...toast,
      id,
      duration: toast.duration || 5000,
    };

    setToasts((prev) => [...prev, newToast]);

    return id;
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const clearAllToasts = () => {
    setToasts([]);
  };

  return {
    toasts,
    addToast,
    removeToast,
    clearAllToasts,
  };
};

// Helper functions for common toast types
export const toast = {
  critical: (title: string, message: string, duration?: number) => ({
    type: 'critical' as const,
    title,
    message,
    duration: duration || 5000,
  }),
  success: (title: string, message: string, duration?: number) => ({
    type: 'success' as const,
    title,
    message,
    duration: duration || 5000,
  }),
  info: (title: string, message: string, duration?: number) => ({
    type: 'info' as const,
    title,
    message,
    duration: duration || 5000,
  }),
  warning: (title: string, message: string, duration?: number) => ({
    type: 'warning' as const,
    title,
    message,
    duration: duration || 5000,
  }),
};
