import React from 'react';
import AdminLayout from '../../components/admin/AdminLayout';

export const DisputesPage: React.FC = () => {
  return (
    <AdminLayout>
      <div className="admin-page">
        <div className="page-header">
          <h1>💬 Disputes (L1/L2/L3)</h1>
          <p>Manage disputes across all resolution levels</p>
        </div>

        <div className="placeholder-box">
          <div className="placeholder-icon">⚖️</div>
          <h2>Dispute Resolution Center</h2>
          <p>Handle disputes and appeals across all three levels</p>
          <div className="placeholder-items">
            <div className="item">• Level 1: Automated resolution</div>
            <div className="item">• Level 2: Human review & mediation</div>
            <div className="item">• Level 3: Final appeals & decisions</div>
            <div className="item">• Dispute analytics & trends</div>
            <div className="item">• Resolution success rates</div>
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

export default DisputesPage;
