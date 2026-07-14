const API_BASE = '/api/admin';

export interface StaffInfo {
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
}

export interface SalaryRecord {
  id?: number;
  staff_id: string;
  staff_name?: string;
  position?: string;
  department?: string;
  base_salary: number;
  total_allowances?: number;
  gross_salary?: number;
  notes?: string;
  allowances?: Allowance[];
  benefits?: Benefit[];
}

export interface Allowance {
  id?: number;
  name: string;
  amount: number;
  frequency: string;
  description?: string;
}

export interface Benefit {
  id?: number;
  name: string;
  amount?: number;
  frequency?: string;
  description?: string;
}

export interface Holiday {
  id?: number;
  name: string;
  date: string;
  holiday_type: string;
  emoji?: string;
  description?: string;
  apply_to_staff?: string;
}

export interface Role {
  id?: number;
  name: string;
  description?: string;
  role_type?: string;
  permissions?: string[];
}

export interface LeaveRequest {
  id?: number;
  staff_id: string;
  staff_name?: string;
  leave_type: string;
  start_date: string;
  end_date?: string;
  period?: string;
  reason?: string;
  notes?: string;
  is_recurring?: boolean;
  recurring_pattern?: any;
  days_count?: number;
  status?: string;
  approved_by?: string;
  approval_notes?: string;
  created_at?: string;
  last_modified?: string;
}

// Staff Management APIs
export const staffAPI = {
  async getAll() {
    const response = await fetch(`${API_BASE}/staff`);
    if (!response.ok) throw new Error('Failed to fetch staff');
    return response.json();
  },

  async getById(id: number) {
    const response = await fetch(`${API_BASE}/staff/${id}`);
    if (!response.ok) throw new Error('Failed to fetch staff');
    return response.json();
  },

  async create(data: StaffInfo) {
    const response = await fetch(`${API_BASE}/staff`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create staff');
    return response.json();
  },

  async update(id: number, data: Partial<StaffInfo>) {
    const response = await fetch(`${API_BASE}/staff/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update staff');
    return response.json();
  },

  async delete(id: number) {
    const response = await fetch(`${API_BASE}/staff/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete staff');
    return response.json();
  },
};

// Salary & Benefits APIs
export const salaryAPI = {
  async getSalary(staffId: string) {
    const response = await fetch(`${API_BASE}/salary/${staffId}`);
    if (!response.ok) throw new Error('Failed to fetch salary');
    return response.json();
  },

  async updateSalary(staffId: string, data: Partial<SalaryRecord>) {
    const response = await fetch(`${API_BASE}/salary/${staffId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update salary');
    return response.json();
  },

  async addAllowance(staffId: string, allowance: Allowance) {
    const response = await fetch(`${API_BASE}/salary/${staffId}/allowances`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(allowance),
    });
    if (!response.ok) throw new Error('Failed to add allowance');
    return response.json();
  },

  async removeAllowance(allowanceId: number) {
    const response = await fetch(`${API_BASE}/allowances/${allowanceId}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to remove allowance');
    return response.json();
  },

  async addBenefit(staffId: string, benefit: Benefit) {
    const response = await fetch(`${API_BASE}/salary/${staffId}/benefits`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(benefit),
    });
    if (!response.ok) throw new Error('Failed to add benefit');
    return response.json();
  },

  async removeBenefit(benefitId: number) {
    const response = await fetch(`${API_BASE}/benefits/${benefitId}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to remove benefit');
    return response.json();
  },
};

// Holiday APIs
export const holidayAPI = {
  async getAll(year?: number, type?: string) {
    let url = `${API_BASE}/holidays`;
    const params = new URLSearchParams();
    if (year) params.append('year', year.toString());
    if (type && type !== 'all') params.append('type', type);
    if (params.toString()) url += `?${params.toString()}`;

    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch holidays');
    return response.json();
  },

  async getStats() {
    const response = await fetch(`${API_BASE}/holidays/stats/summary`);
    if (!response.ok) throw new Error('Failed to fetch stats');
    return response.json();
  },

  async create(holiday: Holiday) {
    const response = await fetch(`${API_BASE}/holidays`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(holiday),
    });
    if (!response.ok) throw new Error('Failed to create holiday');
    return response.json();
  },

  async update(id: number, holiday: Partial<Holiday>) {
    const response = await fetch(`${API_BASE}/holidays/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(holiday),
    });
    if (!response.ok) throw new Error('Failed to update holiday');
    return response.json();
  },

  async delete(id: number) {
    const response = await fetch(`${API_BASE}/holidays/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete holiday');
    return response.json();
  },
};

// RBAC APIs
export const rbacAPI = {
  async getRoles() {
    const response = await fetch(`${API_BASE}/roles`);
    if (!response.ok) throw new Error('Failed to fetch roles');
    return response.json();
  },

  async getPermissions() {
    const response = await fetch(`${API_BASE}/permissions`);
    if (!response.ok) throw new Error('Failed to fetch permissions');
    return response.json();
  },

  async createRole(role: Role) {
    const response = await fetch(`${API_BASE}/roles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(role),
    });
    if (!response.ok) throw new Error('Failed to create role');
    return response.json();
  },

  async updateRole(id: number, role: Partial<Role>) {
    const response = await fetch(`${API_BASE}/roles/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(role),
    });
    if (!response.ok) throw new Error('Failed to update role');
    return response.json();
  },

  async deleteRole(id: number) {
    const response = await fetch(`${API_BASE}/roles/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete role');
    return response.json();
  },

  async getUsers() {
    const response = await fetch(`${API_BASE}/users`);
    if (!response.ok) throw new Error('Failed to fetch users');
    return response.json();
  },

  async assignRoleToUser(userId: number, roleId: number) {
    const response = await fetch(`${API_BASE}/users/${userId}/roles/${roleId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) throw new Error('Failed to assign role');
    return response.json();
  },

  async removeRoleFromUser(userId: number, roleId: number) {
    const response = await fetch(`${API_BASE}/users/${userId}/roles/${roleId}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to remove role');
    return response.json();
  },

  async checkPermission(userId: number, permissionCode: string) {
    const response = await fetch(`${API_BASE}/check-permission`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, permissionCode }),
    });
    if (!response.ok) throw new Error('Failed to check permission');
    return response.json();
  },
};

// Leave Management APIs
export const leaveAPI = {
  async getAll(status?: string, staffId?: string, startDate?: string, endDate?: string) {
    let url = `${API_BASE}/leaves`;
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (staffId) params.append('staffId', staffId);
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (params.toString()) url += `?${params.toString()}`;

    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch leave requests');
    return response.json();
  },

  async getById(id: number) {
    const response = await fetch(`${API_BASE}/leaves/${id}`);
    if (!response.ok) throw new Error('Failed to fetch leave request');
    return response.json();
  },

  async create(leave: LeaveRequest) {
    const response = await fetch(`${API_BASE}/leaves`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(leave),
    });
    if (!response.ok) throw new Error('Failed to create leave request');
    return response.json();
  },

  async update(id: number, leave: Partial<LeaveRequest>) {
    const response = await fetch(`${API_BASE}/leaves/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(leave),
    });
    if (!response.ok) throw new Error('Failed to update leave request');
    return response.json();
  },

  async delete(id: number) {
    const response = await fetch(`${API_BASE}/leaves/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete leave request');
    return response.json();
  },

  async getLeaveBalance(staffId: string) {
    const response = await fetch(`${API_BASE}/leave-balance/${staffId}`);
    if (!response.ok) throw new Error('Failed to fetch leave balance');
    return response.json();
  },
};
