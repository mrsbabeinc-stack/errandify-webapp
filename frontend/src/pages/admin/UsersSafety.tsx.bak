import React, { useState } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';

export const UsersSafetyPage: React.FC = () => {
  const [users] = useState([
    { id: 1, name: 'Sarah Tan', role: 'Asker/Doer', status: 'active', rating: 4.9, tasks: 145, verified: true, flag: null },
    { id: 2, name: 'John Lee', role: 'Doer', status: 'active', rating: 4.7, tasks: 89, verified: true, flag: null },
    { id: 3, name: 'Alice Wong', role: 'Asker', status: 'active', rating: 4.5, tasks: 23, verified: true, flag: 'warning' },
    { id: 4, name: 'Bob Chen', role: 'Doer', status: 'suspended', rating: 2.1, tasks: 5, verified: false, flag: 'critical' },
    { id: 5, name: 'Eve Kumar', role: 'Asker/Doer', status: 'active', rating: 4.8, tasks: 234, verified: true, flag: null },
  ]);

  const [safetyAlerts] = useState([
    { id: 1, severity: 'critical', type: '🚨 Safety Concern', desc: '1 user flagged for harassment', action: 'Review' },
    { id: 2, severity: 'high', type: '⚠️ Low Rating Trend', desc: '3 users dropped below 3 stars', action: 'Investigate' },
    { id: 3, severity: 'medium', type: '🔍 Verification Issue', desc: '5 unverified accounts created today', action: 'Check' },
  ]);

  return (
    <AdminLayout>
      <div className="admin-page">
        <div className="page-header">
          <h1>👥 Users & Safety</h1>
          <div className="header-buttons">
            <button className="btn-primary">Export Users</button>
          </div>
        </div>

        {/* Safety Alerts */}
        <div className="safety-section">
          <h2>🛡️ Safety Alerts</h2>
          <div className="alerts-grid">
            {safetyAlerts.map((alert) => (
              <div key={alert.id} className={`safety-alert severity-${alert.severity}`}>
                <div className="alert-type">{alert.type}</div>
                <div className="alert-desc">{alert.desc}</div>
                <button className="alert-action">{alert.action}</button>
              </div>
            ))}
          </div>
        </div>

        {/* Users Table */}
        <div className="users-section">
          <h2>👤 Active Users</h2>
          <div className="table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Rating</th>
                  <th>Tasks</th>
                  <th>Status</th>
                  <th>Verified</th>
                  <th>Alert</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className={user.flag ? `flag-${user.flag}` : ''}>
                    <td className="user-name">{user.name}</td>
                    <td className="user-role">{user.role}</td>
                    <td className="rating">{user.rating}★</td>
                    <td className="tasks">{user.tasks}</td>
                    <td><span className={`badge badge-${user.status}`}>{user.status}</span></td>
                    <td className="verified">{user.verified ? '✅' : '⚠️'}</td>
                    <td className="flag">
                      {user.flag ? <span className={`flag-badge flag-${user.flag}`}>{user.flag}</span> : '—'}
                    </td>
                    <td><button className="btn-small">View Profile</button></td>
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
          justify-content: space-between;
          align-items: center;
        }

        .page-header h1 {
          font-size: 24px;
          font-weight: 700;
          margin: 0;
          color: #ff6b35;
        }

        .header-buttons {
          display: flex;
          gap: 8px;
        }

        .btn-primary {
          padding: 10px 16px;
          background: #ff6b35;
          color: white;
          border: none;
          border-radius: 6px;
          font-weight: 600;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-primary:hover {
          background: #ff5722;
          box-shadow: 0 2px 8px rgba(255, 107, 53, 0.3);
        }

        /* Safety Section */
        .safety-section {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .safety-section h2 {
          font-size: 14px;
          font-weight: 700;
          margin: 0;
          color: #333;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .alerts-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 10px;
        }

        .safety-alert {
          padding: 12px;
          border-radius: 6px;
          border-left: 4px solid;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .safety-alert.severity-critical {
          background: #fff4f0;
          border-left-color: #ff3333;
        }

        .safety-alert.severity-high {
          background: #fff9f5;
          border-left-color: #ff6b35;
        }

        .safety-alert.severity-medium {
          background: #fffbf7;
          border-left-color: #ffb88c;
        }

        .alert-type {
          font-size: 12px;
          font-weight: 700;
          color: #333;
        }

        .alert-desc {
          font-size: 12px;
          color: #666;
        }

        .alert-action {
          align-self: flex-start;
          padding: 6px 10px;
          background: rgba(255, 107, 53, 0.1);
          color: #ff6b35;
          border: 1px solid #ffb88c;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .alert-action:hover {
          background: #ff6b35;
          color: white;
          border-color: #ff6b35;
        }

        /* Users Section */
        .users-section {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .users-section h2 {
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

        .admin-table tbody tr.flag-critical {
          background: #fff4f0;
        }

        .admin-table tbody tr.flag-warning {
          background: #fff9f5;
        }

        .admin-table td {
          padding: 12px;
          font-size: 12px;
          color: #333;
        }

        .user-name {
          font-weight: 600;
        }

        .user-role {
          font-size: 11px;
          color: #666;
        }

        .rating {
          font-weight: 600;
          color: #ff6b35;
        }

        .tasks {
          font-weight: 600;
        }

        .verified {
          text-align: center;
        }

        .flag {
          text-align: center;
        }

        .flag-badge {
          display: inline-block;
          padding: 3px 6px;
          border-radius: 3px;
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
        }

        .flag-badge.flag-critical {
          background: #ffebeb;
          color: #ff3333;
        }

        .flag-badge.flag-warning {
          background: #fff9f5;
          color: #ff6b35;
        }

        .badge {
          display: inline-block;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
        }

        .badge-active {
          background: #e6f9f0;
          color: #27b55d;
        }

        .badge-suspended {
          background: #ffebeb;
          color: #ff3333;
        }

        .btn-small {
          padding: 6px 10px;
          background: #f0f0f0;
          color: #333;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-small:hover {
          background: #ff6b35;
          color: white;
          border-color: #ff6b35;
        }

        @media (max-width: 1024px) {
          .admin-table {
            font-size: 11px;
          }

          .admin-table th,
          .admin-table td {
            padding: 8px;
          }
        }
      `}</style>
    </AdminLayout>
  );
};

export default UsersSafetyPage;
