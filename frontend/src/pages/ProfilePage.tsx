import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import AdminThemeWrapper from '../components/AdminThemeWrapper';

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
  const [activeTab, setActiveTab] = useState<'account' | 'preferences' | 'community' | 'wallet' | 'rewards' | 'help'>('account');

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
    localStorage.removeItem('userId');
    localStorage.removeItem('userRole');
    localStorage.removeItem('current_role');
    localStorage.removeItem('singpass_state');
    localStorage.removeItem('singpass_nonce');
    localStorage.removeItem('singpass_mode');
    if (onLogout) {
      onLogout();
    } else {
      navigate('/auth');
    }
  };

  const tabs = [
    { id: 'account' as const, label: '👤 MyAccount' },
    { id: 'preferences' as const, label: '⚙️ Preferences' },
    { id: 'community' as const, label: '🤝 Community' },
    { id: 'wallet' as const, label: '💼 MyPocket' },
    { id: 'rewards' as const, label: '🎁 Rewards' },
    { id: 'help' as const, label: 'ℹ️ Help' },
  ];

  const menuByTab = {
    account: [
      { icon: '👁️', label: 'View Profile', onClick: () => navigate('/my-profile') },
      { icon: '✏️', label: 'Edit Profile', onClick: () => navigate('/edit-profile') },
      { icon: '🎁', label: 'Referral', onClick: () => navigate('/referral') },
    ],
    preferences: [
      { icon: '🎯', label: 'Categories', onClick: () => navigate('/category-preferences') },
      { icon: '🔔', label: 'Notifications', onClick: () => navigate('/settings/notifications') },
      { icon: '🌍', label: 'Language', onClick: () => navigate('/settings/language') },
    ],
    community: [
      { icon: '❤️', label: 'Trusted Users', onClick: () => navigate('/trusted-users') },
      { icon: '🚫', label: 'Block List', onClick: () => navigate('/block-list') },
    ],
    wallet: [
      { icon: '💳', label: 'Payout', onClick: () => navigate('/payout-settings') },
      { icon: '📊', label: 'Txn History', onClick: () => navigate('/transaction-history') },
    ],
    rewards: [
      { icon: '⭐', label: 'Points', onClick: () => navigate('/errandify-points') },
      { icon: '💎', label: 'Redeem', onClick: () => navigate('/my-rewards') },
      { icon: '📈', label: 'History', onClick: () => navigate('/points-history') },
    ],
    help: [
      { icon: '🎯', label: 'How It Works', onClick: () => navigate('/how-it-works') },
      { icon: '🏘️', label: 'About', onClick: () => navigate('/about') },
      { icon: '❓', label: 'FAQ', onClick: () => navigate('/faq') },
      { icon: '🔐', label: 'Password', onClick: () => navigate('/settings/change-password') },
      { icon: '🛡️', label: '2FA', onClick: () => navigate('/settings/2fa') },
    ],
  };

  return (
    <AdminThemeWrapper title="👤 User Profile" showBackButton onBack={() => navigate(-1)}>
      <div>
      {/* ===== PUBLIC PROFILE SECTION ===== */}
      <div className="bg-white border-b-4 border-orange-200 shadow-md">
        {!loading && userProfile && (
          <div>
            {/* HEADER BANNER */}
            <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-white p-4">
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
                      <p className="text-xs opacity-90">⭐ {userProfile.averageRating.toFixed(1)} · {userProfile.totalRatings || 0} reviews</p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => navigate('/my-profile')}
                  className="bg-white text-orange-600 px-3 py-1.5 rounded text-xs font-bold hover:bg-amber-50"
                >
                  👁️ View Full Profile
                </button>
              </div>
            </div>

            {/* PUBLIC INFO LABEL */}
            <div className="max-w-5xl mx-auto px-4 py-2">
              <p className="text-xs font-bold text-orange-600 uppercase tracking-wide">🌐 PUBLIC PROFILE (Visible to others)</p>
            </div>
          </div>
        )}
      </div>

      {/* ===== PRIVATE SETTINGS SECTION ===== */}
      <div className="mt-6">
        {/* SECTION HEADER */}
        <div className="max-w-5xl mx-auto px-4 mb-3">
          <p className="text-xs font-bold text-gray-600 uppercase tracking-wide">🔒 PRIVATE SETTINGS (Only you see this)</p>
          <h2 className="text-lg font-bold text-gray-800 mt-1">Manage Your Account</h2>
        </div>

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

        {/* TAB CONTENT */}
        <div className="max-w-5xl mx-auto px-4 py-4">
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
      </div>
    </AdminThemeWrapper>
  );
}
