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
      onLogout(); // Call parent logout to update App state
    } else {
      navigate('/login'); // Fallback if no parent handler
    }
  };

  // Navigation handlers for profile sections
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
    <div className="px-2 py-2 max-w-2xl mx-auto pb-24">
      {/* Profile Header */}
      {!loading && userProfile && (
        <div className="mb-2 bg-gradient-to-r from-errandify-orange to-orange-400 rounded-lg p-2 text-white shadow-md">
          <div className="flex items-center gap-2">
            <div className="flex-shrink-0">
              {userProfile.profileImage ? (
                <img
                  src={userProfile.profileImage}
                  alt={userProfile.displayName}
                  className="w-12 h-12 rounded-full object-cover border-2 border-white"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-white bg-opacity-30 flex items-center justify-center border-2 border-white text-xl">
                  👤
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm">{userProfile.displayName}</p>
              {userProfile.averageRating && (
                <p className="text-xs opacity-90">⭐ {userProfile.averageRating.toFixed(1)}</p>
              )}
            </div>
            <button
              onClick={handleEditProfile}
              className="px-2 py-1 bg-white text-errandify-orange rounded text-xs font-bold whitespace-nowrap"
            >
              ✏️
            </button>
          </div>
        </div>
      )}

      {/* MyAccount Section */}
      <div className="mb-2">
        <h2 className="text-xs font-bold text-errandify-brown mb-1">👤 MyAccount</h2>
        <div className="space-y-0 divide-y divide-gray-100">
          <button onClick={handleViewProfile} className="w-full p-2 flex items-center justify-between hover:bg-gray-50 text-xs">
            <span>👁️ View Profile</span>
            <span className="text-gray-400">›</span>
          </button>
          <button onClick={handleEditProfile} className="w-full p-2 flex items-center justify-between hover:bg-gray-50 text-xs">
            <span>✏️ Edit Profile</span>
            <span className="text-gray-400">›</span>
          </button>
          <button onClick={handleReferral} className="w-full p-2 flex items-center justify-between hover:bg-gray-50 text-xs">
            <span>🔗 Referral</span>
            <span className="text-gray-400">›</span>
          </button>
        </div>
      </div>

      {/* Preferences Section */}
      <div className="mb-2">
        <h2 className="text-xs font-bold text-errandify-brown mb-1">⚙️ Preferences</h2>
        <div className="space-y-0 divide-y divide-gray-100">
          <button onClick={handleTrustedUsers} className="w-full p-2 flex items-center justify-between hover:bg-gray-50 text-xs">
            <span>❤️ Trusted Users</span>
            <span className="text-gray-400">›</span>
          </button>
          <button onClick={handleBlockList} className="w-full p-2 flex items-center justify-between hover:bg-gray-50 text-xs">
            <span>🚫 Block List</span>
            <span className="text-gray-400">›</span>
          </button>
        </div>
      </div>

      {/* MyPocket Section */}
      <div className="mb-2">
        <h2 className="text-xs font-bold text-errandify-brown mb-1">💼 MyPocket</h2>
        <div className="space-y-0 divide-y divide-gray-100">
          <button onClick={handlePayoutSetting} className="w-full p-2 flex items-center justify-between hover:bg-gray-50 text-xs">
            <span>💳 Payout</span>
            <span className="text-gray-400">›</span>
          </button>
          <button onClick={handleTransactionHistory} className="w-full p-2 flex items-center justify-between hover:bg-gray-50 text-xs">
            <span>📊 Txn History</span>
            <span className="text-gray-400">›</span>
          </button>
          <button onClick={handleNotificationPreferences} className="w-full p-2 flex items-center justify-between hover:bg-gray-50 text-xs">
            <span>🔔 Notifications</span>
            <span className="text-gray-400">›</span>
          </button>
          <button onClick={handleCategoryPreferences} className="w-full p-2 flex items-center justify-between hover:bg-gray-50 text-xs">
            <span>🎯 Preferences</span>
            <span className="text-gray-400">›</span>
          </button>
        </div>
      </div>

      {/* MyRewardSpace Section */}
      <div className="mb-2">
        <h2 className="text-xs font-bold text-errandify-brown mb-1">🎁 Rewards</h2>
        <div className="space-y-0 divide-y divide-gray-100">
          <button onClick={handleErrandifyPoints} className="w-full p-2 flex items-center justify-between hover:bg-gray-50 text-xs">
            <span>⭐ Points</span>
            <span className="text-errandify-orange font-bold text-xs">20 EP</span>
          </button>
          <button onClick={handleMyRewards} className="w-full p-2 flex items-center justify-between hover:bg-gray-50 text-xs">
            <span>💎 Redeem</span>
            <span className="text-gray-400">›</span>
          </button>
          <button onClick={handlePointsHistory} className="w-full p-2 flex items-center justify-between hover:bg-gray-50 text-xs">
            <span>📈 History</span>
            <span className="text-gray-400">›</span>
          </button>
        </div>
      </div>

      {/* Help & Info Section */}
      <div className="mb-2">
        <h2 className="text-xs font-bold text-errandify-brown mb-1">ℹ️ Help</h2>
        <div className="space-y-0 divide-y divide-gray-100">
          <button onClick={() => navigate('/how-it-works')} className="w-full p-2 flex items-center justify-between hover:bg-gray-50 text-xs">
            <span>🎯 How It Works</span>
            <span className="text-gray-400">›</span>
          </button>
          <button onClick={() => navigate('/about')} className="w-full p-2 flex items-center justify-between hover:bg-gray-50 text-xs">
            <span>🏘️ About</span>
            <span className="text-gray-400">›</span>
          </button>
          <button onClick={() => navigate('/faq')} className="w-full p-2 flex items-center justify-between hover:bg-gray-50 text-xs">
            <span>❓ FAQ</span>
            <span className="text-gray-400">›</span>
          </button>
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="flex gap-2 mt-2">
        <button onClick={handleDeleteAccount} className="flex-1 text-xs font-medium text-red-600 hover:text-red-700 py-2 bg-red-50 rounded hover:bg-red-100">
          🗑️ Delete
        </button>
        <button
          onClick={handleLogout}
          className="flex-1 bg-errandify-orange text-white py-2 rounded font-bold text-xs hover:bg-opacity-90"
        >
          Log Out
        </button>
      </div>
    </div>
  );
}
