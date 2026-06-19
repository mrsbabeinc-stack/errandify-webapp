import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

interface Badge {
  type: string;
  label: string;
  description: string;
  icon: string;
}

interface Review {
  id: number;
  rating: number;
  comment: string;
  raterName: string;
  taskTitle: string;
  date: string;
}

interface UserProfile {
  user: {
    id: number;
    displayName: string;
    profileImage: string;
    bio: string;
    role: string;
    kyc_status: string;
    joinedDate: string;
    restricted: boolean;
  };
  rating: {
    averageRating: number;
    totalRatings: number;
    breakdown: {
      5: number;
      4: number;
      3: number;
      2: number;
      1: number;
    };
  };
  stats: {
    tasksCompletedAsDoer: number;
    tasksCompletedAsAsker: number;
    tasksInProgress: number;
    averageEarning: number;
    lastActivity: string;
  };
  recentReviews: Review[];
  badges: Badge[];
}

export default function UserProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchProfile();
  }, [userId]);

  const fetchProfile = async () => {
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/user-profile/${userId}`
      );
      setProfile(response.data.data);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load profile');
      console.error('Profile fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-4">👤</div>
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow p-8 text-center max-w-md">
          <p className="text-red-600 font-semibold mb-4">{error || 'Profile not found'}</p>
          <button
            onClick={() => navigate('/home')}
            className="px-4 py-2 bg-errandify-orange text-white rounded-lg"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-SG', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getStarPercentage = (count: number, total: number) => {
    return total > 0 ? (count / total) * 100 : 0;
  };

  const roleEmoji = profile.user.role === 'doer' ? '👷' : '📋';

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-8">
        <div className="max-w-4xl mx-auto px-6">
          <button
            onClick={() => navigate(-1)}
            className="mb-4 text-blue-200 hover:text-white transition text-sm"
          >
            ← Back
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Restricted Banner */}
        {profile.user.restricted && (
          <div className="mb-6 p-4 bg-yellow-50 border-2 border-yellow-300 rounded-lg">
            <p className="text-yellow-900 font-semibold">⚠️ This user has restrictions</p>
            <p className="text-yellow-800 text-sm">Limited to specific task categories</p>
          </div>
        )}

        {/* Profile Card */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <div className="flex gap-8 mb-8">
            {/* Profile Image */}
            <div className="flex-shrink-0">
              {profile.user.profileImage ? (
                <img
                  src={profile.user.profileImage}
                  alt={profile.user.displayName}
                  className="w-32 h-32 rounded-full object-cover border-4 border-blue-500"
                />
              ) : (
                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center text-5xl border-4 border-blue-500">
                  👤
                </div>
              )}
            </div>

            {/* Profile Info */}
            <div className="flex-1">
              <div className="mb-4">
                <h1 className="text-4xl font-bold text-gray-800 mb-1">
                  {profile.user.displayName}
                </h1>
                <p className="text-gray-600 text-lg">
                  {roleEmoji} {profile.user.role.charAt(0).toUpperCase() + profile.user.role.slice(1)}
                </p>
              </div>

              {/* Rating Summary */}
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-3xl font-bold text-yellow-500">
                    ⭐ {profile.rating.averageRating.toFixed(1)}
                  </span>
                  <span className="text-gray-600">
                    ({profile.rating.totalRatings} {profile.rating.totalRatings === 1 ? 'rating' : 'ratings'})
                  </span>
                </div>

                {/* Rating Bars */}
                {profile.rating.totalRatings > 0 && (
                  <div className="space-y-2">
                    {[5, 4, 3, 2, 1].map((stars) => (
                      <div key={stars} className="flex items-center gap-3">
                        <span className="text-sm text-gray-600 w-8">
                          {'⭐'.repeat(stars)}
                        </span>
                        <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-yellow-400 h-full transition-all"
                            style={{
                              width: `${getStarPercentage(profile.rating.breakdown[stars as keyof typeof profile.rating.breakdown], profile.rating.totalRatings)}%`,
                            }}
                          />
                        </div>
                        <span className="text-xs text-gray-500 w-8">
                          {profile.rating.breakdown[stars as keyof typeof profile.rating.breakdown]}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* KYC Badge */}
              {profile.user.kyc_status === 'verified' && (
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-semibold">
                  ✅ Verified (SingPass)
                </div>
              )}

              {/* Bio */}
              {profile.user.bio && (
                <p className="text-gray-700 mt-4 italic">"{profile.user.bio}"</p>
              )}
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-8 border-t">
            <div className="text-center">
              <p className="text-3xl font-bold text-blue-600">
                {profile.stats.tasksCompletedAsDoer}
              </p>
              <p className="text-sm text-gray-600 mt-1">Tasks Done</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-green-600">
                {profile.stats.tasksCompletedAsAsker}
              </p>
              <p className="text-sm text-gray-600 mt-1">Posted</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-purple-600">
                {profile.stats.tasksInProgress}
              </p>
              <p className="text-sm text-gray-600 mt-1">In Progress</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-orange-600">
                {profile.stats.averageEarning.toFixed(0)}
              </p>
              <p className="text-sm text-gray-600 mt-1">Avg Earning</p>
            </div>
          </div>
        </div>

        {/* Badges */}
        {profile.badges.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">🏆 Badges & Achievements</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {profile.badges.map((badge) => (
                <div
                  key={badge.type}
                  className="p-4 bg-gradient-to-br from-yellow-50 to-amber-50 border-2 border-yellow-300 rounded-lg"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-3xl">{badge.icon}</span>
                    <div>
                      <p className="font-bold text-gray-800">{badge.label}</p>
                      <p className="text-sm text-gray-600">{badge.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Reviews */}
        {profile.recentReviews.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">⭐ Recent Reviews</h2>
            <div className="space-y-6">
              {profile.recentReviews.map((review) => (
                <div key={review.id} className="border-l-4 border-yellow-400 pl-4 py-2">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-semibold text-gray-800">
                        {'⭐'.repeat(review.rating)}
                      </p>
                      <p className="text-sm text-gray-600">
                        {review.raterName} • {formatDate(review.date)}
                      </p>
                    </div>
                  </div>
                  <p className="text-gray-700 mb-2">"{review.comment}"</p>
                  <p className="text-sm text-gray-500 italic">For: {review.taskTitle}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No Reviews */}
        {profile.recentReviews.length === 0 && profile.rating.totalRatings === 0 && (
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <p className="text-gray-500 mb-2">No reviews yet</p>
            <p className="text-gray-400 text-sm">Check back after they complete their first task!</p>
          </div>
        )}

        {/* Activity Info */}
        <div className="mt-8 p-6 bg-blue-50 rounded-lg border border-blue-200">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600 font-semibold">Joined</p>
              <p className="text-gray-800 font-bold">{formatDate(profile.user.joinedDate)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 font-semibold">Last Activity</p>
              <p className="text-gray-800 font-bold">
                {profile.stats.lastActivity ? formatDate(profile.stats.lastActivity) : 'N/A'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
