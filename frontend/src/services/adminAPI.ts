const API_BASE = '/api/admin';

/**
 * Every call in this file went out with no Authorization header, while all the
 * routers behind /api/admin require an admin token. The result was that the
 * whole HR module 401'd against a backend that was working correctly: staff,
 * salary, holidays, leaves and RBAC screens rendered empty or threw.
 *
 * The header is attached here rather than at each call site so that a request
 * added later cannot forget it — the same reasoning as the router-level guard
 * in routes/staffManagement.ts.
 */
async function request(path: string, init: RequestInit = {}) {
  const token = localStorage.getItem('token');
  const headers: Record<string, string> = {
    ...(init.body ? { 'Content-Type': 'application/json' } : {}),
    ...((init.headers as Record<string, string>) || {}),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${API_BASE}${path}`, { ...init, headers });

  if (!response.ok) {
    // Prefer the server's own message; callers surface it in a toast.
    let message = `Request failed (${response.status})`;
    try {
      const body = await response.json();
      if (body?.error) message = body.error;
    } catch {
      // Non-JSON error body — keep the status-code message.
    }
    throw new Error(message);
  }

  return response.json();
}

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
  deductions?: Deduction[];
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

export interface Deduction {
  id?: number;
  name: string;
  amount: number;
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
  getAll() {
    return request('/staff');
  },

  getById(id: number) {
    return request(`/staff/${id}`);
  },

  create(data: StaffInfo) {
    return request('/staff', { method: 'POST', body: JSON.stringify(data) });
  },

  update(id: number, data: Partial<StaffInfo>) {
    return request(`/staff/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  },

  delete(id: number) {
    return request(`/staff/${id}`, { method: 'DELETE' });
  },
};

// Salary & Benefits APIs
export const salaryAPI = {
  getAll() {
    return request('/salary');
  },

  getSalary(staffId: string) {
    return request(`/salary/${staffId}`);
  },

  updateSalary(staffId: string, data: Partial<SalaryRecord>) {
    return request(`/salary/${staffId}`, { method: 'POST', body: JSON.stringify(data) });
  },

  addAllowance(staffId: string, allowance: Allowance) {
    return request(`/salary/${staffId}/allowances`, {
      method: 'POST',
      body: JSON.stringify(allowance),
    });
  },

  removeAllowance(allowanceId: number) {
    return request(`/allowances/${allowanceId}`, { method: 'DELETE' });
  },

  addBenefit(staffId: string, benefit: Benefit) {
    return request(`/salary/${staffId}/benefits`, {
      method: 'POST',
      body: JSON.stringify(benefit),
    });
  },

  removeBenefit(benefitId: number) {
    return request(`/benefits/${benefitId}`, { method: 'DELETE' });
  },

  addDeduction(staffId: string, deduction: Deduction) {
    return request(`/salary/${staffId}/deductions`, {
      method: 'POST',
      body: JSON.stringify(deduction),
    });
  },

  removeDeduction(deductionId: number) {
    return request(`/deductions/${deductionId}`, { method: 'DELETE' });
  },
};

// Holiday APIs
export const holidayAPI = {
  getAll(year?: number, type?: string) {
    let url = '/holidays';
    const params = new URLSearchParams();
    if (year) params.append('year', year.toString());
    if (type && type !== 'all') params.append('type', type);
    if (params.toString()) url += `?${params.toString()}`;

    return request(url);
  },

  getStats() {
    return request('/holidays/stats/summary');
  },

  create(holiday: Holiday) {
    return request('/holidays', { method: 'POST', body: JSON.stringify(holiday) });
  },

  update(id: number, holiday: Partial<Holiday>) {
    return request(`/holidays/${id}`, { method: 'PUT', body: JSON.stringify(holiday) });
  },

  delete(id: number) {
    return request(`/holidays/${id}`, { method: 'DELETE' });
  },
};

// RBAC APIs
export const rbacAPI = {
  getRoles() {
    return request('/roles');
  },

  getPermissions() {
    return request('/permissions');
  },

  createRole(role: Role) {
    return request('/roles', { method: 'POST', body: JSON.stringify(role) });
  },

  updateRole(id: number, role: Partial<Role>) {
    return request(`/roles/${id}`, { method: 'PUT', body: JSON.stringify(role) });
  },

  deleteRole(id: number) {
    return request(`/roles/${id}`, { method: 'DELETE' });
  },

  /**
   * '/rbac-users', not '/users'. admin.ts is mounted first on /api/admin and
   * serves GET /users for platform user management, so this call was silently
   * returning the platform user list — with no roles on it — instead of the
   * RBAC one. routes/rbac.ts renamed its own route for exactly that reason.
   */
  getUsers() {
    return request('/rbac-users');
  },

  getRolePermissions(roleId: number | string) {
    return request(`/roles/${roleId}/permissions`);
  },

  setRolePermissions(roleId: number | string, permissionIds: number[]) {
    return request(`/roles/${roleId}/permissions`, {
      method: 'POST',
      body: JSON.stringify({ permissionIds }),
    });
  },

  assignRoleToUser(userId: number, roleId: number) {
    return request(`/users/${userId}/roles/${roleId}`, { method: 'POST' });
  },

  removeRoleFromUser(userId: number, roleId: number) {
    return request(`/users/${userId}/roles/${roleId}`, { method: 'DELETE' });
  },

  checkPermission(userId: number, permissionCode: string) {
    return request('/check-permission', {
      method: 'POST',
      body: JSON.stringify({ userId, permissionCode }),
    });
  },
};

