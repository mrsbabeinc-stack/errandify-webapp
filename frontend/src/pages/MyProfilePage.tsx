import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

interface UserProfile {
  id: number;
  userId?: string;
  name: string;
  mobile: string;
  role: 'asker' | 'doer';
  categories: string[];
  monthlyHouseholdIncome?: number;
  chasCardColor?: string;
  chasSubsidyPercentage?: number;
  bio?: string;
  completedTasks?: number;
  totalEarnings?: number;
  responseTime?: number;
  availableForWork?: boolean;
}

interface Rating {
  score: number;
  comment: string;
  createdAt: string;
}

export default function MyProfilePage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [ratings, setRatings] = useState<{ averageRating: number; reviewCount: number; reviews: Rating[] }>({
    averageRating: 0,
    reviewCount: 0,
    reviews: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    display_name: '',
    mobile: '',
    monthly_household_income: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem('token');
        const userStr = localStorage.getItem('user');
        const user = userStr ? JSON.parse(userStr) : null;

        if (!user?.id) {
          setError('User not found');
          setLoading(false);
          return;
        }

        // Fetch profile
        const profileRes = await axios.get(
          `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/users/profile`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        setProfile(profileRes.data.data);
        setEditForm({
          display_name: profileRes.data.data.name || '',
          mobile: profileRes.data.data.mobile || '',
          monthly_household_income: profileRes.data.data.monthlyHouseholdIncome ? String(profileRes.data.data.monthlyHouseholdIncome) : '',
        });

        // Fetch ratings
        const ratingsRes = await axios.get(
          `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/users/${user.id}/ratings`
        );

        setRatings(ratingsRes.data.data);
      } catch (err: any) {
        console.error('Profile fetch error:', err);
        setError(err.response?.data?.error || 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

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

      setProfile({
        ...profile,
        ...response.data.data,
      });
      setIsEditing(false);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <span key={star} className="text-lg">
            {star <= Math.round(rating) ? '⭐' : '☆'}
          </span>
        ))}
      </div>
    );
  };

  if (loading) return <div className="p-6 text-center">Loading profile...</div>;
  if (error) return <div className="p-6 text-center text-red-600">{error}</div>;
  if (!profile) return <div className="p-6 text-center">Profile not found</div>;

  const getProfileCompleteness = () => {
    let complete = 0;
    if (profile.name) complete++;
    if (profile.mobile) complete++;
    if (profile.categories.length > 0) complete++;
    if (profile.bio) complete++;
    if (profile.monthlyHouseholdIncome) complete++;
    return Math.round((complete / 5) * 100);
  };

  const getBadges = () => {
    const badges = [];
    if (ratings.averageRating >= 4.8) badges.push({ icon: '⭐', label: 'Trusted Expert', color: 'bg-blue-50 border-blue-200' });
    if (ratings.reviewCount >= 50) badges.push({ icon: '🏆', label: 'Top Performer', color: 'bg-yellow-50 border-yellow-200' });
    if (ratings.averageRating === 5 && ratings.reviewCount >= 10) badges.push({ icon: '✨', label: 'Perfect Rating', color: 'bg-purple-50 border-purple-200' });
    if (profile.completedTasks && profile.completedTasks >= 100) badges.push({ icon: '🚀', label: 'Century Club', color: 'bg-green-50 border-green-200' });
    return badges;
  };

  const completeness = getProfileCompleteness();
  const badges = getBadges();

  return (
    <div className="min-h-screen bg-errandify-bg pb-24">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <button
          onClick={() => navigate(-1)}
          className="text-errandify-orange font-semibold mb-4 text-sm hover:underline"
        >
          ← Back
        </button>

        <h1 className="text-3xl font-bold text-errandify-brown mb-6">My Profile</h1>

        {/* Profile Header Card - Enhanced */}
        <div className="bg-gradient-to-r from-errandify-orange to-orange-400 rounded-lg shadow-lg p-6 mb-6 text-white">
          <div className="flex gap-4 mb-4">
            <div className="text-6xl drop-shadow-lg">👤</div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-2xl font-bold">{profile.name}</h2>
                <span className="text-xl">✅</span>
              </div>
              <p className="text-orange-50 text-sm mb-2">{profile.role === 'asker' ? '📍 Asker' : '💪 Doer'}</p>

              {/* Badges Row */}
              {badges.length > 0 && (
                <div className="flex gap-2 flex-wrap mt-2">
                  {badges.map((badge, idx) => (
                    <div key={idx} className="text-xs bg-white bg-opacity-20 px-2 py-1 rounded-full backdrop-blur">
                      {badge.icon} {badge.label}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Profile Completion Bar */}
          <div className="mt-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-semibold">Profile Completeness</span>
              <span className="text-sm font-bold">{completeness}%</span>
            </div>
            <div className="w-full bg-white bg-opacity-30 rounded-full h-2">
              <div
                className="bg-white rounded-full h-2 transition-all duration-300"
                style={{ width: `${completeness}%` }}
              />
            </div>
          </div>
        </div>

        {/* Quick Stats Cards */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-white rounded-lg shadow p-4 text-center">
            <p className="text-3xl font-bold text-errandify-orange">{ratings.averageRating.toFixed(1)}</p>
            <p className="text-xs text-gray-600 font-semibold">⭐ Rating</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4 text-center">
            <p className="text-3xl font-bold text-errandify-orange">{ratings.reviewCount}</p>
            <p className="text-xs text-gray-600 font-semibold">👥 Reviews</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4 text-center">
            <p className="text-3xl font-bold text-errandify-orange">{profile.categories.length}</p>
            <p className="text-xs text-gray-600 font-semibold">🎯 Skills</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4 text-center">
            <p className="text-3xl font-bold text-errandify-orange">{profile.completedTasks || 0}</p>
            <p className="text-xs text-gray-600 font-semibold">✅ Tasks</p>
          </div>
        </div>

        {/* Profile Card - Enhanced */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">

              {/* User ID */}
              {profile.userId && (
                <div className="mt-2 bg-amber-50 border border-amber-200 rounded-lg p-2 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-600 font-semibold">Your User ID</p>
                    <code className="text-sm font-mono font-bold text-errandify-brown">{profile.userId}</code>
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(profile.userId || '');
                    }}
                    className="text-xs text-errandify-orange hover:text-orange-600 font-semibold transition px-2 py-1 hover:bg-orange-50 rounded"
                  >
                    Copy
                  </button>
                </div>
              )}

              <p className="text-xs text-gray-500 mt-2">Role: {profile.role === 'asker' ? 'Asker' : 'Doer'}</p>
              {profile.chasCardColor && profile.chasCardColor !== 'none' && (
                <div className="mt-2 inline-block">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold text-white ${
                    profile.chasCardColor === 'blue' ? 'bg-orange-600' : 'bg-green-600'
                  }`}>
                    CHAS {profile.chasCardColor.toUpperCase()} ({profile.chasSubsidyPercentage}% subsidy)
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 py-4 border-y border-gray-200 mb-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-errandify-orange">{ratings.reviewCount}</p>
              <p className="text-xs text-gray-600">Reviews</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-errandify-orange">{ratings.averageRating.toFixed(1)}</p>
              <p className="text-xs text-gray-600">Rating</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-errandify-orange">{profile.categories.length}</p>
              <p className="text-xs text-gray-600">Categories</p>
            </div>
          </div>

          {isEditing ? (
            <div className="space-y-4">
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
                <label className="text-xs font-semibold text-gray-600 block mb-1">Mobile</label>
                <input
                  type="text"
                  value={editForm.mobile}
                  onChange={(e) => setEditForm({ ...editForm, mobile: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-errandify-orange"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Monthly Household Income (SGD)</label>
                <input
                  type="number"
                  value={editForm.monthly_household_income}
                  onChange={(e) => setEditForm({ ...editForm, monthly_household_income: e.target.value })}
                  placeholder="Leave empty if not applicable"
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-errandify-orange"
                />
                <p className="text-xs text-gray-500 mt-1">
                  CHAS card will auto-update: ≤$1,900 = Blue, ≤$3,900 = Green
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="flex-1 bg-errandify-orange text-white py-2 rounded font-semibold hover:bg-opacity-90 transition-colors disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className="flex-1 bg-gray-200 text-gray-800 py-2 rounded font-semibold hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Mobile</label>
                <p className="text-gray-800">{profile.mobile || 'Not provided'}</p>
              </div>
              {profile.monthlyHouseholdIncome && (
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">Monthly Household Income</label>
                  <p className="text-gray-800">SGD ${profile.monthlyHouseholdIncome.toLocaleString()}</p>
                </div>
              )}
              {profile.categories.length > 0 && (
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">Categories</label>
                  <div className="flex flex-wrap gap-2">
                    {profile.categories.map((cat) => (
                      <span key={cat} className="bg-orange-100 text-errandify-orange text-xs px-2 py-1 rounded">
                        {cat}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={() => setIsEditing(true)}
                className="w-full mt-6 bg-errandify-orange text-white py-2 rounded font-semibold hover:bg-opacity-90 transition-colors"
              >
                Edit Profile
              </button>
            </div>
          )}
        </div>

        {/* Ratings Section */}
        {ratings.reviewCount > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-bold text-errandify-brown mb-4">Reviews ({ratings.reviewCount})</h3>

            <div className="mb-6">
              <div className="flex items-center gap-4 mb-2">
                <span className="text-4xl font-bold text-errandify-orange">{ratings.averageRating.toFixed(1)}</span>
                <div>
                  {renderStars(ratings.averageRating)}
                  <p className="text-xs text-gray-600 mt-1">Based on {ratings.reviewCount} review{ratings.reviewCount !== 1 ? 's' : ''}</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {ratings.reviews.map((review, idx) => (
                <div key={idx} className="border-b pb-3 last:border-b-0">
                  <div className="flex items-center gap-2 mb-1">
                    {renderStars(review.score)}
                    <span className="text-xs text-gray-500">
                      {new Date(review.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700">{review.comment}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {ratings.reviewCount === 0 && (
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <p className="text-gray-600 mb-3">No reviews yet. Complete some errands to get reviews!</p>
            <button
              onClick={() => navigate(profile.role === 'asker' ? '/create-errand' : '/browse')}
              className="bg-errandify-orange text-white px-4 py-2 rounded font-semibold text-sm hover:bg-opacity-90"
            >
              {profile.role === 'asker' ? 'Post an Errand' : 'Browse Errands'}
            </button>
          </div>
        )}

        {/* Engagement Sections */}
        <div className="space-y-6">
          {/* Top Skills Section */}
          {profile.categories.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-bold text-errandify-brown mb-4">🎯 Your Skills</h3>
              <div className="grid grid-cols-2 gap-2">
                {profile.categories.slice(0, 4).map((cat, idx) => (
                  <div key={idx} className="bg-gradient-to-r from-orange-50 to-orange-100 border border-orange-200 rounded-lg p-3 text-center">
                    <p className="text-sm font-bold text-errandify-brown">{cat}</p>
                    <p className="text-xs text-gray-600">Ready to help</p>
                  </div>
                ))}
              </div>
              {profile.categories.length > 4 && (
                <button
                  onClick={() => navigate('/category-preferences')}
                  className="w-full mt-3 text-sm text-errandify-orange font-semibold hover:underline"
                >
                  View all {profile.categories.length} skills →
                </button>
              )}
            </div>
          )}

          {/* Next Steps CTA */}
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-6">
            <div className="flex gap-3">
              <span className="text-3xl">🚀</span>
              <div className="flex-1">
                <h3 className="font-bold text-blue-900 mb-1">
                  {completeness === 100 ? 'Profile Complete! 🎉' : 'Complete Your Profile'}
                </h3>
                <p className="text-sm text-blue-800 mb-3">
                  {completeness === 100
                    ? 'Your profile looks great! Keep building your reputation with quality work.'
                    : `Add more details to attract more ${profile.role === 'asker' ? 'doers' : 'askers'}.`}
                </p>
                {completeness < 100 && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded font-semibold text-sm hover:bg-blue-700 transition"
                  >
                    Complete Profile ({completeness}%)
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Share Profile CTA */}
          <div className="bg-gradient-to-r from-green-50 to-green-100 border border-green-200 rounded-lg p-6">
            <div className="flex gap-3">
              <span className="text-3xl">📱</span>
              <div className="flex-1">
                <h3 className="font-bold text-green-900 mb-1">Share Your Profile</h3>
                <p className="text-sm text-green-800 mb-3">
                  {profile.role === 'asker'
                    ? 'Spread the word and earn referral points!'
                    : 'Let friends know you\'re available for work.'}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => navigate('/referral')}
                    className="bg-green-600 text-white px-4 py-2 rounded font-semibold text-sm hover:bg-green-700 transition flex-1"
                  >
                    🎁 Referral Program
                  </button>
                  <button
                    onClick={() => {
                      const profileUrl = `${window.location.origin}/profile/${profile.id}`;
                      navigator.clipboard.writeText(profileUrl);
                      alert('Profile link copied!');
                    }}
                    className="bg-green-600 text-white px-4 py-2 rounded font-semibold text-sm hover:bg-green-700 transition flex-1"
                  >
                    🔗 Copy Link
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Help & Support */}
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <h3 className="font-bold text-gray-800 mb-2">Need Help?</h3>
            <p className="text-sm text-gray-600 mb-4">Check our FAQ or contact support</p>
            <div className="flex gap-2">
              <button
                onClick={() => navigate('/faq')}
                className="flex-1 border border-errandify-orange text-errandify-orange py-2 rounded font-semibold text-sm hover:bg-orange-50 transition"
              >
                📖 FAQ
              </button>
              <a
                href="mailto:togather@errandify.ai"
                className="flex-1 bg-errandify-orange text-white py-2 rounded font-semibold text-sm hover:bg-opacity-90 transition text-center"
              >
                📧 Support
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
