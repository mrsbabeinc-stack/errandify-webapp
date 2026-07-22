import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import AllocateStaffPicker from './AllocateStaffPicker';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface CompanyOffer {
  id: number;
  offer_id: string | null;
  amount: string | number;
  status: string;
  created_at: string;
  errand_id: number;
  formatted_id: string;
  title: string;
  location: string | null;
  errand_status: string;
  submitted_by: string;
}

interface Summary {
  total: number;
  pending: number;
  won: number;
}

/** MyBizOffers - offers submitted on the COMPANY behalf by an owner or manager. */
export default function CompanyDoerOffers({ companyId }: { companyId: number }) {
  const navigate = useNavigate();
  const [offers, setOffers] = useState<CompanyOffer[]>([]);
  const [summary, setSummary] = useState<Summary>({ total: 0, pending: 0, won: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  // Won offers are work the COMPANY owes — that's when staff get assigned
  const [allocating, setAllocating] = useState<CompanyOffer | null>(null);

  // Defined outside the effect so it can be re-run after allocating staff
  const load = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/api/companies/${companyId}/doer/offers`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setOffers(res.data?.data?.offers || []);
      setSummary(res.data?.data?.summary || { total: 0, pending: 0, won: 0 });
      setError('');
    } catch (err: any) {
      setError(
        err?.response?.status === 403
          ? "You don't have access to this company's offers."
          : 'Could not load your company offers. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  const offerChip = (status: string) => {
    const map: Record<string, { bg: string; fg: string; label: string }> = {
      pending: { bg: 'bg-kampung-sun-wash', fg: 'text-warn', label: 'Awaiting reply' },
      accepted: { bg: 'bg-kampung-jade-wash', fg: 'text-ok', label: 'Won' },
      confirmed: { bg: 'bg-kampung-jade-wash', fg: 'text-ok', label: 'Confirmed' },
      rejected: { bg: 'bg-gray-100', fg: 'text-gray-500', label: 'Not chosen' },
      withdrawn: { bg: 'bg-gray-100', fg: 'text-gray-500', label: 'Withdrawn' },
    };
    const s = map[status] || { bg: 'bg-gray-100', fg: 'text-gray-600', label: status };
    return (
      <span className={`${s.bg} ${s.fg} text-[11px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap`}>
        {s.label}
      </span>
    );
  };

  if (loading) return <div className="p-6 text-center text-gray-500 text-sm">Loading your company offers…</div>;

  if (error) {
    return <div className="p-5 rounded-company bg-kampung-rose-wash text-danger text-sm font-semibold">{error}</div>;
  }

  return (
    <div className="grid gap-3">
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-company bg-kampung-sun-wash px-3 py-2.5">
          <div className="text-xl font-extrabold leading-none text-warn">{summary.pending}</div>
          <div className="text-[11px] font-semibold text-warn mt-1">Awaiting reply</div>
        </div>
        <div className="rounded-company bg-kampung-jade-wash px-3 py-2.5">
          <div className="text-xl font-extrabold leading-none text-ok">{summary.won}</div>
          <div className="text-[11px] font-semibold text-ok mt-1">Won</div>
        </div>
        <div className="rounded-company bg-errandify-orange-wash px-3 py-2.5">
          <div className="text-xl font-extrabold leading-none text-errandify-orange-deep">{summary.total}</div>
          <div className="text-[11px] font-semibold text-errandify-orange-deep mt-1">Sent total</div>
        </div>
      </div>

      {offers.length === 0 ? (
        <div className="rounded-company border border-gray-200 bg-white p-6 text-center grid gap-2 justify-items-center">
          <span className="text-2xl">🧰</span>
          <p className="font-bold text-gray-800 text-sm">No MyBizOffers yet</p>
          <p className="text-[12.5px] text-gray-600 max-w-xs">
            Browse the marketplace and send your first MyBizOffer — it'll appear here so your team can track it.
          </p>
        </div>
      ) : (
        <div className="rounded-company border border-gray-200 bg-white overflow-hidden">
          {offers.map((o) => {
            // Once the asker accepts, the company owes the work — assign someone
            const won = ['accepted', 'confirmed'].includes(o.status);
            return (
              <div key={o.id} className="border-b border-gray-200 last:border-b-0 hover:bg-gray-50">
                <button
                  onClick={() => navigate(`/errand/${o.errand_id}`)}
                  className="w-full text-left grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 px-3.5 py-3"
                >
                  <span className="font-bold text-[13.5px] text-gray-800 tracking-tight">{o.title}</span>
                  <span className="row-span-2 self-center grid gap-1.5 justify-items-end">
                    <span className="font-extrabold text-[13.5px] text-gray-800">
                      ${Number(o.amount || 0).toFixed(0)}
                    </span>
                    {offerChip(o.status)}
                  </span>
                  <span className="text-[11.5px] text-gray-500">
                    {o.offer_id || o.formatted_id}
                    {o.location ? ` · ${o.location}` : ''} · sent by {o.submitted_by}
                  </span>
                </button>

                {won && (
                  <div className="px-3.5 pb-2.5 -mt-1">
                    <button
                      onClick={() => setAllocating(o)}
                      className="text-[11.5px] font-bold text-errandify-orange-deep bg-errandify-orange-wash px-2.5 py-1 rounded-full"
                    >
                      Assign staff
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {allocating && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="w-full max-w-md">
            <AllocateStaffPicker
              companyId={companyId}
              errandId={allocating.errand_id}
              errandTitle={allocating.title}
              onAllocated={() => {
                setAllocating(null);
                load();
              }}
              onClose={() => setAllocating(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
