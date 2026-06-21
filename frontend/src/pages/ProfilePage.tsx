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
    <div className="min-h-screen bg-gradient-to-b from-errandify-bg to-white pb-24">
      {/* Profile Hero Card */}
      {!loading && userProfile && (
        <div className="bg-gradient-to-r from-errandify-orange to-orange-500 text-white p-6 shadow-lg">
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0">
                  {userProfile.profileImage ? (
                    <img
                      src={userProfile.profileImage}
                      alt={userProfile.displayName}
                      className="w-16 h-16 rounded-full object-cover border-3 border-white"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-white bg-opacity-30 flex items-center justify-center border-3 border-white text-3xl">
                      👤
                    </div>
                  )}
                </div>
                <div>
                  <h1 className="text-2xl font-bold">{userProfile.displayName}</h1>
                  {userProfile.averageRating && (
                    <p className="text-sm opacity-90">⭐ {userProfile.averageRating.toFixed(1)} ({userProfile.totalRatings || 0} reviews)</p>
                  )}
                </div>
              </div>
              <button
                onClick={handleEditProfile}
                className="bg-white text-errandify-orange px-4 py-2 rounded-lg font-bold hover:opacity-90 transition"
              >
                ✏️ Edit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Menu Grid */}
      <div className="max-w-2xl mx-auto px-3 py-6 space-y-6">
        {/* Account Section */}
        <div>
          <h2 className="text-lg font-bold text-errandify-brown mb-3">👤 Account</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <button
              onClick={handleViewProfile}
              className="bg-white rounded-lg shadow-sm p-4 border-t-4 border-errandify-orange hover:shadow-md transition text-left"
            >
              <p className="font-bold text-gray-800">View Profile</p>
              <p className="text-xs text-gray-600">See your public profile</p>
            </button>
            <button
              onClick={handleEditProfile}
              className="bg-white rounded-lg shadow-sm p-4 border-t-4 border-blue-500 hover:shadow-md transition text-left"
            >
              <p className="font-bold text-gray-800">Edit Profile</p>
              <p className="text-xs text-gray-600">Update your information</p>
            </button>
            <button
              onClick={handleReferral}
              className="bg-white rounded-lg shadow-sm p-4 border-t-4 border-purple-500 hover:shadow-md transition text-left"
            >
              <p className="font-bold text-gray-800">🎁 Referral</p>
              <p className="text-xs text-gray-600">Earn from invites</p>
            </button>
            <button
              onClick={handleCategoryPreferences}
              className="bg-white rounded-lg shadow-sm p-4 border-t-4 border-green-500 hover:shadow-md transition text-left"
            >
              <p className="font-bold text-gray-800">🎯 Categories</p>
              <p className="text-xs text-gray-600">Manage your skills</p>
            </button>
          </div>
        </div>

        {/* Community Section */}
        <div>
          <h2 className="text-lg font-bold text-errandify-brown mb-3">🤝 Community</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <button
              onClick={handleTrustedUsers}
              className="bg-white rounded-lg shadow-sm p-4 border-t-4 border-red-500 hover:shadow-md transition text-left"
            >
              <p className="font-bold text-gray-800">❤️ Trusted Users</p>
              <p className="text-xs text-gray-600">Your trusted network</p>
            </button>
            <button
              onClick={handleBlockList}
              className="bg-white rounded-lg shadow-sm p-4 border-t-4 border-orange-600 hover:shadow-md transition text-left"
            >
              <p className="font-bold text-gray-800">🚫 Blocked Users</p>
              <p className="text-xs text-gray-600">Manage blocklist</p>
            </button>
          </div>
        </div>

        {/* Wallet Section */}
        <div>
          <h2 className="text-lg font-bold text-errandify-brown mb-3">💳 Wallet & Payouts</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <button
              onClick={handlePayoutSetting}
              className="bg-white rounded-lg shadow-sm p-4 border-t-4 border-blue-600 hover:shadow-md transition text-left"
            >
              <p className="font-bold text-gray-800">🏦 Payout Settings</p>
              <p className="text-xs text-gray-600">Configure payouts</p>
            </button>
            <button
              onClick={handleTransactionHistory}
              className="bg-white rounded-lg shadow-sm p-4 border-t-4 border-indigo-600 hover:shadow-md transition text-left"
            >
              <p className="font-bold text-gray-800">📊 Transaction History</p>
              <p className="text-xs text-gray-600">View earnings</p>
            </button>
          </div>
        </div>

        {/* Notifications & Preferences Section */}
        <div>
          <h2 className="text-lg font-bold text-errandify-brown mb-3">⚙️ Preferences</h2>
          <div className="bg-white rounded-lg shadow-sm p-4 border-t-4 border-yellow-500 hover:shadow-md transition">
            <button
              onClick={handleNotificationPreferences}
              className="w-full text-left"
            >
              <p className="font-bold text-gray-800">🔔 Notifications</p>
              <p className="text-xs text-gray-600">Manage how you receive alerts</p>
            </button>
          </div>
        </div>

        {/* Rewards Section */}
        <div>
          <h2 className="text-lg font-bold text-errandify-brown mb-3">🎁 Rewards</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <button
              onClick={handleErrandifyPoints}
              className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg shadow-md p-4 hover:shadow-lg transition text-white"
            >
              <p className="font-bold">⭐ Errandify Points</p>
              <p className="text-xs opacity-90">View your points balance</p>
            </button>
            <button
              onClick={handleMyRewards}
              className="bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg shadow-md p-4 hover:shadow-lg transition text-white"
            >
              <p className="font-bold">💎 Redeem Rewards</p>
              <p className="text-xs opacity-90">Redeem your points</p>
            </button>
            <button
              onClick={handlePointsHistory}
              className="bg-white rounded-lg shadow-sm p-4 border-t-4 border-amber-500 hover:shadow-md transition text-left md:col-span-2"
            >
              <p className="font-bold text-gray-800">📈 Points History</p>
              <p className="text-xs text-gray-600">Track your earned points</p>
            </button>
          </div>
        </div>

        {/* Help Section */}
        <div>
          <h2 className="text-lg font-bold text-errandify-brown mb-3">ℹ️ Help & Support</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <button
              onClick={() => navigate('/how-it-works')}
              className="bg-white rounded-lg shadow-sm p-4 border-t-4 border-blue-400 hover:shadow-md transition text-left"
            >
              <p className="font-bold text-gray-800">🎯 How It Works</p>
              <p className="text-xs text-gray-600">Learn the basics</p>
            </button>
            <button
              onClick={() => navigate('/about')}
              className="bg-white rounded-lg shadow-sm p-4 border-t-4 border-orange-400 hover:shadow-md transition text-left"
            >
              <p className="font-bold text-gray-800">🏘️ About</p>
              <p className="text-xs text-gray-600">About Errandify</p>
            </button>
            <button
              onClick={() => navigate('/faq')}
              className="bg-white rounded-lg shadow-sm p-4 border-t-4 border-green-400 hover:shadow-md transition text-left"
            >
              <p className="font-bold text-gray-800">❓ FAQ</p>
              <p className="text-xs text-gray-600">Frequently asked</p>
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4">
          <button
            onClick={handleDeleteAccount}
            className="flex-1 bg-red-50 border-2 border-red-200 text-red-600 py-3 rounded-lg font-bold hover:bg-red-100 transition"
          >
            🗑️ Delete Account
          </button>
          <button
            onClick={handleLogout}
            className="flex-1 bg-gradient-to-r from-errandify-orange to-orange-500 text-white py-3 rounded-lg font-bold hover:shadow-lg transition"
          >
            🚪 Log Out
          </button>
        </div>
      </div>
    </div>
  );
}
