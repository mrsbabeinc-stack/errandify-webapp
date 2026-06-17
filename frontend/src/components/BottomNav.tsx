import { Link, useLocation, useNavigate } from 'react-router-dom';

interface BottomNavProps {
  onLogout: () => void;
}

export default function BottomNav({ onLogout }: BottomNavProps) {
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path: string) => location.pathname === path;

  const leftItems = [
    { label: 'Home', path: '/', icon: '🏠' },
    { label: 'Errands', path: '/errands', icon: '📋' },
  ];

  const rightItems = [
    { label: 'Chat', path: '/chat', icon: '💬' },
    { label: 'Profile', path: '/profile', icon: '👤' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-errandify-bg border-t border-gray-200 shadow-lg">
      <div className="flex justify-between items-center h-16 px-4 relative">
        {/* Left Items */}
        <div className="flex justify-start gap-1 flex-1">
          {leftItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center gap-0.5 py-2 px-4 rounded-xl transition-all text-sm ${
                isActive(item.path)
                  ? 'bg-errandify-orange text-white'
                  : 'text-gray-600 hover:text-errandify-orange'
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          ))}
        </div>

        {/* Center "+ Create" Button */}
        <button
          onClick={() => navigate('/category')}
          className="absolute left-1/2 -translate-x-1/2 -top-6 w-16 h-16 bg-gradient-to-br from-errandify-orange to-orange-600 text-white rounded-full shadow-xl hover:shadow-2xl hover:scale-105 transition-all transform flex items-center justify-center font-bold text-2xl border-4 border-errandify-bg"
          title="Create new errand"
        >
          +
        </button>

        {/* Right Items */}
        <div className="flex justify-end gap-1 flex-1">
          {rightItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center gap-0.5 py-2 px-4 rounded-xl transition-all text-sm ${
                isActive(item.path)
                  ? 'bg-errandify-orange text-white'
                  : 'text-gray-600 hover:text-errandify-orange'
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
