import React from 'react';
import AdminLayout from '../../components/admin/AdminLayout';

export const DiscountCodesPage: React.FC = () => {
  return (
    <AdminLayout>
      <div className="admin-page">
        <div className="page-header">
          <h1>🏷️ Discount Codes</h1>
          <button className="btn-primary">+ Create Code</button>
        </div>

        <div className="placeholder-box">
          <div className="placeholder-icon">💳</div>
          <h2>Discount Code Management</h2>
          <p>Create and manage promotional discount codes</p>
          <div className="placeholder-items">
            <div className="item">• Create discount codes</div>
            <div className="item">• Set discount amounts & percentages</div>
            <div className="item">• Track code usage & redemptions</div>
            <div className="item">• Set expiration dates</div>
            <div className="item">• Manage active promotions</div>
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
          margin-bottom: 8px;
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

export default DiscountCodesPage;
