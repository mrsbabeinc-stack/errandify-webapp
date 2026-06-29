import React, { useState } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';

export const VouchersPage: React.FC = () => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    category: '',
    discount: '',
    discountType: 'fixed',
    limit: '',
    expiryDate: '',
    description: '',
  });

  const [vouchers, setVouchers] = useState([
    { id: 1, code: 'SUMMER20', name: 'Summer Sale', category: 'Shopping', discount: '20%', used: 342, limit: 500, status: 'active', expires: '2026-08-31', description: 'Enjoy 20% off all items' },
    { id: 2, code: 'WELCOME50', name: 'Welcome Gift', category: 'General', discount: '$5', used: 1245, limit: 2000, status: 'active', expires: '2026-07-31', description: 'Welcome discount for new users' },
    { id: 3, code: 'REFER30', name: 'Referral Bonus', category: 'Referral', discount: '30%', used: 89, limit: 300, status: 'active', expires: '2026-12-31', description: 'Share and earn rewards' },
    { id: 4, code: 'OLDCODE', name: 'Expired Promo', category: 'Archive', discount: '10%', used: 500, limit: 500, status: 'expired', expires: '2026-06-15', description: 'Old promotional code' },
  ]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCreateVoucher = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.code || !formData.name || !formData.discount) {
      alert('Please fill in all required fields');
      return;
    }

    const newVoucher = {
      id: vouchers.length + 1,
      code: formData.code.toUpperCase(),
      name: formData.name,
      category: formData.category || 'General',
      discount: formData.discountType === 'fixed' ? `$${formData.discount}` : `${formData.discount}%`,
      used: 0,
      limit: parseInt(formData.limit) || 0,
      status: 'active',
      expires: formData.expiryDate || 'No Expiry',
      description: formData.description,
    };

    setVouchers([newVoucher, ...vouchers]);
    setFormData({
      code: '',
      name: '',
      category: '',
      discount: '',
      discountType: 'fixed',
      limit: '',
      expiryDate: '',
      description: '',
    });
    setShowCreateForm(false);
    alert('✅ Voucher created successfully! Users can see it in MyRewardSpace.');
  };

  const handleDeleteVoucher = (id: number) => {
    if (confirm('Are you sure you want to delete this voucher?')) {
      setVouchers(vouchers.filter(v => v.id !== id));
      alert('✅ Voucher deleted');
    }
  };

  return (
    <AdminLayout>
      <div className="admin-page">
        <div className="page-header">
          <h1>🎟️ Voucher Management</h1>
          <button
            className="btn-primary"
            onClick={() => setShowCreateForm(!showCreateForm)}
          >
            {showCreateForm ? '✕ Cancel' : '+ Create Voucher'}
          </button>
        </div>

        {/* Create Form */}
        {showCreateForm && (
          <div className="create-form-card">
            <h2>Create New Voucher</h2>
            <form onSubmit={handleCreateVoucher} className="voucher-form">
              <div className="form-group">
                <label>Voucher Code *</label>
                <input
                  type="text"
                  name="code"
                  value={formData.code}
                  onChange={handleInputChange}
                  placeholder="e.g., SUMMER20"
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Voucher Name *</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="e.g., Summer Sale"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Category</label>
                  <select name="category" value={formData.category} onChange={handleInputChange}>
                    <option value="">Select Category</option>
                    <option value="Shopping">Shopping</option>
                    <option value="Food">Food & Dining</option>
                    <option value="Referral">Referral Bonus</option>
                    <option value="General">General</option>
                    <option value="Seasonal">Seasonal</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Discount Type</label>
                  <select name="discountType" value={formData.discountType} onChange={handleInputChange}>
                    <option value="fixed">Fixed Amount ($)</option>
                    <option value="percentage">Percentage (%)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Discount Amount *</label>
                  <input
                    type="number"
                    name="discount"
                    value={formData.discount}
                    onChange={handleInputChange}
                    placeholder={formData.discountType === 'fixed' ? '5' : '20'}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Usage Limit</label>
                  <input
                    type="number"
                    name="limit"
                    value={formData.limit}
                    onChange={handleInputChange}
                    placeholder="e.g., 1000"
                  />
                </div>

                <div className="form-group">
                  <label>Expiry Date</label>
                  <input
                    type="date"
                    name="expiryDate"
                    value={formData.expiryDate}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Describe the voucher benefits..."
                  rows={3}
                />
              </div>

              <button type="submit" className="btn-submit">Create Voucher</button>
            </form>
          </div>
        )}

        {/* Vouchers Table */}
        <div className="vouchers-section">
          <h2>📊 All Vouchers ({vouchers.length})</h2>
          <div className="table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Name</th>
                  <th>Category</th>
                  <th>Discount</th>
                  <th>Used / Limit</th>
                  <th>Progress</th>
                  <th>Expires</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {vouchers.map((v) => (
                  <tr key={v.id}>
                    <td className="code">{v.code}</td>
                    <td className="name">
                      <div className="name-info">
                        <span className="voucher-name">{v.name}</span>
                        <span className="description">{v.description}</span>
                      </div>
                    </td>
                    <td className="category">{v.category}</td>
                    <td className="discount">{v.discount}</td>
                    <td className="used">{v.used} / {v.limit}</td>
                    <td className="progress">
                      <div className="progress-bar">
                        <div
                          className="progress-fill"
                          style={{ width: v.limit ? `${(v.used / v.limit) * 100}%` : '0%' }}
                        ></div>
                      </div>
                    </td>
                    <td className="expires">{v.expires}</td>
                    <td>
                      <span className={`badge badge-${v.status}`}>{v.status}</span>
                    </td>
                    <td>
                      <button className="btn-small">Edit</button>
                      <button className="btn-small delete" onClick={() => handleDeleteVoucher(v.id)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Info Box */}
        <div className="info-box">
          <h3>💡 Voucher Management Tips</h3>
          <ul>
            <li>✅ Vouchers appear instantly in MyRewardSpace for eligible users</li>
            <li>✅ Set usage limits to control promotion costs</li>
            <li>✅ Category helps users find relevant vouchers</li>
            <li>✅ Track redemptions in real-time</li>
            <li>✅ Archive expired vouchers for records</li>
            <li>✅ Users can redeem vouchers using Errandify Points</li>
          </ul>
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

        /* Create Form */
        .create-form-card {
          background: white;
          border: 2px solid #ff6b35;
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 12px;
        }

        .create-form-card h2 {
          font-size: 16px;
          font-weight: 700;
          margin: 0 0 16px 0;
          color: #ff6b35;
        }

        .voucher-form {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .form-group label {
          font-size: 12px;
          font-weight: 600;
          color: #333;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .form-group input,
        .form-group select,
        .form-group textarea {
          padding: 10px;
          border: 1px solid #ffb88c;
          border-radius: 6px;
          font-size: 13px;
          font-family: inherit;
        }

        .form-group input:focus,
        .form-group select:focus,
        .form-group textarea:focus {
          outline: none;
          border-color: #ff6b35;
          box-shadow: 0 0 0 3px rgba(255, 107, 53, 0.1);
        }

        .form-row {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 12px;
        }

        .btn-submit {
          padding: 12px 20px;
          background: #ff6b35;
          color: white;
          border: none;
          border-radius: 6px;
          font-weight: 700;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s;
          align-self: flex-start;
        }

        .btn-submit:hover {
          background: #ff5722;
          box-shadow: 0 4px 12px rgba(255, 107, 53, 0.3);
        }

        /* Vouchers Section */
        .vouchers-section {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .vouchers-section h2 {
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

        .code {
          font-weight: 600;
          font-family: monospace;
          color: #ff6b35;
        }

        .name-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .voucher-name {
          font-weight: 600;
        }

        .description {
          font-size: 11px;
          color: #888;
        }

        .category {
          font-size: 12px;
          color: #666;
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
          padding: 6px 10px;
          background: #f0f0f0;
          color: #333;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          margin-right: 4px;
        }

        .btn-small:hover {
          background: #ff6b35;
          color: white;
          border-color: #ff6b35;
        }

        .btn-small.delete:hover {
          background: #ff3333;
          border-color: #ff3333;
        }

        /* Info Box */
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
          .admin-table {
            font-size: 12px;
          }

          .admin-table th,
          .admin-table td {
            padding: 8px;
          }

          .form-row {
            grid-template-columns: 1fr;
          }

          .btn-small {
            display: block;
            width: 100%;
            margin-bottom: 4px;
          }
        }
      `}</style>
    </AdminLayout>
  );
};

export default VouchersPage;
