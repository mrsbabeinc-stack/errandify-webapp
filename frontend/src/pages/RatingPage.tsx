import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

interface ErrandDetail {
  id: number;
  title: string;
  asker_id: number;
  doer_id: number;
  status: string;
  budget: number;
  asker?: { display_name: string };
  doer?: { display_name: string };
}

export default function RatingPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [errand, setErrand] = useState<ErrandDetail | null>(null);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [rating, setRating] = useState(5);
  const [review, setReview] = useState('');
  const [hasRated, setHasRated] = useState(false);

  const isAsker = currentUserId === errand?.asker_id;
  const rateeId = isAsker ? errand?.doer_id : errand?.asker_id;
  const rateeName = isAsker ? errand?.doer?.display_name : errand?.asker?.display_name;

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');

      // Get current user
      const userResponse = await axios.get(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/users/me`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setCurrentUserId(userResponse.data.data.id);

      // Get errand details
      const errandResponse = await axios.get(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/errands/${id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setErrand(errandResponse.data.data);

      // Check if already rated
      const ratingResponse = await axios.get(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/ratings/check/${id}/${userResponse.data.data.id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setHasRated(ratingResponse.data.data?.hasRated || false);

      setError('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load errand details');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitRating = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!errand || !rateeId) return;

    setSubmitting(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/ratings`,
        {
          errand_id: parseInt(id!),
          ratee_id: rateeId,
          rating: parseFloat(String(rating)),
          review_text: review,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      alert(`⭐ Thank you! You've rated ${rateeName}.\n\nYour feedback helps the community stay trustworthy.`);
      navigate('/home');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to submit rating');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50 flex items-center justify-center">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  if (!errand || !currentUserId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-700 font-semibold mb-4">{error || 'Errand not found'}</p>
          <button
            onClick={() => navigate('/home')}
            className="text-errandify-orange font-semibold"
          >
            ← Back Home
          </button>
        </div>
      </div>
    );
  }

  if (hasRated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50 flex items-center justify-center">
        <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-8 text-center">
          <p className="text-4xl mb-4">✓</p>
          <h2 className="text-2xl font-bold text-errandify-brown mb-2">Rating Submitted</h2>
          <p className="text-gray-600 mb-6">Thank you for rating {rateeName}!</p>
          <button
            onClick={() => navigate('/home')}
            className="px-6 py-3 bg-errandify-orange text-white rounded-lg font-bold hover:bg-opacity-90"
          >
            Back Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50 p-6 pb-32">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <button
          onClick={() => navigate('/home')}
          className="text-errandify-orange font-semibold mb-6 text-sm"
        >
          ← Back
        </button>

        {/* Card */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Header Section */}
          <div className="bg-gradient-to-r from-errandify-orange to-orange-500 text-white p-6">
            <h1 className="text-2xl font-bold mb-1">Share Your Experience</h1>
            <p className="text-orange-100">Rate {rateeName} to help the community</p>
          </div>

          {/* Content */}
          <div className="p-8">
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* Errand Summary */}
            <div className="mb-8 p-6 bg-gray-50 rounded-lg border border-gray-200">
              <h3 className="font-semibold text-errandify-brown mb-3">Errand Details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Errand:</span>
                  <span className="font-medium">{errand.title}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Rater:</span>
                  <span className="font-medium">{isAsker ? 'You (Asker)' : 'You (Doer)'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Rating:</span>
                  <span className="font-medium">{rateeName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Budget:</span>
                  <span className="font-bold text-errandify-orange">SGD ${errand.budget.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Rating Form */}
            <form onSubmit={handleSubmitRating} className="space-y-6">
              {/* Star Rating */}
              <div>
                <label className="block font-semibold text-errandify-brown mb-3">
                  How would you rate this experience?
                </label>
                <div className="flex gap-3 justify-center mb-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className={`text-4xl transition-transform ${
                        star <= rating ? 'text-yellow-400 scale-110' : 'text-gray-300 hover:text-yellow-200'
                      }`}
                    >
                      ★
                    </button>
                  ))}
                </div>
                <p className="text-center text-sm text-gray-600">
                  {rating === 1 && 'Poor'}
                  {rating === 2 && 'Fair'}
                  {rating === 3 && 'Good'}
                  {rating === 4 && 'Very Good'}
                  {rating === 5 && 'Excellent'}
                </p>
              </div>

              {/* Review Text */}
              <div>
                <label className="block font-semibold text-errandify-brown mb-2">
                  Share your feedback (optional)
                </label>
                <textarea
                  value={review}
                  onChange={(e) => setReview(e.target.value)}
                  placeholder="What went well? Any suggestions for improvement?"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-errandify-orange resize-none"
                  rows={5}
                  maxLength={500}
                />
                <p className="text-xs text-gray-500 mt-2">{review.length}/500 characters</p>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting}
                className={`w-full py-3 rounded-lg font-bold text-white text-lg transition-all ${
                  submitting
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-errandify-orange hover:bg-opacity-90'
                }`}
              >
                {submitting ? '⏳ Submitting...' : `⭐ Submit Rating for ${rateeName}`}
              </button>
            </form>

            {/* Info */}
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs text-blue-800">
                💡 <strong>Tip:</strong> Honest feedback helps build a trustworthy community. Your rating is visible to others and helps improve the Errandify experience.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
