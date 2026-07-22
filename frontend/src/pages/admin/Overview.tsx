import React from 'react';
import AdminLayout from '../../components/admin/AdminLayout';

export const OverviewPage: React.FC = () => {
  return (
    <AdminLayout>
      <div className="admin-page">
        <div className="page-header">
          <h1>📊 Platform Overview</h1>
          <p>High-level platform metrics and trends</p>
        </div>

        <div className="placeholder-box">
          <div className="placeholder-icon">📈</div>
          <h2>Overview Analytics</h2>
          <p>Platform performance, growth trends, and key business metrics</p>
          <div className="placeholder-items">
            <div className="item">• Revenue trends over time</div>
            <div className="item">• User growth metrics</div>
            <div className="item">• Task completion rates</div>
            <div className="item">• Platform health status</div>
            <div className="item">• Geographic distribution</div>
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

export default OverviewPage;
