import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface ProfilePageProps {
  userRole: 'asker' | 'doer';
  onLogout?: () => void;
}

export default function ProfilePage({ userRole, onLogout }: ProfilePageProps) {
  const navigate = useNavigate();

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
  const handleTrustedUsers = () => navigate('/my-kampung');
  const handleBlockList = () => navigate('/my-kampung');
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
    <div className="px-4 py-4 max-w-3xl mx-auto">
      {/* MyAccount Section */}
      <div className="mb-6">
        <h2 className="text-sm font-bold text-errandify-brown mb-3 flex items-center gap-2">
          <span>👤</span>
          <span>MyAccount</span>
        </h2>
        <div className="space-y-2">
          {/* View Profile */}
          <button onClick={handleViewProfile} className="w-full bg-white rounded-lg p-3 shadow-sm flex items-center justify-between hover:bg-gray-50 transition-colors border border-gray-100">
            <div className="flex items-center gap-2 text-left">
              <span className="text-lg">👁️</span>
              <span className="text-sm font-medium text-gray-700">View Profile</span>
            </div>
            <span className="text-gray-400">›</span>
          </button>

          {/* Edit Profile */}
          <button onClick={handleEditProfile} className="w-full bg-white rounded-lg p-3 shadow-sm flex items-center justify-between hover:bg-gray-50 transition-colors border border-gray-100">
            <div className="flex items-center gap-2 text-left">
              <span className="text-lg">✏️</span>
              <span className="text-sm font-medium text-gray-700">Edit Profile</span>
            </div>
            <span className="text-gray-400">›</span>
          </button>

          {/* Referral */}
          <button onClick={handleReferral} className="w-full bg-white rounded-lg p-3 shadow-sm flex items-center justify-between hover:bg-gray-50 transition-colors border border-gray-100">
            <div className="flex items-center gap-2 text-left">
              <span className="text-lg">🔗</span>
              <span className="text-sm font-medium text-gray-700">Referral</span>
            </div>
            <span className="text-gray-400">›</span>
          </button>
        </div>
      </div>

      {/* Preferences Section */}
      <div className="mb-6">
        <h2 className="text-sm font-bold text-errandify-brown mb-3 flex items-center gap-2">
          <span>⚙️</span>
          <span>Preferences</span>
        </h2>
        <div className="space-y-2">
          {/* Trusted Users */}
          <button onClick={handleTrustedUsers} className="w-full bg-white rounded-lg p-3 shadow-sm flex items-center justify-between hover:bg-gray-50 transition-colors border border-gray-100">
            <div className="flex items-center gap-2 text-left">
              <span className="text-lg">❤️</span>
              <span className="text-sm font-medium text-gray-700">Trusted Users</span>
            </div>
            <span className="text-gray-400">›</span>
          </button>

          {/* Block List */}
          <button onClick={handleBlockList} className="w-full bg-white rounded-lg p-3 shadow-sm flex items-center justify-between hover:bg-gray-50 transition-colors border border-gray-100">
            <div className="flex items-center gap-2 text-left">
              <span className="text-lg">🚫</span>
              <span className="text-sm font-medium text-gray-700">Block List</span>
            </div>
            <span className="text-gray-400">›</span>
          </button>
        </div>
      </div>

      {/* MyPocket Section */}
      <div className="mb-6">
        <h2 className="text-sm font-bold text-errandify-brown mb-3 flex items-center gap-2">
          <span>💼</span>
          <span>MyPocket</span>
        </h2>
        <div className="space-y-2">
          {/* Payout Setting */}
          <button onClick={handlePayoutSetting} className="w-full bg-white rounded-lg p-3 shadow-sm flex items-center justify-between hover:bg-gray-50 transition-colors border border-gray-100">
            <div className="flex items-center gap-2 text-left">
              <span className="text-lg">💳</span>
              <span className="text-sm font-medium text-gray-700">Payout Setting</span>
            </div>
            <span className="text-gray-400">›</span>
          </button>

          {/* Transaction History */}
          <button onClick={handleTransactionHistory} className="w-full bg-white rounded-lg p-3 shadow-sm flex items-center justify-between hover:bg-gray-50 transition-colors border border-gray-100">
            <div className="flex items-center gap-2 text-left">
              <span className="text-lg">📊</span>
              <span className="text-sm font-medium text-gray-700">Transaction History</span>
            </div>
            <span className="text-gray-400">›</span>
          </button>

          {/* Notification Preferences */}
          <button onClick={handleNotificationPreferences} className="w-full bg-white rounded-lg p-3 shadow-sm flex items-center justify-between hover:bg-gray-50 transition-colors border border-gray-100">
            <div className="flex items-center gap-2 text-left">
              <span className="text-lg">🔔</span>
              <span className="text-sm font-medium text-gray-700">Notification Preferences</span>
            </div>
            <span className="text-gray-400">›</span>
          </button>

          {/* Category Preferences */}
          <button onClick={handleCategoryPreferences} className="w-full bg-white rounded-lg p-3 shadow-sm flex items-center justify-between hover:bg-gray-50 transition-colors border border-gray-100">
            <div className="flex items-center gap-2 text-left">
              <span className="text-lg">🎯</span>
              <span className="text-sm font-medium text-gray-700">Task Preferences (For AI Recommendations)</span>
            </div>
            <span className="text-gray-400">›</span>
          </button>
        </div>
      </div>

      {/* MyRewardSpace Section */}
      <div className="mb-6">
        <h2 className="text-sm font-bold text-errandify-brown mb-3 flex items-center gap-2">
          <span>🎁</span>
          <span>MyRewardSpace</span>
        </h2>
        <div className="space-y-2">
          {/* Errandify Points */}
          <button onClick={handleErrandifyPoints} className="w-full bg-white rounded-lg p-3 shadow-sm flex items-center justify-between hover:bg-gray-50 transition-colors border border-gray-100">
            <div className="flex items-center gap-2 text-left">
              <span className="text-lg">⭐</span>
              <span className="text-sm font-medium text-gray-700">Errandify Points</span>
            </div>
            <span className="text-errandify-orange font-bold text-sm">20 EP</span>
          </button>

          {/* MyRewards */}
          <button onClick={handleMyRewards} className="w-full bg-white rounded-lg p-3 shadow-sm flex items-center justify-between hover:bg-gray-50 transition-colors border border-gray-100">
            <div className="flex items-center gap-2 text-left">
              <span className="text-lg">💎</span>
              <span className="text-sm font-medium text-gray-700">MyRewards</span>
            </div>
            <span className="text-gray-400">›</span>
          </button>

          {/* Point Transaction History */}
          <button onClick={handlePointsHistory} className="w-full bg-white rounded-lg p-3 shadow-sm flex items-center justify-between hover:bg-gray-50 transition-colors border border-gray-100">
            <div className="flex items-center gap-2 text-left">
              <span className="text-lg">📈</span>
              <span className="text-sm font-medium text-gray-700">Point Transaction History</span>
            </div>
            <span className="text-gray-400">›</span>
          </button>
        </div>
      </div>

      {/* Help & Info Section */}
      <div className="mb-6">
        <h2 className="text-sm font-bold text-errandify-brown mb-3 flex items-center gap-2">
          <span>ℹ️</span>
          <span>Help & Information</span>
        </h2>
        <div className="space-y-2">
          {/* About */}
          <button onClick={() => navigate('/how-it-works')} className="w-full bg-white rounded-lg p-3 shadow-sm flex items-center justify-between hover:bg-gray-50 transition-colors border border-gray-100">
            <div className="flex items-center gap-2 text-left">
              <span className="text-lg">🎯</span>
              <span className="text-sm font-medium text-gray-700">How It Works</span>
            </div>
            <span className="text-gray-400">›</span>
          </button>

          <button onClick={() => navigate('/about')} className="w-full bg-white rounded-lg p-3 shadow-sm flex items-center justify-between hover:bg-gray-50 transition-colors border border-gray-100">
            <div className="flex items-center gap-2 text-left">
              <span className="text-lg">🏘️</span>
              <span className="text-sm font-medium text-gray-700">About Errandify</span>
            </div>
            <span className="text-gray-400">›</span>
          </button>

          {/* FAQ */}
          <button onClick={() => navigate('/faq')} className="w-full bg-white rounded-lg p-3 shadow-sm flex items-center justify-between hover:bg-gray-50 transition-colors border border-gray-100">
            <div className="flex items-center gap-2 text-left">
              <span className="text-lg">❓</span>
              <span className="text-sm font-medium text-gray-700">FAQ</span>
            </div>
            <span className="text-gray-400">›</span>
          </button>
        </div>
      </div>

      {/* Delete Account */}
      <div className="mb-4">
        <button onClick={handleDeleteAccount} className="text-xs font-medium text-red-600 hover:text-red-700">
          Delete Account
        </button>
      </div>

      {/* Log Out Button */}
      <button
        onClick={handleLogout}
        className="w-full bg-white text-errandify-orange py-3 rounded-xl font-bold hover:bg-gray-50 transition-colors border-2 border-errandify-orange text-base"
      >
        Log Out
      </button>

      {/* Bottom Spacing */}
      <div className="h-8"></div>
    </div>
  );
}
