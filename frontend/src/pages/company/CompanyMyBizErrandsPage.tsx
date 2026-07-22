import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface BizErrand {
  id: number;
  formatted_id: string;
  title: string;
  category: string;
  budget: string | number;
  deadline: string | null;
  location: string | null;
  postal_code: string | null;
  status: string;
  created_at: string;
  accepted_bid_id: number | null;
  posted_by: string;
  offer_count: number;
  pending_offers: number;
}

/** Sort weight — what the company must act on comes first. */
const STATUS_WEIGHT: Record<string, number> = {
  open: 0,
  in_progress: 1,
  confirmed: 1,
  completed_unconfirmed: 2,
  completed: 3,
  rated: 4,
  cancelled: 5,
  expired: 6,
};

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  open: { label: 'Waiting for offers', cls: 'bg-kampung-sun-wash text-warn' },
  in_progress: { label: 'In progress', cls: 'bg-kampung-jade-wash text-ok' },
  confirmed: { label: 'Confirmed', cls: 'bg-kampung-jade-wash text-ok' },
  completed_unconfirmed: { label: 'Awaiting review', cls: 'bg-kampung-sun-wash text-warn' },
  completed: { label: 'Completed', cls: 'bg-gray-100 text-gray-600' },
  rated: { label: 'Rated & closed', cls: 'bg-gray-100 text-gray-600' },
  cancelled: { label: 'Cancelled', cls: 'bg-kampung-rose-wash text-danger' },
  expired: { label: 'Expired', cls: 'bg-gray-100 text-gray-500' },
};

/**
 * MyBizErrands — the company's own errands page. Mirrors what the personal
 * MyErrands page can do (search, status filter, offer filter, priority sort)
 * but every row is the COMPANY's errand, with who posted it and how many
 * offers are waiting for the team.
 */
