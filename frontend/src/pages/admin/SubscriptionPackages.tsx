import React, { useState } from 'react';

interface Package {
  id: string;
  name: string;
  monthlyPrice: number;
  yearlyPrice: number;
  maxStaff: number | 'unlimited';
  maxErrands: number | 'unlimited';
  adSlots: number;
  analytics: boolean;
  support: 'email' | 'phone';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const mockPackages: Package[] = [
  {
    id: 'pkg-silver',
    name: 'Silver',
    monthlyPrice: 19,
    yearlyPrice: 190,
    maxStaff: 5,
    maxErrands: 50,
    adSlots: 1,
    analytics: false,
    support: 'email',
    isActive: true,
    createdAt: '2026-06-01',
    updatedAt: '2026-06-01',
  },
  {
    id: 'pkg-gold',
    name: 'Gold',
    monthlyPrice: 49,
    yearlyPrice: 490,
    maxStaff: 15,
    maxErrands: 200,
    adSlots: 5,
    analytics: true,
    support: 'email',
    isActive: true,
    createdAt: '2026-06-01',
    updatedAt: '2026-06-01',
  },
  {
    id: 'pkg-platinum',
    name: 'Platinum',
    monthlyPrice: 99,
    yearlyPrice: 990,
    maxStaff: 'unlimited',
    maxErrands: 'unlimited',
    adSlots: 10,
    analytics: true,
    support: 'phone',
    isActive: true,
    createdAt: '2026-06-01',
    updatedAt: '2026-06-01',
  },
];

export const SubscriptionPackages: React.FC = () => {
  const [packages, setPackages] = useState<Package[]>(mockPackages);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [formData, setFormData] = useState<Partial<Package>>({});

  const handleCreateNew = () => {
    setFormData({
      name: '',
      monthlyPrice: 0,
      yearlyPrice: 0,
      maxStaff: 5,
      maxErrands: 50,
      adSlots: 0,
      analytics: false,
      support: 'email',
      isActive: false,
    });
    setShowCreateModal(true);
  };

  const handleEdit = (pkg: Package) => {
    setFormData(pkg);
    setSelectedPackage(pkg);
    setShowEditModal(true);
  };

  const handleSave = () => {
    if (showCreateModal) {
      const newPackage: Package = {
        id: `pkg-${Date.now()}`,
        name: formData.name || 'New Package',
        monthlyPrice: formData.monthlyPrice || 0,
        yearlyPrice: formData.yearlyPrice || 0,
        maxStaff: formData.maxStaff || 5,
        maxErrands: formData.maxErrands || 50,
        adSlots: formData.adSlots || 0,
        analytics: formData.analytics || false,
        support: formData.support || 'email',
        isActive: formData.isActive || false,
        createdAt: new Date().toISOString().split('T')[0],
        updatedAt: new Date().toISOString().split('T')[0],
      };
      setPackages([...packages, newPackage]);
      setShowCreateModal(false);
    } else if (showEditModal && selectedPackage) {
      setPackages(
        packages.map((p) =>
          p.id === selectedPackage.id
            ? { ...p, ...formData, updatedAt: new Date().toISOString().split('T')[0] }
            : p
        )
      );
      setShowEditModal(false);
    }
    setFormData({});
  };

  const handleToggleActive = (pkg: Package) => {
    setPackages(
      packages.map((p) =>
        p.id === pkg.id ? { ...p, isActive: !p.isActive } : p
      )
    );
  };

  return (
    <div className="subscription-packages-page">
      <div className="page-header">
        <h1>💳 Subscription Packages</h1>
        <p>Create and manage subscription tiers for companies</p>
      </div>

      <div className="happy-box">
        <span>😊</span>
        <p>You have <strong>{packages.length}</strong> packages. <strong>{packages.filter(p => p.isActive).length}</strong> active.</p>
      </div>

      <button className="btn-primary" onClick={handleCreateNew}>+ Create New Package</button>

      <div className="packages-grid">
        {packages.map((pkg) => (
          <div key={pkg.id} className="package-card">
            <div className="card-header">
              <div>
                <h3>{pkg.name}</h3>
                <p className="pricing">${pkg.monthlyPrice}/month</p>
              </div>
              <div className="status-toggle">
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={pkg.isActive}
                    onChange={() => handleToggleActive(pkg)}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>
            </div>

            <div className="card-body">
              <div className="feature-group">
                <h4>Capacity</h4>
                <div className="features">
                  <div className="feature">
                    <span className="label">Staff Members:</span>
                    <span className="value">
                      {typeof pkg.maxStaff === 'number' ? pkg.maxStaff : '∞'}
                    </span>
                  </div>
                  <div className="feature">
                    <span className="label">Monthly Errands:</span>
                    <span className="value">
                      {typeof pkg.maxErrands === 'number' ? pkg.maxErrands : '∞'}
                    </span>
                  </div>
                  <div className="feature">
                    <span className="label">Ad Slots/Month:</span>
                    <span className="value">{pkg.adSlots}</span>
                  </div>
                </div>
              </div>

              <div className="feature-group">
                <h4>Features</h4>
                <div className="features">
                  <div className="feature">
                    <span className="label">Analytics:</span>
                    <span className="value">{pkg.analytics ? '✓ Advanced' : '✗ Basic'}</span>
                  </div>
                  <div className="feature">
                    <span className="label">Support:</span>
                    <span className="value">{pkg.support === 'phone' ? '📞 Phone' : '📧 Email'}</span>
                  </div>
                </div>
              </div>

              <div className="pricing-info">
                <div className="price-item">
                  <span className="label">Yearly Price:</span>
                  <span className="value">${pkg.yearlyPrice}/year</span>
                </div>
                <div className="price-item">
                  <span className="label">Savings:</span>
                  <span className="value" style={{ color: '#4caf50' }}>
                    {Math.round(((pkg.monthlyPrice * 12 - pkg.yearlyPrice) / (pkg.monthlyPrice * 12)) * 100)}%
                  </span>
                </div>
              </div>
            </div>

            <div className="card-actions">
              <button className="btn-secondary" onClick={() => handleEdit(pkg)}>
                Edit
              </button>
              <button className="btn-secondary">View Subscribers</button>
            </div>
          </div>
        ))}
      </div>

      {/* Create/Edit Modal */}
      {(showCreateModal || showEditModal) && (
        <div className="modal-overlay" onClick={() => {
          setShowCreateModal(false);
          setShowEditModal(false);
        }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{showCreateModal ? 'Create New Package' : 'Edit Package'}</h2>
              <button
                className="close-btn"
                onClick={() => {
                  setShowCreateModal(false);
                  setShowEditModal(false);
                }}
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              <div className="form-group">
                <label>Package Name</label>
                <input
                  type="text"
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Silver, Gold, Platinum"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Monthly Price ($)</label>
                  <input
                    type="number"
                    value={formData.monthlyPrice || 0}
                    onChange={(e) => setFormData({ ...formData, monthlyPrice: parseFloat(e.target.value) })}
                    step="0.01"
                  />
                </div>
                <div className="form-group">
                  <label>Yearly Price ($)</label>
                  <input
                    type="number"
                    value={formData.yearlyPrice || 0}
                    onChange={(e) => setFormData({ ...formData, yearlyPrice: parseFloat(e.target.value) })}
                    step="0.01"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Max Staff Members</label>
                  <input
                    type="number"
                    value={typeof formData.maxStaff === 'number' ? formData.maxStaff : ''}
                    onChange={(e) => setFormData({ ...formData, maxStaff: e.target.value === '' ? 'unlimited' : parseInt(e.target.value) })}
                  />
                  <small>Leave empty for unlimited</small>
                </div>
                <div className="form-group">
                  <label>Max Monthly Errands</label>
                  <input
                    type="number"
                    value={typeof formData.maxErrands === 'number' ? formData.maxErrands : ''}
                    onChange={(e) => setFormData({ ...formData, maxErrands: e.target.value === '' ? 'unlimited' : parseInt(e.target.value) })}
                  />
                  <small>Leave empty for unlimited</small>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Ad Slots per Month</label>
                  <input
                    type="number"
                    value={formData.adSlots || 0}
                    onChange={(e) => setFormData({ ...formData, adSlots: parseInt(e.target.value) })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.analytics || false}
                    onChange={(e) => setFormData({ ...formData, analytics: e.target.checked })}
                  />
                  Advanced Analytics Dashboard
                </label>
              </div>

              <div className="form-group">
                <label>Support Type</label>
                <div className="radio-group">
                  <label className="radio-label">
                    <input
                      type="radio"
                      name="support"
                      value="email"
                      checked={formData.support === 'email'}
                      onChange={(e) => setFormData({ ...formData, support: 'email' })}
                    />
                    Email Support
                  </label>
                  <label className="radio-label">
                    <input
                      type="radio"
                      name="support"
                      value="phone"
                      checked={formData.support === 'phone'}
                      onChange={(e) => setFormData({ ...formData, support: 'phone' })}
                    />
                    Phone Support
                  </label>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="btn-secondary"
                onClick={() => {
                  setShowCreateModal(false);
                  setShowEditModal(false);
                }}
              >
                Cancel
              </button>
              <button className="btn-primary" onClick={handleSave}>
                {showCreateModal ? 'Create Package' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .subscription-packages-page {
          padding: 30px;
          background: #fafafa;
          min-height: 100vh;
        }

        .page-header {
          margin-bottom: 30px;
        }

        .page-header h1 {
          font-size: 32px;
          color: #333;
          margin: 0 0 8px 0;
        }

        .page-header p {
          color: #666;
          margin: 0;
        }

        .happy-box {
          display: flex;
          align-items: center;
          gap: 12px;
          background: linear-gradient(135deg, #fff5f0 0%, #fffbf7 100%);
          border: 2px solid #ffb88c;
          border-radius: 12px;
          padding: 16px 20px;
          margin-bottom: 30px;
          font-size: 14px;
          color: #666;
        }

        .happy-box span {
          font-size: 24px;
          flex-shrink: 0;
        }

        .btn-primary {
          background: #ff6b35;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
          margin-bottom: 30px;
        }

        .btn-primary:hover {
          background: #ff8c42;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(255, 107, 53, 0.3);
        }

        .packages-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 24px;
          margin-bottom: 40px;
        }

        .package-card {
          background: white;
          border: 2px solid #f0f0f0;
          border-radius: 12px;
          overflow: hidden;
          transition: all 0.3s;
        }

        .package-card:hover {
          border-color: #ff6b35;
          box-shadow: 0 4px 16px rgba(255, 107, 53, 0.1);
        }

        .card-header {
          padding: 20px;
          background: linear-gradient(135deg, #fff5f0 0%, #fffbf7 100%);
          border-bottom: 2px solid #f5f5f5;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }

        .card-header h3 {
          margin: 0 0 8px 0;
          font-size: 20px;
          color: #333;
        }

        .pricing {
          margin: 0;
          font-size: 24px;
          font-weight: 700;
          color: #ff6b35;
        }

        .status-toggle {
          display: flex;
          align-items: center;
        }

        .toggle-switch {
          position: relative;
          display: inline-block;
          width: 50px;
          height: 28px;
        }

        .toggle-switch input {
          opacity: 0;
          width: 0;
          height: 0;
        }

        .toggle-slider {
          position: absolute;
          cursor: pointer;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: #ccc;
          transition: 0.3s;
          border-radius: 28px;
        }

        .toggle-slider:before {
          position: absolute;
          content: "";
          height: 22px;
          width: 22px;
          left: 3px;
          bottom: 3px;
          background-color: white;
          transition: 0.3s;
          border-radius: 50%;
        }

        .toggle-switch input:checked + .toggle-slider {
          background-color: #4caf50;
        }

        .toggle-switch input:checked + .toggle-slider:before {
          transform: translateX(22px);
        }

        .card-body {
          padding: 20px;
        }

        .feature-group {
          margin-bottom: 20px;
        }

        .feature-group h4 {
          margin: 0 0 12px 0;
          font-size: 12px;
          font-weight: 700;
          color: #ff6b35;
          text-transform: uppercase;
        }

        .features {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .feature {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 14px;
          padding: 8px 0;
          border-bottom: 1px solid #f5f5f5;
        }

        .feature:last-child {
          border-bottom: none;
        }

        .feature .label {
          color: #666;
          font-weight: 500;
        }

        .feature .value {
          color: #333;
          font-weight: 600;
        }

        .pricing-info {
          background: #f9f9f9;
          border-radius: 8px;
          padding: 12px;
          margin-top: 16px;
        }

        .price-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 14px;
          padding: 6px 0;
        }

        .price-item .label {
          color: #666;
        }

        .price-item .value {
          font-weight: 600;
          color: #333;
        }

        .card-actions {
          padding: 12px 20px;
          background: #f9f9f9;
          border-top: 2px solid #f5f5f5;
          display: flex;
          gap: 8px;
        }

        .card-actions button {
          flex: 1;
          padding: 8px 12px;
          font-size: 12px;
          font-weight: 600;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-secondary {
          background: #f0f0f0;
          color: #333;
        }

        .btn-secondary:hover {
          background: #e0e0e0;
        }

        /* Modal Styles */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .modal-content {
          background: white;
          border-radius: 12px;
          max-width: 600px;
          width: 90%;
          max-height: 80vh;
          overflow-y: auto;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px;
          border-bottom: 2px solid #f5f5f5;
        }

        .modal-header h2 {
          margin: 0;
          font-size: 20px;
          color: #333;
        }

        .close-btn {
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          color: #999;
        }

        .modal-body {
          padding: 20px;
        }

        .form-group {
          margin-bottom: 20px;
        }

        .form-group label {
          display: block;
          margin-bottom: 8px;
          font-size: 14px;
          font-weight: 600;
          color: #333;
        }

        .form-group input[type="text"],
        .form-group input[type="number"],
        .form-group input[type="email"] {
          width: 100%;
          padding: 10px 12px;
          border: 2px solid #e0e0e0;
          border-radius: 6px;
          font-size: 14px;
          transition: border-color 0.2s;
        }

        .form-group input:focus {
          outline: none;
          border-color: #ff6b35;
        }

        .form-group small {
          display: block;
          margin-top: 4px;
          color: #999;
          font-size: 12px;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .checkbox-label,
        .radio-label {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          color: #333;
          cursor: pointer;
          font-weight: 400;
          margin-bottom: 8px;
        }

        .checkbox-label input,
        .radio-label input {
          cursor: pointer;
        }

        .radio-group {
          display: flex;
          gap: 12px;
          flex-direction: column;
        }

        .modal-footer {
          padding: 20px;
          border-top: 2px solid #f5f5f5;
          display: flex;
          gap: 12px;
          justify-content: flex-end;
        }

        .modal-footer button {
          padding: 10px 20px;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
      `}</style>
    </div>
  );
};

export default SubscriptionPackages;
