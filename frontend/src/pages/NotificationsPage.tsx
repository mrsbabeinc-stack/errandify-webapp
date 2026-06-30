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
  related_errand_id?: number;
  related_bid_id?: number;
}

interface FormattedNotification extends Notification {
  errandId?: number;
  offerId?: number;
  actions?: Array<{ label: string; url: string; type: string }>;
}

export default function NotificationsPage() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<FormattedNotification[]>([]);
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
        const formattedNotifications = response.data.data.notifications.map((n: BackendNotification) => {
          // Replace "bid" with "offer" and "job" with "errand"
          let title = n.title
            .replace(/bid/gi, 'offer')
            .replace(/job/gi, 'errand');

          let body = (n.body || '')
            .replace(/bid/gi, 'offer')
            .replace(/job/gi, 'errand');

          return {
            id: n.id.toString(),
            type: n.type === 'bid_placed' ? 'offer' : n.type === 'message_received' ? 'message' : 'status',
            title: title,
            message: body,
            timestamp: n.createdAt,
            read: n.read,
            errandId: n.related_errand_id,
            offerId: n.related_bid_id,
            actions: [
              n.related_errand_id ? {
                label: '📋 Errand Details',
                url: `/errand/${n.related_errand_id}`,
                type: 'errand'
              } : null,
              n.type === 'message_received' && n.related_errand_id ? {
                label: '💬 Chat',
                url: `/my-chat?errandId=${n.related_errand_id}`,
                type: 'chat'
              } : null,
            ].filter(Boolean),
          };
        });
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
        <div className="max-w-4xl mx-auto px-3 py-2 flex items-center justify-between gap-2">
          <h1 className="text-sm font-bold">🔔 Notifications</h1>
          {notifications.some((n) => !n.read) && (
            <button
              onClick={handleMarkAllRead}
              className="text-xs bg-white bg-opacity-30 hover:bg-opacity-40 text-white px-2 py-0.5 rounded transition font-semibold"
              title="Mark all notifications as read"
            >
              ✓ Mark All Read
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
                onClick={() => {
                  if (!notification.read) {
                    handleRead(notification.id);
                  }
                }}
                className={`p-2 rounded border text-xs transition ${
                  notification.read
                    ? 'bg-white border-gray-200'
                    : 'bg-orange-50 border-orange-300'
                }`}
              >
                <div className="flex gap-1.5 items-start">
                  {/* Icon Badge */}
                  <div className={`${getTypeColor(notification.type)} text-white w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-xs flex-shrink-0`}>
                    {getTypeIcon(notification.type)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-1 mb-1">
                      <div className="flex items-center gap-1 flex-1 min-w-0">
                        <h3 className={`font-semibold line-clamp-1 ${!notification.read ? 'text-gray-900' : 'text-gray-700'}`}>
                          {notification.title}
                        </h3>
                        {notification.offerId && (
                          <span className="text-xs text-gray-500 bg-gray-100 px-1 rounded flex-shrink-0">
                            Offer #{notification.offerId}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-gray-400 flex-shrink-0">
                        {new Date(notification.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-gray-600 text-xs line-clamp-2 mb-2">{notification.message}</p>

                    {/* Errand ID */}
                    {notification.errandId && (
                      <p className="text-xs text-gray-500 mb-2">
                        Errand ID: <span className="font-mono bg-gray-100 px-1 rounded">ER{notification.errandId}</span>
                      </p>
                    )}

                    {/* Action Buttons */}
                    {notification.actions && notification.actions.length > 0 && (
                      <div className="flex gap-1 flex-wrap">
                        {notification.actions.map((action, idx) => (
                          <button
                            key={idx}
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(action.url);
                            }}
                            className={`px-2 py-1 rounded text-xs font-semibold transition ${
                              action.type === 'chat'
                                ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                                : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                            }`}
                          >
                            {action.label}
                          </button>
                        ))}
                      </div>
                    )}
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
