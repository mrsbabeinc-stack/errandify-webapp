import { useEffect, useState } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface StaffRow {
  id: number;
  user_id: number;
  role: string;
  position: string | null;
  status: 'pending' | 'active' | 'on_leave' | 'inactive' | 'resigned';
  display_name: string;
  profile_image_url: string | null;
}

/**
 * Assign a confirmed company errand to a staff member.
 *
 * People on leave are shown but not selectable, with the reason visible — a
 * missing name leaves a manager wondering. The server re-checks leave when the
 * allocation is saved, so a stale screen can't assign someone who's away.
 */
export default function AllocateStaffPicker({
  companyId,
  errandId,
  errandTitle,
  currentStaffId,
  onAllocated,
  onClose,
}: {
  companyId: number;
  errandId: number;
  errandTitle?: string;
  currentStaffId?: number | null;
  onAllocated?: () => void;
  onClose?: () => void;
}) {
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [done, setDone] = useState('');

  const auth = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

  useEffect(() => {
    const load = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/companies/${companyId}/staff`, auth());
        setStaff(res.data?.data?.staff || []);
      } catch (err: any) {
        setError(err?.response?.data?.error || 'Could not load your team.');
      } finally {
        setLoading(false);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  const allocate = async (staffUserId: number) => {
    setBusy(staffUserId);
    setError('');
    setDone('');
    try {
      const res = await axios.post(
        `${API_URL}/api/companies/${companyId}/errands/${errandId}/allocate`,
        { staffUserId },
        auth()
      );
      setDone(res.data?.message || 'Allocated');
      onAllocated?.();
    } catch (err: any) {
      // The server re-checks leave at save time; surface its reason verbatim
      setError(err?.response?.data?.error || 'Could not allocate that errand.');
    } finally {
      setBusy(null);
    }
  };

  const assignable = staff.filter((s) => s.status === 'active');
  const away = staff.filter((s) => s.status === 'on_leave');

  return (
    <div className="rounded-company border border-gray-200 bg-white p-4 grid gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-extrabold text-[14.5px] text-gray-800 tracking-tight">Who's doing this job?</p>
          {errandTitle && <p className="text-[12.5px] text-gray-600 truncate">{errandTitle}</p>}
        </div>
        {onClose && (
          <button onClick={onClose} className="text-gray-400 text-lg leading-none shrink-0" aria-label="Close">
            ✕
          </button>
        )}
      </div>

      {loading ? (
        <p className="text-[12.5px] text-gray-500">Loading your team…</p>
      ) : staff.length === 0 ? (
        <div className="rounded-company bg-gray-50 border border-gray-200 p-4 text-center grid gap-1.5">
          <p className="font-bold text-[13px] text-gray-800">No team members yet</p>
          <p className="text-[12px] text-gray-600">Invite staff under My Staff, then allocate work to them here.</p>
        </div>
      ) : (
        <>
          <div className="grid gap-1.5">
            {assignable.map((s) => {
              const isCurrent = currentStaffId === s.user_id;
              return (
                <button
                  key={s.id}
                  onClick={() => allocate(s.user_id)}
                  disabled={busy !== null || isCurrent}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-company border text-left transition-colors disabled:opacity-70 ${
                    isCurrent
                      ? 'border-kampung-jade bg-kampung-jade-wash'
                      : 'border-gray-200 bg-white hover:border-errandify-orange'
                  }`}
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
                      {s.position || s.role}
                    </span>
                  </span>
                  <span className="text-[11.5px] font-bold shrink-0">
                    {isCurrent ? (
                      <span className="text-ok">Assigned</span>
                    ) : busy === s.user_id ? (
                      <span className="text-gray-500">Assigning…</span>
                    ) : (
                      <span className="text-errandify-orange-deep">Assign</span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>

          {assignable.length === 0 && (
            <p className="text-[12.5px] text-gray-600">
              Nobody is available to take this on right now.
            </p>
          )}

          {/* Shown, but not selectable — a missing name is more confusing than a greyed one */}
          {away.length > 0 && (
            <div className="grid gap-1.5">
              <p className="text-[11.5px] font-bold text-gray-500">On leave — can't be assigned</p>
              {away.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center gap-3 px-3 py-2 rounded-company border border-gray-200 bg-gray-50 opacity-70"
                >
                  <span className="w-7 h-7 rounded-full bg-gray-200 text-gray-500 grid place-items-center text-[11px] font-extrabold shrink-0">
                    {(s.display_name || '?').charAt(0).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-bold text-[12.5px] text-gray-600 truncate">{s.display_name}</span>
                  </span>
                  <span className="text-[11px] font-bold text-gray-500 shrink-0">On leave</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {error && <p className="text-[12.5px] font-semibold text-danger">{error}</p>}
      {done && <p className="text-[12.5px] font-semibold text-ok">{done}</p>}
    </div>
  );
}
