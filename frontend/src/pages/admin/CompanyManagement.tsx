import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useToast, ToastContainer } from '../../components/Toast';
import AdminLayout from '../../components/admin/AdminLayout';

/**
 * Companies, from `GET /api/admin/companies`.
 *
 * This screen listed `mockCompanies` and its Suspend/Ban buttons only edited
 * React state — no backend for any of it existed. Two things changed to make it
 * real, and one thing was removed:
 *
 *  - Suspension is now *enforced*. Nothing in the codebase read
 *    `companies.status`, so even a suspension that reached the database would
 *    have gated nothing; requireVerifiedCompany() now refuses a suspended
 *    company, which is what makes this screen worth having.
 *  - Suspending requires a reason. The company is shown it when they next try
 *    to act, so it has to say something specific.
 *  - Ban is gone. companies_status_check permits active/inactive/suspended
 *    only, so the old Ban button wrote a value Postgres rejects. A permanent
 *    company ban also has consequences nobody has decided — its open errands,
 *    its staff, money owed — so this offers the reversible control it can
 *    actually carry out instead of one it cannot.
 *
 * Tier and rating are not shown: nothing on the company record backs them, and
 * the previous values came from the mock.
 */
interface Company {
  id: number;
  company_name: string;
  uen: string;
  status: 'active' | 'inactive' | 'suspended';
  certified: boolean;
  created_at: string;
  suspended_at: string | null;
  suspension_reason: string | null;
  owner_name: string | null;
  owner_email: string | null;
  staff_count: number;
}

