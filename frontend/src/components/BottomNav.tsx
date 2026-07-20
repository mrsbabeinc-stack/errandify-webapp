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
  // Phone-only compaction so the home page can fit all 16 categories (desktop unchanged)
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' && window.innerWidth < 640);
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

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
      background: 'linear-gradient(180deg, #FFFFFF 0%, #FFF9F5 50%, #FFF0E6 100%)',
      borderTop: '2px solid transparent',
      borderImage: 'linear-gradient(90deg, #FFB366 0%, #FF6B35 50%, #FFB366 100%) 1',
      boxShadow: '0 -20px 60px rgba(255, 107, 53, 0.15), 0 -8px 24px rgba(255, 107, 53, 0.08)',
      zIndex: 40,
      backdropFilter: 'blur(20px)',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    }}>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', minHeight: isMobile ? '58px' : '68px', padding: isMobile ? '6px 8px 8px 8px' : '10px 12px 12px 12px', position: 'relative'}}>
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
                    gap: '8px',
                    padding: '10px 14px',
                    borderRadius: '18px',
                    transition: 'all 0.2s',
                    fontSize: '12px',
                    flex: 1,
                    color: '#D1D5DB',
                    cursor: 'not-allowed',
                    opacity: 0.6,
                    background: 'linear-gradient(135deg, rgba(255, 245, 240, 0.4) 0%, rgba(255, 232, 214, 0.2) 100%)',
                    minWidth: '60px',
                  }}
                >
                  {item.image ? (
                    <img
                      src={item.image}
                      alt={item.label}
                      style={{width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover', opacity: 0.6}}
                    />
                  ) : (
                    <span style={{fontSize: isMobile ? '22px' : '28px', opacity: 0.6}}>{item.icon}</span>
                  )}
                  <span style={{fontSize: '11px', fontWeight: '700', fontFamily: 'inherit'}}>{item.label}</span>
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
                  gap: '8px',
                  padding: active ? (isMobile ? '6px 8px' : '8px 14px') : (isMobile ? '5px 6px' : '7px 12px'),
                  borderRadius: '18px',
                  transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                  fontSize: '12px',
                  flex: 1,
                  position: 'relative',
                  textDecoration: 'none',
                  color: active ? 'white' : '#555',
                  background: active
                    ? 'linear-gradient(135deg, #FF6B35 0%, #FF8A5B 50%, #FF9D7A 100%)'
                    : 'linear-gradient(135deg, rgba(255, 245, 240, 0.8) 0%, rgba(255, 232, 214, 0.6) 100%)',
                  boxShadow: active
                    ? '0 12px 32px rgba(255, 107, 53, 0.3), inset 0 2px 0 rgba(255, 255, 255, 0.4), inset 0 -2px 0 rgba(0, 0, 0, 0.1)'
                    : '0 6px 20px rgba(255, 107, 53, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.6)',
                  fontWeight: active ? '800' : '700',
                  border: active ? 'none' : '1px solid rgba(255, 107, 53, 0.15)',
                  cursor: 'pointer',
                  minWidth: '60px',
                }}
                onMouseEnter={(e) => {
                  if (!active) {
                    e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255, 232, 214, 1) 0%, rgba(255, 200, 160, 0.8) 100%)';
                    e.currentTarget.style.boxShadow = '0 10px 28px rgba(255, 107, 53, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.6)';
                    e.currentTarget.style.transform = 'translateY(-4px) scale(1.05)';
                  } else {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.boxShadow = '0 16px 40px rgba(255, 107, 53, 0.35), inset 0 2px 0 rgba(255, 255, 255, 0.4), inset 0 -2px 0 rgba(0, 0, 0, 0.1)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active) {
                    e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255, 245, 240, 0.8) 0%, rgba(255, 232, 214, 0.6) 100%)';
                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(255, 107, 53, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.6)';
                  } else {
                    e.currentTarget.style.boxShadow = '0 12px 32px rgba(255, 107, 53, 0.3), inset 0 2px 0 rgba(255, 255, 255, 0.4), inset 0 -2px 0 rgba(0, 0, 0, 0.1)';
                  }
                  e.currentTarget.style.transform = 'translateY(0) scale(1)';
                }}
              >
                {item.image ? (
                  <img
                    src={item.image}
                    alt={item.label}
                    style={{
                      width: isMobile ? '22px' : '28px',
                      height: isMobile ? '22px' : '28px',
                      borderRadius: '50%',
                      objectFit: 'cover',
                      border: active ? '3px solid white' : '2px solid rgba(255, 107, 53, 0.2)',
                      transition: 'all 0.3s',
                      boxShadow: active ? '0 4px 12px rgba(255, 107, 53, 0.2)' : 'none',
                    }}
                  />
                ) : (
                  <span style={{fontSize: isMobile ? '22px' : '28px', transition: 'transform 0.3s', lineHeight: 1}}>
                    {item.icon}
                  </span>
                )}
                {/* Unread Badge for Chat */}
                {item.label === 'Chat' && unreadCount > 0 && (
                  <div style={{
                    position: 'absolute',
                    top: '-4px',
                    right: '-4px',
                    background: 'linear-gradient(135deg, #E63946 0%, #D62828 100%)',
                    color: 'white',
                    borderRadius: '50%',
                    width: '28px',
                    height: '28px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    fontWeight: '800',
                    border: '3px solid white',
                    boxShadow: '0 4px 14px rgba(230, 57, 70, 0.4)',
                    animation: 'pulse 2s infinite',
                  }}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </div>
                )}
                <span style={{fontSize: '11px', fontWeight: '800', letterSpacing: '0.5px', fontFamily: 'inherit', textAlign: 'center'}}>{item.label}</span>
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
                bottom: '75px',
                transform: 'translateX(-50%)',
                width: '76px',
                height: '76px',
                background: 'linear-gradient(135deg, #FF6B35 0%, #FF8A5B 50%, #FF9D7A 100%)',
                color: 'white',
                borderRadius: '24px',
                border: '4px solid white',
                boxShadow: '0 16px 48px rgba(255, 107, 53, 0.4), inset 0 2px 0 rgba(255, 255, 255, 0.5), 0 -2px 0 rgba(0, 0, 0, 0.1)',
                cursor: 'pointer',
                fontWeight: '900',
                fontSize: '40px',
                transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                zIndex: 50,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                lineHeight: 1,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateX(-50%) translateY(-12px) scale(1.18)';
                e.currentTarget.style.boxShadow = '0 22px 56px rgba(255, 107, 53, 0.5), inset 0 2px 0 rgba(255, 255, 255, 0.5), 0 -2px 0 rgba(0, 0, 0, 0.12)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateX(-50%) translateY(0) scale(1)';
                e.currentTarget.style.boxShadow = '0 16px 48px rgba(255, 107, 53, 0.4), inset 0 2px 0 rgba(255, 255, 255, 0.5), 0 -2px 0 rgba(0, 0, 0, 0.1)';
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
