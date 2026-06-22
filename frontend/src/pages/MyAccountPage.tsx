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
  const [activeSection, setActiveSection] = useState<'dashboard' | 'profile' | null>('dashboard');
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
  const [certificates, setCertificates] = useState<Array<{ id: string; name: string }>>([]);
  const [certificateTitle, setCertificateTitle] = useState('');
  const [certificateFile, setCertificateFile] = useState<File | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        const user = JSON.parse(localStorage.getItem('user') || '{}');

        try {
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
        } catch (error) {
          console.error('Profile API error:', error);
          // Use localStorage data as fallback
          const fallbackProfile: UserProfile = {
            id: user.id || 0,
            userId: user.userId || '',
            name: user.name || 'User',
            email: user.email || '',
            mobile: user.mobile || '',
            role: user.role || 'doer',
            reviewCount: 0,
            completedTasks: 0,
            totalEarnings: 0,
            errandifyPoints: 0,
            categories: [],
          };
          setProfileData(fallbackProfile);
          setEditForm({
            display_name: fallbackProfile.name,
            email: fallbackProfile.email,
            mobile: fallbackProfile.mobile,
            monthly_household_income: '',
          });
        }

        try {
          const ratingsRes = await axios.get(
            `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/users/${user.id}/ratings`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          setRatings(ratingsRes.data.data);
        } catch {
          setRatings({ averageRating: 0, reviewCount: 0, reviews: [] });
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/users/profile`,
        {
          display_name: editForm.display_name,
          email: editForm.email,
          mobile: editForm.mobile,
          monthly_household_income: editForm.monthly_household_income,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setIsEditing(false);
      if (profileData) {
        setProfileData({
          ...profileData,
          name: editForm.display_name,
          email: editForm.email,
          mobile: editForm.mobile,
        });
      }
    } catch (error) {
      console.error('Error saving profile:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-center">Loading account...</div>;
  }

  if (!profileData) {
    return (
      <div className="min-h-screen bg-errandify-bg p-6 pb-24 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">⚠️ Failed to load account</p>
          <p className="text-xs text-gray-600 mb-4">Please try again or log in again</p>
          <div className="flex gap-2">
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-errandify-orange text-white rounded font-semibold text-sm"
            >
              Retry
            </button>
            <button
              onClick={() => navigate('/login')}
              className="px-4 py-2 border border-errandify-orange text-errandify-orange rounded font-semibold text-sm"
            >
              Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  const completeness = Math.round((2 / 5) * 100);
  const badges = ratings.averageRating >= 4.8 ? [{ icon: '⭐' }] : [];

  return (
    <div className="min-h-screen bg-gradient-to-b from-errandify-bg to-white pb-24">
      {/* HERO HEADER */}
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

      {/* MAIN CONTENT */}
      <div className="max-w-6xl mx-auto px-4 py-6 w-full">
        {/* AD CAROUSEL + EVENT BANNER */}
        <div className="mb-4">
          <AdCarousel />
          <div className="mt-2">
            <EventBanner />
          </div>
        </div>

        {/* STICKY TABS - Below banner */}
        <div className="sticky top-20 z-40 bg-white border-b border-gray-200 mb-4 -mx-4 px-3 py-1 overflow-x-auto">
          <div className="flex gap-2 whitespace-nowrap">
            <button
              onClick={() => setActiveSection('dashboard')}
              className={`px-2 py-1 text-xs font-bold transition rounded ${
                activeSection === 'dashboard'
                  ? 'bg-errandify-orange text-white'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
              }`}
            >
              📊 Dashboard
            </button>
            <button
              onClick={() => setActiveSection('profile')}
              className={`px-2 py-1 text-xs font-bold transition rounded ${
                activeSection === 'profile'
                  ? 'bg-errandify-orange text-white'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
              }`}
            >
              👤 MyProfile
            </button>
            <button
              onClick={() => navigate('/my-pocket')}
              className="px-2 py-1 text-xs font-bold transition rounded text-gray-600 hover:text-gray-800 hover:bg-gray-100"
            >
              💰 MyPocket
            </button>
            <button
              onClick={() => navigate('/my-rewards')}
              className="px-2 py-1 text-xs font-bold transition rounded text-gray-600 hover:text-gray-800 hover:bg-gray-100"
            >
              💎 MyRewardSpace
            </button>
            <button
              onClick={() => navigate('/block-list')}
              className="px-2 py-1 text-xs font-bold transition rounded text-gray-600 hover:text-gray-800 hover:bg-gray-100"
            >
              🚫 Blocked
            </button>
            <button
              onClick={() => navigate('/notification-preferences')}
              className="px-2 py-1 text-xs font-bold transition rounded text-gray-600 hover:text-gray-800 hover:bg-gray-100"
            >
              🔔 Notify
            </button>
          </div>
        </div>

        {/* DASHBOARD - Always show first */}
        {activeSection === 'dashboard' && (
          <div className="space-y-1.5">
            {/* DASHBOARD CONTENT */}
            {/* PROFILE HERO CARD */}
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

            {/* STATS GRID */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-1 mb-1">
              <div className="bg-white rounded shadow p-1.5 border-l-4 border-amber-500 text-center">
                <p className="text-lg font-bold text-errandify-orange leading-none">{ratings.reviewCount}</p>
                <p className="text-xs text-gray-600 font-semibold leading-none">👥 Reviews</p>
              </div>
              <div className="bg-white rounded shadow p-1.5 border-l-4 border-green-500 text-center">
                <p className="text-lg font-bold text-errandify-orange leading-none">{profileData.completedTasks || 0}</p>
                <p className="text-xs text-gray-600 font-semibold leading-none">✅ Errands Completed</p>
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

            {/* QUICK ACTIONS */}
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
                <p className="font-bold text-xs text-gray-800">FAQ</p>
              </button>
            </div>
          </div>
        )}

        {/* PROFILE SECTION */}
        {activeSection === 'profile' && (
          <div>
            {/* PROFILE SUBTABS */}
            <div className="flex gap-2 mb-2 border-b border-gray-200">
              <button
                onClick={() => setProfileTab('shared')}
                className={`pb-1.5 font-bold text-xs transition ${
                  profileTab === 'shared'
                    ? 'border-b-4 border-errandify-orange text-errandify-orange'
                    : 'text-gray-600 hover:text-gray-800 border-b-4 border-transparent'
                }`}
              >
                🌐 MyShared Info
              </button>
              <button
                onClick={() => setProfileTab('private')}
                className={`pb-1.5 font-bold text-xs transition ${
                  profileTab === 'private'
                    ? 'border-b-4 border-errandify-orange text-errandify-orange'
                    : 'text-gray-600 hover:text-gray-800 border-b-4 border-transparent'
                }`}
              >
                🔒 MyPrivate Info
              </button>
            </div>

            {/* SHARED INFO */}
            {profileTab === 'shared' && (
              <div className="space-y-2">
                {/* Profile Card */}
                <div className="bg-white rounded border border-gray-200 overflow-hidden">
                  <div className="bg-gradient-to-r from-errandify-orange to-orange-500 p-3 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-sm font-bold">{profileData.name}</h2>
                        <p className="text-xs opacity-90">{profileData.role === 'asker' ? '📍 Asker' : '💪 Doer'}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold">{ratings.averageRating.toFixed(1)}</p>
                        <p className="text-xs">⭐ Rating</p>
                      </div>
                    </div>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-3 gap-1 p-2 border-t border-gray-100">
                    <div className="text-center">
                      <p className="text-sm font-bold text-errandify-orange">{ratings.reviewCount}</p>
                      <p className="text-xs text-gray-600">Reviews</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-bold text-errandify-orange">{profileData.completedTasks || 0}</p>
                      <p className="text-xs text-gray-600">Errands</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-bold text-errandify-orange">{profileData.categories?.length || 0}</p>
                      <p className="text-xs text-gray-600">Skills</p>
                    </div>
                  </div>
                </div>

                {/* Skills */}
                {profileData.categories && profileData.categories.length > 0 && (
                  <div className="bg-white rounded border border-gray-200 p-2">
                    <h3 className="text-xs font-bold text-errandify-brown mb-1.5">🎯 Skills</h3>
                    <div className="flex flex-wrap gap-1">
                      {profileData.categories.slice(0, 6).map((cat, idx) => (
                        <span key={idx} className="bg-orange-100 text-errandify-orange text-xs font-semibold px-2 py-1 rounded">
                          {cat}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* PRIVATE INFO */}
            {profileTab === 'private' && (
              <div className="space-y-2">
                <div className="bg-green-50 border-l-4 border-green-500 rounded p-2 mb-2">
                  <p className="text-xs font-bold text-green-900">🔒 PRIVATE</p>
                  <p className="text-xs text-green-800 mt-0.5">Only you see this</p>
                </div>

                {/* Edit Form */}
                <div className="bg-white rounded shadow p-3">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-bold text-errandify-brown">📝 Edit Profile</h3>
                    {!isEditing && (
                      <button
                        onClick={() => setIsEditing(true)}
                        className="text-xs text-errandify-orange font-semibold hover:underline"
                      >
                        Edit
                      </button>
                    )}
                  </div>

                  {isEditing ? (
                    <div className="space-y-2">
                      <div>
                        <label className="text-xs font-semibold text-gray-600 block mb-1">Name</label>
                        <input
                          type="text"
                          value={editForm.display_name}
                          onChange={(e) => setEditForm({ ...editForm, display_name: e.target.value })}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-gray-600 block mb-1">Email</label>
                        <input
                          type="email"
                          value={editForm.email}
                          onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-gray-600 block mb-1">Mobile</label>
                        <input
                          type="text"
                          value={editForm.mobile}
                          onChange={(e) => setEditForm({ ...editForm, mobile: e.target.value })}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={handleSaveProfile}
                          disabled={saving}
                          className="flex-1 bg-errandify-orange text-white py-1 rounded font-semibold text-xs"
                        >
                          {saving ? 'Saving...' : 'Save'}
                        </button>
                        <button
                          onClick={() => setIsEditing(false)}
                          className="flex-1 border border-gray-300 text-gray-700 py-1 rounded font-semibold text-xs"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1.5 text-xs">
                      <div>
                        <p className="text-gray-600 font-semibold">Name</p>
                        <p className="text-gray-800">{profileData.name}</p>
                      </div>
                      <div>
                        <p className="text-gray-600 font-semibold">Email</p>
                        <p className="text-gray-800">{profileData.email || 'Not set'}</p>
                      </div>
                      <div>
                        <p className="text-gray-600 font-semibold">Mobile</p>
                        <p className="text-gray-800">{profileData.mobile || 'Not set'}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Certificates */}
                <div className="bg-white rounded shadow p-3">
                  <h3 className="text-xs font-bold text-errandify-brown mb-1.5">📜 Certificates ({certificates.length}/10)</h3>
                  {certificates.length > 0 && (
                    <div className="mb-2 space-y-1">
                      {certificates.map((cert, idx) => (
                        <div key={cert.id} className="flex justify-between items-center bg-gray-50 p-1.5 rounded text-xs">
                          <span>{idx + 1}. {cert.name}</span>
                          <button onClick={() => setCertificates(certificates.filter((_, i) => i !== idx))} className="text-red-600 text-xs">✕</button>
                        </div>
                      ))}
                    </div>
                  )}
                  {certificates.length < 10 && (
                    <div className="space-y-1">
                      <input
                        type="text"
                        value={certificateTitle}
                        onChange={(e) => setCertificateTitle(e.target.value)}
                        placeholder="Certificate title"
                        className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                      />
                      <input type="file" onChange={(e) => setCertificateFile(e.files?.[0] || null)} className="w-full text-xs" />
                      <button
                        onClick={() => {
                          if (certificateTitle && certificateFile) {
                            setCertificates([...certificates, { id: Date.now().toString(), name: certificateTitle }]);
                            setCertificateTitle('');
                            setCertificateFile(null);
                          }
                        }}
                        className="w-full bg-errandify-orange text-white py-1 rounded font-semibold text-xs"
                      >
                        Add
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* BOTTOM QUICK LINKS - ONLY SHOW ON DASHBOARD */}
        {activeSection === 'dashboard' && (
          <div className="mt-4 pt-4 border-t-2 border-gray-200">
            <div className="flex gap-1 overflow-x-auto pb-2 flex-wrap">
              {/* Quick links section if needed in future */}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
