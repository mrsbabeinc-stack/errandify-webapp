import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import RoleToggle from './RoleToggle';

interface AdminThemeWrapperProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  showBackButton?: boolean;
  onBack?: () => void;
  style?: React.CSSProperties;
}

interface UserProfile {
  id?: number;
  name?: string;
  display_name?: string;
  alias?: string;
  profile_image_url?: string;
}

export default function AdminThemeWrapper({
  children,
  title,
  subtitle,
  showBackButton = false,
  onBack,
  style,
}: AdminThemeWrapperProps) {
  const navigate = useNavigate();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<'asker' | 'doer'>('asker');
  // On phones, hide the profile name/avatar so it doesn't overlap the role toggle (profile is in the bottom nav)
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' && window.innerWidth < 640);
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    const loadUserProfile = () => {
      const userStr = localStorage.getItem('user');
      const profileImg = localStorage.getItem('profileImage');
      const role = (localStorage.getItem('userRole') || 'asker') as 'asker' | 'doer';
      setUserRole(role);

      console.log('[AdminThemeWrapper] Loading user from localStorage:', userStr ? 'user found' : 'no user');

      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          console.log('[AdminThemeWrapper] Parsed user:', user);
          setUserProfile(user);
          if (profileImg) {
            setProfileImage(profileImg);
          }
        } catch (e) {
          console.error('Failed to parse user profile:', e);
          setUserProfile(null);
        }
      } else {
        setUserProfile(null);
      }
    };

    loadUserProfile();
    window.addEventListener('profileUpdated', loadUserProfile);
    window.addEventListener('storage', loadUserProfile);
    return () => {
      window.removeEventListener('profileUpdated', loadUserProfile);
      window.removeEventListener('storage', loadUserProfile);
    };
  }, []);

  const handleRoleChange = (role: 'asker' | 'doer') => {
    setUserRole(role);
    localStorage.setItem('userRole', role);
    navigate('/home');
  };

  const handleProfileClick = () => {
    navigate('/my-account');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('userId');
    localStorage.removeItem('userRole');
    localStorage.removeItem('current_role');
    localStorage.removeItem('singpass_state');
    localStorage.removeItem('singpass_nonce');
    localStorage.removeItem('singpass_mode');
    localStorage.removeItem('isAuthenticated');
    window.location.href = '/auth';
  };

  return (
    <div style={{
      background: 'white',
      height: '100vh',
      width: '100vw',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      position: 'fixed',
      top: 0,
      left: 0
    }}>
      {/* Header - Top Bar with Logo, Role Toggle & Profile */}
      <div style={{
        background: 'white',
        borderBottom: '1px solid #F0E4DA',
        padding: '8px 16px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
        zIndex: 50,
        flexShrink: 0
      }}>
        {/* Logo - Left */}
        <div style={{position: 'absolute', left: 16, display: 'flex', alignItems: 'center', gap: 8}}>
          <img
            src="/images/Errandify Logo.png"
            alt="Errandify"
            style={{height: 32, width: 'auto'}}
          />
        </div>

        {/* Role Toggle - Center */}
        <div style={{flex: 1, display: 'flex', justifyContent: 'center'}}>
          <RoleToggle currentRole={userRole} onRoleChange={handleRoleChange} />
        </div>

        {/* Notifications & Profile - Right */}
        <div style={{position: 'absolute', right: 16, display: 'flex', alignItems: 'center', gap: 16}}>
          <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
            {userProfile ? (
              <>
                <button
                  onClick={handleProfileClick}
                  style={{
                    display: isMobile ? 'none' : 'flex',
                    alignItems: 'center',
                    gap: 8,
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    opacity: 0.8,
                    transition: 'opacity 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                  onMouseLeave={(e) => e.currentTarget.style.opacity = '0.8'}
                  title={userProfile.alias || userProfile.display_name || userProfile.name || 'User'}
                >
                  {profileImage ? (
                    <img
                      src={profileImage}
                      alt="Profile"
                      style={{width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', border: '1px solid #E3D2C4'}}
                    />
                  ) : (
                    <div style={{width: 32, height: 32, borderRadius: '50%', background: '#FF6B35', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 12, fontWeight: 'bold'}}>
                      {(userProfile.alias || userProfile.name || 'U').charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span style={{fontSize: 14, fontWeight: 600, color: '#644C3C', maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>
                    {userProfile.alias || userProfile.display_name || userProfile.name || 'User'}
                  </span>
                </button>
                <button
                  onClick={handleLogout}
                  style={{
                    padding: '4px 12px',
                    fontSize: 14,
                    fontWeight: 600,
                    color: 'white',
                    background: '#FF6B35',
                    border: 'none',
                    borderRadius: 6,
                    cursor: 'pointer',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#E55A25'}
                  onMouseLeave={(e) => e.currentTarget.style.background = '#FF6B35'}
                >
                  Logout
                </button>
              </>
            ) : (
              <button
                onClick={() => navigate('/auth')}
                style={{
                  padding: '4px 12px',
                  fontSize: 14,
                  fontWeight: 600,
                  color: 'white',
                  background: '#2563eb',
                  border: 'none',
                  borderRadius: 6,
                  cursor: 'pointer'
                }}
              >
                Login
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        overflowX: isMobile ? 'hidden' : 'auto',
        WebkitOverflowScrolling: 'touch',
        display: 'flex',
        flexDirection: 'column',
        maxWidth: 1200,
        margin: '0 auto',
        width: '100%',
        // 20px on every side cost 40px of a 360px-wide screen before any
        // content. Desktop keeps the roomier value.
        padding: isMobile ? '12px 12px 8px' : '20px',
        ...style
      }}>
        {/*
          Page head — back arrow and title on ONE row.

          These were stacked: a full-width "← Back" link, then a 28px title,
          then a subtitle, each with its own margin. Together with the 20px
          content padding that spent roughly 125px before any page content, on
          every one of the thirteen screens using this wrapper. On a phone that
          is a fifth of the viewport given to a label.

          Colours come from the theme scale rather than the cool greys that were
          hardcoded here (#333 / #666 / #e5e7eb), so the header matches the rest
          of the app. Type sizes live in the `.app-page-head` block in index.css
          — they have to out-rank the global `h1 { ... !important }`.
        */}
        {(showBackButton || title) && (
          <div
            className="app-page-head"
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: isMobile ? '8px' : '12px',
              marginBottom: isMobile ? '10px' : '16px',
              flexShrink: 0,
            }}
          >
            {showBackButton && (
              <button
                onClick={onBack}
                aria-label="Go back"
                title="Go back"
                style={{
                  flexShrink: 0,
                  width: isMobile ? 30 : 34,
                  height: isMobile ? 30 : 34,
                  marginTop: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: '#FFEDE2',
                  border: 'none',
                  borderRadius: '50%',
                  color: '#D2521C',
                  fontSize: isMobile ? '16px' : '18px',
                  fontWeight: 700,
                  lineHeight: 1,
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#FFD9C4')}
                onMouseLeave={(e) => (e.currentTarget.style.background = '#FFEDE2')}
              >
                ←
              </button>
            )}

            {title && (
              <div style={{ minWidth: 0 }}>
                <h1>{title}</h1>
                {subtitle && <p>{subtitle}</p>}
              </div>
            )}
          </div>
        )}

        {/* Content - Scrollable */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: isMobile ? 'hidden' : 'auto',
          WebkitOverflowScrolling: 'touch'
        }}>
          {children}
        </div>
      </div>
    </div>
  );
}
