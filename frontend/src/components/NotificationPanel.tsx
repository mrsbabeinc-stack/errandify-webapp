import React, { useState, useEffect } from 'react';
import { useNotificationToast } from '../context/NotificationContext';

interface StoredNotification {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  body: string;
  icon?: string;
  timestamp: Date;
  read: boolean;
}

const NotificationPanel: React.FC = () => {
  const { toasts } = useNotificationToast();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<StoredNotification[]>([]);

  // Add toasts to notification history
  useEffect(() => {
    if (toasts.length > 0) {
      const lastToast = toasts[toasts.length - 1];
      const newNotification: StoredNotification = {
        id: lastToast.id,
        type: lastToast.type,
        title: lastToast.title,
        body: lastToast.body,
        icon: lastToast.icon,
        timestamp: new Date(),
        read: false,
      };

      setNotifications((prev) => [newNotification, ...prev].slice(0, 50)); // Keep last 50
    }
  }, [toasts]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const handleClearAll = () => {
    setNotifications([]);
  };

  const handleDeleteNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-l-4 border-l-green-500';
      case 'error':
        return 'bg-red-50 border-l-4 border-l-red-500';
      case 'warning':
        return 'bg-yellow-50 border-l-4 border-l-yellow-500';
      case 'info':
      default:
        return 'bg-blue-50 border-l-4 border-l-blue-500';
    }
  };

  const getTypeTextColor = (type: string) => {
    switch (type) {
      case 'success':
        return 'text-green-900';
      case 'error':
        return 'text-red-900';
      case 'warning':
        return 'text-yellow-900';
      case 'info':
      default:
        return 'text-blue-900';
    }
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;

    return date.toLocaleDateString();
  };

  return (
    <>
      {/* Panel Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed left-4 bottom-4 z-30 p-3 bg-errandify-orange text-white rounded-lg shadow-lg hover:bg-orange-600 transition-all flex items-center gap-2"
        title="View all notifications"
      >
        <span className="text-xl">🔔</span>
        {unreadCount > 0 && (
          <span className="bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Panel Sidebar */}
      {isOpen && (
        <div className="fixed left-0 top-0 bottom-0 w-96 bg-white shadow-2xl z-50 flex flex-col border-r border-gray-200">
          {/* Header */}
          <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gradient-to-r from-errandify-orange to-orange-500">
            <h2 className="text-lg font-bold text-white">Notifications</h2>
            <div className="flex gap-2">
              {notifications.length > 0 && (
                <button
                  onClick={handleClearAll}
                  className="text-sm text-white hover:bg-white hover:bg-opacity-20 px-2 py-1 rounded transition-all"
                  title="Clear all notifications"
                >
                  Clear All
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="text-white hover:bg-white hover:bg-opacity-20 px-2 py-1 rounded text-lg leading-none"
                title="Close panel"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Notifications List */}
          <div className="flex-1 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-500 text-center">
                <div>
                  <p className="text-2xl mb-2">📭</p>
                  <p>No notifications yet</p>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 hover:bg-gray-50 transition-all ${getTypeColor(
                      notification.type
                    )} ${!notification.read ? 'bg-opacity-100' : 'bg-opacity-50'}`}
                  >
                    {/* Notification Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        {notification.icon && (
                          <span className="text-2xl flex-shrink-0">
                            {notification.icon}
                          </span>
                        )}
                        <div className="flex-1 min-w-0">
                          <p
                            className={`font-semibold text-sm ${getTypeTextColor(
                              notification.type
                            )}`}
                          >
                            {notification.title}
                          </p>
                          {notification.body && (
                            <p className="text-sm text-gray-700 mt-1 line-clamp-2">
                              {notification.body}
                            </p>
                          )}
                          <p className="text-xs text-gray-500 mt-2">
                            {formatTime(notification.timestamp)}
                          </p>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-1 flex-shrink-0">
                        {!notification.read && (
                          <button
                            onClick={() => handleMarkAsRead(notification.id)}
                            className="text-xs px-2 py-1 rounded bg-white hover:bg-gray-100 text-errandify-orange font-semibold transition-all"
                            title="Mark as read"
                          >
                            ✓
                          </button>
                        )}
                        <button
                          onClick={() =>
                            handleDeleteNotification(notification.id)
                          }
                          className="text-xs px-2 py-1 rounded bg-white hover:bg-gray-100 text-red-500 font-semibold transition-all"
                          title="Delete notification"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer Stats */}
          {notifications.length > 0 && (
            <div className="p-4 border-t border-gray-200 bg-gray-50 text-sm text-gray-600">
              <p>
                {unreadCount} unread · {notifications.length} total
              </p>
            </div>
          )}
        </div>
      )}

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-30 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
};

export default NotificationPanel;
