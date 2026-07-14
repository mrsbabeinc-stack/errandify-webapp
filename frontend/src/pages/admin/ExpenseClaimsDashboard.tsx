import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast, ToastContainer } from '../../components/Toast';
import AdminLayout from '../../components/admin/AdminLayout';

interface ExpenseClaim {
  id: string;
  claimId: string;
  staffId: string;
  staffName: string;
  date: string;
  category: string;
  amount: number;
  purpose: string;
  receipt: {
    fileName: string;
    uploadDate: string;
    extractedAmount?: number;
    extractedVendor?: string;
    extractedDate?: string;
  };
  department: string;
  status: 'draft' | 'submitted' | 'manager-approved' | 'accounts-reviewed' | 'approved' | 'reimbursed' | 'rejected';
  managerApprovedBy?: string;
  managerApprovedDate?: string;
  accountsReviewedBy?: string;
  accountsReviewedDate?: string;
  reimbursementDate?: string;
  reimbursementMethod?: string;
  notes?: string;
  createdDate: string;
  lastModified: string;
}

interface ClaimSummary {
  totalClaims: number;
  totalAmount: number;
  draftClaims: number;
  pendingApproval: number;
  approvedClaims: number;
  reimbursedAmount: number;
  pendingReimbursement: number;
}

const ExpenseClaimsDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { toasts, showToast, removeToast } = useToast();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'claims' | 'submit' | 'approval' | 'reimbursement'>('dashboard');

  // State
  const [claims, setClaims] = useState<ExpenseClaim[]>([]);
  const [claimSummary, setClaimSummary] = useState<ClaimSummary | null>(null);

  // Submit claim form
  const [showSubmitForm, setShowSubmitForm] = useState(false);
  const [selectedStaffId, setSelectedStaffId] = useState('S001');
  const [claimForm, setClaimForm] = useState({
    date: new Date().toISOString().split('T')[0],
    category: 'travel',
    amount: 0,
    purpose: '',
    department: '',
    notes: '',
  });
  const [uploadedFile, setUploadedFile] = useState<{ name: string; size: number } | null>(null);

  // Demo staff
  const staffList = [
    { id: 'S001', name: 'John Tan' },
    { id: 'S002', name: 'Sarah Lim' },
    { id: 'S003', name: 'Mike Wong' },
  ];

  // Demo data
  useEffect(() => {
    const demoClaims: ExpenseClaim[] = [
      {
        id: 'claim_1',
        claimId: 'CLM-2026-0001',
        staffId: 'S001',
        staffName: 'John Tan',
        date: '2026-07-05',
        category: 'travel',
        amount: 85.50,
        purpose: 'Client meeting - Taxi fare to Marina Bay office',
        receipt: {
          fileName: 'grab_receipt_070526.pdf',
          uploadDate: '2026-07-05',
          extractedAmount: 85.50,
          extractedVendor: 'Grab',
          extractedDate: '2026-07-05',
        },
        department: 'Operations',
        status: 'reimbursed',
        managerApprovedBy: 'Admin',
        managerApprovedDate: '2026-07-06',
        accountsReviewedBy: 'Finance',
        accountsReviewedDate: '2026-07-07',
        reimbursementDate: '2026-07-15',
        reimbursementMethod: 'Bank Transfer',
        createdDate: '2026-07-05',
        lastModified: '2026-07-15',
      },
      {
        id: 'claim_2',
        claimId: 'CLM-2026-0002',
        staffId: 'S002',
        staffName: 'Sarah Lim',
        date: '2026-07-08',
        category: 'meals',
        amount: 52.80,
        purpose: 'Team lunch meeting - Catering for 5 people',
        receipt: {
          fileName: 'invoice_catering_070826.pdf',
          uploadDate: '2026-07-08',
          extractedAmount: 52.80,
          extractedVendor: 'Food Court Caterers',
          extractedDate: '2026-07-08',
        },
        department: 'Accounts',
        status: 'approved',
        managerApprovedBy: 'Admin',
        managerApprovedDate: '2026-07-09',
        accountsReviewedBy: 'Finance',
        accountsReviewedDate: '2026-07-10',
        createdDate: '2026-07-08',
        lastModified: '2026-07-10',
      },
      {
        id: 'claim_3',
        claimId: 'CLM-2026-0003',
        staffId: 'S003',
        staffName: 'Mike Wong',
        date: '2026-07-12',
        category: 'supplies',
        amount: 125.00,
        purpose: 'Office supplies - Printer cartridges & paper',
        receipt: {
          fileName: 'office_depot_receipt_071226.pdf',
          uploadDate: '2026-07-12',
          extractedAmount: 125.00,
          extractedVendor: 'Office Depot',
          extractedDate: '2026-07-12',
        },
        department: 'HR',
        status: 'manager-approved',
        managerApprovedBy: 'Admin',
        managerApprovedDate: '2026-07-13',
        createdDate: '2026-07-12',
        lastModified: '2026-07-13',
      },
      {
        id: 'claim_4',
        claimId: 'CLM-2026-0004',
        staffId: 'S001',
        staffName: 'John Tan',
        date: '2026-07-15',
        category: 'travel',
        amount: 150.00,
        purpose: 'Flight to Singapore for conference - Training workshop',
        receipt: {
          fileName: 'flight_receipt_071526.pdf',
          uploadDate: '2026-07-15',
          extractedAmount: 150.00,
          extractedVendor: 'SilkAir',
          extractedDate: '2026-07-15',
        },
        department: 'Operations',
        status: 'submitted',
        createdDate: '2026-07-15',
        lastModified: '2026-07-15',
      },
    ];

    setClaims(demoClaims);

    // Calculate summary
    const summary: ClaimSummary = {
      totalClaims: demoClaims.length,
      totalAmount: demoClaims.reduce((sum, c) => sum + c.amount, 0),
      draftClaims: demoClaims.filter(c => c.status === 'draft').length,
      pendingApproval: demoClaims.filter(c => c.status === 'submitted' || c.status === 'manager-approved').length,
      approvedClaims: demoClaims.filter(c => c.status === 'approved').length,
      reimbursedAmount: demoClaims.filter(c => c.status === 'reimbursed').reduce((sum, c) => sum + c.amount, 0),
      pendingReimbursement: demoClaims.filter(c => c.status === 'approved' && !c.reimbursementDate).reduce((sum, c) => sum + c.amount, 0),
    };
    setClaimSummary(summary);
    setSelectedStaffId('S001');
  }, []);

  // Handle file upload simulation
  const handleFileUpload = () => {
    setUploadedFile({
      name: `receipt_${Date.now()}.pdf`,
      size: Math.random() * 5 + 1, // 1-5 MB
    });
    showToast('✅ Receipt uploaded (OCR processing...)', 'success');
  };

  // Submit expense claim
  const handleSubmitClaim = () => {
    if (!claimForm.date || !claimForm.category || claimForm.amount <= 0 || !claimForm.purpose.trim() || !uploadedFile) {
      showToast('Please fill in all required fields and upload receipt', 'error');
      return;
    }

    const staff = staffList.find(s => s.id === selectedStaffId);
    if (!staff) {
      showToast('Staff member not found', 'error');
      return;
    }

    const newClaim: ExpenseClaim = {
      id: `claim_${Date.now()}`,
      claimId: `CLM-2026-${String(claims.length + 1).padStart(4, '0')}`,
      staffId: selectedStaffId,
      staffName: staff.name,
      date: claimForm.date,
      category: claimForm.category,
      amount: claimForm.amount,
      purpose: claimForm.purpose,
      receipt: {
        fileName: uploadedFile.name,
        uploadDate: new Date().toISOString().split('T')[0],
        extractedAmount: claimForm.amount,
        extractedVendor: 'Auto-detected',
        extractedDate: claimForm.date,
      },
      department: claimForm.department,
      status: 'submitted',
      notes: claimForm.notes,
      createdDate: new Date().toISOString(),
      lastModified: new Date().toISOString(),
    };

    setClaims([...claims, newClaim]);
    setClaimForm({
      date: new Date().toISOString().split('T')[0],
      category: 'travel',
      amount: 0,
      purpose: '',
      department: '',
      notes: '',
    });
    setUploadedFile(null);
    setShowSubmitForm(false);
    showToast(`✅ Expense claim submitted (${newClaim.claimId})`, 'success');
  };

  // Manager approve
  const handleManagerApprove = (claimId: string) => {
    setClaims(
      claims.map(c =>
        c.id === claimId
          ? {
              ...c,
              status: 'manager-approved' as const,
              managerApprovedBy: 'Admin',
              managerApprovedDate: new Date().toISOString().split('T')[0],
              lastModified: new Date().toISOString(),
            }
          : c
      )
    );
    const claim = claims.find(c => c.id === claimId);
    showToast(`✅ Claim approved by manager - ${claim?.staffName}`, 'success');
  };

  // Accounts review
  const handleAccountsReview = (claimId: string) => {
    setClaims(
      claims.map(c =>
        c.id === claimId
          ? {
              ...c,
              status: 'approved' as const,
              accountsReviewedBy: 'Finance',
              accountsReviewedDate: new Date().toISOString().split('T')[0],
              lastModified: new Date().toISOString(),
            }
          : c
      )
    );
    const claim = claims.find(c => c.id === claimId);
    showToast(`✅ Claim reviewed by accounts - ${claim?.staffName}`, 'success');
  };

  // Process reimbursement
  const handleProcessReimbursement = (claimId: string) => {
    setClaims(
      claims.map(c =>
        c.id === claimId
          ? {
              ...c,
              status: 'reimbursed' as const,
              reimbursementDate: new Date().toISOString().split('T')[0],
              reimbursementMethod: 'Bank Transfer',
              lastModified: new Date().toISOString(),
            }
          : c
      )
    );
    const claim = claims.find(c => c.id === claimId);
    showToast(`💰 Reimbursement processed - ${claim?.staffName} (SGD ${claim?.amount})`, 'success');
  };

  // Reject claim
  const handleRejectClaim = (claimId: string) => {
    setClaims(
      claims.map(c =>
        c.id === claimId
          ? {
              ...c,
              status: 'rejected' as const,
              lastModified: new Date().toISOString(),
            }
          : c
      )
    );
    const claim = claims.find(c => c.id === claimId);
    showToast(`✗ Claim rejected - ${claim?.staffName}`, 'success');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'reimbursed':
        return { bg: '#E8F5E9', color: '#2E7D32', label: '✓ REIMBURSED' };
      case 'approved':
        return { bg: '#C8E6C9', color: '#1B5E20', label: '✓ APPROVED' };
      case 'manager-approved':
        return { bg: '#E3F2FD', color: '#0D47A1', label: '✓ MANAGER APPROVED' };
      case 'submitted':
        return { bg: '#FFF3E0', color: '#E65100', label: '⏳ SUBMITTED' };
      case 'draft':
        return { bg: '#F5F5F5', color: '#666', label: '📝 DRAFT' };
      case 'rejected':
        return { bg: '#FFEBEE', color: '#C62828', label: '✗ REJECTED' };
      default:
        return { bg: '#F5F5F5', color: '#666', label: status.toUpperCase() };
    }
  };

  return (
    <AdminLayout>
      <div style={{ padding: '16px', background: '#fff', minHeight: '100vh' }}>
        <ToastContainer toasts={toasts} onClose={removeToast} />

        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#333', margin: 0 }}>
              💼 Expense Claims
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
            Staff Submissions, Receipt Handling, Manager & Accounts Review, Reimbursement Processing
          </p>
        </div>

        {/* Compliance Banner */}
        <div style={{ padding: '12px 16px', background: '#E3F2FD', border: '2px solid #1976D2', borderRadius: '6px', marginBottom: '16px', fontSize: '12px', color: '#0D47A1' }}>
          <strong>🇸🇬 ACRA & MOM Compliance:</strong> All claims with receipts tracked. Workflow: Staff Submit → Manager Approve → Accounts Review → Reimbursement. All transactions synced to Accounts ledger with full audit trail.
        </div>

        {/* KPI Cards */}
        {claimSummary && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '20px' }}>
            <div style={{ padding: '16px', background: '#FFF8F5', borderRadius: '8px', border: '2px solid #FFD9B3' }}>
              <div style={{ fontSize: '12px', color: '#999', marginBottom: '4px' }}>Total Claims</div>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#FF6B35' }}>{claimSummary.totalClaims}</div>
              <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>SGD ${claimSummary.totalAmount.toLocaleString()}</div>
            </div>
            <div style={{ padding: '16px', background: '#FFF8F5', borderRadius: '8px', border: '2px solid #FFD9B3' }}>
              <div style={{ fontSize: '12px', color: '#999', marginBottom: '4px' }}>Pending Approval</div>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#FF9800' }}>{claimSummary.pendingApproval}</div>
              <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>Awaiting review</div>
            </div>
            <div style={{ padding: '16px', background: '#FFF8F5', borderRadius: '8px', border: '2px solid #FFD9B3' }}>
              <div style={{ fontSize: '12px', color: '#999', marginBottom: '4px' }}>Approved</div>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#4CAF50' }}>{claimSummary.approvedClaims}</div>
              <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>Ready to reimburse</div>
            </div>
            <div style={{ padding: '16px', background: '#FFF8F5', borderRadius: '8px', border: '2px solid #FFD9B3' }}>
              <div style={{ fontSize: '12px', color: '#999', marginBottom: '4px' }}>Reimbursed</div>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#2196F3' }}>
                SGD ${claimSummary.reimbursedAmount.toLocaleString()}
              </div>
              <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>Completed</div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', borderBottom: '2px solid #FFD9B3', overflowX: 'auto' }}>
          {(['dashboard', 'claims', 'submit', 'approval', 'reimbursement'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '12px 16px',
                background: activeTab === tab ? '#FFD9B3' : 'transparent',
                color: activeTab === tab ? '#333' : '#999',
                border: 'none',
                borderBottom: activeTab === tab ? '3px solid #FF6B35' : 'none',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '13px',
                transition: 'all 0.2s',
                whiteSpace: 'nowrap',
              }}
            >
              {tab === 'dashboard' && '📊 Dashboard'}
              {tab === 'claims' && '📋 All Claims'}
              {tab === 'submit' && '➕ Submit Claim'}
              {tab === 'approval' && '👤 Manager Review'}
              {tab === 'reimbursement' && '💰 Reimbursement'}
            </button>
          ))}
        </div>

        {/* DASHBOARD TAB */}
        {activeTab === 'dashboard' && (
          <div>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600', color: '#333' }}>Expense Claims Pipeline</h3>
            <div style={{ display: 'grid', gap: '12px' }}>
              {/* Recent claims */}
              {claims.slice(-5).reverse().map(claim => {
                const status = getStatusColor(claim.status);
                return (
                  <div key={claim.id} style={{ padding: '16px', background: 'white', border: '2px solid #FFD9B3', borderRadius: '8px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '16px', alignItems: 'start' }}>
                      <div>
                        <div style={{ fontWeight: '600', fontSize: '14px', color: '#333', marginBottom: '4px' }}>
                          {claim.claimId} • {claim.staffName}
                        </div>
                        <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>
                          {claim.category.toUpperCase()} - {claim.purpose}
                        </div>
                        <div style={{ fontSize: '11px', color: '#999' }}>
                          📅 {new Date(claim.date).toLocaleDateString('en-SG')} • 📄 {claim.receipt.fileName}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '18px', fontWeight: '700', color: '#333', marginBottom: '8px' }}>
                          SGD ${claim.amount.toLocaleString()}
                        </div>
                        <div style={{
                          display: 'inline-block',
                          padding: '6px 10px',
                          background: status.bg,
                          color: status.color,
                          borderRadius: '3px',
                          fontSize: '10px',
                          fontWeight: '600',
                        }}>
                          {status.label}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ALL CLAIMS TAB */}
        {activeTab === 'claims' && (
          <div>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600', color: '#333' }}>All Expense Claims</h3>
            <div style={{ display: 'grid', gap: '12px' }}>
              {claims.map(claim => {
                const status = getStatusColor(claim.status);
                return (
                  <div key={claim.id} style={{ padding: '16px', background: 'white', border: '2px solid #FFD9B3', borderRadius: '8px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '16px', alignItems: 'start', marginBottom: '12px' }}>
                      <div>
                        <div style={{ fontWeight: '600', fontSize: '14px', color: '#333', marginBottom: '4px' }}>
                          {claim.claimId} • {claim.staffName}
                        </div>
                        <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
                          {claim.category.toUpperCase()} • {claim.department}
                        </div>
                        <div style={{ fontSize: '11px', color: '#999', display: 'grid', gap: '2px' }}>
                          <div>📅 Claimed: {new Date(claim.date).toLocaleDateString('en-SG')}</div>
                          <div>📄 Receipt: {claim.receipt.fileName}</div>
                          {claim.receipt.extractedAmount && <div>💾 OCR Detected: SGD ${claim.receipt.extractedAmount}</div>}
                          <div>📝 {claim.purpose}</div>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '18px', fontWeight: '700', color: '#333', marginBottom: '8px' }}>
                          SGD ${claim.amount.toLocaleString()}
                        </div>
                        <div style={{
                          display: 'inline-block',
                          padding: '6px 10px',
                          background: status.bg,
                          color: status.color,
                          borderRadius: '3px',
                          fontSize: '10px',
                          fontWeight: '600',
                        }}>
                          {status.label}
                        </div>
                      </div>
                    </div>

                    {/* Timeline */}
                    <div style={{ fontSize: '10px', color: '#999', background: '#F5F5F5', padding: '8px 12px', borderRadius: '4px', marginTop: '8px' }}>
                      <div>1. 📩 Submitted: {new Date(claim.createdDate).toLocaleDateString('en-SG')}</div>
                      {claim.managerApprovedDate && <div>2. ✓ Manager Approved: {claim.managerApprovedDate}</div>}
                      {claim.accountsReviewedDate && <div>3. ✓ Accounts Reviewed: {claim.accountsReviewedDate}</div>}
                      {claim.reimbursementDate && <div>4. 💰 Reimbursed: {claim.reimbursementDate}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* SUBMIT CLAIM TAB */}
        {activeTab === 'submit' && (
          <div>
            <button
              onClick={() => setShowSubmitForm(!showSubmitForm)}
              style={{
                padding: '10px 16px',
                background: '#FF6B35',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontWeight: '600',
                cursor: 'pointer',
                marginBottom: '16px',
                fontSize: '14px',
              }}
            >
              + New Expense Claim
            </button>

            {showSubmitForm && (
              <div style={{ padding: '16px', background: '#FFF8F5', borderRadius: '8px', border: '2px solid #FFD9B3', marginBottom: '16px' }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#333' }}>Submit Expense Claim</h3>
                <div style={{ display: 'grid', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: '600', color: '#666', display: 'block', marginBottom: '4px' }}>
                      Staff Member
                    </label>
                    <select
                      value={selectedStaffId}
                      onChange={(e) => setSelectedStaffId(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '2px solid #FFD9B3',
                        borderRadius: '6px',
                        fontSize: '14px',
                        cursor: 'pointer',
                        boxSizing: 'border-box',
                      }}
                    >
                      {staffList.map(s => (
                        <option key={s.id} value={s.id}>{s.name} ({s.id})</option>
                      ))}
                    </select>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: '600', color: '#666', display: 'block', marginBottom: '4px' }}>
                        Date
                      </label>
                      <input
                        type="date"
                        value={claimForm.date}
                        onChange={(e) => setClaimForm({ ...claimForm, date: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          border: '2px solid #FFD9B3',
                          borderRadius: '6px',
                          fontSize: '14px',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: '600', color: '#666', display: 'block', marginBottom: '4px' }}>
                        Category
                      </label>
                      <select
                        value={claimForm.category}
                        onChange={(e) => setClaimForm({ ...claimForm, category: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          border: '2px solid #FFD9B3',
                          borderRadius: '6px',
                          fontSize: '14px',
                          cursor: 'pointer',
                          boxSizing: 'border-box',
                        }}
                      >
                        <option value="travel">Travel</option>
                        <option value="meals">Meals</option>
                        <option value="supplies">Supplies</option>
                        <option value="accommodation">Accommodation</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '12px', fontWeight: '600', color: '#666', display: 'block', marginBottom: '4px' }}>
                      Amount (SGD)
                    </label>
                    <input
                      type="number"
                      value={claimForm.amount}
                      onChange={(e) => setClaimForm({ ...claimForm, amount: parseFloat(e.target.value) || 0 })}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '2px solid #FFD9B3',
                        borderRadius: '6px',
                        fontSize: '14px',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '12px', fontWeight: '600', color: '#666', display: 'block', marginBottom: '4px' }}>
                      Department
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., Operations, HR"
                      value={claimForm.department}
                      onChange={(e) => setClaimForm({ ...claimForm, department: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '2px solid #FFD9B3',
                        borderRadius: '6px',
                        fontSize: '14px',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '12px', fontWeight: '600', color: '#666', display: 'block', marginBottom: '4px' }}>
                      Purpose *
                    </label>
                    <textarea
                      placeholder="e.g., Client meeting - Taxi fare to Marina Bay"
                      value={claimForm.purpose}
                      onChange={(e) => setClaimForm({ ...claimForm, purpose: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '2px solid #FFD9B3',
                        borderRadius: '6px',
                        fontSize: '13px',
                        minHeight: '60px',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '12px', fontWeight: '600', color: '#666', display: 'block', marginBottom: '4px' }}>
                      Receipt *
                    </label>
                    <button
                      onClick={handleFileUpload}
                      style={{
                        width: '100%',
                        padding: '12px',
                        background: uploadedFile ? '#E8F5E9' : '#E3F2FD',
                        color: uploadedFile ? '#2E7D32' : '#0D47A1',
                        border: `2px solid ${uploadedFile ? '#4CAF50' : '#1976D2'}`,
                        borderRadius: '6px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        fontSize: '14px',
                      }}
                    >
                      {uploadedFile ? `✓ ${uploadedFile.name}` : '📁 Upload Receipt (PDF/Image)'}
                    </button>
                    <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>
                      Supports PDF, JPG, PNG. Max 10MB. OCR will extract amount & date.
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '12px', fontWeight: '600', color: '#666', display: 'block', marginBottom: '4px' }}>
                      Notes (Optional)
                    </label>
                    <textarea
                      placeholder="Additional notes or details..."
                      value={claimForm.notes}
                      onChange={(e) => setClaimForm({ ...claimForm, notes: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '2px solid #FFD9B3',
                        borderRadius: '6px',
                        fontSize: '13px',
                        minHeight: '50px',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                      onClick={handleSubmitClaim}
                      style={{
                        flex: 1,
                        padding: '10px',
                        background: '#4CAF50',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        fontSize: '14px',
                      }}
                    >
                      Submit Claim
                    </button>
                    <button
                      onClick={() => setShowSubmitForm(false)}
                      style={{
                        flex: 1,
                        padding: '10px',
                        background: '#f5f5f5',
                        color: '#333',
                        border: 'none',
                        borderRadius: '6px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        fontSize: '14px',
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* MANAGER REVIEW TAB */}
        {activeTab === 'approval' && (
          <div>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600', color: '#333' }}>Manager & Accounts Review</h3>
            <div style={{ display: 'grid', gap: '12px' }}>
              {claims
                .filter(c => c.status === 'submitted' || c.status === 'manager-approved')
                .map(claim => {
                  const status = getStatusColor(claim.status);
                  return (
                    <div key={claim.id} style={{ padding: '16px', background: 'white', border: '2px solid #FFD9B3', borderRadius: '8px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '16px', alignItems: 'start', marginBottom: '12px' }}>
                        <div>
                          <div style={{ fontWeight: '600', fontSize: '14px', color: '#333', marginBottom: '4px' }}>
                            {claim.claimId} • {claim.staffName}
                          </div>
                          <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
                            {claim.category.toUpperCase()} • SGD ${claim.amount.toLocaleString()}
                          </div>
                          <div style={{ fontSize: '11px', color: '#999' }}>
                            {claim.purpose}
                          </div>
                        </div>
                        <div style={{
                          display: 'inline-block',
                          padding: '6px 10px',
                          background: status.bg,
                          color: status.color,
                          borderRadius: '3px',
                          fontSize: '10px',
                          fontWeight: '600',
                        }}>
                          {status.label}
                        </div>
                      </div>

                      {claim.status === 'submitted' && (
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            onClick={() => handleManagerApprove(claim.id)}
                            style={{
                              flex: 1,
                              padding: '6px 12px',
                              background: '#4CAF50',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              fontWeight: '600',
                              cursor: 'pointer',
                              fontSize: '11px',
                            }}
                          >
                            ✓ Manager Approve
                          </button>
                          <button
                            onClick={() => handleRejectClaim(claim.id)}
                            style={{
                              flex: 1,
                              padding: '6px 12px',
                              background: '#F44336',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              fontWeight: '600',
                              cursor: 'pointer',
                              fontSize: '11px',
                            }}
                          >
                            ✗ Reject
                          </button>
                        </div>
                      )}

                      {claim.status === 'manager-approved' && (
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            onClick={() => handleAccountsReview(claim.id)}
                            style={{
                              flex: 1,
                              padding: '6px 12px',
                              background: '#4CAF50',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              fontWeight: '600',
                              cursor: 'pointer',
                              fontSize: '11px',
                            }}
                          >
                            ✓ Accounts Review
                          </button>
                          <button
                            onClick={() => handleRejectClaim(claim.id)}
                            style={{
                              flex: 1,
                              padding: '6px 12px',
                              background: '#F44336',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              fontWeight: '600',
                              cursor: 'pointer',
                              fontSize: '11px',
                            }}
                          >
                            ✗ Reject
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* REIMBURSEMENT TAB */}
        {activeTab === 'reimbursement' && (
          <div>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600', color: '#333' }}>Process Reimbursement</h3>
            <div style={{ display: 'grid', gap: '12px' }}>
              {claims
                .filter(c => c.status === 'approved')
                .map(claim => (
                  <div key={claim.id} style={{ padding: '16px', background: 'white', border: '2px solid #FFD9B3', borderRadius: '8px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '16px', alignItems: 'start', marginBottom: '12px' }}>
                      <div>
                        <div style={{ fontWeight: '600', fontSize: '14px', color: '#333', marginBottom: '4px' }}>
                          {claim.claimId} • {claim.staffName}
                        </div>
                        <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
                          {claim.category.toUpperCase()} • SGD ${claim.amount.toLocaleString()}
                        </div>
                        <div style={{ fontSize: '11px', color: '#999' }}>
                          Ready for reimbursement • {claim.purpose}
                        </div>
                      </div>
                      <button
                        onClick={() => handleProcessReimbursement(claim.id)}
                        style={{
                          padding: '8px 16px',
                          background: '#2196F3',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          fontSize: '11px',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        💰 Reimburse
                      </button>
                    </div>
                  </div>
                ))}
            </div>

            {/* Reimbursed Summary */}
            {claims.filter(c => c.status === 'reimbursed').length > 0 && (
              <div style={{ marginTop: '24px' }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600', color: '#333' }}>Recently Reimbursed</h3>
                <div style={{ display: 'grid', gap: '8px' }}>
                  {claims
                    .filter(c => c.status === 'reimbursed')
                    .map(claim => (
                      <div key={claim.id} style={{ padding: '12px 16px', background: '#E8F5E9', borderRadius: '6px', border: '2px solid #4CAF50', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontWeight: '600', fontSize: '13px', color: '#2E7D32' }}>
                            {claim.claimId} • {claim.staffName}
                          </div>
                          <div style={{ fontSize: '11px', color: '#1B5E20', marginTop: '2px' }}>
                            Reimbursed: {claim.reimbursementDate} ({claim.reimbursementMethod})
                          </div>
                        </div>
                        <div style={{ fontSize: '14px', fontWeight: '700', color: '#2E7D32' }}>
                          SGD ${claim.amount.toLocaleString()}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default ExpenseClaimsDashboard;
