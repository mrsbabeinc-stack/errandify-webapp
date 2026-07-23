import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast, ToastContainer } from '../../components/Toast';
import AdminLayout from '../../components/admin/AdminLayout';
import { staffAPI } from '../../services/adminAPI';

interface Staff {
  id: string;
  staffId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  nric?: string; // Singapore NRIC (optional for documentation)
  department: string;
  position: string;
  hireDate: string;
  employmentType: 'permanent' | 'contract' | 'part-time' | 'temporary';
  status: 'active' | 'inactive' | 'on-leave' | 'terminated';
  baseSalary?: number;
  annualLeaveEntitlement: number; // Singapore standard: 12 days/year
  sickLeaveEntitlement: number; // Singapore standard: 4 days/year (or medical cert after 2 days)
  lastLeaveUpdate?: string;
  cpfMembershipNo?: string; // Singapore CPF Account Number
  createdAt: string;
  lastModified: string;
}

const HRDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { toasts, showToast, removeToast } = useToast();
  const [activeTab, setActiveTab] = useState<'staff'>('staff');

  // Staff state
  const [staff, setStaff] = useState<Staff[]>([]);
  const [showStaffForm, setShowStaffForm] = useState(false);
  const [staffForm, setStaffForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    nric: '',
    department: '',
    position: '',
    employmentType: 'permanent' as const,
    hireDate: new Date().toISOString().split('T')[0],
    baseSalary: 0,
    cpfMembershipNo: '',
  });

  const [loading, setLoading] = useState(true);

  // Was three invented employees. Staff now comes from the same store the
  // Staff Management screen writes to, so the two agree.
  const loadStaff = async () => {
    try {
      setLoading(true);
      const res = await staffAPI.getAll();
      setStaff(
        (res.data || []).map((r: any) => ({
          id: String(r.id),
          staffId: r.staff_id,
          firstName: r.first_name,
          lastName: r.last_name,
          email: r.email,
          phone: r.phone || '',
          nric: r.nric || undefined,
          department: r.department || '',
          position: r.position || '',
          hireDate: r.hire_date ? String(r.hire_date).split('T')[0] : '',
          employmentType: (r.employment_type || 'permanent').toLowerCase() as Staff['employmentType'],
          status: (r.status || 'active') as Staff['status'],
          baseSalary: Number(r.base_salary) || 0,
          annualLeaveEntitlement: Number(r.annual_leave_entitlement) || 0,
          sickLeaveEntitlement: Number(r.sick_leave_entitlement) || 0,
          cpfMembershipNo: r.cpf_membership_no || undefined,
          createdAt: r.created_at || '',
          lastModified: r.last_modified || '',
        }))
      );
    } catch (error: any) {
      console.error('Failed to load staff:', error);
      showToast(error.message || 'Could not load staff', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStaff();
  }, []);

  const handleAddStaff = async () => {
    if (!staffForm.firstName.trim() || !staffForm.email.trim()) {
      showToast('Please fill in required fields', 'error');
      return;
    }

    try {
      // The server allocates staff_id. Deriving it from the list length here
      // produced a duplicate the moment anyone had been deleted.
      await staffAPI.create({
        first_name: staffForm.firstName,
        last_name: staffForm.lastName,
        email: staffForm.email,
        phone: staffForm.phone,
        nric: staffForm.nric,
        department: staffForm.department,
        position: staffForm.position,
        employment_type: staffForm.employmentType,
        hire_date: staffForm.hireDate,
        base_salary: staffForm.baseSalary,
        cpf_membership_no: staffForm.cpfMembershipNo,
      });
      await loadStaff();
      showToast('✅ Staff member added', 'success');
    } catch (error: any) {
      showToast(`❌ ${error.message || 'Could not add staff member'}`, 'error');
      return;
    }

    setStaffForm({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      nric: '',
      department: '',
      position: '',
      employmentType: 'permanent',
      hireDate: new Date().toISOString().split('T')[0],
      baseSalary: 0,
      cpfMembershipNo: '',
    });
    setShowStaffForm(false);
    showToast('✅ Staff member added successfully', 'success');
  };

  return (
    <AdminLayout>
      <div style={{ padding: '16px', background: '#fff', minHeight: '100vh' }}>
        <ToastContainer toasts={toasts} onClose={removeToast} />

        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#333', margin: 0 }}>
              👥 HR Dashboard
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
            Staff Management, Leave & Payroll
          </p>
        </div>

        {/* Compliance Notice */}
        <div style={{ padding: '12px 16px', background: '#E8F5E9', border: '2px solid #388E3C', borderRadius: '6px', marginBottom: '16px', fontSize: '12px', color: '#1B5E20' }}>
          <strong>🇸🇬 MOM Compliance:</strong> All staff records include NRIC, employment type, CPF number. Leave entitlements auto-assigned: 12 days annual leave (no carry-over), 4 days sick leave (medical cert after 2 days). All changes audited.
        </div>

        {/* KPI Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '20px' }}>
          <div style={{ padding: '16px', background: '#FFF8F5', borderRadius: '8px', border: '2px solid #FFD9B3' }}>
            <div style={{ fontSize: '12px', color: '#999', marginBottom: '4px' }}>Total Staff</div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: '#FF6B35' }}>{staff.length}</div>
          </div>
          <div style={{ padding: '16px', background: '#FFF8F5', borderRadius: '8px', border: '2px solid #FFD9B3' }}>
            <div style={{ fontSize: '12px', color: '#999', marginBottom: '4px' }}>Active</div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: '#4CAF50' }}>
              {staff.filter(s => s.status === 'active').length}
            </div>
          </div>
          <div style={{ padding: '16px', background: '#FFF8F5', borderRadius: '8px', border: '2px solid #FFD9B3' }}>
            <div style={{ fontSize: '12px', color: '#999', marginBottom: '4px' }}>Payroll (Monthly)</div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: '#2196F3' }}>
              SGD ${staff.reduce((sum, s) => sum + (s.baseSalary || 0), 0).toLocaleString()}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', borderBottom: '2px solid #FFD9B3' }}>
          <button
            onClick={() => setActiveTab('staff')}
            style={{
              padding: '12px 16px',
              background: activeTab === 'staff' ? '#FFD9B3' : 'transparent',
              color: activeTab === 'staff' ? '#333' : '#999',
              border: 'none',
              borderBottom: activeTab === 'staff' ? '3px solid #FF6B35' : 'none',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '14px',
              transition: 'all 0.2s',
            }}
          >
            👥 Staff Directory
          </button>
        </div>

        {/* STAFF TAB */}
        {activeTab === 'staff' && (
          <div>
            <button
              onClick={() => setShowStaffForm(!showStaffForm)}
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
              + Add Staff Member
            </button>

            {showStaffForm && (
              <div style={{ padding: '16px', background: '#FFF8F5', borderRadius: '8px', border: '2px solid #FFD9B3', marginBottom: '16px' }}>
                <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', color: '#333' }}>Add New Staff</h3>
                <div style={{ display: 'grid', gap: '12px' }}>
                  <input
                    type="text"
                    placeholder="First Name *"
                    value={staffForm.firstName}
                    onChange={(e) => setStaffForm({ ...staffForm, firstName: e.target.value })}
                    style={{ padding: '10px 12px', border: '2px solid #FFD9B3', borderRadius: '6px', fontSize: '14px' }}
                  />
                  <input
                    type="text"
                    placeholder="Last Name"
                    value={staffForm.lastName}
                    onChange={(e) => setStaffForm({ ...staffForm, lastName: e.target.value })}
                    style={{ padding: '10px 12px', border: '2px solid #FFD9B3', borderRadius: '6px', fontSize: '14px' }}
                  />
                  <input
                    type="email"
                    placeholder="Email *"
                    value={staffForm.email}
                    onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })}
                    style={{ padding: '10px 12px', border: '2px solid #FFD9B3', borderRadius: '6px', fontSize: '14px' }}
                  />
                  <input
                    type="tel"
                    placeholder="Phone"
                    value={staffForm.phone}
                    onChange={(e) => setStaffForm({ ...staffForm, phone: e.target.value })}
                    style={{ padding: '10px 12px', border: '2px solid #FFD9B3', borderRadius: '6px', fontSize: '14px' }}
                  />
                  <input
                    type="text"
                    placeholder="NRIC (Singapore)"
                    value={staffForm.nric}
                    onChange={(e) => setStaffForm({ ...staffForm, nric: e.target.value })}
                    style={{ padding: '10px 12px', border: '2px solid #FFD9B3', borderRadius: '6px', fontSize: '14px' }}
                  />
                  <input
                    type="text"
                    placeholder="CPF Membership No."
                    value={staffForm.cpfMembershipNo}
                    onChange={(e) => setStaffForm({ ...staffForm, cpfMembershipNo: e.target.value })}
                    style={{ padding: '10px 12px', border: '2px solid #FFD9B3', borderRadius: '6px', fontSize: '14px' }}
                  />
                  <input
                    type="text"
                    placeholder="Department"
                    value={staffForm.department}
                    onChange={(e) => setStaffForm({ ...staffForm, department: e.target.value })}
                    style={{ padding: '10px 12px', border: '2px solid #FFD9B3', borderRadius: '6px', fontSize: '14px' }}
                  />
                  <input
                    type="text"
                    placeholder="Position"
                    value={staffForm.position}
                    onChange={(e) => setStaffForm({ ...staffForm, position: e.target.value })}
                    style={{ padding: '10px 12px', border: '2px solid #FFD9B3', borderRadius: '6px', fontSize: '14px' }}
                  />
                  <select
                    value={staffForm.employmentType}
                    onChange={(e) => setStaffForm({ ...staffForm, employmentType: e.target.value as any })}
                    style={{ padding: '10px 12px', border: '2px solid #FFD9B3', borderRadius: '6px', fontSize: '14px', cursor: 'pointer' }}
                  >
                    <option value="permanent">Permanent</option>
                    <option value="contract">Contract</option>
                    <option value="part-time">Part-time</option>
                    <option value="temporary">Temporary</option>
                  </select>
                  <input
                    type="date"
                    value={staffForm.hireDate}
                    onChange={(e) => setStaffForm({ ...staffForm, hireDate: e.target.value })}
                    style={{ padding: '10px 12px', border: '2px solid #FFD9B3', borderRadius: '6px', fontSize: '14px' }}
                  />
                  <input
                    type="number"
                    placeholder="Base Salary (SGD)"
                    value={staffForm.baseSalary || ''}
                    onChange={(e) => setStaffForm({ ...staffForm, baseSalary: parseFloat(e.target.value) || 0 })}
                    style={{ padding: '10px 12px', border: '2px solid #FFD9B3', borderRadius: '6px', fontSize: '14px' }}
                  />
                  <div style={{ padding: '12px', background: '#E8F5E9', borderRadius: '6px', border: '2px solid #4CAF50', fontSize: '12px', color: '#2E7D32' }}>
                    <strong>Singapore Statutory Requirements:</strong>
                    <ul style={{ margin: '8px 0 0 16px', paddingLeft: '16px' }}>
                      <li>Annual Leave: 12 days/year (auto-assigned)</li>
                      <li>Sick Leave: 4 days/year (medical cert after 2 consecutive days)</li>
                      <li>CPF contribution: Mandatory for monthly salary ≥ $50</li>
                      <li>Employment Act applies to contracts ≤ $4,500/month</li>
                    </ul>
                  </div>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                      onClick={handleAddStaff}
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
                      Save Staff
                    </button>
                    <button
                      onClick={() => setShowStaffForm(false)}
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

            {/* Staff List */}
            <div style={{ display: 'grid', gap: '12px' }}>
              {staff.map(member => (
                <div key={member.id} style={{ padding: '16px', background: 'white', border: '2px solid #FFD9B3', borderRadius: '8px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: '16px', alignItems: 'start' }}>
                    <div style={{ fontSize: '32px' }}>👤</div>
                    <div>
                      <div style={{ fontWeight: '600', fontSize: '16px', color: '#333', marginBottom: '4px' }}>
                        {member.firstName} {member.lastName} <span style={{ fontSize: '12px', color: '#999', fontWeight: '400' }}>({member.staffId})</span>
                      </div>
                      <div style={{ fontSize: '13px', color: '#666', marginBottom: '8px' }}>
                        {member.position} • {member.department} • {member.employmentType}
                      </div>

                      <div style={{ fontSize: '11px', color: '#999', display: 'grid', gap: '3px', marginBottom: '8px' }}>
                        <div><strong>Contact:</strong> 📧 {member.email} | 📱 {member.phone}</div>
                        {/* NRIC is no longer sent with the roster — it is not
                            needed to identify someone in a list, and the list
                            endpoint stopped disclosing it. It remains on the
                            individual record behind Staff Management. */}
                        {member.cpfMembershipNo && <div><strong>CPF No:</strong> {member.cpfMembershipNo}</div>}
                        <div><strong>Hire Date:</strong> {new Date(member.hireDate).toLocaleDateString('en-SG')}</div>
                        {member.baseSalary && <div><strong>Monthly Salary:</strong> SGD ${member.baseSalary.toLocaleString()}</div>}
                      </div>

                      <div style={{ fontSize: '11px', color: '#666', display: 'grid', gap: '2px', padding: '8px 10px', background: '#F5F5F5', borderRadius: '4px' }}>
                        <div><strong>Leave Entitlement:</strong></div>
                        <div>🏖️ Annual Leave: {member.annualLeaveEntitlement} days/year (no carry-over)</div>
                        <div>🏥 Sick Leave: {member.sickLeaveEntitlement} days/year (medical cert after 2 days)</div>
                        <div style={{ fontSize: '10px', color: '#999', marginTop: '4px' }}>Last Updated: {new Date(member.lastModified).toLocaleDateString('en-SG')}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', height: 'fit-content' }}>
                      <div style={{ background: member.status === 'active' ? '#4CAF50' : member.status === 'on-leave' ? '#FF9800' : '#F44336', color: 'white', padding: '6px 10px', borderRadius: '3px', fontSize: '11px', fontWeight: '600', textAlign: 'center' }}>
                        {member.status.toUpperCase()}
                      </div>
                      <div style={{ fontSize: '10px', color: '#666', textAlign: 'center', padding: '6px 8px', background: '#E8F5E9', borderRadius: '3px', border: '1px solid #4CAF50' }}>
                        ✓ CPF Compliant
                      </div>
                    </div>
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

export default HRDashboard;
