import { useState } from 'react';

interface NotificationIconProps {
  unreadCount?: number;
}

export default function NotificationIcon({ unreadCount = 0 }: NotificationIconProps) {
  const [showDropdown, setShowDropdown] = useState(false);

  return (
    <div className="fixed top-16 right-4 z-50">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="relative flex items-center justify-center w-10 h-10 text-gray-600 hover:text-errandify-orange transition-colors"
        title="Notifications"
      >
        <span className="text-2xl">💬</span>
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 flex items-center justify-center w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown */}
      {showDropdown && (
        <div className="absolute top-12 right-0 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          <div className="p-3 border-b border-gray-200">
            <h3 className="font-semibold text-gray-800 text-sm">Notifications</h3>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {unreadCount === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">
                No notifications yet
              </div>
            ) : (
              <div className="p-3 text-center text-gray-500 text-sm">
                You have {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
