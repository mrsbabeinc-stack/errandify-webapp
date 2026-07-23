import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast, ToastContainer } from '../../components/Toast';
import AdminLayout from '../../components/admin/AdminLayout';
import { staffAPI, salaryAPI } from '../../services/adminAPI';

interface Benefit {
  id: number;
  name: string;
  type: 'allowance' | 'deduction' | 'benefit';
  amount: number;
  frequency: 'monthly' | 'annually' | 'one-time';
  description: string;
}

interface StaffSalary {
  id: number | null;
  staffId: string;
  staffName: string;
  position: string;
  department: string;
  baseSalary: number;
  allowances: Benefit[];
  deductions: Benefit[];
  benefits: Benefit[];
  totalAllowances: number;
  grossSalary: number;
  notes?: string;
  lastModified: string;
  modifiedBy: string;
  // Populated by the list endpoint, which returns counts rather than the rows.
  allowanceCount?: number;
}

interface Staff {
  id: number;
  staffId: string;
  firstName: string;
  lastName: string;
  position: string;
  department: string;
}

/**
 * The API speaks snake_case and returns NUMERIC columns as strings; the view
 * below was written against camelCase numbers. Mapping at this boundary keeps
 * the change to the data layer instead of rewriting every field in the render.
 */
const num = (v: unknown) => Number(v) || 0;

const toBenefit = (row: any, type: Benefit['type']): Benefit => ({
  id: row.id,
  name: row.name,
  type,
  amount: num(row.amount),
  frequency: (row.frequency as Benefit['frequency']) || 'monthly',
  description: row.description || '',
});

const toSalary = (row: any): StaffSalary => ({
  id: row.id ?? null,
  staffId: row.staff_id,
  staffName: row.staff_name || '',
  position: row.position || '',
  department: row.department || '',
  baseSalary: num(row.base_salary),
  allowances: (row.allowances || []).map((a: any) => toBenefit(a, 'allowance')),
  deductions: (row.deductions || []).map((d: any) => toBenefit(d, 'deduction')),
  benefits: (row.benefits || []).map((b: any) => toBenefit(b, 'benefit')),
  totalAllowances: num(row.total_allowances),
  grossSalary: num(row.gross_salary),
  notes: row.notes || undefined,
  lastModified: row.last_modified || '',
  modifiedBy: 'Admin',
  allowanceCount: num(row.allowance_count),
});

const STANDARD_ALLOWANCES = [
  { name: 'Transport Allowance', type: 'allowance' as const },
  { name: 'Housing Allowance', type: 'allowance' as const },
  { name: 'Meal Allowance', type: 'allowance' as const },
  { name: 'Mobile Allowance', type: 'allowance' as const },
  { name: 'Utility Allowance', type: 'allowance' as const },
];

const STANDARD_BENEFITS = [
  { name: 'Health Insurance', type: 'benefit' as const },
  { name: 'Dental Coverage', type: 'benefit' as const },
  { name: 'Life Insurance', type: 'benefit' as const },
  { name: 'Gym Membership', type: 'benefit' as const },
  { name: 'Professional Development Fund', type: 'benefit' as const },
  { name: 'Annual Bonus', type: 'benefit' as const },
  { name: 'Errandify Points (EP)', type: 'benefit' as const },
];

const STANDARD_DEDUCTIONS = [
  { name: 'CPF Employee Contribution', type: 'deduction' as const },
  { name: 'Income Tax', type: 'deduction' as const },
  { name: 'Insurance Premium', type: 'deduction' as const },
];

