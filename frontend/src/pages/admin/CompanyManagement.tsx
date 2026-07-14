import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useToast, ToastContainer } from '../../components/Toast';
import AdminLayout from '../../components/admin/AdminLayout';

interface Company {
  id: string;
  uen: string;
  name: string;
  website?: string;
  contactPerson: {
    name: string;
    email: string;
  };
  tasksCompleted: number;
  rating: number;
  tier: 'Silver' | 'Gold' | 'Platinum' | 'Star';
  subscription: {
    plan: string;
    status: 'active' | 'paused' | 'cancelled';
  };
  registeredAt: string;
  status: 'active' | 'suspended' | 'banned';
}

const mockCompanies: Company[] = [
  {
    id: 'comp-001',
    uen: '201234567A',
    name: 'ProClean Services',
    website: 'proclean.sg',
    contactPerson: { name: 'Ahmad Hassan', email: 'ahmad@proclean.sg' },
    tasksCompleted: 1248,
    rating: 4.8,
    tier: 'Gold',
    subscription: { plan: 'Growth', status: 'active' },
    registeredAt: '2025-03-15',
    status: 'active',
  },
  {
    id: 'comp-002',
    uen: '198765432B',
    name: 'FastGo Delivery',
    website: 'fastgo.sg',
    contactPerson: { name: 'Siti Nur', email: 'siti@fastgo.sg' },
    tasksCompleted: 456,
    rating: 4.5,
    tier: 'Silver',
    subscription: { plan: 'Starter', status: 'active' },
    registeredAt: '2025-05-20',
    status: 'active',
  },
  {
    id: 'comp-003',
    uen: '202345678C',
    name: 'Elite Care Services',
    website: 'elitecare.sg',
    contactPerson: { name: 'Rajesh Kumar', email: 'rajesh@elitecare.sg' },
    tasksCompleted: 2100,
    rating: 4.9,
    tier: 'Platinum',
    subscription: { plan: 'Enterprise', status: 'active' },
    registeredAt: '2024-12-10',
    status: 'active',
  },
];

