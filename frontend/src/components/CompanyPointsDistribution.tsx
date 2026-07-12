import React, { useState } from 'react';

interface Employee {
  id: number;
  name: string;
  alias: string;
  role: 'owner' | 'manager' | 'employee';
  pointsBalance: number;
}

interface PointsDistribution {
  id: number;
  employeeId: number;
  employeeName: string;
  pointsAwarded: number;
  reason: string;
  distributedBy: string;
  distributedDate: string;
  status: 'pending' | 'completed';
}

const CompanyPointsDistribution: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([
    { id: 1, name: 'Jordan Smith', alias: 'jordan_s', role: 'manager', pointsBalance: 2500 },
    { id: 2, name: 'Ava Johnson', alias: 'ava_j', role: 'employee', pointsBalance: 1800 },
    { id: 3, name: 'Liam Brown', alias: 'liam_b', role: 'employee', pointsBalance: 2100 },
    { id: 4, name: 'Mason Wilson', alias: 'mason_w', role: 'employee', pointsBalance: 1600 },
  ]);

  const [distributions, setDistributions] = useState<PointsDistribution[]>([
    {
      id: 1,
      employeeId: 1,
      employeeName: 'Jordan Smith',
      pointsAwarded: 500,
      reason: 'Excellent errand completion',
      distributedBy: 'Loh Kean Yew',
      distributedDate: '2026-07-10',
      status: 'completed',
    },
    {
      id: 2,
      employeeId: 2,
      employeeName: 'Ava Johnson',
      pointsAwarded: 250,
      reason: 'Monthly bonus',
      distributedBy: 'Loh Kean Yew',
      distributedDate: '2026-07-11',
      status: 'completed',
    },
  ]);

  const [showModal, setShowModal] = useState(false);
  const [selectedEmployees, setSelectedEmployees] = useState<number[]>([]);
  const [pointsPerEmployee, setPointsPerEmployee] = useState('');
  const [reason, setReason] = useState('');
  const [companyBalance] = useState(50000);

  const toggleEmployeeSelection = (employeeId: number) => {
    setSelectedEmployees(prev =>
      prev.includes(employeeId)
        ? prev.filter(id => id !== employeeId)
        : [...prev, employeeId]
    );
  };

  const handleDistribute = () => {
    const points = parseInt(pointsPerEmployee) || 0;
    const totalPoints = points * selectedEmployees.length;

    if (totalPoints > companyBalance) {
      alert('Insufficient company balance');
      return;
    }

    const newDistributions = selectedEmployees.map((empId, idx) => ({
      id: distributions.length + idx + 1,
      employeeId: empId,
      employeeName: employees.find(e => e.id === empId)?.name || '',
      pointsAwarded: points,
      reason,
      distributedBy: 'Loh Kean Yew',
      distributedDate: new Date().toISOString().split('T')[0],
      status: 'pending' as const,
    }));

    setDistributions([...distributions, ...newDistributions]);
    setSelectedEmployees([]);
    setPointsPerEmployee('');
    setReason('');
    setShowModal(false);
  };

  const handleApprove = (distributionId: number) => {
    setDistributions(distributions.map(d =>
      d.id === distributionId ? { ...d, status: 'completed' } : d
    ));
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

      {/* Distribution History */}
      <div className="distribution-history">
        <h3>Distribution History</h3>
        <div className="history-list">
          {distributions.map(dist => (
            <div key={dist.id} className={`history-item ${dist.status}`}>
              <div className="item-content">
                <div className="item-header">
                  <h4>{dist.employeeName}</h4>
                  <span className={`status-badge ${dist.status}`}>
                    {dist.status === 'completed' ? '✓ Completed' : '⏳ Pending'}
                  </span>
                </div>
                <div className="item-details">
                  <span className="reason">{dist.reason}</span>
                  <span className="date">{dist.distributedDate}</span>
                </div>
              </div>
              <div className="points-amount">
                <span className="amount">+{dist.pointsAwarded}</span>
                <span className="ep">EP</span>
              </div>
              {dist.status === 'pending' && (
                <button
                  className="btn-approve-small"
                  onClick={() => handleApprove(dist.id)}
                >
                  Approve
                </button>
              )}
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
                  disabled={selectedEmployees.length === 0 || !pointsPerEmployee || !reason}
                >
                  Distribute
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
          border-left-color: #FFC107;
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
          background: #FFC107;
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
