import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import AdCarousel from '../components/AdCarousel';
import EventBanner from '../components/EventBanner';

interface UserProfile {
  id?: number;
  name: string;
  role: 'asker' | 'doer';
  rating?: number;
  reviewCount?: number;
  completedTasks?: number;
  totalEarnings?: number;
  errandifyPoints?: number;
  categories?: string[];
}

interface Rating {
  score: number;
  comment: string;
  createdAt: string;
}

export default function MyAccountPage() {
  const navigate = useNavigate();
  const [profileData, setProfileData] = useState<UserProfile | null>(null);
  const [ratings, setRatings] = useState<{ averageRating: number; reviewCount: number; reviews: Rating[] }>({
    averageRating: 0,
    reviewCount: 0,
    reviews: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        const profileRes = await axios.get(
          `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/users/${user.id}`
        );
        setProfileData(profileRes.data.data);

        try {
          const ratingsRes = await axios.get(
            `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/users/${user.id}/ratings`
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

  if (loading) {
    return <div className="p-6 text-center">Loading account...</div>;
  }

  if (!profileData) {
    return <div className="p-6 text-center text-red-600">Failed to load account</div>;
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

      {/* DASHBOARD CONTENT */}
      <div className="max-w-6xl mx-auto px-4 py-6 w-full">
        {/* AD CAROUSEL + EVENT BANNER */}
        <div className="mb-4">
          <AdCarousel />
          <div className="mt-2">
            <EventBanner />
          </div>
        </div>

        {/* DASHBOARD CONTENT */}
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

          {/* STATS GRID */}
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
              <p className="font-bold text-xs text-gray-800">Help</p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
