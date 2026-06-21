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

type MenuSection = 'profile' | 'preferences' | 'community' | 'wallet' | 'security' | 'help';

export default function MyAccountPage() {
  const navigate = useNavigate();
  const [accountData, setAccountData] = useState<AccountData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<MenuSection>('profile');

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

  const menuItems = [
    { id: 'profile', label: '👤 Profile', icon: '👤' },
    { id: 'preferences', label: '🎨 Preferences', icon: '🎨' },
    { id: 'community', label: '🤝 Community', icon: '🤝' },
    { id: 'wallet', label: '💰 Wallet', icon: '💰' },
    { id: 'security', label: '🔒 Security', icon: '🔒' },
    { id: 'help', label: '💬 Help', icon: '💬' },
  ];

  return (
    <div className="min-h-screen bg-errandify-bg flex pb-24">
      {/* LEFT SIDEBAR - MENU */}
      <div className="w-64 bg-white shadow-lg p-4 space-y-3 fixed left-0 top-0 h-screen overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-errandify-orange to-orange-400 rounded-lg p-4 text-white mb-4">
          <p className="text-sm font-bold opacity-90">Welcome back</p>
          <p className="text-lg font-bold">{accountData.name}</p>
          <p className="text-xs opacity-75">{accountData.role === 'asker' ? '📍 Asker' : '💪 Doer'}</p>
        </div>

        {/* Quick Stats */}
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
          <div className="grid grid-cols-2 gap-2 text-center text-sm">
            <div>
              <p className="font-bold text-errandify-orange">{accountData.rating.toFixed(1)}</p>
              <p className="text-xs text-gray-600">⭐ Rating</p>
            </div>
            <div>
              <p className="font-bold text-errandify-orange">{accountData.reviewCount}</p>
              <p className="text-xs text-gray-600">👥 Reviews</p>
            </div>
          </div>
        </div>

        {/* Menu Items */}
        <div className="space-y-2 pt-2 border-t border-gray-200">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id as MenuSection)}
              className={`w-full text-left px-4 py-3 rounded-lg font-semibold transition-all ${
                activeSection === item.id
                  ? 'bg-errandify-orange text-white shadow-md'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <span className="text-lg mr-2">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>

        {/* Logout Button */}
        <div className="pt-4 border-t border-gray-200">
          <button
            onClick={handleLogout}
            className="w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg font-semibold transition text-sm"
          >
            🚪 Log Out
          </button>
        </div>
      </div>

      {/* RIGHT CONTENT AREA */}
      <div className="flex-1 ml-64 px-6 py-6">
        {/* PROFILE SECTION */}
        {activeSection === 'profile' && (
          <div className="space-y-4 max-w-2xl">
            <h1 className="text-3xl font-bold text-errandify-brown mb-6">👤 Profile Information</h1>

            {/* Profile Card */}
            <div className="bg-white rounded-lg shadow p-6 border-l-4 border-errandify-orange">
              <h2 className="text-xl font-bold text-errandify-brown mb-4">Account Details</h2>
              <div className="space-y-4">
                <div className="flex justify-between items-center py-3 border-b">
                  <span className="text-gray-600 font-semibold">Email</span>
                  <span className="text-gray-800">{accountData.email || 'Not provided'}</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b">
                  <span className="text-gray-600 font-semibold">Mobile</span>
                  <span className="text-gray-800">{accountData.mobile || 'Not provided'}</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b">
                  <span className="text-gray-600 font-semibold">Role</span>
                  <span className="text-errandify-orange font-bold capitalize">{accountData.role}</span>
                </div>
                <div className="flex justify-between items-center py-3">
                  <span className="text-gray-600 font-semibold">Status</span>
                  <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">Active</span>
                </div>
              </div>
              <button
                onClick={() => navigate('/my-profile')}
                className="w-full mt-6 bg-errandify-orange text-white py-2 rounded-lg font-semibold hover:bg-opacity-90 transition"
              >
                ✏️ Edit Full Profile
              </button>
            </div>

            {/* Skills Card */}
            {accountData.categories.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
                <h2 className="text-xl font-bold text-errandify-brown mb-4">🎯 Your Skills ({accountData.categories.length})</h2>
                <div className="flex flex-wrap gap-2 mb-4">
                  {accountData.categories.map(cat => (
                    <span key={cat} className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-semibold">
                      {cat}
                    </span>
                  ))}
                </div>
                <button
                  onClick={() => navigate('/category-preferences')}
                  className="w-full border-2 border-blue-500 text-blue-600 py-2 rounded-lg font-semibold hover:bg-blue-50 transition"
                >
                  🔧 Manage Skills
                </button>
              </div>
            )}

            {/* Points Card */}
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200 rounded-lg p-6 shadow">
              <h2 className="text-xl font-bold text-purple-900 mb-2">⭐ Errandify Points</h2>
              <p className="text-4xl font-bold text-purple-600 mb-2">{accountData.errandifyPoints.toLocaleString()} EP</p>
              <p className="text-sm text-gray-700 mb-4">Earn more points with completed tasks and referrals</p>
              <div className="flex gap-2">
                <button
                  onClick={() => navigate('/errandify-points')}
                  className="flex-1 bg-purple-600 text-white py-2 rounded-lg font-semibold hover:bg-purple-700 transition"
                >
                  📊 Details
                </button>
                <button
                  onClick={() => navigate('/my-rewards')}
                  className="flex-1 bg-pink-600 text-white py-2 rounded-lg font-semibold hover:bg-pink-700 transition"
                >
                  🎁 Redeem
                </button>
              </div>
            </div>
          </div>
        )}

        {/* PREFERENCES SECTION */}
        {activeSection === 'preferences' && (
          <div className="space-y-4 max-w-2xl">
            <h1 className="text-3xl font-bold text-errandify-brown mb-6">🎨 Preferences</h1>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="space-y-3">
                <button
                  onClick={() => navigate('/category-preferences')}
                  className="w-full flex items-center justify-between p-4 hover:bg-gray-50 rounded-lg border border-gray-200 transition"
                >
                  <span className="font-semibold text-gray-800">🎯 Category Preferences</span>
                  <span>→</span>
                </button>
                <button
                  onClick={() => navigate('/settings/notifications')}
                  className="w-full flex items-center justify-between p-4 hover:bg-gray-50 rounded-lg border border-gray-200 transition"
                >
                  <span className="font-semibold text-gray-800">🔔 Notification Settings</span>
                  <span>→</span>
                </button>
                <button
                  onClick={() => navigate('/settings/language')}
                  className="w-full flex items-center justify-between p-4 hover:bg-gray-50 rounded-lg border border-gray-200 transition"
                >
                  <span className="font-semibold text-gray-800">🌍 Language & Region</span>
                  <span>→</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* COMMUNITY SECTION */}
        {activeSection === 'community' && (
          <div className="space-y-4 max-w-2xl">
            <h1 className="text-3xl font-bold text-errandify-brown mb-6">🤝 Community</h1>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="space-y-3">
                <button
                  onClick={() => navigate('/trusted-users')}
                  className="w-full flex items-center justify-between p-4 hover:bg-gray-50 rounded-lg border border-gray-200 transition"
                >
                  <div className="text-left">
                    <span className="font-semibold text-gray-800">❤️ Trusted Users</span>
                    <p className="text-xs text-gray-500">Mark users as trusted</p>
                  </div>
                  <span>→</span>
                </button>
                <button
                  onClick={() => navigate('/block-list')}
                  className="w-full flex items-center justify-between p-4 hover:bg-gray-50 rounded-lg border border-gray-200 transition"
                >
                  <div className="text-left">
                    <span className="font-semibold text-gray-800">🚫 Blocked Users</span>
                    <p className="text-xs text-gray-500">Manage your block list</p>
                  </div>
                  <span>→</span>
                </button>
                <button
                  onClick={() => navigate('/referral')}
                  className="w-full flex items-center justify-between p-4 hover:bg-gray-50 rounded-lg border border-gray-200 transition"
                >
                  <div className="text-left">
                    <span className="font-semibold text-gray-800">🎁 Referral Program</span>
                    <p className="text-xs text-gray-500">Earn by inviting friends</p>
                  </div>
                  <span>→</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* WALLET SECTION */}
        {activeSection === 'wallet' && (
          <div className="space-y-4 max-w-2xl">
            <h1 className="text-3xl font-bold text-errandify-brown mb-6">💰 Wallet & Payments</h1>

            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-lg p-6 shadow">
              <p className="text-sm text-gray-600 mb-2">Total Earnings</p>
              <p className="text-4xl font-bold text-green-600 mb-4">${accountData.totalEarnings.toLocaleString()}</p>
              <p className="text-sm text-green-800 mb-4">All-time earnings from completed tasks</p>
              <button
                onClick={() => navigate('/transaction-history')}
                className="w-full bg-green-600 text-white py-2 rounded-lg font-semibold hover:bg-green-700 transition"
              >
                📊 View Transaction History
              </button>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold text-errandify-brown mb-4">Payment Options</h2>
              <div className="space-y-3">
                <button
                  onClick={() => navigate('/payout-settings')}
                  className="w-full flex items-center justify-between p-4 hover:bg-gray-50 rounded-lg border border-gray-200 transition"
                >
                  <span className="font-semibold text-gray-800">🏦 Payout Settings</span>
                  <span>→</span>
                </button>
                <button
                  onClick={() => navigate('/payment-methods')}
                  className="w-full flex items-center justify-between p-4 hover:bg-gray-50 rounded-lg border border-gray-200 transition"
                >
                  <span className="font-semibold text-gray-800">💳 Payment Methods</span>
                  <span>→</span>
                </button>
              </div>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
              <h2 className="font-bold text-gray-800 mb-3">Payment Information</h2>
              <div className="space-y-2 text-sm text-gray-700">
                <p>✅ <strong>Payouts:</strong> Every Friday</p>
                <p>✅ <strong>Platform Fee:</strong> 20% (deducted from earnings)</p>
                <p>✅ <strong>Methods Accepted:</strong> Credit/Debit Cards, PayNow, Bank Transfer</p>
              </div>
            </div>
          </div>
        )}

        {/* SECURITY SECTION */}
        {activeSection === 'security' && (
          <div className="space-y-4 max-w-2xl">
            <h1 className="text-3xl font-bold text-errandify-brown mb-6">🔒 Security</h1>

            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold text-errandify-brown mb-4">Security Settings</h2>
              <div className="space-y-3">
                <button
                  onClick={() => navigate('/settings/change-password')}
                  className="w-full bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 py-3 rounded-lg font-semibold transition"
                >
                  🔐 Change Password
                </button>
                <button
                  onClick={() => navigate('/settings/2fa')}
                  className="w-full bg-green-50 hover:bg-green-100 border border-green-200 text-green-700 py-3 rounded-lg font-semibold transition"
                >
                  🛡️ Two-Factor Authentication
                </button>
                <button
                  onClick={() => navigate('/settings/sessions')}
                  className="w-full bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 py-3 rounded-lg font-semibold transition"
                >
                  📱 Active Sessions
                </button>
              </div>
            </div>

            <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6 shadow">
              <h2 className="text-xl font-bold text-red-900 mb-3">⚠️ Danger Zone</h2>
              <p className="text-sm text-red-800 mb-4">Permanent actions that cannot be undone</p>
              <button
                onClick={() => {
                  if (window.confirm('Are you sure? This action cannot be undone.')) {
                    navigate('/delete-account');
                  }
                }}
                className="w-full bg-red-600 text-white py-2 rounded-lg font-semibold hover:bg-red-700 transition"
              >
                🗑️ Delete Account
              </button>
            </div>
          </div>
        )}

        {/* HELP SECTION */}
        {activeSection === 'help' && (
          <div className="space-y-4 max-w-2xl">
            <h1 className="text-3xl font-bold text-errandify-brown mb-6">💬 Help & Support</h1>

            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6 shadow">
              <h2 className="text-xl font-bold text-blue-900 mb-4">Need Help?</h2>
              <div className="space-y-3">
                <button
                  onClick={() => navigate('/faq')}
                  className="w-full bg-blue-100 hover:bg-blue-200 text-blue-900 py-3 rounded-lg font-semibold transition"
                >
                  📖 FAQ & Help Center
                </button>
                <a
                  href="mailto:togather@errandify.ai"
                  className="w-full bg-blue-100 hover:bg-blue-200 text-blue-900 py-3 rounded-lg font-semibold transition block text-center"
                >
                  📧 Contact Support
                </a>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold text-errandify-brown mb-4">Support Information</h2>
              <div className="space-y-3 text-gray-700">
                <div>
                  <p className="font-semibold">📧 Email</p>
                  <p className="text-sm">togather@errandify.ai</p>
                </div>
                <div>
                  <p className="font-semibold">⏰ Response Time</p>
                  <p className="text-sm">Usually within 24-48 hours</p>
                </div>
                <div>
                  <p className="font-semibold">📞 Support Hours</p>
                  <p className="text-sm">Available 24/7 for urgent issues</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
