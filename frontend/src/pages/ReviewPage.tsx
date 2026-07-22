import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

interface Job {
  id: number;
  title: string;
  formatted_id?: string;
  doerId: number;
  doerName: string;
  doerAlias?: string;
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
        `${import.meta.env.VITE_API_URL || window.location.origin}/api/jobs/${jobId}`,
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
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50 p-3 pb-20">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow p-4">
        <button
          onClick={() => navigate(-1)}
          className="text-sm text-gray-600 font-bold mb-3">‹ Back</button>

        <div className="text-center mb-4">
          <h1 className="text-lg font-bold text-gray-800 mb-2">How was it? 😊</h1>
          {job.formatted_id && (
            <p className="text-xs text-errandify-orange font-semibold mb-1">{job.formatted_id}</p>
          )}
          <p className="text-xs text-gray-600">{job.title}</p>
          <p className="text-xs text-gray-500 mt-0.5">with {job.doerAlias || job.doerName}</p>
        </div>

        <form onSubmit={handleSubmitReview} className="space-y-3">
          {/* Star Rating */}
          <div>
            <div className="flex gap-2 justify-center mb-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className={`text-3xl transition-all hover:scale-110 ${
                    star <= rating ? 'text-yellow-400 drop-shadow' : 'text-gray-300 hover:text-yellow-300'
                  }`}
                >
                  ★
                </button>
              ))}
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-errandify-orange mb-0.5">{rating}.0</p>
              <p className="text-xs text-gray-600">
                {rating === 1 && '😞 Needs improvement'}
                {rating === 2 && '😐 Below expectations'}
                {rating === 3 && '😊 Met expectations'}
                {rating === 4 && '😄 Exceeded expectations'}
                {rating === 5 && '🤩 Excellent work!'}
              </p>
            </div>
          </div>

          {/* Hana Tip */}
          {rating < 5 && (
            <div className="p-2 bg-orange-50 border border-orange-200 rounded text-center">
              <p className="text-xs text-orange-700">💡 Specific feedback helps them improve!</p>
            </div>
          )}

          {/* Comment */}
          <div>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={
                rating === 5
                  ? 'What went great? ✨'
                  : 'Any feedback? (optional)'
              }
              maxLength={500}
              rows={2}
              className="w-full px-3 py-2 text-xs border border-gray-200 rounded focus:outline-none focus:border-errandify-orange focus:ring-1 focus:ring-orange-100 resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => navigate('/home')}
              disabled={submitting}
              className="flex-1 px-3 py-2 text-xs border border-gray-300 text-gray-700 rounded font-semibold hover:bg-gray-50 disabled:opacity-50 transition"
            >
              Skip
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-3 py-2 text-xs bg-gradient-to-r from-errandify-orange to-orange-600 text-white rounded font-bold hover:shadow disabled:opacity-50 transition"
            >
              {submitting ? '✨ Sending...' : '⭐ Submit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
