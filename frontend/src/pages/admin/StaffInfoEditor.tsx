import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast, ToastContainer } from '../../components/Toast';
import AdminLayout from '../../components/admin/AdminLayout';

interface Staff {
  id: string;
  staffId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  nric?: string;
  department: string;
  position: string;
  hireDate: string;
  employmentType: 'permanent' | 'contract' | 'part-time' | 'temporary';
  status: 'active' | 'inactive' | 'on-leave' | 'terminated';
  baseSalary?: number;
  annualLeaveEntitlement: number;
  sickLeaveEntitlement: number;
  cpfMembershipNo?: string;
  createdAt: string;
  lastModified: string;
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

  const [editForm, setEditForm] = useState<Partial<Staff>>({});

  // Demo data
  useEffect(() => {
    const demoStaff: Staff[] = [
      {
        id: 'staff_1',
        staffId: 'S001',
        firstName: 'John',
        lastName: 'Tan',
        email: 'john.tan@errandify.sg',
        phone: '+65 9123 4567',
        nric: 'S1234567A',
        department: 'Operations',
        position: 'Operations Manager',
        employmentType: 'permanent',
        hireDate: '2023-06-15',
        status: 'active',
        baseSalary: 4500,
        annualLeaveEntitlement: 12,
        sickLeaveEntitlement: 4,
        cpfMembershipNo: 'S1234567A',
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString(),
      },
      {
        id: 'staff_2',
        staffId: 'S002',
        firstName: 'Sarah',
        lastName: 'Lim',
        email: 'sarah.lim@errandify.sg',
        phone: '+65 8765 4321',
        nric: 'S2345678B',
        department: 'Finance',
        position: 'Accounts Manager',
        employmentType: 'permanent',
        hireDate: '2024-01-10',
        status: 'active',
        baseSalary: 5000,
        annualLeaveEntitlement: 12,
        sickLeaveEntitlement: 4,
        cpfMembershipNo: 'S2345678B',
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString(),
      },
      {
        id: 'staff_3',
        staffId: 'S003',
        firstName: 'Mike',
        lastName: 'Wong',
        email: 'mike.wong@errandify.sg',
        phone: '+65 9876 5432',
        nric: 'S3456789C',
        department: 'HR',
        position: 'HR Manager',
        employmentType: 'permanent',
        hireDate: '2022-03-20',
        status: 'active',
        baseSalary: 4800,
        annualLeaveEntitlement: 12,
        sickLeaveEntitlement: 4,
        cpfMembershipNo: 'S3456789C',
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString(),
      },
    ];

    setStaffList(demoStaff);
  }, []);

  const handleSelectStaff = (staff: Staff) => {
    setSelectedStaff(staff);
    setEditForm({ ...staff });
    setShowNewForm(false);
  };

  const handleNewStaff = () => {
    setSelectedStaff(null);
    setEditForm({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      nric: '',
      department: 'Operations',
      position: '',
      employmentType: 'permanent',
      hireDate: new Date().toISOString().split('T')[0],
      status: 'active',
      baseSalary: 0,
      annualLeaveEntitlement: 12,
      sickLeaveEntitlement: 4,
      cpfMembershipNo: '',
    });
    setShowNewForm(true);
  };

