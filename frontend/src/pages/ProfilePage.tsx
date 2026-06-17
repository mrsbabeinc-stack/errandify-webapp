import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface ProfilePageProps {
  userRole: 'asker' | 'doer';
}

export default function ProfilePage({ userRole }: ProfilePageProps) {
  const navigate = useNavigate();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <div className="px-4 py-4 max-w-3xl mx-auto">
      <h1 className="text-lg font-bold text-errandify-brown mb-2">Profile</h1>
      <p className="text-xs text-gray-600 mb-4">
        Manage your account and preferences
      </p>

      {/* MyAccount Section */}
      <div className="mb-6">
        <h2 className="text-sm font-bold text-errandify-brown mb-3 flex items-center gap-2">
          <span>👤</span>
          <span>My Account</span>
        </h2>
        <div className="space-y-2">
          {/* View Profile */}
          <button className="w-full bg-white rounded-lg p-3 shadow-sm flex items-center justify-between hover:bg-gray-50 transition-colors border border-gray-100">
            <div className="flex items-center gap-2 text-left">
              <span className="text-lg">✏️</span>
              <span className="text-sm font-medium text-gray-700">View Profile</span>
            </div>
            <span className="text-gray-400">›</span>
          </button>

          {/* Referral */}
          <button className="w-full bg-white rounded-lg p-3 shadow-sm flex items-center justify-between hover:bg-gray-50 transition-colors border border-gray-100">
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
          <button className="w-full bg-white rounded-lg p-3 shadow-sm flex items-center justify-between hover:bg-gray-50 transition-colors border border-gray-100">
            <div className="flex items-center gap-2 text-left">
              <span className="text-lg">❤️</span>
              <span className="text-sm font-medium text-gray-700">Trusted Users</span>
            </div>
            <span className="text-gray-400">›</span>
          </button>

          {/* Block List */}
          <button className="w-full bg-white rounded-lg p-3 shadow-sm flex items-center justify-between hover:bg-gray-50 transition-colors border border-gray-100">
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
          <button className="w-full bg-white rounded-lg p-3 shadow-sm flex items-center justify-between hover:bg-gray-50 transition-colors border border-gray-100">
            <div className="flex items-center gap-2 text-left">
              <span className="text-lg">💳</span>
              <span className="text-sm font-medium text-gray-700">Payout Setting</span>
            </div>
            <span className="text-gray-400">›</span>
          </button>

          {/* Transaction History */}
          <button className="w-full bg-white rounded-lg p-3 shadow-sm flex items-center justify-between hover:bg-gray-50 transition-colors border border-gray-100">
            <div className="flex items-center gap-2 text-left">
              <span className="text-lg">📊</span>
              <span className="text-sm font-medium text-gray-700">Transaction History</span>
            </div>
            <span className="text-gray-400">›</span>
          </button>

          {/* Errand Notifications */}
          <div className="w-full bg-white rounded-lg p-3 shadow-sm flex items-center justify-between border border-gray-100">
            <div className="flex items-center gap-2 text-left">
              <span className="text-lg">🔔</span>
              <span className="text-sm font-medium text-gray-700">Errand Notifications</span>
            </div>
            <button
              onClick={() => setNotificationsEnabled(!notificationsEnabled)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                notificationsEnabled ? 'bg-errandify-orange' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  notificationsEnabled ? 'translate-x-4' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
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
          <button className="w-full bg-white rounded-lg p-3 shadow-sm flex items-center justify-between hover:bg-gray-50 transition-colors border border-gray-100">
            <div className="flex items-center gap-2 text-left">
              <span className="text-lg">⭐</span>
              <span className="text-sm font-medium text-gray-700">Errandify Points</span>
            </div>
            <span className="text-errandify-orange font-bold text-sm">20 EP</span>
          </button>

          {/* MyRewards */}
          <button className="w-full bg-white rounded-lg p-3 shadow-sm flex items-center justify-between hover:bg-gray-50 transition-colors border border-gray-100">
            <div className="flex items-center gap-2 text-left">
              <span className="text-lg">💎</span>
              <span className="text-sm font-medium text-gray-700">MyRewards</span>
            </div>
            <span className="text-gray-400">›</span>
          </button>

          {/* Point Transaction History */}
          <button className="w-full bg-white rounded-lg p-3 shadow-sm flex items-center justify-between hover:bg-gray-50 transition-colors border border-gray-100">
            <div className="flex items-center gap-2 text-left">
              <span className="text-lg">📈</span>
              <span className="text-sm font-medium text-gray-700">Point Transaction History</span>
            </div>
            <span className="text-gray-400">›</span>
          </button>
        </div>
      </div>

      {/* Delete Account */}
      <div className="mb-4">
        <button className="text-xs font-medium text-red-600 hover:text-red-700">
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
