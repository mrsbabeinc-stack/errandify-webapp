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
    <nav className="fixed bottom-0 left-0 right-0 bg-errandify-bg border-t-2 border-errandify-orange shadow-2xl">
      <div className="flex justify-between items-center h-24 px-4 relative">
        {/* Left Items */}
        <div className="flex justify-start gap-2 flex-1">
          {leftItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center gap-1 py-3 px-6 rounded-2xl transition-all ${
                isActive(item.path)
                  ? 'bg-errandify-orange text-white shadow-md'
                  : 'text-gray-600 hover:text-errandify-orange'
              }`}
            >
              <span className="text-2xl">{item.icon}</span>
              <span className="text-xs font-semibold">{item.label}</span>
            </Link>
          ))}
        </div>

        {/* Center "+ Create" Button */}
        <button
          onClick={() => navigate('/category')}
          className="absolute left-1/2 -translate-x-1/2 -top-8 w-20 h-20 bg-gradient-to-br from-errandify-orange to-orange-600 text-white rounded-full shadow-2xl hover:shadow-3xl hover:scale-110 transition-all transform flex items-center justify-center font-bold text-3xl border-4 border-errandify-bg"
          title="Create new errand"
        >
          +
        </button>

        {/* Right Items */}
        <div className="flex justify-end gap-2 flex-1">
          {rightItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center gap-1 py-3 px-6 rounded-2xl transition-all ${
                isActive(item.path)
                  ? 'bg-errandify-orange text-white shadow-md'
                  : 'text-gray-600 hover:text-errandify-orange'
              }`}
            >
              <span className="text-2xl">{item.icon}</span>
              <span className="text-xs font-semibold">{item.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
