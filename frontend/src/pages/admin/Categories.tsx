import React, { useState } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';

export const CategoriesPage: React.FC = () => {
  const [categories] = useState([
    { id: 1, name: '🏠 Housekeeping', gmv: '$5,420', tasks: 342, rating: 4.8, status: 'active' },
    { id: 2, name: '🛒 Shopping & Errands', gmv: '$4,210', tasks: 287, rating: 4.7, status: 'active' },
    { id: 3, name: '🚗 Delivery & Logistics', gmv: '$3,890', tasks: 198, rating: 4.6, status: 'active' },
    { id: 4, name: '💼 Administrative', gmv: '$2,540', tasks: 125, rating: 4.9, status: 'active' },
    { id: 5, name: '🧹 Cleaning', gmv: '$2,180', tasks: 89, rating: 4.8, status: 'active' },
  ]);

  return (
    <AdminLayout>
      <div className="admin-page">
        <div className="page-header">
          <h1>📂 Category Management</h1>
          <button className="btn-primary">+ New Category</button>
        </div>

        {/* Happy Message Box */}
        <div className="happy-message-box">
          <span className="emoji">✨</span>
          <div>
            <strong>Manage Your Categories!</strong>
            <p>Keep your errand categories organized and up-to-date. Track performance and engagement metrics to improve user experience.</p>
          </div>
        </div>

        <div className="categories-grid">
          {categories.map((cat) => (
            <div key={cat.id} className="category-card">
              <div className="cat-header">
                <div className="cat-name">{cat.name}</div>
                <span className="status-badge">{cat.status}</span>
              </div>

              <div className="cat-stats">
                <div className="stat">
                  <span className="stat-label">GMV</span>
                  <span className="stat-value">{cat.gmv}</span>
                </div>
                <div className="stat">
                  <span className="stat-label">Errands</span>
                  <span className="stat-value">{cat.tasks}</span>
                </div>
                <div className="stat">
                  <span className="stat-label">Rating</span>
                  <span className="stat-value">{cat.rating}★</span>
                </div>
              </div>

              <div className="cat-actions">
                <button className="btn-small">Edit</button>
                <button className="btn-small">Analytics</button>
              </div>
            </div>
          ))}
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

        .categories-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 12px;
        }

        .category-card {
          background: white;
          border: 1px solid #ffb88c;
          border-radius: 8px;
          padding: 14px;
          transition: all 0.2s;
        }

        .category-card:hover {
          box-shadow: 0 4px 12px rgba(255, 107, 53, 0.15);
          border-color: #ff6b35;
        }

        .cat-header {
          display: flex;
          justify-content: space-between;
          align-items: start;
          margin-bottom: 12px;
        }

        .cat-name {
          font-size: 14px;
          font-weight: 600;
          color: #333;
        }

        .status-badge {
          background: #e6f9f0;
          color: #27b55d;
          padding: 3px 8px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 600;
        }

        .cat-stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
          margin-bottom: 12px;
        }

        .stat {
          display: flex;
          flex-direction: column;
          gap: 2px;
          padding: 8px;
          background: #fff9f5;
          border-radius: 4px;
          text-align: center;
        }

        .stat-label {
          font-size: 10px;
          color: #888;
          font-weight: 600;
          text-transform: uppercase;
        }

        .stat-value {
          font-size: 13px;
          font-weight: 700;
          color: #ff6b35;
        }

        .cat-actions {
          display: flex;
          gap: 6px;
        }

        .btn-small {
          flex: 1;
          padding: 6px 8px;
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

        .happy-message-box {
          background: linear-gradient(135deg, #fff9f5 0%, #fffbf7 100%);
          border-left: 4px solid #ff6b35;
          border-radius: 8px;
          padding: 12px 14px;
          display: flex;
          gap: 12px;
          align-items: flex-start;
        }

        .happy-message-box .emoji {
          font-size: 24px;
          min-width: 24px;
        }

        .happy-message-box strong {
          color: #ff6b35;
          font-size: 13px;
          display: block;
          margin-bottom: 2px;
        }

        .happy-message-box p {
          margin: 0;
          font-size: 12px;
          color: #666;
          line-height: 1.5;
        }
      `}</style>
    </AdminLayout>
  );
};

export default CategoriesPage;
