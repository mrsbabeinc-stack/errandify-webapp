import React, { useState, useEffect } from 'react';
import { useToastNotification } from '../utils/toastNotification';
import '../styles/ReviewApprovalPanel.css';

interface PendingReview {
  id: number;
  review_id: number;
  staff_name: string;
  errand_title: string;
  original_text: string;
  rating: number;
  submitted_at: string;
}

interface ReviewApprovalPanelProps {
  companyId: number;
}

const ReviewApprovalPanel: React.FC<ReviewApprovalPanelProps> = ({ companyId }) => {
  const { showSuccess, showError } = useToastNotification();
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  const [reviews, setReviews] = useState<PendingReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReview, setSelectedReview] = useState<PendingReview | null>(null);
  const [editedText, setEditedText] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchPendingReviews();
  }, [companyId]);

  const fetchPendingReviews = async () => {
    try {
      const token = localStorage.getItem('token');

      const response = await fetch(
        `${API_URL}/api/company/${companyId}/review-approvals?status=pending`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setReviews(data.reviews || []);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error fetching pending reviews:', error);
      setLoading(false);
    }
  };

  const handleSelectReview = (review: PendingReview) => {
    setSelectedReview(review);
    setEditedText(review.original_text);
  };

  const handleApprove = async () => {
    if (!selectedReview) return;

    setProcessing(true);
    try {
      const token = localStorage.getItem('token');

      const response = await fetch(
        `${API_URL}/api/review-approvals/${selectedReview.id}/approve`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            approved: true,
            edited_text: editedText,
          }),
        }
      );

      if (response.ok) {
        showSuccess('Review approved', 'Review has been published');
        setSelectedReview(null);
        fetchPendingReviews();
      } else {
        const error = await response.json();
        showError('Approval failed', error.error || 'Please try again');
      }
    } catch (error) {
      console.error('Error approving review:', error);
      showError('Approval failed', 'Please try again');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedReview) return;

    setProcessing(true);
    try {
      const token = localStorage.getItem('token');

      const response = await fetch(
        `${API_URL}/api/review-approvals/${selectedReview.id}/reject`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            rejection_reason: 'Review does not meet community guidelines',
          }),
        }
      );

      if (response.ok) {
        showSuccess('Review rejected', 'Staff has been notified');
        setSelectedReview(null);
        fetchPendingReviews();
      } else {
        const error = await response.json();
        showError('Rejection failed', error.error || 'Please try again');
      }
    } catch (error) {
      console.error('Error rejecting review:', error);
      showError('Rejection failed', 'Please try again');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return <div className="review-approval-panel loading">Loading pending reviews...</div>;
  }

  if (reviews.length === 0) {
    return (
      <div className="review-approval-panel empty">
        <p>✅ No pending reviews. All caught up!</p>
      </div>
    );
  }

  return (
    <div className="review-approval-panel">
      <h3>📝 Review Approvals ({reviews.length})</h3>

      <div className="approval-container">
        <div className="reviews-list">
          {reviews.map(review => (
            <div
              key={review.id}
              className={`review-item ${selectedReview?.id === review.id ? 'selected' : ''}`}
              onClick={() => handleSelectReview(review)}
            >
              <div className="review-header">
                <span className="staff-name">{review.staff_name}</span>
                <span className="rating">{'⭐'.repeat(review.rating)}</span>
              </div>
              <div className="review-errand">{review.errand_title}</div>
              <div className="review-date">{new Date(review.submitted_at).toLocaleDateString()}</div>
            </div>
          ))}
        </div>

        {selectedReview && (
          <div className="review-editor">
            <div className="editor-header">
              <h4>Review from {selectedReview.staff_name}</h4>
              <span className="rating">{'⭐'.repeat(selectedReview.rating)} ({selectedReview.rating}/5)</span>
            </div>

            <div className="editor-info">
              <strong>Errand:</strong>
              <p>{selectedReview.errand_title}</p>
            </div>

            <label>Review Text (edit if needed)</label>
            <textarea
              value={editedText}
              onChange={e => setEditedText(e.target.value)}
              rows={5}
              placeholder="Review text..."
            />

            <div className="editor-actions">
              <button
                className="btn btn-danger"
                onClick={handleReject}
                disabled={processing}
              >
                ❌ Reject
              </button>
              <button
                className="btn btn-primary"
                onClick={handleApprove}
                disabled={processing || !editedText.trim()}
              >
                {processing ? '⏳ Processing...' : '✓ Approve & Publish'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReviewApprovalPanel;
