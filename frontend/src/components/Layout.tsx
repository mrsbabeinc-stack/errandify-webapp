import { Outlet, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import BottomNav from './BottomNav';
import RoleToggle from './RoleToggle';
import HanaCustomerService from './HanaCustomerService';

interface LayoutProps {
  userRole: 'asker' | 'doer';
  onRoleChange: (role: 'asker' | 'doer') => void;
  onLogout: () => void;
}

interface UserProfile {
  id: number;
  display_name: string;
  profile_image_url?: string;
}

export default function Layout({ userRole, onRoleChange, onLogout }: LayoutProps) {
  const navigate = useNavigate();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        setUserProfile(user);
      } catch (e) {
        console.error('Failed to parse user profile:', e);
      }
    }
  }, []);

  const handleCreateTask = () => {
    navigate('/create-errand-hana');
  };

  const handleProfileClick = () => {
    navigate('/account');
  };

  return (
    <div className="flex flex-col h-screen bg-errandify-bg">
      {/* Top Bar with Role Toggle & Notifications */}
      <div className="bg-white border-b border-gray-200 px-4 py-2 flex justify-between items-center sticky top-0 z-50">
        <RoleToggle currentRole={userRole} onRoleChange={onRoleChange} />
        <div className="flex items-center gap-3">
          {/* Profile Photo & Alias */}
          {userProfile && (
            <button
              onClick={handleProfileClick}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
              title={userProfile.display_name}
            >
              {userProfile.profile_image_url ? (
                <img
                  src={userProfile.profile_image_url}
                  alt={userProfile.display_name || 'User'}
                  className="w-8 h-8 rounded-full object-cover border border-gray-300"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-errandify-orange flex items-center justify-center text-white text-xs font-bold">
                  {(userProfile.display_name || 'U').charAt(0).toUpperCase()}
                </div>
              )}
              <span className="text-sm font-semibold text-gray-700 hidden sm:inline max-w-[100px] truncate">
                {userProfile.display_name || 'User'}
              </span>
            </button>
          )}
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
