import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import AdCarousel from '../components/AdCarousel';
import EventBanner from '../components/EventBanner';

interface UserProfile {
  id?: number;
  userId?: string;
  name: string;
  email: string;
  mobile: string;
  role: 'asker' | 'doer';
  rating?: number;
  reviewCount?: number;
  completedTasks?: number;
  totalEarnings?: number;
  errandifyPoints?: number;
  categories?: string[];
  bio?: string;
  monthlyHouseholdIncome?: number;
  chasCardColor?: string;
  chasSubsidyPercentage?: number;
}

interface Rating {
  score: number;
  comment: string;
  createdAt: string;
}

export default function MyAccountPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'profile-shared' | 'profile-private'>('dashboard');
  const [profileTab, setProfileTab] = useState<'shared' | 'private'>('shared');
  const [profileData, setProfileData] = useState<UserProfile | null>(null);
  const [ratings, setRatings] = useState<{ averageRating: number; reviewCount: number; reviews: Rating[] }>({
    averageRating: 0,
    reviewCount: 0,
    reviews: [],
  });
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    display_name: '',
    email: '',
    mobile: '',
    monthly_household_income: '',
  });
  const [saving, setSaving] = useState(false);
  const [certificates, setCertificates] = useState<Array<{ id: string; name: string; url?: string }>>([]);
  const [certificateFile, setCertificateFile] = useState<File | null>(null);
  const [certificateTitle, setCertificateTitle] = useState('');

  useEffect(() => {
    fetchProfileData();
  }, []);

  const fetchProfileData = async () => {
    try {
      const token = localStorage.getItem('token');
      const userStr = localStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;

      if (!user?.id) {
        setLoading(false);
        return;
      }

      const profileRes = await axios.get(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/users/profile`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setProfileData(profileRes.data.data);
      setEditForm({
        display_name: profileRes.data.data.name || '',
        email: profileRes.data.data.email || '',
        mobile: profileRes.data.data.mobile || '',
        monthly_household_income: profileRes.data.data.monthlyHouseholdIncome ? String(profileRes.data.data.monthlyHouseholdIncome) : '',
      });

      try {
        const ratingsRes = await axios.get(
          `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/users/${user.id}/ratings`
        );
        setRatings(ratingsRes.data.data);
      } catch {
        console.warn('Could not fetch ratings');
      }
    } catch (err) {
      console.error('Failed to fetch profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const updateData: any = {
        display_name: editForm.display_name,
        mobile: editForm.mobile,
      };
      if (editForm.monthly_household_income) {
        updateData.monthly_household_income = parseInt(editForm.monthly_household_income, 10);
      }

      const response = await axios.put(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/users/profile`,
        updateData,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setProfileData({
        ...profileData,
        ...response.data.data,
      });
      setIsEditing(false);
    } catch (err: any) {
      console.error('Failed to save profile:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to log out?')) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      navigate('/login');
    }
  };

  const getProfileCompleteness = () => {
    if (!profileData) return 0;
    let complete = 0;
    if (profileData.name) complete++;
    if (profileData.mobile) complete++;
    if (profileData.categories && profileData.categories.length > 0) complete++;
    if (profileData.bio) complete++;
    if (profileData.monthlyHouseholdIncome) complete++;
    return Math.round((complete / 5) * 100);
  };

  const getBadges = () => {
    const badges = [];
    if (ratings.averageRating >= 4.8) badges.push({ icon: '⭐', label: 'Trusted Expert' });
    if (ratings.reviewCount >= 50) badges.push({ icon: '🏆', label: 'Top Performer' });
    if (ratings.averageRating === 5 && ratings.reviewCount >= 10) badges.push({ icon: '✨', label: 'Perfect Rating' });
    if (profileData?.completedTasks && profileData.completedTasks >= 100) badges.push({ icon: '🚀', label: 'Century Club' });
    return badges;
  };

  if (loading) {
    return <div className="p-6 text-center">Loading account...</div>;
  }

  if (!profileData) {
    return <div className="p-6 text-center text-red-600">Failed to load account</div>;
  }

  const completeness = getProfileCompleteness();
  const badges = getBadges();

  return (
    <div className="min-h-screen bg-gradient-to-b from-errandify-bg to-white pb-24">
      {/* HERO HEADER - WARM & ENGAGING */}
      <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-white sticky top-0 z-50 shadow-lg">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="text-white font-bold text-xl hover:opacity-80 transition"
          >
            ←
          </button>
          <h1 className="text-2xl font-bold">✨ MyAccount</h1>
          <button
            onClick={handleLogout}
            className="bg-white bg-opacity-20 hover:bg-opacity-30 text-white px-3 py-1.5 rounded-lg font-semibold text-sm transition"
          >
            🚪
          </button>
        </div>
      </div>

      {/* TAB NAVIGATION */}
      <div className="bg-white border-b border-gray-200 sticky top-20 z-40 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 flex gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-4 py-3 text-sm font-bold whitespace-nowrap transition ${
              activeTab === 'dashboard'
                ? 'border-b-4 border-errandify-orange text-errandify-orange'
                : 'text-gray-600 hover:text-gray-800 border-b-4 border-transparent'
            }`}
          >
            📊 Dashboard
          </button>
          <button
            onClick={() => {
              setActiveTab('profile-shared');
              setProfileTab('shared');
            }}
            className={`px-4 py-3 text-sm font-bold whitespace-nowrap transition ${
              activeTab === 'profile-shared'
                ? 'border-b-4 border-errandify-orange text-errandify-orange'
                : 'text-gray-600 hover:text-gray-800 border-b-4 border-transparent'
            }`}
          >
            👤 My Profile
          </button>
        </div>
      </div>

      {/* CONTENT */}
      <div className="max-w-6xl mx-auto px-4 py-6 w-full">
        {/* AD CAROUSEL + EVENT BANNER */}
        <div className="mb-4">
          <AdCarousel />
          <div className="mt-2">
            <EventBanner />
          </div>
        </div>

        {/* ===== DASHBOARD TAB ===== */}
        {activeTab === 'dashboard' && (
          <div className="space-y-1.5">
            {/* PROFILE HERO CARD - BALANCED */}
            <div className="relative bg-white rounded-lg shadow p-3 border-l-4 border-errandify-orange overflow-hidden mb-1.5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h2 className="text-base font-bold text-errandify-brown truncate">{profileData.name}</h2>
                  <p className="text-gray-600 text-xs">{profileData.role === 'asker' ? '📍 Asker' : '💪 Doer'}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xl font-bold text-errandify-orange">{ratings.averageRating.toFixed(1)}</p>
                  <p className="text-xs text-gray-600">⭐</p>
                </div>
              </div>
              {badges.length > 0 && (
                <div className="flex gap-0.5 flex-wrap mt-1">
                  {badges.map((badge, idx) => (
                    <span key={idx} className="bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded text-xs font-bold">
                      {badge.icon}
                    </span>
                  ))}
                </div>
              )}
              <div className="mt-1">
                <div className="flex justify-between items-center mb-0.5">
                  <span className="text-xs font-semibold text-gray-600">Completeness</span>
                  <span className="text-xs font-bold">{completeness}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1">
                  <div
                    className="bg-errandify-orange rounded-full h-1 transition-all duration-300"
                    style={{ width: `${completeness}%` }}
                  />
                </div>
              </div>
            </div>

            {/* STATS GRID - ULTRA COMPACT */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-1 mb-1">
              <div className="bg-white rounded shadow p-1.5 border-l-4 border-amber-500 text-center">
                <p className="text-lg font-bold text-errandify-orange leading-none">{ratings.reviewCount}</p>
                <p className="text-xs text-gray-600 font-semibold leading-none">👥 Reviews</p>
              </div>
              <div className="bg-white rounded shadow p-1.5 border-l-4 border-green-500 text-center">
                <p className="text-lg font-bold text-errandify-orange leading-none">{profileData.completedTasks || 0}</p>
                <p className="text-xs text-gray-600 font-semibold leading-none">✅ Errands</p>
              </div>
              <div className="bg-white rounded shadow p-1.5 border-l-4 border-blue-500 text-center">
                <p className="text-lg font-bold text-errandify-orange leading-none">${profileData.totalEarnings || 0}</p>
                <p className="text-xs text-gray-600 font-semibold leading-none">💰 Earnings</p>
              </div>
              <div className="bg-white rounded shadow p-1.5 border-l-4 border-purple-500 text-center">
                <p className="text-lg font-bold text-errandify-orange leading-none">{profileData.errandifyPoints || 0}</p>
                <p className="text-xs text-gray-600 font-semibold leading-none">⭐ EP</p>
              </div>
            </div>

            {/* QUICK ACTIONS - ULTRA COMPACT */}
            <div className="grid grid-cols-3 md:grid-cols-6 gap-1">
              <button
                onClick={() => navigate('/category-preferences')}
                className="bg-white rounded shadow p-1.5 border-l-2 border-orange-400 hover:shadow-md transition text-center"
              >
                <p className="text-lg mb-0">🎯</p>
                <p className="font-bold text-xs text-gray-800">Categories</p>
              </button>
              <button
                onClick={() => navigate('/payout-settings')}
                className="bg-white rounded shadow p-1.5 border-l-2 border-orange-400 hover:shadow-md transition text-center"
              >
                <p className="text-lg mb-0">💳</p>
                <p className="font-bold text-xs text-gray-800">Payout</p>
              </button>
              <button
                onClick={() => navigate('/errandify-points')}
                className="bg-white rounded shadow p-1.5 border-l-2 border-orange-400 hover:shadow-md transition text-center"
              >
                <p className="text-lg mb-0">💎</p>
                <p className="font-bold text-xs text-gray-800">Rewards</p>
              </button>
              <button
                onClick={() => navigate('/referral')}
                className="bg-white rounded shadow p-1.5 border-l-2 border-orange-400 hover:shadow-md transition text-center"
              >
                <p className="text-lg mb-0">🎁</p>
                <p className="font-bold text-xs text-gray-800">Referral</p>
              </button>
              <button
                onClick={() => navigate('/trusted-users')}
                className="bg-white rounded shadow p-1.5 border-l-2 border-orange-400 hover:shadow-md transition text-center"
              >
                <p className="text-lg mb-0">❤️</p>
                <p className="font-bold text-xs text-gray-800">Trusted</p>
              </button>
              <button
                onClick={() => navigate('/faq')}
                className="bg-white rounded shadow p-1.5 border-l-2 border-orange-400 hover:shadow-md transition text-center"
              >
                <p className="text-lg mb-0">❓</p>
                <p className="font-bold text-xs text-gray-800">Help</p>
              </button>
            </div>
          </div>
        )}

        {/* ===== PROFILE TAB ===== */}
        {(activeTab === 'profile-shared' || activeTab === 'profile-private') && (
          <div>
            {/* PROFILE SUBTABS */}
            <div className="flex gap-2 mb-3 border-b-2 border-gray-200">
              <button
                onClick={() => {
                  setActiveTab('profile-shared');
                  setProfileTab('shared');
                }}
                className={`pb-2 font-bold text-xs transition ${
                  profileTab === 'shared'
                    ? 'border-b-4 border-errandify-orange text-errandify-orange'
                    : 'text-gray-600 hover:text-gray-800 border-b-4 border-transparent'
                }`}
              >
                🌐 MyShared
              </button>
              <button
                onClick={() => {
                  setActiveTab('profile-private');
                  setProfileTab('private');
                }}
                className={`pb-2 font-bold text-xs transition ${
                  profileTab === 'private'
                    ? 'border-b-4 border-errandify-orange text-errandify-orange'
                    : 'text-gray-600 hover:text-gray-800 border-b-4 border-transparent'
                }`}
              >
                🔒 MyPrivate
              </button>
            </div>

            {/* SHARED INFO */}
            {profileTab === 'shared' && (
              <div className="space-y-3">
                <div className="bg-blue-50 border-l-4 border-blue-500 rounded p-2 mb-2">
                  <p className="text-xs font-bold text-blue-900">👁️ PUBLIC PROFILE</p>
                  <p className="text-xs text-blue-800 mt-0.5">What other users see</p>
                </div>

                {/* Profile Header - COMPACT */}
                <div className="bg-gradient-to-r from-errandify-orange to-orange-400 rounded-lg shadow p-4 text-white mb-3">
                  <div className="flex gap-3 items-center">
                    <div className="text-3xl">👤</div>
                    <div className="flex-1">
                      <h2 className="text-lg font-bold mb-0.5">{profileData.name}</h2>
                      <p className="text-orange-50 text-xs">{profileData.role === 'asker' ? '📍 Asker' : '💪 Doer'}</p>
                      {badges.length > 0 && (
                        <div className="flex gap-1 flex-wrap mt-1">
                          {badges.map((badge, idx) => (
                            <div key={idx} className="text-xs bg-white bg-opacity-20 px-1.5 py-0.5 rounded">
                              {badge.icon}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Stats - COMPACT */}
                <div className="grid grid-cols-2 gap-1.5 mb-2">
                  <div className="bg-white rounded shadow p-2 text-center border-l-2 border-orange-400">
                    <p className="text-lg font-bold text-errandify-orange">{ratings.averageRating.toFixed(1)}</p>
                    <p className="text-xs text-gray-600 font-semibold">⭐ Rating</p>
                  </div>
                  <div className="bg-white rounded shadow p-2 text-center border-l-2 border-orange-400">
                    <p className="text-lg font-bold text-errandify-orange">{ratings.reviewCount}</p>
                    <p className="text-xs text-gray-600 font-semibold">👥 Reviews</p>
                  </div>
                  <div className="bg-white rounded shadow p-2 text-center border-l-2 border-orange-400">
                    <p className="text-lg font-bold text-errandify-orange">{profileData.categories?.length || 0}</p>
                    <p className="text-xs text-gray-600 font-semibold">🎯 Skills</p>
                  </div>
                  <div className="bg-white rounded shadow p-2 text-center border-l-2 border-orange-400">
                    <p className="text-lg font-bold text-errandify-orange">{profileData.completedTasks || 0}</p>
                    <p className="text-xs text-gray-600 font-semibold">✅ Errands</p>
                  </div>
                </div>

                {/* Skills */}
                {profileData.categories && profileData.categories.length > 0 && (
                  <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-bold text-errandify-brown mb-4">🎯 Your Skills</h3>
                    <div className="grid grid-cols-2 gap-2">
                      {profileData.categories.slice(0, 4).map((cat, idx) => (
                        <div key={idx} className="bg-gradient-to-r from-orange-50 to-orange-100 border border-orange-200 rounded-lg p-3 text-center">
                          <p className="text-sm font-bold text-errandify-brown">{cat}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* PRIVATE INFO */}
            {profileTab === 'private' && (
              <div className="space-y-3">
                <div className="bg-green-50 border-l-4 border-green-500 rounded p-2 mb-2">
                  <p className="text-xs font-bold text-green-900">🔒 PRIVATE</p>
                  <p className="text-xs text-green-800 mt-0.5">Only you see this</p>
                </div>

                {/* View/Edit Profile */}
                <div className="bg-white rounded shadow p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-errandify-brown">📝 Your Profile</h3>
                    {!isEditing && (
                      <button
                        onClick={() => setIsEditing(true)}
                        className="text-xs text-errandify-orange font-semibold hover:underline"
                      >
                        Edit
                      </button>
                    )}
                    {isEditing && (
                      <button
                        onClick={() => setIsEditing(false)}
                        className="text-xs text-gray-600 font-semibold hover:underline"
                      >
                        Cancel
                      </button>
                    )}
                  </div>

                  {!isEditing ? (
                    <div className="space-y-2">
                      <div className="flex justify-between items-center py-2 border-b border-gray-100">
                        <span className="text-xs text-gray-600 font-semibold">Name</span>
                        <span className="text-sm text-gray-800">{profileData.name || '—'}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-gray-100">
                        <span className="text-xs text-gray-600 font-semibold">Email</span>
                        <span className="text-sm text-gray-800">{profileData.email || '—'}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-gray-100">
                        <span className="text-xs text-gray-600 font-semibold">Mobile</span>
                        <span className="text-sm text-gray-800">{profileData.mobile || '—'}</span>
                      </div>
                      <div className="flex justify-between items-center py-2">
                        <span className="text-xs text-gray-600 font-semibold">Monthly Income</span>
                        <span className="text-sm text-gray-800">${profileData.monthlyHouseholdIncome || '—'}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div>
                        <label className="text-xs font-semibold text-gray-600 block mb-1">Name</label>
                        <input
                          type="text"
                          value={editForm.display_name}
                          onChange={(e) => setEditForm({ ...editForm, display_name: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-errandify-orange"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-gray-600 block mb-1">Email</label>
                        <input
                          type="email"
                          value={editForm.email}
                          onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-errandify-orange"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-gray-600 block mb-1">Mobile</label>
                        <input
                          type="text"
                          value={editForm.mobile}
                          onChange={(e) => setEditForm({ ...editForm, mobile: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-errandify-orange"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-gray-600 block mb-1">Monthly Household Income</label>
                        <input
                          type="number"
                          value={editForm.monthly_household_income}
                          onChange={(e) => setEditForm({ ...editForm, monthly_household_income: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-errandify-orange"
                        />
                      </div>
                      <div className="flex gap-2 pt-2">
                        <button
                          onClick={handleSaveProfile}
                          disabled={saving}
                          className="flex-1 bg-errandify-orange text-white py-1.5 rounded font-semibold text-xs hover:bg-opacity-90 transition disabled:opacity-50"
                        >
                          {saving ? 'Saving...' : 'Save'}
                        </button>
                        <button
                          onClick={() => setIsEditing(false)}
                          className="flex-1 border border-gray-300 text-gray-700 py-1.5 rounded font-semibold text-xs hover:bg-gray-50 transition"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Private Info */}
                <div className="bg-white rounded-lg shadow p-6 space-y-4">
                  {profileData.userId && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center justify-between">
                      <div>
                        <p className="text-xs text-gray-600 font-semibold">Your User ID</p>
                        <code className="text-sm font-mono font-bold text-errandify-brown">{profileData.userId}</code>
                      </div>
                      <button
                        onClick={() => navigator.clipboard.writeText(profileData.userId || '')}
                        className="text-xs text-errandify-orange hover:text-orange-600 font-semibold transition px-2 py-1 hover:bg-orange-50 rounded"
                      >
                        Copy
                      </button>
                    </div>
                  )}

                  {profileData.chasCardColor && profileData.chasCardColor !== 'none' && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold text-white ${
                        profileData.chasCardColor === 'blue' ? 'bg-blue-600' : 'bg-green-600'
                      }`}>
                        CHAS {profileData.chasCardColor.toUpperCase()} ({profileData.chasSubsidyPercentage}% subsidy)
                      </span>
                    </div>
                  )}
                </div>

                {/* Certificates */}
                <div className="bg-white rounded shadow p-4">
                  <h3 className="text-sm font-bold text-errandify-brown mb-2">📜 Certificates ({certificates.length}/10)</h3>

                  {/* Existing Certificates List */}
                  {certificates.length > 0 && (
                    <div className="mb-3 space-y-1.5">
                      {certificates.map((cert, idx) => (
                        <div key={cert.id} className="flex justify-between items-center bg-gray-50 p-2 rounded text-xs">
                          <span className="text-gray-700">{idx + 1}. {cert.name}</span>
                          <button
                            onClick={() => setCertificates(certificates.filter((_, i) => i !== idx))}
                            className="text-red-600 hover:text-red-700 font-semibold"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {certificates.length < 10 && (
                    <div className="space-y-2">
                      <div>
                        <label className="text-xs font-semibold text-gray-600 block mb-1">Certificate Title</label>
                        <input
                          type="text"
                          value={certificateTitle}
                          onChange={(e) => setCertificateTitle(e.target.value)}
                          placeholder="e.g., AWS Certified Solutions Architect"
                          className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-errandify-orange"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-gray-600 block mb-1">Upload File (Max 5MB)</label>
                        <input
                          type="file"
                          accept=".pdf,.png,.jpg,.jpeg"
                          onChange={(e) => setCertificateFile(e.files?.[0] || null)}
                          className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-errandify-orange"
                        />
                      </div>

                      <button
                        onClick={() => {
                          if (certificateTitle && certificateFile) {
                            setCertificates([...certificates, { id: Date.now().toString(), name: certificateTitle }]);
                            setCertificateTitle('');
                            setCertificateFile(null);
                          }
                        }}
                        disabled={!certificateTitle || !certificateFile}
                        className="w-full bg-errandify-orange text-white py-1.5 rounded font-semibold text-xs hover:bg-opacity-90 transition disabled:opacity-50"
                      >
                        Add Certificate
                      </button>
                    </div>
                  )}

                  {certificates.length === 10 && (
                    <p className="text-xs text-gray-600 text-center py-2">Maximum 10 certificates reached</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
