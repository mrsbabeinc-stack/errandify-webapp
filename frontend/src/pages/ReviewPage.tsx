import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

interface Job {
  id: number;
  title: string;
  doerId: number;
  doerName: string;
  status: string;
  budget: number;
}

export default function ReviewPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');

  useEffect(() => {
    fetchJob();
  }, [jobId]);

  const fetchJob = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/jobs/${jobId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setJob(response.data.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load job details');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!job) return;

    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/ratings`,
        {
          taskId: parseInt(jobId!),
          ratedUserId: job.doerId,
          rating,
          comment,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setError('');
      setTimeout(() => {
        navigate('/home');
      }, 1500);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="p-6 text-center">Loading...</div>;
  if (error) return <div className="p-6 text-center text-red-600">{error}</div>;
  if (!job) return <div className="p-6 text-center">Job not found</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50 p-6">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-8">
        {/* Success Message */}
        {!submitting && !loading && !error && (
          <div className="mb-6 p-4 bg-green-50 border-l-4 border-green-500 rounded">
            <p className="text-green-700 font-semibold">✅ Thank you for completing this task!</p>
            <p className="text-green-600 text-sm">Your rating helps build trust in the community.</p>
          </div>
        )}

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">⭐ Rate Your Experience</h1>
          <p className="text-gray-600">Your feedback helps {job.doerName} improve and helps others make informed decisions</p>
        </div>

        {/* Task Summary */}
        <div className="mb-8 p-6 bg-gradient-to-r from-orange-50 to-yellow-50 rounded-lg border border-orange-200">
          <div className="flex items-start gap-4">
            <div className="text-3xl">📋</div>
            <div className="flex-1">
              <h3 className="font-bold text-gray-800 text-lg mb-1">{job.title}</h3>
              <p className="text-sm text-gray-600 mb-2">
                <strong>Completed with:</strong> {job.doerName}
              </p>
              <p className="text-sm font-semibold text-errandify-orange">Budget: SGD ${job.budget}</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmitReview} className="space-y-6">
          {/* Star Rating */}
          <div>
            <label className="block text-lg font-bold text-gray-800 mb-4">
              How would you rate this work?
            </label>
            <div className="flex gap-3 justify-center mb-4">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className={`text-5xl transition-all hover:scale-125 ${
                    star <= rating ? 'text-yellow-400 drop-shadow-lg' : 'text-gray-300 hover:text-yellow-300'
                  }`}
                >
                  ★
                </button>
              ))}
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-errandify-orange mb-1">{rating}.0</p>
              <p className="text-sm text-gray-600 font-medium">
                {rating === 1 && '😞 Poor - Needs improvement'}
                {rating === 2 && '😐 Fair - Below expectations'}
                {rating === 3 && '😊 Good - Met expectations'}
                {rating === 4 && '😄 Very Good - Exceeded expectations'}
                {rating === 5 && '🤩 Excellent - Outstanding work!'}
              </p>
            </div>
          </div>

          {/* Hana Suggestions */}
          {rating < 5 && (
            <div className="p-4 bg-errandify-orange-50 border border-errandify-orange-200 rounded-lg mb-6">
              <div className="flex gap-3">
                <span className="text-2xl">🤖</span>
                <div>
                  <p className="font-semibold text-errandify-orange-900 mb-1">Hana's Tip</p>
                  <p className="text-sm text-errandify-orange-800">
                    {rating <= 2 && 'Help the doer improve! Specific feedback about what went wrong is most helpful.'}
                    {rating === 3 && 'Let them know what you loved and what could be improved next time.'}
                    {rating === 4 && 'Tell them what exceeded your expectations – they\'ll love to hear it!'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Comment */}
          <div>
            <label className="block text-sm font-bold text-gray-800 mb-3">
              Share Your Feedback {comment.length > 0 && `(${comment.length}/500)`}
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={
                rating === 5
                  ? 'What did they do exceptionally well? 💫'
                  : 'Be specific: What went well? What could improve? 💭'
              }
              maxLength={500}
              rows={4}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-errandify-orange focus:ring-2 focus:ring-orange-100 resize-none"
            />
            <p className="text-xs text-gray-500 mt-2">Optional but helpful for the community</p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-8">
            <button
              type="button"
              onClick={() => navigate('/home')}
              disabled={submitting}
              className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-bold hover:bg-gray-50 disabled:opacity-50 transition"
            >
              Skip
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-errandify-orange to-orange-600 text-white rounded-lg font-bold hover:shadow-lg disabled:opacity-50 transition transform hover:scale-105"
            >
              {submitting ? '✨ Submitting...' : '⭐ Submit Review'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
