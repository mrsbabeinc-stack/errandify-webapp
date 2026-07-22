import React, { useState } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';

export const ErrandifyPointsPage: React.FC = () => {
  const [transactions] = useState([
    { id: 1, user: 'Sarah Tan', action: 'Errand Completed', points: '+25 EP', date: '2 hours ago', balance: '450 EP' },
    { id: 2, user: 'John Lee', action: 'Referral Bonus', points: '+50 EP', date: '5 hours ago', balance: '325 EP' },
    { id: 3, user: 'Alice Wong', action: 'Rating Bonus', points: '+10 EP', date: '1 day ago', balance: '180 EP' },
    { id: 4, user: 'Bob Chen', action: 'Redemption', points: '-100 EP', date: '2 days ago', balance: '25 EP' },
    { id: 5, user: 'Eve Kumar', action: 'Streak Bonus', points: '+75 EP', date: '3 days ago', balance: '520 EP' },
  ]);

  const [stats] = useState({
    totalPoints: '12,450 EP',
    activeUsers: '2,847',
    totalRedeemed: '$5,420',
    avgPointsPerUser: '4.4 EP'
  });

  return (
    <AdminLayout>
      <div className="admin-page">
        <div className="page-header">
          <h1>💰 Errandify Points</h1>
          <p>Manage and track platform reward points</p>
        </div>

        {/* Stats */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-value">{stats.totalPoints}</div>
            <div className="stat-label">Total Points Issued</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.activeUsers}</div>
            <div className="stat-label">Active Users</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.totalRedeemed}</div>
            <div className="stat-label">Total Redeemed</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.avgPointsPerUser}</div>
            <div className="stat-label">Avg per User</div>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="section">
          <h2>📊 Recent Transactions</h2>
          <div className="table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Action</th>
                  <th>Points</th>
                  <th>Balance</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((t) => (
                  <tr key={t.id}>
                    <td className="user">{t.user}</td>
                    <td>{t.action}</td>
                    <td className={t.points.includes('+') ? 'positive' : 'negative'}>{t.points}</td>
                    <td className="balance">{t.balance}</td>
                    <td className="date">{t.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <style>{`
        .admin-page {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .page-header {
          display: flex;
          flex-direction: column;
          gap: 4px;
          margin-bottom: 8px;
        }

        .page-header h1 {
          font-size: 24px;
          font-weight: 700;
          margin: 0;
          color: #ff6b35;
        }

        .page-header p {
          font-size: 13px;
          color: #888;
          margin: 0;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 12px;
        }

        .stat-card {
          background: linear-gradient(135deg, #ff6b35 0%, #ff8c42 100%);
          color: white;
          border-radius: 8px;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          box-shadow: 0 2px 8px rgba(255, 107, 53, 0.15);
        }

        .stat-value {
          font-size: 20px;
          font-weight: 700;
        }

        .stat-label {
          font-size: 11px;
          opacity: 0.9;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .section {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .section h2 {
          font-size: 14px;
          font-weight: 700;
          margin: 0;
          color: #333;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .table-container {
          overflow-x: auto;
          border-radius: 8px;
          border: 1px solid #ffb88c;
        }

        .admin-table {
          width: 100%;
          border-collapse: collapse;
          background: white;
        }

        .admin-table thead {
          background: linear-gradient(to right, #fff5f0, #fffbf7);
          border-bottom: 2px solid #ffb88c;
        }

        .admin-table th {
          padding: 12px;
          text-align: left;
          font-size: 11px;
          font-weight: 700;
          color: #ff6b35;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .admin-table tbody tr {
          border-bottom: 1px solid #ffe6d9;
          transition: background 0.2s;
        }

        .admin-table tbody tr:hover {
          background: #fff9f5;
        }

        .admin-table td {
          padding: 12px;
          font-size: 13px;
          color: #333;
        }

        .user {
          font-weight: 600;
        }

        .positive {
          color: #27b55d;
          font-weight: 600;
        }

        .negative {
          color: #ff6b35;
          font-weight: 600;
        }

        .balance {
          font-weight: 600;
        }

        .date {
          font-size: 11px;
          color: #888;
        }
      `}</style>
    </AdminLayout>
  );
};

export default ErrandifyPointsPage;
