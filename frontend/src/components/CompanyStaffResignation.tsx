import React, { useState } from 'react';

interface StaffResignation {
  id: number;
  errandId: number;
  errandTitle: string;
  employeeId: number;
  employeeName: string;
  assignedDate: string;
  resignationReason: string;
  reasonCategory: string;
  requestDate: string;
  status: 'pending' | 'approved' | 'rejected';
  managerNotes?: string;
}

const CompanyStaffResignation: React.FC = () => {
  const [resignations, setResignations] = useState<StaffResignation[]>([
    {
      id: 1,
      errandId: 101,
      errandTitle: 'House Cleaning - Bishan',
      employeeId: 1,
      employeeName: 'Jordan Smith',
      assignedDate: '2026-07-10',
      resignationReason: 'Vehicle breakdown on the way to location',
      reasonCategory: 'Vehicle Issues',
      requestDate: '2026-07-11',
      status: 'pending',
    },
    {
      id: 2,
      errandId: 102,
      errandTitle: 'Office Maintenance - Raffles',
      employeeId: 2,
      employeeName: 'Ava Johnson',
      assignedDate: '2026-07-09',
      resignationReason: 'Delayed completion of previous errand, unable to make it on time',
      reasonCategory: 'Time Conflict',
      requestDate: '2026-07-11',
      status: 'approved',
      managerNotes: 'Understood, reassigning to another staff member.',
    },
  ]);

  const [showModal, setShowModal] = useState(false);
  const [selectedReason, setSelectedReason] = useState('');
  const [customReason, setCustomReason] = useState('');

  const reasonCategories = [
    'Vehicle Issues',
    'Time Conflict',
    'Health Issues',
    'Family Emergency',
    'Technical Problem',
    'Customer Issue',
    'Other',
  ];

  const handleApprove = (resignationId: number) => {
    setResignations(resignations.map(r =>
      r.id === resignationId ? { ...r, status: 'approved' } : r
    ));
  };

  const handleReject = (resignationId: number) => {
    setResignations(resignations.map(r =>
      r.id === resignationId ? { ...r, status: 'rejected' } : r
    ));
  };

  const pendingCount = resignations.filter(r => r.status === 'pending').length;

  return (
    <div className="company-staff-resignation">
      {/* Header */}
      <div className="resignation-header">
        <div>
          <h2>Staff Errand Resignation</h2>
          <p className="subtitle">Manage staff inability to complete assigned errands</p>
        </div>
        <div className="header-stats">
          <div className="stat-card pending">
            <span className="count">{pendingCount}</span>
            <span className="label">Pending Requests</span>
          </div>
        </div>
      </div>

      {/* Resignation List */}
      <div className="resignation-list">
        {resignations.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">📋</span>
            <p>No resignation requests at this time</p>
          </div>
        ) : (
          resignations.map(resignation => (
            <div key={resignation.id} className={`resignation-card ${resignation.status}`}>
              {/* Card Header */}
              <div className="card-header">
                <div className="errand-info">
                  <h3>{resignation.errandTitle}</h3>
                  <span className={`reason-tag ${resignation.reasonCategory.toLowerCase().replace(' ', '-')}`}>
                    {resignation.reasonCategory}
                  </span>
                </div>
                <span className={`status-badge ${resignation.status}`}>
                  {resignation.status === 'pending' && '⏳ Pending'}
                  {resignation.status === 'approved' && '✓ Approved'}
                  {resignation.status === 'rejected' && '✗ Rejected'}
                </span>
              </div>

              {/* Card Body */}
              <div className="card-body">
                <div className="detail-row">
                  <span className="label">Staff Member</span>
                  <span className="value">{resignation.employeeName}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Assigned Date</span>
                  <span className="value">{resignation.assignedDate}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Request Date</span>
                  <span className="value">{resignation.requestDate}</span>
                </div>
                <div className="detail-row full-width">
                  <span className="label">Reason</span>
                  <span className="value reason-text">{resignation.resignationReason}</span>
                </div>
                {resignation.managerNotes && (
                  <div className="detail-row full-width">
                    <span className="label">Manager Notes</span>
                    <span className="value notes">{resignation.managerNotes}</span>
                  </div>
                )}
              </div>

              {/* Card Actions */}
              {resignation.status === 'pending' && (
                <div className="card-actions">
                  <button
                    className="btn-approve"
                    onClick={() => handleApprove(resignation.id)}
                  >
                    ✓ Approve
                  </button>
                  <button
                    className="btn-reject"
                    onClick={() => handleReject(resignation.id)}
                  >
                    ✗ Reject
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <style>{`
        .company-staff-resignation {
          background: #fff;
          border-radius: 12px;
          padding: 24px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .resignation-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 28px;
          gap: 24px;
        }

        .resignation-header h2 {
          margin: 0 0 4px 0;
          font-size: 24px;
        }

        .subtitle {
          margin: 0;
          font-size: 13px;
          color: #999;
        }

        .header-stats {
          display: flex;
          gap: 12px;
        }

        .stat-card {
          background: linear-gradient(135deg, #FF6B35, #FF8A5B);
          color: #fff;
          padding: 16px 24px;
          border-radius: 12px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          min-width: 120px;
        }

        .stat-card.pending {
          background: linear-gradient(135deg, #FF6B35, #FF8A5B);
        }

        .stat-card .count {
          font-size: 28px;
          font-weight: 700;
        }

        .stat-card .label {
          font-size: 11px;
          text-align: center;
        }

        .resignation-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .empty-state {
          text-align: center;
          padding: 20px 24px;
          color: #999;
        }

        .empty-icon {
          font-size: 48px;
          display: block;
          margin-bottom: 12px;
        }

        .empty-state p {
          margin: 0;
          font-size: 14px;
        }

        .resignation-card {
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          overflow: hidden;
          transition: all 0.2s;
        }

        .resignation-card:hover {
          box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
        }

        .resignation-card.pending {
          border-left: 4px solid #FF6B35;
        }

        .resignation-card.approved {
          border-left: 4px solid #27AE60;
          background: #FFF9F5;
        }

        .resignation-card.rejected {
          border-left: 4px solid #E74C3C;
          background: #FFF9F5;
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding: 16px;
          border-bottom: 1px solid #f0f0f0;
          gap: 12px;
        }

        .errand-info {
          flex: 1;
        }

        .errand-info h3 {
          margin: 0 0 8px 0;
          font-size: 15px;
          font-weight: 600;
        }

        .reason-tag {
          display: inline-block;
          font-size: 11px;
          padding: 4px 8px;
          background: #e0e0e0;
          border-radius: 4px;
          font-weight: 600;
          color: #333;
        }

        .reason-tag.vehicle-issues {
          background: #FFE0B2;
          color: #E55A24;
        }

        .reason-tag.time-conflict {
          background: #E1BEE7;
          color: #6A1B9A;
        }

        .reason-tag.health-issues {
          background: #FFCCBC;
          color: #D84315;
        }

        .reason-tag.family-emergency {
          background: #F8BBD0;
          color: #C2185B;
        }

        .reason-tag.technical-problem {
          background: #B2DFDB;
          color: #00695C;
        }

        .reason-tag.customer-issue {
          background: #B3E5FC;
          color: #01579B;
        }

        .status-badge {
          font-size: 12px;
          padding: 6px 12px;
          background: #E0E0E0;
          border-radius: 6px;
          font-weight: 600;
          white-space: nowrap;
        }

        .status-badge.pending {
          background: #FF6B35;
          color: #fff;
        }

        .status-badge.approved {
          background: #27AE60;
          color: #fff;
        }

        .status-badge.rejected {
          background: #E74C3C;
          color: #fff;
        }

        .card-body {
          padding: 16px;
        }

        .detail-row {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 12px;
          font-size: 13px;
        }

        .detail-row:last-child {
          margin-bottom: 0;
        }

        .detail-row.full-width {
          flex-direction: column;
        }

        .detail-row .label {
          color: #999;
          font-weight: 600;
        }

        .detail-row .value {
          color: #333;
          text-align: right;
        }

        .detail-row.full-width .value {
          text-align: left;
        }

        .reason-text {
          background: #f5f5f5;
          padding: 8px;
          border-radius: 4px;
          line-height: 1.5;
        }

        .notes {
          background: #E8F5E9;
          padding: 8px;
          border-radius: 4px;
          line-height: 1.5;
        }

        .card-actions {
          display: flex;
          gap: 8px;
          padding: 12px 16px;
          border-top: 1px solid #f0f0f0;
          background: #fafafa;
        }

        .btn-approve,
        .btn-reject {
          flex: 1;
          padding: 10px 12px;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 13px;
          font-weight: 600;
          transition: all 0.2s;
        }

        .btn-approve {
          background: #27AE60;
          color: #fff;
        }

        .btn-approve:hover {
          background: #229954;
        }

        .btn-reject {
          background: #E74C3C;
          color: #fff;
        }

        .btn-reject:hover {
          background: #CB4335;
        }
      `}</style>
    </div>
  );
};

export default CompanyStaffResignation;