export const CompanyManagement: React.FC = () => {
  const [companies, setCompanies] = useState<Company[]>(mockCompanies);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTier, setSelectedTier] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionType, setActionType] = useState<'suspend' | 'ban' | 'restore'>('suspend');

  const filteredCompanies = useMemo(() => {
    return companies.filter((company) => {
      const matchSearch =
        company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        company.uen.toLowerCase().includes(searchTerm.toLowerCase()) ||
        company.contactPerson.email.toLowerCase().includes(searchTerm.toLowerCase());
      const matchTier = !selectedTier || company.tier === selectedTier;
      const matchStatus = !selectedStatus || company.status === selectedStatus;
      return matchSearch && matchTier && matchStatus;
    });
  }, [companies, searchTerm, selectedTier, selectedStatus]);

  const handleAction = (company: Company, action: 'suspend' | 'ban' | 'restore') => {
    setSelectedCompany(company);
    setActionType(action);
    setShowActionModal(true);
  };

  const confirmAction = () => {
    if (!selectedCompany) return;

    const updatedCompanies = companies.map((c) =>
      c.id === selectedCompany.id
        ? {
            ...c,
            status: actionType === 'restore' ? 'active' : actionType === 'suspend' ? 'suspended' : 'banned',
          }
        : c
    );
    setCompanies(updatedCompanies);
    setShowActionModal(false);
  };

  const getTierColor = (tier: string) => {
    const colors: Record<string, string> = {
      Silver: '#c0c0c0',
      Gold: '#ffd700',
      Platinum: '#e5e4e2',
      Star: '#9370db',
    };
    return colors[tier] || '#ff6b35';
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      active: '#4caf50',
      suspended: '#ff9800',
      banned: '#f44336',
    };
    return colors[status] || '#999';
  };

  const navigate = useNavigate();
  const { toasts, showToast, removeToast } = useToast();

  return (
    <AdminLayout>
      <div className="company-management-page">
      <ToastContainer toasts={toasts} onClose={removeToast} />
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>🏢 Company Management</h1>
          <p>Manage all company accounts, subscriptions, and status</p>
        </div>
        <button
          onClick={() => navigate(-1)}
          style={{
            fontSize: '20px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: '#FF6B35',
            fontWeight: '700',
            padding: '0 8px',
          }}
          title="Go back"
        >
          ←
        </button>
      </div>
      <div className="page-header">
        <h1 style={{ display: 'none' }}>🏢 Company Management</h1>
        <p style={{ display: 'none' }}>Manage all company accounts, subscriptions, and status</p>
      </div>

      <div className="happy-box">
        <span>😊</span>
        <p>You have <strong>{companies.length}</strong> companies registered. <strong>{companies.filter(c => c.status === 'active').length}</strong> active.</p>
      </div>

      <div className="search-filters">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search by name, UEN, or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="filter-group">
          <select value={selectedTier} onChange={(e) => setSelectedTier(e.target.value)} className="filter-select">
            <option value="">All Tiers</option>
            <option value="Silver">Silver</option>
            <option value="Gold">Gold</option>
            <option value="Platinum">Platinum</option>
            <option value="Star">Star</option>
          </select>

          <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)} className="filter-select">
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="banned">Banned</option>
          </select>
        </div>
      </div>

      <div className="companies-grid">
        {filteredCompanies.length > 0 ? (
          filteredCompanies.map((company) => (
            <div key={company.id} className="company-card">
              <div className="card-header">
                <div className="company-info">
                  <h3>{company.name}</h3>
                  <p className="uen">UEN: {company.uen}</p>
                </div>
                <div className="badges">
                  <span className="tier-badge" style={{ backgroundColor: getTierColor(company.tier) }}>
                    {company.tier}
                  </span>
                  <span className="status-badge" style={{ backgroundColor: getStatusColor(company.status) }}>
                    {company.status.toUpperCase()}
                  </span>
                </div>
              </div>

              <div className="card-body">
                <div className="stat">
                  <span className="label">Tasks:</span>
                  <span className="value">{company.tasksCompleted}</span>
                </div>
                <div className="stat">
                  <span className="label">Rating:</span>
                  <span className="value">{company.rating.toFixed(1)}⭐</span>
                </div>
                <div className="stat">
                  <span className="label">Contact:</span>
                  <span className="value">{company.contactPerson.name}</span>
                </div>
                <div className="stat">
                  <span className="label">Plan:</span>
                  <span className="value">{company.subscription.plan}</span>
                </div>
                <div className="stat">
                  <span className="label">Registered:</span>
                  <span className="value">{new Date(company.registeredAt).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="card-actions">
                <button
                  className="btn-secondary"
                  onClick={() => {
                    setSelectedCompany(company);
                    setShowDetailModal(true);
                  }}
                >
                  View Details
                </button>
                {company.status === 'active' && (
                  <button
                    className="btn-warning"
                    onClick={() => handleAction(company, 'suspend')}
                  >
                    Suspend
                  </button>
                )}
                {company.status !== 'active' && (
                  <button
                    className="btn-success"
                    onClick={() => handleAction(company, 'restore')}
                  >
                    Restore
                  </button>
                )}
                {company.status !== 'banned' && (
                  <button
                    className="btn-danger"
                    onClick={() => handleAction(company, 'ban')}
                  >
                    Ban
                  </button>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="empty-state">
            <p>No companies found matching your filters.</p>
          </div>
        )}
      </div>

      {showDetailModal && selectedCompany && (
        <div className="modal-overlay" onClick={() => setShowDetailModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedCompany.name}</h2>
              <button className="close-btn" onClick={() => setShowDetailModal(false)}>✕</button>
            </div>

            <div className="modal-body">
              <div className="detail-section">
                <h3>Company Information</h3>
                <div className="detail-grid">
                  <div className="detail-item">
                    <span className="label">UEN:</span>
                    <span className="value">{selectedCompany.uen}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Website:</span>
                    <span className="value">{selectedCompany.website || 'N/A'}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Registered:</span>
                    <span className="value">{new Date(selectedCompany.registeredAt).toLocaleDateString()}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Status:</span>
                    <span className="value" style={{ color: getStatusColor(selectedCompany.status) }}>
                      {selectedCompany.status.toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="detail-section">
                <h3>Contact Person</h3>
                <div className="detail-grid">
                  <div className="detail-item">
                    <span className="label">Name:</span>
                    <span className="value">{selectedCompany.contactPerson.name}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Email:</span>
                    <span className="value">{selectedCompany.contactPerson.email}</span>
                  </div>
                </div>
              </div>

              <div className="detail-section">
                <h3>Performance</h3>
                <div className="detail-grid">
                  <div className="detail-item">
                    <span className="label">Tasks Completed:</span>
                    <span className="value">{selectedCompany.tasksCompleted}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Rating:</span>
                    <span className="value">{selectedCompany.rating}⭐</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Tier:</span>
                    <span className="value">{selectedCompany.tier}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Subscription:</span>
                    <span className="value">{selectedCompany.subscription.plan}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowDetailModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {showActionModal && selectedCompany && (
        <div className="modal-overlay" onClick={() => setShowActionModal(false)}>
          <div className="modal-content confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Confirm Action</h2>
              <button className="close-btn" onClick={() => setShowActionModal(false)}>✕</button>
            </div>

            <div className="modal-body">
              <p>
                {actionType === 'suspend' && `Suspend company "${selectedCompany.name}"? They can reactivate later.`}
                {actionType === 'ban' && `Ban company "${selectedCompany.name}"? This is permanent.`}
                {actionType === 'restore' && `Restore company "${selectedCompany.name}" to active status?`}
              </p>
            </div>

            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowActionModal(false)}>Cancel</button>
              <button
                className={actionType === 'ban' ? 'btn-danger' : actionType === 'suspend' ? 'btn-warning' : 'btn-success'}
                onClick={confirmAction}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .company-management-page {
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

        .search-filters {
          display: flex;
          gap: 16px;
          margin-bottom: 30px;
          flex-wrap: wrap;
        }

        .search-box {
          flex: 1;
          min-width: 250px;
        }

        .search-input {
          width: 100%;
          padding: 12px 16px;
          border: 2px solid #e0e0e0;
          border-radius: 8px;
          font-size: 14px;
          transition: border-color 0.2s;
        }

        .search-input:focus {
          outline: none;
          border-color: #ff6b35;
        }

        .filter-group {
          display: flex;
          gap: 12px;
        }

        .filter-select {
          padding: 12px 16px;
          border: 2px solid #e0e0e0;
          border-radius: 8px;
          font-size: 14px;
          background: white;
          cursor: pointer;
          transition: border-color 0.2s;
        }

        .filter-select:focus {
          outline: none;
          border-color: #ff6b35;
        }

        .companies-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
          gap: 20px;
          margin-bottom: 40px;
        }

        .company-card {
          background: white;
          border: 2px solid #f0f0f0;
          border-radius: 12px;
          overflow: hidden;
          transition: all 0.3s;
        }

        .company-card:hover {
          border-color: #ff6b35;
          box-shadow: 0 4px 16px rgba(255, 107, 53, 0.1);
        }

        .card-header {
          padding: 16px;
          border-bottom: 2px solid #f5f5f5;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
        }

        .company-info h3 {
          margin: 0 0 4px 0;
          font-size: 16px;
          color: #333;
        }

        .company-info .uen {
          margin: 0;
          font-size: 12px;
          color: #999;
        }

        .badges {
          display: flex;
          gap: 8px;
          flex-shrink: 0;
        }

        .tier-badge, .status-badge {
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 700;
          color: white;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
        }

        .card-body {
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .stat {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 14px;
        }

        .stat .label {
          color: #666;
          font-weight: 500;
        }

        .stat .value {
          color: #333;
          font-weight: 600;
        }

        .card-actions {
          padding: 12px 16px;
          background: #f9f9f9;
          border-top: 2px solid #f5f5f5;
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .card-actions button {
          flex: 1;
          min-width: 100px;
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

        .btn-success {
          background: #4caf50;
          color: white;
        }

        .btn-success:hover {
          background: #45a049;
        }

        .btn-warning {
          background: #ff9800;
          color: white;
        }

        .btn-warning:hover {
          background: #e68900;
        }

        .btn-danger {
          background: #f44336;
          color: white;
        }

        .btn-danger:hover {
          background: #da190b;
        }

        .empty-state {
          grid-column: 1 / -1;
          text-align: center;
          padding: 60px 20px;
          color: #999;
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

        .modal-content.confirm-modal {
          max-width: 400px;
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
          padding: 0;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 6px;
          transition: all 0.2s;
        }

        .close-btn:hover {
          background: #f5f5f5;
          color: #333;
        }

        .modal-body {
          padding: 20px;
        }

        .detail-section {
          margin-bottom: 24px;
        }

        .detail-section h3 {
          margin: 0 0 12px 0;
          font-size: 14px;
          font-weight: 700;
          color: #ff6b35;
          text-transform: uppercase;
        }

        .detail-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .detail-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .detail-item .label {
          font-size: 12px;
          color: #999;
          font-weight: 600;
          text-transform: uppercase;
        }

        .detail-item .value {
          font-size: 14px;
          color: #333;
          font-weight: 500;
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

        .confirm-modal .modal-body {
          text-align: center;
          font-size: 16px;
          color: #666;
          line-height: 1.6;
        }
      `}</style>
    </div>
    </AdminLayout>
  );
};

export default CompanyManagement;
