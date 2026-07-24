import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useToast, ToastContainer } from '../../components/Toast';
import AdminLayout from '../../components/admin/AdminLayout';

/**
 * routes/advertisingAdmin.ts has served this screen's whole workflow — queue,
 * approve, reject, pause, end — the entire time. Nothing here called it: the
 * list was `mockAds` and Approve/Reject only edited local state, so an admin
 * could work through the queue and no campaign ever changed. (The endpoints
 * were unreachable anyway until the router's guard was fixed.)
 */
const ADMIN_ADS = '/api/admin/advertising';

const authHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

/** campaigns row -> the shape this screen renders. */
const toAdvertisement = (c: any): Advertisement => ({
  id: String(c.id),
  companyId: String(c.company_id ?? ''),
  companyName: c.company_name || `Company ${c.company_id}`,
  headline: c.title || '',
  description: c.description || '',
  heroImageUrl: c.image_url || '',
  startDate: c.starts_at || '',
  endDate: c.ends_at || '',
  duration: c.duration_days ?? 0,
  placements: [],
  // 'submitted' is what the backend calls a campaign awaiting a decision.
  status: c.status === 'submitted' ? 'pending' : c.status,
  submittedAt: c.submitted_at || c.created_at || '',
  approvedAt: c.approved_at || undefined,
  rejectionReason: c.rejection_reason || undefined,
  budget: Number(c.budget ?? 0),
  spent: Number(c.spent ?? 0),
});

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


