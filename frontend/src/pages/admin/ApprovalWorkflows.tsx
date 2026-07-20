import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast, ToastContainer } from '../../components/Toast';
import AdminLayout from '../../components/admin/AdminLayout';

interface ApprovalStep {
  step_id: number;
  level: number;
  approver_role: string;
  amount_limit: number;
  status: 'approved' | 'pending' | 'rejected';
}

interface ApprovalRequest {
  request_id: number;
  request_number: string;
  module: string;
  request_type: string;
  requester_name: string;
  requester_id: string;
  amount: number;
  description: string;
  submission_date: string;
  current_level: number;
  status: 'approved' | 'pending' | 'rejected';
  approval_chain: ApprovalStep[];
  notes?: string;
  created_date: string;
}

const ApprovalWorkflows: React.FC = () => {
  const navigate = useNavigate();
  const { toasts, showToast, removeToast } = useToast();
  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'overview' | 'detail' | 'create'>('overview');
  const [selectedRequest, setSelectedRequest] = useState<ApprovalRequest | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [selectedModule, setSelectedModule] = useState<'all' | 'expense' | 'payroll' | 'purchase'>('all');

  const [formData, setFormData] = useState({
    request_number: '',
    module: 'expense' as 'expense' | 'payroll' | 'purchase',
    request_type: 'Expense Claim',
    requester_name: '',
    requester_id: '',
    amount: '',
    description: '',
    justification: '',
  });

  const [approvalNotes, setApprovalNotes] = useState('');

  useEffect(() => {
    loadApprovals();
  }, [selectedStatus, selectedModule]);

  const loadApprovals = async () => {
    try {
      setLoading(true);
      const companyId = localStorage.getItem('companyId') || localStorage.getItem('current_company_id') || '1';
      const token = localStorage.getItem('token');

      let url = `/api/approvals/requests?company_id=${companyId}`;
      if (selectedStatus !== 'all') {
        url += `&status=${selectedStatus}`;
      }
      if (selectedModule !== 'all') {
        url += `&module=${selectedModule}`;
      }

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (data.success) {
        setRequests(data.data.map((req: any) => ({
          request_id: req.id,
          request_number: req.request_number,
          module: req.module,
          request_type: req.request_type,
          requester_name: req.requester_name,
          requester_id: req.requester_id,
          amount: req.amount,
          description: req.description,
          submission_date: req.submission_date,
          current_level: req.current_level,
          status: req.status,
          approval_chain: [],
          notes: req.description,
          created_date: req.created_at
        })));
      }
    } catch (error) {
      console.error('Error loading approvals:', error);
      showToast('Failed to load approvals', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRequest = async () => {
    if (!formData.request_number || !formData.requester_name || !formData.requester_id || !formData.amount || !formData.description) {
      showToast('❌ Please fill all required fields', 'error');
      return;
    }

    try {
      const newRequest: ApprovalRequest = {
        request_id: Date.now(),
        request_number: formData.request_number,
        module: formData.module,
        request_type: formData.request_type,
        requester_name: formData.requester_name,
        requester_id: formData.requester_id,
        amount: Number(formData.amount),
        description: formData.description,
        submission_date: new Date().toISOString().split('T')[0],
        current_level: 1,
        status: 'pending',
        approval_chain: [
          { step_id: 1, level: 1, approver_role: 'Manager', amount_limit: 5000, status: 'pending' },
          { step_id: 2, level: 2, approver_role: 'Finance Head', amount_limit: 50000, status: 'pending' },
          { step_id: 3, level: 3, approver_role: 'Director', amount_limit: 100000, status: 'pending' },
        ],
        notes: formData.justification,
        created_date: new Date().toISOString(),
      };

      const saved = localStorage.getItem('approvals') || '[]';
      const allRequests = JSON.parse(saved);
      allRequests.push(newRequest);
      localStorage.setItem('approvals', JSON.stringify(allRequests));

      showToast(`✅ Approval request ${formData.request_number} created`, 'success');
      setFormData({ request_number: '', module: 'expense', request_type: 'Expense Claim', requester_name: '', requester_id: '', amount: '', description: '', justification: '' });
      setViewMode('overview');
      loadApprovals();
    } catch (error) {
      showToast('❌ Failed to create request', 'error');
    }
  };

  const handleApprove = (stepLevel: number) => {
    if (!selectedRequest) return;
    showToast(`✅ Approved at level ${stepLevel}`, 'success');
    setApprovalNotes('');
    setTimeout(() => loadApprovals(), 1000);
  };

  const handleReject = (stepLevel: number) => {
    if (!selectedRequest || !approvalNotes.trim()) {
      showToast('❌ Please provide rejection reason', 'error');
      return;
    }
    showToast(`✗ Rejected at level ${stepLevel}`, 'error');
    setApprovalNotes('');
    setTimeout(() => loadApprovals(), 1000);
  };

  const getStatusBadge = (status: string) => {
    const styles: { [key: string]: { bg: string; color: string; text: string; icon: string } } = {
      approved: { bg: '#E8F5E9', color: '#2E7D32', text: 'Approved', icon: '✓' },
      pending: { bg: '#FFF3E0', color: '#E65100', text: 'Pending', icon: '⏳' },
      rejected: { bg: '#FFEBEE', color: '#C62828', text: 'Rejected', icon: '✗' },
    };
    const style = styles[status] || styles.pending;
    return (
      <span style={{ padding: '4px 8px', background: style.bg, color: style.color, borderRadius: '4px', fontSize: '11px', fontWeight: '600' }}>
        {style.icon} {style.text}
      </span>
    );
  };

  if (viewMode === 'create') {
    return (
      <AdminLayout>
        <div style={{ padding: '16px', background: '#fff', minHeight: '100vh' }}>
          <ToastContainer toasts={toasts} onClose={removeToast} />
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#333', margin: 0 }}>➕ New Approval Request</h1>
              <button onClick={() => setViewMode('overview')} style={{ fontSize: '20px', background: 'none', border: 'none', cursor: 'pointer', color: '#FF6B35', fontWeight: '700' }}>✕</button>
            </div>

            <div style={{ background: 'white', padding: '20px', borderRadius: '8px', border: '1px solid #ddd' }}>
              <div style={{ padding: '12px', background: '#E3F2FD', borderRadius: '4px', marginBottom: '16px', borderLeft: '4px solid #1565C0' }}>
                <p style={{ fontSize: '11px', color: '#0D47A1', margin: 0 }}><strong>* = Required fields</strong></p>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#333', display: 'block', marginBottom: '6px' }}>Request Number *</label>
                <input type="text" placeholder="APR-2026-004" value={formData.request_number} onChange={(e) => setFormData({ ...formData, request_number: e.target.value.toUpperCase() })} style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '12px', fontFamily: 'inherit', boxSizing: 'border-box' }} />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#333', display: 'block', marginBottom: '6px' }}>Module *</label>
                <select value={formData.module} onChange={(e) => setFormData({ ...formData, module: e.target.value as any })} style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '12px', fontFamily: 'inherit', boxSizing: 'border-box' }}>
                  <option value="expense">Expense Claim</option>
                  <option value="payroll">Payroll</option>
                  <option value="purchase">Purchase Order</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#333', display: 'block', marginBottom: '6px' }}>Requester Name *</label>
                  <input type="text" placeholder="John Doe" value={formData.requester_name} onChange={(e) => setFormData({ ...formData, requester_name: e.target.value })} style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '12px', fontFamily: 'inherit', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#333', display: 'block', marginBottom: '6px' }}>Employee ID *</label>
                  <input type="text" placeholder="EMP-001" value={formData.requester_id} onChange={(e) => setFormData({ ...formData, requester_id: e.target.value.toUpperCase() })} style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '12px', fontFamily: 'inherit', boxSizing: 'border-box' }} />
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#333', display: 'block', marginBottom: '6px' }}>Amount (SGD) *</label>
                <input type="number" placeholder="2500" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '12px', fontFamily: 'inherit', boxSizing: 'border-box' }} />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#333', display: 'block', marginBottom: '6px' }}>Description *</label>
                <textarea placeholder="Describe the request" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '12px', fontFamily: 'inherit', minHeight: '80px', boxSizing: 'border-box' }} />
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#333', display: 'block', marginBottom: '6px' }}>Business Justification</label>
                <textarea placeholder="Why is this needed?" value={formData.justification} onChange={(e) => setFormData({ ...formData, justification: e.target.value })} style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '12px', fontFamily: 'inherit', minHeight: '80px', boxSizing: 'border-box' }} />
              </div>

              <div style={{ padding: '12px', background: '#FFF3E0', borderRadius: '4px', marginBottom: '24px', borderLeft: '4px solid #FF6B35' }}>
                <p style={{ fontSize: '11px', color: '#E65100', margin: 0, lineHeight: '1.5' }}><strong>🇸🇬 Compliance:</strong> Multi-level approval workflow meets Singapore MOM/ACRA requirements for financial controls and audit trails.</p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <button onClick={() => setViewMode('overview')} style={{ padding: '12px', background: '#f0f0f0', color: '#333', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '600' }}>Cancel</button>
                <button onClick={handleCreateRequest} style={{ padding: '12px', background: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '600' }}>✓ Submit for Approval</button>
              </div>
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (viewMode === 'detail' && selectedRequest) {
    return (
      <AdminLayout>
        <div style={{ padding: '16px', background: '#fff', minHeight: '100vh' }}>
          <ToastContainer toasts={toasts} onClose={removeToast} />
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <button onClick={() => setViewMode('overview')} style={{ fontSize: '20px', background: 'none', border: 'none', cursor: 'pointer', color: '#FF6B35', fontWeight: '700', marginBottom: '16px' }}>← Back</button>

            <div style={{ background: 'white', padding: '20px', borderRadius: '8px', border: '1px solid #ddd', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#333', marginBottom: '12px' }}>{selectedRequest.request_number}</h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div><div style={{ fontSize: '11px', color: '#666' }}>Requester</div><div style={{ fontSize: '13px', fontWeight: '600', color: '#333' }}>{selectedRequest.requester_name} ({selectedRequest.requester_id})</div></div>
                <div><div style={{ fontSize: '11px', color: '#666' }}>Amount</div><div style={{ fontSize: '13px', fontWeight: '600', color: '#FF6B35' }}>SGD {selectedRequest.amount.toLocaleString()}</div></div>
                <div><div style={{ fontSize: '11px', color: '#666' }}>Status</div>{getStatusBadge(selectedRequest.status)}</div>
              </div>

              <div style={{ padding: '12px', background: '#FFF3E0', borderRadius: '4px', marginBottom: '16px' }}>
                <p style={{ fontSize: '12px', color: '#E65100', margin: 0 }}><strong>Description:</strong> {selectedRequest.description}</p>
              </div>

              {/* Approval Chain */}
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '13px', fontWeight: '600', color: '#333', marginBottom: '12px' }}>Approval Chain</h3>
                {selectedRequest.approval_chain.map((step) => (
                  <div key={step.step_id} style={{ padding: '12px', background: step.status === 'approved' ? '#E8F5E9' : '#FFF3E0', borderRadius: '4px', marginBottom: '8px', borderLeft: `4px solid ${step.status === 'approved' ? '#4CAF50' : '#FF9800'}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: '600', color: '#333' }}>Level {step.level}: {step.approver_role}</div>
                        <div style={{ fontSize: '11px', color: '#666' }}>Up to SGD {step.amount_limit.toLocaleString()}</div>
                      </div>
                      {getStatusBadge(step.status)}
                    </div>
                  </div>
                ))}
              </div>

              {/* Approval Action (for current level) */}
              {selectedRequest.status === 'pending' && (
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#333', display: 'block', marginBottom: '8px' }}>Approval Notes</label>
                  <textarea placeholder="Add notes..." value={approvalNotes} onChange={(e) => setApprovalNotes(e.target.value)} style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '12px', fontFamily: 'inherit', minHeight: '80px', marginBottom: '16px', boxSizing: 'border-box' }} />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <button onClick={() => handleReject(selectedRequest.current_level)} style={{ padding: '12px', background: '#F44336', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '600' }}>✗ Reject</button>
                    <button onClick={() => handleApprove(selectedRequest.current_level)} style={{ padding: '12px', background: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '600' }}>✓ Approve</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  const pendingCount = requests.filter(r => r.status === 'pending').length;
  const approvedCount = requests.filter(r => r.status === 'approved').length;
  const rejectedCount = requests.filter(r => r.status === 'rejected').length;
  const totalAmount = requests.reduce((sum, r) => sum + r.amount, 0);

  return (
    <AdminLayout>
      <div style={{ padding: '16px', background: '#fff', minHeight: '100vh' }}>
        <ToastContainer toasts={toasts} onClose={removeToast} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#333', margin: '0 0 4px 0' }}>✓ Approval Workflows</h1>
            <p style={{ fontSize: '14px', color: '#666', margin: 0 }}>Multi-level approval for expenses, payroll & purchases</p>
          </div>
          <button onClick={() => navigate(-1)} style={{ fontSize: '20px', background: 'none', border: 'none', cursor: 'pointer', color: '#FF6B35', fontWeight: '700' }}>←</button>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '12px', marginBottom: '24px' }}>
          {[
            { label: 'Pending', value: pendingCount, color: '#FF9800', icon: '⏳' },
            { label: 'Approved', value: approvedCount, color: '#4CAF50', icon: '✓' },
            { label: 'Rejected', value: rejectedCount, color: '#F44336', icon: '✗' },
            { label: 'Total Amount', value: `SGD ${totalAmount.toLocaleString()}`, color: '#2196F3', icon: '💰' },
          ].map((stat, idx) => (
            <div key={idx} style={{ padding: '16px', background: 'white', border: `2px solid ${stat.color}`, borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '24px', marginBottom: '4px' }}>{stat.icon}</div>
              <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>{stat.label}</div>
              <div style={{ fontSize: '18px', fontWeight: '700', color: stat.color }}>{stat.value}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', alignItems: 'center', flexWrap: 'wrap' }}>
          <label style={{ fontSize: '12px', fontWeight: '600', color: '#333' }}>Status:</label>
          {[{ value: 'pending' as const, label: 'Pending' }, { value: 'approved' as const, label: 'Approved' }, { value: 'rejected' as const, label: 'Rejected' }, { value: 'all' as const, label: 'All' }].map(opt => (
            <button key={opt.value} onClick={() => setSelectedStatus(opt.value)} style={{ padding: '6px 12px', background: selectedStatus === opt.value ? '#FF6B35' : '#f0f0f0', color: selectedStatus === opt.value ? 'white' : '#333', border: 'none', borderRadius: '4px', fontSize: '11px', fontWeight: '600', cursor: 'pointer' }}>{opt.label}</button>
          ))}
          <button onClick={() => setViewMode('create')} style={{ marginLeft: 'auto', padding: '6px 12px', background: '#FF6B35', color: 'white', border: 'none', borderRadius: '4px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>➕ New Request</button>
        </div>

        {/* Requests Table */}
        <div style={{ background: 'white', border: '1px solid #ddd', borderRadius: '8px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#F5F5F5', borderBottom: '2px solid #ddd' }}>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600' }}>Request #</th>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600' }}>Requester</th>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600' }}>Module</th>
                <th style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: '600' }}>Amount</th>
                <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: '600' }}>Level</th>
                <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: '600' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {requests.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: '#999' }}>No requests found</td></tr>
              ) : (
                requests.map((req) => (
                  <tr key={req.request_id} style={{ borderBottom: '1px solid #eee', cursor: 'pointer' }} onClick={() => { setSelectedRequest(req); setViewMode('detail'); }}>
                    <td style={{ padding: '12px', fontSize: '12px', fontWeight: '600', color: '#FF6B35' }}>{req.request_number}</td>
                    <td style={{ padding: '12px', fontSize: '12px', color: '#333' }}>{req.requester_name} ({req.requester_id})</td>
                    <td style={{ padding: '12px', fontSize: '12px', color: '#666' }}>{req.module.charAt(0).toUpperCase() + req.module.slice(1)}</td>
                    <td style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: '#333' }}>SGD {req.amount.toLocaleString()}</td>
                    <td style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#333' }}>{req.current_level}/{req.approval_chain.length}</td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>{getStatusBadge(req.status)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: '24px', padding: '16px', background: '#FFF3E0', borderRadius: '8px', borderLeft: '4px solid #FF6B35' }}>
          <p style={{ fontSize: '12px', color: '#E65100', margin: 0 }}><strong>🇸🇬 Compliance:</strong> Multi-level approval workflow enforces financial controls per Singapore MOM/ACRA requirements. All approval steps audit-logged.</p>
        </div>
      </div>
    </AdminLayout>
  );
};

export default ApprovalWorkflows;