// Leave Management APIs
export const leaveAPI = {
  getAll(status?: string, staffId?: string, startDate?: string, endDate?: string) {
    let url = '/leaves';
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (staffId) params.append('staffId', staffId);
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (params.toString()) url += `?${params.toString()}`;

    return request(url);
  },

  getById(id: number) {
    return request(`/leaves/${id}`);
  },

  create(leave: LeaveRequest) {
    return request('/leaves', { method: 'POST', body: JSON.stringify(leave) });
  },

  update(id: number, leave: Partial<LeaveRequest>) {
    return request(`/leaves/${id}`, { method: 'PUT', body: JSON.stringify(leave) });
  },

  delete(id: number) {
    return request(`/leaves/${id}`, { method: 'DELETE' });
  },

  getLeaveBalance(staffId: string) {
    return request(`/leave-balance/${staffId}`);
  },
};

// Probation APIs
export const probationAPI = {
  getAll(status?: string) {
    const query = status && status !== 'all' ? `?status=${encodeURIComponent(status)}` : '';
    return request(`/probation${query}`);
  },

  create(data: { staff_id: string; start_date: string; probation_length_days: number }) {
    return request('/probation', { method: 'POST', body: JSON.stringify(data) });
  },

  review(
    id: number,
    data: { status?: string; review_score?: number | null; reviewer_notes?: string; reviewed_by?: string }
  ) {
    return request(`/probation/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  },

  delete(id: number) {
    return request(`/probation/${id}`, { method: 'DELETE' });
  },
};

// Attendance & timesheet APIs
export const attendanceAPI = {
  getAll(params: { startDate?: string; endDate?: string; staffId?: string; status?: string } = {}) {
    const search = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v && v !== 'all') search.append(k, v);
    });
    const query = search.toString();
    return request(`/attendance${query ? `?${query}` : ''}`);
  },

  getSummary(date?: string) {
    return request(`/attendance/summary${date ? `?date=${date}` : ''}`);
  },

  getReport(startDate: string, endDate: string) {
    return request(`/attendance/report?startDate=${startDate}&endDate=${endDate}`);
  },

  save(data: {
    staff_id: string;
    work_date: string;
    clock_in?: string | null;
    clock_out?: string | null;
    break_minutes?: number;
    status?: string;
    notes?: string;
  }) {
    return request('/attendance', { method: 'POST', body: JSON.stringify(data) });
  },

  delete(id: number) {
    return request(`/attendance/${id}`, { method: 'DELETE' });
  },
};

// Job opening APIs
export const jobOpeningAPI = {
  getAll(status?: string) {
    const query = status && status !== 'all' ? `?status=${encodeURIComponent(status)}` : '';
    return request(`/job-openings${query}`);
  },

  getById(id: number) {
    return request(`/job-openings/${id}`);
  },

  create(data: Record<string, unknown>) {
    return request('/job-openings', { method: 'POST', body: JSON.stringify(data) });
  },

  update(id: number, data: Record<string, unknown>) {
    return request(`/job-openings/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  },

  delete(id: number) {
    return request(`/job-openings/${id}`, { method: 'DELETE' });
  },

  addQuestion(id: number, data: Record<string, unknown>) {
    return request(`/job-openings/${id}/questions`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  deleteQuestion(questionId: number) {
    return request(`/job-openings/questions/${questionId}`, { method: 'DELETE' });
  },

  invite(id: number, candidate: { candidate_name: string; candidate_email: string }) {
    return request(`/job-openings/${id}/invites`, {
      method: 'POST',
      body: JSON.stringify(candidate),
    });
  },

  invites(id: number) {
    return request(`/job-openings/${id}/invites`);
  },

  inviteAnswers(inviteId: number) {
    return request(`/invites/${inviteId}/answers`);
  },
};

export const timesheetAPI = {
  getAll(status?: string) {
    const query = status && status !== 'all' ? `?status=${encodeURIComponent(status)}` : '';
    return request(`/timesheets${query}`);
  },

  generate(weekStart: string, staffId?: string) {
    return request('/timesheets/generate', {
      method: 'POST',
      body: JSON.stringify({ week_start: weekStart, staff_id: staffId }),
    });
  },

  review(id: number, data: { status: string; approved_by?: string; review_notes?: string }) {
    return request(`/timesheets/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  },
};
