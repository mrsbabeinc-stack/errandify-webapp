import { useEffect, useState } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface Invite {
  id: number;
  role: 'manager' | 'staff';
  position: string | null;
  invited_at: string;
  company_id: number;
  company_name: string;
  uen: string;
  logo_url: string | null;
  invited_by_name: string | null;
}

/**
 * Invitations waiting for the signed-in person. Only they can accept — nobody
 * can be attached to a company without agreeing to it. Renders nothing when
 * there's nothing pending, so it can sit safely on a shared screen.
 */
export default function MyCompanyInvites({ onAccepted }: { onAccepted?: () => void }) {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [busy, setBusy] = useState<number | null>(null);
  const [msg, setMsg] = useState('');

  const auth = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

  const load = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/companies/invites/mine`, auth());
      setInvites(res.data?.data?.invites || []);
    } catch {
      setInvites([]);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const respond = async (id: number, action: 'accept' | 'decline') => {
    setBusy(id);
    setMsg('');
    try {
      const res = await axios.post(`${API_URL}/api/companies/invites/${id}/${action}`, {}, auth());
      setMsg(res.data?.message || 'Done');
      await load();
      if (action === 'accept') onAccepted?.();
    } catch (err: any) {
      setMsg(err?.response?.data?.error || 'That did not go through.');
    } finally {
      setBusy(null);
    }
  };

  if (invites.length === 0) {
    return msg ? <p className="text-[12.5px] font-semibold text-ok px-1">{msg}</p> : null;
  }

  return (
    <div className="grid gap-2.5">
      {invites.map((i) => (
        <div key={i.id} className="rounded-company border border-errandify-orange bg-errandify-orange-wash p-4 grid gap-3">
          <div className="flex items-center gap-3">
            {i.logo_url ? (
              <img src={i.logo_url} alt="" className="w-10 h-10 rounded-xl object-cover shrink-0 border border-white" />
            ) : (
              <span className="w-10 h-10 rounded-xl bg-white grid place-items-center text-lg shrink-0">🏢</span>
            )}
            <div className="min-w-0">
              <p className="font-extrabold text-[14px] text-errandify-orange-deep truncate">
                {i.company_name} invited you
              </p>
              <p className="text-[12px] text-errandify-orange-deep/90">
                As <b className="capitalize">{i.role}</b>
                {i.position ? ` · ${i.position}` : ''}
                {i.invited_by_name ? ` · from ${i.invited_by_name}` : ''}
              </p>
            </div>
          </div>

          <p className="text-[12px] text-errandify-orange-deep/90 leading-snug">
            {i.role === 'staff'
              ? "You'll see errands allocated to you, and can start and finish jobs. Your personal account stays separate."
              : "You'll be able to post errands, make offers and allocate work for this company. Your personal account stays separate."}
          </p>

          <div className="flex gap-2">
            <button
              onClick={() => respond(i.id, 'accept')}
              disabled={busy === i.id}
              className="flex-1 bg-errandify-orange text-white font-bold text-[13px] py-2.5 rounded-full disabled:opacity-60"
            >
              {busy === i.id ? 'Joining…' : 'Accept'}
            </button>
            <button
              onClick={() => respond(i.id, 'decline')}
              disabled={busy === i.id}
              className="bg-white text-gray-600 font-bold text-[13px] px-5 py-2.5 rounded-full border border-gray-200 disabled:opacity-60"
            >
              Decline
            </button>
          </div>
        </div>
      ))}
      {msg && <p className="text-[12.5px] font-semibold text-ok px-1">{msg}</p>}
    </div>
  );
}
