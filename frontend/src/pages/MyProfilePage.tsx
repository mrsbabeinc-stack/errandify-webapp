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

        {/* Profile Card */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex gap-4 mb-6">
            <div className="text-5xl">👤</div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-800">{profile.name}</h2>
              <p className="text-sm text-gray-600">✅ Verified User</p>

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
            <p className="text-gray-600">No reviews yet. Complete some errands to get reviews!</p>
          </div>
        )}
      </div>
    </div>
  );
}