export const CompanyManagement: React.FC = () => {
  const navigate = useNavigate();
  const { toasts, showToast, removeToast } = useToast();

  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionType, setActionType] = useState<'suspend' | 'restore'>('suspend');
  const [suspendReason, setSuspendReason] = useState('');

  // useToast() returns a new showToast every render, so depending on it here
  // would re-create `load`, re-fire the effect on every render, and loop.
  const toast = useRef(showToast);
  toast.current = showToast;

  const load = useCallback(async (status: string, search: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (status) params.set('status', status);
      if (search.trim()) params.set('search', search.trim());
      const { data } = await axios.get(`/api/admin/companies?${params}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setCompanies(data.data || []);
    } catch (err: any) {
      console.error('[CompanyManagement] load failed:', err);
      toast.current(`⚠️ ${err.response?.data?.error || err.message}`, 'error');
      setCompanies([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Filtering happens server-side, so the search is debounced rather than
  // firing a request per keystroke.
  useEffect(() => {
    const t = setTimeout(() => load(selectedStatus, searchTerm), 300);
    return () => clearTimeout(t);
  }, [selectedStatus, searchTerm, load]);

  const filteredCompanies = companies;

  const handleAction = (company: Company, action: 'suspend' | 'restore') => {
    setSelectedCompany(company);
    setActionType(action);
    setSuspendReason('');
    setShowActionModal(true);
  };

  const confirmAction = async () => {
    if (!selectedCompany) return;
    if (actionType === 'suspend' && suspendReason.trim().length < 10) {
      showToast('❌ Give a reason of at least 10 characters — the company is shown this', 'error');
      return;
    }
    setBusyId(selectedCompany.id);
    try {
      const auth = { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } };
      if (actionType === 'suspend') {
        await axios.post(`/api/admin/companies/${selectedCompany.id}/suspend`, { reason: suspendReason.trim() }, auth);
        showToast(`✅ ${selectedCompany.company_name} suspended`, 'success');
      } else {
        await axios.post(`/api/admin/companies/${selectedCompany.id}/restore`, {}, auth);
        showToast(`✅ ${selectedCompany.company_name} restored`, 'success');
      }
      setShowActionModal(false);
      await load(selectedStatus, searchTerm);
    } catch (err: any) {
      console.error('[CompanyManagement] action failed:', err);
      showToast(`❌ ${err.response?.data?.error || err.message}`, 'error');
    } finally {
      setBusyId(null);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      active: '#4caf50',
      suspended: '#ff9800',
      inactive: '#9e9e9e',
    };
    return colors[status] || '#999';
  };

  return (
    <AdminLayout>
      <div style={{ padding: '16px', background: '#fff', minHeight: '100vh' }}>
      <ToastContainer toasts={toasts} onClose={removeToast} />

      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#333', margin: 0 }}>
            👔 Client Management
          </h1>
          <button
            onClick={() => navigate(-1)}
            style={{
              fontSize: '20px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#FF6B35',
              fontWeight: '700',
            }}
            title="Go back"
          >
            ←
          </button>
        </div>
        <p style={{ fontSize: '14px', color: '#666', margin: '8px 0 0 0' }}>
          Manage company accounts, status, and admin actions
        </p>
      </div>

      {/* Stats Box */}
      <div style={{ padding: '12px 16px', background: '#FFF8F5', borderRadius: '8px', border: '2px solid #FFD9B3', marginBottom: '20px', fontSize: '14px', color: '#555' }}>
        😊 You have <strong>{companies.length}</strong> companies registered • <strong>{companies.filter(c => c.status === 'active').length}</strong> active
      </div>

      {/* Search & Filter */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '12px', marginBottom: '16px' }}>
        <input
          type="text"
          placeholder="Search by name, UEN, or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            padding: '10px 12px',
            border: '2px solid #FFD9B3',
            borderRadius: '6px',
            fontSize: '14px',
          }}
        />


        <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)} style={{
          padding: '10px 12px',
          border: '2px solid #FFD9B3',
          borderRadius: '6px',
          fontSize: '14px',
          cursor: 'pointer',
        }}>
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      <div style={{ background: 'white', borderRadius: '8px', border: '2px solid #FFD9B3', overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#FFF8F5', borderBottom: '2px solid #FFD9B3' }}>
              <th style={{ padding: '16px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: '#666', textTransform: 'uppercase' }}>Company Name</th>
              <th style={{ padding: '16px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: '#666', textTransform: 'uppercase' }}>UEN</th>
              <th style={{ padding: '16px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: '#666', textTransform: 'uppercase' }}>Owner</th>
              <th style={{ padding: '16px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: '#666', textTransform: 'uppercase' }}>Staff</th>
              <th style={{ padding: '16px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: '#666', textTransform: 'uppercase' }}>Status</th>
              <th style={{ padding: '16px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: '#666', textTransform: 'uppercase' }}>Registered</th>
              <th style={{ padding: '16px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: '#666', textTransform: 'uppercase' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ padding: '40px 16px', textAlign: 'center', color: '#999', fontSize: '14px' }}>Loading…</td></tr>
            ) : filteredCompanies.length > 0 ? (
              filteredCompanies.map((company) => (
                <tr key={company.id} style={{ borderBottom: '1px solid #f5f5f5', transition: 'all 0.2s' }} onMouseEnter={(e) => (e.currentTarget.style.background = '#FFF8F5')} onMouseLeave={(e) => (e.currentTarget.style.background = 'white')}>
                  <td style={{ padding: '16px', fontSize: '14px', color: '#333', fontWeight: '600' }}>{company.company_name}</td>
                  <td style={{ padding: '16px', fontSize: '14px', color: '#333' }}>{company.uen}</td>
                  <td style={{ padding: '16px', fontSize: '13px', color: '#555' }}>
                    {company.owner_name || '—'}
                    <div style={{ fontSize: '11px', color: '#999' }}>{company.owner_email || ''}</div>
                  </td>
                  <td style={{ padding: '16px', fontSize: '14px', color: '#333' }}>{company.staff_count}</td>
                  <td style={{ padding: '16px' }}>
                    <span style={{ padding: '6px 10px', backgroundColor: getStatusColor(company.status), color: 'white', fontSize: '11px', fontWeight: '600', borderRadius: '3px' }}>
                      {company.status.toUpperCase()}
                    </span>
                    {!company.certified && (
                      <div style={{ fontSize: '10px', color: '#e65100', marginTop: '4px' }}>not certified</div>
                    )}
                    {company.suspension_reason && (
                      <div style={{ fontSize: '11px', color: '#666', marginTop: '4px', maxWidth: '220px' }}>
                        {company.suspension_reason}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '16px', fontSize: '14px', color: '#333' }}>{new Date(company.created_at).toLocaleDateString('en-SG')}</td>
                  <td style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {company.status === 'active' && (
                        <button
                          onClick={() => handleAction(company, 'suspend')}
                          style={{
                            padding: '6px 10px',
                            background: '#FF9800',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            fontSize: '11px',
                          }}
                        >
                          Suspend
                        </button>
                      )}
                      {company.status === 'suspended' && (
                        <button
                          onClick={() => handleAction(company, 'restore')}
                          style={{
                            padding: '6px 10px',
                            background: '#4CAF50',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            fontSize: '11px',
                          }}
                        >
                          Restore
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} style={{ padding: '40px 16px', textAlign: 'center', color: '#999', fontSize: '14px' }}>
                  No companies found matching your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>


      {showActionModal && selectedCompany && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowActionModal(false)}>
          <div style={{ background: 'white', borderRadius: '8px', padding: '24px', maxWidth: '400px', width: '90%', boxShadow: '0 8px 24px rgba(0,0,0,0.2)' }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#333', margin: '0 0 16px 0' }}>Confirm Action</h2>

            <p style={{ fontSize: '14px', color: '#555', lineHeight: '1.6', marginBottom: '16px' }}>
              {actionType === 'suspend'
                ? `Suspend "${selectedCompany.company_name}"? They will not be able to post errands as the company until this is lifted. Reversible.`
                : `Restore "${selectedCompany.company_name}" to active? They can post again straight away.`}
            </p>

            {actionType === 'suspend' && (
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#333', marginBottom: '6px' }}>
                  Reason (the company is shown this)
                </label>
                <textarea
                  value={suspendReason}
                  onChange={(e) => setSuspendReason(e.target.value)}
                  rows={3}
                  placeholder="e.g. Repeated no-shows on accepted errands"
                  style={{ width: '100%', padding: '8px 10px', border: '2px solid #FFD9B3', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', resize: 'vertical' }}
                />
                <div style={{ fontSize: '11px', color: suspendReason.trim().length < 10 ? '#f44336' : '#888', marginTop: '4px' }}>
                  {suspendReason.trim().length < 10
                    ? `${10 - suspendReason.trim().length} more character(s) needed`
                    : 'They will see this when they next try to act.'}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowActionModal(false)} style={{
                padding: '10px 16px',
                background: '#f5f5f5',
                color: '#333',
                border: 'none',
                borderRadius: '6px',
                fontWeight: '600',
                cursor: 'pointer',
                fontSize: '13px',
              }}>
                Cancel
              </button>
              <button
                onClick={confirmAction}
                disabled={busyId === selectedCompany.id || (actionType === 'suspend' && suspendReason.trim().length < 10)}
                style={{
                  padding: '10px 16px',
                  background: actionType === 'suspend' ? '#FF9800' : '#4CAF50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  fontSize: '13px',
                }}
              >
                {busyId === selectedCompany.id ? 'Working…' : 'Confirm'}
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

        .companies-table-wrapper {
          background: white;
          border-radius: 8px;
          border: 2px solid #ffb88c;
          overflow-x: auto;
          margin-top: 20px;
          margin-bottom: 40px;
        }

        .companies-table {
          width: 100%;
          border-collapse: collapse;
        }

        .companies-table thead {
          background: #fff8f5;
          border-bottom: 2px solid #ffb88c;
        }

        .companies-table th {
          padding: 16px;
          text-align: left;
          font-size: 12px;
          font-weight: 700;
          color: #666;
          text-transform: uppercase;
        }

        .companies-table tbody tr {
          border-bottom: 1px solid #f5f5f5;
          transition: all 0.2s;
        }

        .companies-table tbody tr:hover {
          background: #fff8f5;
        }

        .companies-table td {
          padding: 16px;
          font-size: 14px;
          color: #333;
        }

        .company-name {
          font-weight: 600;
        }

        .action-buttons {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .companies-grid {
          display: none;
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
