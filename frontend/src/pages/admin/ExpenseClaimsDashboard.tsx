import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast, ToastContainer } from '../../components/Toast';
import AdminLayout from '../../components/admin/AdminLayout';
import DocumentUploadWithOCR from '../../components/DocumentUploadWithOCR';
import financeAPI, { n } from '../../services/financeAPI';

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
  status: 'draft' | 'submitted' | 'manager-approved' | 'accounts-reviewed' | 'reimbursed' | 'rejected';
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

  const [staffList, setStaffList] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  /**
   * Real claims. Every claim on this screen was a hardcoded object, and manager
   * approval, accounts review and reimbursement only rewrote React state — so a
   * claim could be "reimbursed" without a single row changing anywhere, and no
   * expense was ever recorded against it. Reimbursement now writes the expense
   * too, in the same transaction.
   */
  const loadClaims = async () => {
    try {
      setLoading(true);
      const [{ claims: rows, summary }, staffRows] = await Promise.all([
        financeAPI.listClaims(),
        financeAPI.payrollStaff(),
      ]);

      setClaims(rows.map(c => ({
        id: String(c.id),
        claimId: c.claim_number,
        staffId: c.staff_id,
        staffName: c.staff_name,
        date: c.claim_date,
        category: c.category,
        amount: n(c.amount),
        purpose: c.purpose || '',
        receipt: {
          fileName: c.receipt_file_name || '',
          uploadDate: c.claim_date,
          extractedAmount: c.receipt_extracted_amount != null ? n(c.receipt_extracted_amount) : undefined,
          extractedVendor: c.receipt_extracted_vendor || undefined,
          extractedDate: c.receipt_extracted_date || undefined,
        },
        department: c.department || '',
        status: c.status,
        managerApprovedBy: c.manager_approved_by_name || undefined,
        managerApprovedDate: c.manager_approved_at || undefined,
        accountsReviewedBy: c.accounts_reviewed_by_name || undefined,
        accountsReviewedDate: c.accounts_reviewed_at || undefined,
        reimbursementDate: c.reimbursed_at || undefined,
        reimbursementMethod: c.reimbursement_method || undefined,
        notes: c.notes || undefined,
        createdDate: c.claim_date,
        lastModified: c.claim_date,
      })));

      setClaimSummary({
        totalClaims: n(summary.total_claims),
        totalAmount: n(summary.total_amount),
        draftClaims: n(summary.draft_claims),
        pendingApproval: n(summary.pending_approval),
        approvedClaims: n(summary.approved_claims),
        reimbursedAmount: n(summary.reimbursed_amount),
        pendingReimbursement: n(summary.pending_reimbursement),
      });

      const staffOptions = staffRows.map(s => ({
        id: s.staff_id,
        name: `${s.first_name} ${s.last_name}`,
      }));
      setStaffList(staffOptions);
      setSelectedStaffId(prev => (staffOptions.some(s => s.id === prev) ? prev : staffOptions[0]?.id || ''));
    } catch (err) {
      showToast(`❌ ${err instanceof Error ? err.message : 'Failed to load claims'}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClaims();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
  const handleSubmitClaim = async () => {
    if (!claimForm.date || !claimForm.category || claimForm.amount <= 0 || !claimForm.purpose.trim() || !uploadedFile) {
      showToast('Please fill in all required fields and upload receipt', 'error');
      return;
    }
    if (!selectedStaffId) {
      showToast('Staff member not found', 'error');
      return;
    }

    try {
      const claim = await financeAPI.createClaim({
        staff_id: selectedStaffId,
        claim_date: claimForm.date,
        category: claimForm.category,
        amount: claimForm.amount,
        purpose: claimForm.purpose,
        department: claimForm.department,
        notes: claimForm.notes,
        receipt_file_name: uploadedFile.name,
      });
      showToast(`✅ Expense claim submitted (${claim.claim_number})`, 'success');
      setShowSubmitForm(false);
      setUploadedFile(null);
      setClaimForm({
        date: new Date().toISOString().split('T')[0],
        category: 'travel',
        amount: 0,
        purpose: '',
        department: '',
        notes: '',
      });
      await loadClaims();
    } catch (err) {
      showToast(`❌ ${err instanceof Error ? err.message : 'Failed to submit claim'}`, 'error');
    }
  };

  /** Each step asserts the previous one server-side, so a stale list cannot skip a stage. */
  const runClaimStep = async (
    claimId: string,
    step: (id: number) => Promise<unknown>,
    success: string
  ) => {
    const claim = claims.find(c => c.id === claimId);
    try {
      await step(Number(claimId));
      showToast(`${success}${claim ? ` - ${claim.staffName}` : ''}`, 'success');
      await loadClaims();
    } catch (err) {
      showToast(`❌ ${err instanceof Error ? err.message : 'Action failed'}`, 'error');
    }
  };

  const handleManagerApprove = (claimId: string) =>
    runClaimStep(claimId, id => financeAPI.managerApproveClaim(id), '✅ Claim approved by manager');

  const handleAccountsReview = (claimId: string) =>
    runClaimStep(claimId, id => financeAPI.accountsReviewClaim(id), '✅ Claim reviewed by accounts');

  const handleProcessReimbursement = (claimId: string) => {
    const claim = claims.find(c => c.id === claimId);
    return runClaimStep(
      claimId,
      id => financeAPI.reimburseClaim(id, 'bank-transfer'),
      `💰 Reimbursement processed${claim ? ` (SGD ${claim.amount})` : ''}`
    );
  };

  const handleRejectClaim = (claimId: string) =>
    runClaimStep(claimId, id => financeAPI.rejectClaim(id), '✗ Claim rejected');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'reimbursed':
        return { bg: '#E8F5E9', color: '#2E7D32', label: '✓ REIMBURSED' };
      case 'accounts-reviewed':
        return { bg: '#C8E6C9', color: '#1B5E20', label: '✓ ACCOUNTS REVIEWED' };
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
          <strong>🧾 Claims and receipts:</strong> Staff submit → manager approves → accounts reviews → reimbursement, with each step recorded against a named approver. Reimbursement writes the expense to the ledger. Keep the receipts: IRAS requires supporting records for 5 years.
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
                    <DocumentUploadWithOCR
                      title="Upload Receipt or Invoice"
                      description="Take a photo with your mobile camera or upload an image. OCR automatically extracts amount, vendor, and date."
                      allowCamera={true}
                      maxSize={10}
                      acceptedFormats={['image/jpeg', 'image/png', 'application/pdf']}
                      onUpload={(data) => {
                        setUploadedFile({
                          name: data.file.name,
                          size: data.file.size,
                        });
                        // Pre-fill amount from OCR if detected
                        if (data.extractedData.amount) {
                          setClaimForm({
                            ...claimForm,
                            amount: data.extractedData.amount,
                          });
                        }
                        showToast('✅ Receipt uploaded and processed with OCR', 'success');
                      }}
                    />
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
                .filter(c => c.status === 'accounts-reviewed')
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
