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
  const [activeTab, setActiveTab] = useState<'account' | 'community' | 'wallet' | 'rewards' | 'security' | 'help'>('account');

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

  const tabs = [
    { id: 'account' as const, label: '👤 Account', icon: '👤' },
    { id: 'community' as const, label: '🤝 Community', icon: '🤝' },
    { id: 'wallet' as const, label: '💳 Wallet', icon: '💳' },
    { id: 'rewards' as const, label: '🎁 Rewards', icon: '🎁' },
    { id: 'security' as const, label: '🔒 Security', icon: '🔒' },
    { id: 'help' as const, label: 'ℹ️ Help', icon: 'ℹ️' },
  ];

  const menuByTab = {
    account: [
      { icon: '👁️', label: 'View Profile', onClick: () => navigate('/my-profile') },
      { icon: '✏️', label: 'Edit Profile', onClick: () => navigate('/edit-profile') },
      { icon: '🎁', label: 'Referral Program', onClick: () => navigate('/referral') },
      { icon: '🎯', label: 'Skills & Categories', onClick: () => navigate('/category-preferences') },
    ],
    community: [
      { icon: '❤️', label: 'Trusted Users', onClick: () => navigate('/trusted-users') },
      { icon: '🚫', label: 'Blocked Users', onClick: () => navigate('/block-list') },
    ],
    wallet: [
      { icon: '🏦', label: 'Payout Settings', onClick: () => navigate('/payout-settings') },
      { icon: '📊', label: 'Transaction History', onClick: () => navigate('/transaction-history') },
    ],
    rewards: [
      { icon: '⭐', label: 'Errandify Points', onClick: () => navigate('/errandify-points') },
      { icon: '💎', label: 'Redeem Rewards', onClick: () => navigate('/my-rewards') },
      { icon: '📈', label: 'Points History', onClick: () => navigate('/points-history') },
    ],
    security: [
      { icon: '🔔', label: 'Notifications', onClick: () => navigate('/settings/notifications') },
      { icon: '🌍', label: 'Language & Region', onClick: () => navigate('/settings/language') },
      { icon: '🔐', label: 'Change Password', onClick: () => navigate('/settings/change-password') },
      { icon: '🛡️', label: 'Two-Factor Auth', onClick: () => navigate('/settings/2fa') },
    ],
    help: [
      { icon: '🎯', label: 'How It Works', onClick: () => navigate('/how-it-works') },
      { icon: '🏘️', label: 'About Errandify', onClick: () => navigate('/about') },
      { icon: '❓', label: 'FAQ', onClick: () => navigate('/faq') },
    ],
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50 pb-20">
      {/* HEADER */}
      {!loading && userProfile && (
        <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-white p-4 shadow-md">
          <div className="max-w-5xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              {userProfile.profileImage ? (
                <img
                  src={userProfile.profileImage}
                  alt={userProfile.displayName}
                  className="w-12 h-12 rounded-full object-cover border-2 border-white"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-white bg-opacity-30 flex items-center justify-center border-2 border-white text-lg font-bold">
                  👤
                </div>
              )}
              <div>
                <p className="font-bold text-base">{userProfile.displayName}</p>
                {userProfile.averageRating && (
                  <p className="text-xs opacity-90">⭐ {userProfile.averageRating.toFixed(1)}</p>
                )}
              </div>
            </div>
            <button
              onClick={() => navigate('/edit-profile')}
              className="bg-white text-orange-600 px-3 py-1.5 rounded text-xs font-bold hover:bg-amber-50"
            >
              ✏️ Edit
            </button>
          </div>
        </div>
      )}

      {/* TAB NAVIGATION */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-5xl mx-auto px-2 flex overflow-x-auto gap-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-3 text-sm font-bold whitespace-nowrap transition ${
                activeTab === tab.id
                  ? 'border-b-4 border-orange-500 text-orange-600'
                  : 'text-gray-600 hover:text-gray-800 border-b-4 border-transparent'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* CONTENT */}
      <div className="max-w-5xl mx-auto px-3 py-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {menuByTab[activeTab].map((item, idx) => (
            <button
              key={idx}
              onClick={item.onClick}
              className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-orange-400 hover:shadow-md hover:border-orange-500 transition text-left"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{item.icon}</span>
                <span className="font-bold text-gray-800">{item.label}</span>
              </div>
            </button>
          ))}
        </div>

        {/* ACTION BUTTONS */}
        <div className="grid grid-cols-2 gap-3 mt-6">
          <button
            onClick={() => {
              if (window.confirm('Are you sure you want to delete your account?')) {
                navigate('/delete-account');
              }
            }}
            className="bg-white border-2 border-red-300 text-red-600 py-2 rounded-lg text-sm font-bold hover:bg-red-50 transition"
          >
            🗑️ Delete Account
          </button>
          <button
            onClick={handleLogout}
            className="bg-gradient-to-r from-orange-500 to-rose-500 text-white py-2 rounded-lg text-sm font-bold hover:shadow-lg transition"
          >
            🚪 Logout
          </button>
        </div>
      </div>
    </div>
  );
}
