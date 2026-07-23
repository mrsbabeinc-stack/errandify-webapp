/**
 * Staff-facing attendance client.
 *
 * Separate from services/adminAPI.ts because this is the employee's own
 * surface, not an admin one: it is mounted on /api/staff-attendance and every
 * endpoint is scoped server-side to the caller's own record. None of these
 * calls take a staff id — the server resolves it from the login via
 * staff.user_id and refuses if the account is not linked.
 */

const API_BASE = '/api/staff-attendance';

async function request(path: string, init: RequestInit = {}) {
  const token = localStorage.getItem('token');
  const headers: Record<string, string> = {
    ...(init.body ? { 'Content-Type': 'application/json' } : {}),
    ...((init.headers as Record<string, string>) || {}),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${API_BASE}${path}`, { ...init, headers });

  if (!response.ok) {
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

export const staffAttendanceAPI = {
  today() {
    return request('/me/today');
  },

  clockIn(notes?: string) {
    return request('/me/clock-in', {
      method: 'POST',
      body: JSON.stringify({ notes }),
    });
  },

  clockOut(data: { break_minutes?: number; notes?: string } = {}) {
    return request('/me/clock-out', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  history(startDate?: string, endDate?: string) {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    const query = params.toString();
    return request(`/me/history${query ? `?${query}` : ''}`);
  },
};
