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
    { label: 'Browse', path: '/browse', icon: '🔍' },
    { label: 'My Offers', path: '/my-offer', icon: '💼' },
    { label: 'Chat', path: '/chat', icon: '💬' },
    { label: 'Kampung', path: '/my-kampung', icon: '📰' },
    { label: 'Account', path: '/my-account', icon: '👤', image: userImage || undefined },
  ];

  const askerItems: NavItem[] = [
    { label: 'Home', path: '/', icon: '🏠' },
    { label: 'My Errands', path: '/errands', icon: '📋' },
    { label: 'Chat', path: '/chat', icon: '💬' },
    { label: 'Kampung', path: '/my-kampung', icon: '📰' },
    { label: 'Account', path: '/my-account', icon: '👤', image: userImage || undefined },
  ];

  const navItems = userRole === 'doer' ? doerItems : askerItems;

  return (
    <nav style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      background: 'linear-gradient(to top, #FFF9F5, #FFFFFF)',
      borderTop: '2px solid #FFE0D6',
      boxShadow: '0 -4px 20px rgba(255, 107, 53, 0.1)',
      zIndex: 40,
    }}>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '70px', paddingX: '8px', position: 'relative'}}>
        {/* Navigation Items */}
        <div style={{display: 'flex', justifyContent: 'space-around', alignItems: 'center', width: '100%', gap: '4px', position: 'relative'}}>
          {navItems.map((item, index) => {
            const disabled = 'disabled' in item && item.disabled;
            const active = isActive(item.path);

            if (disabled) {
              return (
                <div
                  key={item.path}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                    padding: '8px',
                    borderRadius: '12px',
                    transition: 'all 0.2s',
                    fontSize: '12px',
                    flex: 1,
                    color: '#CCC',
                    cursor: 'not-allowed',
                    opacity: 0.5,
                  }}
                >
                  {item.image ? (
                    <img
                      src={item.image}
                      alt={item.label}
                      style={{width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover'}}
                    />
                  ) : (
                    <span style={{fontSize: '20px'}}>{item.icon}</span>
                  )}
                  <span style={{fontSize: '11px', fontWeight: '500'}}>{item.label}</span>
                </div>
              );
            }

            return (
              <Link
                key={item.path}
                to={item.path}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                  padding: '8px 12px',
                  borderRadius: '12px',
                  transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                  fontSize: '12px',
                  flex: 1,
                  position: 'relative',
                  textDecoration: 'none',
                  color: active ? 'white' : '#666',
                  background: active ? 'linear-gradient(135deg, #FF6B35 0%, #FF8A5B 100%)' : 'transparent',
                  boxShadow: active ? '0 4px 12px rgba(255, 107, 53, 0.3)' : 'none',
                  fontWeight: active ? '600' : '500',
                }}
                onMouseEnter={(e) => {
                  if (!active) {
                    e.currentTarget.style.background = 'linear-gradient(135deg, #FFF5F0 0%, #FFE8D6 100%)';
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(255, 107, 53, 0.15)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }
                }}
              >
                {item.image ? (
                  <img
                    src={item.image}
                    alt={item.label}
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      objectFit: 'cover',
                      border: active ? '2px solid white' : 'none',
                    }}
                  />
                ) : (
                  <span style={{fontSize: '20px'}}>{item.icon}</span>
                )}
                {/* Unread Badge for Chat */}
                {item.label === 'Chat' && unreadCount > 0 && (
                  <div style={{
                    position: 'absolute',
                    top: '-4px',
                    right: '-4px',
                    background: '#FF4444',
                    color: 'white',
                    borderRadius: '50%',
                    width: '20px',
                    height: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '10px',
                    fontWeight: '700',
                    border: '2px solid white',
                  }}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </div>
                )}
                <span style={{fontSize: '10px', fontWeight: 500}}>{item.label}</span>
              </Link>
            );
          })}

          {/* Center "+ Create" Button - Only for askers */}
          {userRole === 'asker' && (
            <button
              onClick={onCreateTask}
              style={{
                position: 'absolute',
                left: '50%',
                bottom: '8px',
                transform: 'translateX(-50%)',
                width: '56px',
                height: '56px',
                background: 'linear-gradient(135deg, #FF6B35 0%, #FF8A5B 100%)',
                color: 'white',
                borderRadius: '16px',
                border: 'none',
                boxShadow: '0 6px 20px rgba(255, 107, 53, 0.35)',
                cursor: 'pointer',
                fontWeight: '700',
                fontSize: '24px',
                transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                zIndex: 50,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateX(-50%) translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(255, 107, 53, 0.45)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateX(-50%) translateY(0)';
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(255, 107, 53, 0.35)';
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
