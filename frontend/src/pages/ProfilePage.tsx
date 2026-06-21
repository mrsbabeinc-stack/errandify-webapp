import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

interface UserProfile {
  id: number;
  displayName: string;
  profileImage?: string;
  bio?: string;
  averageRating?: number;
  totalRatings?: number;
}

interface ProfilePageProps {
  userRole: 'asker' | 'doer';
  onLogout?: () => void;
}

export default function ProfilePage({ userRole, onLogout }: ProfilePageProps) {
  const navigate = useNavigate();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/users/profile`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setUserProfile(response.data.data);
    } catch (err) {
      console.error('Failed to fetch profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    if (onLogout) {
      onLogout();
    } else {
      navigate('/login');
    }
  };

  const menuItems = [
    { icon: '👁️', label: 'View', onClick: () => navigate('/my-profile'), color: 'from-amber-100 to-amber-50' },
    { icon: '✏️', label: 'Edit', onClick: () => navigate('/edit-profile'), color: 'from-orange-100 to-orange-50' },
    { icon: '🎁', label: 'Refer', onClick: () => navigate('/referral'), color: 'from-rose-100 to-rose-50' },
    { icon: '🎯', label: 'Skills', onClick: () => navigate('/category-preferences'), color: 'from-red-100 to-red-50' },
    { icon: '❤️', label: 'Trust', onClick: () => navigate('/trusted-users'), color: 'from-rose-100 to-rose-50' },
    { icon: '🚫', label: 'Block', onClick: () => navigate('/block-list'), color: 'from-orange-100 to-orange-50' },
    { icon: '🏦', label: 'Pay', onClick: () => navigate('/payout-settings'), color: 'from-amber-100 to-amber-50' },
    { icon: '📊', label: 'History', onClick: () => navigate('/transaction-history'), color: 'from-yellow-100 to-yellow-50' },
    { icon: '🔔', label: 'Notify', onClick: () => navigate('/settings/notifications'), color: 'from-yellow-100 to-yellow-50' },
    { icon: '⭐', label: 'Points', onClick: () => navigate('/errandify-points'), color: 'from-orange-400 to-amber-400 text-white' },
    { icon: '💎', label: 'Redeem', onClick: () => navigate('/my-rewards'), color: 'from-rose-400 to-orange-400 text-white' },
    { icon: '📈', label: 'Hist', onClick: () => navigate('/points-history'), color: 'from-amber-100 to-amber-50' },
    { icon: '🎯', label: 'How', onClick: () => navigate('/how-it-works'), color: 'from-orange-100 to-orange-50' },
    { icon: '🏘️', label: 'About', onClick: () => navigate('/about'), color: 'from-amber-100 to-amber-50' },
    { icon: '❓', label: 'FAQ', onClick: () => navigate('/faq'), color: 'from-rose-100 to-rose-50' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50 pb-16">
      {/* HEADER */}
      {!loading && userProfile && (
        <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-white p-3 shadow-md">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2">
              {userProfile.profileImage ? (
                <img
                  src={userProfile.profileImage}
                  alt={userProfile.displayName}
                  className="w-10 h-10 rounded-full object-cover border-2 border-white"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-white bg-opacity-30 flex items-center justify-center border-2 border-white text-sm font-bold">
                  👤
                </div>
              )}
              <div className="min-w-0">
                <p className="font-bold text-sm">{userProfile.displayName}</p>
                {userProfile.averageRating && (
                  <p className="text-xs opacity-90">⭐ {userProfile.averageRating.toFixed(1)}</p>
                )}
              </div>
            </div>
            <button
              onClick={() => navigate('/edit-profile')}
              className="bg-white text-orange-600 px-2 py-1 rounded text-xs font-bold"
            >
              ✏️
            </button>
          </div>
        </div>
      )}

      {/* MEGA COMPACT GRID */}
      <div className="max-w-4xl mx-auto px-2 py-2">
        <div className="grid grid-cols-4 gap-1">
          {menuItems.map((item, idx) => (
            <button
              key={idx}
              onClick={item.onClick}
              className={`bg-gradient-to-br ${item.color} rounded-lg p-2 hover:shadow-md transition text-center`}
            >
              <p className="text-lg mb-0.5">{item.icon}</p>
              <p className="text-xs font-bold text-gray-800">{item.label}</p>
            </button>
          ))}
        </div>

        {/* ACTION BUTTONS */}
        <div className="grid grid-cols-2 gap-1 mt-2">
          <button
            onClick={() => {
              if (window.confirm('Are you sure you want to delete your account?')) {
                navigate('/delete-account');
              }
            }}
            className="bg-white border-2 border-red-300 text-red-600 py-1.5 rounded text-xs font-bold hover:bg-red-50"
          >
            🗑️ Delete
          </button>
          <button
            onClick={handleLogout}
            className="bg-gradient-to-r from-orange-500 to-rose-500 text-white py-1.5 rounded text-xs font-bold hover:shadow-md"
          >
            🚪 Logout
          </button>
        </div>
      </div>
    </div>
  );
}
