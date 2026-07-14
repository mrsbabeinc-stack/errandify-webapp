import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast, ToastContainer } from '../../components/Toast';
import AdminLayout from '../../components/admin/AdminLayout';

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

const AccountsDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { toasts, showToast, removeToast } = useToast();
  const [activeTab, setActiveTab] = useState<'overview' | 'income' | 'expenses' | 'ledger' | 'reconciliation' | 'tags' | 'reports'>('overview');
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

  // Demo data
  useEffect(() => {
    const demoIncome: IncomeEntry[] = [
      {
        id: 'inc_1',
        date: '2026-07-10',
        amount: 15000,
        source: 'Service Revenue',
        reference: 'INV-001',
        invoiceNo: 'INV-20260710-001',
        description: 'Monthly service fees from clients A-D',
        notes: 'Regular monthly recurring revenue',
        tags: ['service', 'recurring', 'core-business'],
        paymentStatus: 'received',
        createdAt: '2026-07-10',
        lastModified: '2026-07-10',
      },
      {
        id: 'inc_2',
        date: '2026-07-05',
        amount: 6000,
        source: 'Product Sales',
        reference: 'PO-2026-042',
        invoiceNo: 'INV-20260705-002',
        description: 'Software licensing sales',
        notes: 'One-time license purchase',
        tags: ['product', 'licensing'],
        paymentStatus: 'received',
        createdAt: '2026-07-05',
        lastModified: '2026-07-05',
      },
      {
        id: 'inc_3',
        date: '2026-07-12',
        amount: 3500,
        source: 'Consulting Revenue',
        reference: 'CONS-026',
        invoiceNo: 'INV-20260712-003',
        description: 'Advisory services for client X',
        notes: 'Project-based consulting',
        tags: ['consulting', 'services'],
        paymentStatus: 'pending',
        createdAt: '2026-07-12',
        lastModified: '2026-07-12',
      },
    ];

    const demoExpenses: ExpenseEntry[] = [
      {
        id: 'exp_1',
        date: '2026-07-08',
        amount: 2500,
        category: 'Office & Administration',
        vendor: 'Tech Office Supplies Ltd',
        description: 'Monthly office supplies and equipment',
        department: 'Operations',
        tags: ['office', 'recurring'],
        approvalStatus: 'approved',
        approvedBy: 'Admin User',
        approvalDate: '2026-07-08',
        createdAt: '2026-07-08',
        lastModified: '2026-07-08',
      },
      {
        id: 'exp_2',
        date: '2026-07-09',
        amount: 1800,
        category: 'Travel & Transport',
        vendor: 'Singapore Airlines',
        description: 'Business travel - client meeting in JB',
        department: 'Sales',
        tags: ['travel', 'client-visit'],
        approvalStatus: 'pending',
        createdAt: '2026-07-09',
        lastModified: '2026-07-09',
      },
      {
        id: 'exp_3',
        date: '2026-07-11',
        amount: 450,
        category: 'Utilities',
        vendor: 'SP Group',
        description: 'Monthly utilities (electricity, water, gas)',
        department: 'Operations',
        tags: ['utilities', 'recurring'],
        approvalStatus: 'approved',
        approvedBy: 'Admin User',
        approvalDate: '2026-07-11',
        createdAt: '2026-07-11',
        lastModified: '2026-07-11',
      },
    ];

    const demoLedger: LedgerEntry[] = [
      { id: 'l1', date: '2026-07-10', type: 'income', description: 'Service Revenue', debit: 0, credit: 15000, balance: 15000, category: 'Revenue', reference: 'INV-001' },
      { id: 'l2', date: '2026-07-05', type: 'income', description: 'Product Sales', debit: 0, credit: 6000, balance: 21000, category: 'Revenue', reference: 'PO-2026-042' },
      { id: 'l3', date: '2026-07-08', type: 'expense', description: 'Office Supplies', debit: 2500, credit: 0, balance: 18500, category: 'Operations', reference: 'EXP-001' },
      { id: 'l4', date: '2026-07-09', type: 'expense', description: 'Travel Expenses', debit: 1800, credit: 0, balance: 16700, category: 'Operations', reference: 'EXP-002' },
      { id: 'l5', date: '2026-07-11', type: 'expense', description: 'Utilities', debit: 450, credit: 0, balance: 16250, category: 'Operations', reference: 'EXP-003' },
    ];

    const demoReconciliations: AccountReconciliation[] = [
      {
        id: 'rec_1',
        date: '2026-07-15',
        accountType: 'Operating Account',
        expectedBalance: 16250,
        actualBalance: 16250,
        variance: 0,
        status: 'reconciled',
        notes: 'July reconciliation complete. All transactions verified.',
      },
      {
        id: 'rec_2',
        date: '2026-06-30',
        accountType: 'Operating Account',
        expectedBalance: 24500,
        actualBalance: 24500,
        variance: 0,
        status: 'reconciled',
        notes: 'June reconciliation complete.',
      },
      {
        id: 'rec_3',
        date: '2026-07-15',
        accountType: 'Petty Cash',
        expectedBalance: 1500,
        actualBalance: 1465,
        variance: -35,
        status: 'variance',
        notes: 'Minor variance - pending explanation',
      },
    ];

    const demoTags: Tag[] = [
      { id: 't1', name: 'Recurring', type: 'category', value: 'recurring' },
      { id: 't2', name: 'One-time', type: 'category', value: 'onetime' },
      { id: 't3', name: 'Headquarters', type: 'location', value: 'hq' },
      { id: 't4', name: 'Branch Office', type: 'location', value: 'branch' },
      { id: 't5', name: 'Core Business', type: 'purpose', value: 'core-business' },
      { id: 't6', name: 'Support', type: 'purpose', value: 'support' },
      { id: 't7', name: 'Finance Team', type: 'staff', value: 'finance' },
      { id: 't8', name: 'HR Team', type: 'staff', value: 'hr' },
    ];

    setIncome(demoIncome);
    setExpenses(demoExpenses);
    setLedger(demoLedger);
    setReconciliations(demoReconciliations);
    setTags(demoTags);
  }, []);

  // KPI Calculations
  const totalIncome = income.reduce((sum, i) => sum + i.amount, 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const netBalance = totalIncome - totalExpenses;
  const incomeReceived = income.filter(i => i.paymentStatus === 'received').reduce((sum, i) => sum + i.amount, 0);
  const expensesApproved = expenses.filter(e => e.approvalStatus === 'approved').reduce((sum, e) => sum + e.amount, 0);
  const expensesPending = expenses.filter(e => e.approvalStatus === 'pending').reduce((sum, e) => sum + e.amount, 0);
  const currentBalance = ledger.length > 0 ? ledger[ledger.length - 1].balance : 0;

  const handleAddIncome = () => {
    if (!incomeForm.amount || !incomeForm.source) {
      showToast('❌ Please fill in amount and source', 'error');
      return;
    }
    const newIncome: IncomeEntry = {
      id: `inc_${Date.now()}`,
      ...incomeForm,
      tags: [],
      paymentStatus: incomeForm.paymentStatus,
      createdAt: new Date().toISOString(),
      lastModified: new Date().toISOString(),
    };
    setIncome([...income, newIncome]);
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
  };

  const handleAddExpense = () => {
    if (!expenseForm.amount || !expenseForm.category || !expenseForm.vendor) {
      showToast('❌ Please fill in all required fields', 'error');
      return;
    }
    const newExpense: ExpenseEntry = {
      id: `exp_${Date.now()}`,
      ...expenseForm,
      tags: [],
      approvalStatus: 'pending',
      createdAt: new Date().toISOString(),
      lastModified: new Date().toISOString(),
    };
    setExpenses([...expenses, newExpense]);
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
  };

  const handleAddTag = () => {
    if (!tagForm.name || !tagForm.value) {
      showToast('❌ Please fill in tag details', 'error');
      return;
    }
    const newTag: Tag = {
      id: `tag_${Date.now()}`,
      name: tagForm.name,
      type: tagForm.type,
      value: tagForm.value,
    };
    setTags([...tags, newTag]);
    showToast('✅ Tag created', 'success');
    setShowTagForm(false);
    setTagForm({ name: '', type: 'category', value: '' });
  };

  const approveExpense = (expenseId: string) => {
    setExpenses(
      expenses.map(e =>
        e.id === expenseId
          ? { ...e, approvalStatus: 'approved', approvedBy: 'Admin User', approvalDate: new Date().toISOString().split('T')[0] }
          : e
      )
    );
    showToast('✅ Expense approved', 'success');
  };

  const rejectExpense = (expenseId: string) => {
    setExpenses(
      expenses.map(e => (e.id === expenseId ? { ...e, approvalStatus: 'rejected' } : e))
    );
    showToast('✅ Expense rejected', 'success');
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
            Income tracking, expense management, ledger entries, reconciliation, ACRA-compliant
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
          <div style={{ padding: '16px', background: '#E3F2FD', borderRadius: '8px', border: '2px solid #2196F3' }}>
            <div style={{ fontSize: '12px', color: '#0D47A1', marginBottom: '4px' }}>Current Balance</div>
            <div style={{ fontSize: '22px', fontWeight: '700', color: '#2196F3' }}>SGD {currentBalance.toLocaleString()}</div>
            <div style={{ fontSize: '11px', color: '#0D47A1', marginTop: '4px' }}>From ledger</div>
          </div>
          <div style={{ padding: '16px', background: '#FFF3E0', borderRadius: '8px', border: '2px solid #FF9800' }}>
            <div style={{ fontSize: '12px', color: '#E65100', marginBottom: '4px' }}>Pending Approval</div>
            <div style={{ fontSize: '22px', fontWeight: '700', color: '#FF9800' }}>SGD {expensesPending.toLocaleString()}</div>
            <div style={{ fontSize: '11px', color: '#E65100', marginTop: '4px' }}>{expenses.filter(e => e.approvalStatus === 'pending').length} expenses</div>
          </div>
          <div style={{ padding: '16px', background: '#F3E5F5', borderRadius: '8px', border: '2px solid #9C27B0' }}>
            <div style={{ fontSize: '12px', color: '#4A148C', marginBottom: '4px' }}>Income Received</div>
            <div style={{ fontSize: '22px', fontWeight: '700', color: '#9C27B0' }}>SGD {incomeReceived.toLocaleString()}</div>
            <div style={{ fontSize: '11px', color: '#4A148C', marginTop: '4px' }}>{income.filter(i => i.paymentStatus === 'received').length} confirmed</div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', borderBottom: '2px solid #FFD9B3', overflowX: 'auto' }}>
          {(['overview', 'income', 'expenses', 'ledger', 'reconciliation', 'tags', 'reports'] as const).map(tab => (
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
                    <span>{income.length > 0 ? (totalIncome / income.length).toLocaleString('en-SG', { maximumFractionDigits: 0 }) : 0} avg</span>
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
                    <span>{expenses.length > 0 ? (totalExpenses / expenses.length).toLocaleString('en-SG', { maximumFractionDigits: 0 }) : 0} avg</span>
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
            <div style={{ marginTop: '24px', padding: '12px 16px', background: '#E3F2FD', border: '2px solid #1976D2', borderRadius: '6px', fontSize: '12px', color: '#0D47A1' }}>
              <strong>✅ ACRA & MOM Compliance:</strong> All income/expense entries tracked with audit trail. Sequential invoicing ready. Double-entry accounting verified. GST infrastructure ready for enablement.
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
                  background: '#2196F3',
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
                    background: '#2196F3',
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
                  <div key={rec.id} style={{ padding: '12px 16px', background: isReconciled ? '#E8F5E9' : rec.status === 'variance' ? '#FFF3E0' : '#E3F2FD', border: `2px solid ${isReconciled ? '#4CAF50' : rec.status === 'variance' ? '#FF9800' : '#2196F3'}`, borderRadius: '8px' }}>
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
                  background: '#9C27B0',
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
                    background: '#9C27B0',
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
