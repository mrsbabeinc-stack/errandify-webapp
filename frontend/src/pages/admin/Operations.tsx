import React from 'react';
import AdminLayout from '../../components/admin/AdminLayout';

export const OperationsPage: React.FC = () => {
  return (
    <AdminLayout>
      <div className="admin-page">
        <div className="page-header">
          <h1>📊 Operations</h1>
          <p>Operational metrics and platform performance</p>
        </div>

        <div className="placeholder-box">
          <div className="placeholder-icon">⚙️</div>
          <h2>Operations Dashboard</h2>
          <p>Monitor system performance and operational metrics</p>
          <div className="placeholder-items">
            <div className="item">• Errand processing efficiency</div>
            <div className="item">• Payment processing metrics</div>
            <div className="item">• System uptime & reliability</div>
            <div className="item">• Response time analytics</div>
            <div className="item">• Operational alerts & issues</div>
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

        .placeholder-box {
          background: white;
          border: 2px dashed #ffb88c;
          border-radius: 8px;
          padding: 40px;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
        }

        .placeholder-icon {
          font-size: 64px;
        }

        .placeholder-box h2 {
          font-size: 18px;
          font-weight: 600;
          margin: 0;
          color: #333;
        }

        .placeholder-box p {
          font-size: 13px;
          color: #888;
          margin: 0;
        }

        .placeholder-items {
          display: flex;
          flex-direction: column;
          gap: 8px;
          align-items: flex-start;
          margin-top: 8px;
          font-size: 12px;
          color: #666;
        }

        .item {
          padding: 4px 8px;
          background: #fff9f5;
          border-left: 2px solid #ff6b35;
          border-radius: 2px;
        }
      `}</style>
    </AdminLayout>
  );
};

export default OperationsPage;
