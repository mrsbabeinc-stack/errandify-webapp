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
      // Add sample notifications to demo the system
      const sampleNotifications = [
        {
          type: 'offer' as const,
          title: 'New bid received!',
          message: 'Sarah bid $35 on your office cleaning task',
          action: { label: 'View bid', url: '/errands' }
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
          action: { label: 'Complete profile', url: '/my-profile' }
        },
        {
          type: 'offer' as const,
          title: 'Task accepted!',
          message: 'You accepted the tutoring task from Maria',
          action: { label: 'Start chat', url: '/chat' }
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
      : notifications;

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'message':
        return '💬';
      case 'offer':
        return '💰';
      case 'status':
        return '📊';
      case 'system':
        return '⚙️';
      default:
        return '📢';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'message':
        return 'bg-blue-100 text-blue-700';
      case 'offer':
        return 'bg-green-100 text-green-700';
      case 'status':
        return 'bg-purple-100 text-purple-700';
      case 'system':
        return 'bg-gray-100 text-gray-700';
      default:
        return 'bg-orange-100 text-orange-700';
    }
  };

  return (
    <div className="px-4 py-4 max-w-3xl mx-auto pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-bold text-errandify-brown">🔔 Notifications</h1>
        <div className="flex gap-2">
          {notifications.some((n) => !n.read) && (
            <button
              onClick={handleMarkAllRead}
              className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-lg hover:bg-blue-200"
            >
              Mark all read
            </button>
          )}
          {notifications.length > 0 && (
            <button
              onClick={handleClearAll}
              className="text-xs bg-red-100 text-red-700 px-3 py-1 rounded-lg hover:bg-red-200"
            >
              Clear all
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
            filter === 'all'
              ? 'bg-errandify-orange text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          All ({notifications.length})
        </button>
        <button
          onClick={() => setFilter('unread')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
            filter === 'unread'
              ? 'bg-errandify-orange text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Unread ({notifications.filter((n) => !n.read).length})
        </button>
      </div>

      {/* Notifications List */}
      {filteredNotifications.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <p className="text-gray-500 mb-2">📭 No {filter === 'unread' ? 'unread' : ''} notifications</p>
          <p className="text-xs text-gray-400">You're all caught up!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredNotifications.map((notification) => (
            <div
              key={notification.id}
              className={`p-4 rounded-lg border transition ${
                notification.read
                  ? 'bg-white border-gray-200 hover:bg-gray-50'
                  : 'bg-blue-50 border-blue-200'
              }`}
            >
              <div className="flex gap-3">
                {/* Icon */}
                <div className={`flex items-center justify-center w-10 h-10 rounded-full flex-shrink-0 text-lg ${getTypeColor(notification.type)}`}>
                  {getTypeIcon(notification.type)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold text-sm text-gray-900">{notification.title}</h3>
                      <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                    </div>
                    {!notification.read && (
                      <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1.5" />
                    )}
                  </div>

                  {/* Timestamp & Actions */}
                  <div className="flex items-center gap-2 mt-2">
                    <p className="text-xs text-gray-500">
                      {new Date(notification.timestamp).toLocaleDateString()} {new Date(notification.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>

                    {notification.action && (
                      <button
                        onClick={() => navigate(notification.action!.url)}
                        className="text-xs text-errandify-orange hover:underline font-semibold"
                      >
                        {notification.action.label}
                      </button>
                    )}

                    {!notification.read && (
                      <button
                        onClick={() => handleRead(notification.id)}
                        className="text-xs text-blue-600 hover:text-blue-700 font-semibold"
                      >
                        Mark read
                      </button>
                    )}

                    <button
                      onClick={() => handleDelete(notification.id)}
                      className="text-xs text-gray-400 hover:text-red-600 ml-auto"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
