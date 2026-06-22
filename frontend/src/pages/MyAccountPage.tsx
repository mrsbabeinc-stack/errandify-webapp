import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import AdCarousel from '../components/AdCarousel';
import EventBanner from '../components/EventBanner';

interface UserProfile {
  id?: number;
  userId?: string;
  name: string;
  alias?: string;
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
  profileImage?: string;
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
  const [activeSection, setActiveSection] = useState<'dashboard' | 'profile' | 'pocket' | 'rewards' | 'blocked' | 'notify' | null>('dashboard');
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
    alias: '',
    bio: '',
    email: '',
    mobile: '',
    monthly_household_income: '',
  });
  const [saving, setSaving] = useState(false);
  const [certificates, setCertificates] = useState<Array<{ id: string; name: string; fileData?: string; fileName?: string }>>([]);
  const [certificateTitle, setCertificateTitle] = useState('');
  const [certificateFile, setCertificateFile] = useState<File | null>(null);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Track unsaved changes
  useEffect(() => {
    if (isEditing && (editForm.display_name || editForm.alias || editForm.bio || profileImage)) {
      setHasUnsavedChanges(true);
    }
  }, [editForm, profileImage, isEditing]);

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
      // Moderate alias and bio before saving
      const aliasResult = await moderateText(editForm.alias || '');
      const bioResult = await moderateText(editForm.bio || '');

      if (!aliasResult.approved) {
        alert('❌ Alias contains inappropriate content. Please revise.');
        setSaving(false);
        return;
      }

      if (!bioResult.approved) {
        alert('❌ Bio contains inappropriate content. Please revise.');
        setSaving(false);
        return;
      }

      const token = localStorage.getItem('token');
      await axios.put(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/users/profile`,
        {
          display_name: editForm.display_name,
          alias: editForm.alias,
          bio: editForm.bio,
          email: editForm.email,
          mobile: editForm.mobile,
          monthly_household_income: editForm.monthly_household_income,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setIsEditing(false);
      setHasUnsavedChanges(false);
      if (profileData) {
        setProfileData({
          ...profileData,
          name: editForm.display_name,
          alias: editForm.alias,
          bio: editForm.bio,
          email: editForm.email,
          mobile: editForm.mobile,
        });
      }
      alert('✅ Profile saved successfully!');
    } catch (error) {
      console.error('Error saving profile:', error);
      alert('Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/users/profile`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      navigate('/login');
    } catch (error) {
      console.error('Error deleting account:', error);
      alert('Failed to delete account');
    }
  };

  const moderateText = async (text: string): Promise<{ approved: boolean; message?: string }> => {
    if (!text || text.length === 0) return { approved: true };

    try {
      const qwenApiKey = import.meta.env.VITE_QWEN_API_KEY;
      if (!qwenApiKey) {
        console.warn('Qwen API key not configured - skipping text moderation');
        return { approved: true, message: '⚠️ Text moderation not configured' };
      }

      const response = await axios.post(
        'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation',
        {
          model: 'qwen-plus',
          input: {
            messages: [
              {
                role: 'user',
                content: `Review this user-generated text for appropriateness on a marketplace. Check for: hate speech, violence, explicit content, spam, scams, or offensive language. Text: "${text}". Reply with only "APPROVED" if appropriate, or "REJECTED: [reason]" if not.`,
              },
            ],
          },
        },
        {
          headers: {
            Authorization: `Bearer ${qwenApiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const result = response.data.output?.choices?.[0]?.message?.content;
      const approved = result && result.includes('APPROVED');
      return { approved };
    } catch (error) {
      console.error('Text moderation error:', error);
      return { approved: true, message: '⚠️ Could not verify content' }; // Fallback: allow if API fails
    }
  };

  const handleProfileImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        alert('File size exceeds 5MB limit');
        return;
      }

      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64Image = event.target?.result as string;

        // Moderate image with AI
        try {
          const qwenApiKey = import.meta.env.VITE_QWEN_API_KEY;
          if (!qwenApiKey) {
            console.warn('Qwen API key not configured - accepting image without moderation');
            setProfileImage(base64Image);
            return;
          }

          const base64Data = base64Image.split(',')[1];

          const response = await axios.post(
            'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation',
            {
              model: 'qwen-vl-plus',
              input: {
                messages: [
                  {
                    role: 'user',
                    content: [
                      {
                        type: 'image',
                        image: `data:image/jpeg;base64,${base64Data}`,
                      },
                      {
                        type: 'text',
                        text: 'Is this image appropriate for a professional profile photo on a marketplace? Check for: nudity, violence, hate symbols, weapons, drugs, or anything offensive. Reply with only "APPROVED" if appropriate, or "REJECTED: [reason]" if not.',
                      },
                    ],
                  },
                ],
              },
            },
            {
              headers: {
                Authorization: `Bearer ${qwenApiKey}`,
                'Content-Type': 'application/json',
              },
            }
          );

          const result = response.data.output?.choices?.[0]?.message?.content;

          if (result && result.includes('APPROVED')) {
            setProfileImage(base64Image);
          } else {
            const reason = result?.replace('REJECTED: ', '') || 'Image does not meet community standards';
            alert(`❌ Photo rejected: ${reason}`);
          }
        } catch (error) {
          console.error('Image moderation error:', error);
          // Fallback: accept image if moderation fails
          setProfileImage(base64Image);
        }
      };
      reader.readAsDataURL(file);
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
          <div className="relative group">
            <button className="bg-white bg-opacity-20 hover:bg-opacity-30 text-white px-3 py-1.5 rounded-lg font-semibold text-sm transition">
              ⚙️
            </button>
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-2.5 text-sm text-gray-800 hover:bg-gray-100 font-semibold first:rounded-t-lg flex items-center gap-2"
              >
                🚪 Logout
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 font-semibold last:rounded-b-lg flex items-center gap-2"
              >
                🗑️ Delete Account
              </button>
            </div>
          </div>
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
              onClick={() => setActiveSection('pocket')}
              className={`px-2 py-1 text-xs font-bold transition rounded ${
                activeSection === 'pocket'
                  ? 'bg-errandify-orange text-white'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
              }`}
            >
              💰 MyPocket
            </button>
            <button
              onClick={() => setActiveSection('rewards')}
              className={`px-2 py-1 text-xs font-bold transition rounded ${
                activeSection === 'rewards'
                  ? 'bg-errandify-orange text-white'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
              }`}
            >
              💎 MyRewardSpace
            </button>
            <button
              onClick={() => setActiveSection('blocked')}
              className={`px-2 py-1 text-xs font-bold transition rounded ${
                activeSection === 'blocked'
                  ? 'bg-errandify-orange text-white'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
              }`}
            >
              🚫 Blocked
            </button>
            <button
              onClick={() => setActiveSection('notify')}
              className={`px-2 py-1 text-xs font-bold transition rounded ${
                activeSection === 'notify'
                  ? 'bg-errandify-orange text-white'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
              }`}
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
                {/* Profile Photo + Alias Header */}
                <div className="bg-white rounded border border-gray-200 p-3 flex items-center gap-3">
                  {profileImage ? (
                    <img src={profileImage} alt="Profile" className="w-20 h-20 rounded-full object-cover border-2 border-errandify-orange flex-shrink-0" />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-orange-100 flex items-center justify-center text-4xl flex-shrink-0">👤</div>
                  )}
                  <div className="flex-1">
                    <h2 className="text-base font-bold text-errandify-brown">{editForm.alias || profileData.name}</h2>
                    <p className="text-xs text-gray-600 mt-1">{editForm.bio || 'No bio yet'}</p>
                  </div>
                </div>

                {/* Personal Information */}
                <div className="bg-white rounded border border-gray-200 p-2">
                  <h3 className="text-xs font-bold text-errandify-brown mb-2">✅ Personal Information</h3>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Alias:</span>
                      <span className="font-semibold text-gray-900">{editForm.alias || profileData.name || 'Not set'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Gender:</span>
                      <span className="font-semibold text-gray-900">Not set</span>
                    </div>
                  </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-amber-50 border border-amber-200 rounded p-3 text-center">
                    <p className="text-2xl font-bold text-errandify-orange">3</p>
                    <p className="text-xs text-gray-600 mt-1">❤️ Trusted User</p>
                  </div>
                  <div className="bg-amber-50 border border-amber-200 rounded p-3 text-center">
                    <p className="text-2xl font-bold text-errandify-orange">{profileData.completedTasks || 0}</p>
                    <p className="text-xs text-gray-600 mt-1">💪 Errand Completed</p>
                  </div>
                  <div className="bg-amber-50 border border-amber-200 rounded p-3 text-center">
                    <p className="text-2xl font-bold text-errandify-orange">30</p>
                    <p className="text-xs text-gray-600 mt-1">📋 Errand Posted</p>
                  </div>
                </div>

                {/* Certified Badges */}
                <div className="bg-white rounded border border-gray-200 p-2">
                  <button className="flex items-center justify-between w-full mb-2">
                    <h3 className="text-xs font-bold text-errandify-brown">🎖️ Certified Badges</h3>
                    <span className="text-xs">▼</span>
                  </button>
                  <div className="space-y-1">
                    <div className="bg-yellow-50 border border-yellow-200 rounded px-2 py-1">
                      <p className="text-xs">🏆 wellness & health coach</p>
                    </div>
                  </div>
                </div>

                {/* Award Badges */}
                <div className="bg-white rounded border border-gray-200 p-2">
                  <button className="flex items-center justify-between w-full mb-2">
                    <h3 className="text-xs font-bold text-errandify-brown">🎗️ Award Badges</h3>
                    <span className="text-xs">▼</span>
                  </button>
                  <div className="text-xs text-gray-600 text-center py-2">
                    No badges yet
                  </div>
                </div>
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
                      {hasUnsavedChanges && (
                        <div className="bg-yellow-50 border-l-4 border-yellow-500 rounded p-2">
                          <p className="text-xs text-yellow-900 font-semibold">
                            ⚠️ You have unsaved changes. Click "Save All Changes" at the end to save.
                          </p>
                        </div>
                      )}
                      <div>
                        <label className="text-xs font-semibold text-gray-600 block mb-1">Name <span className="text-gray-400">(from SingPass - cannot change)</span></label>
                        <input
                          type="text"
                          value={editForm.display_name}
                          disabled
                          className="w-full px-2 py-1 border border-gray-300 rounded text-xs bg-gray-100 text-gray-600 cursor-not-allowed"
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

                {/* Profile Photo Upload */}
                <div className="bg-white rounded shadow p-3">
                  <h3 className="text-xs font-bold text-errandify-brown mb-2">📸 Profile Photo</h3>
                  <div className="flex gap-3 items-start">
                    {profileImage && (
                      <img src={profileImage} alt="Profile" className="w-16 h-16 rounded-full object-cover border-2 border-errandify-orange" />
                    )}
                    <div className="flex-1">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleProfileImageUpload}
                        className="w-full text-xs mb-1"
                      />
                      <p className="text-xs text-gray-600">JPG, PNG or WebP. Max 5MB. Will auto-adjust.</p>
                    </div>
                  </div>
                </div>

                {/* Alias Setup */}
                <div className="bg-white rounded shadow p-3">
                  <h3 className="text-xs font-bold text-errandify-brown mb-2">🎭 Set Alias</h3>
                  <input
                    type="text"
                    value={editForm.alias || ''}
                    onChange={(e) => setEditForm({ ...editForm, alias: e.target.value })}
                    placeholder="Enter your alias (instead of name)"
                    className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                  />
                  <p className="text-xs text-gray-600 mt-1">This is how others will see you in the app</p>
                </div>

                {/* Bio */}
                <div className="bg-white rounded shadow p-3">
                  <h3 className="text-xs font-bold text-errandify-brown mb-2">✍️ Bio</h3>
                  <textarea
                    value={editForm.bio || ''}
                    onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                    placeholder="Write a short bio about yourself"
                    maxLength={200}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-xs resize-none"
                    rows={3}
                  />
                  <p className="text-xs text-gray-600 mt-1 mb-2">{editForm.bio?.length || 0}/200</p>
                </div>

                {/* Delete Account Confirmation Modal */}
                {showDeleteConfirm && (
                  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-lg p-4 max-w-sm mx-2">
                      <h2 className="text-lg font-bold text-red-600 mb-2">⚠️ Delete Account</h2>
                      <p className="text-xs text-gray-700 mb-4">
                        Are you sure? This action cannot be undone and will permanently delete your account and all data.
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setShowDeleteConfirm(false)}
                          className="flex-1 border border-gray-300 text-gray-700 py-2 rounded font-bold text-sm hover:bg-gray-50 transition"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleDeleteAccount}
                          className="flex-1 bg-red-600 text-white py-2 rounded font-bold text-sm hover:bg-red-700 transition"
                        >
                          Yes, Delete
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Certificates */}
                <div className="bg-white rounded shadow p-3">
                  <h3 className="text-xs font-bold text-errandify-brown mb-1.5">📜 Certificates ({certificates.length}/10)</h3>
                  {certificates.length > 0 && (
                    <div className="mb-2 space-y-1">
                      {certificates.map((cert, idx) => (
                        <div key={cert.id} className="flex justify-between items-center bg-gray-50 p-1.5 rounded text-xs hover:bg-gray-100 transition">
                          <div className="flex-1">
                            <p className="font-semibold text-gray-900">{idx + 1}. {cert.name}</p>
                            {cert.fileName && <p className="text-gray-500 text-xs">{cert.fileName}</p>}
                          </div>
                          <div className="flex gap-1">
                            {cert.fileData && (
                              <a
                                href={cert.fileData}
                                download={cert.fileName || `certificate-${idx + 1}`}
                                className="text-blue-600 hover:text-blue-800 font-semibold"
                              >
                                📥
                              </a>
                            )}
                            <button
                              onClick={() => setCertificates(certificates.filter((_, i) => i !== idx))}
                              className="text-red-600 hover:text-red-800 font-semibold"
                            >
                              ✕
                            </button>
                          </div>
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
                      <input
                        type="file"
                        onChange={(e) => {
                          const file = e.target.files?.[0] || null;
                          setCertificateFile(file);
                          console.log('File selected:', file?.name);
                        }}
                        className="w-full text-xs"
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      />
                      {certificateFile && (
                        <p className="text-xs text-green-600 font-semibold">✓ File selected: {certificateFile.name}</p>
                      )}
                      <button
                        onClick={async () => {
                          if (!certificateTitle) {
                            alert('Please enter a certificate title');
                            return;
                          }
                          if (!certificateFile) {
                            alert('Please select a certificate file');
                            return;
                          }

                          // Moderate certificate title
                          const titleResult = await moderateText(certificateTitle);
                          if (!titleResult.approved) {
                            alert('❌ Certificate title contains inappropriate content. Please revise.');
                            return;
                          }

                          // File size check (10MB max for certificates)
                          if (certificateFile.size > 10 * 1024 * 1024) {
                            alert('Certificate file exceeds 10MB limit');
                            return;
                          }

                          // Read file as data URL for preview
                          const reader = new FileReader();
                          reader.onload = (e) => {
                            const fileData = e.target?.result as string;
                            setCertificates([...certificates, {
                              id: Date.now().toString(),
                              name: certificateTitle,
                              fileData,
                              fileName: certificateFile.name
                            }]);
                            setCertificateTitle('');
                            setCertificateFile(null);
                            alert('✅ Certificate added successfully!');
                          };
                          reader.readAsDataURL(certificateFile);
                        }}
                        disabled={!certificateTitle || !certificateFile}
                        className="w-full bg-errandify-orange text-white py-1.5 rounded font-semibold text-xs disabled:opacity-50 disabled:cursor-not-allowed hover:bg-orange-600 disabled:hover:bg-errandify-orange"
                      >
                        {certificateTitle && certificateFile ? '✅ Add Certificate' : '⊙ Add Certificate'}
                      </button>
                    </div>
                  )}
                </div>

                {/* Save All Changes Button - At The End */}
                <button
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="w-full bg-errandify-orange text-white py-2.5 rounded font-bold text-xs hover:bg-orange-600 disabled:opacity-50 transition mt-2"
                >
                  {saving ? '⏳ Saving All Changes...' : '💾 Save All Changes'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* MYPOCKET SECTION */}
        {activeSection === 'pocket' && (
          <div className="space-y-2">
            {/* Balance Card */}
            <div className="bg-gradient-to-br from-errandify-orange to-orange-600 text-white rounded-lg p-3 shadow-md">
              <p className="text-xs opacity-90">Balance</p>
              <h2 className="text-3xl font-bold mb-1">$450.50</h2>
              <div className="flex gap-2 text-xs">
                <div className="bg-white bg-opacity-20 rounded px-2 py-1">
                  <p className="font-bold">Earned</p>
                  <p>$1,250.00</p>
                </div>
                <div className="bg-white bg-opacity-20 rounded px-2 py-1">
                  <p className="font-bold">Spent</p>
                  <p>$320.50</p>
                </div>
                <div className="bg-white bg-opacity-20 rounded px-2 py-1">
                  <p className="font-bold">Pending</p>
                  <p>$150.00</p>
                </div>
              </div>
            </div>

            {/* Transactions */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="bg-errandify-orange text-white p-2">
                <h3 className="text-xs font-bold">📋 Recent Transactions</h3>
              </div>
              <div className="divide-y divide-gray-100 text-xs">
                <div className="p-2 flex justify-between hover:bg-gray-50">
                  <div>
                    <p className="font-bold text-gray-900">Completed Errand (#5): Clean apartment</p>
                    <p className="text-gray-500">Today 10:28 AM</p>
                  </div>
                  <p className="font-bold text-green-600">+$80</p>
                </div>
                <div className="p-2 flex justify-between hover:bg-gray-50">
                  <div>
                    <p className="font-bold text-gray-900">Posted Errand (#8): Home repairs</p>
                    <p className="text-gray-500">Yesterday 10:25 PM</p>
                  </div>
                  <p className="font-bold text-red-600">-$120</p>
                </div>
                <div className="p-2 flex justify-between hover:bg-gray-50">
                  <div>
                    <p className="font-bold text-gray-900">Referral: @SunnyLove joined</p>
                    <p className="text-gray-500">2 days ago</p>
                  </div>
                  <p className="font-bold text-green-600">+$50</p>
                </div>
              </div>
            </div>

            {/* Payout Status */}
            <div className="bg-white rounded-lg border border-gray-200 p-3">
              <h3 className="text-xs font-bold text-errandify-brown mb-2">💳 Payout Status</h3>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-600">Bank</span>
                  <span className="font-bold">STRIPE TEST BANK</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Account</span>
                  <span className="font-bold">•••• •••• •••• 3456</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Status</span>
                  <span className="font-bold text-green-600">✓ Approved</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MYREWARDSPACE SECTION */}
        {activeSection === 'rewards' && (
          <div className="space-y-2">
            {/* Errandify Points Card */}
            <div className="bg-gradient-to-br from-errandify-orange to-orange-600 text-white rounded-lg p-3">
              <p className="text-xs opacity-90 mb-1">Available Points</p>
              <p className="text-3xl font-bold mb-2">25 EP</p>
              <p className="text-xs opacity-80 bg-orange-700 bg-opacity-50 rounded p-1.5">
                ⚠️ Expiring Soon: 25 pts will expire on 30/06/2027
              </p>
            </div>

            {/* Redeem & Gift Buttons */}
            <div className="flex gap-2">
              <button className="flex-1 bg-errandify-orange text-white py-2 rounded font-bold text-xs hover:bg-orange-600">
                🎁 Redeem Now
              </button>
              <button className="flex-1 border-2 border-errandify-orange text-errandify-orange py-2 rounded font-bold text-xs hover:bg-orange-50">
                🎀 Send A Gift
              </button>
            </div>

            {/* Available Rewards */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="bg-errandify-orange text-white p-2">
                <h3 className="text-xs font-bold">🎁 MyRewards</h3>
              </div>
              <div className="divide-y divide-gray-100 text-xs">
                <div className="p-2 flex justify-between items-center hover:bg-gray-50">
                  <div>
                    <p className="font-bold text-gray-900">$5 Discount</p>
                    <p className="text-errandify-orange font-bold">50 EP</p>
                  </div>
                  <button className="bg-errandify-orange text-white px-2 py-1 rounded text-xs font-bold">Redeem</button>
                </div>
                <div className="p-2 flex justify-between items-center hover:bg-gray-50">
                  <div>
                    <p className="font-bold text-gray-900">$10 Discount</p>
                    <p className="text-errandify-orange font-bold">100 EP</p>
                  </div>
                  <button className="bg-errandify-orange text-white px-2 py-1 rounded text-xs font-bold">Redeem</button>
                </div>
                <div className="p-2 flex justify-between items-center hover:bg-gray-50">
                  <div>
                    <p className="font-bold text-gray-900">$20 Discount</p>
                    <p className="text-errandify-orange font-bold">200 EP</p>
                  </div>
                  <button className="bg-gray-300 text-gray-500 px-2 py-1 rounded text-xs font-bold">Need</button>
                </div>
              </div>
            </div>

            {/* Point History */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="bg-errandify-orange text-white p-2">
                <h3 className="text-xs font-bold">📜 Point History</h3>
              </div>
              <div className="divide-y divide-gray-100 text-xs">
                <div className="p-2 flex justify-between hover:bg-gray-50">
                  <div>
                    <p className="font-bold text-gray-900">Completed Errand</p>
                    <p className="text-gray-500">17-06-2026</p>
                  </div>
                  <p className="font-bold text-green-600">+10 EP</p>
                </div>
                <div className="p-2 flex justify-between hover:bg-gray-50">
                  <div>
                    <p className="font-bold text-gray-900">Referred Friend @SunnyLove</p>
                    <p className="text-gray-500">12-06-2026</p>
                  </div>
                  <p className="font-bold text-green-600">+50 EP</p>
                </div>
                <div className="p-2 flex justify-between hover:bg-gray-50">
                  <div>
                    <p className="font-bold text-gray-900">Redeemed Discount</p>
                    <p className="text-gray-500">10-06-2026</p>
                  </div>
                  <p className="font-bold text-red-600">-50 EP</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* BLOCKED SECTION */}
        {activeSection === 'blocked' && (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="bg-errandify-orange text-white p-2">
              <h3 className="text-xs font-bold">🚫 Blocked Users</h3>
            </div>
            <div className="text-center text-gray-600 py-6 px-4">
              <p className="mb-2 text-sm">No blocked users yet</p>
              <p className="text-xs">Users you block won't be able to contact you or see your profile</p>
            </div>
          </div>
        )}

        {/* NOTIFICATION PREFERENCES SECTION */}
        {activeSection === 'notify' && (
          <div>
            <div className="bg-white rounded-lg shadow p-4 space-y-3">
              <h2 className="text-lg font-bold text-errandify-brown mb-4">🔔 Notification Preferences</h2>

              {/* Critical Section */}
              <div className="border border-red-200 rounded overflow-hidden">
                <div className="px-3 py-2 bg-red-500 text-white">
                  <h3 className="text-xs font-bold">🔴 Critical (Always On)</h3>
                </div>
                <div className="divide-y divide-gray-100 p-2 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span>✓ Offer Confirmed</span>
                    <span className="bg-green-500 text-white px-2 py-1 rounded text-xs">ON</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span>✓ Errand Reopened</span>
                    <span className="bg-green-500 text-white px-2 py-1 rounded text-xs">ON</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span>✓ Payment Released</span>
                    <span className="bg-green-500 text-white px-2 py-1 rounded text-xs">ON</span>
                  </div>
                </div>
              </div>

              {/* Important Section */}
              <div className="border border-yellow-200 rounded overflow-hidden">
                <div className="px-3 py-2 bg-yellow-500 text-white">
                  <h3 className="text-xs font-bold">🟡 Important</h3>
                </div>
                <div className="divide-y divide-gray-100 p-2 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span>New Offer</span>
                    <span className="bg-gray-300 text-gray-700 px-2 py-1 rounded text-xs">Toggle</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span>Message Received</span>
                    <span className="bg-gray-300 text-gray-700 px-2 py-1 rounded text-xs">Toggle</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span>Errand Done</span>
                    <span className="bg-gray-300 text-gray-700 px-2 py-1 rounded text-xs">Toggle</span>
                  </div>
                </div>
              </div>

              {/* Optional Section */}
              <div className="border border-green-200 rounded overflow-hidden">
                <div className="px-3 py-2 bg-green-500 text-white">
                  <h3 className="text-xs font-bold">🟢 Optional</h3>
                </div>
                <div className="divide-y divide-gray-100 p-2 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span>Profile Viewed</span>
                    <span className="bg-gray-300 text-gray-700 px-2 py-1 rounded text-xs">Toggle</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span>Referral Activity</span>
                    <span className="bg-gray-300 text-gray-700 px-2 py-1 rounded text-xs">Toggle</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span>Platform Updates</span>
                    <span className="bg-gray-300 text-gray-700 px-2 py-1 rounded text-xs">Toggle</span>
                  </div>
                </div>
              </div>
            </div>
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
