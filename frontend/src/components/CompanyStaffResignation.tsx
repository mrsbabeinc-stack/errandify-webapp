import React, { useState, useEffect, useCallback } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface StaffResignation {
  id: number;
  errandId: number;
  errandTitle: string;
  employeeName: string;
  assignedDate: string;
  resignationReason: string;
  reasonCategory: string;
  requestDate: string;
  status: 'pending' | 'approved' | 'rejected';
  managerNotes?: string;
}

interface Props {
  companyId?: number | null;
}

/**
 * Staff asking to be taken off an errand they were allocated.
 *
 * Was two hardcoded requests from invented staff, and Approve/Reject only
 * called setState — the errand was never released and the staff member was
 * never told. The STORAGE existed all along: migrations 030 and 031 added
 * decline_reason / decline_notes / declined_at / declined_by to company_orders
 * and allowed 'declined' on its status, and nothing was ever written against
 * them. Now backed by /api/companies/:id/handbacks.
 */
const CompanyStaffResignation: React.FC<Props> = ({ companyId: companyIdProp }) => {
  const [companyId, setCompanyId] = useState<number | null>(companyIdProp ?? null);
  const [resignations, setResignations] = useState<StaffResignation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deciding, setDeciding] = useState<number | null>(null);

  const token = () => localStorage.getItem('token');

  useEffect(() => {
    if (companyIdProp) { setCompanyId(companyIdProp); return; }
    (async () => {
      try {
        const res = await fetch(`${API_URL}/api/companies/user/my-company`, {
          headers: { Authorization: `Bearer ${token()}` },
        });
        if (res.ok) {
          const b = await res.json();
          if (b.data?.id) { setCompanyId(b.data.id); return; }
        }
        setLoading(false);
      } catch { setLoading(false); }
    })();
  }, [companyIdProp]);

  const load = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/companies/${companyId}/handbacks`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      const b = await res.json().catch(() => ({}));
      if (!res.ok) { setError(b.error || 'Could not load requests'); return; }

      setResignations((b.data?.requests || []).map((r: any) => ({
        id: r.id,
        errandId: r.errand_id,
        errandTitle: r.errand_formatted_id
          ? `${r.errand_title} (${r.errand_formatted_id})`
          : r.errand_title,
        employeeName: r.staff_name || 'Staff member',
        assignedDate: r.assigned_date ? String(r.assigned_date).slice(0, 10) : '',
        resignationReason: r.decline_notes || r.decline_reason || '',
        reasonCategory: r.decline_reason || 'Other',
        requestDate: r.declined_at ? String(r.declined_at).slice(0, 10) : '',
        status: r.request_status === 'pending' ? 'pending' : 'approved',
      })));
      setError('');
    } catch {
      setError('Could not load requests');
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => { load(); }, [load]);

  const decide = async (orderId: number, decision: 'approve' | 'reject') => {
    if (!companyId) return;
    setDeciding(orderId);
    setError('');
    try {
      const res = await fetch(`${API_URL}/api/companies/${companyId}/handbacks/${orderId}/decide`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision }),
      });
      const b = await res.json().catch(() => ({}));
      if (!res.ok) { setError(b.error || 'Could not record that decision'); return; }
      await load();
    } catch {
      setError('Could not record that decision');
    } finally {
      setDeciding(null);
    }
  };

  const handleApprove = (id: number) => decide(id, 'approve');
  const handleReject = (id: number) => decide(id, 'reject');

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

      {error && (
        <div style={{
          background: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C',
          padding: '12px 16px', borderRadius: 8, marginBottom: 16, fontSize: 14,
        }}>{error}</div>
      )}

      {/* Resignation List */}
      <div className="resignation-list">
        {loading ? (
          <div className="empty-state"><p>Loading requests…</p></div>
        ) : resignations.length === 0 ? (
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
                    disabled={deciding === resignation.id}
                  >
                    ✓ Approve
                  </button>
                  <button
                    className="btn-reject"
                    onClick={() => handleReject(resignation.id)}
                    disabled={deciding === resignation.id}
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
