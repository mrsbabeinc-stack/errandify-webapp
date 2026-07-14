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

interface Tag {
  id: string;
  name: string;
  type: 'category' | 'location' | 'purpose' | 'staff';
  value: string;
}

const AccountsDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { toasts, showToast, removeToast } = useToast();
  const [activeTab, setActiveTab] = useState<'income' | 'expenses' | 'tags'>('income');

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
        description: 'Monthly service fees from clients',
        notes: 'Regular monthly revenue',
        tags: ['service', 'recurring'],
        paymentStatus: 'received',
        gstApplicable: true,
        gstAmount: 900,
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString(),
      },
      {
        id: 'inc_2',
        date: '2026-07-08',
        amount: 5000,
        source: 'Product Sales',
        reference: 'ORD-156',
        invoiceNo: 'INV-20260708-001',
        description: 'Product sales revenue',
        notes: 'One-time sale',
        tags: ['product'],
        paymentStatus: 'pending',
        gstApplicable: true,
        gstAmount: 300,
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString(),
      },
    ];

    const demoExpenses: ExpenseEntry[] = [
      {
        id: 'exp_1',
        date: '2026-07-10',
        amount: 500,
        category: 'Office Supplies',
        vendor: 'Stationery Mart',
        description: 'Office supplies for July',
        department: 'Operations',
        tags: ['office', 'supplies'],
        approvalStatus: 'approved',
        approvedBy: 'John Tan',
        approvalDate: '2026-07-10',
        receiptNo: 'RCP-20260710-001',
        gstApplicable: true,
        gstAmount: 30,
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString(),
      },
      {
        id: 'exp_2',
        date: '2026-07-09',
        amount: 150,
        category: 'Travel',
        vendor: 'Grab',
        description: 'Client meeting transport',
        department: 'Operations',
        tags: ['travel', 'client-meeting'],
        approvalStatus: 'pending',
        receiptNo: 'GRB-20260709-001',
        gstApplicable: false,
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString(),
      },
    ];

    const demotags: Tag[] = [
      { id: 'tag_1', name: 'Service', type: 'category', value: 'service' },
      { id: 'tag_2', name: 'Product', type: 'category', value: 'product' },
      { id: 'tag_3', name: 'Office', type: 'category', value: 'office' },
      { id: 'tag_4', name: 'Travel', type: 'category', value: 'travel' },
      { id: 'tag_5', name: 'Singapore HQ', type: 'location', value: 'hq' },
      { id: 'tag_6', name: 'Client Site', type: 'location', value: 'client-site' },
      { id: 'tag_7', name: 'Client Meeting', type: 'purpose', value: 'client-meeting' },
    ];

    setIncome(demoIncome);
    setExpenses(demoExpenses);
    setTags(demotags);
  }, []);

  // Income handlers
  const handleAddIncome = () => {
    if (incomeForm.amount <= 0 || !incomeForm.source.trim()) {
      showToast('Please fill in required fields', 'error');
      return;
    }

    const newIncome: IncomeEntry = {
      id: `inc_${Date.now()}`,
      date: incomeForm.date,
      amount: incomeForm.amount,
      source: incomeForm.source,
      reference: incomeForm.reference,
      description: incomeForm.description,
      notes: incomeForm.notes,
      tags: [],
      paymentStatus: 'pending',
      createdAt: new Date().toISOString(),
      lastModified: new Date().toISOString(),
    };

    setIncome([...income, newIncome]);
    setIncomeForm({
      date: new Date().toISOString().split('T')[0],
      amount: 0,
      source: '',
      reference: '',
      description: '',
      notes: '',
    });
    setShowIncomeForm(false);
    showToast('✅ Income entry added', 'success');
  };

  // Expense handlers
  const handleAddExpense = () => {
    if (expenseForm.amount <= 0 || !expenseForm.category.trim()) {
      showToast('Please fill in required fields', 'error');
      return;
    }

    const newExpense: ExpenseEntry = {
      id: `exp_${Date.now()}`,
      date: expenseForm.date,
      amount: expenseForm.amount,
      category: expenseForm.category,
      vendor: expenseForm.vendor,
      description: expenseForm.description,
      department: expenseForm.department,
      tags: [],
      approvalStatus: 'pending',
      createdAt: new Date().toISOString(),
      lastModified: new Date().toISOString(),
    };

    setExpenses([...expenses, newExpense]);
    setExpenseForm({
      date: new Date().toISOString().split('T')[0],
      amount: 0,
      category: '',
      vendor: '',
      description: '',
      department: '',
    });
    setShowExpenseForm(false);
    showToast('✅ Expense submitted for owner approval', 'success');
  };

  // Tag handlers
  const handleAddTag = () => {
    if (!tagForm.name.trim() || !tagForm.value.trim()) {
      showToast('Please fill in all tag fields', 'error');
      return;
    }

    const newTag: Tag = {
      id: `tag_${Date.now()}`,
      name: tagForm.name,
      type: tagForm.type,
      value: tagForm.value,
    };

    setTags([...tags, newTag]);
    setTagForm({ name: '', type: 'category', value: '' });
    setShowTagForm(false);
    showToast('✅ Tag added', 'success');
  };

  const totalIncome = income.reduce((sum, entry) => sum + entry.amount, 0);
  const totalExpenses = expenses.reduce((sum, entry) => sum + entry.amount, 0);
  const netBalance = totalIncome - totalExpenses;

  return (
    <AdminLayout>
      <div style={{ padding: '16px', background: '#fff', minHeight: '100vh' }}>
        <ToastContainer toasts={toasts} onClose={removeToast} />

        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#333', margin: 0 }}>
              💰 Accounts Dashboard
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
            Income, Expenses & Transaction Tags
          </p>
        </div>

        {/* Compliance Notice */}
        <div style={{ padding: '12px 16px', background: '#E3F2FD', border: '2px solid #1976D2', borderRadius: '6px', marginBottom: '16px', fontSize: '12px', color: '#0D47A1' }}>
          <strong>🇸🇬 Singapore Compliance:</strong> This system maintains ACRA, IRAS, and MOM compliance. All transactions include audit trail (creation date, modifier, approval). Records retained 5 years per ACRA requirement.
        </div>

        {/* KPI Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '20px' }}>
          <div style={{ padding: '16px', background: '#FFF8F5', borderRadius: '8px', border: '2px solid #FFD9B3' }}>
            <div style={{ fontSize: '12px', color: '#999', marginBottom: '4px' }}>Total Income</div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: '#4CAF50' }}>SGD ${totalIncome.toLocaleString()}</div>
          </div>
          <div style={{ padding: '16px', background: '#FFF8F5', borderRadius: '8px', border: '2px solid #FFD9B3' }}>
            <div style={{ fontSize: '12px', color: '#999', marginBottom: '4px' }}>Total Expenses</div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: '#F44336' }}>SGD ${totalExpenses.toLocaleString()}</div>
          </div>
          <div style={{ padding: '16px', background: '#FFF8F5', borderRadius: '8px', border: '2px solid #FFD9B3' }}>
            <div style={{ fontSize: '12px', color: '#999', marginBottom: '4px' }}>Net Balance</div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: netBalance >= 0 ? '#4CAF50' : '#F44336' }}>
              SGD ${netBalance.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', borderBottom: '2px solid #FFD9B3' }}>
          {(['income', 'expenses', 'tags'] as const).map(tab => (
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
              }}
            >
              {tab === 'income' && '💰 Income'}
              {tab === 'expenses' && '📊 Expenses'}
              {tab === 'tags' && '🏷️ Tags'}
            </button>
          ))}
        </div>

        {/* INCOME TAB */}
        {activeTab === 'income' && (
          <div>
            <button
              onClick={() => setShowIncomeForm(!showIncomeForm)}
              style={{
                padding: '10px 16px',
                background: '#FF6B35',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontWeight: '600',
                cursor: 'pointer',
                marginBottom: '16px',
              }}
            >
              + Add Income Entry
            </button>

            {showIncomeForm && (
              <div style={{ padding: '16px', background: '#FFF8F5', borderRadius: '8px', border: '2px solid #FFD9B3', marginBottom: '16px' }}>
                <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', color: '#333' }}>Record Income</h3>
                <div style={{ display: 'grid', gap: '12px' }}>
                  <input
                    type="date"
                    value={incomeForm.date}
                    onChange={(e) => setIncomeForm({ ...incomeForm, date: e.target.value })}
                    style={{ padding: '10px 12px', border: '2px solid #FFD9B3', borderRadius: '6px', fontSize: '14px' }}
                  />
                  <input
                    type="number"
                    placeholder="Amount (SGD) *"
                    value={incomeForm.amount || ''}
                    onChange={(e) => setIncomeForm({ ...incomeForm, amount: parseFloat(e.target.value) || 0 })}
                    style={{ padding: '10px 12px', border: '2px solid #FFD9B3', borderRadius: '6px', fontSize: '14px' }}
                  />
                  <input
                    type="text"
                    placeholder="Income Source *"
                    value={incomeForm.source}
                    onChange={(e) => setIncomeForm({ ...incomeForm, source: e.target.value })}
                    style={{ padding: '10px 12px', border: '2px solid #FFD9B3', borderRadius: '6px', fontSize: '14px' }}
                  />
                  <input
                    type="text"
                    placeholder="Reference (Invoice No, Order ID, etc)"
                    value={incomeForm.reference}
                    onChange={(e) => setIncomeForm({ ...incomeForm, reference: e.target.value })}
                    style={{ padding: '10px 12px', border: '2px solid #FFD9B3', borderRadius: '6px', fontSize: '14px' }}
                  />
                  <input
                    type="text"
                    placeholder="Description"
                    value={incomeForm.description}
                    onChange={(e) => setIncomeForm({ ...incomeForm, description: e.target.value })}
                    style={{ padding: '10px 12px', border: '2px solid #FFD9B3', borderRadius: '6px', fontSize: '14px' }}
                  />
                  <textarea
                    placeholder="Notes"
                    value={incomeForm.notes}
                    onChange={(e) => setIncomeForm({ ...incomeForm, notes: e.target.value })}
                    style={{ padding: '10px 12px', border: '2px solid #FFD9B3', borderRadius: '6px', fontSize: '14px', minHeight: '60px', resize: 'vertical' }}
                  />
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                      onClick={handleAddIncome}
                      style={{
                        flex: 1,
                        padding: '10px',
                        background: '#4CAF50',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        fontWeight: '600',
                        cursor: 'pointer',
                      }}
                    >
                      Save Income
                    </button>
                    <button
                      onClick={() => setShowIncomeForm(false)}
                      style={{
                        flex: 1,
                        padding: '10px',
                        background: '#f5f5f5',
                        color: '#333',
                        border: 'none',
                        borderRadius: '6px',
                        fontWeight: '600',
                        cursor: 'pointer',
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Income List */}
            <div style={{ display: 'grid', gap: '12px' }}>
              {income.map(entry => (
                <div key={entry.id} style={{ padding: '16px', background: 'white', border: '2px solid #FFD9B3', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                    <div>
                      <div style={{ fontWeight: '600', fontSize: '16px', color: '#333' }}>💰 {entry.source}</div>
                      <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>{entry.description}</div>
                    </div>
                    <div style={{ fontSize: '18px', fontWeight: '700', color: '#4CAF50' }}>
                      SGD ${entry.amount.toLocaleString()}
                    </div>
                  </div>
                  <div style={{ fontSize: '12px', color: '#999' }}>
                    📅 {new Date(entry.date).toLocaleDateString()} • Ref: {entry.reference}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* EXPENSES TAB */}
        {activeTab === 'expenses' && (
          <div>
            <button
              onClick={() => setShowExpenseForm(!showExpenseForm)}
              style={{
                padding: '10px 16px',
                background: '#FF6B35',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontWeight: '600',
                cursor: 'pointer',
                marginBottom: '16px',
              }}
            >
              + Add Expense Entry
            </button>

            {showExpenseForm && (
              <div style={{ padding: '16px', background: '#FFF8F5', borderRadius: '8px', border: '2px solid #FFD9B3', marginBottom: '16px' }}>
                <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', color: '#333' }}>Record Expense</h3>
                <div style={{ display: 'grid', gap: '12px' }}>
                  <input
                    type="date"
                    value={expenseForm.date}
                    onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
                    style={{ padding: '10px 12px', border: '2px solid #FFD9B3', borderRadius: '6px', fontSize: '14px' }}
                  />
                  <input
                    type="number"
                    placeholder="Amount (SGD) *"
                    value={expenseForm.amount || ''}
                    onChange={(e) => setExpenseForm({ ...expenseForm, amount: parseFloat(e.target.value) || 0 })}
                    style={{ padding: '10px 12px', border: '2px solid #FFD9B3', borderRadius: '6px', fontSize: '14px' }}
                  />
                  <input
                    type="text"
                    placeholder="Category *"
                    value={expenseForm.category}
                    onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                    style={{ padding: '10px 12px', border: '2px solid #FFD9B3', borderRadius: '6px', fontSize: '14px' }}
                  />
                  <input
                    type="text"
                    placeholder="Vendor Name"
                    value={expenseForm.vendor}
                    onChange={(e) => setExpenseForm({ ...expenseForm, vendor: e.target.value })}
                    style={{ padding: '10px 12px', border: '2px solid #FFD9B3', borderRadius: '6px', fontSize: '14px' }}
                  />
                  <input
                    type="text"
                    placeholder="Description"
                    value={expenseForm.description}
                    onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                    style={{ padding: '10px 12px', border: '2px solid #FFD9B3', borderRadius: '6px', fontSize: '14px' }}
                  />
                  <input
                    type="text"
                    placeholder="Department"
                    value={expenseForm.department}
                    onChange={(e) => setExpenseForm({ ...expenseForm, department: e.target.value })}
                    style={{ padding: '10px 12px', border: '2px solid #FFD9B3', borderRadius: '6px', fontSize: '14px' }}
                  />
                  <div style={{ padding: '10px 12px', background: '#FFF', border: '2px solid #FFD9B3', borderRadius: '6px', fontSize: '13px', color: '#666' }}>
                    💡 All expenses require owner approval
                  </div>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                      onClick={handleAddExpense}
                      style={{
                        flex: 1,
                        padding: '10px',
                        background: '#4CAF50',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        fontWeight: '600',
                        cursor: 'pointer',
                      }}
                    >
                      Save Expense
                    </button>
                    <button
                      onClick={() => setShowExpenseForm(false)}
                      style={{
                        flex: 1,
                        padding: '10px',
                        background: '#f5f5f5',
                        color: '#333',
                        border: 'none',
                        borderRadius: '6px',
                        fontWeight: '600',
                        cursor: 'pointer',
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Expense List */}
            <div style={{ display: 'grid', gap: '12px' }}>
              {expenses.map(entry => (
                <div key={entry.id} style={{ padding: '16px', background: 'white', border: '2px solid #FFD9B3', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '600', fontSize: '16px', color: '#333' }}>📊 {entry.category}</div>
                      <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>{entry.description}</div>
                      {entry.vendor && <div style={{ fontSize: '12px', color: '#999', marginTop: '2px' }}>🏪 {entry.vendor}</div>}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '18px', fontWeight: '700', color: '#F44336' }}>
                        SGD ${entry.amount.toLocaleString()}
                      </div>
                      <div style={{
                        fontSize: '11px',
                        fontWeight: '600',
                        marginTop: '4px',
                        color: entry.approvalStatus === 'approved' ? '#4CAF50' : entry.approvalStatus === 'rejected' ? '#F44336' : '#FF9800',
                      }}>
                        {entry.approvalStatus === 'approved' && '✓ APPROVED'}
                        {entry.approvalStatus === 'pending' && '⏳ PENDING'}
                        {entry.approvalStatus === 'rejected' && '✗ REJECTED'}
                      </div>
                    </div>
                  </div>
                  <div style={{ fontSize: '12px', color: '#999' }}>
                    📅 {new Date(entry.date).toLocaleDateString()} • 🏢 {entry.department || 'No department'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAGS TAB */}
        {activeTab === 'tags' && (
          <div>
            <button
              onClick={() => setShowTagForm(!showTagForm)}
              style={{
                padding: '10px 16px',
                background: '#FF6B35',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontWeight: '600',
                cursor: 'pointer',
                marginBottom: '16px',
              }}
            >
              + Add Tag
            </button>

            {showTagForm && (
              <div style={{ padding: '16px', background: '#FFF8F5', borderRadius: '8px', border: '2px solid #FFD9B3', marginBottom: '16px' }}>
                <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', color: '#333' }}>Create New Tag</h3>
                <div style={{ display: 'grid', gap: '12px' }}>
                  <input
                    type="text"
                    placeholder="Tag Name (e.g., Office Supplies)"
                    value={tagForm.name}
                    onChange={(e) => setTagForm({ ...tagForm, name: e.target.value })}
                    style={{ padding: '10px 12px', border: '2px solid #FFD9B3', borderRadius: '6px', fontSize: '14px' }}
                  />
                  <select
                    value={tagForm.type}
                    onChange={(e) => setTagForm({ ...tagForm, type: e.target.value as any })}
                    style={{ padding: '10px 12px', border: '2px solid #FFD9B3', borderRadius: '6px', fontSize: '14px', cursor: 'pointer' }}
                  >
                    <option value="category">Category</option>
                    <option value="location">Location</option>
                    <option value="purpose">Purpose</option>
                    <option value="staff">Staff/Department</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Tag Value (internal code)"
                    value={tagForm.value}
                    onChange={(e) => setTagForm({ ...tagForm, value: e.target.value })}
                    style={{ padding: '10px 12px', border: '2px solid #FFD9B3', borderRadius: '6px', fontSize: '14px' }}
                  />
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                      onClick={handleAddTag}
                      style={{
                        flex: 1,
                        padding: '10px',
                        background: '#4CAF50',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        fontWeight: '600',
                        cursor: 'pointer',
                      }}
                    >
                      Save Tag
                    </button>
                    <button
                      onClick={() => setShowTagForm(false)}
                      style={{
                        flex: 1,
                        padding: '10px',
                        background: '#f5f5f5',
                        color: '#333',
                        border: 'none',
                        borderRadius: '6px',
                        fontWeight: '600',
                        cursor: 'pointer',
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Tags Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '12px' }}>
              {tags.map(tag => (
                <div key={tag.id} style={{ padding: '12px', background: 'white', border: '2px solid #FFD9B3', borderRadius: '8px' }}>
                  <div style={{ fontWeight: '600', color: '#333', marginBottom: '4px' }}>{tag.name}</div>
                  <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
                    Type: <strong>{tag.type}</strong>
                  </div>
                  <div style={{
                    display: 'inline-block',
                    padding: '4px 8px',
                    background: '#FFD9B3',
                    borderRadius: '3px',
                    fontSize: '11px',
                    fontFamily: 'monospace',
                    color: '#333',
                  }}>
                    {tag.value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AccountsDashboard;