export const AdvertisingApproval: React.FC = () => {
  // Declared up here because loadAds closes over showToast.
  const navigate = useNavigate();
  const { toasts, showToast, removeToast } = useToast();

  const [ads, setAds] = useState<Advertisement[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('pending');
  const [selectedAd, setSelectedAd] = useState<Advertisement | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  // useToast() builds a new showToast on every render, so depending on it below
  // would give useCallback a new identity each time and re-fire the effect on
  // every render. Reach it through a ref so `loadAds` only changes when it must.
  const toast = useRef(showToast);
  toast.current = showToast;

  // The queue endpoint returns only 'submitted'. Any other filter has to ask
  // for that status explicitly, otherwise switching tabs would show nothing.
  const loadAds = useCallback(async (status: string) => {
    setLoading(true);
    try {
      const backendStatus = status === 'pending' ? 'submitted' : status;
      const { data } = await axios.get(`${ADMIN_ADS}/campaigns`, {
        headers: authHeaders(),
        params: status ? { status: backendStatus } : undefined,
      });
      setAds((data.campaigns || []).map(toAdvertisement));
    } catch (err: any) {
      console.error('[AdvertisingApproval] Failed to load campaigns:', err);
      toast.current(`⚠️ Could not load campaigns: ${err.response?.data?.error || err.message}`, 'error');
      setAds([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAds(filterStatus); }, [filterStatus, loadAds]);

  // The list already reflects the filter the server applied.
  const filteredAds = ads;

  const handleApprove = async (ad: Advertisement) => {
    setBusy(true);
    try {
      await axios.post(`${ADMIN_ADS}/approve`, { campaign_id: Number(ad.id) }, { headers: authHeaders() });
      showToast(`✅ Approved "${ad.headline}"`, 'success');
      setShowDetailModal(false);
      await loadAds(filterStatus);
    } catch (err: any) {
      // 402 is the service refusing because the Stripe charge failed — the
      // campaign is deliberately left unapproved, so say so rather than
      // showing it as approved.
      console.error('[AdvertisingApproval] Approve failed:', err);
      showToast(`❌ ${err.response?.data?.error || err.message}`, 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleRejectClick = (ad: Advertisement) => {
    setSelectedAd(ad);
    setRejectionReason('');
    setShowRejectModal(true);
  };

  const confirmReject = async () => {
    if (!selectedAd) return;
    // Matches the server's own rule, so the advertiser always gets a reason.
    if (rejectionReason.trim().length < 10) {
      showToast('❌ Give a rejection reason of at least 10 characters', 'error');
      return;
    }
    setBusy(true);
    try {
      await axios.post(
        `${ADMIN_ADS}/reject`,
        { campaign_id: Number(selectedAd.id), rejection_reason: rejectionReason.trim() },
        { headers: authHeaders() }
      );
      showToast(`✅ Rejected "${selectedAd.headline}"`, 'success');
      setShowRejectModal(false);
      setShowDetailModal(false);
      await loadAds(filterStatus);
    } catch (err: any) {
      console.error('[AdvertisingApproval] Reject failed:', err);
      showToast(`❌ ${err.response?.data?.error || err.message}`, 'error');
    } finally {
      setBusy(false);
    }
  };

  const getStatusBadgeColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: '#ff9800',
      approved: '#4caf50',
      rejected: '#f44336',
      live: '#F0A81E',
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
    <AdminLayout>
      <div className="advertising-approval-page">
      <ToastContainer toasts={toasts} onClose={removeToast} />
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '30px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#333', margin: '0 0 8px 0' }}>📸 Advertising Approval</h1>
          <p style={{ fontSize: '14px', color: '#666', margin: 0 }}>Review and approve company advertisements</p>
        </div>
        <button
          onClick={() => navigate(-1)}
          style={{
            fontSize: '24px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: '#FF6B35',
            fontWeight: '700',
            padding: '0 8px',
          }}
          title="Go back"
        >
          ←
        </button>
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
        {loading ? (
          <div className="empty-state">
            <p>Loading campaigns…</p>
          </div>
        ) : filteredAds.length > 0 ? (
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
                      disabled={busy}
                      onClick={() => {
                        setSelectedAd(ad);
                        handleApprove(ad);
                      }}
                    >
                      {busy ? 'Working…' : 'Approve'}
                    </button>
                    <button
                      className="btn-danger"
                      disabled={busy}
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
                  <button className="btn-success" disabled={busy} onClick={() => handleApprove(selectedAd)}>
                    {busy ? 'Working…' : 'Approve'}
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
              <button className="btn-danger" onClick={confirmReject} disabled={busy || rejectionReason.trim().length < 10}>
                {busy ? 'Working…' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .advertising-approval-page {
          padding: 30px;
          background: #FFF8F5;
          min-height: 100vh;
        }

        .happy-box {
          display: flex;
          align-items: center;
          gap: 12px;
          background: white;
          border: 2px solid #FFD9B3;
          border-radius: 12px;
          padding: 16px 20px;
          margin-bottom: 30px;
          font-size: 14px;
          color: #555;
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
          border: 2px solid #FFD9B3;
          background: white;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 600;
          color: #333;
          transition: all 0.2s;
        }

        .filter-btn:hover {
          border-color: #FF6B35;
          color: #FF6B35;
        }

        .filter-btn.active {
          background: #FF6B35;
          color: white;
          border-color: #FF6B35;
        }

        .ads-list {
          display: flex;
          flex-direction: column;
          gap: 20px;
          margin-bottom: 40px;
        }

        .ad-card {
          background: white;
          border: 2px solid #FFD9B3;
          border-radius: 12px;
          overflow: hidden;
          display: flex;
          gap: 20px;
          transition: all 0.3s;
        }

        .ad-card:hover {
          border-color: #FF6B35;
          box-shadow: 0 4px 16px rgba(255, 107, 53, 0.15);
        }

        .ad-card-image {
          flex-shrink: 0;
          width: 280px;
          height: 160px;
          position: relative;
          overflow: hidden;
          background: #FFF8F5;
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
          font-weight: bold;
          color: #333;
        }

        .ad-header .company {
          margin: 0;
          font-size: 13px;
          color: #999;
        }

        .duration {
          background: #FFF8F5;
          padding: 8px 12px;
          border-radius: 6px;
          border: 1px solid #FFD9B3;
          font-size: 12px;
          font-weight: 600;
          color: #666;
          white-space: nowrap;
        }

        .description {
          margin: 0;
          font-size: 14px;
          color: #555;
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
          border-bottom: 1px solid #FFD9B3;
        }

        .meta-item.error {
          color: #F44336;
        }

        .meta-item .label {
          color: #999;
          font-weight: 500;
          font-size: 12px;
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
          border-left: 2px solid #FFD9B3;
          background: #FFF8F5;
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
          background: white;
          color: #333;
          border: 2px solid #FFD9B3;
        }

        .btn-info:hover {
          border-color: #FF6B35;
          color: #FF6B35;
        }

        .btn-success {
          background: #4CAF50;
          color: white;
          border: none;
        }

        .btn-success:hover {
          background: #45a049;
        }

        .btn-danger {
          background: #F44336;
          color: white;
          border: none;
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
          border: 2px solid #FFD9B3;
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
          border-bottom: 2px solid #FFD9B3;
          background: #FFF8F5;
        }

        .modal-header h2 {
          margin: 0;
          font-size: 18px;
          font-weight: bold;
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
          border: 2px solid #FFD9B3;
          margin-bottom: 20px;
        }

        .detail-section {
          margin-bottom: 20px;
        }

        .detail-section h3 {
          margin: 0 0 12px 0;
          font-size: 12px;
          font-weight: 700;
          color: #FF6B35;
          text-transform: uppercase;
        }

        .detail-section.error {
          background: #ffebee;
          padding: 12px;
          border-radius: 6px;
        }

        .detail-section.error h3 {
          color: #F44336;
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
          background: #FFF8F5;
          padding: 6px 12px;
          border: 1px solid #FFD9B3;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 600;
          color: #333;
        }

        .reason-textarea {
          width: 100%;
          padding: 12px;
          border: 2px solid #FFD9B3;
          background: white;
          border-radius: 6px;
          font-family: inherit;
          font-size: 14px;
          color: #333;
          resize: vertical;
          transition: border-color 0.2s;
        }

        .reason-textarea:focus {
          outline: none;
          border-color: #FF6B35;
          background: #FFF8F5;
        }

        .modal-footer {
          padding: 20px;
          border-top: 2px solid #FFD9B3;
          background: #FFF8F5;
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
          background: white;
          color: #333;
          border: 2px solid #FFD9B3;
        }

        .btn-secondary:hover {
          border-color: #FF6B35;
          color: #FF6B35;
        }
      `}</style>
    </div>
    </AdminLayout>
  );
};

export default AdvertisingApproval;
