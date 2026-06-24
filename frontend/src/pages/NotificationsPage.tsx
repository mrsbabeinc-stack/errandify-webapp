import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getNotifications,
  markNotificationAsRead,
  markAllAsRead,
  deleteNotification,
  clearAllNotifications,
  type Notification
} from '../utils/notificationStore';

export default function NotificationsPage() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  useEffect(() => {
    // Initialize with sample notifications if empty
    let notifs = getNotifications();
    if (notifs.length === 0) {
      const sampleNotifications = [
        {
          type: 'offer' as const,
          title: 'New bid received!',
          message: 'Sarah bid $35 on your office cleaning task',
          action: { label: 'View', url: '/errands' }
        },
        {
          type: 'message' as const,
          title: 'New message from John',
          message: 'Hi! Can you do this task on Saturday?',
          action: { label: 'Reply', url: '/chat' }
        },
        {
          type: 'status' as const,
          title: 'Task completed!',
          message: 'Your grocery delivery has been completed',
          action: { label: 'Review', url: '/review/1' }
        },
        {
          type: 'system' as const,
          title: 'Welcome to Errandify!',
          message: 'Complete your profile to start receiving tasks',
          action: { label: 'Go', url: '/my-profile' }
        },
        {
          type: 'offer' as const,
          title: 'Task accepted!',
          message: 'You accepted the tutoring task from Maria',
          action: { label: 'Chat', url: '/chat' }
        }
      ];

      sampleNotifications.forEach(notif => {
        const stored = getNotifications();
        const newNotif = {
          ...notif,
          id: `notif-${Date.now()}-${Math.random()}`,
          timestamp: new Date(Date.now() - Math.random() * 86400000).toISOString(),
          read: Math.random() > 0.6
        };
        stored.unshift(newNotif);
        localStorage.setItem('appNotifications', JSON.stringify(stored));
      });
    }

    loadNotifications();
    const interval = setInterval(loadNotifications, 2000);
    return () => clearInterval(interval);
  }, []);

  const loadNotifications = () => {
    setNotifications(getNotifications());
  };

  const handleRead = (id: string) => {
    markNotificationAsRead(id);
    loadNotifications();
  };

  const handleDelete = (id: string) => {
    deleteNotification(id);
    loadNotifications();
  };

  const handleMarkAllRead = () => {
    markAllAsRead();
    loadNotifications();
  };

  const handleClearAll = () => {
    if (window.confirm('Clear all notifications?')) {
      clearAllNotifications();
      loadNotifications();
    }
  };

  const filteredNotifications =
    filter === 'unread'
      ? notifications.filter((n) => !n.read)
      : notifications.filter((n) => !n.read || filter === 'all');

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'message': return '💬';
      case 'offer': return '💰';
      case 'status': return '📊';
      case 'system': return '⚙️';
      default: return '📢';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'message': return 'bg-blue-500';
      case 'offer': return 'bg-green-500';
      case 'status': return 'bg-purple-500';
      case 'system': return 'bg-gray-500';
      default: return 'bg-orange-500';
    }
  };

  return (
    <div className="min-h-screen bg-errandify-bg pb-20">
      {/* HEADER */}
      <div className="bg-gradient-to-r from-errandify-orange to-orange-500 text-white sticky top-0 z-50 shadow-sm">
        <div className="max-w-4xl mx-auto px-3 py-2 flex items-center justify-between">
          <h1 className="text-sm font-bold">🔔 Notifications</h1>
          {notifications.some((n) => !n.read) && (
            <button
              onClick={handleMarkAllRead}
              className="text-xs bg-white bg-opacity-20 hover:bg-opacity-30 text-white px-2 py-0.5 rounded transition"
            >
              Mark read
            </button>
          )}
        </div>

        {/* TABS */}
        <div className="max-w-4xl mx-auto px-3 flex gap-1.5 py-1.5 border-t border-white border-opacity-20">
          <button
            onClick={() => setFilter('all')}
            className={`text-xs font-bold px-2 py-0.5 rounded transition ${
              filter === 'all'
                ? 'bg-white text-errandify-orange'
                : 'text-white hover:bg-white hover:bg-opacity-10'
            }`}
          >
            All ({notifications.length})
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`text-xs font-bold px-2 py-0.5 rounded transition ${
              filter === 'unread'
                ? 'bg-white text-errandify-orange'
                : 'text-white hover:bg-white hover:bg-opacity-10'
            }`}
          >
            Unread ({notifications.filter((n) => !n.read).length})
          </button>
        </div>
      </div>

      {/* CONTENT */}
      <div className="max-w-4xl mx-auto px-3 py-2">
        {filteredNotifications.length === 0 ? (
          <div className="text-center py-6 bg-white rounded border border-gray-200 mt-2">
            <p className="text-gray-500 text-xs">📭 {filter === 'unread' ? 'All caught up!' : 'No notifications'}</p>
          </div>
        ) : (
          <div className="space-y-0.5 mt-1">
            {filteredNotifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-2 rounded border text-xs transition ${
                  notification.read
                    ? 'bg-white border-gray-200'
                    : 'bg-blue-50 border-blue-300 font-semibold'
                }`}
              >
                <div className="flex gap-1.5 items-start">
                  {/* Icon Badge */}
                  <div className={`${getTypeColor(notification.type)} text-white w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-xs`}>
                    {getTypeIcon(notification.type)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-1">
                      <h3 className="text-gray-900 font-semibold line-clamp-1">{notification.title}</h3>
                      <span className="text-xs text-gray-400 flex-shrink-0">
                        {new Date(notification.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-gray-600 text-xs mt-0 line-clamp-1">{notification.message}</p>

                    {/* Actions */}
                    <div className="flex gap-1.5 mt-1 items-center flex-wrap">
                      {notification.action && (
                        <button
                          onClick={() => navigate(notification.action!.url)}
                          className="text-xs text-errandify-orange hover:underline font-bold"
                        >
                          {notification.action.label}
                        </button>
                      )}

                      {!notification.read && (
                        <button
                          onClick={() => handleRead(notification.id)}
                          className="text-xs text-blue-600 hover:text-blue-700 font-semibold"
                        >
                          ✓
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
