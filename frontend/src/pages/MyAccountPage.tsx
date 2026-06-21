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
    <div className="min-h-screen bg-errandify-bg pb-24">
      {/* HEADER */}
      <div className="bg-white shadow-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
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
      </div>

      {/* SINGLE SCREEN CONTENT */}
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* QUICK STATS */}
        <div className="grid grid-cols-4 gap-4">
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

        {/* PROFILE & EARNINGS */}
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-errandify-brown mb-6">Account Information</h2>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="text-sm text-gray-600 font-semibold">Name</label>
                <p className="text-lg text-gray-800 font-semibold">{accountData.name}</p>
              </div>
              <div>
                <label className="text-sm text-gray-600 font-semibold">Email</label>
                <p className="text-lg text-gray-800 font-semibold">{accountData.email || 'Not set'}</p>
              </div>
              <div>
                <label className="text-sm text-gray-600 font-semibold">Mobile</label>
                <p className="text-lg text-gray-800 font-semibold">{accountData.mobile || 'Not set'}</p>
              </div>
              <div>
                <label className="text-sm text-gray-600 font-semibold">Role</label>
                <span className="inline-block px-3 py-1 bg-errandify-orange text-white rounded-full text-sm font-bold capitalize">
                  {accountData.role}
                </span>
              </div>
            </div>
            <button
              onClick={() => navigate('/my-profile')}
              className="w-full mt-4 bg-errandify-orange text-white py-2 rounded-lg font-semibold hover:bg-opacity-90 transition"
            >
              ✏️ Edit Profile
            </button>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-300 rounded-lg p-6">
            <p className="text-sm text-gray-600 mb-2">Total Earnings</p>
            <p className="text-3xl font-bold text-green-600 mb-4">${accountData.totalEarnings.toLocaleString()}</p>
            <button
              onClick={() => navigate('/transaction-history')}
              className="w-full bg-green-600 text-white py-2 rounded-lg font-semibold hover:bg-green-700 transition text-sm"
            >
              📊 History
            </button>
          </div>
        </div>

        {/* SKILLS & POINTS */}
        <div className="grid grid-cols-3 gap-6">
          {accountData.categories.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-bold text-errandify-brown mb-4">🎯 Skills</h2>
              <div className="flex flex-wrap gap-2 mb-4">
                {accountData.categories.slice(0, 3).map(cat => (
                  <span key={cat} className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs font-semibold">
                    {cat}
                  </span>
                ))}
              </div>
              <button
                onClick={() => navigate('/category-preferences')}
                className="text-errandify-orange font-semibold text-sm hover:underline"
              >
                Manage →
              </button>
            </div>
          )}

          <div className="bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200 rounded-lg p-6">
            <h2 className="text-lg font-bold text-purple-900 mb-2">⭐ Points</h2>
            <p className="text-3xl font-bold text-purple-600 mb-4">{accountData.errandifyPoints.toLocaleString()}</p>
            <div className="flex gap-2">
              <button
                onClick={() => navigate('/errandify-points')}
                className="flex-1 bg-purple-600 text-white py-2 rounded-lg font-semibold text-xs hover:bg-purple-700 transition"
              >
                Details
              </button>
              <button
                onClick={() => navigate('/my-rewards')}
                className="flex-1 bg-pink-600 text-white py-2 rounded-lg font-semibold text-xs hover:bg-pink-700 transition"
              >
                Redeem
              </button>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-bold text-errandify-brown mb-4">🏦 Payout</h2>
            <p className="text-sm text-gray-600 mb-4">Every Friday</p>
            <button
              onClick={() => navigate('/payout-settings')}
              className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 transition text-sm"
            >
              Settings →
            </button>
          </div>
        </div>

        {/* PREFERENCES */}
        <div className="grid grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-bold text-errandify-brown mb-4">🎨 Categories</h3>
            <p className="text-sm text-gray-600 mb-4">Manage your interests</p>
            <button
              onClick={() => navigate('/category-preferences')}
              className="w-full bg-errandify-orange text-white py-2 rounded-lg font-semibold hover:bg-opacity-90 transition text-sm"
            >
              Manage
            </button>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-bold text-errandify-brown mb-4">🔔 Notifications</h3>
            <p className="text-sm text-gray-600 mb-4">Control alerts</p>
            <button
              onClick={() => navigate('/settings/notifications')}
              className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 transition text-sm"
            >
              Configure
            </button>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-bold text-errandify-brown mb-4">🌍 Language</h3>
            <p className="text-sm text-gray-600 mb-4">Set preferences</p>
            <button
              onClick={() => navigate('/settings/language')}
              className="w-full bg-green-600 text-white py-2 rounded-lg font-semibold hover:bg-green-700 transition text-sm"
            >
              Change
            </button>
          </div>
        </div>

        {/* COMMUNITY & SECURITY */}
        <div className="grid grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-bold text-errandify-brown mb-4">❤️ Trusted</h3>
            <p className="text-sm text-gray-600 mb-4">Manage trusted users</p>
            <button
              onClick={() => navigate('/trusted-users')}
              className="w-full bg-red-600 text-white py-2 rounded-lg font-semibold hover:bg-red-700 transition text-sm"
            >
              View
            </button>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-bold text-errandify-brown mb-4">🚫 Blocked</h3>
            <p className="text-sm text-gray-600 mb-4">Manage blocked users</p>
            <button
              onClick={() => navigate('/block-list')}
              className="w-full bg-orange-600 text-white py-2 rounded-lg font-semibold hover:bg-orange-700 transition text-sm"
            >
              Manage
            </button>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-bold text-errandify-brown mb-4">🔐 Password</h3>
            <p className="text-sm text-gray-600 mb-4">Change password</p>
            <button
              onClick={() => navigate('/settings/change-password')}
              className="w-full bg-red-600 text-white py-2 rounded-lg font-semibold hover:bg-red-700 transition text-sm"
            >
              Change
            </button>
          </div>
        </div>

        {/* REFERRAL & SUPPORT */}
        <div className="grid grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-bold text-errandify-brown mb-4">🎁 Referral</h3>
            <p className="text-sm text-gray-600 mb-4">Earn by inviting</p>
            <button
              onClick={() => navigate('/referral')}
              className="w-full bg-purple-600 text-white py-2 rounded-lg font-semibold hover:bg-purple-700 transition text-sm"
            >
              Program
            </button>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-bold text-errandify-brown mb-4">🛡️ 2FA</h3>
            <p className="text-sm text-gray-600 mb-4">Extra security</p>
            <button
              onClick={() => navigate('/settings/2fa')}
              className="w-full bg-green-600 text-white py-2 rounded-lg font-semibold hover:bg-green-700 transition text-sm"
            >
              Setup
            </button>
          </div>

          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6">
            <h3 className="font-bold text-blue-900 mb-4">📧 Support</h3>
            <p className="text-sm text-blue-800 mb-4">Need help?</p>
            <a
              href="mailto:togather@errandify.ai"
              className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 transition text-sm block text-center"
            >
              Contact
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
