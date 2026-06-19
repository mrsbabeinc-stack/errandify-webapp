import { useState, useEffect } from 'react';
import axios from 'axios';

interface Rating {
  id: number;
  taskTitle: string;
  userRole: 'given' | 'received';
  ratedUser: string;
  score: number;
  comment: string;
  taskId: number;
  createdAt: string;
}

interface RatingSummary {
  averageRating: number;
  totalReviews: number;
  distribution: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
}

export default function RatingsHistoryPage() {
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [summary, setSummary] = useState<RatingSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'given' | 'received'>('received');

  useEffect(() => {
    fetchRatings();
  }, []);

  const fetchRatings = async () => {
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/ratings`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        }
      );
      setRatings(response.data.data?.ratings || []);
      setSummary(response.data.data?.summary || null);
    } catch (err) {
      console.error('Failed to fetch ratings:', err);
      // Mock data
      setSummary({
        averageRating: 4.8,
        totalReviews: 24,
        distribution: { 5: 20, 4: 4, 3: 0, 2: 0, 1: 0 },
      });
      setRatings([
        {
          id: 1,
          taskTitle: 'Clean apartment',
          userRole: 'received',
          ratedUser: 'Sarah',
          score: 5,
          comment: 'Excellent work! Very thorough and professional.',
          taskId: 5,
          createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: 2,
          taskTitle: 'Moving help',
          userRole: 'received',
          ratedUser: 'Mike',
          score: 5,
          comment: 'Great person to work with. Very efficient!',
          taskId: 3,
          createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const filteredRatings = ratings.filter(r => r.userRole === filter);

  const renderStars = (score: number) => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map(i => (
          <span key={i} className={score >= i ? '⭐' : '☆'} />
        ))}
      </div>
    );
  };

  if (loading) {
    return <div className="min-h-screen bg-errandify-bg px-4 py-4"><p className="text-center py-12">Loading...</p></div>;
  }

  return (
    <div className="min-h-screen bg-errandify-bg px-4 py-4 pb-20">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-errandify-brown mb-6">⭐ Ratings & Reviews</h1>

        {/* Summary Card */}
        {summary && filter === 'received' && (
          <div className="bg-white rounded-lg p-6 mb-6 border border-gray-200">
            <div className="text-center mb-6">
              <p className="text-5xl font-bold text-yellow-500">{summary.averageRating.toFixed(1)}</p>
              <div className="flex justify-center gap-0.5 mt-2">
                {[1, 2, 3, 4, 5].map(i => (
                  <span key={i} className={summary.averageRating >= i ? 'text-2xl ⭐' : '☆'} />
                ))}
              </div>
              <p className="text-sm text-gray-600 mt-2">Based on {summary.totalReviews} reviews</p>
            </div>

            {/* Distribution Bars */}
            <div className="space-y-2">
              {[5, 4, 3, 2, 1].map(score => (
                <div key={score} className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-gray-700 w-8">{score}⭐</span>
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-yellow-500 h-2 rounded-full"
                      style={{
                        width: `${summary.totalReviews ? (summary.distribution[score as keyof typeof summary.distribution] / summary.totalReviews) * 100 : 0}%`,
                      }}
                    />
                  </div>
                  <span className="text-xs text-gray-600 w-8">
                    {summary.distribution[score as keyof typeof summary.distribution]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex gap-2 mb-4 bg-white rounded-lg p-1">
          <button
            onClick={() => setFilter('received')}
            className={`flex-1 py-2 rounded-lg font-semibold text-sm transition ${
              filter === 'received'
                ? 'bg-errandify-orange text-white'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            📥 Received ({ratings.filter(r => r.userRole === 'received').length})
          </button>
          <button
            onClick={() => setFilter('given')}
            className={`flex-1 py-2 rounded-lg font-semibold text-sm transition ${
              filter === 'given'
                ? 'bg-errandify-orange text-white'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            📤 Given ({ratings.filter(r => r.userRole === 'given').length})
          </button>
        </div>

        {/* Ratings List */}
        {filteredRatings.length === 0 ? (
          <div className="bg-white rounded-lg p-8 text-center border border-gray-200">
            <p className="text-gray-500">
              {filter === 'received' ? 'No ratings received yet' : 'No ratings given yet'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredRatings.map(rating => (
              <div key={rating.id} className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <h3 className="font-semibold text-gray-800">{rating.taskTitle}</h3>
                    <p className="text-sm text-gray-600">by {rating.ratedUser}</p>
                  </div>
                  {renderStars(rating.score)}
                </div>
                <p className="text-sm text-gray-700 mb-2">{rating.comment}</p>
                <p className="text-xs text-gray-500">
                  {new Date(rating.createdAt).toLocaleDateString('en-SG')}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
