import React, { useState, useMemo } from 'react';

interface Advertisement {
  id: string;
  companyId: string;
  companyName: string;
  headline: string;
  description: string;
  heroImageUrl: string;
  startDate: string;
  endDate: string;
  duration: number;
  placements: string[];
  status: 'pending' | 'approved' | 'rejected' | 'live' | 'expired';
  submittedAt: string;
  approvedAt?: string;
  rejectionReason?: string;
  budget: number;
  spent?: number;
  impressions?: number;
}

const mockAds: Advertisement[] = [
  {
    id: 'ad-001',
    companyId: 'comp-001',
    companyName: 'ProClean Services',
    headline: 'Summer Cleaning Special',
    description: 'Professional home cleaning services with 20% discount',
    heroImageUrl: 'https://via.placeholder.com/1200x400?text=ProClean+Summer+Special',
    startDate: '2026-07-15',
    endDate: '2026-08-31',
    duration: 47,
    placements: ['Homepage Banner', 'Browse Sidebar', 'Email Newsletter'],
    status: 'pending',
    submittedAt: '2026-07-10 14:30',
    budget: 500,
  },
  {
    id: 'ad-002',
    companyId: 'comp-002',
    companyName: 'FastGo Delivery',
    headline: 'Fast & Reliable Delivery',
    description: 'Same-day delivery across Singapore',
    heroImageUrl: 'https://via.placeholder.com/1200x400?text=FastGo+Delivery',
    startDate: '2026-06-15',
    endDate: '2026-07-31',
    duration: 46,
    placements: ['Homepage Banner'],
    status: 'approved',
    submittedAt: '2026-06-10 09:15',
    approvedAt: '2026-06-11 10:00',
    budget: 200,
    spent: 185,
    impressions: 5420,
  },
  {
    id: 'ad-003',
    companyId: 'comp-003',
    companyName: 'Elite Care Services',
    headline: 'Healthcare at Your Doorstep',
    description: 'Professional healthcare and wellness services',
    heroImageUrl: 'https://via.placeholder.com/1200x400?text=Elite+Care',
    startDate: '2026-07-20',
    endDate: '2026-09-15',
    duration: 57,
    placements: ['Homepage Banner', 'Browse Sidebar', 'Company Profile'],
    status: 'rejected',
    submittedAt: '2026-07-09 16:45',
    rejectionReason: 'Contact information found in description',
    budget: 750,
  },
];

