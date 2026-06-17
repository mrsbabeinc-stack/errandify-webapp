import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';

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

  useEffect(() => {
    const user = localStorage.getItem('user');
    if (user) {
      try {
        const userData = JSON.parse(user);
        setUserImage(userData.profile_image_url || null);
      } catch {
        setUserImage(null);
      }
    }
  }, []);

  const isActive = (path: string) => location.pathname === path;

  const leftItems: NavItem[] = userRole === 'doer'
    ? [
        { label: 'Browse ToHelp', path: '/', icon: '🔍' },
        { label: 'MyErrands', path: '/errands', icon: '📋' },
      ]
    : [
        { label: 'Home', path: '/', icon: '🏠' },
        { label: 'MyErrands', path: '/errands', icon: '📋' },
      ];

  const rightItems: NavItem[] = [
    { label: 'MyVillage', path: '/village', icon: '🏘️' },
    { label: 'Chat', path: '/chat', icon: '💬' },
    { label: 'Profile', path: '/profile', icon: '👤', image: userImage || undefined },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-errandify-bg border-t border-gray-200 shadow-lg">
      <div className="flex justify-between items-center h-16 px-2 relative">
        {/* Left Items */}
        <div className="flex justify-center gap-3 flex-1">
          {leftItems.map((item) => {
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
                  className={`flex flex-col items-center justify-center gap-0.5 py-2 px-3 rounded-lg transition-all text-sm ${itemClasses}`}
                >
                  <span className="text-lg">{item.icon}</span>
                  <span className="text-xs font-medium">{item.label}</span>
                </div>
              );
            }

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center justify-center gap-0.5 py-2 px-3 rounded-lg transition-all text-sm ${itemClasses}`}
              >
                <span className="text-lg">{item.icon}</span>
                <span className="text-xs font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>

        {/* Center "+ Create" Button - Only for askers */}
        {userRole === 'asker' && (
          <button
            onClick={onCreateTask}
            className="absolute left-1/2 -translate-x-1/2 -top-5 w-14 h-14 bg-gradient-to-br from-errandify-orange via-orange-500 to-orange-600 text-white rounded-full shadow-2xl hover:shadow-3xl hover:scale-110 transition-all transform flex items-center justify-center font-bold text-2xl border-4 border-errandify-bg active:scale-95"
            title="Create new errand"
          >
            +
          </button>
        )}

        {/* Right Items */}
        <div className="flex justify-center gap-3 flex-1">
          {rightItems.map((item) => {
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
                  className={`flex flex-col items-center justify-center gap-0.5 py-2 px-3 rounded-lg transition-all text-sm ${itemClasses}`}
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
                className={`flex flex-col items-center justify-center gap-0.5 py-2 px-3 rounded-lg transition-all text-sm ${itemClasses}`}
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
                <span className="text-xs font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
