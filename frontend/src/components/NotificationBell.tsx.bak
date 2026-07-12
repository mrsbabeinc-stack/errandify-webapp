import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { notificationService, Notification } from '../services/notifications';

export default function NotificationBell() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    const unsubscribe = notificationService.subscribe((notifs) => {
      setNotifications(notifs);
    });
    return unsubscribe;
  }, []);

  const handleNotificationClick = (notif: Notification) => {
    notificationService.markAsRead(notif.id);
    if (notif.action) {
      navigate(notif.action.path);
      setShowDropdown(false);
    }
  };

  return (
    <div className="relative">
      {/* Mailbox Icon */}
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="relative p-2 text-errandify-brown hover:bg-gray-100 rounded-lg transition-all"
      >
        <span className="text-2xl">📬</span>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {showDropdown && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-lg shadow-xl z-50 border border-gray-200">
          {/* Header */}
          <div className="p-4 border-b border-gray-200 flex justify-between items-center">
            <h3 className="font-bold text-errandify-brown">Notifications</h3>
            {notifications.length > 0 && (
              <button
                onClick={() => notificationService.clear()}
                className="text-xs text-errandify-orange hover:underline"
              >
                Clear All
              </button>
            )}
          </div>

          {/* Notifications List */}
          {notifications.length === 0 ? (
            <div className="p-6 text-center text-gray-600 text-sm">
              No notifications yet
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              {notifications.slice(0, 20).map((notif) => {
                const tierColors = {
                  critical: 'border-l-4 border-l-red-500 bg-red-50',
                  important: 'border-l-4 border-l-orange-500 bg-orange-50',
                  info: 'border-l-4 border-l-blue-500 bg-blue-50',
                };

                return (
                  <button
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    className={`w-full p-3 text-left border-b border-gray-100 hover:bg-gray-50 transition-all ${tierColors[notif.tier]} ${
                      !notif.read ? 'font-semibold' : ''
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="font-semibold text-sm text-gray-900">{notif.title}</p>
                        <p className="text-xs text-gray-600 mt-1">{notif.message}</p>
                        {notif.action && (
                          <button className="text-xs text-errandify-orange font-semibold mt-2 hover:underline">
                            {notif.action.label} →
                          </button>
                        )}
                      </div>
                      {!notif.read && (
                        <div className="w-2 h-2 bg-errandify-orange rounded-full mt-1 flex-shrink-0" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