  const handleSaveStaff = () => {
    if (!editForm.firstName || !editForm.lastName || !editForm.email || !editForm.position) {
      showToast('❌ Please fill in all required fields', 'error');
      return;
    }

    if (selectedStaff) {
      // Update existing
      const updated = staffList.map(s =>
        s.id === selectedStaff.id
          ? { ...editForm, lastModified: new Date().toISOString() } as Staff
          : s
      );
      setStaffList(updated);
      setSelectedStaff(updated.find(s => s.id === selectedStaff.id) || null);
      showToast(`✅ Staff information updated for ${editForm.firstName} ${editForm.lastName}`, 'success');
    } else {
      // Create new
      const newStaff: Staff = {
        id: `staff_${Date.now()}`,
        staffId: `S${String(staffList.length + 1).padStart(3, '0')}`,
        firstName: editForm.firstName || '',
        lastName: editForm.lastName || '',
        email: editForm.email || '',
        phone: editForm.phone || '',
        nric: editForm.nric || '',
        department: editForm.department || 'Operations',
        position: editForm.position || '',
        employmentType: editForm.employmentType || 'permanent',
        hireDate: editForm.hireDate || new Date().toISOString().split('T')[0],
        status: editForm.status || 'active',
        baseSalary: editForm.baseSalary || 0,
        annualLeaveEntitlement: editForm.annualLeaveEntitlement || 12,
        sickLeaveEntitlement: editForm.sickLeaveEntitlement || 4,
        cpfMembershipNo: editForm.cpfMembershipNo || '',
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString(),
      };
      setStaffList([...staffList, newStaff]);
      showToast(`✅ New staff ${newStaff.firstName} ${newStaff.lastName} (${newStaff.staffId}) created`, 'success');
      setShowNewForm(false);
    }
    setSelectedStaff(null);
    setEditForm({});
  };

  const handleDeleteStaff = () => {
    if (!selectedStaff || !window.confirm(`Delete ${selectedStaff.firstName} ${selectedStaff.lastName}? This action cannot be undone.`)) {
      return;
    }
    setStaffList(staffList.filter(s => s.id !== selectedStaff.id));
    showToast(`✅ Staff member deleted`, 'success');
    setSelectedStaff(null);
    setEditForm({});
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
              <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: '#333' }}>Staff Members ({staffList.length})</h3>
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
                    {staff.firstName} {staff.lastName}
                  </div>
                  <div style={{ fontSize: '11px', color: '#666', marginBottom: '2px' }}>
                    {staff.staffId} • {staff.position}
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
                    {staff.status}
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
                  {showNewForm ? '➕ New Staff Member' : `✏️ Edit ${editForm.firstName} ${editForm.lastName}`}
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
                          value={editForm.firstName || ''}
                          onChange={e => setEditForm({ ...editForm, firstName: e.target.value })}
                          style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '12px', boxSizing: 'border-box' }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '11px', fontWeight: '600', color: '#666', display: 'block', marginBottom: '4px' }}>
                          Last Name *
                        </label>
                        <input
                          type="text"
                          value={editForm.lastName || ''}
                          onChange={e => setEditForm({ ...editForm, lastName: e.target.value })}
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
                          value={editForm.employmentType || 'permanent'}
                          onChange={e => setEditForm({ ...editForm, employmentType: e.target.value as any })}
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
                          value={editForm.hireDate || ''}
                          onChange={e => setEditForm({ ...editForm, hireDate: e.target.value })}
                          style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '12px', boxSizing: 'border-box' }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* LEAVE & CPF */}
                  <div style={{ padding: '12px', background: '#F5F5F5', borderRadius: '6px', borderLeft: '3px solid #2196F3' }}>
                    <div style={{ fontSize: '12px', fontWeight: '600', color: '#333', marginBottom: '10px' }}>Leave & CPF</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                      <div>
                        <label style={{ fontSize: '11px', fontWeight: '600', color: '#666', display: 'block', marginBottom: '4px' }}>
                          Annual Leave (days)
                        </label>
                        <input
                          type="number"
                          value={editForm.annualLeaveEntitlement || 12}
                          onChange={e => setEditForm({ ...editForm, annualLeaveEntitlement: parseInt(e.target.value) || 12 })}
                          style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '12px', boxSizing: 'border-box' }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '11px', fontWeight: '600', color: '#666', display: 'block', marginBottom: '4px' }}>
                          Sick Leave (days)
                        </label>
                        <input
                          type="number"
                          value={editForm.sickLeaveEntitlement || 4}
                          onChange={e => setEditForm({ ...editForm, sickLeaveEntitlement: parseInt(e.target.value) || 4 })}
                          style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '12px', boxSizing: 'border-box' }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '11px', fontWeight: '600', color: '#666', display: 'block', marginBottom: '4px' }}>
                          CPF Membership No
                        </label>
                        <input
                          type="text"
                          value={editForm.cpfMembershipNo || ''}
                          onChange={e => setEditForm({ ...editForm, cpfMembershipNo: e.target.value })}
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
