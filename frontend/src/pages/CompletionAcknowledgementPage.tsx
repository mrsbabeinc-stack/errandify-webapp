import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

interface TaskDetail {
  id: number;
  title: string;
  budget: number;
  category: string;
  doer?: { id: number; display_name: string };
  asker?: { id: number; display_name: string };
}

interface Review {
  id: number;
  rating: number;
  comment: string;
  rater_name: string;
  created_at: string;
}

interface UserProfile {
  id: number;
  role: 'asker' | 'doer';
}

const getRatingEmoji = (rating: number) => {
  if (rating >= 5) return '⭐⭐⭐⭐⭐';
  if (rating >= 4) return '⭐⭐⭐⭐';
  if (rating >= 3) return '⭐⭐⭐';
  if (rating >= 2) return '⭐⭐';
  return '⭐';
};

const getRatingLabel = (rating: number) => {
  if (rating >= 5) return 'Excellent';
  if (rating >= 4) return 'Very Good';
  if (rating >= 3) return 'Good';
  if (rating >= 2) return 'Fair';
  return 'Poor';
};

export default function CompletionAcknowledgementPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [task, setTask] = useState<TaskDetail | null>(null);
  const [doerReview, setDoerReview] = useState<Review | null>(null);
  const [askerReview, setAskerReview] = useState<Review | null>(null);
  const [userRole, setUserRole] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      setUserRole(JSON.parse(userStr));
    }
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');

      // Fetch task details
      const taskRes = await axios.get(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/errands/${id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setTask(taskRes.data.data);

      // Fetch reviews for both asker and doer
      try {
        const askerRatings = await axios.get(
          `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/ratings/user/${taskRes.data.data.asker_id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        const doerRatings = await axios.get(
          `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/ratings/user/${taskRes.data.data.doer_id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        // Find reviews for this specific task
        const askerReviewForTask = askerRatings.data.data.ratings.find(
          (r: Review) => r.task_id === parseInt(id!)
        );
        const doerReviewForTask = doerRatings.data.data.ratings.find(
          (r: Review) => r.task_id === parseInt(id!)
        );

        if (askerReviewForTask) setAskerReview(askerReviewForTask);
        if (doerReviewForTask) setDoerReview(doerReviewForTask);
      } catch (err) {
        console.warn('Could not fetch reviews:', err);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load errand details');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-pulse">✨</div>
          <p className="text-gray-600 font-semibold">Loading completion details...</p>
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-red-700 font-semibold mb-4">Errand not found</p>
          <button onClick={() => navigate('/home')} className="text-errandify-orange font-semibold">
            ← Back Home
          </button>
        </div>
      </div>
    );
  }

  const isAsker = userRole?.role === 'asker';
  const hasReviews = doerReview || askerReview;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 pb-32">
      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Back Button */}
        <button
          onClick={() => navigate('/home')}
          className="text-errandify-orange font-semibold mb-6 text-sm"
        >
          ← Back Home
        </button>

        {/* Header Card */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-6">
          <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white p-8 text-center">
            <h1 className="text-3xl font-bold mb-2">🎉 Errand Completed!</h1>
            <p className="text-lg text-purple-100 mb-4">{task.title}</p>
            <div className="inline-block bg-white/20 rounded-full px-4 py-2">
              <p className="text-white font-semibold">Budget: SGD ${task.budget.toFixed(2)}</p>
            </div>
          </div>

          <div className="p-6 text-center border-b border-gray-200">
            <p className="text-gray-600 text-sm mb-2">Errand completed with</p>
            <p className="text-xl font-bold text-errandify-brown">
              {isAsker ? task.doer?.display_name : task.asker?.display_name}
            </p>
          </div>
        </div>

        {/* Reviews Section */}
        <div className="space-y-6">
          {/* Doer Review Card */}
          {doerReview ? (
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-3xl">🐱</span>
                  <div>
                    <p className="font-semibold">{task.doer?.display_name || 'Doer'}</p>
                    <p className="text-xs text-blue-100">Doer's Rating</p>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-4">
                {/* Star Rating */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">{getRatingEmoji(doerReview.rating)}</span>
                    <span className="text-sm font-semibold text-gray-600">{getRatingLabel(doerReview.rating)}</span>
                  </div>
                  <p className="text-xs text-gray-500">
                    Rated on {new Date(doerReview.created_at).toLocaleDateString()}
                  </p>
                </div>

                {/* Review Comment */}
                {doerReview.comment && (
                  <div className="bg-blue-50 rounded-lg p-4">
                    <p className="text-gray-700 italic">"{doerReview.comment}"</p>
                  </div>
                )}

                {/* Rating Breakdown */}
                <div className="pt-4 border-t border-gray-200">
                  <p className="text-xs font-semibold text-gray-600 mb-2">WHAT THIS MEANS</p>
                  <ul className="text-xs space-y-1 text-gray-600">
                    <li>✓ Trust score increased</li>
                    <li>✓ Visible on your profile</li>
                    <li>✓ Helps match with better errands</li>
                  </ul>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">🐱</span>
                  <div>
                    <p className="font-semibold">{task.doer?.display_name || 'Doer'}</p>
                    <p className="text-xs text-blue-100">Doer's Rating</p>
                  </div>
                </div>
              </div>

              <div className="p-6 text-center">
                <div className="text-4xl mb-3">⏳</div>
                <p className="text-gray-600 font-semibold mb-2">Rating Pending</p>
                <p className="text-xs text-gray-500">
                  {task.doer?.display_name || 'The doer'} hasn't rated you yet. Give them a little time!
                </p>
              </div>
            </div>
          )}

          {/* Asker Review Card */}
          {askerReview ? (
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
              <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white p-6">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-3xl">👤</span>
                  <div>
                    <p className="font-semibold">{task.asker?.display_name || 'Asker'}</p>
                    <p className="text-xs text-green-100">Asker's Rating</p>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-4">
                {/* Star Rating */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">{getRatingEmoji(askerReview.rating)}</span>
                    <span className="text-sm font-semibold text-gray-600">{getRatingLabel(askerReview.rating)}</span>
                  </div>
                  <p className="text-xs text-gray-500">
                    Rated on {new Date(askerReview.created_at).toLocaleDateString()}
                  </p>
                </div>

                {/* Review Comment */}
                {askerReview.comment && (
                  <div className="bg-green-50 rounded-lg p-4">
                    <p className="text-gray-700 italic">"{askerReview.comment}"</p>
                  </div>
                )}

                {/* Rating Breakdown */}
                <div className="pt-4 border-t border-gray-200">
                  <p className="text-xs font-semibold text-gray-600 mb-2">WHAT THIS MEANS</p>
                  <ul className="text-xs space-y-1 text-gray-600">
                    <li>✓ Trust score increased</li>
                    <li>✓ Visible on your profile</li>
                    <li>✓ Helps match with better errands</li>
                  </ul>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
              <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white p-6">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">👤</span>
                  <div>
                    <p className="font-semibold">{task.asker?.display_name || 'Asker'}</p>
                    <p className="text-xs text-green-100">Asker's Rating</p>
                  </div>
                </div>
              </div>

              <div className="p-6 text-center">
                <div className="text-4xl mb-3">⏳</div>
                <p className="text-gray-600 font-semibold mb-2">Rating Pending</p>
                <p className="text-xs text-gray-500">
                  {task.asker?.display_name || 'The asker'} hasn't rated you yet. Give them a little time!
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Summary Section */}
        {hasReviews && (
          <div className="mt-8 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border-2 border-purple-200 p-6">
            <h3 className="font-bold text-errandify-brown mb-4 text-lg">✨ Transaction Summary</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Budget</span>
                <span className="font-bold text-errandify-orange">SGD ${task.budget.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Reviews Completed</span>
                <span className="font-bold text-green-600">✓ Both Rated</span>
              </div>
              <div className="flex justify-between items-center pt-3 border-t border-purple-200">
                <span className="font-semibold text-errandify-brown">Errandify Points Earned</span>
                <span className="text-2xl font-bold text-errandify-orange">
                  {(doerReview?.rating || 0) >= 5 ? '40 EP' : `${15 + (doerReview?.rating || 0) * 5} EP`}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Next Steps */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-bold text-blue-900 mb-3">📝 What's Next?</h3>
          <ul className="space-y-2 text-sm text-blue-800">
            <li>✓ Errand is now complete and closed</li>
            <li>✓ Both parties have rated each other</li>
            <li>✓ Ratings visible on your profile</li>
            <li>✓ Use your Errandify Points to get discounts</li>
            <li>✓ Build your reputation for better matches</li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 grid grid-cols-2 gap-4">
          <button
            onClick={() => navigate('/home')}
            className="py-3 rounded-lg font-bold text-white bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 transition"
          >
            🏠 Home
          </button>
          <button
            onClick={() => navigate(`/profile/${isAsker ? task.doer?.id : task.asker?.id}`)}
            className="py-3 rounded-lg font-bold text-errandify-orange border-2 border-orange-200 hover:bg-orange-50 transition"
          >
            👤 View Profile
          </button>
        </div>
      </div>
    </div>
  );
}
