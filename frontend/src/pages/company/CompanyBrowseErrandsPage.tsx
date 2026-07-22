import { useEffect, useMemo, useState } from 'react';
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
  postal_code: string | null;
  posted_by: string;
  offer_count: number;
  already_offered: boolean | null;
}

interface Category {
  id: string;
  name: string;
  icon?: string;
}

const FALLBACK_CATEGORIES: Category[] = [
  { id: 'home-maintenance', name: 'Home fix', icon: '🔧' },
  { id: 'cleaning-household', name: 'Cleaning', icon: '🧹' },
  { id: 'food-beverage', name: 'Food', icon: '🍲' },
  { id: 'furniture-assembly', name: 'Furniture', icon: '🪑' },
  { id: 'shopping-errands', name: 'Shopping', icon: '🛒' },
  { id: 'delivery-moving', name: 'Delivery', icon: '📦' },
  { id: 'travel-mobility', name: 'Travel', icon: '🚗' },
  { id: 'event-planning', name: 'Events', icon: '🎉' },
  { id: 'childcare-education', name: 'Childcare', icon: '🧒' },
  { id: 'eldercare-healthcare', name: 'Eldercare', icon: '👵' },
  { id: 'pet-care', name: 'Pet care', icon: '🐕' },
  { id: 'personal-care', name: 'Personal', icon: '💇' },
  { id: 'tech-support', name: 'Tech', icon: '💻' },
  { id: 'creative-arts', name: 'Creative', icon: '🎨' },
  { id: 'admin-business', name: 'Admin', icon: '📋' },
  { id: 'charity-community', name: 'Charity', icon: '🤝' },
];

/**
 * Browse Errands for the COMPANY acting as a doer. Same capability as the
 * personal browse page (category filters, search, already-offered state) but
 * scoped to work the company can take — its own errands are excluded server
 * side so it can never bid against itself.
 */
