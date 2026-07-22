import { useEffect, useState } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface StaffRow {
  id: number;
  user_id: number;
  role: 'owner' | 'manager' | 'staff';
  position: string | null;
  status: 'pending' | 'active' | 'on_leave' | 'inactive' | 'resigned';
  invited_at: string | null;
  join_date: string | null;
  display_name: string;
  alias: string | null;
  profile_image_url: string | null;
}

const STATUS: Record<string, { label: string; cls: string }> = {
  pending: { label: 'Invite sent', cls: 'bg-kampung-sun-wash text-warn' },
  active: { label: 'Active', cls: 'bg-kampung-jade-wash text-ok' },
  on_leave: { label: 'On leave', cls: 'bg-gray-100 text-gray-600' },
  inactive: { label: 'Inactive', cls: 'bg-gray-100 text-gray-500' },
  resigned: { label: 'Left', cls: 'bg-gray-100 text-gray-500' },
};

/**
 * Team management — invite staff by NRIC and see who's on the team.
 * Invites are by NRIC rather than email because an NRIC is tied to a
 * SingPass-verified human we already have; nobody gains access until they accept.
 */
export default function CompanyTeam({ companyId, myRole }: { companyId: number; myRole?: string }) {
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [pendingInvites, setPendingInvites] = useState(0);
  const [loading, setLoading] = useState(true);

  const [nric, setNric] = useState('');
  const [role, setRole] = useState<'staff' | 'manager'>('staff');
  const [position, setPosition] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState('');

  const auth = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

  const load = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/companies/${companyId}/staff`, auth());
      setStaff(res.data?.data?.staff || []);
      setPendingInvites(res.data?.data?.pendingInvites || 0);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Could not load your team.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  const invite = async () => {
    setError('');
    setDone('');
    if (!nric.trim()) return setError('Enter their NRIC or FIN.');
    setBusy(true);
    try {
      const res = await axios.post(
        `${API_URL}/api/companies/${companyId}/staff/invite`,
        { nric: nric.trim(), role, position: position.trim() || null },
        auth()
      );
      setDone(res.data?.message || 'Invite sent.');
      setNric('');
      setPosition('');
      load();
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Could not send that invite.');
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <div className="p-5 text-center text-gray-500 text-sm">Loading your team…</div>;

  return (
    <div className="grid gap-3">
      {/* Invite */}
      <div className="rounded-company border border-gray-200 bg-white p-4 grid gap-3">
        <div>
          <p className="font-extrabold text-[14.5px] text-gray-800 tracking-tight">Invite a team member</p>
          <p className="text-[12.5px] text-gray-600 mt-1">
            They need an Errandify account first (SingPass sign-up). Nothing is shared with them until they accept.
          </p>
        </div>

        <div className="grid sm:grid-cols-[1fr_auto_auto] gap-2.5">
          <input
            value={nric}
            onChange={(e) => setNric(e.target.value.toUpperCase())}
            placeholder="NRIC / FIN e.g. S1234567A"
            maxLength={9}
            className="px-3 py-2.5 rounded-company border border-gray-200 bg-white text-[13px] text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-errandify-orange"
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as 'staff' | 'manager')}
            className="px-3 py-2.5 rounded-company border border-gray-200 bg-white text-[13px] text-gray-800 focus:outline-none focus:border-errandify-orange"
          >
            <option value="staff">Staff</option>
            {/* Only an owner may appoint a manager */}
            {myRole === 'owner' && <option value="manager">Manager</option>}
          </select>
          <button
            onClick={invite}
            disabled={busy}
            className="bg-errandify-orange text-white font-bold text-[13px] px-5 py-2.5 rounded-full disabled:opacity-60 whitespace-nowrap"
          >
            {busy ? 'Sending…' : 'Send invite'}
          </button>
        </div>

        <input
          value={position}
          onChange={(e) => setPosition(e.target.value)}
          placeholder="Their job title (optional) — e.g. Cleaner"
          className="px-3 py-2.5 rounded-company border border-gray-200 bg-white text-[13px] text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-errandify-orange"
        />

        {error && <p className="text-[12.5px] font-semibold text-danger">{error}</p>}
        {done && <p className="text-[12.5px] font-semibold text-ok">{done}</p>}
      </div>

      {/* Team */}
      <div className="flex items-center justify-between gap-3 px-1">
        <p className="font-bold text-[13px] text-gray-700">
          Your team{staff.length ? ` · ${staff.length}` : ''}
        </p>
        {pendingInvites > 0 && (
          <span className="bg-kampung-sun-wash text-warn text-[11px] font-bold px-2.5 py-1 rounded-full">
            {pendingInvites} awaiting reply
          </span>
        )}
      </div>

      {staff.length === 0 ? (
        <div className="rounded-company border border-gray-200 bg-white p-6 text-center grid gap-2 justify-items-center">
          <span className="text-2xl">👥</span>
          <p className="font-bold text-gray-800 text-sm">No team members yet</p>
          <p className="text-[12.5px] text-gray-600 max-w-xs">
            Invite someone above and they'll show here once they accept. You can then allocate errands to them.
          </p>
        </div>
      ) : (
        <div className="rounded-company border border-gray-200 bg-white overflow-hidden">
          {staff.map((s) => {
            const st = STATUS[s.status] || { label: s.status, cls: 'bg-gray-100 text-gray-600' };
            return (
              <div
                key={s.id}
                className="flex items-center gap-3 px-3.5 py-2.5 border-b border-gray-200 last:border-b-0"
              >
                {s.profile_image_url ? (
                  <img src={s.profile_image_url} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
                ) : (
                  <span className="w-8 h-8 rounded-full bg-errandify-orange-wash text-errandify-orange-deep grid place-items-center text-[12px] font-extrabold shrink-0">
                    {(s.display_name || '?').charAt(0).toUpperCase()}
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block font-bold text-[13px] text-gray-800 truncate">{s.display_name}</span>
                  <span className="block text-[11.5px] text-gray-500 capitalize">
                    {s.role}
                    {s.position ? ` · ${s.position}` : ''}
                  </span>
                </span>
                <span className={`${st.cls} text-[11px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap shrink-0`}>
                  {st.label}
                </span>
              </div>
            );
          })}
        </div>
      )}

      <p className="text-[11.5px] text-gray-500 px-1">
        Only <b>active</b> members can be allocated errands. Someone on leave is skipped automatically.
      </p>
    </div>
  );
}
