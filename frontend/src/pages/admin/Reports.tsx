import React, { useState } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';

export const ReportsPage: React.FC = () => {
  const [reports] = useState([
    { id: 1, name: 'Daily Revenue', icon: '📈', lastRun: '2 hours ago', schedule: 'Daily', status: 'ready' },
    { id: 2, name: 'User Growth', icon: '👥', lastRun: '6 hours ago', schedule: 'Daily', status: 'ready' },
    { id: 3, name: 'Dispute Analytics', icon: '📊', lastRun: '1 day ago', schedule: 'Weekly', status: 'ready' },
    { id: 4, name: 'Category Performance', icon: '🏷️', lastRun: '3 days ago', schedule: 'Weekly', status: 'ready' },
    { id: 5, name: 'Safety Audit', icon: '🔒', lastRun: '5 days ago', schedule: 'Monthly', status: 'ready' },
  ]);

  return (
    <AdminLayout>
      <div className="admin-page">
        <div className="page-header">
          <h1>📊 Smart Reports</h1>
          <button className="btn-primary">+ Generate Report</button>
        </div>

        <div className="reports-grid">
          {reports.map((report) => (
            <div key={report.id} className="report-card">
              <div className="report-icon">{report.icon}</div>
              <div className="report-info">
                <h3>{report.name}</h3>
                <div className="report-meta">
                  <span className="meta-item">📅 {report.schedule}</span>
                  <span className="meta-item">⏱️ {report.lastRun}</span>
                </div>
              </div>
              <div className="report-actions">
                <button className="btn-small">View</button>
                <button className="btn-small">Download</button>
              </div>
            </div>
          ))}
        </div>

        <div className="info-box">
          <h3>💡 Reports Help You:</h3>
          <ul>
            <li>Track revenue and growth metrics in real-time</li>
            <li>Identify trends across categories and users</li>
            <li>Monitor safety and compliance metrics</li>
            <li>Make data-driven decisions for platform improvements</li>
          </ul>
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

        .reports-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 12px;
        }

        .report-card {
          background: white;
          border: 1px solid #ffb88c;
          border-radius: 8px;
          padding: 14px;
          display: flex;
          gap: 12px;
          transition: all 0.2s;
        }

        .report-card:hover {
          box-shadow: 0 4px 12px rgba(255, 107, 53, 0.15);
          border-color: #ff6b35;
        }

        .report-icon {
          font-size: 32px;
          min-width: 32px;
        }

        .report-info {
          flex: 1;
        }

        .report-info h3 {
          font-size: 14px;
          font-weight: 600;
          margin: 0 0 6px 0;
          color: #333;
        }

        .report-meta {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .meta-item {
          font-size: 11px;
          color: #888;
        }

        .report-actions {
          display: flex;
          flex-direction: column;
          gap: 4px;
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
          white-space: nowrap;
        }

        .btn-small:hover {
          background: #ff6b35;
          color: white;
          border-color: #ff6b35;
        }

        .info-box {
          background: #fff9f5;
          border: 1px solid #ffb88c;
          border-radius: 8px;
          padding: 14px;
        }

        .info-box h3 {
          font-size: 14px;
          font-weight: 600;
          margin: 0 0 10px 0;
          color: #ff6b35;
        }

        .info-box ul {
          margin: 0;
          padding-left: 20px;
          font-size: 13px;
          color: #666;
          line-height: 1.6;
        }

        .info-box li {
          margin-bottom: 6px;
        }

        @media (max-width: 768px) {
          .reports-grid {
            grid-template-columns: 1fr;
          }

          .report-card {
            flex-direction: column;
          }

          .report-actions {
            flex-direction: row;
          }
        }
      `}</style>
    </AdminLayout>
  );
};

export default ReportsPage;
