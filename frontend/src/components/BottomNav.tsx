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

    const checkChats = () => {
      const stored = localStorage.getItem('unreadChats');
      if (stored) {
        const unreadMap = JSON.parse(stored);
        const total = Object.values(unreadMap).reduce((sum: number, count: any) => sum + count, 0);
        setUnreadCount(total);
      }
    };

    checkChats();
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
    { label: 'MyOffers', path: '/my-offer', icon: '💼' },
    { label: 'MyChat', path: '/chat', icon: '💬' },
    { label: 'MyKampung', path: '/my-kampung', icon: '📰' },
    { label: 'MyAccount', path: '/my-account', icon: '👤', image: userImage || undefined },
  ];

  const askerItems: NavItem[] = [
    { label: 'Home', path: '/', icon: '🏠' },
    { label: 'MyErrands', path: '/errands', icon: '📋' },
    { label: 'MyChat', path: '/chat', icon: '💬' },
    { label: 'MyKampung', path: '/my-kampung', icon: '📰' },
    { label: 'MyAccount', path: '/my-account', icon: '👤', image: userImage || undefined },
  ];

  const navItems = userRole === 'doer' ? doerItems : askerItems;

  return (
    <nav style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      background: 'linear-gradient(180deg, rgba(255,250,247,0.98) 0%, rgba(252,240,233,1) 100%)',
      borderTop: '1px solid rgba(255, 107, 53, 0.15)',
      boxShadow: '0 -12px 40px rgba(255, 107, 53, 0.12), 0 -2px 8px rgba(255, 107, 53, 0.06)',
      zIndex: 40,
      backdropFilter: 'blur(10px)',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    }}>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '90px', padding: '12px 8px 16px 8px', position: 'relative'}}>
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
                    gap: '6px',
                    padding: '10px',
                    borderRadius: '14px',
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
                      style={{width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover'}}
                    />
                  ) : (
                    <span style={{fontSize: '28px'}}>{item.icon}</span>
                  )}
                  <span style={{fontSize: '12px', fontWeight: '600', fontFamily: 'inherit'}}>{item.label}</span>
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
                  gap: '6px',
                  padding: '10px 14px',
                  borderRadius: '14px',
                  transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                  fontSize: '12px',
                  flex: 1,
                  position: 'relative',
                  textDecoration: 'none',
                  color: active ? 'white' : '#444',
                  background: active
                    ? 'linear-gradient(135deg, #FF6B35 0%, #FF8A5B 100%)'
                    : 'linear-gradient(135deg, rgba(255,245,240,0.6) 0%, rgba(255,232,214,0.4) 100%)',
                  boxShadow: active
                    ? '0 8px 24px rgba(255, 107, 53, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.3)'
                    : '0 4px 12px rgba(255, 107, 53, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.4)',
                  fontWeight: active ? '700' : '600',
                  border: active ? 'none' : '1px solid rgba(255, 107, 53, 0.1)',
                }}
                onMouseEnter={(e) => {
                  if (!active) {
                    e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255,232,214,0.8) 0%, rgba(255,200,160,0.6) 100%)';
                    e.currentTarget.style.boxShadow = '0 6px 16px rgba(255, 107, 53, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.4)';
                    e.currentTarget.style.transform = 'translateY(-3px) scale(1.02)';
                  } else {
                    e.currentTarget.style.transform = 'translateY(-3px)';
                    e.currentTarget.style.boxShadow = '0 12px 32px rgba(255, 107, 53, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.3)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active) {
                    e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255,245,240,0.6) 0%, rgba(255,232,214,0.4) 100%)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(255, 107, 53, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.4)';
                  } else {
                    e.currentTarget.style.boxShadow = '0 8px 24px rgba(255, 107, 53, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.3)';
                  }
                  e.currentTarget.style.transform = 'translateY(0) scale(1)';
                }}
              >
                {item.image ? (
                  <img
                    src={item.image}
                    alt={item.label}
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      objectFit: 'cover',
                      border: active ? '2px solid white' : 'none',
                      transition: 'all 0.3s',
                    }}
                  />
                ) : (
                  <span style={{fontSize: '28px', transition: 'transform 0.3s'}}>
                    {item.icon}
                  </span>
                )}
                {/* Unread Badge for Chat */}
                {item.label === 'Chat' && unreadCount > 0 && (
                  <div style={{
                    position: 'absolute',
                    top: '-2px',
                    right: '2px',
                    background: '#E63946',
                    color: 'white',
                    borderRadius: '50%',
                    width: '24px',
                    height: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    fontWeight: '700',
                    border: '2px solid white',
                    boxShadow: '0 3px 10px rgba(0, 0, 0, 0.15)',
                    animation: 'pulse 2s infinite',
                  }}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </div>
                )}
                <span style={{fontSize: '12px', fontWeight: '700', letterSpacing: '0.3px', fontFamily: 'inherit'}}>{item.label}</span>
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
                bottom: '70px',
                transform: 'translateX(-50%)',
                width: '62px',
                height: '62px',
                background: 'linear-gradient(135deg, #FF6B35 0%, #FF8A5B 100%)',
                color: 'white',
                borderRadius: '16px',
                border: '2px solid white',
                boxShadow: '0 8px 28px rgba(255, 107, 53, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.3)',
                cursor: 'pointer',
                fontWeight: '800',
                fontSize: '32px',
                transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                zIndex: 50,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateX(-50%) translateY(-5px) scale(1.08)';
                e.currentTarget.style.boxShadow = '0 12px 36px rgba(255, 107, 53, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateX(-50%) translateY(0) scale(1)';
                e.currentTarget.style.boxShadow = '0 8px 28px rgba(255, 107, 53, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.3)';
              }}
              title="Create new errand"
            >
              +
            </button>
          )}
        </div>
      </div>

      {/* Pulse animation for badge */}
      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.1); opacity: 0.8; }
        }
      `}</style>
    </nav>
  );
}
