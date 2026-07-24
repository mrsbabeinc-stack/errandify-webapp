import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast, ToastContainer } from '../../components/Toast';
import AdminLayout from '../../components/admin/AdminLayout';
import { staffAPI } from '../../services/adminAPI';

interface StaffComprehensive {
  // Personal Info
  id?: number;
  staff_id?: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  nric?: string;

  // Address
  home_address?: string;
  city?: string;
  postal_code?: string;
  country?: string;
  residential_status?: string;

  // Employment Info
  department?: string;
  position?: string;
  hire_date?: string;
  employment_type?: string;
  manager_id?: string;
  cost_center?: string;
  probation_end_date?: string;
  base_salary?: number;
  salary_payment_frequency?: string;

  // Leave & Benefits
  annual_leave_entitlement?: number;
  sick_leave_entitlement?: number;
  cpf_membership_no?: string;

  // Bank Info
  bank_account_name?: string;
  bank_account_number?: string;
  bank_code?: string;

  // Background Check
  background_check_status?: string;
  background_check_date?: string;
  background_check_type?: string;
  background_check_notes?: string;
  visa_work_permit_expiry?: string;

  // Emergency Contact
  emergency_contact_name?: string;
  emergency_contact_relationship?: string;
  emergency_contact_phone?: string;
  emergency_contact_email?: string;

  // Additional
  status?: string;
  onboarding_notes?: string;
  created_at?: string;
}

const DEPARTMENTS = ['Operations', 'Finance', 'HR', 'Marketing', 'Sales', 'IT', 'Customer Service', 'Product'];
const EMPLOYMENT_TYPES = ['Permanent', 'Contract', 'Temporary', 'Intern'];
const RESIDENTIAL_STATUS = ['Citizen', 'PR', 'Work Permit', 'Visit Pass'];
const BACKGROUND_CHECK_STATUS = ['Pending', 'In Progress', 'Completed', 'Passed', 'Failed', 'Inconclusive', 'Expired'];
const SKILL_LEVELS = ['Basic', 'Intermediate', 'Advanced', 'Expert'];
const QUALIFICATION_TYPES = ['Degree', 'Diploma', 'Certificate', 'License'];
const DOCUMENT_TYPES = ['CV', 'Cover Letter', 'Certificates', 'Background Check', 'Visa', 'Other'];

