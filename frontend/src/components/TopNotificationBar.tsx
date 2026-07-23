import React, { useState, useEffect } from 'react';

interface TopNotification {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  icon?: string;
  dismissible?: boolean;
  duration?: number;
}

const TopNotificationBar: React.FC = () => {
  const [notifications, setNotifications] = useState<TopNotification[]>([]);

  const addNotification = (notification: Omit<TopNotification, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    const duration = notification.duration ?? 4000;
    const newNotification: TopNotification = {
      ...notification,
      id,
      dismissible: notification.dismissible ?? true,
      duration: duration,
    };

    console.log('[TopNotificationBar] Adding notification:', newNotification);
    setNotifications((prev) => [...prev, newNotification]);

    // Auto-dismiss if duration > 0
    if (duration > 0) {
      setTimeout(() => {
        removeNotification(id);
      }, duration);
    }
  };

  const removeNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  // Expose addNotification globally for use across the app
  useEffect(() => {
    (window as any).topNotification = addNotification;

    /**
     * A "welcome" notification used to fire here on first load, reading
     * "💡 Click buttons to see notifications at the top". It was an
     * instruction to whoever was building the notification system — see
     * pages/TopNotificationTestPage — and it shipped.
     *
     * Removed rather than hidden on one route. It carried no information and
     * no action, so it was never useful on any page, and it appeared over the
     * top of whatever was there: on the landing page it covered the logo for
     * the first six seconds of a visitor's very first impression.
     *
     * The bar itself is untouched. Real notifications still arrive through
     * window.topNotification.
     */
  }, []);

  const getBackgroundColor = (type: string) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      case 'info':
      default:
        return 'bg-blue-50 border-blue-200';
    }
  };

  const getTextColor = (type: string) => {
    switch (type) {
      case 'success':
        return 'text-green-800';
      case 'error':
        return 'text-red-800';
      case 'warning':
        return 'text-yellow-800';
      case 'info':
      default:
        return 'text-blue-800';
    }
  };

  const getIconColor = (type: string) => {
    switch (type) {
      case 'success':
        return 'text-green-500';
      case 'error':
        return 'text-red-500';
      case 'warning':
        return 'text-yellow-500';
      case 'info':
      default:
        return 'text-blue-500';
    }
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-40 flex flex-col gap-2 pointer-events-none">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`pointer-events-auto border-l-4 p-4 mx-4 mt-4 rounded-lg shadow-lg flex items-center gap-3 animate-slidedown ${getBackgroundColor(
            notification.type
          )}`}
        >
          {notification.icon && (
            <span className={`text-2xl flex-shrink-0 ${getIconColor(notification.type)}`}>
              {notification.icon}
            </span>
          )}
          <span className={`flex-1 font-medium text-sm ${getTextColor(notification.type)}`}>
            {notification.message}
          </span>
          {notification.dismissible && (
            <button
              onClick={() => removeNotification(notification.id)}
              className={`flex-shrink-0 text-lg font-bold ${getTextColor(notification.type)} hover:opacity-60 transition-opacity`}
            >
              ✕
            </button>
          )}
        </div>
      ))}

      <style>{`
        @keyframes slidedown {
          from {
            transform: translateY(-100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        .animate-slidedown {
          animation: slidedown 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default TopNotificationBar;