export const AdvertisingApproval: React.FC = () => {
  const [ads, setAds] = useState<Advertisement[]>(mockAds);
  const [filterStatus, setFilterStatus] = useState<string>('pending');
  const [selectedAd, setSelectedAd] = useState<Advertisement | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  const filteredAds = useMemo(() => {
    if (!filterStatus) return ads;
    return ads.filter((ad) => ad.status === filterStatus);
  }, [ads, filterStatus]);

  const handleApprove = (ad: Advertisement) => {
    setAds(
      ads.map((a) =>
        a.id === ad.id
          ? { ...a, status: 'approved', approvedAt: new Date().toLocaleString() }
          : a
      )
    );
    setShowDetailModal(false);
  };

  const handleRejectClick = (ad: Advertisement) => {
    setSelectedAd(ad);
    setRejectionReason('');
    setShowRejectModal(true);
  };

  const confirmReject = () => {
    if (!selectedAd) return;
    setAds(
      ads.map((a) =>
        a.id === selectedAd.id
          ? { ...a, status: 'rejected', rejectionReason }
          : a
      )
    );
    setShowRejectModal(false);
    setShowDetailModal(false);
  };

  const getStatusBadgeColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: '#ff9800',
      approved: '#4caf50',
      rejected: '#f44336',
      live: '#2196f3',
      expired: '#9e9e9e',
    };
    return colors[status] || '#666';
  };

  const statusCounts = {
    pending: ads.filter((a) => a.status === 'pending').length,
    approved: ads.filter((a) => a.status === 'approved').length,
    rejected: ads.filter((a) => a.status === 'rejected').length,
    live: ads.filter((a) => a.status === 'live').length,
  };

  return (
    <div className="advertising-approval-page">
      <div className="page-header">
        <h1>📸 Advertising Approval</h1>
        <p>Review and approve company advertisements</p>
      </div>

      <div className="happy-box">
        <span>😊</span>
        <p>
          <strong>{statusCounts.pending}</strong> pending, <strong>{statusCounts.approved}</strong> approved,
          <strong> {statusCounts.rejected}</strong> rejected
        </p>
      </div>

      <div className="status-filters">
        <button
          className={`filter-btn ${filterStatus === 'pending' ? 'active' : ''}`}
          onClick={() => setFilterStatus('pending')}
        >
          ⏳ Pending ({statusCounts.pending})
        </button>
        <button
          className={`filter-btn ${filterStatus === 'approved' ? 'active' : ''}`}
          onClick={() => setFilterStatus('approved')}
        >
          ✅ Approved ({statusCounts.approved})
        </button>
        <button
          className={`filter-btn ${filterStatus === 'rejected' ? 'active' : ''}`}
          onClick={() => setFilterStatus('rejected')}
        >
          ❌ Rejected ({statusCounts.rejected})
        </button>
        <button
          className={`filter-btn ${filterStatus === '' ? 'active' : ''}`}
          onClick={() => setFilterStatus('')}
        >
          📊 All ({ads.length})
        </button>
      </div>

      <div className="ads-list">
        {filteredAds.length > 0 ? (
          filteredAds.map((ad) => (
            <div key={ad.id} className="ad-card">
              <div className="ad-card-image">
                <img src={ad.heroImageUrl} alt={ad.headline} />
                <div className="status-badge" style={{ backgroundColor: getStatusBadgeColor(ad.status) }}>
                  {ad.status.toUpperCase()}
                </div>
              </div>

              <div className="ad-card-content">
                <div className="ad-header">
                  <div>
                    <h3>{ad.headline}</h3>
                    <p className="company">{ad.companyName}</p>
                  </div>
                  <div className="duration">
                    <span>{ad.duration} days</span>
                  </div>
                </div>

                <p className="description">{ad.description}</p>

                <div className="ad-meta">
                  <div className="meta-item">
                    <span className="label">Placements:</span>
                    <span className="value">{ad.placements.join(', ')}</span>
                  </div>
                  <div className="meta-item">
                    <span className="label">Budget:</span>
                    <span className="value">${ad.budget}</span>
                  </div>
                  <div className="meta-item">
                    <span className="label">Submitted:</span>
                    <span className="value">{ad.submittedAt}</span>
                  </div>
                  {ad.status === 'approved' && ad.approvedAt && (
                    <div className="meta-item">
                      <span className="label">Approved:</span>
                      <span className="value">{ad.approvedAt}</span>
                    </div>
                  )}
                  {ad.status === 'rejected' && ad.rejectionReason && (
                    <div className="meta-item error">
                      <span className="label">Reason:</span>
                      <span className="value">{ad.rejectionReason}</span>
                    </div>
                  )}
                  {ad.status === 'live' && ad.impressions && (
                    <>
                      <div className="meta-item">
                        <span className="label">Impressions:</span>
                        <span className="value">{ad.impressions.toLocaleString()}</span>
                      </div>
                      <div className="meta-item">
                        <span className="label">Spent:</span>
                        <span className="value">${ad.spent?.toFixed(2)}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="ad-card-actions">
                <button
                  className="btn-info"
                  onClick={() => {
                    setSelectedAd(ad);
                    setShowDetailModal(true);
                  }}
                >
                  View Details
                </button>
                {ad.status === 'pending' && (
                  <>
                    <button
                      className="btn-success"
                      onClick={() => {
                        setSelectedAd(ad);
                        handleApprove(ad);
                      }}
                    >
                      Approve
                    </button>
                    <button
                      className="btn-danger"
                      onClick={() => handleRejectClick(ad)}
                    >
                      Reject
                    </button>
                  </>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="empty-state">
            <p>No advertisements with status "{filterStatus.toUpperCase()}"</p>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedAd && (
        <div className="modal-overlay" onClick={() => setShowDetailModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedAd.headline}</h2>
              <button className="close-btn" onClick={() => setShowDetailModal(false)}>✕</button>
            </div>

            <div className="modal-body">
              <img src={selectedAd.heroImageUrl} alt={selectedAd.headline} className="modal-image" />

              <div className="detail-section">
                <h3>Company Information</h3>
                <div className="detail-grid">
                  <div className="detail-item">
                    <span className="label">Company:</span>
                    <span className="value">{selectedAd.companyName}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Status:</span>
                    <span
                      className="value"
                      style={{ color: getStatusBadgeColor(selectedAd.status) }}
                    >
                      {selectedAd.status.toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="detail-section">
                <h3>Campaign Details</h3>
                <div className="detail-grid">
                  <div className="detail-item">
                    <span className="label">Start Date:</span>
                    <span className="value">{selectedAd.startDate}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">End Date:</span>
                    <span className="value">{selectedAd.endDate}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Duration:</span>
                    <span className="value">{selectedAd.duration} days</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Budget:</span>
                    <span className="value">${selectedAd.budget}</span>
                  </div>
                </div>
              </div>

              <div className="detail-section">
                <h3>Creative Content</h3>
                <div className="detail-item full">
                  <span className="label">Headline:</span>
                  <span className="value">{selectedAd.headline}</span>
                </div>
                <div className="detail-item full">
                  <span className="label">Description:</span>
                  <span className="value">{selectedAd.description}</span>
                </div>
              </div>

              <div className="detail-section">
                <h3>Placements</h3>
                <div className="placements-list">
                  {selectedAd.placements.map((placement) => (
                    <span key={placement} className="placement-badge">
                      {placement}
                    </span>
                  ))}
                </div>
              </div>

              {selectedAd.status === 'rejected' && selectedAd.rejectionReason && (
                <div className="detail-section error">
                  <h3>Rejection Reason</h3>
                  <p>{selectedAd.rejectionReason}</p>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowDetailModal(false)}>
                Close
              </button>
              {selectedAd.status === 'pending' && (
                <>
                  <button className="btn-success" onClick={() => handleApprove(selectedAd)}>
                    Approve
                  </button>
                  <button className="btn-danger" onClick={() => handleRejectClick(selectedAd)}>
                    Reject
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && selectedAd && (
        <div className="modal-overlay" onClick={() => setShowRejectModal(false)}>
          <div className="modal-content confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Reject Advertisement</h2>
              <button className="close-btn" onClick={() => setShowRejectModal(false)}>✕</button>
            </div>

            <div className="modal-body">
              <p>Provide a reason for rejecting this advertisement:</p>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g., Contact information found in description, Brand safety concern, etc."
                className="reason-textarea"
                rows={4}
              />
            </div>

            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowRejectModal(false)}>
                Cancel
              </button>
              <button className="btn-danger" onClick={confirmReject} disabled={!rejectionReason.trim()}>
                Reject
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .advertising-approval-page {
          padding: 30px;
          background: #fafafa;
          min-height: 100vh;
        }

        .page-header {
          margin-bottom: 30px;
        }

        .page-header h1 {
          font-size: 32px;
          color: #333;
          margin: 0 0 8px 0;
        }

        .page-header p {
          color: #666;
          margin: 0;
        }

        .happy-box {
          display: flex;
          align-items: center;
          gap: 12px;
          background: linear-gradient(135deg, #fff5f0 0%, #fffbf7 100%);
          border: 2px solid #ffb88c;
          border-radius: 12px;
          padding: 16px 20px;
          margin-bottom: 30px;
          font-size: 14px;
          color: #666;
        }

        .happy-box span {
          font-size: 24px;
          flex-shrink: 0;
        }

        .status-filters {
          display: flex;
          gap: 12px;
          margin-bottom: 30px;
          flex-wrap: wrap;
        }

        .filter-btn {
          padding: 10px 20px;
          border: 2px solid #e0e0e0;
          background: white;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 600;
          transition: all 0.2s;
        }

        .filter-btn:hover {
          border-color: #ff6b35;
          color: #ff6b35;
        }

        .filter-btn.active {
          background: #ff6b35;
          color: white;
          border-color: #ff6b35;
        }

        .ads-list {
          display: flex;
          flex-direction: column;
          gap: 20px;
          margin-bottom: 40px;
        }

        .ad-card {
          background: white;
          border: 2px solid #f0f0f0;
          border-radius: 12px;
          overflow: hidden;
          display: flex;
          gap: 20px;
          transition: all 0.3s;
        }

        .ad-card:hover {
          border-color: #ff6b35;
          box-shadow: 0 4px 16px rgba(255, 107, 53, 0.1);
        }

        .ad-card-image {
          flex-shrink: 0;
          width: 280px;
          height: 160px;
          position: relative;
          overflow: hidden;
          background: #f5f5f5;
        }

        .ad-card-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .status-badge {
          position: absolute;
          top: 10px;
          right: 10px;
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 700;
          color: white;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
        }

        .ad-card-content {
          flex: 1;
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .ad-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
        }

        .ad-header h3 {
          margin: 0 0 4px 0;
          font-size: 18px;
          color: #333;
        }

        .ad-header .company {
          margin: 0;
          font-size: 13px;
          color: #999;
        }

        .duration {
          background: #f5f5f5;
          padding: 8px 12px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
          color: #666;
          white-space: nowrap;
        }

        .description {
          margin: 0;
          font-size: 14px;
          color: #666;
          line-height: 1.4;
        }

        .ad-meta {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 12px;
          font-size: 13px;
        }

        .meta-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 0;
          border-bottom: 1px solid #f5f5f5;
        }

        .meta-item.error {
          color: #f44336;
        }

        .meta-item .label {
          color: #999;
          font-weight: 500;
        }

        .meta-item .value {
          color: #333;
          font-weight: 600;
        }

        .ad-card-actions {
          padding: 20px;
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          border-left: 2px solid #f5f5f5;
        }

        .ad-card-actions button {
          padding: 10px 16px;
          font-size: 13px;
          font-weight: 600;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-info {
          background: #f0f0f0;
          color: #333;
        }

        .btn-info:hover {
          background: #e0e0e0;
        }

        .btn-success {
          background: #4caf50;
          color: white;
        }

        .btn-success:hover {
          background: #45a049;
        }

        .btn-danger {
          background: #f44336;
          color: white;
        }

        .btn-danger:hover {
          background: #da190b;
        }

        .btn-danger:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .empty-state {
          text-align: center;
          padding: 60px 20px;
          color: #999;
        }

        /* Modal Styles */
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
          max-width: 700px;
          width: 90%;
          max-height: 80vh;
          overflow-y: auto;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        }

        .modal-content.confirm-modal {
          max-width: 500px;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px;
          border-bottom: 2px solid #f5f5f5;
        }

        .modal-header h2 {
          margin: 0;
          font-size: 20px;
          color: #333;
        }

        .close-btn {
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          color: #999;
          padding: 0;
        }

        .modal-body {
          padding: 20px;
        }

        .modal-image {
          width: 100%;
          border-radius: 8px;
          margin-bottom: 20px;
        }

        .detail-section {
          margin-bottom: 20px;
        }

        .detail-section h3 {
          margin: 0 0 12px 0;
          font-size: 14px;
          font-weight: 700;
          color: #ff6b35;
          text-transform: uppercase;
        }

        .detail-section.error {
          background: #ffebee;
          padding: 12px;
          border-radius: 6px;
        }

        .detail-section.error h3 {
          color: #f44336;
        }

        .detail-section.error p {
          margin: 0;
          color: #c62828;
        }

        .detail-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .detail-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .detail-item.full {
          grid-column: 1 / -1;
        }

        .detail-item .label {
          font-size: 12px;
          color: #999;
          font-weight: 600;
          text-transform: uppercase;
        }

        .detail-item .value {
          font-size: 14px;
          color: #333;
          font-weight: 500;
        }

        .placements-list {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .placement-badge {
          background: #f0f0f0;
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 600;
          color: #333;
        }

        .reason-textarea {
          width: 100%;
          padding: 12px;
          border: 2px solid #e0e0e0;
          border-radius: 6px;
          font-family: inherit;
          font-size: 14px;
          resize: vertical;
          transition: border-color 0.2s;
        }

        .reason-textarea:focus {
          outline: none;
          border-color: #ff6b35;
        }

        .modal-footer {
          padding: 20px;
          border-top: 2px solid #f5f5f5;
          display: flex;
          gap: 12px;
          justify-content: flex-end;
        }

        .modal-footer button {
          padding: 10px 20px;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-secondary {
          background: #f0f0f0;
          color: #333;
        }

        .btn-secondary:hover {
          background: #e0e0e0;
        }
      `}</style>
    </div>
  );
};

export default AdvertisingApproval;