export default function CompanyBrowseErrandsPage({ companyId }: { companyId: number }) {
  const navigate = useNavigate();
  const [errands, setErrands] = useState<MarketErrand[]>([]);
  const [categories, setCategories] = useState<Category[]>(FALLBACK_CATEGORIES);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [selectedCats, setSelectedCats] = useState<string[]>([]);
  const [hideOffered, setHideOffered] = useState(false);
  const [sortBy, setSortBy] = useState<'urgent' | 'pay'>('urgent');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        const [mk, cat] = await Promise.allSettled([
          axios.get(`${API_URL}/api/companies/${companyId}/doer/marketplace`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get(`${API_URL}/api/categories`),
        ]);

        if (mk.status === 'fulfilled') {
          setErrands(mk.value.data?.data?.errands || []);
          setError('');
        } else {
          const st = (mk.reason as any)?.response?.status;
          setError(st === 403 ? "You don't have access to this company's workspace." : 'Could not load the marketplace.');
        }

        if (cat.status === 'fulfilled' && Array.isArray(cat.value.data?.data) && cat.value.data.data.length) {
          setCategories(cat.value.data.data);
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [companyId]);

  const toggleCat = (id: string) =>
    setSelectedCats((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));

  const visible = useMemo(() => {
    return errands
      .filter((e) => {
        if (hideOffered && e.already_offered) return false;
        if (selectedCats.length && !selectedCats.includes(e.category)) return false;
        if (search.trim()) {
          const q = search.toLowerCase();
          const hay = `${e.title} ${e.location || ''} ${e.category || ''} ${e.posted_by || ''}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'pay') return Number(b.budget || 0) - Number(a.budget || 0);
        const da = a.deadline ? new Date(a.deadline).getTime() : Infinity;
        const db = b.deadline ? new Date(b.deadline).getTime() : Infinity;
        return da - db;
      });
  }, [errands, search, selectedCats, hideOffered, sortBy]);

  const due = (deadline: string | null) => {
    if (!deadline) return null;
    const d = new Date(deadline);
    const hrs = (d.getTime() - Date.now()) / 36e5;
    if (hrs < 0) return { text: 'Closed', urgent: false };
    if (hrs < 24) return { text: `Closes in ${Math.max(1, Math.round(hrs))}h`, urgent: true };
    return { text: d.toLocaleDateString('en-SG', { day: 'numeric', month: 'short' }), urgent: false };
  };

  if (loading) return <div className="p-6 text-center text-gray-500 text-sm">Finding errands your company can take…</div>;
  if (error) return <div className="p-4 rounded-company bg-kampung-rose-wash text-danger text-sm font-semibold">{error}</div>;

  return (
    <div className="grid gap-3">
      <div className="flex items-start gap-2 rounded-company bg-errandify-orange-wash px-3 py-2">
        <span className="w-5 h-5 rounded-full bg-errandify-orange text-white text-[11px] font-extrabold grid place-items-center shrink-0">i</span>
        <p className="text-[12px] text-errandify-orange-deep leading-snug">
          Work your company can take on. Your own posted errands are hidden, so you'll never bid against yourself.
        </p>
      </div>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search title, area or category…"
        className="w-full px-3 py-2 rounded-company border border-gray-200 bg-white text-[13px] text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-errandify-orange"
      />

      {/* Category filter — all 16. 4 across on phones (8 gave 34px tiles whose
          labels collided), 8 across from tablet up. */}
      <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
        {categories.slice(0, 16).map((c) => {
          const on = selectedCats.includes(c.id);
          return (
            <button
              key={c.id}
              onClick={() => toggleCat(c.id)}
              title={c.name}
              className={`rounded-company border px-1 py-2 grid justify-items-center gap-1 min-w-0 ${
                on ? 'bg-errandify-orange-wash border-errandify-orange' : 'bg-white border-gray-200'
              }`}
            >
              <span className="text-[15px] leading-none">{c.icon || '•'}</span>
              <span
                className={`text-[9.5px] font-semibold leading-tight text-center w-full truncate ${on ? 'text-errandify-orange-deep' : 'text-gray-500'}`}
              >
                {c.name}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex gap-1.5 flex-wrap items-center">
        <button
          onClick={() => setSortBy(sortBy === 'urgent' ? 'pay' : 'urgent')}
          className="text-[11.5px] font-bold px-3 py-1.5 rounded-full border border-gray-200 bg-white text-gray-600"
        >
          Sort: {sortBy === 'urgent' ? 'Closing soonest' : 'Highest pay'}
        </button>
        <button
          onClick={() => setHideOffered(!hideOffered)}
          className={`text-[11.5px] font-bold px-3 py-1.5 rounded-full border ${
            hideOffered ? 'bg-errandify-orange-wash border-errandify-orange text-errandify-orange-deep' : 'bg-white border-gray-200 text-gray-600'
          }`}
        >
          Hide already offered
        </button>
        {selectedCats.length > 0 && (
          <button
            onClick={() => setSelectedCats([])}
            className="text-[11.5px] font-bold px-3 py-1.5 rounded-full border border-gray-200 bg-white text-gray-600"
          >
            Clear {selectedCats.length} filter{selectedCats.length > 1 ? 's' : ''} ✕
          </button>
        )}
        <span className="text-[11.5px] text-gray-500 ml-auto">{visible.length} shown</span>
      </div>

      {visible.length === 0 ? (
        <div className="rounded-company border border-gray-200 bg-white p-6 text-center grid gap-2 justify-items-center">
          <span className="text-2xl">🔍</span>
          <p className="font-bold text-gray-800 text-sm">
            {errands.length === 0 ? 'No open errands right now' : 'Nothing matches those filters'}
          </p>
          <p className="text-[12.5px] text-gray-600 max-w-xs">
            {errands.length === 0
              ? 'New errands appear here as neighbours post them. Check back shortly.'
              : 'Try clearing a category or the search.'}
          </p>
        </div>
      ) : (
        <div className="rounded-company border border-gray-200 bg-white overflow-hidden">
          {visible.map((e) => {
            const d = due(e.deadline);
            return (
              <button
                key={e.id}
                onClick={() => navigate(`/errand/${e.id}`)}
                className="w-full text-left grid grid-cols-[1fr_auto] gap-x-3 gap-y-0.5 px-3.5 py-2.5 border-b border-gray-200 last:border-b-0 hover:bg-gray-50"
              >
                <span className="font-bold text-[13px] text-gray-800 truncate">{e.title}</span>
                <span className="row-span-2 self-center grid gap-1 justify-items-end">
                  <span className="font-extrabold text-[13px] text-gray-800">${Number(e.budget || 0).toFixed(0)}</span>
                  {e.already_offered ? (
                    <span className="bg-kampung-jade-wash text-ok text-[10.5px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap">
                      Offer sent
                    </span>
                  ) : d ? (
                    <span
                      className={`${d.urgent ? 'bg-kampung-rose-wash text-danger' : 'bg-gray-100 text-gray-600'} text-[10.5px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap`}
                    >
                      {d.text}
                    </span>
                  ) : null}
                </span>
                <span className="text-[11px] text-gray-500 truncate">
                  {e.location || 'Singapore'} · by {e.posted_by}
                  {e.offer_count > 0 ? ` · ${e.offer_count} offer${e.offer_count === 1 ? '' : 's'}` : ' · be the first'}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
