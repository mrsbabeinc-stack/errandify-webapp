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

  const handleViewProfile = () => navigate('/my-profile');
  const handleEditProfile = () => navigate('/edit-profile');
  const handleReferral = () => navigate('/referral');
  const handleTrustedUsers = () => navigate('/trusted-users');
  const handleBlockList = () => navigate('/block-list');
  const handlePayoutSetting = () => navigate('/payout-settings');
  const handleTransactionHistory = () => navigate('/transaction-history');
  const handleNotificationPreferences = () => navigate('/settings/notifications');
  const handleCategoryPreferences = () => navigate('/category-preferences');
  const handleErrandifyPoints = () => navigate('/errandify-points');
  const handleMyRewards = () => navigate('/my-rewards');
  const handlePointsHistory = () => navigate('/points-history');
  const handleDeleteAccount = () => {
    if (window.confirm('Are you sure you want to delete your account? This cannot be undone.')) {
      navigate('/delete-account');
    }
  };

  return (
    <div className="min-h-screen bg-errandify-bg pb-20">
      {/* COMPACT HEADER */}
      {!loading && userProfile && (
        <div className="bg-gradient-to-r from-errandify-orange to-orange-500 text-white p-3 shadow-md">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              {userProfile.profileImage ? (
                <img
                  src={userProfile.profileImage}
                  alt={userProfile.displayName}
                  className="w-10 h-10 rounded-full object-cover border-2 border-white"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-white bg-opacity-30 flex items-center justify-center border-2 border-white text-lg">
                  👤
                </div>
              )}
              <div>
                <p className="font-bold text-sm">{userProfile.displayName}</p>
                {userProfile.averageRating && (
                  <p className="text-xs opacity-90">⭐ {userProfile.averageRating.toFixed(1)}</p>
                )}
              </div>
            </div>
            <button
              onClick={handleEditProfile}
              className="bg-white text-errandify-orange px-3 py-1 rounded text-xs font-bold"
            >
              ✏️
            </button>
          </div>
        </div>
      )}

      {/* COMPACT MENU GRID */}
      <div className="max-w-4xl mx-auto px-3 py-3 space-y-3">
        {/* ACCOUNT - 4 ITEMS */}
        <div className="grid grid-cols-2 gap-2">
          <button onClick={handleViewProfile} className="bg-white rounded p-2 shadow-sm hover:shadow-md transition border-l-4 border-errandify-orange">
            <p className="font-bold text-xs text-gray-800">View</p>
            <p className="text-xs text-gray-500">Profile</p>
          </button>
          <button onClick={handleEditProfile} className="bg-white rounded p-2 shadow-sm hover:shadow-md transition border-l-4 border-blue-500">
            <p className="font-bold text-xs text-gray-800">Edit</p>
            <p className="text-xs text-gray-500">Profile</p>
          </button>
          <button onClick={handleReferral} className="bg-white rounded p-2 shadow-sm hover:shadow-md transition border-l-4 border-purple-500">
            <p className="font-bold text-xs text-gray-800">🎁</p>
            <p className="text-xs text-gray-500">Referral</p>
          </button>
          <button onClick={handleCategoryPreferences} className="bg-white rounded p-2 shadow-sm hover:shadow-md transition border-l-4 border-green-500">
            <p className="font-bold text-xs text-gray-800">🎯</p>
            <p className="text-xs text-gray-500">Skills</p>
          </button>
        </div>

        {/* COMMUNITY - 2 ITEMS */}
        <div className="grid grid-cols-2 gap-2">
          <button onClick={handleTrustedUsers} className="bg-white rounded p-2 shadow-sm hover:shadow-md transition border-l-4 border-red-500">
            <p className="font-bold text-xs text-gray-800">❤️</p>
            <p className="text-xs text-gray-500">Trusted</p>
          </button>
          <button onClick={handleBlockList} className="bg-white rounded p-2 shadow-sm hover:shadow-md transition border-l-4 border-orange-600">
            <p className="font-bold text-xs text-gray-800">🚫</p>
            <p className="text-xs text-gray-500">Blocked</p>
          </button>
        </div>

        {/* WALLET - 2 ITEMS */}
        <div className="grid grid-cols-2 gap-2">
          <button onClick={handlePayoutSetting} className="bg-white rounded p-2 shadow-sm hover:shadow-md transition border-l-4 border-blue-600">
            <p className="font-bold text-xs text-gray-800">🏦</p>
            <p className="text-xs text-gray-500">Payout</p>
          </button>
          <button onClick={handleTransactionHistory} className="bg-white rounded p-2 shadow-sm hover:shadow-md transition border-l-4 border-indigo-600">
            <p className="font-bold text-xs text-gray-800">📊</p>
            <p className="text-xs text-gray-500">History</p>
          </button>
        </div>

        {/* NOTIFICATIONS - 1 ITEM */}
        <button onClick={handleNotificationPreferences} className="w-full bg-white rounded p-2 shadow-sm hover:shadow-md transition border-l-4 border-yellow-500">
          <div className="flex justify-between items-center">
            <div className="text-left">
              <p className="font-bold text-xs text-gray-800">🔔 Notifications</p>
              <p className="text-xs text-gray-500">Manage alerts</p>
            </div>
            <span className="text-gray-400">›</span>
          </div>
        </button>

        {/* REWARDS - 3 ITEMS */}
        <div className="grid grid-cols-3 gap-2">
          <button onClick={handleErrandifyPoints} className="bg-gradient-to-br from-purple-500 to-pink-500 rounded p-2 shadow-sm hover:shadow-md transition text-white">
            <p className="font-bold text-xs">⭐</p>
            <p className="text-xs">Points</p>
          </button>
          <button onClick={handleMyRewards} className="bg-gradient-to-br from-green-500 to-emerald-500 rounded p-2 shadow-sm hover:shadow-md transition text-white">
            <p className="font-bold text-xs">💎</p>
            <p className="text-xs">Redeem</p>
          </button>
          <button onClick={handlePointsHistory} className="bg-white rounded p-2 shadow-sm hover:shadow-md transition border-l-4 border-amber-500">
            <p className="font-bold text-xs text-gray-800">📈</p>
            <p className="text-xs text-gray-500">History</p>
          </button>
        </div>

        {/* HELP - 3 ITEMS */}
        <div className="grid grid-cols-3 gap-2">
          <button onClick={() => navigate('/how-it-works')} className="bg-white rounded p-2 shadow-sm hover:shadow-md transition border-l-4 border-blue-400">
            <p className="font-bold text-xs text-gray-800">🎯</p>
            <p className="text-xs text-gray-500">How It</p>
          </button>
          <button onClick={() => navigate('/about')} className="bg-white rounded p-2 shadow-sm hover:shadow-md transition border-l-4 border-orange-400">
            <p className="font-bold text-xs text-gray-800">🏘️</p>
            <p className="text-xs text-gray-500">About</p>
          </button>
          <button onClick={() => navigate('/faq')} className="bg-white rounded p-2 shadow-sm hover:shadow-md transition border-l-4 border-green-400">
            <p className="font-bold text-xs text-gray-800">❓</p>
            <p className="text-xs text-gray-500">FAQ</p>
          </button>
        </div>

        {/* ACTION BUTTONS */}
        <div className="flex gap-2 pt-2">
          <button onClick={handleDeleteAccount} className="flex-1 bg-red-50 border-2 border-red-200 text-red-600 py-2 rounded text-xs font-bold hover:bg-red-100 transition">
            🗑️ Delete
          </button>
          <button onClick={handleLogout} className="flex-1 bg-gradient-to-r from-errandify-orange to-orange-500 text-white py-2 rounded text-xs font-bold hover:shadow-md transition">
            🚪 Logout
          </button>
        </div>
      </div>
    </div>
  );
}
