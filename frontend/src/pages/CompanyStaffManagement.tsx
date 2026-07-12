import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/CompanyStaffManagement.css';

interface Employee {
  id: number;
  user_id: number;
  user_name: string;
  user_email: string;
  role: 'manager' | 'employee';
  skills?: string;
  status: 'active' | 'on_leave' | 'resigned';
  hire_date?: string;
}

const CompanyStaffManagement: React.FC = () => {
  const navigate = useNavigate();
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
  const [companyId, setCompanyId] = useState<number | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [showCsvForm, setShowCsvForm] = useState(false);
  const [newEmployee, setNewEmployee] = useState({
    userId: '',
    role: 'employee',
    skills: '',
  });
  const [csvFile, setCsvFile] = useState<File | null>(null);

  useEffect(() => {
    fetchCompanyAndEmployees();
  }, []);

  const fetchCompanyAndEmployees = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      const companyRes = await fetch(`${API_URL}/api/companies/user/my-company`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!companyRes.ok) throw new Error('Company not found');

      const companyData = await companyRes.json();
      setCompanyId(companyData.data.id);

      const employeesRes = await fetch(
        `${API_URL}/api/companies/${companyData.data.id}/employees`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      const employeesData = await employeesRes.json();
      setEmployees(employeesData.data || []);
      setError('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId || !newEmployee.userId) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/companies/${companyId}/employees`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: parseInt(newEmployee.userId),
          role: newEmployee.role,
          skills: newEmployee.skills,
        }),
      });

      if (!res.ok) throw new Error('Failed to add employee');

      setShowAddForm(false);
      setNewEmployee({ userId: '', role: 'employee', skills: '' });
      fetchCompanyAndEmployees();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleCsvUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId || !csvFile) {
      setError('Please select a CSV file');
      return;
    }

    try {
      const text = await csvFile.text();
      const lines = text.split('\n').slice(1);
      const employees = lines
        .filter(line => line.trim())
        .map(line => {
          const [name, email, phone, role, skills] = line.split('|').map(s => s.trim());
          return { name, email, phone, role: role as 'manager' | 'employee', skills };
        });

      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/companies/${companyId}/employees/bulk-import`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ employees }),
      });

      if (!res.ok) throw new Error('Failed to import employees');

      const data = await res.json();
      alert(`Successfully imported ${data.data.successful} employees. Failed: ${data.data.failed}`);
      setShowCsvForm(false);
      setCsvFile(null);
      fetchCompanyAndEmployees();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleRemoveEmployee = async (userId: number) => {
    if (!window.confirm('Are you sure you want to remove this employee?')) return;

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/companies/${companyId}/employees/${userId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!res.ok) throw new Error('Failed to remove employee');

      fetchCompanyAndEmployees();
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (loading) return <div className="staff-page"><div className="loading">Loading staff...</div></div>;

  return (
    <div className="staff-page">
      <div className="page-header">
        <div className="header-content">
          <h1>Staff Management</h1>
          <p>Manage your company team members</p>
        </div>
        <div className="header-actions">
          <button className="btn-primary" onClick={() => setShowAddForm(!showAddForm)}>
            ➕ Add Employee
          </button>
          <button className="btn-secondary" onClick={() => setShowCsvForm(!showCsvForm)}>
            📤 Bulk Import (CSV)
          </button>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* Add Single Employee Form */}
      {showAddForm && (
        <form className="form-card" onSubmit={handleAddEmployee}>
          <h3>Add New Employee</h3>
          <div className="form-group">
            <label>User ID</label>
            <input
              type="number"
              value={newEmployee.userId}
              onChange={(e) => setNewEmployee({ ...newEmployee, userId: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label>Role</label>
            <select
              value={newEmployee.role}
              onChange={(e) => setNewEmployee({ ...newEmployee, role: e.target.value as any })}
            >
              <option value="employee">Employee</option>
              <option value="manager">Manager</option>
            </select>
          </div>
          <div className="form-group">
            <label>Skills (comma-separated)</label>
            <input
              type="text"
              value={newEmployee.skills}
              onChange={(e) => setNewEmployee({ ...newEmployee, skills: e.target.value })}
              placeholder="e.g., Cleaning, Customer Service"
            />
          </div>
          <div className="form-actions">
            <button type="submit" className="btn-primary">Add Employee</button>
            <button type="button" className="btn-secondary" onClick={() => setShowAddForm(false)}>Cancel</button>
          </div>
        </form>
      )}

      {/* CSV Upload Form */}
      {showCsvForm && (
        <form className="form-card" onSubmit={handleCsvUpload}>
          <h3>Bulk Import Employees (CSV)</h3>
          <p className="form-help">Format: Name|Email|Phone|Role|Skills</p>
          <div className="form-group">
            <label>CSV File</label>
            <input
              type="file"
              accept=".csv"
              onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
              required
            />
          </div>
          <div className="form-actions">
            <button type="submit" className="btn-primary">Import</button>
            <button type="button" className="btn-secondary" onClick={() => setShowCsvForm(false)}>Cancel</button>
          </div>
        </form>
      )}

      {/* Employees List */}
      <div className="employees-section">
        <h2>Team Members ({employees.length})</h2>

        {employees.length === 0 ? (
          <div className="empty-state">
            <p>No employees yet. Add your first team member!</p>
            <button className="btn-primary" onClick={() => setShowAddForm(true)}>
              ➕ Add Employee
            </button>
          </div>
        ) : (
          <div className="employees-table">
            <div className="table-header">
              <div className="col-name">Name</div>
              <div className="col-email">Email</div>
              <div className="col-role">Role</div>
              <div className="col-status">Status</div>
              <div className="col-skills">Skills</div>
              <div className="col-actions">Actions</div>
            </div>

            {employees.map(emp => (
              <div key={emp.id} className="table-row">
                <div className="col-name">
                  <div className="emp-avatar">{emp.user_name.charAt(0).toUpperCase()}</div>
                  <span>{emp.user_name}</span>
                </div>
                <div className="col-email">{emp.user_email}</div>
                <div className="col-role">
                  <span className={`role-badge ${emp.role}`}>{emp.role}</span>
                </div>
                <div className="col-status">
                  <span className={`status-badge ${emp.status}`}>
                    {emp.status === 'on_leave' ? '📅 On Leave' :
                     emp.status === 'resigned' ? '❌ Resigned' :
                     '✅ Active'}
                  </span>
                </div>
                <div className="col-skills">
                  {emp.skills ? <span className="skills-tag">{emp.skills}</span> : '-'}
                </div>
                <div className="col-actions">
                  <button
                    className="btn-danger"
                    onClick={() => handleRemoveEmployee(emp.user_id)}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CompanyStaffManagement;
