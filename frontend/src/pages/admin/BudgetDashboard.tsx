import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast, ToastContainer } from '../../components/Toast';
import AdminLayout from '../../components/admin/AdminLayout';

interface BudgetAllocation {
  category: string;
  allocated: number;
  actual: number;
  variance: number;
  status: 'on_track' | 'warning' | 'over_budget';
}

interface Budget {
  budget_id: number;
  department: string;
  period: string;
  total_budget: number;
  total_spent: number;
  allocations: BudgetAllocation[];
  status: 'active' | 'archived';
  created_by: string;
}

const BudgetDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { toasts, showToast, removeToast } = useToast();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('2026-07');
  const [selectedDept, setSelectedDept] = useState('all');
  const [viewMode, setViewMode] = useState<'overview' | 'detail' | 'create'>('overview');
  const [selectedBudget, setSelectedBudget] = useState<Budget | null>(null);

  // Form state for creating budget
  const [formData, setFormData] = useState({
    department: '',
    period: '2026-07',
    total_budget: '',
    categories: [{ category: '', allocated: '' }],
  });

  useEffect(() => {
    loadBudgets();
  }, [selectedPeriod, selectedDept]);

  const loadBudgets = async () => {
    try {
      setLoading(true);
      // Load from localStorage or use mock data
      const saved = localStorage.getItem('budgets');
      let mockBudgets: Budget[] = [
        {
          budget_id: 1,
          department: 'Operations',
          period: '2026-07',
          total_budget: 50000,
          total_spent: 38500,
          status: 'active',
          created_by: 'Manager 1',
          allocations: [
            { category: 'Salaries', allocated: 30000, actual: 28500, variance: 1500, status: 'on_track' },
            { category: 'Equipment', allocated: 10000, actual: 7200, variance: 2800, status: 'on_track' },
            { category: 'Travel', allocated: 5000, actual: 1800, variance: 3200, status: 'on_track' },
            { category: 'Utilities', allocated: 5000, actual: 1000, variance: 4000, status: 'on_track' },
          ],
        },
        {
          budget_id: 2,
          department: 'Marketing',
          period: '2026-07',
          total_budget: 25000,
          total_spent: 26800,
          status: 'active',
          created_by: 'Manager 2',
          allocations: [
            { category: 'Digital Ads', allocated: 15000, actual: 16200, variance: -1200, status: 'over_budget' },
            { category: 'Content', allocated: 7000, actual: 8100, variance: -1100, status: 'warning' },
            { category: 'Events', allocated: 3000, actual: 2500, variance: 500, status: 'on_track' },
          ],
        },
        {
          budget_id: 3,
          department: 'HR',
          period: '2026-07',
          total_budget: 15000,
          total_spent: 12300,
          status: 'active',
          created_by: 'Manager 3',
          allocations: [
            { category: 'Training', allocated: 8000, actual: 6500, variance: 1500, status: 'on_track' },
            { category: 'Recruitment', allocated: 5000, actual: 4200, variance: 800, status: 'on_track' },
            { category: 'Wellness', allocated: 2000, actual: 1600, variance: 400, status: 'on_track' },
          ],
        },
      ];

      if (saved) {
        const savedBudgets = JSON.parse(saved);
        mockBudgets = [...mockBudgets, ...savedBudgets];
      }

      const filtered = selectedDept === 'all'
        ? mockBudgets
        : mockBudgets.filter(b => b.department === selectedDept);
      setBudgets(filtered);
    } catch (error) {
      showToast('Failed to load budgets', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBudget = async () => {
    if (!formData.department || !formData.total_budget || formData.categories.some(c => !c.category || !c.allocated)) {
      showToast('❌ Please fill all fields', 'error');
      return;
    }

    try {
      const newBudget: Budget = {
        budget_id: Date.now(),
        department: formData.department,
        period: formData.period,
        total_budget: Number(formData.total_budget),
        total_spent: 0,
        status: 'active',
        created_by: 'Current User',
        allocations: formData.categories
          .filter(c => c.category && c.allocated)
          .map(c => ({
            category: c.category,
            allocated: Number(c.allocated),
            actual: 0,
            variance: Number(c.allocated),
            status: 'on_track',
          })),
      };

      // Save to localStorage
      const saved = localStorage.getItem('budgets') || '[]';
      const allBudgets = JSON.parse(saved);
      allBudgets.push(newBudget);
      localStorage.setItem('budgets', JSON.stringify(allBudgets));

      showToast(`✅ Budget for ${formData.department} created successfully`, 'success');

      // Reset form
      setFormData({
        department: '',
        period: '2026-07',
        total_budget: '',
        categories: [{ category: '', allocated: '' }],
      });

      setViewMode('overview');
      loadBudgets();
    } catch (error) {
      showToast('❌ Failed to create budget', 'error');
    }
  };

  const getVarianceColor = (variance: number) => {
    if (variance > 0) return '#4CAF50'; // Under budget
    if (variance < -1000) return '#F44336'; // Over budget
    return '#FF9800'; // Warning
  };

  const getStatusBadge = (status: string) => {
    const styles: { [key: string]: { bg: string; color: string; text: string } } = {
      on_track: { bg: '#E8F5E9', color: '#2E7D32', text: '✓ On Track' },
      warning: { bg: '#FFF3E0', color: '#E65100', text: '⚠ Warning' },
      over_budget: { bg: '#FFEBEE', color: '#C62828', text: '✗ Over Budget' },
    };
    const style = styles[status] || styles.on_track;
    return (
      <span
        style={{
          padding: '4px 8px',
          background: style.bg,
          color: style.color,
          borderRadius: '4px',
          fontSize: '11px',
          fontWeight: '600',
        }}
      >
        {style.text}
      </span>
    );
  };

  const totalBudget = budgets.reduce((sum, b) => sum + b.total_budget, 0);
  const totalSpent = budgets.reduce((sum, b) => sum + b.total_spent, 0);
  const totalVariance = totalBudget - totalSpent;
  const utilizationPercent = ((totalSpent / totalBudget) * 100).toFixed(1);

  if (viewMode === 'create') {
    return (
      <AdminLayout>
        <div style={{ padding: '16px', background: '#fff', minHeight: '100vh' }}>
          <ToastContainer toasts={toasts} onClose={removeToast} />

          <div style={{ maxWidth: '600px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#333', margin: 0 }}>
                ➕ Create New Budget
              </h1>
              <button
                onClick={() => setViewMode('overview')}
                style={{
                  fontSize: '20px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#FF6B35',
                  fontWeight: '700',
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ background: 'white', padding: '20px', borderRadius: '8px', border: '1px solid #ddd' }}>
              {/* Department */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#333', display: 'block', marginBottom: '6px' }}>
                  Department *
                </label>
                <input
                  type="text"
                  placeholder="e.g., Finance, Operations"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontFamily: 'inherit',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Period */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#333', display: 'block', marginBottom: '6px' }}>
                  Period *
                </label>
                <input
                  type="month"
                  value={formData.period}
                  onChange={(e) => setFormData({ ...formData, period: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontFamily: 'inherit',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Total Budget */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#333', display: 'block', marginBottom: '6px' }}>
                  Total Budget (SGD) *
                </label>
                <input
                  type="number"
                  placeholder="50000"
                  value={formData.total_budget}
                  onChange={(e) => setFormData({ ...formData, total_budget: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontFamily: 'inherit',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Categories */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#333', display: 'block', marginBottom: '8px' }}>
                  Budget Categories *
                </label>
                {formData.categories.map((category, idx) => (
                  <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr auto', gap: '8px', marginBottom: '8px' }}>
                    <input
                      type="text"
                      placeholder="Category (e.g., Salaries)"
                      value={category.category}
                      onChange={(e) => {
                        const newCategories = [...formData.categories];
                        newCategories[idx].category = e.target.value;
                        setFormData({ ...formData, categories: newCategories });
                      }}
                      style={{
                        padding: '10px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontFamily: 'inherit',
                      }}
                    />
                    <input
                      type="number"
                      placeholder="Amount"
                      value={category.allocated}
                      onChange={(e) => {
                        const newCategories = [...formData.categories];
                        newCategories[idx].allocated = e.target.value;
                        setFormData({ ...formData, categories: newCategories });
                      }}
                      style={{
                        padding: '10px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontFamily: 'inherit',
                      }}
                    />
                    <button
                      onClick={() => {
                        if (formData.categories.length > 1) {
                          const newCategories = formData.categories.filter((_, i) => i !== idx);
                          setFormData({ ...formData, categories: newCategories });
                        }
                      }}
                      style={{
                        padding: '10px 12px',
                        background: '#FFEBEE',
                        color: '#C62828',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontWeight: '600',
                        fontSize: '12px',
                      }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => setFormData({
                    ...formData,
                    categories: [...formData.categories, { category: '', allocated: '' }],
                  })}
                  style={{
                    padding: '8px 12px',
                    background: '#E3F2FD',
                    color: '#1565C0',
                    border: '1px solid #1565C0',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: '600',
                    fontSize: '12px',
                  }}
                >
                  ➕ Add Category
                </button>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '24px' }}>
                <button
                  onClick={() => setViewMode('overview')}
                  style={{
                    padding: '12px',
                    background: '#f0f0f0',
                    color: '#333',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: '600',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateBudget}
                  style={{
                    padding: '12px',
                    background: '#4CAF50',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: '600',
                  }}
                >
                  ✓ Create Budget
                </button>
              </div>
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (viewMode === 'detail' && selectedBudget) {
    return (
      <AdminLayout>
        <div style={{ padding: '16px', background: '#fff', minHeight: '100vh' }}>
          <ToastContainer toasts={toasts} onClose={removeToast} />

          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <div>
              <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#333', margin: '0 0 4px 0' }}>
                {selectedBudget.department} Budget Detail
              </h1>
              <p style={{ fontSize: '14px', color: '#666', margin: 0 }}>
                Period: {selectedBudget.period}
              </p>
            </div>
            <button
              onClick={() => setViewMode('overview')}
              style={{
                fontSize: '20px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#FF6B35',
                fontWeight: '700',
              }}
            >
              ←
            </button>
          </div>

          {/* Summary */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '24px' }}>
            {[
              { label: 'Total Budget', value: `SGD ${selectedBudget.total_budget.toLocaleString()}`, color: '#2196F3' },
              { label: 'Total Spent', value: `SGD ${selectedBudget.total_spent.toLocaleString()}`, color: '#FF9800' },
              { label: 'Remaining', value: `SGD ${(selectedBudget.total_budget - selectedBudget.total_spent).toLocaleString()}`, color: '#4CAF50' },
            ].map((stat, idx) => (
              <div
                key={idx}
                style={{
                  padding: '16px',
                  background: 'white',
                  border: `2px solid ${stat.color}`,
                  borderRadius: '8px',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>{stat.label}</div>
                <div style={{ fontSize: '18px', fontWeight: '700', color: stat.color }}>
                  {stat.value}
                </div>
              </div>
            ))}
          </div>

          {/* Budget Breakdown Table */}
          <div style={{ background: 'white', border: '1px solid #ddd', borderRadius: '8px', overflow: 'hidden', marginBottom: '24px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#F5F5F5', borderBottom: '2px solid #ddd' }}>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600' }}>Category</th>
                  <th style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: '600' }}>Budget</th>
                  <th style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: '600' }}>Spent</th>
                  <th style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: '600' }}>Variance</th>
                  <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: '600' }}>Status</th>
                  <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: '600' }}>% Used</th>
                </tr>
              </thead>
              <tbody>
                {selectedBudget.allocations.map((alloc, idx) => {
                  const percentUsed = ((alloc.actual / alloc.allocated) * 100).toFixed(0);
                  return (
                    <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '12px', fontSize: '12px', fontWeight: '600', color: '#333' }}>
                        {alloc.category}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right', fontSize: '12px', color: '#333' }}>
                        SGD {alloc.allocated.toLocaleString()}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right', fontSize: '12px', color: '#333' }}>
                        SGD {alloc.actual.toLocaleString()}
                      </td>
                      <td
                        style={{
                          padding: '12px',
                          textAlign: 'right',
                          fontSize: '12px',
                          fontWeight: '600',
                          color: getVarianceColor(alloc.variance),
                        }}
                      >
                        SGD {alloc.variance > 0 ? '+' : ''}{alloc.variance.toLocaleString()}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        {getStatusBadge(alloc.status)}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: '600' }}>
                        {percentUsed}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Progress Bar */}
          <div style={{ background: '#FFF3E0', padding: '16px', borderRadius: '8px', borderLeft: '4px solid #FF6B35' }}>
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', fontWeight: '600', color: '#E65100', marginBottom: '8px' }}>
                Overall Budget Utilization
              </div>
              <div style={{ background: '#white', height: '24px', borderRadius: '4px', overflow: 'hidden', border: '1px solid #FFCC80' }}>
                <div
                  style={{
                    height: '100%',
                    background: '#FF6B35',
                    width: `${(selectedBudget.total_spent / selectedBudget.total_budget * 100)}%`,
                    transition: 'width 0.3s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '11px',
                    fontWeight: '600',
                  }}
                >
                  {((selectedBudget.total_spent / selectedBudget.total_budget) * 100).toFixed(0)}%
                </div>
              </div>
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div style={{ padding: '16px', background: '#fff', minHeight: '100vh' }}>
        <ToastContainer toasts={toasts} onClose={removeToast} />

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#333', margin: '0 0 4px 0' }}>
              💰 Budget Management
            </h1>
            <p style={{ fontSize: '14px', color: '#666', margin: 0 }}>
              Track departmental budgets and spending
            </p>
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
            }}
          >
            ←
          </button>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', alignItems: 'center', flexWrap: 'wrap' }}>
          <label style={{ fontSize: '12px', fontWeight: '600', color: '#333' }}>Period:</label>
          <input
            type="month"
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            style={{
              padding: '6px 10px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '12px',
            }}
          />
          <label style={{ fontSize: '12px', fontWeight: '600', color: '#333', marginLeft: '16px' }}>Department:</label>
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            style={{
              padding: '6px 10px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '12px',
            }}
          >
            <option value="all">All Departments</option>
            {[...new Set(budgets.map(b => b.department))].map(dept => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>
          <button
            onClick={() => setViewMode('create')}
            style={{
              marginLeft: 'auto',
              padding: '6px 12px',
              background: '#FF6B35',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            ➕ Create Budget
          </button>
        </div>

        {/* Summary Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '12px', marginBottom: '24px' }}>
          {[
            { label: 'Total Budget', value: `SGD ${totalBudget.toLocaleString()}`, color: '#2196F3' },
            { label: 'Total Spent', value: `SGD ${totalSpent.toLocaleString()}`, color: '#FF9800' },
            { label: 'Remaining', value: `SGD ${totalVariance.toLocaleString()}`, color: '#4CAF50' },
            { label: 'Utilization', value: `${utilizationPercent}%`, color: '#FF6B35' },
          ].map((stat, idx) => (
            <div
              key={idx}
              style={{
                padding: '16px',
                background: 'white',
                border: `2px solid ${stat.color}`,
                borderRadius: '8px',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>{stat.label}</div>
              <div style={{ fontSize: '20px', fontWeight: '700', color: stat.color }}>
                {stat.value}
              </div>
            </div>
          ))}
        </div>

        {/* Budgets List */}
        <div style={{ display: 'grid', gap: '12px' }}>
          {budgets.length === 0 ? (
            <div style={{ padding: '32px', textAlign: 'center', background: 'white', borderRadius: '8px', border: '1px solid #ddd', color: '#999' }}>
              <p style={{ margin: 0 }}>No budgets found. Create one to get started!</p>
            </div>
          ) : (
            budgets.map((budget) => {
              const spent = budget.total_spent;
              const budget_amount = budget.total_budget;
              const percentUsed = ((spent / budget_amount) * 100).toFixed(0);
              const variance = budget_amount - spent;
              const status = spent > budget_amount ? 'over_budget' : spent > budget_amount * 0.85 ? 'warning' : 'on_track';

              return (
                <div
                  key={budget.budget_id}
                  style={{
                    padding: '16px',
                    background: 'white',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                    e.currentTarget.style.borderColor = '#FF6B35';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.borderColor = '#ddd';
                  }}
                  onClick={() => {
                    setSelectedBudget(budget);
                    setViewMode('detail');
                  }}
                >
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr auto', gap: '16px', alignItems: 'center' }}>
                    {/* Department */}
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: '600', color: '#333' }}>
                        {budget.department}
                      </div>
                      <div style={{ fontSize: '11px', color: '#666' }}>Period: {budget.period}</div>
                    </div>

                    {/* Budget Amount */}
                    <div>
                      <div style={{ fontSize: '11px', color: '#666', marginBottom: '4px' }}>Budget</div>
                      <div style={{ fontSize: '14px', fontWeight: '600', color: '#2196F3' }}>
                        SGD {budget_amount.toLocaleString()}
                      </div>
                    </div>

                    {/* Spent */}
                    <div>
                      <div style={{ fontSize: '11px', color: '#666', marginBottom: '4px' }}>Spent</div>
                      <div style={{ fontSize: '14px', fontWeight: '600', color: '#FF9800' }}>
                        SGD {spent.toLocaleString()}
                      </div>
                    </div>

                    {/* Remaining */}
                    <div>
                      <div style={{ fontSize: '11px', color: '#666', marginBottom: '4px' }}>Remaining</div>
                      <div style={{ fontSize: '14px', fontWeight: '600', color: variance > 0 ? '#4CAF50' : '#F44336' }}>
                        SGD {variance.toLocaleString()}
                      </div>
                    </div>

                    {/* Status */}
                    <div style={{ textAlign: 'right' }}>
                      {getStatusBadge(status)}
                      <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>
                        {percentUsed}% used
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div style={{ marginTop: '12px', height: '4px', background: '#eee', borderRadius: '2px', overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        background: status === 'over_budget' ? '#F44336' : status === 'warning' ? '#FF9800' : '#4CAF50',
                        width: `${Math.min(parseFloat(percentUsed), 100)}%`,
                        transition: 'width 0.3s ease',
                      }}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default BudgetDashboard;
