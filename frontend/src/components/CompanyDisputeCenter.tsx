import React, { useState } from 'react';

interface Dispute {
  id: number;
  errandId: string;
  involvedParty: string; // 'Doer' or 'Asker'
  jobTitle: string;
  amount: number;
  dateRaised: string;
  status: 'Open' | 'In Review' | 'Resolved' | 'Appealed';
  reason: string;
}

interface CompanyDisputeCenterProps {
  companyId?: number;
}

const CompanyDisputeCenter: React.FC<CompanyDisputeCenterProps> = ({ companyId = 1 }) => {
  const [disputes, setDisputes] = useState<Dispute[]>([
    {
      id: 1,
      errandId: 'ERR-2026-001',
      involvedParty: 'Doer',
      jobTitle: 'Office Cleaning Service',
      amount: 150,
      dateRaised: '2026-07-10',
      status: 'In Review',
      reason: 'Incomplete task completion - not all areas cleaned'
    },
    {
      id: 2,
      errandId: 'ERR-2026-002',
      involvedParty: 'Staff Member',
      jobTitle: 'Delivery Service',
      amount: 85,
      dateRaised: '2026-07-08',
      status: 'Resolved',
      reason: 'Late delivery - staff arrived after deadline'
    }
  ]);

  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('All');

  const filteredDisputes = filterStatus === 'All'
    ? disputes
    : disputes.filter(d => d.status === filterStatus);

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'Open': return '#FF6B35';
      case 'In Review': return '#FF8A5B';
      case 'Resolved': return '#2D7A34';
      case 'Appealed': return '#1B5E75';
      default: return '#666';
    }
  };

  return (
    <div className="dispute-center-container">
      {/* Header */}
      <div className="dispute-header">
        <h2>Dispute Center</h2>
        <p>View and manage disputes involving your company</p>
      </div>

      {/* Filter Tabs */}
      <div className="dispute-filter-tabs">
        {['All', 'Open', 'In Review', 'Resolved', 'Appealed'].map((status) => (
          <button
            key={status}
            className={`filter-tab ${filterStatus === status ? 'active' : ''}`}
            onClick={() => setFilterStatus(status)}
          >
            {status}
            <span className="count">
              {status === 'All'
                ? disputes.length
                : disputes.filter(d => d.status === status).length}
            </span>
          </button>
        ))}
      </div>

      {/* Main Content */}
      <div className="dispute-content">
        {/* Disputes List */}
        <div className="disputes-list">
          {filteredDisputes.length === 0 ? (
            <div className="empty-state">
              <p>No disputes found</p>
            </div>
          ) : (
            <div className="disputes-grid">
              {filteredDisputes.map((dispute) => (
                <div
                  key={dispute.id}
                  className="dispute-card"
                  onClick={() => setSelectedDispute(dispute)}
                >
                  <div className="dispute-card-header">
                    <div className="dispute-info">
                      <h3>{dispute.jobTitle}</h3>
                      <p className="errand-id">{dispute.errandId}</p>
                    </div>
                    <div
                      className="status-badge"
                      style={{ backgroundColor: getStatusBadgeColor(dispute.status) }}
                    >
                      {dispute.status}
                    </div>
                  </div>

                  <div className="dispute-card-body">
                    <div className="detail-row">
                      <span className="label">Disputed By:</span>
                      <span className="value">{dispute.involvedParty}</span>
                    </div>
                    <div className="detail-row">
                      <span className="label">Amount:</span>
                      <span className="value">${dispute.amount}</span>
                    </div>
                    <div className="detail-row">
                      <span className="label">Reason:</span>
                      <span className="value">{dispute.reason}</span>
                    </div>
                    <div className="detail-row">
                      <span className="label">Raised:</span>
                      <span className="value">{dispute.dateRaised}</span>
                    </div>
                  </div>

                  <div className="dispute-card-footer">
                    <button className="btn-view">View Details →</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Detail Panel */}
        {selectedDispute && (
          <div className="dispute-detail-panel">
            <div className="panel-header">
              <h3>{selectedDispute.jobTitle}</h3>
              <button
                className="close-btn"
                onClick={() => setSelectedDispute(null)}
              >
                ✕
              </button>
            </div>

            <div className="panel-content">
              <div className="detail-section">
                <h4>Dispute Information</h4>
                <div className="detail-item">
                  <span className="label">Errand ID:</span>
                  <span className="value">{selectedDispute.errandId}</span>
                </div>
                <div className="detail-item">
                  <span className="label">Status:</span>
                  <span
                    className="value badge"
                    style={{ backgroundColor: getStatusBadgeColor(selectedDispute.status) }}
                  >
                    {selectedDispute.status}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="label">Disputed By:</span>
                  <span className="value">{selectedDispute.involvedParty}</span>
                </div>
                <div className="detail-item">
                  <span className="label">Claim Amount:</span>
                  <span className="value">${selectedDispute.amount}</span>
                </div>
              </div>

              <div className="detail-section">
                <h4>Reason for Dispute</h4>
                <p className="reason-text">{selectedDispute.reason}</p>
              </div>

              <div className="detail-section">
                <h4>Next Steps</h4>
                <div className="next-steps">
                  {selectedDispute.status === 'Open' && (
                    <>
                      <p>Our admin team is reviewing this dispute. You'll be notified when there's an update.</p>
                      <button className="btn-secondary">Provide Additional Evidence</button>
                    </>
                  )}
                  {selectedDispute.status === 'In Review' && (
                    <>
                      <p>This dispute is currently being reviewed by our team.</p>
                      <button className="btn-secondary">Submit Response</button>
                    </>
                  )}
                  {selectedDispute.status === 'Resolved' && (
                    <>
                      <p>This dispute has been resolved by our admin team.</p>
                      <button className="btn-secondary">View Resolution Details</button>
                      <button className="btn-secondary">Appeal Decision</button>
                    </>
                  )}
                  {selectedDispute.status === 'Appealed' && (
                    <p>This dispute is in appeal. You'll be updated once a decision is made.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .dispute-center-container {
          padding: 0;
        }

        .dispute-header {
          margin-bottom: 24px;
        }

        .dispute-header h2 {
          font-size: 24px;
          color: #1B5E75;
          margin: 0 0 8px 0;
        }

        .dispute-header p {
          color: #666;
          margin: 0;
          font-size: 14px;
        }

        .dispute-filter-tabs {
          display: flex;
          gap: 12px;
          margin-bottom: 24px;
          border-bottom: 1px solid #E8E8E8;
          padding-bottom: 12px;
          flex-wrap: wrap;
        }

        .filter-tab {
          background: none;
          border: none;
          padding: 8px 12px;
          color: #666;
          cursor: pointer;
          font-weight: 500;
          font-size: 14px;
          transition: all 0.2s;
          position: relative;
        }

        .filter-tab:hover {
          color: #FF6B35;
        }

        .filter-tab.active {
          color: #FF6B35;
          border-bottom: 3px solid #FF6B35;
          padding-bottom: 9px;
        }

        .filter-tab .count {
          background: #F8FAFB;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 12px;
          margin-left: 6px;
        }

        .dispute-content {
          display: grid;
          grid-template-columns: 1fr 350px;
          gap: 24px;
        }

        .disputes-grid {
          display: grid;
          gap: 16px;
        }

        .dispute-card {
          background: white;
          border: 1px solid #E8E8E8;
          border-radius: 12px;
          padding: 16px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .dispute-card:hover {
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          border-color: #FF6B35;
        }

        .dispute-card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 12px;
        }

        .dispute-info h3 {
          font-size: 16px;
          font-weight: 600;
          margin: 0 0 4px 0;
          color: #1A1A1A;
        }

        .errand-id {
          font-size: 12px;
          color: #999;
          margin: 0;
        }

        .status-badge {
          padding: 4px 12px;
          border-radius: 6px;
          color: white;
          font-size: 12px;
          font-weight: 600;
          white-space: nowrap;
        }

        .dispute-card-body {
          display: grid;
          gap: 8px;
        }

        .detail-row {
          display: flex;
          justify-content: space-between;
          font-size: 13px;
        }

        .detail-row .label {
          color: #999;
          font-weight: 500;
        }

        .detail-row .value {
          color: #1A1A1A;
          font-weight: 500;
        }

        .dispute-card-footer {
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid #F0F0F0;
        }

        .btn-view {
          background: none;
          border: none;
          color: #FF6B35;
          cursor: pointer;
          font-size: 13px;
          font-weight: 600;
        }

        .btn-view:hover {
          text-decoration: underline;
        }

        .empty-state {
          text-align: center;
          padding: 40px 20px;
          color: #999;
        }

        .dispute-detail-panel {
          background: white;
          border: 1px solid #E8E8E8;
          border-radius: 12px;
          padding: 20px;
          max-height: 600px;
          overflow-y: auto;
        }

        .panel-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
          padding-bottom: 12px;
          border-bottom: 1px solid #E8E8E8;
        }

        .panel-header h3 {
          font-size: 16px;
          margin: 0;
          color: #1B5E75;
        }

        .close-btn {
          background: none;
          border: none;
          font-size: 20px;
          cursor: pointer;
          color: #999;
        }

        .panel-content {
          display: grid;
          gap: 16px;
        }

        .detail-section h4 {
          font-size: 14px;
          font-weight: 600;
          color: #1B5E75;
          margin: 0 0 12px 0;
        }

        .detail-item {
          display: grid;
          gap: 4px;
          margin-bottom: 8px;
        }

        .detail-item .label {
          font-size: 12px;
          color: #999;
          font-weight: 500;
        }

        .detail-item .value {
          font-size: 14px;
          color: #1A1A1A;
          font-weight: 500;
        }

        .detail-item .badge {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 6px;
          color: white;
          width: fit-content;
        }

        .reason-text {
          font-size: 13px;
          color: #666;
          line-height: 1.5;
          margin: 0;
        }

        .next-steps {
          display: grid;
          gap: 12px;
        }

        .next-steps p {
          font-size: 13px;
          color: #666;
          margin: 0;
          line-height: 1.5;
        }

        .btn-secondary {
          padding: 8px 12px;
          background: #F8FAFB;
          border: 1px solid #E8E8E8;
          border-radius: 6px;
          color: #FF6B35;
          cursor: pointer;
          font-size: 13px;
          font-weight: 600;
          transition: all 0.2s;
        }

        .btn-secondary:hover {
          background: #FF6B35;
          color: white;
          border-color: #FF6B35;
        }

        @media (max-width: 1024px) {
          .dispute-content {
            grid-template-columns: 1fr;
          }

          .dispute-detail-panel {
            display: none;
          }
        }
      `}</style>
    </div>
  );
};

export default CompanyDisputeCenter;