const StaffSalaryBenefitsEditor: React.FC = () => {
  const navigate = useNavigate();
  const { toasts, showToast, removeToast } = useToast();
  const [activeTab, setActiveTab] = useState<'list' | 'edit'>('list');
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [salaryData, setSalaryData] = useState<StaffSalary[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<StaffSalary | null>(null);
  const [showAddBenefit, setShowAddBenefit] = useState(false);
  const [benefitType, setBenefitType] = useState<'allowance' | 'deduction' | 'benefit'>('allowance');

  // Form states
  const [editForm, setEditForm] = useState({
    baseSalary: 0,
  });

  const [newBenefit, setNewBenefit] = useState({
    name: '',
    amount: 0,
    frequency: 'monthly' as const,
    description: '',
  });

  const [loading, setLoading] = useState(true);

  // Staff and their salary summaries both come from the API. This screen
  // previously rendered four invented employees with invented salaries.
  const loadAll = async () => {
    try {
      setLoading(true);
      const [staffRes, salaryRes] = await Promise.all([
        staffAPI.getAll(),
        salaryAPI.getAll(),
      ]);

      setStaffList(
        (staffRes.data || []).map((r: any) => ({
          id: r.id,
          staffId: r.staff_id,
          firstName: r.first_name,
          lastName: r.last_name,
          position: r.position || '',
          department: r.department || '',
        }))
      );
      setSalaryData((salaryRes.data || []).map(toSalary));
    } catch (error: any) {
      console.error('Failed to load salary data:', error);
      showToast(`⚠️ ${error.message || 'Could not load salary data'}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  /**
   * The allowance/benefit/deduction endpoints all 404 without a staff_salary
   * row to hang off, so the row has to exist before the first one is added.
   */
  const ensureSalaryRecord = async (staff: StaffSalary) => {
    if (staff.id !== null) return staff.id;
    await salaryAPI.updateSalary(staff.staffId, {
      staff_name: staff.staffName,
      position: staff.position,
      department: staff.department,
      base_salary: staff.baseSalary,
    } as any);
    const fresh = await salaryAPI.getSalary(staff.staffId);
    const mapped = toSalary(fresh.data);
    setSelectedStaff(mapped);
    return mapped.id;
  };

  const refreshSelected = async (staffId: string) => {
    const fresh = await salaryAPI.getSalary(staffId);
    setSelectedStaff(toSalary(fresh.data));
  };

  const handleSelectStaff = async (staff: Staff) => {
    const blank: StaffSalary = {
      id: null,
      staffId: staff.staffId,
      staffName: `${staff.firstName} ${staff.lastName}`,
      position: staff.position,
      department: staff.department,
      baseSalary: 0,
      allowances: [],
      deductions: [],
      benefits: [],
      totalAllowances: 0,
      grossSalary: 0,
      lastModified: '',
      modifiedBy: 'Admin',
    };

    setActiveTab('edit');

    try {
      const res = await salaryAPI.getSalary(staff.staffId);
      const mapped = toSalary(res.data);
      setSelectedStaff(mapped);
      setEditForm({ baseSalary: mapped.baseSalary });
    } catch {
      // 404 simply means this staff member has no salary record yet; the row
      // gets created on the first save.
      setSelectedStaff(blank);
      setEditForm({ baseSalary: 0 });
    }
  };

  const handleUpdateBaseSalary = async () => {
    if (!selectedStaff) return;
    try {
      await salaryAPI.updateSalary(selectedStaff.staffId, {
        staff_name: selectedStaff.staffName,
        position: selectedStaff.position,
        department: selectedStaff.department,
        base_salary: editForm.baseSalary,
        notes: selectedStaff.notes,
      } as any);
      await refreshSelected(selectedStaff.staffId);
      showToast(`✅ Base salary updated to SGD $${editForm.baseSalary.toLocaleString()}`, 'success');
    } catch (error: any) {
      showToast(`❌ ${error.message || 'Could not update base salary'}`, 'error');
    }
  };

  const handleAddBenefit = async () => {
    if (!newBenefit.name || newBenefit.amount <= 0) {
      showToast('❌ Please enter benefit name and amount', 'error');
      return;
    }

    if (!selectedStaff) return;

    const payload = {
      name: newBenefit.name,
      amount: newBenefit.amount,
      frequency: newBenefit.frequency,
      description: newBenefit.description,
    };

    try {
      await ensureSalaryRecord(selectedStaff);

      if (benefitType === 'allowance') {
        await salaryAPI.addAllowance(selectedStaff.staffId, payload);
      } else if (benefitType === 'benefit') {
        await salaryAPI.addBenefit(selectedStaff.staffId, payload);
      } else {
        await salaryAPI.addDeduction(selectedStaff.staffId, payload);
      }

      await refreshSelected(selectedStaff.staffId);
      setNewBenefit({ name: '', amount: 0, frequency: 'monthly', description: '' });
      setShowAddBenefit(false);
      showToast(`✅ ${benefitType === 'allowance' ? 'Allowance' : benefitType === 'benefit' ? 'Benefit' : 'Deduction'} added`, 'success');
    } catch (error: any) {
      showToast(`❌ ${error.message || 'Could not add entry'}`, 'error');
    }
  };

  const handleRemoveBenefit = async (id: number, type: 'allowance' | 'deduction' | 'benefit') => {
    if (!selectedStaff) return;

    try {
      if (type === 'allowance') {
        await salaryAPI.removeAllowance(id);
      } else if (type === 'benefit') {
        await salaryAPI.removeBenefit(id);
      } else {
        await salaryAPI.removeDeduction(id);
      }

      await refreshSelected(selectedStaff.staffId);
      showToast(`✅ ${type} removed`, 'success');
    } catch (error: any) {
      showToast(`❌ ${error.message || 'Could not remove entry'}`, 'error');
    }
  };

  // Every edit above is already persisted, so this only refreshes the list the
  // user is returning to.
  const handleSaveAndExit = async () => {
    if (!selectedStaff) return;
    const name = selectedStaff.staffName;
    await loadAll();
    showToast(`✅ Salary & benefits saved for ${name}`, 'success');
    setSelectedStaff(null);
    setActiveTab('list');
  };

  return (
    <AdminLayout>
      <div style={{ padding: '16px', background: '#fff', minHeight: '100vh' }}>
        <ToastContainer toasts={toasts} onClose={removeToast} />

        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#333', margin: 0 }}>
              💰 Staff Salary & Benefits Manager
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
            Manage individual salary, allowances, deductions, and benefits for each staff member
          </p>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', borderBottom: '2px solid #FFD9B3' }}>
          {(['list', 'edit'] as const).map(tab => (
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
              {tab === 'list' && '📋 Staff List'}
              {tab === 'edit' && '✏️ Edit Salary & Benefits'}
            </button>
          ))}
        </div>

        {/* STAFF LIST TAB */}
        {activeTab === 'list' && (
          <div>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600', color: '#333' }}>Select Staff Member</h3>
            <div style={{ display: 'grid', gap: '12px' }}>
              {staffList.map(staff => {
                const salary = salaryData.find(s => s.staffId === staff.staffId);
                // The list endpoint returns counts, not the allowance rows.
                const hasData = !!salary && (salary.baseSalary > 0 || (salary.allowanceCount ?? 0) > 0);
                return (
                  <div
                    key={staff.id}
                    onClick={() => handleSelectStaff(staff)}
                    style={{
                      padding: '16px',
                      background: 'white',
                      border: hasData ? '2px solid #4CAF50' : '2px solid #FFD9B3',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      display: 'grid',
                      gridTemplateColumns: '1fr auto',
                      gap: '16px',
                      alignItems: 'center',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#FFF8F5')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'white')}
                  >
                    <div>
                      <div style={{ fontWeight: '600', fontSize: '14px', color: '#333', marginBottom: '4px' }}>
                        {staff.firstName} {staff.lastName} ({staff.staffId})
                      </div>
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        {staff.position} • {staff.department}
                      </div>
                      {salary && (
                        <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>
                          Base: SGD ${salary.baseSalary.toLocaleString()} • Allowances: {salary.allowances.length} • Benefits: {salary.benefits.length}
                        </div>
                      )}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      {salary && salary.baseSalary > 0 && (
                        <div style={{ fontSize: '16px', fontWeight: '700', color: '#FF6B35' }}>
                          SGD ${salary.grossSalary.toLocaleString()}
                        </div>
                      )}
                      <div style={{
                        display: 'inline-block',
                        padding: '4px 8px',
                        background: hasData ? '#E8F5E9' : '#FFF3E0',
                        color: hasData ? '#2E7D32' : '#E65100',
                        borderRadius: '3px',
                        fontSize: '10px',
                        fontWeight: '600',
                        marginTop: '4px',
                      }}>
                        {hasData ? '✓ Configured' : '⚠️ Not Set'}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* EDIT TAB */}
        {activeTab === 'edit' && selectedStaff && (
          <div>
            {/* Staff Header */}
            <div style={{ padding: '16px', background: '#FFF8F5', borderRadius: '8px', marginBottom: '24px', border: '2px solid #FFD9B3' }}>
              <div style={{ fontSize: '14px', color: '#666', marginBottom: '4px' }}>Editing Salary & Benefits for</div>
              <div style={{ fontSize: '18px', fontWeight: '700', color: '#333', marginBottom: '4px' }}>
                {selectedStaff.staffName} ({selectedStaff.staffId})
              </div>
              <div style={{ fontSize: '12px', color: '#999' }}>
                {selectedStaff.position} • {selectedStaff.department}
              </div>
            </div>

            {/* BASE SALARY SECTION */}
            <div style={{ padding: '16px', background: 'white', border: '2px solid #FFD9B3', borderRadius: '8px', marginBottom: '24px' }}>
              <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600', color: '#333' }}>💵 Base Salary</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '12px', alignItems: 'end' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#666', display: 'block', marginBottom: '4px' }}>
                    Monthly Base Salary (SGD)
                  </label>
                  <input
                    type="number"
                    value={editForm.baseSalary}
                    onChange={(e) => setEditForm({ ...editForm, baseSalary: parseFloat(e.target.value) || 0 })}
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
                <button
                  onClick={handleUpdateBaseSalary}
                  style={{
                    padding: '10px 16px',
                    background: '#FF6B35',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    fontSize: '12px',
                  }}
                >
                  ✓ Update
                </button>
              </div>
            </div>

            {/* ALLOWANCES SECTION */}
            <div style={{ padding: '16px', background: 'white', border: '2px solid #FFD9B3', borderRadius: '8px', marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: '#333' }}>🎁 Allowances</h3>
                <span style={{ fontSize: '12px', color: '#666' }}>Total: SGD ${selectedStaff.allowances.reduce((s, a) => s + a.amount, 0).toLocaleString()}</span>
              </div>
              <div style={{ display: 'grid', gap: '8px', marginBottom: '12px' }}>
                {selectedStaff.allowances.map(allowance => (
                  <div key={allowance.id} style={{ padding: '12px', background: '#F5F5F5', borderRadius: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: '600', fontSize: '12px', color: '#333' }}>{allowance.name}</div>
                      <div style={{ fontSize: '11px', color: '#666' }}>SGD ${allowance.amount.toLocaleString()} • {allowance.frequency}</div>
                      {allowance.description && <div style={{ fontSize: '10px', color: '#999' }}>{allowance.description}</div>}
                    </div>
                    <button
                      onClick={() => handleRemoveBenefit(allowance.id, 'allowance')}
                      style={{
                        padding: '4px 8px',
                        background: '#FFEBEE',
                        color: '#C62828',
                        border: 'none',
                        borderRadius: '3px',
                        cursor: 'pointer',
                        fontWeight: '600',
                        fontSize: '11px',
                      }}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
              {benefitType === 'allowance' && showAddBenefit && (
                <div style={{ padding: '12px', background: '#F9F9F9', borderRadius: '4px', border: '1px solid #FFD9B3', marginBottom: '12px', display: 'grid', gap: '8px' }}>
                  <select
                    value={newBenefit.name}
                    onChange={(e) => setNewBenefit({ ...newBenefit, name: e.target.value })}
                    style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd', fontSize: '12px' }}
                  >
                    <option value="">Select Allowance Type</option>
                    {STANDARD_ALLOWANCES.map(a => (
                      <option key={a.name} value={a.name}>{a.name}</option>
                    ))}
                    <option value="custom">Custom Allowance</option>
                  </select>
                  {newBenefit.name === 'custom' && (
                    <input
                      type="text"
                      placeholder="Enter custom allowance name"
                      value={newBenefit.name === 'custom' ? '' : newBenefit.name}
                      onChange={(e) => setNewBenefit({ ...newBenefit, name: e.target.value })}
                      style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd', fontSize: '12px' }}
                    />
                  )}
                  <input
                    type="number"
                    placeholder="Amount (SGD)"
                    value={newBenefit.amount || ''}
                    onChange={(e) => setNewBenefit({ ...newBenefit, amount: parseFloat(e.target.value) || 0 })}
                    style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd', fontSize: '12px' }}
                  />
                  <input
                    type="text"
                    placeholder="Description (optional)"
                    value={newBenefit.description}
                    onChange={(e) => setNewBenefit({ ...newBenefit, description: e.target.value })}
                    style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd', fontSize: '12px' }}
                  />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <button
                      onClick={handleAddBenefit}
                      style={{
                        padding: '8px',
                        background: '#4CAF50',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontWeight: '600',
                        fontSize: '12px',
                      }}
                    >
                      ✓ Add
                    </button>
                    <button
                      onClick={() => setShowAddBenefit(false)}
                      style={{
                        padding: '8px',
                        background: '#f5f5f5',
                        color: '#333',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontWeight: '600',
                        fontSize: '12px',
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
              {(!showAddBenefit || benefitType !== 'allowance') && (
                <button
                  onClick={() => {
                    setBenefitType('allowance');
                    setShowAddBenefit(true);
                  }}
                  style={{
                    width: '100%',
                    padding: '8px',
                    background: '#FFF3E0',
                    color: '#E65100',
                    border: '1px dashed #FFD9B3',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: '600',
                    fontSize: '12px',
                  }}
                >
                  + Add Allowance
                </button>
              )}
            </div>

            {/* BENEFITS SECTION */}
            <div style={{ padding: '16px', background: 'white', border: '2px solid #FFD9B3', borderRadius: '8px', marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: '#333' }}>🏆 Benefits</h3>
                <span style={{ fontSize: '12px', color: '#666' }}>{selectedStaff.benefits.length} Benefits</span>
              </div>
              <div style={{ display: 'grid', gap: '8px', marginBottom: '12px' }}>
                {selectedStaff.benefits.map(benefit => (
                  <div key={benefit.id} style={{ padding: '12px', background: '#F5F5F5', borderRadius: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: '600', fontSize: '12px', color: '#333' }}>{benefit.name}</div>
                      <div style={{ fontSize: '11px', color: '#666' }}>SGD ${benefit.amount.toLocaleString()} • {benefit.frequency}</div>
                      {benefit.description && <div style={{ fontSize: '10px', color: '#999' }}>{benefit.description}</div>}
                    </div>
                    <button
                      onClick={() => handleRemoveBenefit(benefit.id, 'benefit')}
                      style={{
                        padding: '4px 8px',
                        background: '#FFEBEE',
                        color: '#C62828',
                        border: 'none',
                        borderRadius: '3px',
                        cursor: 'pointer',
                        fontWeight: '600',
                        fontSize: '11px',
                      }}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
              {benefitType === 'benefit' && showAddBenefit && (
                <div style={{ padding: '12px', background: '#F9F9F9', borderRadius: '4px', border: '1px solid #FFD9B3', marginBottom: '12px', display: 'grid', gap: '8px' }}>
                  <select
                    value={newBenefit.name}
                    onChange={(e) => setNewBenefit({ ...newBenefit, name: e.target.value })}
                    style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd', fontSize: '12px' }}
                  >
                    <option value="">Select Benefit Type</option>
                    {STANDARD_BENEFITS.map(b => (
                      <option key={b.name} value={b.name}>{b.name}</option>
                    ))}
                    <option value="custom">Custom Benefit</option>
                  </select>
                  {newBenefit.name === 'custom' && (
                    <input
                      type="text"
                      placeholder="Enter custom benefit name"
                      value={newBenefit.name === 'custom' ? '' : newBenefit.name}
                      onChange={(e) => setNewBenefit({ ...newBenefit, name: e.target.value })}
                      style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd', fontSize: '12px' }}
                    />
                  )}
                  <input
                    type="number"
                    placeholder="Amount (SGD)"
                    value={newBenefit.amount || ''}
                    onChange={(e) => setNewBenefit({ ...newBenefit, amount: parseFloat(e.target.value) || 0 })}
                    style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd', fontSize: '12px' }}
                  />
                  <select
                    value={newBenefit.frequency}
                    onChange={(e) => setNewBenefit({ ...newBenefit, frequency: e.target.value as any })}
                    style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd', fontSize: '12px' }}
                  >
                    <option value="monthly">Monthly</option>
                    <option value="annually">Annually</option>
                    <option value="one-time">One-Time</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Description (optional)"
                    value={newBenefit.description}
                    onChange={(e) => setNewBenefit({ ...newBenefit, description: e.target.value })}
                    style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd', fontSize: '12px' }}
                  />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <button
                      onClick={handleAddBenefit}
                      style={{
                        padding: '8px',
                        background: '#4CAF50',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontWeight: '600',
                        fontSize: '12px',
                      }}
                    >
                      ✓ Add
                    </button>
                    <button
                      onClick={() => setShowAddBenefit(false)}
                      style={{
                        padding: '8px',
                        background: '#f5f5f5',
                        color: '#333',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontWeight: '600',
                        fontSize: '12px',
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
              {(!showAddBenefit || benefitType !== 'benefit') && (
                <button
                  onClick={() => {
                    setBenefitType('benefit');
                    setShowAddBenefit(true);
                  }}
                  style={{
                    width: '100%',
                    padding: '8px',
                    background: '#FFF3E0',
                    color: '#E65100',
                    border: '1px dashed #FFD9B3',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: '600',
                    fontSize: '12px',
                  }}
                >
                  + Add Benefit
                </button>
              )}
            </div>

            {/* SALARY SUMMARY */}
            <div style={{ padding: '16px', background: '#E8F5E9', borderRadius: '8px', marginBottom: '24px', border: '2px solid #4CAF50' }}>
              <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600', color: '#2E7D32' }}>📊 Salary Summary</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', fontSize: '12px' }}>
                <div>
                  <div style={{ color: '#666', marginBottom: '4px' }}>Base Salary</div>
                  <div style={{ fontSize: '16px', fontWeight: '700', color: '#2E7D32' }}>SGD ${selectedStaff.baseSalary.toLocaleString()}</div>
                </div>
                <div>
                  <div style={{ color: '#666', marginBottom: '4px' }}>Total Allowances</div>
                  <div style={{ fontSize: '16px', fontWeight: '700', color: '#2E7D32' }}>SGD ${selectedStaff.totalAllowances.toLocaleString()}</div>
                </div>
                <div>
                  <div style={{ color: '#666', marginBottom: '4px' }}>Gross Salary</div>
                  <div style={{ fontSize: '16px', fontWeight: '700', color: '#2E7D32' }}>SGD ${selectedStaff.grossSalary.toLocaleString()}</div>
                </div>
              </div>
            </div>

            {/* ACTION BUTTONS */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={handleSaveAndExit}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: '#4CAF50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
              >
                ✓ Save & Exit
              </button>
              <button
                onClick={() => {
                  setSelectedStaff(null);
                  setActiveTab('list');
                }}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: '#f5f5f5',
                  color: '#333',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default StaffSalaryBenefitsEditor;
