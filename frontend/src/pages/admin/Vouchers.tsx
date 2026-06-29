import React, { useState } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';

export const VouchersPage: React.FC = () => {
  const [vouchers] = useState([
    { id: 1, code: 'SUMMER20', discount: '20%', used: 342, limit: 500, status: 'active', expires: '2026-08-31' },
    { id: 2, code: 'WELCOME50', discount: '$5', used: 1245, limit: 2000, status: 'active', expires: '2026-07-31' },
    { id: 3, code: 'REFER30', discount: '30%', used: 89, limit: 300, status: 'active', expires: '2026-12-31' },
    { id: 4, code: 'OLDCODE', discount: '10%', used: 500, limit: 500, status: 'expired', expires: '2026-06-15' },
  ]);

  return (
    <AdminLayout>
      <div className="admin-page">
        <div className="page-header">
          <h1>🎟️ Voucher Management</h1>
          <button className="btn-primary">+ Create Voucher</button>
        </div>

        <div className="table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Discount</th>
                <th>Used</th>
                <th>Limit</th>
                <th>Expires</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {vouchers.map((v) => (
                <tr key={v.id}>
                  <td className="code">{v.code}</td>
                  <td className="discount">{v.discount}</td>
                  <td className="used">{v.used} / {v.limit}</td>
                  <td className="progress">
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${(v.used / v.limit) * 100}%` }}></div>
                    </div>
                  </td>
                  <td className="expires">{v.expires}</td>
                  <td><span className={`badge badge-${v.status}`}>{v.status}</span></td>
                  <td><button className="btn-small">Edit</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <style>{`
        .admin-page {
          display: flex;
          flex-direction: column;
          gap: 16px;
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
          font-size: 12px;
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

        .code {
          font-weight: 600;
          font-family: monospace;
        }

        .discount {
          font-weight: 600;
          color: #ff6b35;
        }

        .used {
          font-size: 12px;
          color: #666;
        }

        .progress {
          width: 100px;
        }

        .progress-bar {
          height: 6px;
          background: #ffe6d9;
          border-radius: 3px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          background: #ff6b35;
          transition: width 0.2s;
        }

        .expires {
          font-size: 12px;
          color: #888;
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

        .badge-expired {
          background: #ffe6d9;
          color: #ff6b35;
        }

        .btn-small {
          padding: 6px 12px;
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

        @media (max-width: 768px) {
          .admin-table {
            font-size: 12px;
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

export default VouchersPage;
