import React, { useState } from 'react';

interface CompletedErrand {
  id: number;
  errandId: string;
  title: string;
  askerName: string;
  completedAt: string;
  budget: number;
  rating: number;
  review: string;
  earningsReceived: number;
}

const DoerCompletedErrands: React.FC = () => {
  const [errands] = useState<CompletedErrand[]>([
    {
      id: 1,
      errandId: 'ERR-2026-001',
      title: 'Office Cleaning Service',
      askerName: 'ABC Corp',
      completedAt: '2026-07-09',
      budget: 150,
      rating: 5,
      review: 'Excellent work! Very thorough and professional. Will hire again.',
      earningsReceived: 150,
    },
    {
      id: 2,
      errandId: 'ERR-2026-002',
      title: 'Delivery Service',
      askerName: 'Sarah Tan',
      completedAt: '2026-07-08',
      budget: 85,
      rating: 4,
      review: 'Good job, arrived on time. Minor mix-up with one item.',
      earningsReceived: 85,
    },
    {
      id: 3,
      errandId: 'ERR-2026-003',
      title: 'Handyman Repairs',
      askerName: 'John Lee',
      completedAt: '2026-07-07',
      budget: 200,
      rating: 5,
      review: 'Perfect! Fixed everything as promised. Very reliable.',
      earningsReceived: 200,
    },
  ]);

  const [selectedErrand, setSelectedErrand] = useState<CompletedErrand | null>(null);
  const [sortBy, setSortBy] = useState<'recent' | 'rating' | 'earnings'>('recent');

  const sortedErrands = [...errands].sort((a, b) => {
    if (sortBy === 'recent') {
      return new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime();
    }
    if (sortBy === 'rating') {
      return b.rating - a.rating;
    }
    if (sortBy === 'earnings') {
      return b.earningsReceived - a.earningsReceived;
    }
    return 0;
  });

  const totalEarnings = errands.reduce((sum, e) => sum + e.earningsReceived, 0);
  const averageRating = (errands.reduce((sum, e) => sum + e.rating, 0) / errands.length).toFixed(1);

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

  return (
    <div className="completed-errands-container">
      <h2>Completed Errands</h2>
      <p className="subtitle">Your work history and earnings</p>

      {/* Summary Stats */}
      <div className="summary-stats">
        <div className="stat-card">
          <p className="stat-label">Total Completed</p>
          <p className="stat-value">{errands.length}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Total Earnings</p>
          <p className="stat-value">${totalEarnings}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Average Rating</p>
          <p className="stat-value">{averageRating} ⭐</p>
        </div>
      </div>

      {/* Sort Controls */}
      <div className="sort-controls">
        <label>Sort by:</label>
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)} className="sort-select">
          <option value="recent">Most Recent</option>
          <option value="rating">Highest Rated</option>
          <option value="earnings">Highest Earnings</option>
        </select>
      </div>

      {/* Errands List */}
      <div className="errands-list">
        {sortedErrands.length === 0 ? (
          <div className="empty-state">
            <p>No completed errands yet</p>
          </div>
        ) : (
          sortedErrands.map(errand => (
            <div
              key={errand.id}
              className="errand-item"
              onClick={() => setSelectedErrand(errand)}
            >
              <div className="item-header">
                <div className="item-info">
                  <h3>{errand.title}</h3>
                  <p className="errand-id">{errand.errandId}</p>
                </div>
                <div className="rating-section">
                  {renderStars(errand.rating)}
                  <span className="rating-value">{errand.rating}.0</span>
                </div>
              </div>

              <div className="item-details">
                <div className="detail">
                  <span className="label">Asker</span>
                  <span className="value">🏢 {errand.askerName}</span>
                </div>
                <div className="detail">
                  <span className="label">Completed</span>
                  <span className="value">{errand.completedAt}</span>
                </div>
                <div className="detail">
                  <span className="label">Earnings</span>
                  <span className="value" style={{ color: '#2D7A34', fontWeight: 'bold' }}>
                    ${errand.earningsReceived}
                  </span>
                </div>
              </div>

              {errand.review && (
                <div className="review-preview">
                  <p className="review-label">📝 Review</p>
                  <p className="review-text">"{errand.review}"</p>
                </div>
              )}

              <button className="btn-view-details">
                View Details →
              </button>
            </div>
          ))
        )}
      </div>

      {/* Detail Modal */}
      {selectedErrand && (
        <div className="modal-overlay" onClick={() => setSelectedErrand(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setSelectedErrand(null)}>✕</button>

            <h3>{selectedErrand.title}</h3>
            <p className="modal-id">{selectedErrand.errandId}</p>

            <div className="modal-rating">
              {renderStars(selectedErrand.rating)}
              <span className="rating-number">{selectedErrand.rating}.0/5.0</span>
            </div>

            <div className="details-grid">
              <div className="detail-item">
                <span className="label">Asker</span>
                <span className="value">🏢 {selectedErrand.askerName}</span>
              </div>
              <div className="detail-item">
                <span className="label">Budget</span>
                <span className="value">${selectedErrand.budget}</span>
              </div>
              <div className="detail-item">
                <span className="label">Earnings</span>
                <span className="value" style={{ color: '#2D7A34', fontWeight: 'bold' }}>
                  ${selectedErrand.earningsReceived}
                </span>
              </div>
              <div className="detail-item">
                <span className="label">Completed</span>
                <span className="value">{selectedErrand.completedAt}</span>
              </div>
            </div>

            {selectedErrand.review && (
              <div className="review-section">
                <h4>Review from Asker</h4>
                <p className="review-text">"{selectedErrand.review}"</p>
              </div>
            )}

            <div className="modal-actions">
              <button className="btn-primary" onClick={() => setSelectedErrand(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .completed-errands-container {
          max-width: 100%;
        }

        .subtitle {
          color: #666;
          margin-bottom: 24px;
          font-size: 14px;
        }

        .summary-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 12px;
          margin-bottom: 24px;
        }

        .stat-card {
          background: white;
          border: 1px solid #E8E8E8;
          border-radius: 12px;
          padding: 16px;
          text-align: center;
        }

        .stat-label {
          font-size: 12px;
          color: #999;
          margin: 0 0 8px 0;
          font-weight: 600;
        }

        .stat-value {
          font-size: 24px;
          font-weight: 700;
          color: #1B5E75;
          margin: 0;
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

        .errands-list {
          display: grid;
          gap: 12px;
        }

        .errand-item {
          background: white;
          border: 1px solid #E8E8E8;
          border-radius: 12px;
          padding: 16px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .errand-item:hover {
          border-color: #FF6B35;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .item-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 12px;
        }

        .item-info h3 {
          margin: 0 0 4px 0;
          color: #1A1A1A;
          font-size: 16px;
        }

        .errand-id {
          font-size: 12px;
          color: #999;
          margin: 0;
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
          font-size: 14px;
        }

        .star.filled {
          color: #FFB800;
        }

        .rating-value {
          font-size: 12px;
          font-weight: 600;
          color: #FFB800;
        }

        .item-details {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
          gap: 12px;
          margin-bottom: 12px;
          padding: 12px;
          background: #F8FAFB;
          border-radius: 8px;
        }

        .detail {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .detail .label {
          font-size: 12px;
          color: #999;
          font-weight: 600;
        }

        .detail .value {
          font-size: 13px;
          color: #1A1A1A;
          font-weight: 500;
          text-align: right;
        }

        .review-preview {
          padding: 12px;
          background: #FFF9F5;
          border-left: 3px solid #FF6B35;
          border-radius: 4px;
          margin-bottom: 12px;
        }

        .review-label {
          margin: 0 0 6px 0;
          font-size: 12px;
          font-weight: 600;
          color: #FF6B35;
        }

        .review-text {
          margin: 0;
          font-size: 13px;
          color: #666;
          line-height: 1.4;
          font-style: italic;
        }

        .btn-view-details {
          width: 100%;
          padding: 8px 12px;
          background: #F8FAFB;
          border: 1px solid #E8E8E8;
          border-radius: 6px;
          color: #FF6B35;
          font-weight: 600;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-view-details:hover {
          background: #FF6B35;
          color: white;
          border-color: #FF6B35;
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

        .modal-content h3 {
          margin: 0 0 4px 0;
          color: #1B5E75;
        }

        .modal-id {
          font-size: 12px;
          color: #999;
          margin: 0 0 12px 0;
        }

        .modal-rating {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 16px;
        }

        .rating-number {
          font-size: 14px;
          font-weight: 600;
          color: #FFB800;
        }

        .details-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-bottom: 16px;
          padding: 12px;
          background: #F8FAFB;
          border-radius: 8px;
        }

        .detail-item {
          display: grid;
          gap: 4px;
        }

        .detail-item .label {
          font-size: 12px;
          color: #999;
          font-weight: 600;
        }

        .detail-item .value {
          font-size: 14px;
          color: #1A1A1A;
          font-weight: 500;
        }

        .review-section {
          margin-bottom: 16px;
          padding: 12px;
          background: #FFF9F5;
          border-left: 3px solid #FF6B35;
          border-radius: 4px;
        }

        .review-section h4 {
          margin: 0 0 8px 0;
          color: #FF6B35;
          font-size: 14px;
        }

        .review-section .review-text {
          margin: 0;
          color: #666;
          font-size: 13px;
          line-height: 1.5;
        }

        .modal-actions {
          display: flex;
          gap: 12px;
        }

        .btn-primary {
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

        .btn-primary:hover {
          background: #144A5A;
        }

        @media (max-width: 768px) {
          .summary-stats {
            grid-template-columns: 1fr;
          }

          .details-grid {
            grid-template-columns: 1fr;
          }

          .item-details {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

export default DoerCompletedErrands;
