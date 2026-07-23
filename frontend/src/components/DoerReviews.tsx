import React, { useState, useEffect, useCallback } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface Review {
  id: number;
  errandId: string;
  errandTitle: string;
  askerName: string;
  rating: number;
  review: string;
  submittedAt: string;
  askerType: 'individual' | 'company';
  hasResponse: boolean;
  response?: string;
}

/**
 * Reviews written about me, from GET /api/ratings/user/:id.
 *
 * Was three hardcoded reviews with hardcoded replies. The "Your Response"
 * feature was fully built in this file but had nothing behind it — the handler
 * called alert() and `ratings` had no column to store a reply. Migration 076
 * added ratings.response/responded_at and POST /api/ratings/:id/respond, so the
 * modal now posts for real.
 */
const DoerReviews: React.FC = () => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [showResponseModal, setShowResponseModal] = useState(false);
  const [responseText, setResponseText] = useState('');
  const [ratingFilter, setRatingFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [posting, setPosting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const raw = localStorage.getItem('user');
      const me = raw ? JSON.parse(raw) : null;
      const myId = me?.id ?? me?.userId;
      if (!myId) { setError('Please sign in again'); return; }

      const res = await fetch(`${API_URL}/api/ratings/user/${myId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) { setError(body.error || 'Could not load your reviews'); return; }

      setReviews((body.data?.ratings || []).map((r: any) => ({
        id: r.id,
        errandId: r.errand_formatted_id || `#${r.errand_id}`,
        // This endpoint serialises camelCase (raterName / taskTitle); the
        // snake_case fallbacks cover the other shapes the API can return.
        errandTitle: r.taskTitle || r.task_title || 'Untitled errand',
        askerName: r.raterName || r.rater_name || 'Neighbour',
        rating: Number(r.rating) || 0,
        review: r.comment || '',
        submittedAt: r.created_at,
        askerType: 'individual' as const,
        hasResponse: !!r.response,
        response: r.response || undefined,
      })));
      setError('');
    } catch {
      setError('Could not load your reviews');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filteredReviews = ratingFilter === 'all'
    ? reviews
    : reviews.filter(r => r.rating === parseInt(ratingFilter));

  const handleRatingFilter = (rating: string) => setRatingFilter(rating);

  const handleAddResponse = async () => {
    if (!responseText.trim() || !selectedReview) return;
    setPosting(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/api/ratings/${selectedReview.id}/respond`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ response: responseText.trim() }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) { setError(body.error || 'Could not post your response'); return; }

      setResponseText('');
      setShowResponseModal(false);
      setSelectedReview(null);
      await load();
    } catch {
      setError('Could not post your response');
    } finally {
      setPosting(false);
    }
  };

  const renderStars = (rating: number) => {
    return (
      <span className="stars">
        {[1, 2, 3, 4, 5].map(star => (
          <span key={star} className={star <= rating ? 'star filled' : 'star'}>
            ★
          </span>
        ))}
      </span>
    );
  };

  const totalReviews = reviews.length;
  // Guard the divide — with no reviews this rendered "NaN"
  const averageRating = totalReviews
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews).toFixed(1)
    : '0.0';
  const fiveStarCount = reviews.filter(r => r.rating === 5).length;
  const fourStarCount = reviews.filter(r => r.rating === 4).length;
  const threeStarCount = reviews.filter(r => r.rating === 3).length;

  return (
    <div className="reviews-container">
      <h2>Reviews As Doer</h2>
      <p className="subtitle">Reviews from askers about your work quality</p>

      {/* Summary Section */}
      <div className="summary-section">
        <div className="rating-summary">
          <div className="big-rating">
            <p className="rating-number">{averageRating}</p>
            <div className="summary-stars">{renderStars(Math.round(parseFloat(averageRating)))}</div>
            <p className="total-reviews">({totalReviews} reviews)</p>
          </div>

          <div className="rating-breakdown">
            {[5, 4, 3].map(stars => {
              const count = stars === 5 ? fiveStarCount : stars === 4 ? fourStarCount : threeStarCount;
              const percentage = totalReviews ? (count / totalReviews) * 100 : 0;
              return (
                <div key={stars} className="breakdown-row">
                  <span className="breakdown-label">
                    {stars} {stars === 1 ? 'star' : 'stars'}
                  </span>
                  <div className="breakdown-bar">
                    <div className="breakdown-fill" style={{ width: `${percentage}%` }} />
                  </div>
                  <span className="breakdown-count">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Filter by Rating */}
      <div className="rating-filter">
        <label>Filter by rating:</label>
        <div className="filter-buttons">
          {['all', '5', '4', '3'].map(rating => (
            <button
              key={rating}
              className={`filter-btn ${ratingFilter === rating ? 'active' : ''}`}
              onClick={() => handleRatingFilter(rating)}
            >
              {rating === 'all' ? 'All' : `${rating}★`}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div style={{
          background: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C',
          padding: '12px 16px', borderRadius: 8, marginBottom: 16, fontSize: 14,
        }}>{error}</div>
      )}

      {/* Reviews List */}
      <div className="reviews-list">
        {loading ? (
          <div className="empty-state"><p>Loading your reviews…</p></div>
        ) : filteredReviews.length === 0 ? (
          <div className="empty-state">
            <p>No reviews in this category</p>
          </div>
        ) : (
          filteredReviews.map(review => (
            <div
              key={review.id}
              className="review-item"
              onClick={() => setSelectedReview(review)}
            >
              <div className="review-header">
                <div className="asker-info">
                  <p className="asker-name">
                    {review.askerType === 'company' ? '🏢' : '👤'} {review.askerName}
                  </p>
                  <p className="errand-title">{review.errandTitle}</p>
                  <p className="errand-id">{review.errandId}</p>
                </div>
                <div className="review-rating">
                  {renderStars(review.rating)}
                  <span className="rating-label">{review.rating}.0</span>
                </div>
              </div>

              {review.review && <p className="review-text">"{review.review}"</p>}

              <div className="review-footer">
                <span className="review-date">{new Date(review.submittedAt).toLocaleDateString()}</span>
                {review.hasResponse && (
                  <span className="has-response">✅ You responded</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Detail Modal */}
      {selectedReview && (
        <div className="modal-overlay" onClick={() => setSelectedReview(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setSelectedReview(null)}>✕</button>

            <div className="modal-header">
              <div>
                <p className="modal-asker">
                  {selectedReview.askerType === 'company' ? '🏢' : '👤'} {selectedReview.askerName}
                </p>
                <p className="modal-errand">{selectedReview.errandTitle}</p>
                <p className="modal-id">{selectedReview.errandId}</p>
              </div>
              <div className="modal-rating">
                {renderStars(selectedReview.rating)}
                <span>{selectedReview.rating}.0</span>
              </div>
            </div>

            <div className="modal-body">
              <h4>Review</h4>
              <p className="review-text">"{selectedReview.review}"</p>
              <p className="review-date">Submitted on {new Date(selectedReview.submittedAt).toLocaleDateString()}</p>
            </div>

            {selectedReview.hasResponse && selectedReview.response && (
              <div className="response-section">
                <h4>Your Response</h4>
                <p className="response-text">"{selectedReview.response}"</p>
              </div>
            )}

            <div className="modal-actions">
              {!selectedReview.hasResponse && (
                <button
                  className="btn-respond"
                  onClick={() => {
                    setShowResponseModal(true);
                  }}
                >
                  💬 Add Response
                </button>
              )}
              <button
                className="btn-close"
                onClick={() => setSelectedReview(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Response Modal */}
      {showResponseModal && selectedReview && (
        <div className="modal-overlay" onClick={() => setShowResponseModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setShowResponseModal(false)}>✕</button>
            <h3>Respond to Review</h3>
            <p className="modal-subtitle">From {selectedReview.askerName}</p>

            <textarea
              placeholder="Write your response..."
              value={responseText}
              onChange={(e) => setResponseText(e.target.value)}
              className="response-input"
              rows={4}
            />

            <div className="modal-actions">
              <button className="btn-submit" disabled={posting || !responseText.trim()} onClick={handleAddResponse}>
                ✅ Submit Response
              </button>
              <button className="btn-cancel" onClick={() => setShowResponseModal(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .reviews-container {
          max-width: 100%;
        }

        .subtitle {
          color: #666;
          margin-bottom: 24px;
          font-size: 14px;
        }

        .summary-section {
          background: white;
          border: 1px solid #E8E8E8;
          border-radius: 12px;
          padding: 24px;
          margin-bottom: 24px;
        }

        .rating-summary {
          display: grid;
          grid-template-columns: auto 1fr;
          gap: 32px;
        }

        .big-rating {
          text-align: center;
        }

        .rating-number {
          font-size: 48px;
          font-weight: 700;
          margin: 0;
          color: #FFB800;
        }

        .summary-stars {
          display: flex;
          justify-content: center;
          gap: 2px;
          margin: 8px 0;
        }

        .summary-stars .star {
          font-size: 24px;
        }

        .total-reviews {
          font-size: 14px;
          color: #999;
          margin: 0;
        }

        .rating-breakdown {
          display: grid;
          gap: 12px;
        }

        .breakdown-row {
          display: grid;
          grid-template-columns: 60px 1fr 40px;
          gap: 12px;
          align-items: center;
        }

        .breakdown-label {
          font-size: 13px;
          color: #666;
          text-align: right;
        }

        .breakdown-bar {
          height: 4px;
          background: #E8E8E8;
          border-radius: 2px;
          overflow: hidden;
        }

        .breakdown-fill {
          height: 100%;
          background: #FFB800;
        }

        .breakdown-count {
          font-size: 13px;
          font-weight: 600;
          color: #1A1A1A;
          text-align: right;
        }

        .rating-filter {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 24px;
        }

        .rating-filter label {
          font-weight: 600;
          color: #1B5E75;
          font-size: 14px;
          white-space: nowrap;
        }

        .filter-buttons {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .filter-btn {
          padding: 6px 14px;
          background: white;
          border: 1px solid #E8E8E8;
          border-radius: 6px;
          font-weight: 600;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .filter-btn.active {
          background: #FF6B35;
          color: white;
          border-color: #FF6B35;
        }

        .filter-btn:hover:not(.active) {
          border-color: #FF6B35;
          color: #FF6B35;
        }

        .reviews-list {
          display: grid;
          gap: 12px;
        }

        .review-item {
          background: white;
          border: 1px solid #E8E8E8;
          border-radius: 12px;
          padding: 16px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .review-item:hover {
          border-color: #FF6B35;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .review-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 12px;
        }

        .asker-info {
          flex: 1;
        }

        .asker-name {
          margin: 0 0 4px 0;
          font-weight: 600;
          color: #1A1A1A;
          font-size: 15px;
        }

        .errand-title {
          margin: 0 0 2px 0;
          font-size: 13px;
          color: #666;
        }

        .errand-id {
          margin: 0;
          font-size: 11px;
          color: #999;
        }

        .review-rating {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
        }

        .stars {
          display: flex;
          gap: 2px;
        }

        .star {
          color: #E8E8E8;
          font-size: 16px;
        }

        .star.filled {
          color: #FFB800;
        }

        .rating-label {
          font-size: 12px;
          font-weight: 600;
          color: #FFB800;
        }

        .review-text {
          font-size: 13px;
          color: #666;
          line-height: 1.5;
          margin: 0 0 12px 0;
          font-style: italic;
        }

        .review-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 12px;
          border-top: 1px solid #E8E8E8;
        }

        .review-date {
          font-size: 12px;
          color: #999;
        }

        .has-response {
          font-size: 12px;
          color: #2D7A34;
          font-weight: 600;
        }

        .empty-state {
          text-align: center;
          padding: 40px 20px;
          color: #999;
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .modal-content {
          background: white;
          border-radius: 12px;
          padding: 24px;
          max-width: 500px;
          width: 90%;
          max-height: 90vh;
          overflow-y: auto;
          position: relative;
        }

        .close-btn {
          position: absolute;
          top: 12px;
          right: 12px;
          background: none;
          border: none;
          font-size: 20px;
          cursor: pointer;
          color: #999;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 20px;
          padding-bottom: 16px;
          border-bottom: 1px solid #E8E8E8;
        }

        .modal-asker {
          margin: 0 0 4px 0;
          font-weight: 600;
          color: #1B5E75;
          font-size: 16px;
        }

        .modal-errand {
          margin: 0 0 2px 0;
          font-size: 14px;
          color: #666;
        }

        .modal-id {
          margin: 0;
          font-size: 12px;
          color: #999;
        }

        .modal-rating {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
        }

        .modal-rating .star {
          font-size: 20px;
        }

        .modal-rating span {
          font-weight: 600;
          color: #FFB800;
          font-size: 14px;
        }

        .modal-body {
          margin-bottom: 20px;
        }

        .modal-body h4 {
          margin: 0 0 12px 0;
          color: #1B5E75;
          font-size: 14px;
        }

        .response-section {
          padding: 16px;
          background: #E6F9E6;
          border-left: 3px solid #2D7A34;
          border-radius: 4px;
          margin-bottom: 20px;
        }

        .response-section h4 {
          margin: 0 0 8px 0;
          color: #2D7A34;
          font-size: 14px;
        }

        .response-text {
          margin: 0;
          font-size: 13px;
          color: #1A1A1A;
          line-height: 1.5;
          font-style: italic;
        }

        .modal-subtitle {
          font-size: 13px;
          color: #666;
          margin: 0 0 16px 0;
        }

        .response-input {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid #E8E8E8;
          border-radius: 8px;
          font-family: inherit;
          font-size: 13px;
          resize: vertical;
          margin-bottom: 16px;
        }

        .response-input:focus {
          outline: none;
          border-color: #FF6B35;
          box-shadow: 0 0 0 3px rgba(255, 107, 53, 0.1);
        }

        .modal-actions {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .btn-respond,
        .btn-submit,
        .btn-close,
        .btn-cancel {
          padding: 10px 16px;
          border: none;
          border-radius: 6px;
          font-weight: 600;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-respond,
        .btn-submit {
          background: #1B5E75;
          color: white;
        }

        .btn-respond:hover,
        .btn-submit:hover {
          background: #144A5A;
        }

        .btn-close {
          background: #F0F0F0;
          color: #666;
        }

        .btn-close:hover {
          background: #E0E0E0;
        }

        .btn-cancel {
          background: #F0F0F0;
          color: #666;
        }

        .btn-cancel:hover {
          background: #E0E0E0;
        }

        @media (max-width: 768px) {
          .rating-summary {
            grid-template-columns: 1fr;
          }

          .modal-actions {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

export default DoerReviews;
