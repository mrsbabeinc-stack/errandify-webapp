import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast, ToastContainer } from '../../components/Toast';
import AdminLayout from '../../components/admin/AdminLayout';
import financeAPI, { n, FinanceSummary } from '../../services/financeAPI';

interface IncomeEntry {
  id: string;
  date: string;
  amount: number;
  source: string;
  reference: string;
  description: string;
  notes: string;
  tags: string[];
  gstApplicable?: boolean;
  gstAmount?: number;
  invoiceNo?: string;
  paymentStatus: 'pending' | 'received' | 'overdue';
  createdAt: string;
  lastModified: string;
}

interface ExpenseEntry {
  id: string;
  date: string;
  amount: number;
  category: string;
  vendor: string;
  description: string;
  department: string;
  tags: string[];
  approvalStatus: 'pending' | 'approved' | 'rejected';
  approvedBy?: string;
  approvalDate?: string;
  gstApplicable?: boolean;
  gstAmount?: number;
  receiptNo?: string;
  createdAt: string;
  lastModified: string;
}

interface LedgerEntry {
  id: string;
  date: string;
  type: 'income' | 'expense';
  description: string;
  debit: number;
  credit: number;
  balance: number;
  category: string;
  reference: string;
}

interface Tag {
  id: string;
  name: string;
  type: 'category' | 'location' | 'purpose' | 'staff';
  value: string;
}

interface AccountReconciliation {
  id: string;
  date: string;
  accountType: string;
  expectedBalance: number;
  actualBalance: number;
  variance: number;
  status: 'reconciled' | 'pending' | 'variance';
  notes: string;
}

interface RecurringExpense {
  id: string;
  name: string;
  amount: number;
  category: string;
  vendor: string;
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'annual';
  startDate: string;
  endDate?: string;
  department: string;
  description: string;
  nextDueDate: string;
  lastProcessedDate?: string;
  isActive: boolean;
  approvalStatus: 'pending' | 'approved';
  createdAt: string;
  lastModified: string;
  autoApprove?: boolean;
}

const AccountsDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { toasts, showToast, removeToast } = useToast();
  const [activeTab, setActiveTab] = useState<'overview' | 'income' | 'expenses' | 'recurring' | 'ledger' | 'reconciliation' | 'tags' | 'reports'>('overview');
  const [selectedPeriod, setSelectedPeriod] = useState<'month' | 'quarter' | 'year'>('month');

  // Income state
  const [income, setIncome] = useState<IncomeEntry[]>([]);
  const [showIncomeForm, setShowIncomeForm] = useState(false);
  const [incomeForm, setIncomeForm] = useState({
    date: new Date().toISOString().split('T')[0],
    amount: 0,
    source: '',
    reference: '',
    description: '',
    notes: '',
    invoiceNo: '',
    paymentStatus: 'pending' as const,
  });

  // Expense state
  const [expenses, setExpenses] = useState<ExpenseEntry[]>([]);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [expenseForm, setExpenseForm] = useState({
    date: new Date().toISOString().split('T')[0],
    amount: 0,
    category: '',
    vendor: '',
    description: '',
    department: '',
  });

  // Recurring expenses state
  const [recurringExpenses, setRecurringExpenses] = useState<RecurringExpense[]>([]);
  const [showRecurringForm, setShowRecurringForm] = useState(false);
  const [recurringForm, setRecurringForm] = useState({
    name: '',
    amount: 0,
    category: '',
    vendor: '',
    frequency: 'monthly' as const,
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    department: '',
    description: '',
    autoApprove: false,
  });

  // Ledger & reconciliation
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [reconciliations, setReconciliations] = useState<AccountReconciliation[]>([]);

  // Tags state
  const [tags, setTags] = useState<Tag[]>([]);
  const [showTagForm, setShowTagForm] = useState(false);
  const [tagForm, setTagForm] = useState({
    name: '',
    type: 'category' as const,
    value: '',
  });

  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<FinanceSummary | null>(null);

  /**
   * Real data. This screen used to seed itself with six hardcoded demo arrays
   * and every button mutated React state, so an income entry, an approval or a
   * new recurring rule was gone on refresh — there was no finance table at all.
   */
  const loadAll = async () => {
    try {
      setLoading(true);
      const [inc, exp, rec, tagRows, ledgerRows, recons, summaryRow] = await Promise.all([
        financeAPI.listIncome(),
        financeAPI.listExpenses(),
        financeAPI.listRecurring(),
        financeAPI.listTags(),
        financeAPI.ledger(),
        financeAPI.listReconciliations(),
        financeAPI.summary(selectedPeriod),
      ]);
      setSummary(summaryRow);

      setIncome(inc.map(r => ({
        id: String(r.id),
        date: r.entry_date,
        amount: n(r.amount),
        source: r.source,
        reference: r.reference || '',
        description: r.description || '',
        notes: r.notes || '',
        tags: r.tags || [],
        gstApplicable: r.gst_applicable,
        gstAmount: n(r.gst_amount),
        invoiceNo: r.invoice_no || '',
        paymentStatus: r.payment_status,
        createdAt: r.created_at,
        lastModified: r.created_at,
      })));

      setExpenses(exp.map(r => ({
        id: String(r.id),
        date: r.entry_date,
        amount: n(r.amount),
        category: r.category,
        vendor: r.vendor || '',
        description: r.description || '',
        department: r.department || '',
        tags: r.tags || [],
        approvalStatus: r.approval_status,
        approvedBy: r.approved_by_name || undefined,
        approvalDate: r.approval_date || undefined,
        gstAmount: n(r.gst_amount),
        receiptNo: r.receipt_no || undefined,
        createdAt: r.created_at,
        lastModified: r.created_at,
      })));

      setRecurringExpenses(rec.map(r => ({
        id: String(r.id),
        name: r.name,
        amount: n(r.amount),
        category: r.category,
        vendor: r.vendor || '',
        frequency: r.frequency,
        startDate: r.start_date,
        endDate: r.end_date || undefined,
        department: r.department || '',
        description: r.description || '',
        nextDueDate: r.next_due_date,
        lastProcessedDate: r.last_processed_date || undefined,
        isActive: r.is_active,
        approvalStatus: r.approval_status,
        createdAt: r.start_date,
        lastModified: r.next_due_date,
        autoApprove: r.auto_approve,
      })));

      setTags(tagRows.map(t => ({
        id: String(t.id),
        name: t.name,
        type: t.tag_type,
        value: t.value || '',
      })));

      setLedger(ledgerRows.map(l => ({
        id: l.id,
        date: l.date,
        type: l.type,
        description: l.description,
        debit: l.debit,
        credit: l.credit,
        balance: l.balance,
        category: l.category,
        reference: l.reference,
      })));

      setReconciliations(recons.map(r => ({
        id: String(r.id),
        date: r.recon_date,
        accountType: r.account_type,
        expectedBalance: n(r.expected_balance),
        actualBalance: n(r.actual_balance),
        variance: n(r.variance),
        status: r.status,
        notes: r.notes || '',
      })));
    } catch (err) {
      showToast(`❌ ${err instanceof Error ? err.message : 'Failed to load accounts'}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  // The month/quarter/year selector drives the KPI row; before this it changed
  // nothing at all.
  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPeriod]);

  /**
   * KPIs come from /summary, the same endpoint the reports and the HR/Accounts
   * dashboards read. They used to be summed in the browser over every row in
   * the table, which counted pending and rejected expenses as spend — so this
   * screen reported a different total expense figure from the P&L for the same
   * period. One definition, one number, everywhere: an expense is spend once it
   * is approved.
   */
  const totalIncome = summary?.totalIncome ?? 0;
  const totalExpenses = summary?.totalExpenses ?? 0;
  const netBalance = summary?.netProfit ?? 0;
  const incomeReceived = summary?.incomeReceived ?? 0;
  const expensesApproved = totalExpenses;
  const expensesPending = summary?.pendingExpenseValue ?? 0;
  const currentBalance = ledger.length > 0 ? ledger[ledger.length - 1].balance : 0;

  const handleAddIncome = async () => {
    if (!incomeForm.amount || !incomeForm.source) {
      showToast('❌ Please fill in amount and source', 'error');
      return;
    }
    try {
      await financeAPI.createIncome({
        entry_date: incomeForm.date,
        amount: incomeForm.amount,
        source: incomeForm.source,
        reference: incomeForm.reference,
        invoice_no: incomeForm.invoiceNo,
        description: incomeForm.description,
        notes: incomeForm.notes,
        payment_status: incomeForm.paymentStatus,
      });
      showToast('✅ Income entry recorded', 'success');
      setShowIncomeForm(false);
      setIncomeForm({
        date: new Date().toISOString().split('T')[0],
        amount: 0,
        source: '',
        reference: '',
        description: '',
        notes: '',
        invoiceNo: '',
        paymentStatus: 'pending',
      });
      await loadAll();
    } catch (err) {
      showToast(`❌ ${err instanceof Error ? err.message : 'Failed to record income'}`, 'error');
    }
  };

  const handleAddExpense = async () => {
    if (!expenseForm.amount || !expenseForm.category || !expenseForm.vendor) {
      showToast('❌ Please fill in all required fields', 'error');
      return;
    }
    try {
      await financeAPI.createExpense({
        entry_date: expenseForm.date,
        amount: expenseForm.amount,
        category: expenseForm.category,
        vendor: expenseForm.vendor,
        description: expenseForm.description,
        department: expenseForm.department,
      });
      showToast('✅ Expense recorded (pending approval)', 'success');
      setShowExpenseForm(false);
      setExpenseForm({
        date: new Date().toISOString().split('T')[0],
        amount: 0,
        category: '',
        vendor: '',
        description: '',
        department: '',
      });
      await loadAll();
    } catch (err) {
      showToast(`❌ ${err instanceof Error ? err.message : 'Failed to record expense'}`, 'error');
    }
  };

  const handleAddTag = async () => {
    if (!tagForm.name || !tagForm.value) {
      showToast('❌ Please fill in tag details', 'error');
      return;
    }
    try {
      await financeAPI.createTag({ name: tagForm.name, tag_type: tagForm.type, value: tagForm.value });
      showToast('✅ Tag created', 'success');
      setShowTagForm(false);
      setTagForm({ name: '', type: 'category', value: '' });
      await loadAll();
    } catch (err) {
      showToast(`❌ ${err instanceof Error ? err.message : 'Failed to create tag'}`, 'error');
    }
  };

  const approveExpense = async (expenseId: string) => {
    try {
      await financeAPI.approveExpense(Number(expenseId));
      showToast('✅ Expense approved', 'success');
      await loadAll();
    } catch (err) {
      showToast(`❌ ${err instanceof Error ? err.message : 'Failed to approve expense'}`, 'error');
    }
  };

  const rejectExpense = async (expenseId: string) => {
    try {
      await financeAPI.rejectExpense(Number(expenseId));
      showToast('✅ Expense rejected', 'success');
      await loadAll();
    } catch (err) {
      showToast(`❌ ${err instanceof Error ? err.message : 'Failed to reject expense'}`, 'error');
    }
  };

  const handleAddRecurring = async () => {
    if (!recurringForm.name || !recurringForm.amount || !recurringForm.category || !recurringForm.vendor) {
      showToast('❌ Please fill in all required fields', 'error');
      return;
    }
    try {
      await financeAPI.createRecurring({
        name: recurringForm.name,
        amount: recurringForm.amount,
        category: recurringForm.category,
        vendor: recurringForm.vendor,
        frequency: recurringForm.frequency,
        start_date: recurringForm.startDate,
        end_date: recurringForm.endDate || null,
        department: recurringForm.department,
        description: recurringForm.description,
        auto_approve: recurringForm.autoApprove,
      });
      showToast('✅ Recurring expense created (awaiting approval)', 'success');
      setShowRecurringForm(false);
      setRecurringForm({
        name: '',
        amount: 0,
        category: '',
        vendor: '',
        frequency: 'monthly',
        startDate: new Date().toISOString().split('T')[0],
        endDate: '',
        department: '',
        description: '',
        autoApprove: false,
      });
      await loadAll();
    } catch (err) {
      showToast(`❌ ${err instanceof Error ? err.message : 'Failed to create recurring expense'}`, 'error');
    }
  };

  const approveRecurring = async (recurringId: string) => {
    try {
      await financeAPI.approveRecurring(Number(recurringId));
      showToast('✅ Recurring expense approved', 'success');
      await loadAll();
    } catch (err) {
      showToast(`❌ ${err instanceof Error ? err.message : 'Failed to approve'}`, 'error');
    }
  };

  const pauseRecurring = async (recurringId: string) => {
    try {
      await financeAPI.setRecurringActive(Number(recurringId), false);
      showToast('⏸️ Recurring expense paused', 'success');
      await loadAll();
    } catch (err) {
      showToast(`❌ ${err instanceof Error ? err.message : 'Failed to pause'}`, 'error');
    }
  };

  const resumeRecurring = async (recurringId: string) => {
    try {
      await financeAPI.setRecurringActive(Number(recurringId), true);
      showToast('▶️ Recurring expense resumed', 'success');
      await loadAll();
    } catch (err) {
      showToast(`❌ ${err instanceof Error ? err.message : 'Failed to resume'}`, 'error');
    }
  };

  /** Materialises every approved recurring rule that has fallen due. */
  const runRecurringNow = async () => {
    try {
      const created = await financeAPI.runRecurring();
      showToast(
        created > 0
          ? `✅ ${created} recurring expense${created === 1 ? '' : 's'} posted`
          : 'Nothing due right now',
        'success'
      );
      await loadAll();
    } catch (err) {
      showToast(`❌ ${err instanceof Error ? err.message : 'Failed to run recurring expenses'}`, 'error');
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
              💰 Accounts Ledger
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
            Income, expenses, recurring commitments, ledger and reconciliation
            {loading && <span style={{ marginLeft: '8px', color: '#FF6B35' }}>· loading…</span>}
          </p>
        </div>

        {/* Period Selector */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          {(['month', 'quarter', 'year'] as const).map(period => (
            <button
              key={period}
              onClick={() => setSelectedPeriod(period)}
              style={{
                padding: '8px 16px',
                background: selectedPeriod === period ? '#FF6B35' : '#f5f5f5',
                color: selectedPeriod === period ? 'white' : '#666',
                border: 'none',
                borderRadius: '4px',
                fontWeight: '600',
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              {period === 'month' ? 'This Month' : period === 'quarter' ? 'This Quarter' : 'This Year'}
            </button>
          ))}
        </div>

        {/* KPI Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '24px' }}>
          <div style={{ padding: '16px', background: '#E8F5E9', borderRadius: '8px', border: '2px solid #4CAF50' }}>
            <div style={{ fontSize: '12px', color: '#2E7D32', marginBottom: '4px' }}>Total Income</div>
            <div style={{ fontSize: '22px', fontWeight: '700', color: '#4CAF50' }}>SGD {totalIncome.toLocaleString()}</div>
            <div style={{ fontSize: '11px', color: '#2E7D32', marginTop: '4px' }}>✓ {income.length} entries</div>
          </div>
          <div style={{ padding: '16px', background: '#FFEBEE', borderRadius: '8px', border: '2px solid #F44336' }}>
            <div style={{ fontSize: '12px', color: '#C62828', marginBottom: '4px' }}>Total Expenses</div>
            <div style={{ fontSize: '22px', fontWeight: '700', color: '#F44336' }}>SGD {totalExpenses.toLocaleString()}</div>
            <div style={{ fontSize: '11px', color: '#C62828', marginTop: '4px' }}>{expenses.filter(e => e.approvalStatus === 'approved').length} approved</div>
          </div>
          <div style={{ padding: '16px', background: '#FFF8F5', borderRadius: '8px', border: '2px solid #FF6B35' }}>
            <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Net Balance</div>
            <div style={{ fontSize: '22px', fontWeight: '700', color: netBalance >= 0 ? '#4CAF50' : '#F44336' }}>SGD {netBalance.toLocaleString()}</div>
            <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>{netBalance >= 0 ? '📈 Positive' : '📉 Negative'}</div>
          </div>
          <div style={{ padding: '16px', background: '#FFF3E4', borderRadius: '8px', border: '2px solid #F0A81E' }}>
            <div style={{ fontSize: '12px', color: '#B5651D', marginBottom: '4px' }}>Current Balance</div>
            <div style={{ fontSize: '22px', fontWeight: '700', color: '#F0A81E' }}>SGD {currentBalance.toLocaleString()}</div>
            <div style={{ fontSize: '11px', color: '#B5651D', marginTop: '4px' }}>From ledger</div>
          </div>
          <div style={{ padding: '16px', background: '#FFF3E0', borderRadius: '8px', border: '2px solid #FF9800' }}>
            <div style={{ fontSize: '12px', color: '#E65100', marginBottom: '4px' }}>Pending Approval</div>
            <div style={{ fontSize: '22px', fontWeight: '700', color: '#FF9800' }}>SGD {expensesPending.toLocaleString()}</div>
            <div style={{ fontSize: '11px', color: '#E65100', marginTop: '4px' }}>{expenses.filter(e => e.approvalStatus === 'pending').length} expenses</div>
          </div>
          <div style={{ padding: '16px', background: '#FCEDE9', borderRadius: '8px', border: '2px solid #E2736B' }}>
            <div style={{ fontSize: '12px', color: '#4A148C', marginBottom: '4px' }}>Income Received</div>
            <div style={{ fontSize: '22px', fontWeight: '700', color: '#E2736B' }}>SGD {incomeReceived.toLocaleString()}</div>
            <div style={{ fontSize: '11px', color: '#4A148C', marginTop: '4px' }}>{income.filter(i => i.paymentStatus === 'received').length} confirmed</div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', borderBottom: '2px solid #FFD9B3', overflowX: 'auto' }}>
          {(['overview', 'income', 'expenses', 'recurring', 'ledger', 'reconciliation', 'tags', 'reports'] as const).map(tab => (
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
                fontSize: '14px',
                transition: 'all 0.2s',
                whiteSpace: 'nowrap',
              }}
            >
              {tab === 'overview' && '📊 Overview'}
              {tab === 'income' && '📈 Income'}
              {tab === 'expenses' && '📉 Expenses'}
              {tab === 'recurring' && '🔄 Recurring'}
              {tab === 'ledger' && '📋 Ledger'}
              {tab === 'reconciliation' && '✓ Reconciliation'}
              {tab === 'tags' && '🏷️ Tags'}
              {tab === 'reports' && '📄 Reports'}
            </button>
          ))}
        </div>

        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600', color: '#333' }}>Financial Summary</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
              <div style={{ padding: '16px', background: '#FFF8F5', borderRadius: '8px', border: '2px solid #FFD9B3' }}>
                <div style={{ fontWeight: '600', fontSize: '14px', color: '#333', marginBottom: '12px' }}>📊 Income Summary</div>
                <div style={{ fontSize: '13px', color: '#666', display: 'grid', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Total Income:</span>
                    <strong style={{ color: '#4CAF50' }}>SGD {totalIncome.toLocaleString()}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Received:</span>
                    <strong style={{ color: '#4CAF50' }}>SGD {incomeReceived.toLocaleString()}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Pending:</span>
                    <strong style={{ color: '#FF9800' }}>SGD {(totalIncome - incomeReceived).toLocaleString()}</strong>
                  </div>
                  <div style={{ borderTop: '1px solid #FFD9B3', paddingTop: '6px', display: 'flex', justifyContent: 'space-between', fontWeight: '600' }}>
                    <span>Sources: {income.length}</span>
                    <span>{income.length > 0 ? (income.reduce((a, i) => a + i.amount, 0) / income.length).toLocaleString('en-SG', { maximumFractionDigits: 0 }) : 0} avg</span>
                  </div>
                </div>
              </div>

              <div style={{ padding: '16px', background: '#FFF8F5', borderRadius: '8px', border: '2px solid #FFD9B3' }}>
                <div style={{ fontWeight: '600', fontSize: '14px', color: '#333', marginBottom: '12px' }}>💼 Expense Summary</div>
                <div style={{ fontSize: '13px', color: '#666', display: 'grid', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Total Expenses:</span>
                    <strong style={{ color: '#F44336' }}>SGD {totalExpenses.toLocaleString()}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Approved:</span>
                    <strong style={{ color: '#4CAF50' }}>SGD {expensesApproved.toLocaleString()}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Pending Approval:</span>
                    <strong style={{ color: '#FF9800' }}>SGD {expensesPending.toLocaleString()}</strong>
                  </div>
                  <div style={{ borderTop: '1px solid #FFD9B3', paddingTop: '6px', display: 'flex', justifyContent: 'space-between', fontWeight: '600' }}>
                    <span>Items: {expenses.length}</span>
                    <span>{expenses.length > 0 ? (expenses.reduce((a, e) => a + e.amount, 0) / expenses.length).toLocaleString('en-SG', { maximumFractionDigits: 0 }) : 0} avg</span>
                  </div>
                </div>
              </div>

              <div style={{ padding: '16px', background: '#FFF8F5', borderRadius: '8px', border: '2px solid #FFD9B3' }}>
                <div style={{ fontWeight: '600', fontSize: '14px', color: '#333', marginBottom: '12px' }}>💹 Profitability</div>
                <div style={{ fontSize: '13px', color: '#666', display: 'grid', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Net Profit:</span>
                    <strong style={{ color: netBalance >= 0 ? '#4CAF50' : '#F44336' }}>SGD {netBalance.toLocaleString()}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Profit Margin:</span>
                    <strong style={{ color: '#666' }}>{totalIncome > 0 ? ((netBalance / totalIncome) * 100).toFixed(1) : 0}%</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Expense Ratio:</span>
                    <strong style={{ color: '#666' }}>{totalIncome > 0 ? ((totalExpenses / totalIncome) * 100).toFixed(1) : 0}%</strong>
                  </div>
                  <div style={{ borderTop: '1px solid #FFD9B3', paddingTop: '6px', display: 'flex', justifyContent: 'space-between', fontWeight: '600' }}>
                    <span>Current Balance:</span>
                    <span style={{ color: currentBalance >= 0 ? '#4CAF50' : '#F44336' }}>SGD {currentBalance.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Compliance Banner */}
            <div style={{ marginTop: '24px', padding: '12px 16px', background: '#FFF3E4', border: '2px solid #B5651D', borderRadius: '6px', fontSize: '12px', color: '#B5651D' }}>
              <strong>📒 What this is:</strong> a transaction record with an audit trail — who entered what, who approved it, and when. GST is captured per entry but this does <strong>not</strong> produce a tax invoice or a GST F5 return, and invoice numbers are typed rather than issued in sequence. IRAS requires business records to be kept for 5 years.
            </div>
          </div>
        )}

        {/* INCOME TAB */}
        {activeTab === 'income' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#333' }}>Income Entries</h3>
              <button
                onClick={() => setShowIncomeForm(!showIncomeForm)}
                style={{
                  padding: '8px 16px',
                  background: '#4CAF50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  fontSize: '12px',
                }}
              >
                {showIncomeForm ? '✕ Cancel' : '+ Add Income'}
              </button>
            </div>

            {showIncomeForm && (
              <div style={{ padding: '16px', background: '#F5F5F5', borderRadius: '8px', marginBottom: '16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '12px' }}>
                <input type="date" value={incomeForm.date} onChange={e => setIncomeForm({ ...incomeForm, date: e.target.value })} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }} />
                <input type="number" placeholder="Amount (SGD)" value={incomeForm.amount} onChange={e => setIncomeForm({ ...incomeForm, amount: parseFloat(e.target.value) || 0 })} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }} />
                <input type="text" placeholder="Source (e.g. Service Revenue)" value={incomeForm.source} onChange={e => setIncomeForm({ ...incomeForm, source: e.target.value })} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }} />
                <input type="text" placeholder="Reference / Invoice No" value={incomeForm.invoiceNo} onChange={e => setIncomeForm({ ...incomeForm, invoiceNo: e.target.value })} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }} />
                <input type="text" placeholder="Description" value={incomeForm.description} onChange={e => setIncomeForm({ ...incomeForm, description: e.target.value })} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }} />
                <select value={incomeForm.paymentStatus} onChange={e => setIncomeForm({ ...incomeForm, paymentStatus: e.target.value as any })} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}>
                  <option value="pending">Payment Status: Pending</option>
                  <option value="received">Payment Status: Received</option>
                  <option value="overdue">Payment Status: Overdue</option>
                </select>
                <button
                  onClick={handleAddIncome}
                  style={{
                    gridColumn: '1 / -1',
                    padding: '10px',
                    background: '#4CAF50',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    fontWeight: '600',
                    cursor: 'pointer',
                  }}
                >
                  ✓ Record Income
                </button>
              </div>
            )}

            <div style={{ display: 'grid', gap: '12px' }}>
              {income.map(inc => (
                <div key={inc.id} style={{ padding: '12px 16px', background: 'white', border: '2px solid #FFD9B3', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                    <div>
                      <div style={{ fontWeight: '600', fontSize: '14px', color: '#333', marginBottom: '2px' }}>{inc.source}</div>
                      <div style={{ fontSize: '12px', color: '#666' }}>{inc.description}</div>
                    </div>
                    <div style={{
                      display: 'inline-block',
                      padding: '4px 8px',
                      background: inc.paymentStatus === 'received' ? '#E8F5E9' : inc.paymentStatus === 'pending' ? '#FFF3E0' : '#FFEBEE',
                      color: inc.paymentStatus === 'received' ? '#2E7D32' : inc.paymentStatus === 'pending' ? '#E65100' : '#C62828',
                      borderRadius: '3px',
                      fontSize: '11px',
                      fontWeight: '600',
                    }}>
                      {inc.paymentStatus === 'received' ? '✓ Received' : inc.paymentStatus === 'pending' ? '⏳ Pending' : '⚠️ Overdue'}
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px', fontSize: '12px', color: '#666' }}>
                    <div>Date: <strong>{inc.date}</strong></div>
                    <div>Amount: <strong style={{ color: '#4CAF50', fontSize: '13px' }}>SGD {inc.amount.toLocaleString()}</strong></div>
                    <div>Invoice: <strong>{inc.invoiceNo || inc.reference}</strong></div>
                    <div>Recorded: <strong>{inc.createdAt}</strong></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* EXPENSES TAB */}
        {activeTab === 'expenses' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#333' }}>Expense Entries</h3>
              <button
                onClick={() => setShowExpenseForm(!showExpenseForm)}
                style={{
                  padding: '8px 16px',
                  background: '#F0A81E',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  fontSize: '12px',
                }}
              >
                {showExpenseForm ? '✕ Cancel' : '+ Add Expense'}
              </button>
            </div>

            {showExpenseForm && (
              <div style={{ padding: '16px', background: '#F5F5F5', borderRadius: '8px', marginBottom: '16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '12px' }}>
                <input type="date" value={expenseForm.date} onChange={e => setExpenseForm({ ...expenseForm, date: e.target.value })} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }} />
                <input type="number" placeholder="Amount (SGD)" value={expenseForm.amount} onChange={e => setExpenseForm({ ...expenseForm, amount: parseFloat(e.target.value) || 0 })} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }} />
                <select value={expenseForm.category} onChange={e => setExpenseForm({ ...expenseForm, category: e.target.value })} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}>
                  <option value="">Select Category</option>
                  <option value="Office & Administration">Office & Administration</option>
                  <option value="Travel & Transport">Travel & Transport</option>
                  <option value="Utilities">Utilities</option>
                  <option value="Marketing">Marketing</option>
                  <option value="Professional Services">Professional Services</option>
                  <option value="Other">Other</option>
                </select>
                <input type="text" placeholder="Vendor Name" value={expenseForm.vendor} onChange={e => setExpenseForm({ ...expenseForm, vendor: e.target.value })} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }} />
                <input type="text" placeholder="Department" value={expenseForm.department} onChange={e => setExpenseForm({ ...expenseForm, department: e.target.value })} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }} />
                <input type="text" placeholder="Description" value={expenseForm.description} onChange={e => setExpenseForm({ ...expenseForm, description: e.target.value })} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }} />
                <button
                  onClick={handleAddExpense}
                  style={{
                    gridColumn: '1 / -1',
                    padding: '10px',
                    background: '#F0A81E',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    fontWeight: '600',
                    cursor: 'pointer',
                  }}
                >
                  ✓ Record Expense (Pending Approval)
                </button>
              </div>
            )}

            <div style={{ display: 'grid', gap: '12px' }}>
              {expenses.map(exp => (
                <div key={exp.id} style={{ padding: '12px 16px', background: 'white', border: '2px solid #FFD9B3', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                    <div>
                      <div style={{ fontWeight: '600', fontSize: '14px', color: '#333', marginBottom: '2px' }}>{exp.category}</div>
                      <div style={{ fontSize: '12px', color: '#666' }}>{exp.vendor} - {exp.description}</div>
                    </div>
                    <div style={{
                      display: 'inline-block',
                      padding: '4px 8px',
                      background: exp.approvalStatus === 'approved' ? '#E8F5E9' : exp.approvalStatus === 'pending' ? '#FFF3E0' : '#FFEBEE',
                      color: exp.approvalStatus === 'approved' ? '#2E7D32' : exp.approvalStatus === 'pending' ? '#E65100' : '#C62828',
                      borderRadius: '3px',
                      fontSize: '11px',
                      fontWeight: '600',
                    }}>
                      {exp.approvalStatus === 'approved' ? '✓ Approved' : exp.approvalStatus === 'pending' ? '⏳ Pending' : '✕ Rejected'}
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px', fontSize: '12px', color: '#666', marginBottom: '8px' }}>
                    <div>Date: <strong>{exp.date}</strong></div>
                    <div>Amount: <strong style={{ color: '#F44336', fontSize: '13px' }}>SGD {exp.amount.toLocaleString()}</strong></div>
                    <div>Department: <strong>{exp.department}</strong></div>
                    {exp.approvalDate && <div>Approved: <strong>{exp.approvalDate}</strong> by {exp.approvedBy}</div>}
                  </div>
                  {exp.approvalStatus === 'pending' && (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => approveExpense(exp.id)}
                        style={{
                          flex: 1,
                          padding: '6px 12px',
                          background: '#4CAF50',
                          color: 'white',
                          border: 'none',
                          borderRadius: '3px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          fontSize: '11px',
                        }}
                      >
                        ✓ Approve
                      </button>
                      <button
                        onClick={() => rejectExpense(exp.id)}
                        style={{
                          flex: 1,
                          padding: '6px 12px',
                          background: '#F44336',
                          color: 'white',
                          border: 'none',
                          borderRadius: '3px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          fontSize: '11px',
                        }}
                      >
                        ✕ Reject
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* RECURRING EXPENSES TAB */}
        {activeTab === 'recurring' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#333' }}>Recurring Expenses</h3>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={runRecurringNow}
                  title="Post every approved rule that has fallen due as a real expense"
                  style={{
                    padding: '8px 16px',
                    background: '#fff',
                    color: '#E2736B',
                    border: '1px solid #E2736B',
                    borderRadius: '4px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    fontSize: '12px',
                  }}
                >
                  ⚡ Process Due
                </button>
                <button
                  onClick={() => setShowRecurringForm(!showRecurringForm)}
                  style={{
                    padding: '8px 16px',
                    background: '#E2736B',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    fontSize: '12px',
                  }}
                >
                  {showRecurringForm ? '✕ Cancel' : '+ New Recurring'}
                </button>
              </div>
            </div>

            {/* KPI Cards for Recurring */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '16px' }}>
              <div style={{ padding: '12px 16px', background: '#FCEDE9', borderRadius: '6px', border: '1px solid #E2736B' }}>
                <div style={{ fontSize: '11px', color: '#4A148C', marginBottom: '2px' }}>Total Recurring</div>
                <div style={{ fontSize: '18px', fontWeight: '700', color: '#E2736B' }}>{recurringExpenses.length}</div>
                <div style={{ fontSize: '10px', color: '#4A148C' }}>expenses</div>
              </div>
              <div style={{ padding: '12px 16px', background: '#E8F5E9', borderRadius: '6px', border: '1px solid #4CAF50' }}>
                <div style={{ fontSize: '11px', color: '#2E7D32', marginBottom: '2px' }}>Active</div>
                <div style={{ fontSize: '18px', fontWeight: '700', color: '#4CAF50' }}>{recurringExpenses.filter(r => r.isActive).length}</div>
                <div style={{ fontSize: '10px', color: '#2E7D32' }}>running</div>
              </div>
              <div style={{ padding: '12px 16px', background: '#FFF3E0', borderRadius: '6px', border: '1px solid #FF9800' }}>
                <div style={{ fontSize: '11px', color: '#E65100', marginBottom: '2px' }}>Pending Approval</div>
                <div style={{ fontSize: '18px', fontWeight: '700', color: '#FF9800' }}>{recurringExpenses.filter(r => r.approvalStatus === 'pending').length}</div>
                <div style={{ fontSize: '10px', color: '#E65100' }}>awaiting</div>
              </div>
              <div style={{ padding: '12px 16px', background: '#FCE4EC', borderRadius: '6px', border: '1px solid #E91E63' }}>
                <div style={{ fontSize: '11px', color: '#880E4F', marginBottom: '2px' }}>Monthly Impact</div>
                <div style={{ fontSize: '18px', fontWeight: '700', color: '#E91E63' }}>SGD {recurringExpenses.filter(r => r.frequency === 'monthly' && r.isActive).reduce((s, r) => s + r.amount, 0).toLocaleString()}</div>
                <div style={{ fontSize: '10px', color: '#880E4F' }}>monthly</div>
              </div>
            </div>

            {showRecurringForm && (
              <div style={{ padding: '16px', background: '#F5F5F5', borderRadius: '8px', marginBottom: '16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '12px' }}>
                <input
                  type="text"
                  placeholder="Expense Name (e.g., Office Rent)"
                  value={recurringForm.name}
                  onChange={e => setRecurringForm({ ...recurringForm, name: e.target.value })}
                  style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd', gridColumn: '1 / -1' }}
                />
                <input
                  type="number"
                  placeholder="Amount (SGD)"
                  value={recurringForm.amount}
                  onChange={e => setRecurringForm({ ...recurringForm, amount: parseFloat(e.target.value) || 0 })}
                  style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                />
                <select
                  value={recurringForm.category}
                  onChange={e => setRecurringForm({ ...recurringForm, category: e.target.value })}
                  style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                >
                  <option value="">Select Category</option>
                  <option value="Office & Administration">Office & Administration</option>
                  <option value="Utilities">Utilities</option>
                  <option value="Marketing">Marketing</option>
                  <option value="Insurance">Insurance</option>
                  <option value="Travel & Transport">Travel & Transport</option>
                  <option value="Professional Services">Professional Services</option>
                </select>
                <input
                  type="text"
                  placeholder="Vendor Name"
                  value={recurringForm.vendor}
                  onChange={e => setRecurringForm({ ...recurringForm, vendor: e.target.value })}
                  style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                />
                <select
                  value={recurringForm.frequency}
                  onChange={e => setRecurringForm({ ...recurringForm, frequency: e.target.value as any })}
                  style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="biweekly">Bi-weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="annual">Annual</option>
                </select>
                <input
                  type="date"
                  value={recurringForm.startDate}
                  onChange={e => setRecurringForm({ ...recurringForm, startDate: e.target.value })}
                  style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                />
                <input
                  type="date"
                  placeholder="End Date (optional)"
                  value={recurringForm.endDate}
                  onChange={e => setRecurringForm({ ...recurringForm, endDate: e.target.value })}
                  style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                />
                <input
                  type="text"
                  placeholder="Department"
                  value={recurringForm.department}
                  onChange={e => setRecurringForm({ ...recurringForm, department: e.target.value })}
                  style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                />
                <input
                  type="text"
                  placeholder="Description"
                  value={recurringForm.description}
                  onChange={e => setRecurringForm({ ...recurringForm, description: e.target.value })}
                  style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd', gridColumn: '1 / -1' }}
                />
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', gridColumn: '1 / -1' }}>
                  <input
                    type="checkbox"
                    checked={recurringForm.autoApprove}
                    onChange={e => setRecurringForm({ ...recurringForm, autoApprove: e.target.checked })}
                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                  />
                  <span>Auto-approve on processing</span>
                </label>
                <button
                  onClick={handleAddRecurring}
                  style={{
                    gridColumn: '1 / -1',
                    padding: '10px',
                    background: '#E2736B',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    fontWeight: '600',
                    cursor: 'pointer',
                  }}
                >
                  ✓ Create Recurring Expense
                </button>
              </div>
            )}

            <div style={{ display: 'grid', gap: '12px' }}>
              {recurringExpenses.map(rec => (
                <div key={rec.id} style={{ padding: '12px 16px', background: 'white', border: '2px solid #FFD9B3', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                    <div>
                      <div style={{ fontWeight: '600', fontSize: '14px', color: '#333', marginBottom: '2px' }}>{rec.name}</div>
                      <div style={{ fontSize: '12px', color: '#666' }}>{rec.vendor} • {rec.description}</div>
                    </div>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <div style={{
                        display: 'inline-block',
                        padding: '4px 8px',
                        background: rec.isActive ? '#E8F5E9' : '#F5F5F5',
                        color: rec.isActive ? '#2E7D32' : '#999',
                        borderRadius: '3px',
                        fontSize: '11px',
                        fontWeight: '600',
                      }}>
                        {rec.isActive ? '▶️ Active' : '⏸️ Paused'}
                      </div>
                      <div style={{
                        display: 'inline-block',
                        padding: '4px 8px',
                        background: rec.approvalStatus === 'approved' ? '#E8F5E9' : '#FFF3E0',
                        color: rec.approvalStatus === 'approved' ? '#2E7D32' : '#E65100',
                        borderRadius: '3px',
                        fontSize: '11px',
                        fontWeight: '600',
                      }}>
                        {rec.approvalStatus === 'approved' ? '✓ Approved' : '⏳ Pending'}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px', fontSize: '12px', color: '#666', marginBottom: '8px' }}>
                    <div>Amount: <strong style={{ color: '#E91E63' }}>SGD {rec.amount.toLocaleString()}</strong></div>
                    <div>Frequency: <strong>{rec.frequency.toUpperCase()}</strong></div>
                    <div>Category: <strong>{rec.category}</strong></div>
                    <div>Next Due: <strong>{rec.nextDueDate}</strong></div>
                    {rec.lastProcessedDate && <div>Last Processed: <strong>{rec.lastProcessedDate}</strong></div>}
                    <div>Department: <strong>{rec.department}</strong></div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {rec.approvalStatus === 'pending' && (
                      <button
                        onClick={() => approveRecurring(rec.id)}
                        style={{
                          flex: 1,
                          minWidth: '120px',
                          padding: '6px 12px',
                          background: '#4CAF50',
                          color: 'white',
                          border: 'none',
                          borderRadius: '3px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          fontSize: '11px',
                        }}
                      >
                        ✓ Approve
                      </button>
                    )}
                    {rec.isActive ? (
                      <button
                        onClick={() => pauseRecurring(rec.id)}
                        style={{
                          flex: 1,
                          minWidth: '120px',
                          padding: '6px 12px',
                          background: '#FF9800',
                          color: 'white',
                          border: 'none',
                          borderRadius: '3px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          fontSize: '11px',
                        }}
                      >
                        ⏸️ Pause
                      </button>
                    ) : (
                      <button
                        onClick={() => resumeRecurring(rec.id)}
                        style={{
                          flex: 1,
                          minWidth: '120px',
                          padding: '6px 12px',
                          background: '#F0A81E',
                          color: 'white',
                          border: 'none',
                          borderRadius: '3px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          fontSize: '11px',
                        }}
                      >
                        ▶️ Resume
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: '16px', padding: '12px', background: '#FCEDE9', borderRadius: '4px', fontSize: '11px', color: '#4A148C' }}>
              <strong>💡 Recurring Expenses:</strong> Automatically process on schedule. Pending approvals must be approved first. Paused expenses won't be processed until resumed.
            </div>
          </div>
        )}

        {/* LEDGER TAB */}
        {activeTab === 'ledger' && (
          <div>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600', color: '#333' }}>General Ledger</h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ background: '#FFD9B3', borderBottom: '2px solid #FF6B35' }}>
                    <th style={{ padding: '10px', textAlign: 'left', fontWeight: '600', color: '#333' }}>Date</th>
                    <th style={{ padding: '10px', textAlign: 'left', fontWeight: '600', color: '#333' }}>Description</th>
                    <th style={{ padding: '10px', textAlign: 'right', fontWeight: '600', color: '#333' }}>Debit (SGD)</th>
                    <th style={{ padding: '10px', textAlign: 'right', fontWeight: '600', color: '#333' }}>Credit (SGD)</th>
                    <th style={{ padding: '10px', textAlign: 'right', fontWeight: '600', color: '#333' }}>Balance (SGD)</th>
                    <th style={{ padding: '10px', textAlign: 'left', fontWeight: '600', color: '#333' }}>Reference</th>
                  </tr>
                </thead>
                <tbody>
                  {ledger.map((entry, idx) => (
                    <tr key={entry.id} style={{ borderBottom: '1px solid #FFD9B3', background: idx % 2 === 0 ? 'white' : '#FFF8F5' }}>
                      <td style={{ padding: '10px' }}>{entry.date}</td>
                      <td style={{ padding: '10px' }}>{entry.description}</td>
                      <td style={{ padding: '10px', textAlign: 'right', color: '#F44336', fontWeight: '600' }}>{entry.debit > 0 ? entry.debit.toLocaleString() : '—'}</td>
                      <td style={{ padding: '10px', textAlign: 'right', color: '#4CAF50', fontWeight: '600' }}>{entry.credit > 0 ? entry.credit.toLocaleString() : '—'}</td>
                      <td style={{ padding: '10px', textAlign: 'right', fontWeight: '700', color: entry.balance >= 0 ? '#4CAF50' : '#F44336' }}>{entry.balance.toLocaleString()}</td>
                      <td style={{ padding: '10px' }}>{entry.reference}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* RECONCILIATION TAB */}
        {activeTab === 'reconciliation' && (
          <div>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600', color: '#333' }}>Account Reconciliation</h3>
            <div style={{ display: 'grid', gap: '12px' }}>
              {reconciliations.map(rec => {
                const isReconciled = rec.status === 'reconciled';
                return (
                  <div key={rec.id} style={{ padding: '12px 16px', background: isReconciled ? '#E8F5E9' : rec.status === 'variance' ? '#FFF3E0' : '#FFF3E4', border: `2px solid ${isReconciled ? '#4CAF50' : rec.status === 'variance' ? '#FF9800' : '#F0A81E'}`, borderRadius: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                      <div>
                        <div style={{ fontWeight: '600', fontSize: '14px', color: '#333', marginBottom: '2px' }}>{rec.accountType}</div>
                        <div style={{ fontSize: '12px', color: '#666' }}>Reconciliation Date: {rec.date}</div>
                      </div>
                      <div style={{
                        display: 'inline-block',
                        padding: '4px 8px',
                        background: isReconciled ? '#E8F5E9' : '#FFF3E0',
                        color: isReconciled ? '#2E7D32' : '#E65100',
                        borderRadius: '3px',
                        fontSize: '11px',
                        fontWeight: '600',
                      }}>
                        {isReconciled ? '✓ Reconciled' : '⚠️ Variance'}
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px', fontSize: '12px', color: '#666' }}>
                      <div>Expected Balance: <strong>SGD {rec.expectedBalance.toLocaleString()}</strong></div>
                      <div>Actual Balance: <strong>SGD {rec.actualBalance.toLocaleString()}</strong></div>
                      <div>Variance: <strong style={{ color: rec.variance === 0 ? '#4CAF50' : '#FF9800' }}>SGD {rec.variance.toLocaleString()}</strong></div>
                      <div style={{ gridColumn: '1 / -1' }}>Notes: <strong>{rec.notes}</strong></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAGS TAB */}
        {activeTab === 'tags' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#333' }}>Transaction Tags</h3>
              <button
                onClick={() => setShowTagForm(!showTagForm)}
                style={{
                  padding: '8px 16px',
                  background: '#E2736B',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  fontSize: '12px',
                }}
              >
                {showTagForm ? '✕ Cancel' : '+ New Tag'}
              </button>
            </div>

            {showTagForm && (
              <div style={{ padding: '16px', background: '#F5F5F5', borderRadius: '8px', marginBottom: '16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '12px' }}>
                <input type="text" placeholder="Tag Name" value={tagForm.name} onChange={e => setTagForm({ ...tagForm, name: e.target.value })} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }} />
                <select value={tagForm.type} onChange={e => setTagForm({ ...tagForm, type: e.target.value as any })} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}>
                  <option value="category">Category</option>
                  <option value="location">Location</option>
                  <option value="purpose">Purpose</option>
                  <option value="staff">Staff</option>
                </select>
                <input type="text" placeholder="Tag Value" value={tagForm.value} onChange={e => setTagForm({ ...tagForm, value: e.target.value })} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }} />
                <button
                  onClick={handleAddTag}
                  style={{
                    gridColumn: '1 / -1',
                    padding: '10px',
                    background: '#E2736B',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    fontWeight: '600',
                    cursor: 'pointer',
                  }}
                >
                  ✓ Create Tag
                </button>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
              {tags.map(tag => (
                <div key={tag.id} style={{ padding: '12px 16px', background: 'white', border: '2px solid #FFD9B3', borderRadius: '6px' }}>
                  <div style={{ fontWeight: '600', fontSize: '13px', color: '#333', marginBottom: '4px' }}>{tag.name}</div>
                  <div style={{ fontSize: '11px', color: '#666', display: 'grid', gap: '2px' }}>
                    <div>Type: <strong>{tag.type}</strong></div>
                    <div>Value: <strong>{tag.value}</strong></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* REPORTS TAB */}
        {activeTab === 'reports' && (
          <div>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600', color: '#333' }}>Financial Reports</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '12px' }}>
              <button style={{ padding: '16px', background: '#FFF8F5', border: '2px solid #FFD9B3', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s', textAlign: 'center' }}>
                <div style={{ fontSize: '20px', marginBottom: '6px' }}>📊</div>
                <div style={{ fontWeight: '600', fontSize: '13px', color: '#333', marginBottom: '2px' }}>Profit & Loss</div>
                <div style={{ fontSize: '11px', color: '#666' }}>Income vs Expenses</div>
              </button>
              <button style={{ padding: '16px', background: '#FFF8F5', border: '2px solid #FFD9B3', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s', textAlign: 'center' }}>
                <div style={{ fontSize: '20px', marginBottom: '6px' }}>⚖️</div>
                <div style={{ fontWeight: '600', fontSize: '13px', color: '#333', marginBottom: '2px' }}>Balance Sheet</div>
                <div style={{ fontSize: '11px', color: '#666' }}>Assets & Liabilities</div>
              </button>
              <button style={{ padding: '16px', background: '#FFF8F5', border: '2px solid #FFD9B3', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s', textAlign: 'center' }}>
                <div style={{ fontSize: '20px', marginBottom: '6px' }}>💰</div>
                <div style={{ fontWeight: '600', fontSize: '13px', color: '#333', marginBottom: '2px' }}>Cash Flow</div>
                <div style={{ fontSize: '11px', color: '#666' }}>Inflows & Outflows</div>
              </button>
              <button style={{ padding: '16px', background: '#FFF8F5', border: '2px solid #FFD9B3', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s', textAlign: 'center' }}>
                <div style={{ fontSize: '20px', marginBottom: '6px' }}>📈</div>
                <div style={{ fontWeight: '600', fontSize: '13px', color: '#333', marginBottom: '2px' }}>Variance Analysis</div>
                <div style={{ fontSize: '11px', color: '#666' }}>Budget vs Actual</div>
              </button>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AccountsDashboard;
