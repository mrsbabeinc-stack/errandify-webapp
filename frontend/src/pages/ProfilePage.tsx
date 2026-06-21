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
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50 pb-20">
      {/* WARM HEADER */}
      {!loading && userProfile && (
        <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-white p-4 shadow-lg">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              {userProfile.profileImage ? (
                <img
                  src={userProfile.profileImage}
                  alt={userProfile.displayName}
                  className="w-12 h-12 rounded-full object-cover border-3 border-white shadow-md"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-white bg-opacity-30 flex items-center justify-center border-3 border-white text-xl font-bold">
                  👤
                </div>
              )}
              <div>
                <p className="font-bold text-base">{userProfile.displayName}</p>
                {userProfile.averageRating && (
                  <p className="text-xs opacity-95">⭐ {userProfile.averageRating.toFixed(1)} · {userProfile.totalRatings || 0} reviews</p>
                )}
              </div>
            </div>
            <button
              onClick={handleEditProfile}
              className="bg-white text-orange-600 px-3 py-1.5 rounded-lg text-sm font-bold hover:bg-amber-50 transition shadow-md"
            >
              ✏️ Edit
            </button>
          </div>
        </div>
      )}

      {/* WARM COMPACT MENU */}
      <div className="max-w-4xl mx-auto px-3 py-4 space-y-3">
        {/* ACCOUNT SECTION */}
        <div className="bg-white rounded-xl shadow-sm p-3 border-l-4 border-amber-500">
          <h3 className="text-xs font-bold text-amber-900 mb-2 uppercase tracking-wide">👤 Account</h3>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={handleViewProfile} className="bg-gradient-to-br from-amber-100 to-amber-50 rounded-lg p-2.5 hover:from-amber-200 transition">
              <p className="font-bold text-xs text-amber-900">👁️ View</p>
            </button>
            <button onClick={handleEditProfile} className="bg-gradient-to-br from-orange-100 to-orange-50 rounded-lg p-2.5 hover:from-orange-200 transition">
              <p className="font-bold text-xs text-orange-900">✏️ Edit</p>
            </button>
            <button onClick={handleReferral} className="bg-gradient-to-br from-rose-100 to-rose-50 rounded-lg p-2.5 hover:from-rose-200 transition">
              <p className="font-bold text-xs text-rose-900">🎁 Refer</p>
            </button>
            <button onClick={handleCategoryPreferences} className="bg-gradient-to-br from-red-100 to-red-50 rounded-lg p-2.5 hover:from-red-200 transition">
              <p className="font-bold text-xs text-red-900">🎯 Skills</p>
            </button>
          </div>
        </div>

        {/* COMMUNITY SECTION */}
        <div className="bg-white rounded-xl shadow-sm p-3 border-l-4 border-rose-500">
          <h3 className="text-xs font-bold text-rose-900 mb-2 uppercase tracking-wide">🤝 Community</h3>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={handleTrustedUsers} className="bg-gradient-to-br from-rose-100 to-rose-50 rounded-lg p-2.5 hover:from-rose-200 transition">
              <p className="font-bold text-xs text-rose-900">❤️ Trusted</p>
            </button>
            <button onClick={handleBlockList} className="bg-gradient-to-br from-orange-100 to-orange-50 rounded-lg p-2.5 hover:from-orange-200 transition">
              <p className="font-bold text-xs text-orange-900">🚫 Blocked</p>
            </button>
          </div>
        </div>

        {/* WALLET SECTION */}
        <div className="bg-white rounded-xl shadow-sm p-3 border-l-4 border-amber-600">
          <h3 className="text-xs font-bold text-amber-900 mb-2 uppercase tracking-wide">💳 Wallet</h3>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={handlePayoutSetting} className="bg-gradient-to-br from-amber-100 to-amber-50 rounded-lg p-2.5 hover:from-amber-200 transition">
              <p className="font-bold text-xs text-amber-900">🏦 Payout</p>
            </button>
            <button onClick={handleTransactionHistory} className="bg-gradient-to-br from-yellow-100 to-yellow-50 rounded-lg p-2.5 hover:from-yellow-200 transition">
              <p className="font-bold text-xs text-yellow-900">📊 History</p>
            </button>
          </div>
        </div>

        {/* NOTIFICATIONS SECTION */}
        <button onClick={handleNotificationPreferences} className="w-full bg-white rounded-xl shadow-sm p-3 border-l-4 border-yellow-500 hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <p className="font-bold text-xs text-yellow-900">🔔 Notifications</p>
            <span className="text-yellow-600 text-lg">›</span>
          </div>
        </button>

        {/* REWARDS SECTION */}
        <div className="bg-white rounded-xl shadow-sm p-3 border-l-4 border-orange-600">
          <h3 className="text-xs font-bold text-orange-900 mb-2 uppercase tracking-wide">🎁 Rewards</h3>
          <div className="grid grid-cols-3 gap-2">
            <button onClick={handleErrandifyPoints} className="bg-gradient-to-br from-orange-400 to-amber-400 rounded-lg p-2.5 hover:from-orange-500 transition text-white shadow-sm">
              <p className="font-bold text-xs">⭐ Points</p>
            </button>
            <button onClick={handleMyRewards} className="bg-gradient-to-br from-rose-400 to-orange-400 rounded-lg p-2.5 hover:from-rose-500 transition text-white shadow-sm">
              <p className="font-bold text-xs">💎 Redeem</p>
            </button>
            <button onClick={handlePointsHistory} className="bg-gradient-to-br from-amber-100 to-amber-50 rounded-lg p-2.5 hover:from-amber-200 transition">
              <p className="font-bold text-xs text-amber-900">📈 History</p>
            </button>
          </div>
        </div>

        {/* HELP SECTION */}
        <div className="bg-white rounded-xl shadow-sm p-3 border-l-4 border-orange-500">
          <h3 className="text-xs font-bold text-orange-900 mb-2 uppercase tracking-wide">ℹ️ Help</h3>
          <div className="grid grid-cols-3 gap-2">
            <button onClick={() => navigate('/how-it-works')} className="bg-gradient-to-br from-orange-100 to-orange-50 rounded-lg p-2.5 hover:from-orange-200 transition">
              <p className="font-bold text-xs text-orange-900">🎯 How</p>
            </button>
            <button onClick={() => navigate('/about')} className="bg-gradient-to-br from-amber-100 to-amber-50 rounded-lg p-2.5 hover:from-amber-200 transition">
              <p className="font-bold text-xs text-amber-900">🏘️ About</p>
            </button>
            <button onClick={() => navigate('/faq')} className="bg-gradient-to-br from-rose-100 to-rose-50 rounded-lg p-2.5 hover:from-rose-200 transition">
              <p className="font-bold text-xs text-rose-900">❓ FAQ</p>
            </button>
          </div>
        </div>

        {/* ACTION BUTTONS */}
        <div className="flex gap-2 pt-2">
          <button
            onClick={handleDeleteAccount}
            className="flex-1 bg-white border-2 border-red-300 text-red-600 py-2.5 rounded-lg text-xs font-bold hover:bg-red-50 transition"
          >
            🗑️ Delete
          </button>
          <button
            onClick={handleLogout}
            className="flex-1 bg-gradient-to-r from-orange-500 to-rose-500 text-white py-2.5 rounded-lg text-xs font-bold hover:shadow-lg transition"
          >
            🚪 Logout
          </button>
        </div>
      </div>
    </div>
  );
}
