import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast, ToastContainer } from '../../components/Toast';
import AdminLayout from '../../components/admin/AdminLayout';
import { staffAPI } from '../../services/adminAPI';

interface Staff {
  id?: number;
  staff_id?: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  nric?: string;
  department?: string;
  position?: string;
  hire_date?: string;
  employment_type?: string;
  status?: string;
  base_salary?: number;
  annual_leave_entitlement?: number;
  sick_leave_entitlement?: number;
  cpf_membership_no?: string;
  created_at?: string;
  last_modified?: string;
}

const DEPARTMENTS = [
  'Operations',
  'Finance',
  'HR',
  'Marketing',
  'Sales',
  'IT',
  'Customer Service',
  'Product',
];

const StaffInfoEditor: React.FC = () => {
  const navigate = useNavigate();
  const { toasts, showToast, removeToast } = useToast();
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editForm, setEditForm] = useState<Partial<Staff>>({});

  // Load staff from API
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

  const handleSelectStaff = (staff: Staff) => {
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
      department: 'Operations',
      position: '',
      employment_type: 'permanent',
      hire_date: new Date().toISOString().split('T')[0],
      status: 'active',
      base_salary: 0,
      annual_leave_entitlement: 12,
      sick_leave_entitlement: 4,
      cpf_membership_no: '',
    });
    setShowNewForm(true);
  };

  const handleSaveStaff = async () => {
    if (!editForm.first_name || !editForm.last_name || !editForm.email || !editForm.position) {
      showToast('❌ Please fill in all required fields', 'error');
      return;
    }

    try {
      setLoading(true);
      if (selectedStaff && selectedStaff.id) {
        // Update existing
        const response = await staffAPI.update(selectedStaff.id, editForm);
        if (response.success) {
          setStaffList(staffList.map(s => s.id === selectedStaff.id ? response.data : s));
          showToast(`✅ Staff information updated for ${editForm.first_name} ${editForm.last_name}`, 'success');
        }
      } else {
        // Create new
        const response = await staffAPI.create(editForm as Staff);
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

  return (
    <AdminLayout>
      <div style={{ padding: '16px', background: '#fff', minHeight: '100vh' }}>
        <ToastContainer toasts={toasts} onClose={removeToast} />

        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#333', margin: 0 }}>
              👥 Staff Information Manager
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
            Create new staff, view, and edit staff information
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '350px 1fr', gap: '24px' }}>
          {/* STAFF LIST SIDEBAR */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: '#333' }}>
                Staff Members {loading ? '⏳' : `(${staffList.length})`}
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
            <div style={{ display: 'grid', gap: '8px', maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' }}>
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
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => {
                    if (selectedStaff?.id !== staff.id) {
                      e.currentTarget.style.background = '#FFF8F5';
                      e.currentTarget.style.borderColor = '#FFD9B3';
                    }
                  }}
                  onMouseLeave={e => {
                    if (selectedStaff?.id !== staff.id) {
                      e.currentTarget.style.background = 'white';
                      e.currentTarget.style.borderColor = '#ddd';
                    }
                  }}
                >
                  <div style={{ fontWeight: '600', fontSize: '12px', color: '#333', marginBottom: '2px' }}>
                    {staff.first_name} {staff.last_name}
                  </div>
                  <div style={{ fontSize: '11px', color: '#666', marginBottom: '2px' }}>
                    {staff.staff_id} • {staff.position}
                  </div>
                  <div style={{
                    display: 'inline-block',
                    padding: '2px 6px',
                    background: staff.status === 'active' ? '#E8F5E9' : '#F5F5F5',
                    color: staff.status === 'active' ? '#2E7D32' : '#999',
                    borderRadius: '2px',
                    fontSize: '10px',
                    fontWeight: '600',
                  }}>
                    {staff.status || 'active'}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* EDIT FORM */}
          <div>
            {selectedStaff || showNewForm ? (
              <div style={{ padding: '20px', background: 'white', border: '2px solid #FFD9B3', borderRadius: '8px' }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600', color: '#333' }}>
                  {showNewForm ? '➕ New Staff Member' : `✏️ Edit ${editForm.first_name} ${editForm.last_name}`}
                </h3>

                <div style={{ display: 'grid', gap: '12px' }}>
                  {/* PERSONAL INFO */}
                  <div style={{ padding: '12px', background: '#F5F5F5', borderRadius: '6px', borderLeft: '3px solid #FF6B35' }}>
                    <div style={{ fontSize: '12px', fontWeight: '600', color: '#333', marginBottom: '10px' }}>Personal Information</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div>
                        <label style={{ fontSize: '11px', fontWeight: '600', color: '#666', display: 'block', marginBottom: '4px' }}>
                          First Name *
                        </label>
                        <input
                          type="text"
                          value={editForm.first_name || ''}
                          onChange={e => setEditForm({ ...editForm, first_name: e.target.value })}
                          style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '12px', boxSizing: 'border-box' }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '11px', fontWeight: '600', color: '#666', display: 'block', marginBottom: '4px' }}>
                          Last Name *
                        </label>
                        <input
                          type="text"
                          value={editForm.last_name || ''}
                          onChange={e => setEditForm({ ...editForm, last_name: e.target.value })}
                          style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '12px', boxSizing: 'border-box' }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '11px', fontWeight: '600', color: '#666', display: 'block', marginBottom: '4px' }}>
                          Email *
                        </label>
                        <input
                          type="email"
                          value={editForm.email || ''}
                          onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                          style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '12px', boxSizing: 'border-box' }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '11px', fontWeight: '600', color: '#666', display: 'block', marginBottom: '4px' }}>
                          Phone
                        </label>
                        <input
                          type="tel"
                          value={editForm.phone || ''}
                          onChange={e => setEditForm({ ...editForm, phone: e.target.value })}
                          style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '12px', boxSizing: 'border-box' }}
                        />
                      </div>
                      <div style={{ gridColumn: '1 / -1' }}>
                        <label style={{ fontSize: '11px', fontWeight: '600', color: '#666', display: 'block', marginBottom: '4px' }}>
                          NRIC (Singapore)
                        </label>
                        <input
                          type="text"
                          placeholder="e.g., S1234567A"
                          value={editForm.nric || ''}
                          onChange={e => setEditForm({ ...editForm, nric: e.target.value })}
                          style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '12px', boxSizing: 'border-box' }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* EMPLOYMENT INFO */}
                  <div style={{ padding: '12px', background: '#F5F5F5', borderRadius: '6px', borderLeft: '3px solid #4CAF50' }}>
                    <div style={{ fontSize: '12px', fontWeight: '600', color: '#333', marginBottom: '10px' }}>Employment Information</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div>
                        <label style={{ fontSize: '11px', fontWeight: '600', color: '#666', display: 'block', marginBottom: '4px' }}>
                          Position *
                        </label>
                        <input
                          type="text"
                          value={editForm.position || ''}
                          onChange={e => setEditForm({ ...editForm, position: e.target.value })}
                          style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '12px', boxSizing: 'border-box' }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '11px', fontWeight: '600', color: '#666', display: 'block', marginBottom: '4px' }}>
                          Department
                        </label>
                        <select
                          value={editForm.department || ''}
                          onChange={e => setEditForm({ ...editForm, department: e.target.value })}
                          style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '12px', boxSizing: 'border-box' }}
                        >
                          {DEPARTMENTS.map(d => (
                            <option key={d} value={d}>{d}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label style={{ fontSize: '11px', fontWeight: '600', color: '#666', display: 'block', marginBottom: '4px' }}>
                          Employment Type
                        </label>
                        <select
                          value={editForm.employment_type || 'permanent'}
                          onChange={e => setEditForm({ ...editForm, employment_type: e.target.value as any })}
                          style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '12px', boxSizing: 'border-box' }}
                        >
                          <option value="permanent">Permanent</option>
                          <option value="contract">Contract</option>
                          <option value="part-time">Part-Time</option>
                          <option value="temporary">Temporary</option>
                        </select>
                      </div>
                      <div>
                        <label style={{ fontSize: '11px', fontWeight: '600', color: '#666', display: 'block', marginBottom: '4px' }}>
                          Status
                        </label>
                        <select
                          value={editForm.status || 'active'}
                          onChange={e => setEditForm({ ...editForm, status: e.target.value as any })}
                          style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '12px', boxSizing: 'border-box' }}
                        >
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                          <option value="on-leave">On Leave</option>
                          <option value="terminated">Terminated</option>
                        </select>
                      </div>
                      <div>
                        <label style={{ fontSize: '11px', fontWeight: '600', color: '#666', display: 'block', marginBottom: '4px' }}>
                          Hire Date
                        </label>
                        <input
                          type="date"
                          value={editForm.hire_date || ''}
                          onChange={e => setEditForm({ ...editForm, hire_date: e.target.value })}
                          style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '12px', boxSizing: 'border-box' }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* LEAVE & CPF */}
                  <div style={{ padding: '12px', background: '#F5F5F5', borderRadius: '6px', borderLeft: '3px solid #F0A81E' }}>
                    <div style={{ fontSize: '12px', fontWeight: '600', color: '#333', marginBottom: '10px' }}>Leave & CPF</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                      <div>
                        <label style={{ fontSize: '11px', fontWeight: '600', color: '#666', display: 'block', marginBottom: '4px' }}>
                          Annual Leave (days)
                        </label>
                        <input
                          type="number"
                          value={editForm.annual_leave_entitlement || 12}
                          onChange={e => setEditForm({ ...editForm, annual_leave_entitlement: parseInt(e.target.value) || 12 })}
                          style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '12px', boxSizing: 'border-box' }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '11px', fontWeight: '600', color: '#666', display: 'block', marginBottom: '4px' }}>
                          Sick Leave (days)
                        </label>
                        <input
                          type="number"
                          value={editForm.sick_leave_entitlement || 4}
                          onChange={e => setEditForm({ ...editForm, sick_leave_entitlement: parseInt(e.target.value) || 4 })}
                          style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '12px', boxSizing: 'border-box' }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '11px', fontWeight: '600', color: '#666', display: 'block', marginBottom: '4px' }}>
                          CPF Membership No
                        </label>
                        <input
                          type="text"
                          value={editForm.cpf_membership_no || ''}
                          onChange={e => setEditForm({ ...editForm, cpf_membership_no: e.target.value })}
                          style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '12px', boxSizing: 'border-box' }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* ACTION BUTTONS */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '16px' }}>
                    <button
                      onClick={handleSaveStaff}
                      style={{
                        padding: '10px',
                        background: '#4CAF50',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        fontSize: '12px',
                      }}
                    >
                      ✓ Save
                    </button>
                    {selectedStaff && (
                      <button
                        onClick={handleDeleteStaff}
                        style={{
                          padding: '10px',
                          background: '#FFEBEE',
                          color: '#C62828',
                          border: '1px solid #FFCDD2',
                          borderRadius: '4px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          fontSize: '12px',
                        }}
                      >
                        🗑️ Delete
                      </button>
                    )}
                    {!selectedStaff && (
                      <button
                        onClick={() => {
                          setShowNewForm(false);
                          setEditForm({});
                        }}
                        style={{
                          padding: '10px',
                          background: '#f5f5f5',
                          color: '#333',
                          border: '1px solid #ddd',
                          borderRadius: '4px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          fontSize: '12px',
                        }}
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ padding: '40px', textAlign: 'center', background: '#F5F5F5', borderRadius: '8px' }}>
                <div style={{ fontSize: '48px', marginBottom: '12px' }}>👤</div>
                <div style={{ fontSize: '16px', fontWeight: '600', color: '#333', marginBottom: '8px' }}>Select or Add Staff</div>
                <div style={{ fontSize: '14px', color: '#666' }}>
                  Click on a staff member from the list to edit, or click "+ Add" to create a new staff
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default StaffInfoEditor;
