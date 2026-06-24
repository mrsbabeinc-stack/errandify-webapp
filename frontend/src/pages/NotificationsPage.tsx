import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  markNotificationAsRead,
  markAllAsRead,
  deleteNotification,
  clearAllNotifications,
  type Notification
} from '../utils/notificationStore';

interface BackendNotification {
  id: number;
  type: string;
  title: string;
  body: string;
  actionUrl: string;
  createdAt: string;
  read: boolean;
}

export default function NotificationsPage() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<(Notification | BackendNotification)[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadNotifications = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.warn('No token found');
        setLoading(false);
        return;
      }

      const response = await axios.get(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/notifications`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      console.log('[Notifications] API Response:', response.data);

      if (response.data.success && response.data.data.notifications) {
        // Convert backend notifications to display format
        const formattedNotifications = response.data.data.notifications.map((n: BackendNotification) => ({
          id: n.id.toString(),
          type: n.type === 'bid_placed' ? 'offer' : n.type === 'message_received' ? 'message' : 'status',
          title: n.title,
          message: n.body || n.message,
          timestamp: n.createdAt,
          read: n.read,
          action: n.actionUrl ? { label: 'View', url: n.actionUrl } : undefined,
        }));
        console.log('[Notifications] Formatted:', formattedNotifications);
        setNotifications(formattedNotifications);
      } else {
        console.warn('[Notifications] No notifications in response:', response.data);
        setNotifications([]);
      }
    } catch (error) {
      console.error('Failed to load notifications:', error);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRead = async (id: string) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/notifications/${id}/read`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      loadNotifications();
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/notifications/${id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      loadNotifications();
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/notifications/read-all`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      loadNotifications();
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const handleClearAll = async () => {
    if (window.confirm('Clear all notifications?')) {
      try {
        const token = localStorage.getItem('token');
        await axios.post(
          `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/notifications/clear-all`,
          {},
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        loadNotifications();
      } catch (error) {
        console.error('Failed to clear notifications:', error);
      }
    }
  };

  const filteredNotifications = notifications
    .filter((n) => (filter === 'unread' ? !n.read : true))
    .filter((n) => (typeFilter === 'all' ? true : n.type === typeFilter))
    .filter((n) =>
      searchText === ''
        ? true
        : n.title.toLowerCase().includes(searchText.toLowerCase()) ||
          (n.message && n.message.toLowerCase().includes(searchText.toLowerCase()))
    );

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

        {/* SEARCH AND FILTERS */}
        <div className="max-w-4xl mx-auto px-3 py-2 border-t border-white border-opacity-20 space-y-1.5">
          <input
            type="text"
            placeholder="🔍 Search notifications..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="w-full px-2 py-1 text-xs text-gray-800 rounded border-0 outline-none"
          />
          <div className="flex gap-1 flex-wrap">
            {['all', 'offer', 'message', 'status'].map((type) => (
              <button
                key={type}
                onClick={() => setTypeFilter(type)}
                className={`text-xs px-2 py-0.5 rounded transition ${
                  typeFilter === type
                    ? 'bg-white text-errandify-orange font-bold'
                    : 'bg-white bg-opacity-20 text-white hover:bg-opacity-30'
                }`}
              >
                {type === 'all' ? '📋 All' : type === 'offer' ? '💰 Offers' : type === 'message' ? '💬 Messages' : '📊 Status'}
              </button>
            ))}
          </div>
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