export default function CompanyMyBizErrandsPage({ companyId }: { companyId: number }) {
  const navigate = useNavigate();
  const [errands, setErrands] = useState<BizErrand[]>([]);
  const [summary, setSummary] = useState({ total: 0, offersToReview: 0, inProgress: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [offerFilter, setOfferFilter] = useState<'all' | 'needs-review' | 'no-offers'>('all');

  const load = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/api/companies/${companyId}/asker/errands`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setErrands(res.data?.data?.errands || []);
      setSummary(res.data?.data?.summary || { total: 0, offersToReview: 0, inProgress: 0 });
      setError('');
    } catch (err: any) {
      setError(
        err?.response?.status === 403
          ? "You don't have access to this company's errands."
          : 'Could not load your company errands.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  const statusCounts = useMemo(() => {
    const c: Record<string, number> = { all: errands.length };
    errands.forEach((e) => {
      c[e.status] = (c[e.status] || 0) + 1;
    });
    return c;
  }, [errands]);

  const visible = useMemo(() => {
    return errands
      .filter((e) => {
        if (statusFilter !== 'all' && e.status !== statusFilter) return false;
        if (offerFilter === 'needs-review' && e.pending_offers < 1) return false;
        if (offerFilter === 'no-offers' && e.offer_count > 0) return false;
        if (search.trim()) {
          const q = search.toLowerCase();
          const hay = `${e.title} ${e.formatted_id} ${e.location || ''} ${e.category || ''} ${e.posted_by || ''}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        // Offers waiting always float to the top — that's money on the table
        if (a.pending_offers !== b.pending_offers) return b.pending_offers - a.pending_offers;
        const wa = STATUS_WEIGHT[a.status] ?? 9;
        const wb = STATUS_WEIGHT[b.status] ?? 9;
        if (wa !== wb) return wa - wb;
        const da = a.deadline ? new Date(a.deadline).getTime() : Infinity;
        const db = b.deadline ? new Date(b.deadline).getTime() : Infinity;
        return da - db;
      });
  }, [errands, statusFilter, offerFilter, search]);

  const due = (deadline: string | null) => {
    if (!deadline) return null;
    const d = new Date(deadline);
    const hrs = (d.getTime() - Date.now()) / 36e5;
    if (hrs < 0) return { text: 'Overdue', urgent: true };
    if (hrs < 24) return { text: `in ${Math.max(1, Math.round(hrs))}h`, urgent: true };
    return { text: d.toLocaleDateString('en-SG', { day: 'numeric', month: 'short' }), urgent: false };
  };

  if (loading) return <div className="p-6 text-center text-gray-500 text-sm">Loading your company errands…</div>;
  if (error) return <div className="p-4 rounded-company bg-kampung-rose-wash text-danger text-sm font-semibold">{error}</div>;

  return (
    <div className="grid gap-3">
      {/* What needs the team first */}
      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={() => { setOfferFilter('needs-review'); setStatusFilter('all'); }}
          className="text-left rounded-company bg-kampung-rose-wash px-3 py-2"
        >
          <div className="text-lg font-extrabold leading-none text-danger">{summary.offersToReview}</div>
          <div className="text-[11px] font-semibold text-danger mt-0.5">Offers to review</div>
        </button>
        <button
          onClick={() => { setStatusFilter('in_progress'); setOfferFilter('all'); }}
          className="text-left rounded-company bg-kampung-jade-wash px-3 py-2"
        >
          <div className="text-lg font-extrabold leading-none text-ok">{summary.inProgress}</div>
          <div className="text-[11px] font-semibold text-ok mt-0.5">In progress</div>
        </button>
        <button
          onClick={() => { setStatusFilter('all'); setOfferFilter('all'); }}
          className="text-left rounded-company bg-errandify-orange-wash px-3 py-2"
        >
          <div className="text-lg font-extrabold leading-none text-errandify-orange-deep">{summary.total}</div>
          <div className="text-[11px] font-semibold text-errandify-orange-deep mt-0.5">All posted</div>
        </button>
      </div>

      {/* Search + filters */}
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search title, errand ID, area or who posted it…"
        className="w-full px-3 py-2 rounded-company border border-gray-200 bg-white text-[13px] text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-errandify-orange"
      />

      <div className="flex gap-1.5 flex-wrap">
        {['all', 'open', 'in_progress', 'completed', 'rated', 'expired']
          .filter((s) => s === 'all' || statusCounts[s])
          .map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`text-[11.5px] font-bold px-3 py-1.5 rounded-full border ${
                statusFilter === s
                  ? 'bg-errandify-orange border-errandify-orange text-white'
                  : 'bg-white border-gray-200 text-gray-600'
              }`}
            >
              {s === 'all' ? 'All' : STATUS_LABEL[s]?.label || s}
              <span className="ml-1.5 opacity-70">{statusCounts[s] || 0}</span>
            </button>
          ))}
        {offerFilter !== 'all' && (
          <button
            onClick={() => setOfferFilter('all')}
            className="text-[11.5px] font-bold px-3 py-1.5 rounded-full border border-kampung-rose bg-kampung-rose-wash text-danger"
          >
            {offerFilter === 'needs-review' ? 'Needs review' : 'No offers'} ✕
          </button>
        )}
      </div>

      {visible.length === 0 ? (
        <div className="rounded-company border border-gray-200 bg-white p-6 text-center grid gap-2 justify-items-center">
          <span className="text-2xl">📋</span>
          <p className="font-bold text-gray-800 text-sm">
            {errands.length === 0 ? 'No company errands yet' : 'Nothing matches those filters'}
          </p>
          <p className="text-[12.5px] text-gray-600 max-w-xs">
            {errands.length === 0
              ? "Post your first errand and neighbours' offers will land here for your team to review."
              : 'Try clearing the search or status filter.'}
          </p>
          {errands.length === 0 && (
            <button
              onClick={() => navigate('/company/post-errand')}
              className="mt-1 bg-errandify-orange text-white font-bold text-[13px] px-5 py-2.5 rounded-full"
            >
              Post an errand
            </button>
          )}
        </div>
      ) : (
        <div className="rounded-company border border-gray-200 bg-white overflow-hidden">
          {visible.map((e) => {
            const d = due(e.deadline);
            const st = STATUS_LABEL[e.status] || { label: e.status, cls: 'bg-gray-100 text-gray-600' };
            return (
              // Row is a plain container so the "Assign staff" button isn't nested
              // inside another button (invalid HTML, and confusing for screen readers)
              <div key={e.id} className="border-b border-gray-200 last:border-b-0 hover:bg-gray-50">
              <button
                onClick={() => navigate(`/errand/${e.id}`)}
                className="w-full text-left grid grid-cols-[1fr_auto] gap-x-3 gap-y-0.5 px-3.5 py-2.5"
              >
                <span className="font-bold text-[13px] text-gray-800 truncate">{e.title}</span>
                <span className="row-span-2 self-center grid gap-1 justify-items-end">
                  <span className="font-extrabold text-[13px] text-gray-800">${Number(e.budget || 0).toFixed(0)}</span>
                  {e.pending_offers > 0 ? (
                    <span className="bg-kampung-rose-wash text-danger text-[10.5px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap">
                      {e.pending_offers} to review
                    </span>
                  ) : (
                    <span className={`${st.cls} text-[10.5px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap`}>
                      {st.label}
                    </span>
                  )}
                </span>
                <span className="text-[11px] text-gray-500 truncate">
                  {e.formatted_id}
                  {e.location ? ` · ${e.location}` : ''}
                  {d ? ` · ${d.urgent ? '⚠ ' : ''}${d.text}` : ''}
                  {e.posted_by ? ` · by ${e.posted_by}` : ''}
                </span>
              </button>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
