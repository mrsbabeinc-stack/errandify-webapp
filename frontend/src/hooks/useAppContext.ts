import { useEffect, useState, useCallback } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const STORAGE_KEY = 'activeContext';

export type ContextMode = 'personal' | 'company';
export type CompanyRole = 'owner' | 'manager' | 'staff';

export interface MyCompany {
  id: number;
  name: string;
  uen: string;
  my_role: CompanyRole;
  can_act_for_company: boolean;
  on_leave: boolean;
  certified: boolean;
  logo_url?: string;
}

export interface AppContextState {
  loading: boolean;
  /** null when the person isn't linked to any company */
  company: MyCompany | null;
  mode: ContextMode;
  /** true when they have a company but haven't picked a context this session */
  needsChoice: boolean;
  setMode: (m: ContextMode) => void;
  refresh: () => void;
}

/**
 * Which "hat" the signed-in person is wearing: their own account, or their
 * company. Everything company-scoped is still enforced server-side by role —
 * this only decides which screens we show, so the personal and company worlds
 * stop bleeding into each other.
 */
export function useAppContext(): AppContextState {
  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState<MyCompany | null>(null);
  const [mode, setModeState] = useState<ContextMode>(
    () => (localStorage.getItem(STORAGE_KEY) as ContextMode) || 'personal'
  );
  const [chosen, setChosen] = useState<boolean>(() => !!localStorage.getItem(STORAGE_KEY));

  const load = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setCompany(null);
      setLoading(false);
      return;
    }
    try {
      const res = await axios.get(`${API_URL}/api/companies/user/my-company`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCompany(res.data?.data || null);
    } catch {
      // 404 simply means "no company" — that's a normal state, not an error
      setCompany(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const setMode = useCallback((m: ContextMode) => {
    localStorage.setItem(STORAGE_KEY, m);
    setModeState(m);
    setChosen(true);
  }, []);

  // If they have no company there is nothing to choose — never show a
  // one-option screen. Force personal so company routes can't be reached.
  const effectiveMode: ContextMode = company ? mode : 'personal';

  return {
    loading,
    company,
    mode: effectiveMode,
    needsChoice: !loading && !!company && !chosen,
    setMode,
    refresh: load,
  };
}

/** Clears the chosen context — call on logout so the next person starts fresh. */
export function clearAppContext() {
  localStorage.removeItem(STORAGE_KEY);
}
