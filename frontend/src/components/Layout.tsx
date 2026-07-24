import { Outlet, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import BottomNav from './BottomNav';
import ContextSwitcher from './ContextSwitcher';
import { clearAppContext } from '../hooks/useAppContext';
import RoleToggle from './RoleToggle';
import HanaCustomerService from './HanaCustomerService';

interface LayoutProps {
  userRole: 'asker' | 'doer' | 'admin' | 'support_l2' | 'support_l3';
  onRoleChange: (role: 'asker' | 'doer') => void;
  onLogout: () => void;
}

interface UserProfile {
  id?: number;
  name?: string;
  display_name?: string;
  alias?: string;
  profile_image_url?: string;
}

export default function Layout({ userRole, onRoleChange, onLogout }: LayoutProps) {
  const navigate = useNavigate();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [profileImage, setProfileImage] = useState<string | null>(null);

  useEffect(() => {
    // Load initial user profile and image
    const loadUserProfile = () => {
      const userStr = localStorage.getItem('user');
      const profileImg = localStorage.getItem('profileImage');
      console.log('[Layout] localStorage.user:', userStr);
      console.log('[Layout] profileImage:', profileImg ? 'present' : 'not found');
      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          setUserProfile(user);
          if (profileImg) {
            setProfileImage(profileImg);
          }
        } catch (e) {
          console.error('[Layout] Failed to parse user profile:', e);
        }
      } else {
        console.log('[Layout] No user in localStorage');
      }
    };

    loadUserProfile();

    // Listen for custom profile update events (same tab)
    const handleProfileUpdate = () => {
      console.log('[Layout] Profile update event received');
      loadUserProfile();
    };

    // Listen for storage changes (different tabs)
    const handleStorageChange = (e: StorageEvent) => {
      if ((e.key === 'user' || e.key === 'profileImage') && e.newValue) {
        console.log('[Layout] Storage change detected:', e.key);
        loadUserProfile();
      }
    };

    window.addEventListener('profileUpdated', handleProfileUpdate);
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('profileUpdated', handleProfileUpdate);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const handleCreateTask = () => {
    navigate('/create-errand-hana');
  };

  const handleProfileClick = () => {
    navigate('/my-account');
  };

  const handleRoleChange = (role: 'asker' | 'doer') => {
    onRoleChange(role);
    navigate('/home');
  };

  return (
    <div className="flex flex-col h-screen bg-errandify-bg">
      {/* Top Bar with Logo, Role Toggle & Profile.
          On phones the logo and the profile/logout cluster were absolutely
          positioned over a centred role toggle, so an admin's third role
          button slid underneath the Logout button. Below md everything sits in
          normal flow (justify-between) so nothing can overlap; from md up the
          original absolute-centred layout is restored unchanged. */}
      <div className="bg-white border-b border-gray-200 px-4 py-2 flex justify-between md:justify-center items-center relative sticky top-0 z-50 gap-2">
        {/* Logo - Left */}
        <div className="static md:absolute md:left-4 flex items-center gap-2 shrink-0">
          <img
            src="/images/Errandify Logo.png"
            alt="Errandify"
            className="h-8 w-auto"
          />
        </div>

        {/* Role Toggle - Center */}
        <div className="flex-1 min-w-0 flex justify-center overflow-x-auto">
          <RoleToggle currentRole={userRole} onRoleChange={handleRoleChange} />
        </div>

        {/* Notifications & Profile - Right */}
        <div className="static md:absolute md:right-4 flex items-center gap-4 shrink-0">
          {/* Which hat am I wearing — hidden for people without a company */}
          <ContextSwitcher compact />

          {/* Notification Bell - Removed */}
          {/* <NotificationBell /> */}

          {/* Profile & Logout */}
          <div className="flex items-center gap-2">
          {userProfile ? (
            <>
              {/* Profile Photo & Alias */}
              <button
                onClick={handleProfileClick}
                className="hidden sm:flex items-center gap-2 hover:opacity-80 transition-opacity"
                title={userProfile.alias || userProfile.display_name || userProfile.name || 'User'}
              >
                {profileImage ? (
                  <img
                    src={profileImage}
                    alt={userProfile.alias || userProfile.name || 'User'}
                    className="w-8 h-8 rounded-full object-cover border border-gray-300"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-errandify-orange flex items-center justify-center text-white text-xs font-bold">
                    {(userProfile.alias || userProfile.name || 'U').charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="hidden min-[480px]:inline text-sm font-semibold text-gray-700 max-w-[100px] truncate">
                  {userProfile.alias || userProfile.display_name || userProfile.name || 'User'}
                </span>
              </button>
              {/* Logout Button */}
              <button
                onClick={() => {
                  localStorage.removeItem('token');
                  localStorage.removeItem('user');
                  localStorage.removeItem('userId');
                  clearAppContext();
                  onLogout();
                }}
                className="px-3 py-1 text-sm font-semibold text-white bg-errandify-orange hover:bg-orange-600 rounded-lg transition-colors"
              >
                Logout
              </button>
            </>
          ) : (
            /* Login Button */
            <button
              onClick={() => navigate('/login')}
              className="px-3 py-1 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              Login
            </button>
          )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pb-20">
        <Outlet />
      </main>

      {/* Floating Hana - Always Available */}
      <HanaCustomerService />

      {/* Bottom Navigation */}
      <BottomNav
        onLogout={onLogout}
        userRole={userRole}
        onCreateTask={handleCreateTask}
      />
    </div>
  );
}
