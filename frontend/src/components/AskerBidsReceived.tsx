import React, { useState, useEffect, useCallback } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface Offer {
  id: number;
  errandId: string;
  errandTitle: string;
  doerName: string;
  doerType: 'individual' | 'company';
  proposedPrice: number;
  rating: number;
  submittedAt: string;
  status: string;
  message: string;
}

/**
 * Was a hardcoded list ("John Cleaners", ERR-2026-001) with accept/reject
 * buttons that only called alert() — the offer was never accepted and no money
 * ever moved. Now reads GET /api/bids/received and acts through the real
 * accept/reject routes.
 */
const AskerBidsReceived: React.FC = () => {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [acting, setActing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/bids/received`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) { setError(body.error || 'Could not load offers'); return; }

      setOffers((body.data || []).map((o: any) => ({
        id: o.id,
        errandId: o.errand_formatted_id || `#${o.errand_id}`,
        errandTitle: o.errand_title,
        doerName: o.doer_company_name || o.doer_name,
        doerType: o.doer_company_name ? 'company' : 'individual',
        proposedPrice: Number(o.amount) || 0,
        rating: Number(o.doer_rating) || 0,
        submittedAt: o.created_at,
        status: o.status,
        message: o.note || '',
      })));
      setError('');
    } catch {
      setError('Could not load offers');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // `accepted` covers confirmed too — otherwise an offer the doer has already
  // started appears under no tab at all, and the tab counts don't add up to All.
  const matchesTab = (o: Offer, tab: string) =>
    tab === 'accepted' ? (o.status === 'accepted' || o.status === 'confirmed') : o.status === tab;

  const filteredOffers = statusFilter === 'all'
    ? offers
    : offers.filter(o => matchesTab(o, statusFilter));

  const handleFilter = (status: string) => setStatusFilter(status);

  const act = async (offerId: number, action: 'accept' | 'reject') => {
    setActing(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/api/bids/${offerId}/${action}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) { setError(body.error || `Could not ${action} that offer`); return; }
      setSelectedOffer(null);
      await load();
    } catch {
      setError(`Could not ${action} that offer`);
    } finally {
      setActing(false);
    }
  };

  const handleAcceptOffer = (offerId: number) => act(offerId, 'accept');
  const handleRejectOffer = (offerId: number) => act(offerId, 'reject');

  const getStatusBadge = (status: string) => {
    const badges: { [key: string]: { bg: string; color: string; icon: string; text: string } } = {
      pending: { bg: '#FFF4E6', color: '#FF6B35', icon: '⏳', text: 'Pending' },
      accepted: { bg: '#E6F9E6', color: '#2D7A34', icon: '✅', text: 'Accepted' },
      // A confirmed offer is one the doer has started. It has no badge of its
      // own before, so it fell through to the `pending` default and an errand
      // already under way was shown as still awaiting a decision.
      confirmed: { bg: '#E6F4FF', color: '#1D4ED8', icon: '🚀', text: 'In progress' },
      rejected: { bg: '#FFE8E8', color: '#D32F2F', icon: '❌', text: 'Rejected' },
      withdrawn: { bg: '#F0F0F0', color: '#666', icon: '↩️', text: 'Withdrawn' },
      closed: { bg: '#F0F0F0', color: '#666', icon: '🔒', text: 'Closed' },
      cancelled: { bg: '#F0F0F0', color: '#666', icon: '🚫', text: 'Cancelled' },
    };
    return badges[status] || { bg: '#F0F0F0', color: '#666', icon: '•', text: status };
  };

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

  const pendingOffers = offers.filter(o => o.status === 'pending').length;

  return (
    <div className="asker-bids-container">
      <div className="section-header">
        <h2>Offers Received</h2>
        {pendingOffers > 0 && <span className="pending-badge">{pendingOffers}</span>}
      </div>
      <p className="subtitle">Review offers from doers on your posted errands</p>

      {/* Filter Tabs */}
      <div className="filter-tabs">
        {['all', 'pending', 'accepted', 'rejected'].map(tab => (
          <button
            key={tab}
            className={`filter-tab ${statusFilter === tab ? 'active' : ''}`}
            onClick={() => handleFilter(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
            <span className="count">
              {tab === 'all' ? offers.length : offers.filter(o => matchesTab(o, tab)).length}
            </span>
          </button>
        ))}
      </div>

      {error && <div className="offers-error">{error}</div>}

      {/* Offers List */}
      <div className="offers-list">
        {loading ? (
          <div className="empty-state"><p>Loading offers…</p></div>
        ) : filteredOffers.length === 0 ? (
          <div className="empty-state">
            <p>{offers.length === 0 ? 'No offers yet on your errands' : 'No offers in this category'}</p>
          </div>
        ) : (
          filteredOffers.map(offer => {
            const badge = getStatusBadge(offer.status);
            return (
              <div key={offer.id} className="offer-card">
                <div className="card-header">
                  <div className="doer-info">
                    <div className="doer-header">
                      <p className="doer-name">
                        {offer.doerType === 'company' ? '🏢' : '👤'} {offer.doerName}
                      </p>
                      <div className="rating">
                        {renderStars(offer.rating)}
                        <span className="rating-value">{offer.rating.toFixed(1)}</span>
                      </div>
                    </div>
                    <p className="errand-title">{offer.errandTitle}</p>
                    <p className="errand-id">{offer.errandId}</p>
                  </div>
                  <div className="offer-status">
                    <span className="status-badge" style={{ background: badge.bg, color: badge.color }}>
                      {badge.icon} {badge.text}
                    </span>
                  </div>
                </div>

                {offer.message && <p className="offer-message">"{offer.message}"</p>}

                <div className="offer-footer">
                  <div className="price-section">
                    <span className="label">Proposed Price</span>
                    <span className="price">${offer.proposedPrice}</span>
                  </div>
                  <span className="submitted-at">{new Date(offer.submittedAt).toLocaleString()}</span>
                </div>

                <button
                  className="btn-view-details"
                  onClick={() => setSelectedOffer(offer)}
                >
                  View Details →
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Detail Modal */}
      {selectedOffer && (
        <div className="modal-overlay" onClick={() => setSelectedOffer(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setSelectedOffer(null)}>✕</button>

            <div className="modal-header">
              <div>
                <p className="modal-doer">
                  {selectedOffer.doerType === 'company' ? '🏢' : '👤'} {selectedOffer.doerName}
                </p>
                <p className="modal-errand">{selectedOffer.errandTitle}</p>
                <p className="modal-id">{selectedOffer.errandId}</p>
              </div>
              <div className="modal-rating">
                {renderStars(selectedOffer.rating)}
                <span>{selectedOffer.rating.toFixed(1)}</span>
              </div>
            </div>

            <div className="modal-body">
              <h4>Doer's Message</h4>
              <p className="message-text">
                {selectedOffer.message ? `"${selectedOffer.message}"` : 'No message left with this offer.'}
              </p>
            </div>

            <div className="details-grid">
              <div className="detail-item">
                <span className="label">Proposed Price</span>
                <span className="value">${selectedOffer.proposedPrice}</span>
              </div>
              <div className="detail-item">
                <span className="label">Submitted</span>
                <span className="value">{new Date(selectedOffer.submittedAt).toLocaleString()}</span>
              </div>
            </div>

            <div className="modal-actions">
              {selectedOffer.status === 'pending' && (
                <>
                  <button
                    className="btn-accept"
                    disabled={acting}
                    onClick={() => handleAcceptOffer(selectedOffer.id)}
                  >
                    {acting ? 'Working…' : '✅ Accept Offer'}
                  </button>
                  <button
                    className="btn-reject"
                    disabled={acting}
                    onClick={() => handleRejectOffer(selectedOffer.id)}
                  >
                    {acting ? 'Working…' : '❌ Reject'}
                  </button>
                </>
              )}
              {selectedOffer.status === 'accepted' && (
                <button className="btn-proceed">
                  → Proceed to Payment
                </button>
              )}
              {selectedOffer.status === 'rejected' && (
                <span className="action-text">This offer has been rejected</span>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        .asker-bids-container {
          max-width: 100%;
        }

        .section-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 8px;
        }

        .section-header h2 {
          margin: 0;
        }

        .pending-badge {
          background: #FF6B35;
          color: white;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          white-space: nowrap;
        }

        .subtitle {
          color: #666;
          margin-bottom: 24px;
          font-size: 14px;
        }

        .filter-tabs {
          display: flex;
          gap: 8px;
          margin-bottom: 24px;
          border-bottom: 1px solid #E8E8E8;
          padding-bottom: 12px;
        }

        .filter-tab {
          padding: 8px 16px;
          background: none;
          border: none;
          border-bottom: 2px solid transparent;
          font-weight: 600;
          color: #666;
          cursor: pointer;
          transition: all 0.2s;
          font-size: 14px;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .filter-tab.active {
          color: #FF6B35;
          border-bottom-color: #FF6B35;
        }

        .filter-tab .count {
          background: #E8E8E8;
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 12px;
          color: #666;
        }

        .filter-tab.active .count {
          background: #FFE8D6;
          color: #FF6B35;
        }

        .offers-list {
          display: grid;
          gap: 12px;
        }

        .offer-card {
          background: white;
          border: 1px solid #E8E8E8;
          border-radius: 12px;
          padding: 16px;
          transition: all 0.2s;
        }

        .offer-card:hover {
          border-color: #FF6B35;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 12px;
        }

        .doer-info {
          flex: 1;
        }

        .doer-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 4px;
        }

        .doer-name {
          margin: 0;
          font-weight: 600;
          color: #1A1A1A;
          font-size: 15px;
        }

        .rating {
          display: flex;
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

        .status-badge {
          padding: 6px 12px;
          border-radius: 6px;
          font-weight: 600;
          font-size: 12px;
          white-space: nowrap;
        }

        .offers-error {
          background: #FEF2F2;
          border: 1px solid #FECACA;
          color: #B91C1C;
          padding: 12px 16px;
          border-radius: 8px;
          margin-bottom: 16px;
          font-size: 14px;
        }

        .offer-message {
          font-size: 13px;
          color: #666;
          line-height: 1.5;
          margin: 0 0 12px 0;
          font-style: italic;
          padding: 12px;
          background: #F8FAFB;
          border-radius: 8px;
        }

        .offer-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
          padding-bottom: 12px;
          border-bottom: 1px solid #E8E8E8;
        }

        .price-section {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .price-section .label {
          font-size: 11px;
          color: #999;
          font-weight: 600;
        }

        .price {
          font-size: 16px;
          font-weight: 700;
          color: #FF6B35;
        }

        .submitted-at {
          font-size: 12px;
          color: #999;
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
          font-size: 18px;
        }

        .modal-rating span {
          font-weight: 600;
          color: #FFB800;
          font-size: 14px;
        }

        .modal-body {
          margin-bottom: 16px;
        }

        .modal-body h4 {
          margin: 0 0 12px 0;
          color: #1B5E75;
          font-size: 14px;
        }

        .message-text {
          margin: 0;
          font-size: 13px;
          color: #666;
          line-height: 1.5;
          font-style: italic;
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

        .modal-actions {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .btn-accept,
        .btn-reject,
        .btn-proceed {
          padding: 10px 16px;
          border: none;
          border-radius: 6px;
          font-weight: 600;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-accept {
          background: #2D7A34;
          color: white;
        }

        .btn-accept:hover {
          background: #1E5B25;
        }

        .btn-reject {
          background: #FFE8E8;
          color: #D32F2F;
        }

        .btn-reject:hover {
          background: #D32F2F;
          color: white;
        }

        .btn-proceed {
          grid-column: 1 / -1;
          background: #1B5E75;
          color: white;
        }

        .btn-proceed:hover {
          background: #144A5A;
        }

        .action-text {
          grid-column: 1 / -1;
          text-align: center;
          padding: 10px;
          color: #999;
          font-size: 13px;
        }

        @media (max-width: 768px) {
          .modal-actions {
            grid-template-columns: 1fr;
          }

          .btn-proceed {
            grid-column: 1 / -1;
          }

          .details-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

export default AskerBidsReceived;
