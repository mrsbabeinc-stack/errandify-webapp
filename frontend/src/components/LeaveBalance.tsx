import React, { useState, useEffect } from 'react';
import '../styles/LeaveBalance.css';

interface LeaveBalanceProps {
  staffId: number;
  companyId: number;
}

interface Balance {
  total_days: number;
  used_days: number;
  remaining_days: number;
  pending_requests: Array<{
    start_date: string;
    leave_type: string;
    status: string;
  }>;
}

const LeaveBalance: React.FC<LeaveBalanceProps> = ({ staffId, companyId }) => {
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
  const [balance, setBalance] = useState<Balance | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBalance();
  }, [staffId, companyId]);

  const fetchBalance = async () => {
    try {
      const token = localStorage.getItem('token');

      const response = await fetch(
        // Was /api/company/staff/:id/leave-balance, which does not exist —
        // the route is /balance/:staff_id on the router mounted at /api/leave.
        // The component rendered "Unable to load leave balance" permanently.
        `${API_URL}/api/leave/balance/${staffId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setBalance(data.balance);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error fetching leave balance:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="leave-balance loading">Loading leave balance...</div>;
  }

  if (!balance) {
    return <div className="leave-balance error">Unable to load leave balance</div>;
  }

  const usagePercent = (balance.used_days / balance.total_days) * 100;
  const remainingPercent = (balance.remaining_days / balance.total_days) * 100;

  return (
    <div className="leave-balance">
      <h3>🗓️ Leave Balance</h3>

      <div className="balance-overview">
        <div className="balance-stat">
          <span className="label">Total Days</span>
          <span className="value">{balance.total_days} days</span>
        </div>
        <div className="balance-stat">
          <span className="label">Used Days</span>
          <span className="value used">{balance.used_days} days</span>
        </div>
        <div className="balance-stat">
          <span className="label">Remaining Days</span>
          <span className="value remaining">{balance.remaining_days} days</span>
        </div>
      </div>

      <div className="progress-bar">
        <div className="used" style={{ width: `${usagePercent}%` }} />
        <div className="remaining" style={{ width: `${remainingPercent}%` }} />
      </div>

      {balance.pending_requests.length > 0 && (
        <div className="pending-requests">
          <h4>⏳ Pending Requests ({balance.pending_requests.length})</h4>
          <div className="requests-list">
            {balance.pending_requests.map((req, idx) => (
              <div key={idx} className="request-item">
                <span className="date">{new Date(req.start_date).toLocaleDateString()}</span>
                <span className="type">{req.leave_type === 'full_day' ? '📅 Full Day' : '📄 Half Day'}</span>
                <span className="status pending">Pending</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default LeaveBalance;
