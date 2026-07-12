import React, { useState } from 'react';

interface Offer {
  id: number;
  errandId: string;
  errandTitle: string;
  askerName: string;
  budget: number;
  submittedAt: string;
  status: 'pending' | 'accepted' | 'rejected' | 'withdrawn';
  proposedPrice?: number;
}

const DoerMyOffers: React.FC = () => {
  const [offers] = useState<Offer[]>([
    {
      id: 1,
      errandId: 'ERR-2026-001',
      errandTitle: 'Office Cleaning Service',
      askerName: 'ABC Corp',
      budget: 150,
      submittedAt: '2026-07-10',
      status: 'pending',
      proposedPrice: 145,
    },
    {
      id: 2,
      errandId: 'ERR-2026-002',
      errandTitle: 'Delivery Service',
      askerName: 'Sarah Tan',
      budget: 85,
      submittedAt: '2026-07-09',
      status: 'accepted',
      proposedPrice: 80,
    },
    {
      id: 3,
      errandId: 'ERR-2026-003',
      errandTitle: 'Handyman Repairs',
      askerName: 'John Lee',
      budget: 200,
      submittedAt: '2026-07-08',
      status: 'rejected',
      proposedPrice: 190,
    },
  ]);

  const [filteredOffers, setFilteredOffers] = useState<Offer[]>(offers);
  const [selectedFilter, setSelectedFilter] = useState('all');

  const handleFilter = (filter: string) => {
    setSelectedFilter(filter);
    if (filter === 'all') {
      setFilteredOffers(offers);
    } else {
      setFilteredOffers(offers.filter(o => o.status === filter));
    }
  };

  const handleWithdrawOffer = (offerId: number) => {
    alert(`Offer #${offerId} withdrawn`);
  };

  const getStatusBadge = (status: string) => {
    const badges: { [key: string]: { bg: string; color: string; icon: string; text: string } } = {
      pending: { bg: '#FFF4E6', color: '#FF6B35', icon: '⏳', text: 'Pending' },
      accepted: { bg: '#E6F9E6', color: '#2D7A34', icon: '✅', text: 'Accepted' },
      rejected: { bg: '#FFE8E8', color: '#D32F2F', icon: '❌', text: 'Rejected' },
      withdrawn: { bg: '#F0F0F0', color: '#666', icon: '↩️', text: 'Withdrawn' },
    };
    return badges[status] || badges.pending;
  };

  return (
    <div className="doer-offers-container">
      <h2>My Offers</h2>
      <p className="subtitle">Track offers you've submitted on errands</p>

      {/* Filter Tabs */}
      <div className="filter-tabs">
        {['all', 'pending', 'accepted', 'rejected'].map(tab => (
          <button
            key={tab}
            className={`filter-tab ${selectedFilter === tab ? 'active' : ''}`}
            onClick={() => handleFilter(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
            <span className="count">
              {tab === 'all' ? offers.length : offers.filter(o => o.status === tab).length}
            </span>
          </button>
        ))}
      </div>

      {/* Offers List */}
      <div className="offers-list">
        {filteredOffers.length === 0 ? (
          <div className="empty-state">
            <p>No offers in this category</p>
          </div>
        ) : (
          filteredOffers.map(offer => {
            const badge = getStatusBadge(offer.status);
            return (
              <div key={offer.id} className="offer-item">
                <div className="offer-header">
                  <div className="offer-info">
                    <h3>{offer.errandTitle}</h3>
                    <p className="errand-id">{offer.errandId}</p>
                  </div>
                  <div className="offer-status">
                    <span className="status-badge" style={{ background: badge.bg, color: badge.color }}>
                      {badge.icon} {badge.text}
                    </span>
                  </div>
                </div>

                <div className="offer-details">
                  <div className="detail-row">
                    <span className="label">Asker</span>
                    <span className="value">🏢 {offer.askerName}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Budget</span>
                    <span className="value">${offer.budget}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Your Offer</span>
                    <span className="value">${offer.proposedPrice}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Submitted</span>
                    <span className="value">{offer.submittedAt}</span>
                  </div>
                </div>

                <div className="offer-actions">
                  {offer.status === 'pending' && (
                    <button
                      className="btn-withdraw"
                      onClick={() => handleWithdrawOffer(offer.id)}
                    >
                      ↩️ Withdraw
                    </button>
                  )}
                  {offer.status === 'accepted' && (
                    <button className="btn-view-details" disabled>
                      → View Details
                    </button>
                  )}
                  {offer.status === 'rejected' && (
                    <span className="action-text">No further action</span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <style>{`
        .doer-offers-container {
          max-width: 100%;
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

        .filter-tab:hover:not(.active) {
          color: #1B5E75;
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

        .offer-item {
          background: white;
          border: 1px solid #E8E8E8;
          border-radius: 12px;
          padding: 16px;
          transition: all 0.2s;
        }

        .offer-item:hover {
          border-color: #FF6B35;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .offer-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 16px;
        }

        .offer-info h3 {
          margin: 0 0 4px 0;
          color: #1A1A1A;
          font-size: 16px;
        }

        .errand-id {
          font-size: 12px;
          color: #999;
          margin: 0;
        }

        .status-badge {
          padding: 6px 12px;
          border-radius: 6px;
          font-weight: 600;
          font-size: 12px;
          white-space: nowrap;
        }

        .offer-details {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 12px;
          margin-bottom: 16px;
          padding: 12px;
          background: #F8FAFB;
          border-radius: 8px;
        }

        .detail-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .detail-row .label {
          font-size: 12px;
          color: #999;
          font-weight: 600;
        }

        .detail-row .value {
          font-size: 14px;
          color: #1A1A1A;
          font-weight: 500;
        }

        .offer-actions {
          display: flex;
          gap: 12px;
        }

        .btn-withdraw,
        .btn-view-details {
          padding: 8px 16px;
          border-radius: 6px;
          font-weight: 600;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.2s;
          border: none;
        }

        .btn-withdraw {
          background: #FFE8D6;
          color: #FF6B35;
        }

        .btn-withdraw:hover {
          background: #FF6B35;
          color: white;
        }

        .btn-view-details {
          background: #1B5E75;
          color: white;
        }

        .btn-view-details:hover:not(:disabled) {
          background: #144A5A;
        }

        .btn-view-details:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .action-text {
          font-size: 13px;
          color: #999;
          padding: 8px 16px;
        }

        .empty-state {
          text-align: center;
          padding: 40px 20px;
          color: #999;
        }

        @media (max-width: 768px) {
          .offer-details {
            grid-template-columns: 1fr 1fr;
          }

          .offer-actions {
            flex-direction: column;
          }

          .btn-withdraw,
          .btn-view-details {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
};

export default DoerMyOffers;
