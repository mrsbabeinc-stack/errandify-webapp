import React, { useState, useEffect, useCallback } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface Employee {
  id: number;
  name: string;
  role: string;
  pointsBalance: number;
  totalReceived: number;
}

interface PointsDistribution {
  id: number;
  employeeName: string;
  pointsAwarded: number;
  reason: string;
  distributedBy: string;
  distributedDate: string;
}

interface Props {
  companyId?: number | null;
}

/**
 * Distributing EP used to be a pure setState: the "Distribute" button pushed a
 * row into local state and showed it as completed, while the company balance
 * never moved and the staff member never received anything. The balance,
 * the team and the history shown here were all hardcoded too.
 *
 * Now backed by /api/companies/:id/points (read) and .../points/allocate
 * (write), which moves the EP inside one transaction.
 */
const CompanyPointsDistribution: React.FC<Props> = ({ companyId: companyIdProp }) => {
  const [companyId, setCompanyId] = useState<number | null>(companyIdProp ?? null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [distributions, setDistributions] = useState<PointsDistribution[]>([]);
  const [companyBalance, setCompanyBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [selectedEmployees, setSelectedEmployees] = useState<number[]>([]);
  const [pointsPerEmployee, setPointsPerEmployee] = useState('');
  const [reason, setReason] = useState('');

  const token = () => localStorage.getItem('token');

  // Resolve the company when the parent doesn't pass one
  useEffect(() => {
    if (companyIdProp) { setCompanyId(companyIdProp); return; }
    (async () => {
      try {
        const res = await fetch(`${API_URL}/api/companies/user/my-company`, {
          headers: { Authorization: `Bearer ${token()}` },
        });
        if (res.ok) {
          const body = await res.json();
          if (body.data?.id) setCompanyId(body.data.id);
          else setLoading(false);
        } else setLoading(false);
      } catch { setLoading(false); }
    })();
  }, [companyIdProp]);

  const load = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/companies/${companyId}/points`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) { setError(body.error || 'Could not load points'); return; }

      setCompanyBalance(body.data?.companyBalance ?? 0);
      setEmployees((body.data?.staff || []).map((s: any) => ({
        id: s.user_id,
        name: s.name,
        role: s.role,
        pointsBalance: s.staff_points ?? 0,
        totalReceived: s.total_received ?? 0,
      })));
      setDistributions((body.data?.history || []).map((h: any) => ({
        id: h.id,
        employeeName: h.staff_name,
        pointsAwarded: h.points,
        reason: h.reason || '—',
        distributedBy: h.allocated_by_name || '—',
        distributedDate: new Date(h.created_at).toLocaleDateString(),
      })));
      setError('');
    } catch {
      setError('Could not load points');
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => { load(); }, [load]);

  const toggleEmployeeSelection = (employeeId: number) => {
    setSelectedEmployees(prev =>
      prev.includes(employeeId)
        ? prev.filter(id => id !== employeeId)
        : [...prev, employeeId]
    );
  };

  const handleDistribute = async () => {
    const points = parseInt(pointsPerEmployee) || 0;
    if (!companyId || selectedEmployees.length === 0 || points <= 0) return;

    setSubmitting(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/api/companies/${companyId}/points/allocate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staffUserIds: selectedEmployees,
          pointsEach: points,
          reason,
        }),
      });
      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        // Surface the server's reason — the balance check lives there, where it
        // can be enforced, not in this component
        setError(body.error || 'Could not distribute those points');
        return;
      }

      setSelectedEmployees([]);
      setPointsPerEmployee('');
      setReason('');
      setShowModal(false);
      await load();
    } catch {
      setError('Could not distribute those points');
    } finally {
      setSubmitting(false);
    }
  };

  const totalPoints = selectedEmployees.length * (parseInt(pointsPerEmployee) || 0);

  return (
    <div className="company-points-distribution">
      {/* Header */}
      <div className="points-header">
        <h2>Points Distribution</h2>
        <div className="header-info">
          <div className="balance-card">
            <span className="label">Company Balance</span>
            <span className="value">{companyBalance.toLocaleString()}</span>
            <span className="ep-label">EP</span>
          </div>
          <button className="btn-primary" onClick={() => setShowModal(true)}>
            📤 Distribute Points
          </button>
        </div>
      </div>

      {error && <div className="points-error">{error}</div>}

      {/* Distribution History */}
      <div className="distribution-history">
        <h3>Distribution History</h3>
        <div className="history-list">
          {loading && <p className="points-empty">Loading…</p>}
          {!loading && distributions.length === 0 && (
            <p className="points-empty">No points distributed yet.</p>
          )}
          {/* Allocation is immediate and atomic on the server, so there is no
              pending state to approve — every row here is money that moved. */}
          {distributions.map(dist => (
            <div key={dist.id} className="history-item completed">
              <div className="item-content">
                <div className="item-header">
                  <h4>{dist.employeeName}</h4>
                  <span className="status-badge completed">✓ Completed</span>
                </div>
                <div className="item-details">
                  <span className="reason">{dist.reason}</span>
                  <span className="date">{dist.distributedDate} · by {dist.distributedBy}</span>
                </div>
              </div>
              <div className="points-amount">
                <span className="amount">+{dist.pointsAwarded}</span>
                <span className="ep">EP</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Distribute Points</h3>
              <button className="close-btn" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              {/* Employee Selection */}
              <div className="form-section">
                <h4>Select Employees</h4>
                <div className="employee-list">
                  {employees.length === 0 && (
                    <p className="points-empty">
                      Nobody on the team yet — invite staff from My Staff first.
                    </p>
                  )}
                  {employees.map(emp => (
                    <label key={emp.id} className="employee-checkbox">
                      <input
                        type="checkbox"
                        checked={selectedEmployees.includes(emp.id)}
                        onChange={() => toggleEmployeeSelection(emp.id)}
                      />
                      <div className="employee-info">
                        <span className="name">{emp.name}</span>
                        <span className="role">{emp.role} • {emp.pointsBalance} EP</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {selectedEmployees.length > 0 && (
                <>
                  {/* Points Input */}
                  <div className="form-group">
                    <label>Points Per Employee</label>
                    <input
                      type="number"
                      placeholder="Enter points"
                      value={pointsPerEmployee}
                      onChange={e => setPointsPerEmployee(e.target.value)}
                      min="0"
                    />
                    {pointsPerEmployee && (
                      <div className="calculation">
                        <span>{selectedEmployees.length} employees × {pointsPerEmployee} EP</span>
                        <span className="total">=  {totalPoints} EP</span>
                      </div>
                    )}
                  </div>

                  {/* Reason */}
                  <div className="form-group">
                    <label>Reason for Distribution</label>
                    <select value={reason} onChange={e => setReason(e.target.value)}>
                      <option value="">Select a reason...</option>
                      <option value="Monthly bonus">Monthly Bonus</option>
                      <option value="Excellent performance">Excellent Performance</option>
                      <option value="Attendance award">Attendance Award</option>
                      <option value="Team collaboration">Team Collaboration</option>
                      <option value="Customer satisfaction">Customer Satisfaction</option>
                      <option value="Custom">Custom Reason</option>
                    </select>
                  </div>

                  {reason === 'Custom' && (
                    <div className="form-group">
                      <label>Custom Reason</label>
                      <textarea
                        placeholder="Enter reason"
                        value={reason}
                        onChange={e => setReason(e.target.value)}
                      />
                    </div>
                  )}

                  {/* Summary */}
                  <div className="distribution-summary">
                    <div className="summary-row">
                      <span>Employees Selected</span>
                      <span className="value">{selectedEmployees.length}</span>
                    </div>
                    <div className="summary-row">
                      <span>Total Points</span>
                      <span className="value">{totalPoints} EP</span>
                    </div>
                    <div className="summary-row">
                      <span>Company Balance After</span>
                      <span className="value">{(companyBalance - totalPoints).toLocaleString()} EP</span>
                    </div>
                  </div>
                </>
              )}

              {/* Actions */}
              <div className="modal-actions">
                <button
                  className="btn-primary"
                  onClick={handleDistribute}
                  disabled={
                    submitting ||
                    selectedEmployees.length === 0 ||
                    !pointsPerEmployee ||
                    !reason ||
                    totalPoints > companyBalance
                  }
                >
                  {submitting ? 'Sending…' : 'Distribute'}
                </button>
                <button className="btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .points-error {
          background: #FEF2F2;
          border: 1px solid #FECACA;
          color: #B91C1C;
          padding: 12px 16px;
          border-radius: 8px;
          margin-bottom: 16px;
          font-size: 14px;
        }

        .points-empty {
          color: #6B7280;
          font-size: 14px;
          margin: 12px 0;
        }

        .company-points-distribution {
          background: #fff;
          border-radius: 12px;
          padding: 24px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .points-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 32px;
          gap: 24px;
        }

        .points-header h2 {
          margin: 0;
          font-size: 24px;
        }

        .header-info {
          display: flex;
          gap: 16px;
          align-items: center;
        }

        .balance-card {
          background: linear-gradient(135deg, #FF6B35, #FF8C5A);
          color: #fff;
          padding: 16px 24px;
          border-radius: 12px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .balance-card .label {
          font-size: 12px;
          opacity: 0.9;
        }

        .balance-card .value {
          font-size: 28px;
          font-weight: 700;
        }

        .balance-card .ep-label {
          font-size: 11px;
          opacity: 0.8;
        }

        .btn-primary {
          padding: 10px 16px;
          background: #FF6B35;
          color: #fff;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 600;
          white-space: nowrap;
        }

        .distribution-history {
          margin-top: 32px;
        }

        .distribution-history h3 {
          margin: 0 0 16px 0;
          font-size: 16px;
        }

        .history-list {
          background: #f5f5f5;
          border-radius: 8px;
          overflow: hidden;
        }

        .history-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px;
          background: #fff;
          margin: 8px;
          border-radius: 8px;
          border-left: 4px solid #FF6B35;
          gap: 16px;
        }

        .history-item.pending {
          border-left-color: #FF6B35;
        }

        .item-content {
          flex: 1;
        }

        .item-header {
          display: flex;
          gap: 12px;
          align-items: center;
          margin-bottom: 8px;
        }

        .item-header h4 {
          margin: 0;
          font-size: 14px;
          font-weight: 600;
        }

        .status-badge {
          font-size: 11px;
          padding: 4px 8px;
          background: #E0E0E0;
          border-radius: 4px;
          font-weight: 600;
        }

        .status-badge.completed {
          background: #27AE60;
          color: #fff;
        }

        .status-badge.pending {
          background: #FF6B35;
          color: #fff;
        }

        .item-details {
          display: flex;
          gap: 16px;
          font-size: 12px;
          color: #666;
        }

        .points-amount {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
        }

        .points-amount .amount {
          font-size: 18px;
          font-weight: 700;
          color: #27AE60;
        }

        .points-amount .ep {
          font-size: 11px;
          color: #999;
        }

        .btn-approve-small {
          padding: 8px 12px;
          background: #27AE60;
          color: #fff;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 12px;
          font-weight: 600;
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
          background: #fff;
          border-radius: 12px;
          max-width: 500px;
          width: 90%;
          max-height: 90vh;
          overflow-y: auto;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px;
          border-bottom: 1px solid #e0e0e0;
        }

        .modal-header h3 {
          margin: 0;
          font-size: 18px;
        }

        .close-btn {
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          color: #666;
        }

        .modal-body {
          padding: 20px;
        }

        .form-section {
          margin-bottom: 24px;
        }

        .form-section h4 {
          margin: 0 0 12px 0;
          font-size: 14px;
          font-weight: 600;
        }

        .employee-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
          max-height: 200px;
          overflow-y: auto;
        }

        .employee-checkbox {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          background: #f5f5f5;
          border-radius: 6px;
          cursor: pointer;
          border: 2px solid transparent;
          transition: all 0.2s;
        }

        .employee-checkbox:hover {
          background: #efefef;
        }

        .employee-checkbox input {
          cursor: pointer;
          width: 18px;
          height: 18px;
        }

        .employee-checkbox input:checked ~ .employee-info {
          color: #FF6B35;
        }

        .employee-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .employee-info .name {
          font-weight: 600;
          font-size: 13px;
        }

        .employee-info .role {
          font-size: 11px;
          color: #999;
        }

        .form-group {
          margin-bottom: 16px;
        }

        .form-group label {
          display: block;
          margin-bottom: 8px;
          font-weight: 600;
          font-size: 13px;
        }

        .form-group input,
        .form-group select,
        .form-group textarea {
          width: 100%;
          padding: 10px;
          border: 1px solid #ddd;
          border-radius: 6px;
          font-size: 14px;
          font-family: inherit;
        }

        .calculation {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 8px;
          padding: 8px;
          background: #FFF3E0;
          border-radius: 6px;
          font-size: 12px;
        }

        .calculation .total {
          font-weight: 600;
          color: #FF6B35;
        }

        .distribution-summary {
          background: #f5f5f5;
          border-radius: 8px;
          padding: 12px;
          margin: 20px 0;
        }

        .summary-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          font-size: 13px;
          border-bottom: 1px solid #e0e0e0;
        }

        .summary-row:last-child {
          border-bottom: none;
        }

        .summary-row .value {
          font-weight: 600;
          color: #333;
        }

        .modal-actions {
          display: flex;
          gap: 8px;
          justify-content: flex-end;
          margin-top: 20px;
          padding-top: 20px;
          border-top: 1px solid #e0e0e0;
        }

        .btn-secondary {
          padding: 10px 16px;
          background: #e0e0e0;
          color: #333;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 600;
        }

        .btn-primary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
};

export default CompanyPointsDistribution;
