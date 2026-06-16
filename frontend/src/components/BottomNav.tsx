import { Link, useLocation } from 'react-router-dom';

interface BottomNavProps {
  onLogout: () => void;
}

export default function BottomNav({ onLogout }: BottomNavProps) {
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  const navItems = [
    { label: 'Home', path: '/', icon: '🏠' },
    { label: 'Errands', path: '/errands', icon: '📋' },
    { label: 'Chat', path: '/chat', icon: '💬' },
    { label: 'Profile', path: '/profile', icon: '👤' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg">
      <div className="flex justify-around items-center h-20">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-colors ${
              isActive(item.path)
                ? 'text-errandify-orange border-t-2 border-errandify-orange'
                : 'text-gray-600 hover:text-errandify-orange'
            }`}
          >
            <span className="text-xl">{item.icon}</span>
            <span className="text-xs font-medium">{item.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
