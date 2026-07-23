/**
 * Lead Generation API client.
 *
 * The /api/admin/leads endpoints are admin-guarded at router level, so the
 * token has to go with every request or they answer 401 — the failure that
 * made the whole HR module look broken when adminAPI.ts shipped without it.
 * Same shape as financeAPI.ts, deliberately.
 */

const API_BASE = '/api/admin/leads';

function authHeaders(json = false): HeadersInit {
  const token = localStorage.getItem('token');
  const headers: Record<string, string> = {};
  if (json) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

/** Surfaces the server's own message so the UI can say what actually failed. */
async function request<T = any>(path: string, init?: RequestInit): Promise<T> {
  const hasBody = init?.body != null;
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { ...authHeaders(hasBody), ...(init?.headers || {}) },
  });

  let payload: any = null;
  try {
    payload = await response.json();
  } catch {
    // Non-JSON response (an HTML error page, say) — fall through to the status.
  }

  if (!response.ok || payload?.success === false) {
    const message =
      payload?.error ||
      (response.status === 401
        ? 'Your session has expired — please sign in again'
        : response.status === 403
        ? 'Admin access required'
        : `Request failed (${response.status})`);
    throw new Error(message);
  }
  return payload as T;
}

// ---------------------------------------------------------------- types

export type LeadStage =
  | 'new'
  | 'contacted'
  | 'qualified'
  | 'invited'
  | 'signed_up'
  | 'converted'
  | 'disqualified';

export type LeadType = 'individual' | 'company';

export interface Lead {
  id: number;
  lead_ref: string | null;
  lead_type: LeadType;
  full_name: string;
  email: string | null;
  mobile: string | null;
  company_name: string | null;
  uen: string | null;
  contact_person_role: string | null;
  staff_count_estimate: number | null;
  interested_categories: string[];
  service_areas: string[];
  source: string;
  source_detail: string | null;
  stage: LeadStage;
  owner_admin_id: number | null;
  owner_name?: string | null;
  disqualify_reason: string | null;
  notes: string | null;
  sourced_errand_id: number | null;
  consent_contact: boolean;
  consent_marketing: boolean;
  consent_at: string | null;
  converted_user_id: number | null;
  converted_at: string | null;
  purge_after: string;
  created_at: string;
  updated_at: string;
  events?: LeadEvent[];
}

export interface LeadEvent {
  id: number;
  lead_id: number;
  kind: string;
  note: string | null;
  actor_admin_id: number | null;
  actor_name?: string | null;
  created_at: string;
}

/** A category where demand is going unmet, and how much cover exists. */
export interface CategoryGap {
  category: string;
  unfilled: number;
  /** Still live — can be offered to someone today. */
  still_open: number;
  /** Timed out with nobody offering. Dead as a job, strongest signal of a gap. */
  expired: number;
  avg_budget: string | number | null;
  oldest_days: number | null;
  active_doers: number;
  leads_in_pipeline: number;
}

/** One unfilled errand — a call with a price attached, if it is still open. */
export interface UnfilledErrand {
  id: number;
  ref: string;
  title: string;
  category: string | null;
  status: 'open' | 'expired';
  location: string | null;
  budget: string | number | null;
  created_at: string;
  days_open: number;
}

export interface SupplyGap {
  byCategory: CategoryGap[];
  errands: UnfilledErrand[];
  totalUnfilled: number;
  stillOpen: number;
  expired: number;
}

export interface LeadStats {
  byStage: { stage: LeadStage; n: number }[];
  bySource: { source: string; n: number; converted: number }[];
  total: number;
  converted: number;
  purging_soon: number;
}

export interface NewLead {
  lead_type: LeadType;
  full_name: string;
  email?: string;
  mobile?: string;
  company_name?: string;
  uen?: string;
  contact_person_role?: string;
  staff_count_estimate?: number | string;
  interested_categories?: string[];
  service_areas?: string[];
  source?: string;
  source_detail?: string;
  notes?: string;
  sourced_errand_id?: number | null;
  consent_contact?: boolean;
  consent_marketing?: boolean;
}

// -------------------------------------------------------------- endpoints

export const leadsAPI = {
  supplyGap: () =>
    request<{ data: SupplyGap }>('/supply-gap').then((r) => r.data),

  stats: () => request<{ data: LeadStats }>('/stats').then((r) => r.data),

  list: (filters: Record<string, string> = {}) => {
    const query = new URLSearchParams(
      Object.entries(filters).filter(([, v]) => v)
    ).toString();
    return request<{ data: Lead[] }>(query ? `?${query}` : '').then((r) => r.data);
  },

  get: (id: number) => request<{ data: Lead }>(`/${id}`).then((r) => r.data),

  create: (lead: NewLead) =>
    request<{ data: Lead; merged?: boolean }>('', {
      method: 'POST',
      body: JSON.stringify(lead),
    }),

  update: (id: number, patch: Record<string, unknown>) =>
    request<{ data: Lead }>(`/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    }).then((r) => r.data),

  addNote: (id: number, note: string) =>
    request(`/${id}/note`, { method: 'POST', body: JSON.stringify({ note }) }),

  remove: (id: number) => request(`/${id}`, { method: 'DELETE' }),
};

export default leadsAPI;
