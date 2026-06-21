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
    { id: 'profile', label: 'Profile', icon: '👤' },
    { id: 'preferences', label: 'Preferences', icon: '🎨' },
    { id: 'community', label: 'Community', icon: '🤝' },
    { id: 'wallet', label: 'Wallet', icon: '💰' },
    { id: 'security', label: 'Security', icon: '🔒' },
    { id: 'help', label: 'Help', icon: '💬' },
  ];

  return (
    <div className="min-h-screen bg-errandify-bg pb-24">
      {/* TOP NAVIGATION */}
      <div className="bg-white shadow-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4">
          {/* Header Row */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => navigate(-1)}
              className="text-errandify-orange font-semibold text-sm hover:underline"
            >
              ← Back
            </button>
            <h1 className="text-2xl font-bold text-errandify-brown">My Account</h1>
            <button
              onClick={handleLogout}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-semibold text-sm transition"
            >
              🚪 Log Out
            </button>
          </div>

          {/* Horizontal Menu Tabs */}
          <div className="flex gap-1 overflow-x-auto pb-0">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id as MenuSection)}
                className={`px-4 py-2 rounded-t-lg font-semibold text-sm whitespace-nowrap transition-all ${
                  activeSection === item.id
                    ? 'bg-errandify-orange text-white shadow-md'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span className="mr-1">{item.icon}</span>
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* CONTENT AREA */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Quick Stats Bar */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4 text-center border-t-4 border-errandify-orange">
            <p className="text-3xl font-bold text-errandify-orange">{accountData.rating.toFixed(1)}</p>
            <p className="text-sm text-gray-600">⭐ Rating</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4 text-center border-t-4 border-blue-500">
            <p className="text-3xl font-bold text-blue-600">{accountData.reviewCount}</p>
            <p className="text-sm text-gray-600">👥 Reviews</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4 text-center border-t-4 border-green-500">
            <p className="text-3xl font-bold text-green-600">{accountData.completedTasks}</p>
            <p className="text-sm text-gray-600">✅ Tasks</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4 text-center border-t-4 border-purple-500">
            <p className="text-3xl font-bold text-purple-600">{accountData.errandifyPoints}</p>
            <p className="text-sm text-gray-600">⭐ Points</p>
          </div>
        </div>

        {/* PROFILE SECTION */}
        {activeSection === 'profile' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold text-errandify-brown mb-6">Account Information</h2>
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="text-sm text-gray-600 font-semibold block mb-2">Name</label>
                  <p className="text-lg text-gray-800">{accountData.name}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-600 font-semibold block mb-2">Email</label>
                  <p className="text-lg text-gray-800">{accountData.email || 'Not provided'}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-600 font-semibold block mb-2">Mobile</label>
                  <p className="text-lg text-gray-800">{accountData.mobile || 'Not provided'}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-600 font-semibold block mb-2">Role</label>
                  <span className="inline-block px-3 py-1 bg-errandify-orange text-white rounded-full text-sm font-bold capitalize">
                    {accountData.role}
                  </span>
                </div>
              </div>
              <button
                onClick={() => navigate('/my-profile')}
                className="bg-errandify-orange text-white px-6 py-2 rounded-lg font-semibold hover:bg-opacity-90 transition"
              >
                ✏️ Edit Profile
              </button>
            </div>

            {/* Skills & Points Grid */}
            <div className="grid grid-cols-2 gap-6">
              {accountData.categories.length > 0 && (
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-lg font-bold text-errandify-brown mb-4">🎯 Your Skills</h2>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {accountData.categories.slice(0, 4).map(cat => (
                      <span key={cat} className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-semibold">
                        {cat}
                      </span>
                    ))}
                  </div>
                  {accountData.categories.length > 4 && (
                    <p className="text-xs text-gray-500 mb-4">+{accountData.categories.length - 4} more</p>
                  )}
                  <button
                    onClick={() => navigate('/category-preferences')}
                    className="text-errandify-orange font-semibold text-sm hover:underline"
                  >
                    Manage Skills →
                  </button>
                </div>
              )}

              <div className="bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200 rounded-lg p-6">
                <h2 className="text-lg font-bold text-purple-900 mb-2">⭐ Errandify Points</h2>
                <p className="text-3xl font-bold text-purple-600 mb-3">{accountData.errandifyPoints.toLocaleString()} EP</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => navigate('/errandify-points')}
                    className="flex-1 bg-purple-600 text-white py-2 rounded-lg font-semibold text-sm hover:bg-purple-700 transition"
                  >
                    Details
                  </button>
                  <button
                    onClick={() => navigate('/my-rewards')}
                    className="flex-1 bg-pink-600 text-white py-2 rounded-lg font-semibold text-sm hover:bg-pink-700 transition"
                  >
                    Redeem
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PREFERENCES SECTION */}
        {activeSection === 'preferences' && (
          <div className="grid grid-cols-3 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="font-bold text-errandify-brown mb-4">🎯 Categories</h3>
              <p className="text-sm text-gray-600 mb-4">Manage your skill categories and interests</p>
              <button
                onClick={() => navigate('/category-preferences')}
                className="w-full bg-errandify-orange text-white py-2 rounded-lg font-semibold hover:bg-opacity-90 transition text-sm"
              >
                Manage →
              </button>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="font-bold text-errandify-brown mb-4">🔔 Notifications</h3>
              <p className="text-sm text-gray-600 mb-4">Control how and when you receive alerts</p>
              <button
                onClick={() => navigate('/settings/notifications')}
                className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 transition text-sm"
              >
                Configure →
              </button>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="font-bold text-errandify-brown mb-4">🌍 Language</h3>
              <p className="text-sm text-gray-600 mb-4">Set your language and region preferences</p>
              <button
                onClick={() => navigate('/settings/language')}
                className="w-full bg-green-600 text-white py-2 rounded-lg font-semibold hover:bg-green-700 transition text-sm"
              >
                Change →
              </button>
            </div>
          </div>
        )}

        {/* COMMUNITY SECTION */}
        {activeSection === 'community' && (
          <div className="grid grid-cols-3 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="font-bold text-errandify-brown mb-4">❤️ Trusted Users</h3>
              <p className="text-sm text-gray-600 mb-4">Mark users you trust and prefer to work with</p>
              <button
                onClick={() => navigate('/trusted-users')}
                className="w-full bg-red-600 text-white py-2 rounded-lg font-semibold hover:bg-red-700 transition text-sm"
              >
                View List →
              </button>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="font-bold text-errandify-brown mb-4">🚫 Blocked Users</h3>
              <p className="text-sm text-gray-600 mb-4">Manage users you've blocked</p>
              <button
                onClick={() => navigate('/block-list')}
                className="w-full bg-orange-600 text-white py-2 rounded-lg font-semibold hover:bg-orange-700 transition text-sm"
              >
                Manage →
              </button>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="font-bold text-errandify-brown mb-4">🎁 Referrals</h3>
              <p className="text-sm text-gray-600 mb-4">Earn by inviting friends to Errandify</p>
              <button
                onClick={() => navigate('/referral')}
                className="w-full bg-purple-600 text-white py-2 rounded-lg font-semibold hover:bg-purple-700 transition text-sm"
              >
                View Program →
              </button>
            </div>
          </div>
        )}

        {/* WALLET SECTION */}
        {activeSection === 'wallet' && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-lg p-6 shadow">
              <p className="text-sm text-gray-600 mb-2">Total Earnings</p>
              <p className="text-4xl font-bold text-green-600 mb-4">${accountData.totalEarnings.toLocaleString()}</p>
              <p className="text-sm text-green-800 mb-4">All-time earnings from completed tasks</p>
              <button
                onClick={() => navigate('/transaction-history')}
                className="bg-green-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-green-700 transition"
              >
                📊 Transaction History
              </button>
            </div>

            <div className="grid grid-cols-3 gap-6">
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="font-bold text-errandify-brown mb-4">🏦 Payouts</h3>
                <p className="text-sm text-gray-600 mb-4">Configure where you receive payments</p>
                <button
                  onClick={() => navigate('/payout-settings')}
                  className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 transition text-sm"
                >
                  Settings →
                </button>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="font-bold text-errandify-brown mb-4">💳 Methods</h3>
                <p className="text-sm text-gray-600 mb-4">Add or update payment methods</p>
                <button
                  onClick={() => navigate('/payment-methods')}
                  className="w-full bg-indigo-600 text-white py-2 rounded-lg font-semibold hover:bg-indigo-700 transition text-sm"
                >
                  Manage →
                </button>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="font-bold text-errandify-brown mb-4">ℹ️ Info</h3>
                <div className="text-xs text-gray-600 space-y-1">
                  <p>✅ Payouts: Every Friday</p>
                  <p>✅ Fee: 20%</p>
                  <p>✅ Cards, PayNow</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SECURITY SECTION */}
        {activeSection === 'security' && (
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="font-bold text-errandify-brown mb-4">🔐 Password</h3>
              <p className="text-sm text-gray-600 mb-4">Change your password regularly to stay secure</p>
              <button
                onClick={() => navigate('/settings/change-password')}
                className="w-full bg-red-600 text-white py-2 rounded-lg font-semibold hover:bg-red-700 transition"
              >
                Change Password
              </button>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="font-bold text-errandify-brown mb-4">🛡️ Two-Factor Auth</h3>
              <p className="text-sm text-gray-600 mb-4">Add extra layer of security to your account</p>
              <button
                onClick={() => navigate('/settings/2fa')}
                className="w-full bg-green-600 text-white py-2 rounded-lg font-semibold hover:bg-green-700 transition"
              >
                Set Up 2FA
              </button>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="font-bold text-errandify-brown mb-4">📱 Sessions</h3>
              <p className="text-sm text-gray-600 mb-4">Manage devices where you're logged in</p>
              <button
                onClick={() => navigate('/settings/sessions')}
                className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 transition"
              >
                View Sessions
              </button>
            </div>

            <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6">
              <h3 className="font-bold text-red-900 mb-4">⚠️ Delete Account</h3>
              <p className="text-sm text-red-800 mb-4">Permanent action that cannot be undone</p>
              <button
                onClick={() => {
                  if (window.confirm('Are you absolutely sure?')) {
                    navigate('/delete-account');
                  }
                }}
                className="w-full bg-red-600 text-white py-2 rounded-lg font-semibold hover:bg-red-700 transition"
              >
                Delete
              </button>
            </div>
          </div>
        )}

        {/* HELP SECTION */}
        {activeSection === 'help' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6">
                <h3 className="font-bold text-blue-900 mb-4">📖 FAQ & Help</h3>
                <p className="text-sm text-blue-800 mb-4">Browse our comprehensive help center</p>
                <button
                  onClick={() => navigate('/faq')}
                  className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 transition"
                >
                  Visit FAQ
                </button>
              </div>

              <div className="bg-green-50 border-2 border-green-200 rounded-lg p-6">
                <h3 className="font-bold text-green-900 mb-4">📧 Contact Support</h3>
                <p className="text-sm text-green-800 mb-4">Get help from our support team</p>
                <a
                  href="mailto:togather@errandify.ai"
                  className="w-full bg-green-600 text-white py-2 rounded-lg font-semibold hover:bg-green-700 transition block text-center"
                >
                  Email Support
                </a>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-bold text-errandify-brown mb-4">Support Information</h2>
              <div className="grid grid-cols-3 gap-6">
                <div>
                  <p className="font-semibold text-gray-800 mb-1">📧 Email</p>
                  <p className="text-sm text-gray-600">togather@errandify.ai</p>
                </div>
                <div>
                  <p className="font-semibold text-gray-800 mb-1">⏰ Response Time</p>
                  <p className="text-sm text-gray-600">24-48 hours typically</p>
                </div>
                <div>
                  <p className="font-semibold text-gray-800 mb-1">📞 Urgent Issues</p>
                  <p className="text-sm text-gray-600">Available 24/7</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
