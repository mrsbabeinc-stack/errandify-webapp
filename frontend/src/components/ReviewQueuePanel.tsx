import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface PendingReview {
  id: number;
  errandId: string;
  title: string;
  description: string;
  staffName: string;
  askerName: string;
  budget: number;
  location: string;
  status: 'pending_review';
  staffRating: number;
  staffReviewComment: string;
  completionNotes: string;
  completionPhotos: string[];
  submittedAt: string;
}

const ReviewQueuePanel: React.FC = () => {
  const [pendingReviews, setPendingReviews] = useState<PendingReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);

  useEffect(() => {
    const fetchPendingReviews = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setError('Not authenticated');
          setLoading(false);
          return;
        }

        // Fetch errands with pending_review status posted by current user
        const response = await axios.get(
          `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/errands`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        const reviews = response.data.data
          .filter((e: any) => e.status === 'pending_review')
          .map((e: any) => ({
            id: e.id,
            errandId: e.errandId || e.formatted_id,
            title: e.title,
            description: e.description,
            staffName: e.doerName || 'Unknown',
            askerName: e.askerName,
            budget: e.budget,
            location: e.location,
            status: 'pending_review',
            staffRating: 5, // TODO: fetch from completion data
            staffReviewComment: 'Great service!', // TODO: fetch from completion data
            completionNotes: e.notes || '',
            completionPhotos: [], // TODO: fetch from completion data
            submittedAt: e.updatedAt || new Date().toISOString(),
          }));

        setPendingReviews(reviews);
      } catch (err) {
        console.error('Failed to fetch pending reviews:', err);
        setError('Failed to load pending reviews');
      } finally {
        setLoading(false);
      }
    };

    fetchPendingReviews();
  }, []);

  const handleApprove = async (errandId: number) => {
    try {
      const token = localStorage.getItem('token');

      await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/errands/${errandId}/approve-completion`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      alert('✅ Work approved! Payment released.');
      setPendingReviews(pendingReviews.filter(r => r.id !== errandId));
    } catch (err) {
      console.error('Failed to approve:', err);
      alert('Failed to approve work. Please try again.');
    }
  };

  const handleRejectClick = (errandId: number) => {
    setSelectedId(errandId);
    setRejectionReason('');
    setShowRejectModal(true);
  };

  const handleConfirmReject = async () => {
    if (!selectedId || !rejectionReason.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }

    try {
      const token = localStorage.getItem('token');

      await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/errands/${selectedId}/reject-completion`,
        { reason: rejectionReason },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      alert('⚠️ Work rejected. Staff member has been notified to revise.');
      setPendingReviews(pendingReviews.filter(r => r.id !== selectedId));
      setShowRejectModal(false);
      setSelectedId(null);
    } catch (err) {
      console.error('Failed to reject:', err);
      alert('Failed to reject work. Please try again.');
    }
  };

  if (loading) {
    return <div className="p-4 text-center">Loading review queue...</div>;
  }

  return (
    <div className="space-y-4 p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Review Queue</h2>
        <span className="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-semibold">
          {pendingReviews.length} Pending
        </span>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {pendingReviews.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>No pending reviews - all work is caught up!</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {pendingReviews.map(review => (
            <div
              key={review.id}
              className="bg-white border-2 border-red-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-errandify-brown">{review.title}</h3>
                  <p className="text-sm text-gray-600">{review.errandId}</p>
                </div>
                <span className="px-3 py-1 rounded-full text-sm font-semibold bg-red-100 text-red-700">
                  ⏳ Pending Review
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
                <div>
                  <p className="text-gray-500">Staff Member</p>
                  <p className="font-semibold">{review.staffName}</p>
                </div>
                <div>
                  <p className="text-gray-500">Budget</p>
                  <p className="font-semibold">SGD ${review.budget}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-gray-500">Location</p>
                  <p className="font-semibold">{review.location}</p>
                </div>
              </div>

              {/* Staff's Rating of Asker */}
              <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-3">
                <p className="text-sm font-semibold text-blue-900 mb-2">
                  Staff's Rating of Asker:
                </p>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map(star => (
                    <span
                      key={star}
                      className={star <= review.staffRating ? 'text-yellow-400 text-xl' : 'text-gray-300 text-xl'}
                    >
                      ⭐
                    </span>
                  ))}
                  <span className="text-sm text-gray-600">
                    ({review.staffRating}/5) {review.staffReviewComment}
                  </span>
                </div>
              </div>

              {/* Completion Evidence */}
              <div className="mb-4">
                <p className="text-sm font-semibold text-gray-700 mb-2">Completion Notes:</p>
                <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                  {review.completionNotes || 'No notes provided'}
                </p>
              </div>

              {review.completionPhotos && review.completionPhotos.length > 0 && (
                <div className="mb-4">
                  <p className="text-sm font-semibold text-gray-700 mb-2">Photos:</p>
                  <div className="grid grid-cols-3 gap-2">
                    {review.completionPhotos.map((photo, idx) => (
                      <img
                        key={idx}
                        src={photo}
                        alt={`Completion ${idx + 1}`}
                        className="w-full h-24 object-cover rounded cursor-pointer hover:opacity-80"
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => handleApprove(review.id)}
                  className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2 rounded-lg font-bold transition-colors"
                >
                  ✅ Approve & Release Payment
                </button>
                <button
                  onClick={() => handleRejectClick(review.id)}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2 rounded-lg font-bold transition-colors"
                >
                  ⚠️ Request Revision
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Rejection Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-errandify-brown mb-4">Request Revision</h3>

            <p className="text-gray-600 mb-4">
              Tell the staff member what needs to be fixed or improved. They'll receive this feedback and can resubmit.
            </p>

            <textarea
              placeholder="Example: Photos unclear, missing area in corner, please retake and resubmit..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="w-full p-3 border-2 border-gray-300 rounded-lg mb-4 focus:outline-none focus:border-errandify-orange"
              rows={4}
            />

            <div className="flex gap-2">
              <button
                onClick={() => setShowRejectModal(false)}
                className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg font-bold hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReject}
                className="flex-1 bg-red-500 text-white py-2 rounded-lg font-bold hover:bg-red-600 transition-colors"
              >
                Send Feedback
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReviewQueuePanel;
