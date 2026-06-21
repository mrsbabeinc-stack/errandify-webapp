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
    <div className="min-h-screen bg-gradient-to-b from-errandify-bg to-white pb-24">
      {/* HERO HEADER */}
      <div className="bg-gradient-to-r from-errandify-orange to-orange-500 text-white sticky top-0 z-50 shadow-lg">
        <div className="max-w-6xl mx-auto px-4 py-6 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="text-white font-bold text-lg hover:opacity-80 transition"
          >
            ←
          </button>
          <h1 className="text-3xl font-bold">My Account</h1>
          <button
            onClick={handleLogout}
            className="bg-white bg-opacity-20 hover:bg-opacity-30 text-white px-4 py-2 rounded-lg font-semibold text-sm transition"
          >
            🚪
          </button>
        </div>
      </div>

      {/* CONTENT */}
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* PROFILE HERO CARD */}
        <div className="relative bg-white rounded-2xl shadow-lg p-8 border-l-8 border-errandify-orange overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-errandify-orange opacity-5 rounded-full -mr-20 -mt-20"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-4xl font-bold text-errandify-brown mb-2">{accountData.name}</h2>
                <p className="text-gray-600">👥 {accountData.role === 'asker' ? 'Task Poster' : 'Task Helper'}</p>
              </div>
              <div className="text-5xl">👤</div>
            </div>
            <button
              onClick={() => navigate('/my-profile')}
              className="bg-gradient-to-r from-errandify-orange to-orange-500 text-white px-6 py-3 rounded-xl font-bold hover:shadow-lg transition"
            >
              ✏️ Edit Profile
            </button>
          </div>
        </div>

        {/* STATS SHOWCASE */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-orange-100 to-orange-50 rounded-2xl p-6 border-2 border-errandify-orange shadow-md">
            <p className="text-sm text-gray-600 font-semibold mb-2">⭐ Rating</p>
            <p className="text-4xl font-bold text-errandify-orange">{accountData.rating.toFixed(1)}</p>
            <p className="text-xs text-gray-500 mt-1">Out of 5.0</p>
          </div>

          <div className="bg-gradient-to-br from-blue-100 to-blue-50 rounded-2xl p-6 border-2 border-blue-500 shadow-md">
            <p className="text-sm text-gray-600 font-semibold mb-2">👥 Reviews</p>
            <p className="text-4xl font-bold text-blue-600">{accountData.reviewCount}</p>
            <p className="text-xs text-gray-500 mt-1">Community feedback</p>
          </div>

          <div className="bg-gradient-to-br from-green-100 to-green-50 rounded-2xl p-6 border-2 border-green-500 shadow-md">
            <p className="text-sm text-gray-600 font-semibold mb-2">✅ Tasks</p>
            <p className="text-4xl font-bold text-green-600">{accountData.completedTasks}</p>
            <p className="text-xs text-gray-500 mt-1">Completed</p>
          </div>

          <div className="bg-gradient-to-br from-purple-100 to-purple-50 rounded-2xl p-6 border-2 border-purple-500 shadow-md">
            <p className="text-sm text-gray-600 font-semibold mb-2">⭐ Points</p>
            <p className="text-4xl font-bold text-purple-600">{accountData.errandifyPoints.toLocaleString()}</p>
            <p className="text-xs text-gray-500 mt-1">Rewards balance</p>
          </div>
        </div>

        {/* TWO COLUMN LAYOUT */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* LEFT COLUMN - PROFILE & EARNINGS */}
          <div className="space-y-6">
            {/* ACCOUNT INFO CARD */}
            <div className="bg-white rounded-2xl shadow-md p-8 border-t-4 border-errandify-orange">
              <h3 className="text-2xl font-bold text-errandify-brown mb-6 flex items-center gap-2">
                📋 Account Information
              </h3>
              <div className="space-y-4">
                <div className="pb-4 border-b border-gray-100">
                  <label className="text-xs font-bold text-gray-500 uppercase">Name</label>
                  <p className="text-lg text-gray-800 font-semibold mt-1">{accountData.name}</p>
                </div>
                <div className="pb-4 border-b border-gray-100">
                  <label className="text-xs font-bold text-gray-500 uppercase">Email</label>
                  <p className="text-lg text-gray-800 font-semibold mt-1">{accountData.email || '—'}</p>
                </div>
                <div className="pb-4 border-b border-gray-100">
                  <label className="text-xs font-bold text-gray-500 uppercase">Mobile</label>
                  <p className="text-lg text-gray-800 font-semibold mt-1">{accountData.mobile || '—'}</p>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase">Role</label>
                  <div className="mt-1">
                    <span className="inline-block px-4 py-2 bg-gradient-to-r from-errandify-orange to-orange-500 text-white rounded-full text-sm font-bold capitalize">
                      {accountData.role === 'asker' ? '🎯 Task Poster' : '💪 Task Helper'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* EARNINGS CARD */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl shadow-md p-8 border-l-4 border-green-500">
              <h3 className="text-sm font-bold text-gray-600 uppercase mb-2">💰 Earnings</h3>
              <p className="text-5xl font-bold text-green-600 mb-4">${accountData.totalEarnings.toLocaleString()}</p>
              <p className="text-gray-600 mb-6">All-time earnings from completed tasks</p>
              <button
                onClick={() => navigate('/transaction-history')}
                className="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white py-3 rounded-xl font-bold hover:shadow-lg transition"
              >
                📊 View History
              </button>
            </div>
          </div>

          {/* RIGHT COLUMN - SKILLS & REWARDS */}
          <div className="space-y-6">
            {/* SKILLS CARD */}
            {accountData.categories.length > 0 && (
              <div className="bg-white rounded-2xl shadow-md p-8 border-t-4 border-blue-500">
                <h3 className="text-2xl font-bold text-errandify-brown mb-6 flex items-center gap-2">
                  🎯 Your Skills
                </h3>
                <div className="flex flex-wrap gap-3 mb-6">
                  {accountData.categories.map(cat => (
                    <span
                      key={cat}
                      className="bg-gradient-to-r from-blue-100 to-blue-50 text-blue-700 px-4 py-2 rounded-full text-sm font-bold border border-blue-300"
                    >
                      {cat}
                    </span>
                  ))}
                </div>
                <button
                  onClick={() => navigate('/category-preferences')}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold transition"
                >
                  ⚙️ Manage Skills
                </button>
              </div>
            )}

            {/* POINTS CARD */}
            <div className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl shadow-lg p-8 text-white">
              <h3 className="text-sm font-bold opacity-90 uppercase mb-2">⭐ Errandify Points</h3>
              <p className="text-5xl font-bold mb-2">{accountData.errandifyPoints.toLocaleString()}</p>
              <p className="text-purple-100 mb-6">Redeem for rewards, discounts & charity</p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => navigate('/errandify-points')}
                  className="bg-white bg-opacity-20 hover:bg-opacity-30 text-white py-3 rounded-xl font-bold transition"
                >
                  📖 Details
                </button>
                <button
                  onClick={() => navigate('/my-rewards')}
                  className="bg-white text-purple-600 hover:bg-gray-100 py-3 rounded-xl font-bold transition"
                >
                  🎁 Redeem
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* FEATURE CARDS GRID */}
        <div className="space-y-6">
          {/* PREFERENCES SECTION */}
          <div>
            <h2 className="text-2xl font-bold text-errandify-brown mb-4 flex items-center gap-2">
              🎨 Preferences
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-2xl shadow-md p-6 border-t-4 border-errandify-orange hover:shadow-lg transition">
                <h4 className="text-xl font-bold text-errandify-brown mb-2">🏷️ Categories</h4>
                <p className="text-sm text-gray-600 mb-4">Manage your interests & skills</p>
                <button
                  onClick={() => navigate('/category-preferences')}
                  className="w-full bg-errandify-orange text-white py-2 rounded-lg font-bold hover:opacity-90 transition"
                >
                  Manage
                </button>
              </div>

              <div className="bg-white rounded-2xl shadow-md p-6 border-t-4 border-blue-500 hover:shadow-lg transition">
                <h4 className="text-xl font-bold text-blue-600 mb-2">🔔 Notifications</h4>
                <p className="text-sm text-gray-600 mb-4">Control how you receive alerts</p>
                <button
                  onClick={() => navigate('/settings/notifications')}
                  className="w-full bg-blue-600 text-white py-2 rounded-lg font-bold hover:opacity-90 transition"
                >
                  Configure
                </button>
              </div>

              <div className="bg-white rounded-2xl shadow-md p-6 border-t-4 border-green-500 hover:shadow-lg transition">
                <h4 className="text-xl font-bold text-green-600 mb-2">🌍 Language</h4>
                <p className="text-sm text-gray-600 mb-4">Set your language & region</p>
                <button
                  onClick={() => navigate('/settings/language')}
                  className="w-full bg-green-600 text-white py-2 rounded-lg font-bold hover:opacity-90 transition"
                >
                  Change
                </button>
              </div>
            </div>
          </div>

          {/* COMMUNITY SECTION */}
          <div>
            <h2 className="text-2xl font-bold text-errandify-brown mb-4 flex items-center gap-2">
              🤝 Community
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-2xl shadow-md p-6 border-t-4 border-red-500 hover:shadow-lg transition">
                <h4 className="text-xl font-bold text-red-600 mb-2">❤️ Trusted Users</h4>
                <p className="text-sm text-gray-600 mb-4">Your trusted network</p>
                <button
                  onClick={() => navigate('/trusted-users')}
                  className="w-full bg-red-600 text-white py-2 rounded-lg font-bold hover:opacity-90 transition"
                >
                  View List
                </button>
              </div>

              <div className="bg-white rounded-2xl shadow-md p-6 border-t-4 border-orange-500 hover:shadow-lg transition">
                <h4 className="text-xl font-bold text-orange-600 mb-2">🚫 Blocked Users</h4>
                <p className="text-sm text-gray-600 mb-4">Manage your blocklist</p>
                <button
                  onClick={() => navigate('/block-list')}
                  className="w-full bg-orange-600 text-white py-2 rounded-lg font-bold hover:opacity-90 transition"
                >
                  Manage
                </button>
              </div>

              <div className="bg-white rounded-2xl shadow-md p-6 border-t-4 border-purple-500 hover:shadow-lg transition">
                <h4 className="text-xl font-bold text-purple-600 mb-2">🎁 Referrals</h4>
                <p className="text-sm text-gray-600 mb-4">Earn from referrals</p>
                <button
                  onClick={() => navigate('/referral')}
                  className="w-full bg-purple-600 text-white py-2 rounded-lg font-bold hover:opacity-90 transition"
                >
                  View Program
                </button>
              </div>
            </div>
          </div>

          {/* SECURITY SECTION */}
          <div>
            <h2 className="text-2xl font-bold text-errandify-brown mb-4 flex items-center gap-2">
              🔒 Security & Support
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-2xl shadow-md p-6 border-t-4 border-red-600 hover:shadow-lg transition">
                <h4 className="text-xl font-bold text-red-600 mb-2">🔐 Password</h4>
                <p className="text-sm text-gray-600 mb-4">Change your password</p>
                <button
                  onClick={() => navigate('/settings/change-password')}
                  className="w-full bg-red-600 text-white py-2 rounded-lg font-bold hover:opacity-90 transition"
                >
                  Change
                </button>
              </div>

              <div className="bg-white rounded-2xl shadow-md p-6 border-t-4 border-green-600 hover:shadow-lg transition">
                <h4 className="text-xl font-bold text-green-600 mb-2">🛡️ Two-Factor Auth</h4>
                <p className="text-sm text-gray-600 mb-4">Extra security layer</p>
                <button
                  onClick={() => navigate('/settings/2fa')}
                  className="w-full bg-green-600 text-white py-2 rounded-lg font-bold hover:opacity-90 transition"
                >
                  Setup 2FA
                </button>
              </div>

              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl shadow-md p-6 border-t-4 border-blue-600 hover:shadow-lg transition">
                <h4 className="text-xl font-bold text-blue-600 mb-2">📧 Support</h4>
                <p className="text-sm text-gray-600 mb-4">Need help?</p>
                <a
                  href="mailto:togather@errandify.ai"
                  className="w-full bg-blue-600 text-white py-2 rounded-lg font-bold hover:opacity-90 transition block text-center"
                >
                  Contact Us
                </a>
              </div>
            </div>
          </div>

          {/* WALLET & PAYOUT SECTION */}
          <div>
            <h2 className="text-2xl font-bold text-errandify-brown mb-4 flex items-center gap-2">
              💳 Wallet & Payouts
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-2xl shadow-md p-6 border-t-4 border-blue-500 hover:shadow-lg transition">
                <h4 className="text-xl font-bold text-blue-600 mb-2">🏦 Payout Settings</h4>
                <p className="text-sm text-gray-600 mb-4">Configure payouts</p>
                <button
                  onClick={() => navigate('/payout-settings')}
                  className="w-full bg-blue-600 text-white py-2 rounded-lg font-bold hover:opacity-90 transition"
                >
                  Setup
                </button>
              </div>

              <div className="bg-white rounded-2xl shadow-md p-6 border-t-4 border-indigo-500 hover:shadow-lg transition">
                <h4 className="text-xl font-bold text-indigo-600 mb-2">💰 Payment Methods</h4>
                <p className="text-sm text-gray-600 mb-4">Add payment methods</p>
                <button
                  onClick={() => navigate('/my-pocket')}
                  className="w-full bg-indigo-600 text-white py-2 rounded-lg font-bold hover:opacity-90 transition"
                >
                  Manage
                </button>
              </div>

              <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-2xl shadow-md p-6 border-t-4 border-amber-500">
                <h4 className="text-xl font-bold text-amber-700 mb-2">⏱️ Payout Schedule</h4>
                <p className="text-sm text-gray-600 mb-4">Every Friday</p>
                <div className="bg-white p-3 rounded-lg text-center text-sm font-semibold text-amber-700">
                  20% Platform Fee
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