const StaffInfoEditorEnhanced: React.FC = () => {
  const navigate = useNavigate();
  const { toasts, showToast, removeToast } = useToast();
  const [staffList, setStaffList] = useState<StaffComprehensive[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<StaffComprehensive | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editForm, setEditForm] = useState<Partial<StaffComprehensive>>({});
  const [activeTab, setActiveTab] = useState<'personal' | 'address' | 'employment' | 'emergency' | 'education' | 'skills' | 'documents' | 'bank' | 'background'>('personal');

  useEffect(() => {
    const loadStaff = async () => {
      try {
        setLoading(true);
        const response = await staffAPI.getAll();
        if (response.success) {
          setStaffList(response.data || []);
        } else {
          showToast('⚠️ Failed to load staff', 'error');
        }
      } catch (error) {
        console.error('Failed to load staff:', error);
        showToast('⚠️ Error loading staff data', 'error');
      } finally {
        setLoading(false);
      }
    };
    loadStaff();
  }, []);

  const handleSelectStaff = (staff: StaffComprehensive) => {
    setSelectedStaff(staff);
    setEditForm({ ...staff });
    setShowNewForm(false);
  };

  const handleNewStaff = () => {
    setSelectedStaff(null);
    setEditForm({
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      nric: '',
      home_address: '',
      city: '',
      postal_code: '',
      country: 'Singapore',
      residential_status: 'Work Permit',
      department: 'Operations',
      position: '',
      employment_type: 'Permanent',
      hire_date: new Date().toISOString().split('T')[0],
      status: 'active',
      base_salary: 0,
      salary_payment_frequency: 'monthly',
      annual_leave_entitlement: 12,
      sick_leave_entitlement: 4,
      cpf_membership_no: '',
      background_check_status: 'Pending',
      emergency_contact_name: '',
      emergency_contact_relationship: '',
      emergency_contact_phone: '',
    });
    setShowNewForm(true);
    setActiveTab('personal');
  };

  const handleSaveStaff = async () => {
    if (!editForm.first_name || !editForm.last_name || !editForm.email || !editForm.position) {
      showToast('❌ Please fill in required fields (First Name, Last Name, Email, Position)', 'error');
      return;
    }

    try {
      setLoading(true);
      if (selectedStaff && selectedStaff.id) {
        const response = await staffAPI.update(selectedStaff.id, editForm);
        if (response.success) {
          setStaffList(staffList.map(s => s.id === selectedStaff.id ? response.data : s));
          showToast(`✅ Staff information updated for ${editForm.first_name} ${editForm.last_name}`, 'success');
        }
      } else {
        const response = await staffAPI.create(editForm as StaffComprehensive);
        if (response.success) {
          setStaffList([...staffList, response.data]);
          showToast(`✅ New staff ${response.data.first_name} ${response.data.last_name} (${response.data.staff_id}) created`, 'success');
          setShowNewForm(false);
        }
      }
      setSelectedStaff(null);
      setEditForm({});
    } catch (error) {
      console.error('Error saving staff:', error);
      showToast('❌ Failed to save staff', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteStaff = async () => {
    if (!selectedStaff || !window.confirm(`Delete ${selectedStaff.first_name} ${selectedStaff.last_name}? This action cannot be undone.`)) {
      return;
    }

    try {
      setLoading(true);
      if (selectedStaff.id) {
        const response = await staffAPI.delete(selectedStaff.id);
        if (response.success) {
          setStaffList(staffList.filter(s => s.id !== selectedStaff.id));
          showToast(`✅ Staff member deleted`, 'success');
          setSelectedStaff(null);
          setEditForm({});
        }
      }
    } catch (error) {
      console.error('Error deleting staff:', error);
      showToast('❌ Failed to delete staff', 'error');
    } finally {
      setLoading(false);
    }
  };

  const tabStyle = (tab: string) => ({
    padding: '6px 10px',
    background: activeTab === tab ? '#FF6B35' : '#f0f0f0',
    color: activeTab === tab ? 'white' : '#333',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '11px',
    whiteSpace: 'nowrap' as const,
    flexShrink: 0,
  });

  const formFieldStyle = {
    width: '100%',
    padding: '6px 8px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '11px',
    boxSizing: 'border-box' as const,
  };

  const sectionStyle = {
    padding: '10px',
    background: '#F5F5F5',
    borderRadius: '6px',
    borderLeft: '3px solid #FF6B35',
  };

  return (
    <AdminLayout>
      <div style={{ padding: '16px', background: '#fff', minHeight: '100vh' }}>
        <ToastContainer toasts={toasts} onClose={removeToast} />

        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#333', margin: 0 }}>
              👥 Comprehensive Staff Information Manager
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
            Complete staff profiles with personal, employment, background check, and document information
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '16px', height: 'calc(100vh - 160px)' }}>
          {/* STAFF LIST SIDEBAR */}
          <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexShrink: 0 }}>
              <h3 style={{ margin: 0, fontSize: '13px', fontWeight: '600', color: '#333' }}>
                Staff {loading ? '⏳' : `(${staffList.length})`}
              </h3>
              <button
                onClick={handleNewStaff}
                style={{
                  padding: '6px 10px',
                  background: '#FF6B35',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  fontSize: '11px',
                }}
              >
                + Add
              </button>
            </div>
            <div style={{ display: 'grid', gap: '8px', overflowY: 'auto', flex: 1 }}>
              {staffList.map(staff => (
                <div
                  key={staff.id}
                  onClick={() => handleSelectStaff(staff)}
                  style={{
                    padding: '12px',
                    background: selectedStaff?.id === staff.id ? '#FFD9B3' : 'white',
                    border: selectedStaff?.id === staff.id ? '2px solid #FF6B35' : '1px solid #ddd',
                    borderRadius: '6px',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ fontWeight: '600', fontSize: '12px', color: '#333', marginBottom: '2px' }}>
                    {staff.first_name} {staff.last_name}
                  </div>
                  <div style={{ fontSize: '11px', color: '#666', marginBottom: '4px' }}>
                    {staff.staff_id} • {staff.position}
                  </div>
                  <div style={{ display: 'flex', gap: '6px', fontSize: '10px' }}>
                    <span style={{
                      padding: '2px 6px',
                      background: staff.status === 'active' ? '#E8F5E9' : '#F5F5F5',
                      color: staff.status === 'active' ? '#2E7D32' : '#999',
                      borderRadius: '2px',
                      fontWeight: '600',
                    }}>
                      {staff.status || 'active'}
                    </span>
                    <span style={{
                      padding: '2px 6px',
                      background: staff.background_check_status === 'Passed' ? '#E8F5E9' : staff.background_check_status === 'Pending' ? '#FFF3E0' : '#FFEBEE',
                      color: staff.background_check_status === 'Passed' ? '#2E7D32' : staff.background_check_status === 'Pending' ? '#F57F17' : '#C62828',
                      borderRadius: '2px',
                      fontWeight: '600',
                    }}>
                      {staff.background_check_status || 'Pending'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* EDIT FORM WITH TABS */}
          <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            {selectedStaff || showNewForm ? (
              <div style={{ padding: '12px', background: 'white', border: '2px solid #FFD9B3', borderRadius: '8px', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                <h3 style={{ margin: '0 0 10px 0', fontSize: '14px', fontWeight: '600', color: '#333' }}>
                  {showNewForm ? 'New Staff Member' : `${editForm.first_name} ${editForm.last_name}`}
                </h3>

                {/* TAB NAVIGATION */}
                <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', marginBottom: '12px', paddingBottom: '6px', borderBottom: '1px solid #f0f0f0', flexShrink: 0 }}>
                  {(['personal', 'address', 'employment', 'emergency', 'education', 'skills', 'bank', 'background', 'documents'] as const).map(tab => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      style={tabStyle(tab)}
                      title={tab.charAt(0).toUpperCase() + tab.slice(1)}
                    >
                      {tab === 'personal' && 'Personal'}
                      {tab === 'address' && 'Address'}
                      {tab === 'employment' && 'Employment'}
                      {tab === 'emergency' && 'Emergency'}
                      {tab === 'education' && 'Education'}
                      {tab === 'skills' && 'Skills'}
                      {tab === 'bank' && 'Bank'}
                      {tab === 'background' && 'Background'}
                      {tab === 'documents' && 'Documents'}
                    </button>
                  ))}
                </div>

                <div style={{ display: 'grid', gap: '12px', overflowY: 'auto', flex: 1 }}>
                  {/* PERSONAL TAB */}
                  {activeTab === 'personal' && (
                    <>
                      <div style={sectionStyle}>
                        <div style={{ fontSize: '11px', fontWeight: '600', color: '#333', marginBottom: '8px' }}>Personal Information</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                          <div>
                            <label style={{ fontSize: '11px', fontWeight: '600', color: '#666', display: 'block', marginBottom: '4px' }}>First Name *</label>
                            <input type="text" value={editForm.first_name || ''} onChange={e => setEditForm({ ...editForm, first_name: e.target.value })} style={formFieldStyle} />
                          </div>
                          <div>
                            <label style={{ fontSize: '11px', fontWeight: '600', color: '#666', display: 'block', marginBottom: '4px' }}>Last Name *</label>
                            <input type="text" value={editForm.last_name || ''} onChange={e => setEditForm({ ...editForm, last_name: e.target.value })} style={formFieldStyle} />
                          </div>
                          <div style={{ gridColumn: '1 / -1' }}>
                            <label style={{ fontSize: '11px', fontWeight: '600', color: '#666', display: 'block', marginBottom: '4px' }}>Email *</label>
                            <input type="email" value={editForm.email || ''} onChange={e => setEditForm({ ...editForm, email: e.target.value })} style={formFieldStyle} />
                          </div>
                          <div>
                            <label style={{ fontSize: '11px', fontWeight: '600', color: '#666', display: 'block', marginBottom: '4px' }}>Phone</label>
                            <input type="tel" value={editForm.phone || ''} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} style={formFieldStyle} />
                          </div>
                          <div>
                            <label style={{ fontSize: '11px', fontWeight: '600', color: '#666', display: 'block', marginBottom: '4px' }}>NRIC</label>
                            <input type="text" placeholder="e.g., S1234567A" value={editForm.nric || ''} onChange={e => setEditForm({ ...editForm, nric: e.target.value })} style={formFieldStyle} />
                          </div>
                          <div>
                            <label style={{ fontSize: '11px', fontWeight: '600', color: '#666', display: 'block', marginBottom: '4px' }}>Residential Status</label>
                            <select value={editForm.residential_status || 'Work Permit'} onChange={e => setEditForm({ ...editForm, residential_status: e.target.value })} style={formFieldStyle}>
                              {RESIDENTIAL_STATUS.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {/* ADDRESS TAB */}
                  {activeTab === 'address' && (
                    <>
                      <div style={sectionStyle}>
                        <div style={{ fontSize: '12px', fontWeight: '600', color: '#333', marginBottom: '10px' }}>Home Address</div>
                        <div style={{ display: 'grid', gap: '12px' }}>
                          <div style={{ gridColumn: '1 / -1' }}>
                            <label style={{ fontSize: '11px', fontWeight: '600', color: '#666', display: 'block', marginBottom: '4px' }}>Street Address</label>
                            <textarea value={editForm.home_address || ''} onChange={e => setEditForm({ ...editForm, home_address: e.target.value })} style={{ ...formFieldStyle, minHeight: '80px' }} />
                          </div>
                          <div>
                            <label style={{ fontSize: '11px', fontWeight: '600', color: '#666', display: 'block', marginBottom: '4px' }}>City</label>
                            <input type="text" value={editForm.city || ''} onChange={e => setEditForm({ ...editForm, city: e.target.value })} style={formFieldStyle} />
                          </div>
                          <div>
                            <label style={{ fontSize: '11px', fontWeight: '600', color: '#666', display: 'block', marginBottom: '4px' }}>Postal Code</label>
                            <input type="text" value={editForm.postal_code || ''} onChange={e => setEditForm({ ...editForm, postal_code: e.target.value })} style={formFieldStyle} />
                          </div>
                          <div>
                            <label style={{ fontSize: '11px', fontWeight: '600', color: '#666', display: 'block', marginBottom: '4px' }}>Country</label>
                            <input type="text" value={editForm.country || 'Singapore'} onChange={e => setEditForm({ ...editForm, country: e.target.value })} style={formFieldStyle} />
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {/* EMPLOYMENT TAB */}
                  {activeTab === 'employment' && (
                    <>
                      <div style={sectionStyle}>
                        <div style={{ fontSize: '12px', fontWeight: '600', color: '#333', marginBottom: '10px' }}>Employment Information</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                          <div>
                            <label style={{ fontSize: '11px', fontWeight: '600', color: '#666', display: 'block', marginBottom: '4px' }}>Position *</label>
                            <input type="text" value={editForm.position || ''} onChange={e => setEditForm({ ...editForm, position: e.target.value })} style={formFieldStyle} />
                          </div>
                          <div>
                            <label style={{ fontSize: '11px', fontWeight: '600', color: '#666', display: 'block', marginBottom: '4px' }}>Department</label>
                            <select value={editForm.department || 'Operations'} onChange={e => setEditForm({ ...editForm, department: e.target.value })} style={formFieldStyle}>
                              {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                          </div>
                          <div>
                            <label style={{ fontSize: '11px', fontWeight: '600', color: '#666', display: 'block', marginBottom: '4px' }}>Hire Date</label>
                            <input type="date" value={editForm.hire_date || ''} onChange={e => setEditForm({ ...editForm, hire_date: e.target.value })} style={formFieldStyle} />
                          </div>
                          <div>
                            <label style={{ fontSize: '11px', fontWeight: '600', color: '#666', display: 'block', marginBottom: '4px' }}>Employment Type</label>
                            <select value={editForm.employment_type || 'Permanent'} onChange={e => setEditForm({ ...editForm, employment_type: e.target.value })} style={formFieldStyle}>
                              {EMPLOYMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                          </div>
                          <div>
                            <label style={{ fontSize: '11px', fontWeight: '600', color: '#666', display: 'block', marginBottom: '4px' }}>Probation End Date</label>
                            <input type="date" value={editForm.probation_end_date || ''} onChange={e => setEditForm({ ...editForm, probation_end_date: e.target.value })} style={formFieldStyle} />
                          </div>
                          <div>
                            <label style={{ fontSize: '11px', fontWeight: '600', color: '#666', display: 'block', marginBottom: '4px' }}>Manager ID</label>
                            <input type="text" value={editForm.manager_id || ''} onChange={e => setEditForm({ ...editForm, manager_id: e.target.value })} style={formFieldStyle} />
                          </div>
                          <div>
                            <label style={{ fontSize: '11px', fontWeight: '600', color: '#666', display: 'block', marginBottom: '4px' }}>Cost Center</label>
                            <input type="text" value={editForm.cost_center || ''} onChange={e => setEditForm({ ...editForm, cost_center: e.target.value })} style={formFieldStyle} />
                          </div>
                          <div>
                            <label style={{ fontSize: '11px', fontWeight: '600', color: '#666', display: 'block', marginBottom: '4px' }}>Base Salary</label>
                            <input type="number" value={editForm.base_salary || ''} onChange={e => setEditForm({ ...editForm, base_salary: parseFloat(e.target.value) })} style={formFieldStyle} />
                          </div>
                          <div>
                            <label style={{ fontSize: '11px', fontWeight: '600', color: '#666', display: 'block', marginBottom: '4px' }}>Annual Leave Entitlement</label>
                            <input type="number" value={editForm.annual_leave_entitlement || 12} onChange={e => setEditForm({ ...editForm, annual_leave_entitlement: parseInt(e.target.value) })} style={formFieldStyle} />
                          </div>
                          <div>
                            <label style={{ fontSize: '11px', fontWeight: '600', color: '#666', display: 'block', marginBottom: '4px' }}>Sick Leave Entitlement</label>
                            <input type="number" value={editForm.sick_leave_entitlement || 4} onChange={e => setEditForm({ ...editForm, sick_leave_entitlement: parseInt(e.target.value) })} style={formFieldStyle} />
                          </div>
                          <div style={{ gridColumn: '1 / -1' }}>
                            <label style={{ fontSize: '11px', fontWeight: '600', color: '#666', display: 'block', marginBottom: '4px' }}>Onboarding Notes</label>
                            <textarea value={editForm.onboarding_notes || ''} onChange={e => setEditForm({ ...editForm, onboarding_notes: e.target.value })} style={{ ...formFieldStyle, minHeight: '80px' }} />
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {/* EMERGENCY CONTACT TAB */}
                  {activeTab === 'emergency' && (
                    <>
                      <div style={sectionStyle}>
                        <div style={{ fontSize: '12px', fontWeight: '600', color: '#333', marginBottom: '10px' }}>Emergency Contact</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                          <div style={{ gridColumn: '1 / -1' }}>
                            <label style={{ fontSize: '11px', fontWeight: '600', color: '#666', display: 'block', marginBottom: '4px' }}>Contact Name</label>
                            <input type="text" value={editForm.emergency_contact_name || ''} onChange={e => setEditForm({ ...editForm, emergency_contact_name: e.target.value })} style={formFieldStyle} />
                          </div>
                          <div>
                            <label style={{ fontSize: '11px', fontWeight: '600', color: '#666', display: 'block', marginBottom: '4px' }}>Relationship</label>
                            <input type="text" placeholder="e.g., Spouse, Parent, Sibling" value={editForm.emergency_contact_relationship || ''} onChange={e => setEditForm({ ...editForm, emergency_contact_relationship: e.target.value })} style={formFieldStyle} />
                          </div>
                          <div>
                            <label style={{ fontSize: '11px', fontWeight: '600', color: '#666', display: 'block', marginBottom: '4px' }}>Phone</label>
                            <input type="tel" value={editForm.emergency_contact_phone || ''} onChange={e => setEditForm({ ...editForm, emergency_contact_phone: e.target.value })} style={formFieldStyle} />
                          </div>
                          <div style={{ gridColumn: '1 / -1' }}>
                            <label style={{ fontSize: '11px', fontWeight: '600', color: '#666', display: 'block', marginBottom: '4px' }}>Email</label>
                            <input type="email" value={editForm.emergency_contact_email || ''} onChange={e => setEditForm({ ...editForm, emergency_contact_email: e.target.value })} style={formFieldStyle} />
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {/* EDUCATION TAB */}
                  {activeTab === 'education' && (
                    <>
                      <div style={sectionStyle}>
                        <div style={{ fontSize: '12px', fontWeight: '600', color: '#333', marginBottom: '10px' }}>Education & Qualifications</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                          <div>
                            <label style={{ fontSize: '11px', fontWeight: '600', color: '#666', display: 'block', marginBottom: '4px' }}>Qualification Type</label>
                            <select style={formFieldStyle}>
                              {QUALIFICATION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                          </div>
                          <div style={{ gridColumn: '1 / -1' }}>
                            <label style={{ fontSize: '11px', fontWeight: '600', color: '#666', display: 'block', marginBottom: '4px' }}>School/University</label>
                            <input type="text" placeholder="e.g., National University of Singapore" style={formFieldStyle} />
                          </div>
                          <div>
                            <label style={{ fontSize: '11px', fontWeight: '600', color: '#666', display: 'block', marginBottom: '4px' }}>Field of Study</label>
                            <input type="text" placeholder="e.g., Computer Science" style={formFieldStyle} />
                          </div>
                          <div>
                            <label style={{ fontSize: '11px', fontWeight: '600', color: '#666', display: 'block', marginBottom: '4px' }}>Graduation Date</label>
                            <input type="date" style={formFieldStyle} />
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {/* SKILLS TAB */}
                  {activeTab === 'skills' && (
                    <>
                      <div style={sectionStyle}>
                        <div style={{ fontSize: '12px', fontWeight: '600', color: '#333', marginBottom: '10px' }}>Skills</div>
                        <div style={{ display: 'grid', gap: '12px' }}>
                          <div style={{ padding: '8px', background: '#FFF3E4', borderRadius: '4px', fontSize: '11px', color: '#B5651D' }}>
                            💡 Skills can be auto-extracted from uploaded CV using AI
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <div>
                              <label style={{ fontSize: '11px', fontWeight: '600', color: '#666', display: 'block', marginBottom: '4px' }}>Skill Name</label>
                              <input type="text" placeholder="e.g., Python, Project Management" style={formFieldStyle} />
                            </div>
                            <div>
                              <label style={{ fontSize: '11px', fontWeight: '600', color: '#666', display: 'block', marginBottom: '4px' }}>Skill Level</label>
                              <select style={formFieldStyle}>
                                {SKILL_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                              </select>
                            </div>
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {/* BANK TAB */}
                  {activeTab === 'bank' && (
                    <>
                      <div style={sectionStyle}>
                        <div style={{ fontSize: '12px', fontWeight: '600', color: '#333', marginBottom: '10px' }}>Bank & Payroll Information</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                          <div style={{ gridColumn: '1 / -1' }}>
                            <label style={{ fontSize: '11px', fontWeight: '600', color: '#666', display: 'block', marginBottom: '4px' }}>Account Holder Name</label>
                            <input type="text" value={editForm.bank_account_name || ''} onChange={e => setEditForm({ ...editForm, bank_account_name: e.target.value })} style={formFieldStyle} />
                          </div>
                          <div>
                            <label style={{ fontSize: '11px', fontWeight: '600', color: '#666', display: 'block', marginBottom: '4px' }}>Account Number</label>
                            <input type="text" value={editForm.bank_account_number || ''} onChange={e => setEditForm({ ...editForm, bank_account_number: e.target.value })} style={formFieldStyle} />
                          </div>
                          <div>
                            <label style={{ fontSize: '11px', fontWeight: '600', color: '#666', display: 'block', marginBottom: '4px' }}>Bank Code/SWIFT</label>
                            <input type="text" value={editForm.bank_code || ''} onChange={e => setEditForm({ ...editForm, bank_code: e.target.value })} style={formFieldStyle} />
                          </div>
                          <div style={{ gridColumn: '1 / -1' }}>
                            <label style={{ fontSize: '11px', fontWeight: '600', color: '#666', display: 'block', marginBottom: '4px' }}>Salary Payment Frequency</label>
                            <select value={editForm.salary_payment_frequency || 'monthly'} onChange={e => setEditForm({ ...editForm, salary_payment_frequency: e.target.value })} style={formFieldStyle}>
                              <option value="weekly">Weekly</option>
                              <option value="bi-weekly">Bi-weekly</option>
                              <option value="monthly">Monthly</option>
                            </select>
                          </div>
                          <div style={{ gridColumn: '1 / -1' }}>
                            <label style={{ fontSize: '11px', fontWeight: '600', color: '#666', display: 'block', marginBottom: '4px' }}>CPF Membership No.</label>
                            <input type="text" value={editForm.cpf_membership_no || ''} onChange={e => setEditForm({ ...editForm, cpf_membership_no: e.target.value })} style={formFieldStyle} />
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {/* BACKGROUND CHECK TAB */}
                  {activeTab === 'background' && (
                    <>
                      <div style={sectionStyle}>
                        <div style={{ fontSize: '12px', fontWeight: '600', color: '#333', marginBottom: '10px' }}>Background Check</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                          <div>
                            <label style={{ fontSize: '11px', fontWeight: '600', color: '#666', display: 'block', marginBottom: '4px' }}>Status</label>
                            <select value={editForm.background_check_status || 'Pending'} onChange={e => setEditForm({ ...editForm, background_check_status: e.target.value })} style={formFieldStyle}>
                              {BACKGROUND_CHECK_STATUS.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                          </div>
                          <div>
                            <label style={{ fontSize: '11px', fontWeight: '600', color: '#666', display: 'block', marginBottom: '4px' }}>Check Date</label>
                            <input type="date" value={editForm.background_check_date || ''} onChange={e => setEditForm({ ...editForm, background_check_date: e.target.value })} style={formFieldStyle} />
                          </div>
                          <div style={{ gridColumn: '1 / -1' }}>
                            <label style={{ fontSize: '11px', fontWeight: '600', color: '#666', display: 'block', marginBottom: '4px' }}>Check Type</label>
                            <input type="text" placeholder="e.g., Criminal, Employment History, Education, All" value={editForm.background_check_type || ''} onChange={e => setEditForm({ ...editForm, background_check_type: e.target.value })} style={formFieldStyle} />
                          </div>
                          <div style={{ gridColumn: '1 / -1' }}>
                            <label style={{ fontSize: '11px', fontWeight: '600', color: '#666', display: 'block', marginBottom: '4px' }}>Notes/Results</label>
                            <textarea value={editForm.background_check_notes || ''} onChange={e => setEditForm({ ...editForm, background_check_notes: e.target.value })} style={{ ...formFieldStyle, minHeight: '80px' }} placeholder="e.g., Passed all checks, No criminal records found..." />
                          </div>
                          <div style={{ gridColumn: '1 / -1' }}>
                            <label style={{ fontSize: '11px', fontWeight: '600', color: '#666', display: 'block', marginBottom: '4px' }}>Visa/Work Permit Expiry Date</label>
                            <input type="date" value={editForm.visa_work_permit_expiry || ''} onChange={e => setEditForm({ ...editForm, visa_work_permit_expiry: e.target.value })} style={formFieldStyle} />
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {/* DOCUMENTS TAB */}
                  {activeTab === 'documents' && (
                    <>
                      <div style={sectionStyle}>
                        <div style={{ fontSize: '12px', fontWeight: '600', color: '#333', marginBottom: '10px' }}>Documents & Attachments</div>
                        <div style={{ display: 'grid', gap: '12px' }}>
                          <div style={{ padding: '8px', background: '#E8F5E9', borderRadius: '4px', fontSize: '11px', color: '#1B5E20' }}>
                            📄 Upload CV, certificates, background check results, and other documents
                          </div>
                          <div>
                            <label style={{ fontSize: '11px', fontWeight: '600', color: '#666', display: 'block', marginBottom: '4px' }}>Document Type</label>
                            <select style={formFieldStyle}>
                              {DOCUMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                          </div>
                          <div>
                            <label style={{ fontSize: '11px', fontWeight: '600', color: '#666', display: 'block', marginBottom: '4px' }}>Upload File</label>
                            <input type="file" style={formFieldStyle} />
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* ACTION BUTTONS */}
                <div style={{ display: 'flex', gap: '8px', marginTop: '20px', paddingTop: '16px', borderTop: '2px solid #f0f0f0' }}>
                  <button
                    onClick={handleSaveStaff}
                    style={{
                      flex: 1,
                      padding: '10px',
                      background: '#FF6B35',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      fontSize: '12px',
                    }}
                  >
                    💾 Save Staff Information
                  </button>
                  {selectedStaff && (
                    <button
                      onClick={handleDeleteStaff}
                      style={{
                        padding: '10px 16px',
                        background: '#f44336',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        fontSize: '12px',
                      }}
                    >
                      🗑️ Delete
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ padding: '40px', textAlign: 'center', color: '#999' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>👥</div>
                <div>Select a staff member from the list or create a new one to get started</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default StaffInfoEditorEnhanced;
