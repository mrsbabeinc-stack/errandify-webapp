import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

interface AccountData {
  name: string;
  email: string;
  mobile: string;
  role: 'asker' | 'doer';
  rating: number;
  reviewCount: number;
  completedTasks: number;
  totalEarnings: number;
  errandifyPoints: number;
  categories: string[];
  bio?: string;
}

export default function MyAccountPage() {
  const navigate = useNavigate();
  const [accountData, setAccountData] = useState<AccountData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'settings' | 'security' | 'wallet'>('overview');

  useEffect(() => {
    fetchAccountData();
  }, []);

  const fetchAccountData = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/users/profile`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setAccountData({
        name: response.data.data.name || '',
        email: response.data.data.email || '',
        mobile: response.data.data.mobile || '',
        role: response.data.data.role || 'asker',
        rating: response.data.data.rating || 0,
        reviewCount: response.data.data.reviewCount || 0,
        completedTasks: response.data.data.completedTasks || 0,
        totalEarnings: response.data.data.totalEarnings || 0,
        errandifyPoints: response.data.data.errandifyPoints || 0,
        categories: response.data.data.categories || [],
        bio: response.data.data.bio || '',
      });
    } catch (err) {
      console.error('Failed to fetch account data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to log out?')) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      navigate('/login');
    }
  };

  if (loading) {
    return <div className="p-6 text-center">Loading account...</div>;
  }

  if (!accountData) {
    return <div className="p-6 text-center text-red-600">Failed to load account</div>;
  }

  return (
    <div className="min-h-screen bg-errandify-bg pb-24">
      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="text-errandify-orange font-semibold mb-4 text-sm hover:underline"
        >
          ← Back
        </button>

        {/* Account Header - Striking Card */}
        <div className="bg-gradient-to-r from-errandify-orange via-orange-400 to-orange-500 rounded-xl shadow-xl p-6 mb-6 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-white opacity-5 rounded-full -mr-20 -mt-20"></div>

          <div className="relative z-10">
            <div className="flex items-center gap-4 mb-6">
              <div className="text-6xl">👤</div>
              <div className="flex-1">
                <h1 className="text-3xl font-bold mb-1">{accountData.name}</h1>
                <p className="text-orange-50 flex items-center gap-2">
                  {accountData.role === 'asker' ? '📍 Asker' : '💪 Doer'} •
                  <span className="ml-2">✅ Verified</span>
                </p>
              </div>
            </div>

            {/* Key Stats Row */}
            <div className="grid grid-cols-4 gap-3">
              <div className="bg-white bg-opacity-20 backdrop-blur rounded-lg p-3 text-center">
                <p className="text-2xl font-bold">{accountData.rating.toFixed(1)}</p>
                <p className="text-xs text-orange-50">Rating</p>
              </div>
              <div className="bg-white bg-opacity-20 backdrop-blur rounded-lg p-3 text-center">
                <p className="text-2xl font-bold">{accountData.reviewCount}</p>
                <p className="text-xs text-orange-50">Reviews</p>
              </div>
              <div className="bg-white bg-opacity-20 backdrop-blur rounded-lg p-3 text-center">
                <p className="text-2xl font-bold">{accountData.completedTasks}</p>
                <p className="text-xs text-orange-50">Tasks</p>
              </div>
              <div className="bg-white bg-opacity-20 backdrop-blur rounded-lg p-3 text-center">
                <p className="text-2xl font-bold">${accountData.totalEarnings}</p>
                <p className="text-xs text-orange-50">Earnings</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6 bg-white rounded-lg shadow p-1 border border-gray-200">
          {(['overview', 'settings', 'security', 'wallet'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 px-4 rounded-lg font-semibold text-sm transition ${
                activeTab === tab
                  ? 'bg-errandify-orange text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              {tab === 'overview' && '👁️ Overview'}
              {tab === 'settings' && '⚙️ Settings'}
              {tab === 'security' && '🔒 Security'}
              {tab === 'wallet' && '💰 Wallet'}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            {/* Profile Info Card */}
            <div className="bg-white rounded-lg shadow p-6 border-l-4 border-errandify-orange">
              <h2 className="text-lg font-bold text-errandify-brown mb-4 flex items-center gap-2">
                📋 Profile Information
              </h2>
              <div className="space-y-3">
                <div className="flex justify-between items-center pb-3 border-b">
                  <span className="text-gray-600">Email</span>
                  <span className="font-semibold text-gray-800">{accountData.email || 'Not provided'}</span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b">
                  <span className="text-gray-600">Mobile</span>
                  <span className="font-semibold text-gray-800">{accountData.mobile || 'Not provided'}</span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b">
                  <span className="text-gray-600">Role</span>
                  <span className="font-semibold text-errandify-orange capitalize">{accountData.role}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Account Status</span>
                  <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">Active</span>
                </div>
              </div>
              <button
                onClick={() => navigate('/my-profile')}
                className="w-full mt-4 bg-errandify-orange text-white py-2 rounded-lg font-semibold hover:bg-opacity-90 transition"
              >
                Edit Full Profile
              </button>
            </div>

            {/* Skills & Interests Card */}
            {accountData.categories.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
                <h2 className="text-lg font-bold text-errandify-brown mb-4 flex items-center gap-2">
                  🎯 Your Skills
                </h2>
                <div className="flex flex-wrap gap-2">
                  {accountData.categories.map(cat => (
                    <span key={cat} className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-semibold">
                      {cat}
                    </span>
                  ))}
                </div>
                <button
                  onClick={() => navigate('/category-preferences')}
                  className="w-full mt-4 border-2 border-blue-500 text-blue-600 py-2 rounded-lg font-semibold hover:bg-blue-50 transition"
                >
                  Manage Skills
                </button>
              </div>
            )}

            {/* Errandify Points Card */}
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200 rounded-lg p-6">
              <h2 className="text-lg font-bold text-purple-900 mb-2 flex items-center gap-2">
                ⭐ Errandify Points
              </h2>
              <p className="text-4xl font-bold text-purple-600 mb-4">{accountData.errandifyPoints.toLocaleString()} EP</p>
              <p className="text-sm text-gray-700 mb-4">Earn more points with completed tasks and referrals</p>
              <div className="flex gap-2">
                <button
                  onClick={() => navigate('/errandify-points')}
                  className="flex-1 bg-purple-600 text-white py-2 rounded-lg font-semibold hover:bg-purple-700 transition"
                >
                  View Details
                </button>
                <button
                  onClick={() => navigate('/my-rewards')}
                  className="flex-1 bg-pink-600 text-white py-2 rounded-lg font-semibold hover:bg-pink-700 transition"
                >
                  Redeem
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-4">
            {/* Preferences Card */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-bold text-errandify-brown mb-4">🎨 Preferences</h2>
              <div className="space-y-3">
                <button
                  onClick={() => navigate('/category-preferences')}
                  className="w-full flex items-center justify-between p-4 hover:bg-gray-50 rounded-lg border border-gray-200 transition"
                >
                  <span className="font-semibold text-gray-800">Category Preferences</span>
                  <span>→</span>
                </button>
                <button
                  onClick={() => navigate('/settings/notifications')}
                  className="w-full flex items-center justify-between p-4 hover:bg-gray-50 rounded-lg border border-gray-200 transition"
                >
                  <span className="font-semibold text-gray-800">Notification Settings</span>
                  <span>→</span>
                </button>
                <button
                  onClick={() => navigate('/settings/language')}
                  className="w-full flex items-center justify-between p-4 hover:bg-gray-50 rounded-lg border border-gray-200 transition"
                >
                  <span className="font-semibold text-gray-800">Language & Region</span>
                  <span>→</span>
                </button>
              </div>
            </div>

            {/* Community Card */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-bold text-errandify-brown mb-4">🤝 Community</h2>
              <div className="space-y-3">
                <button
                  onClick={() => navigate('/trusted-users')}
                  className="w-full flex items-center justify-between p-4 hover:bg-gray-50 rounded-lg border border-gray-200 transition"
                >
                  <div className="text-left">
                    <span className="font-semibold text-gray-800">Trusted Users</span>
                    <p className="text-xs text-gray-500">Mark users as trusted</p>
                  </div>
                  <span>→</span>
                </button>
                <button
                  onClick={() => navigate('/block-list')}
                  className="w-full flex items-center justify-between p-4 hover:bg-gray-50 rounded-lg border border-gray-200 transition"
                >
                  <div className="text-left">
                    <span className="font-semibold text-gray-800">Blocked Users</span>
                    <p className="text-xs text-gray-500">Manage your block list</p>
                  </div>
                  <span>→</span>
                </button>
              </div>
            </div>

            {/* Support Card */}
            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6">
              <h2 className="text-lg font-bold text-blue-900 mb-4">💬 Help & Support</h2>
              <div className="space-y-2 mb-4">
                <button
                  onClick={() => navigate('/faq')}
                  className="w-full text-left p-3 bg-blue-100 hover:bg-blue-200 rounded-lg transition text-sm font-semibold text-blue-900"
                >
                  📖 FAQ & Help Center
                </button>
                <a
                  href="mailto:togather@errandify.ai"
                  className="w-full text-left p-3 bg-blue-100 hover:bg-blue-200 rounded-lg transition text-sm font-semibold text-blue-900 block"
                >
                  📧 Contact Support
                </a>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'security' && (
          <div className="space-y-4">
            {/* Password Card */}
            <div className="bg-white rounded-lg shadow p-6 border-l-4 border-red-500">
              <h2 className="text-lg font-bold text-errandify-brown mb-4">🔐 Password</h2>
              <p className="text-gray-600 mb-4">Change your password to keep your account secure</p>
              <button
                onClick={() => navigate('/settings/change-password')}
                className="w-full bg-red-600 text-white py-2 rounded-lg font-semibold hover:bg-red-700 transition"
              >
                Change Password
              </button>
            </div>

            {/* Two-Factor Auth Card */}
            <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
              <h2 className="text-lg font-bold text-errandify-brown mb-4">🛡️ Two-Factor Authentication</h2>
              <p className="text-gray-600 mb-4">Add an extra layer of security to your account</p>
              <button
                onClick={() => navigate('/settings/2fa')}
                className="w-full bg-green-600 text-white py-2 rounded-lg font-semibold hover:bg-green-700 transition"
              >
                Set Up 2FA
              </button>
            </div>

            {/* Login Sessions Card */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-bold text-errandify-brown mb-4">📱 Active Sessions</h2>
              <p className="text-gray-600 mb-4">Manage devices and sessions where you're logged in</p>
              <button
                onClick={() => navigate('/settings/sessions')}
                className="w-full border-2 border-errandify-orange text-errandify-orange py-2 rounded-lg font-semibold hover:bg-orange-50 transition"
              >
                Manage Sessions
              </button>
            </div>

            {/* Danger Zone */}
            <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6">
              <h2 className="text-lg font-bold text-red-900 mb-4">⚠️ Danger Zone</h2>
              <p className="text-sm text-red-800 mb-4">Permanent actions that cannot be undone</p>
              <button
                onClick={() => {
                  if (window.confirm('Are you sure? This action cannot be undone.')) {
                    navigate('/delete-account');
                  }
                }}
                className="w-full bg-red-600 text-white py-2 rounded-lg font-semibold hover:bg-red-700 transition"
              >
                Delete Account
              </button>
            </div>
          </div>
        )}

        {activeTab === 'wallet' && (
          <div className="space-y-4">
            {/* Earnings Card */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-lg p-6">
              <h2 className="text-lg font-bold text-green-900 mb-2">💚 Total Earnings</h2>
              <p className="text-4xl font-bold text-green-600 mb-2">${accountData.totalEarnings.toLocaleString()}</p>
              <p className="text-sm text-green-800 mb-4">All-time earnings from completed tasks</p>
              <button
                onClick={() => navigate('/transaction-history')}
                className="w-full bg-green-600 text-white py-2 rounded-lg font-semibold hover:bg-green-700 transition"
              >
                View Transaction History
              </button>
            </div>

            {/* Payout Settings Card */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-bold text-errandify-brown mb-4">🏦 Payout Settings</h2>
              <p className="text-gray-600 mb-4">Configure where and how you receive payments</p>
              <button
                onClick={() => navigate('/payout-settings')}
                className="w-full bg-errandify-orange text-white py-2 rounded-lg font-semibold hover:bg-opacity-90 transition"
              >
                Configure Payouts
              </button>
            </div>

            {/* Billing & Payments Card */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-bold text-errandify-brown mb-4">💳 Billing & Payments</h2>
              <div className="space-y-2 mb-4 text-sm text-gray-700">
                <p>✅ Accepted: Credit/Debit Cards, PayNow, Bank Transfers</p>
                <p>📅 Payouts: Every Friday to your registered account</p>
                <p>💰 Platform fee: 20% (deducted from earnings)</p>
              </div>
              <button
                onClick={() => navigate('/payment-methods')}
                className="w-full border-2 border-errandify-orange text-errandify-orange py-2 rounded-lg font-semibold hover:bg-orange-50 transition"
              >
                Manage Payment Methods
              </button>
            </div>

            {/* Referral Card */}
            <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-6">
              <h2 className="text-lg font-bold text-purple-900 mb-2">🎁 Referral Earnings</h2>
              <p className="text-gray-700 mb-4">Earn extra by referring friends to Errandify</p>
              <button
                onClick={() => navigate('/referral')}
                className="w-full bg-purple-600 text-white py-2 rounded-lg font-semibold hover:bg-purple-700 transition"
              >
                View Referral Program
              </button>
            </div>
          </div>
        )}

        {/* Logout Button - Always Visible */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <button
            onClick={handleLogout}
            className="w-full bg-gray-200 text-gray-800 py-3 rounded-lg font-semibold hover:bg-gray-300 transition text-lg"
          >
            🚪 Log Out
          </button>
        </div>
      </div>
    </div>
  );
}
