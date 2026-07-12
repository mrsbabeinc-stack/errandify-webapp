import React, { useState } from 'react';

interface Review {
  id: number;
  errandId: string;
  errandTitle: string;
  doerName: string;
  doerType: 'individual' | 'company';
  rating: number;
  review: string;
  submittedAt: string;
  workQuality: number;
  communication: number;
  timeliness: number;
}

const AskerReviews: React.FC = () => {
  const [reviews] = useState<Review[]>([
    {
      id: 1,
      errandId: 'ERR-2026-001',
      errandTitle: 'Office Cleaning Service',
      doerName: 'John Cleaners',
      doerType: 'company',
      rating: 5,
      review: 'Excellent service! Team was professional, thorough, and finished ahead of schedule.',
      submittedAt: '2026-07-09',
      workQuality: 5,
      communication: 5,
      timeliness: 5,
    },
    {
      id: 2,
      errandId: 'ERR-2026-002',
      errandTitle: 'Delivery Service',
      doerName: 'FastDeliver Ltd',
      doerType: 'company',
      rating: 4,
      review: 'Good service overall. Delivery was on time, but packaging could have been better.',
      submittedAt: '2026-07-08',
      workQuality: 4,
      communication: 4,
      timeliness: 5,
    },
  ]);

  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [sortBy, setSortBy] = useState<'recent' | 'rating' | 'quality'>('recent');

  const sortedReviews = [...reviews].sort((a, b) => {
    if (sortBy === 'recent') {
      return new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();
    }
    if (sortBy === 'rating') {
      return b.rating - a.rating;
    }
    if (sortBy === 'quality') {
      return b.workQuality - a.workQuality;
    }
    return 0;
  });

  const averageRating = (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1);
  const averageQuality = (reviews.reduce((sum, r) => sum + r.workQuality, 0) / reviews.length).toFixed(1);
  const averageCommunication = (reviews.reduce((sum, r) => sum + r.communication, 0) / reviews.length).toFixed(1);
  const averageTimeliness = (reviews.reduce((sum, r) => sum + r.timeliness, 0) / reviews.length).toFixed(1);

  const renderStars = (rating: number) => {
    return (
      <span className="stars">
        {[1, 2, 3, 4, 5].map(star => (
          <span key={star} className={star <= Math.round(rating) ? 'star filled' : 'star'}>
            ★
          </span>
        ))}
      </span>
    );
  };

  return (
    <div className="asker-reviews-container">
      <h2>Reviews As Asker</h2>
      <p className="subtitle">Rate the quality of work from doers who completed your errands</p>

      {/* Summary Section */}
      <div className="summary-section">
        <div className="main-rating">
          <p className="rating-number">{averageRating}</p>
          <div className="summary-stars">{renderStars(Math.round(parseFloat(averageRating)))}</div>
          <p className="total-reviews">({reviews.length} doers rated)</p>
        </div>

        <div className="metrics-grid">
          <div className="metric">
            <p className="metric-label">Work Quality</p>
            <p className="metric-value">{averageQuality} ⭐</p>
          </div>
          <div className="metric">
            <p className="metric-label">Communication</p>
            <p className="metric-value">{averageCommunication} ⭐</p>
          </div>
          <div className="metric">
            <p className="metric-label">Timeliness</p>
            <p className="metric-value">{averageTimeliness} ⭐</p>
          </div>
        </div>
      </div>

      {/* Sort Controls */}
      <div className="sort-controls">
        <label>Sort by:</label>
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)} className="sort-select">
          <option value="recent">Most Recent</option>
          <option value="rating">Highest Rated</option>
          <option value="quality">Best Quality</option>
        </select>
      </div>

      {/* Reviews List */}
      <div className="reviews-list">
        {sortedReviews.length === 0 ? (
          <div className="empty-state">
            <p>No reviews yet. Complete errands and rate doers to see their feedback here.</p>
          </div>
        ) : (
          sortedReviews.map(review => (
            <div
              key={review.id}
              className="review-item"
              onClick={() => setSelectedReview(review)}
            >
              <div className="item-header">
                <div className="doer-info">
                  <p className="doer-name">
                    {review.doerType === 'company' ? '🏢' : '👤'} {review.doerName}
                  </p>
                  <p className="errand-title">{review.errandTitle}</p>
                  <p className="errand-id">{review.errandId}</p>
                </div>
                <div className="rating-section">
                  {renderStars(review.rating)}
                  <span className="rating-value">{review.rating}.0</span>
                </div>
              </div>

              <p className="review-text">"{review.review}"</p>

              <div className="review-metrics">
                <span className="metric-tag">Quality: {review.workQuality}★</span>
                <span className="metric-tag">Comm: {review.communication}★</span>
                <span className="metric-tag">Time: {review.timeliness}★</span>
              </div>

              <p className="review-date">{review.submittedAt}</p>
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
                <p className="modal-doer">
                  {selectedReview.doerType === 'company' ? '🏢' : '👤'} {selectedReview.doerName}
                </p>
                <p className="modal-errand">{selectedReview.errandTitle}</p>
                <p className="modal-id">{selectedReview.errandId}</p>
              </div>
              <div className="modal-rating">
                {renderStars(selectedReview.rating)}
                <span>{selectedReview.rating}.0/5.0</span>
              </div>
            </div>

            <div className="modal-body">
              <h4>Your Review</h4>
              <p className="review-text">"{selectedReview.review}"</p>
              <p className="review-date">Submitted on {selectedReview.submittedAt}</p>
            </div>

            <div className="metrics-detail">
              <h4>Rating Breakdown</h4>
              <div className="metric-row">
                <span className="metric-label">Work Quality</span>
                <div className="metric-stars">
                  {renderStars(selectedReview.workQuality)}
                  <span>{selectedReview.workQuality}.0/5.0</span>
                </div>
              </div>
              <div className="metric-row">
                <span className="metric-label">Communication</span>
                <div className="metric-stars">
                  {renderStars(selectedReview.communication)}
                  <span>{selectedReview.communication}.0/5.0</span>
                </div>
              </div>
              <div className="metric-row">
                <span className="metric-label">Timeliness</span>
                <div className="metric-stars">
                  {renderStars(selectedReview.timeliness)}
                  <span>{selectedReview.timeliness}.0/5.0</span>
                </div>
              </div>
            </div>

            <div className="modal-actions">
              <button className="btn-close" onClick={() => setSelectedReview(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .asker-reviews-container {
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
          display: grid;
          grid-template-columns: auto 1fr;
          gap: 32px;
        }

        .main-rating {
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

        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
          gap: 16px;
        }

        .metric {
          text-align: center;
          padding: 16px;
          background: #F8FAFB;
          border-radius: 8px;
        }

        .metric-label {
          font-size: 12px;
          color: #999;
          margin: 0 0 8px 0;
          font-weight: 600;
        }

        .metric-value {
          font-size: 20px;
          font-weight: 700;
          margin: 0;
          color: #1B5E75;
        }

        .sort-controls {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 24px;
        }

        .sort-controls label {
          font-weight: 600;
          color: #1B5E75;
          font-size: 14px;
        }

        .sort-select {
          padding: 8px 12px;
          border: 1px solid #E8E8E8;
          border-radius: 6px;
          font-size: 13px;
          cursor: pointer;
        }

        .sort-select:focus {
          outline: none;
          border-color: #FF6B35;
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

        .item-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 12px;
        }

        .doer-info {
          flex: 1;
        }

        .doer-name {
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

        .rating-section {
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

        .rating-value {
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

        .review-metrics {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin-bottom: 12px;
          padding-top: 12px;
          border-top: 1px solid #E8E8E8;
        }

        .metric-tag {
          font-size: 11px;
          padding: 4px 8px;
          background: #E8F5E9;
          color: #2D7A34;
          border-radius: 4px;
          font-weight: 600;
        }

        .review-date {
          font-size: 12px;
          color: #999;
          margin: 0;
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

        .modal-doer {
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

        .metrics-detail {
          padding: 16px;
          background: #F8FAFB;
          border-radius: 8px;
          margin-bottom: 16px;
        }

        .metrics-detail h4 {
          margin: 0 0 12px 0;
          color: #1B5E75;
          font-size: 14px;
        }

        .metric-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 0;
        }

        .metric-row .metric-label {
          font-size: 13px;
          color: #666;
          font-weight: 600;
        }

        .metric-stars {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .metric-stars .star {
          font-size: 14px;
        }

        .metric-stars span {
          font-size: 12px;
          color: #FFB800;
          font-weight: 600;
        }

        .modal-actions {
          display: flex;
          gap: 12px;
        }

        .btn-close {
          flex: 1;
          padding: 10px 16px;
          background: #1B5E75;
          color: white;
          border: none;
          border-radius: 6px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-close:hover {
          background: #144A5A;
        }

        @media (max-width: 768px) {
          .summary-section {
            grid-template-columns: 1fr;
            gap: 16px;
          }

          .metrics-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

export default AskerReviews;
