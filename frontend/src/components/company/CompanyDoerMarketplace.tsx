import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface MarketErrand {
  id: number;
  formatted_id: string;
  title: string;
  category: string;
  budget: string | number;
  deadline: string | null;
  location: string | null;
  posted_by: string;
  offer_count: number;
  already_offered: boolean | null;
}

/**
 * Marketplace for the COMPANY acting as a doer. Uses
 * /api/companies/:id/doer/marketplace, which excludes the company's own
 * errands so it can never bid on itself. Replaces the personal DoerBrowsePage
 * that was previously rendered inside the company dashboard.
 */
export default function CompanyDoerMarketplace({ companyId }: { companyId: number }) {
  const navigate = useNavigate();
  const [errands, setErrands] = useState<MarketErrand[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`${API_URL}/api/companies/${companyId}/doer/marketplace`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!active) return;
        setErrands(res.data?.data?.errands || []);
        setError('');
      } catch (err: any) {
        if (!active) return;
        setError(
          err?.response?.status === 403
            ? "You don't have access to this company's workspace."
            : 'Could not load the marketplace. Please try again.'
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

  const shown = errands.filter((e) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      e.title.toLowerCase().includes(q) ||
      (e.location || '').toLowerCase().includes(q) ||
      (e.category || '').toLowerCase().includes(q)
    );
  });

  const dueLabel = (deadline: string | null) => {
    if (!deadline) return null;
    const d = new Date(deadline);
    const hrs = (d.getTime() - Date.now()) / 36e5;
    if (hrs < 0) return { text: 'Closed', urgent: false };
    if (hrs < 24) return { text: `Closes in ${Math.max(1, Math.round(hrs))}h`, urgent: true };
    return { text: d.toLocaleDateString('en-SG', { day: 'numeric', month: 'short' }), urgent: false };
  };

  if (loading) return <div className="p-6 text-center text-gray-500 text-sm">Finding errands for your company…</div>;

  if (error) {
    return <div className="p-5 rounded-company bg-kampung-rose-wash text-danger text-sm font-semibold">{error}</div>;
  }

  return (
    <div className="grid gap-3">
      <div className="flex items-start gap-2 rounded-company bg-errandify-orange-wash px-3 py-2.5">
        <span className="w-5 h-5 rounded-full bg-errandify-orange text-white text-[11px] font-extrabold grid place-items-center shrink-0">i</span>
        <p className="text-[12px] text-errandify-orange-deep leading-snug">
          Errands your company can take on. Your own posted errands are hidden here, so you'll never bid against yourself.
        </p>
      </div>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by title, area or category…"
        className="w-full px-3.5 py-2.5 rounded-company border border-gray-200 bg-white text-[13px] text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-errandify-orange"
      />

      {shown.length === 0 ? (
        <div className="rounded-company border border-gray-200 bg-white p-6 text-center grid gap-2 justify-items-center">
          <span className="text-2xl">🔍</span>
          <p className="font-bold text-gray-800 text-sm">
            {errands.length === 0 ? 'No open errands right now' : 'Nothing matches that search'}
          </p>
          <p className="text-[12.5px] text-gray-600 max-w-xs">
            {errands.length === 0
              ? 'New errands appear here as neighbours post them. Check back shortly.'
              : 'Try a different area or category.'}
          </p>
        </div>
      ) : (
        <div className="rounded-company border border-gray-200 bg-white overflow-hidden">
          {shown.map((e) => {
            const due = dueLabel(e.deadline);
            return (
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
                  {e.already_offered ? (
                    <span className="bg-kampung-jade-wash text-ok text-[11px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap">
                      Offer sent
                    </span>
                  ) : due ? (
                    <span
                      className={`${due.urgent ? 'bg-kampung-rose-wash text-danger' : 'bg-gray-100 text-gray-600'} text-[11px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap`}
                    >
                      {due.text}
                    </span>
                  ) : null}
                </span>
                <span className="text-[11.5px] text-gray-500">
                  {e.location || 'Singapore'} · by {e.posted_by}
                  {e.offer_count > 0 ? ` · ${e.offer_count} offer${e.offer_count === 1 ? '' : 's'}` : ' · be the first to offer'}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
