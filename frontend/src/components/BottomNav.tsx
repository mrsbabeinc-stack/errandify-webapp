import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { getNotifications } from '../utils/notificationStore';
import { useNotificationCount } from '../hooks/useNotificationCount';

interface BottomNavProps {
  onLogout: () => void;
  userRole: 'asker' | 'doer';
  onCreateTask?: () => void;
}

interface NavItem {
  label: string;
  path: string;
  icon?: string;
  image?: string;
  disabled?: boolean;
}

export default function BottomNav({ onLogout, userRole, onCreateTask }: BottomNavProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [userImage, setUserImage] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const { unreadCount: unreadNotifications } = useNotificationCount(3000);

  useEffect(() => {
    fetchProfileImage();

    // Check for unread chats
    const checkChats = () => {
      const stored = localStorage.getItem('unreadChats');
      if (stored) {
        const unreadMap = JSON.parse(stored);
        const total = Object.values(unreadMap).reduce((sum: number, count: any) => sum + count, 0);
        setUnreadCount(total);
      }
    };

    checkChats();
    // Refresh chat count every 3 seconds
    const interval = setInterval(checkChats, 3000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  const fetchProfileImage = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/users/profile`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // Users don't have avatar yet, just load from localStorage
      const user = localStorage.getItem('user');
      if (user) {
        try {
          const userData = JSON.parse(user);
          setUserImage(userData.profile_image_url || null);
        } catch {
          setUserImage(null);
        }
      }
    } catch (err) {
      // Fallback to localStorage if API fails
      const user = localStorage.getItem('user');
      if (user) {
        try {
          const userData = JSON.parse(user);
          setUserImage(userData.profile_image_url || null);
        } catch {
          setUserImage(null);
        }
      }
    }
  };

  const isActive = (path: string) => location.pathname === path;

  const doerItems: NavItem[] = [
    { label: 'Browse ToHelp', path: '/browse', icon: '🔍' },
    { label: 'MyOffer', path: '/my-offer', icon: '💼' },
    { label: 'MyChat', path: '/chat', icon: '💬' },
    { label: 'MyKampung', path: '/my-kampung', icon: '📰' },
    { label: 'MyAccount', path: '/my-account', icon: '👤', image: userImage || undefined },
    { label: 'Notifications', path: '/notifications', icon: '🔔' },
  ];

  const askerItems: NavItem[] = [
    { label: 'Home', path: '/', icon: '🏠' },
    { label: 'MyErrands', path: '/errands', icon: '📋' },
    { label: 'MyChat', path: '/chat', icon: '💬' },
    { label: 'MyKampung', path: '/my-kampung', icon: '📰' },
    { label: 'MyAccount', path: '/my-account', icon: '👤', image: userImage || undefined },
    { label: 'Notifications', path: '/notifications', icon: '🔔' },
  ];

  const navItems = userRole === 'doer' ? doerItems : askerItems;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-errandify-bg border-t border-gray-200 shadow-lg z-40">
      <div className="flex justify-between items-center h-16 px-2 relative">
        {/* Navigation Items - Evenly distributed for doers, left/right split for askers */}
        {/* All items evenly distributed with center plus button for askers */}
        <div className="flex justify-around items-center w-full gap-1 relative">
          {navItems.map((item, index) => {
            const disabled = 'disabled' in item && item.disabled;
            const itemClasses = disabled
              ? 'text-gray-300 cursor-not-allowed opacity-50'
              : isActive(item.path)
              ? 'bg-errandify-orange text-white'
              : 'text-gray-600 hover:text-errandify-orange';

            if (disabled) {
              return (
                <div
                  key={item.path}
                  className={`flex flex-col items-center justify-center gap-0.5 py-2 px-2 rounded-lg transition-all text-sm flex-1 ${itemClasses}`}
                >
                  {item.image ? (
                    <img
                      src={item.image}
                      alt={item.label}
                      className="w-6 h-6 rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-lg">{item.icon}</span>
                  )}
                  <span className="text-xs font-medium">{item.label}</span>
                </div>
              );
            }

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center justify-center gap-0.5 py-2 px-2 rounded-lg transition-all text-sm flex-1 relative ${itemClasses}`}
              >
                {item.image ? (
                  <img
                    src={item.image}
                    alt={item.label}
                    className={`w-6 h-6 rounded-full object-cover ${isActive(item.path) ? 'border-2 border-white' : ''}`}
                  />
                ) : (
                  <span className="text-lg">{item.icon}</span>
                )}
                {/* Unread Badge for MyChat */}
                {item.label === 'MyChat' && unreadCount > 0 && (
                  <div className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </div>
                )}
                {/* Unread Badge for Notifications */}
                {item.label === 'Notifications' && unreadNotifications > 0 && (
                  <div className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
                    {unreadNotifications > 9 ? '9+' : unreadNotifications}
                  </div>
                )}
                <span className="text-xs font-medium">{item.label}</span>
              </Link>
            );
          })}

          {/* Center "+ Create" Button - Only for askers */}
          {userRole === 'asker' && (
            <button
              onClick={onCreateTask}
              className="absolute left-1/2 -translate-x-1/2 top-0 w-11 h-11 bg-gradient-to-b from-errandify-orange via-orange-500 to-orange-700 text-white rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all transform flex items-center justify-center font-bold text-lg border-3 border-orange-800 active:scale-95 z-50"
              style={{
                boxShadow: '0 4px 0 rgba(0,0,0,0.2), 0 6px 12px rgba(0,0,0,0.15)',
                transform: 'translateX(-50%) translateY(-50%)',
              }}
              title="Create new errand"
            >
              +
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
