import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface CompanyErrand {
  id: number;
  formatted_id: string;
  title: string;
  category: string;
  budget: string | number;
  deadline: string | null;
  location: string | null;
  status: string;
  posted_by: string;
  offer_count: number;
  pending_offers: number;
}

interface Summary {
  total: number;
  offersToReview: number;
  inProgress: number;
}

/**
 * Errands this COMPANY posted — not the signed-in person's own errands.
 * Reads /api/companies/:id/asker/errands so the company workspace never
 * falls back to the personal Home/Browse pages.
 */
export default function CompanyAskerErrands({ companyId }: { companyId: number }) {
  const navigate = useNavigate();
  const [errands, setErrands] = useState<CompanyErrand[]>([]);
  const [summary, setSummary] = useState<Summary>({ total: 0, offersToReview: 0, inProgress: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`${API_URL}/api/companies/${companyId}/asker/errands`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!active) return;
        setErrands(res.data?.data?.errands || []);
        setSummary(res.data?.data?.summary || { total: 0, offersToReview: 0, inProgress: 0 });
        setError('');
      } catch (err: any) {
        if (!active) return;
        setError(
          err?.response?.status === 403
            ? "You don't have access to this company's errands."
            : 'Could not load your company errands. Please try again.'
        );
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [companyId]);

  const statusChip = (status: string) => {
    const map: Record<string, { bg: string; fg: string; label: string }> = {
      open: { bg: 'bg-kampung-sun-wash', fg: 'text-warn', label: 'Waiting for offers' },
      in_progress: { bg: 'bg-kampung-jade-wash', fg: 'text-ok', label: 'In progress' },
      confirmed: { bg: 'bg-kampung-jade-wash', fg: 'text-ok', label: 'Confirmed' },
      completed: { bg: 'bg-gray-100', fg: 'text-gray-600', label: 'Completed' },
      rated: { bg: 'bg-gray-100', fg: 'text-gray-600', label: 'Rated & closed' },
      expired: { bg: 'bg-gray-100', fg: 'text-gray-500', label: 'Expired' },
      cancelled: { bg: 'bg-kampung-rose-wash', fg: 'text-danger', label: 'Cancelled' },
    };
    const s = map[status] || { bg: 'bg-gray-100', fg: 'text-gray-600', label: status };
    return (
      <span className={`${s.bg} ${s.fg} text-[11px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap`}>
        {s.label}
      </span>
    );
  };

  if (loading) return <div className="p-6 text-center text-gray-500 text-sm">Loading your company errands…</div>;

  if (error) {
    return (
      <div className="p-5 rounded-company bg-kampung-rose-wash text-danger text-sm font-semibold">{error}</div>
    );
  }

  return (
    <div className="grid gap-3">
      {/* What needs the company's attention, first */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-company bg-kampung-rose-wash px-3 py-2.5">
          <div className="text-xl font-extrabold leading-none text-danger">{summary.offersToReview}</div>
          <div className="text-[11px] font-semibold text-danger mt-1">Offers to review</div>
        </div>
        <div className="rounded-company bg-kampung-jade-wash px-3 py-2.5">
          <div className="text-xl font-extrabold leading-none text-ok">{summary.inProgress}</div>
          <div className="text-[11px] font-semibold text-ok mt-1">In progress</div>
        </div>
        <div className="rounded-company bg-errandify-orange-wash px-3 py-2.5">
          <div className="text-xl font-extrabold leading-none text-errandify-orange-deep">{summary.total}</div>
          <div className="text-[11px] font-semibold text-errandify-orange-deep mt-1">Posted total</div>
        </div>
      </div>

      <div className="flex items-start gap-2 rounded-company bg-errandify-orange-wash px-3 py-2.5">
        <span className="w-5 h-5 rounded-full bg-errandify-orange text-white text-[11px] font-extrabold grid place-items-center shrink-0">i</span>
        <p className="text-[12px] text-errandify-orange-deep leading-snug">
          These are your <strong>company's</strong> errands — separate from anything you post on your personal account.
        </p>
      </div>

      {errands.length === 0 ? (
        <div className="rounded-company border border-gray-200 bg-white p-6 text-center grid gap-2 justify-items-center">
          <span className="text-2xl">📋</span>
          <p className="font-bold text-gray-800 text-sm">No company errands yet</p>
          <p className="text-[12.5px] text-gray-600 max-w-xs">
            Post your first errand and offers from neighbours will show up here for your team to review.
          </p>
          <button
            onClick={() => navigate('/company/post-errand')}
            className="mt-1 bg-errandify-orange text-white font-bold text-[13px] px-5 py-2.5 rounded-full shadow-kampung-sm"
          >
            Post an errand
          </button>
        </div>
      ) : (
        <div className="rounded-company border border-gray-200 bg-white overflow-hidden">
          {errands.map((e) => (
            <button
              key={e.id}
              onClick={() => navigate(`/errand/${e.id}`)}
              className="w-full text-left grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 px-3.5 py-3 border-b border-gray-200 last:border-b-0 hover:bg-gray-50"
            >
              <span className="font-bold text-[13.5px] text-gray-800 tracking-tight">{e.title}</span>
              <span className="row-span-2 self-center grid gap-1.5 justify-items-end">
                <span className="font-extrabold text-[13.5px] text-gray-800">
                  ${Number(e.budget || 0).toFixed(0)}
                </span>
                {e.pending_offers > 0 ? (
                  <span className="bg-kampung-rose-wash text-danger text-[11px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap">
                    {e.pending_offers} to review
                  </span>
                ) : (
                  statusChip(e.status)
                )}
              </span>
              <span className="text-[11.5px] text-gray-500">
                {e.formatted_id}
                {e.location ? ` · ${e.location}` : ''}
                {e.offer_count > 0 ? ` · ${e.offer_count} offer${e.offer_count === 1 ? '' : 's'}` : ''}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
