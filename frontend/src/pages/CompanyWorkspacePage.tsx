import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import CompanyAskerErrands from '../components/company/CompanyAskerErrands';
import CompanyDoerMarketplace from '../components/company/CompanyDoerMarketplace';
import CompanyDoerOffers from '../components/company/CompanyDoerOffers';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

type Mode = 'asker' | 'doer';
type DoerTab = 'marketplace' | 'offers';

/**
 * The company's own workspace. Previously the company dashboard rendered the
 * PERSONAL DoerBrowsePage, which mixed a person's errands with their company's
 * and caused the routing confusion. This page keeps the two completely apart.
 */
export default function CompanyWorkspacePage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  const [companyId, setCompanyId] = useState<number | null>(null);
  const [companyName, setCompanyName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const mode = (params.get('mode') as Mode) || 'asker';
  const doerTab = (params.get('tab') as DoerTab) || 'marketplace';

  const setMode = (m: Mode) => {
    const next = new URLSearchParams(params);
    next.set('mode', m);
    if (m === 'doer' && !next.get('tab')) next.set('tab', 'marketplace');
    if (m === 'asker') next.delete('tab');
    setParams(next, { replace: true });
  };

  const setDoerTab = (t: DoerTab) => {
    const next = new URLSearchParams(params);
    next.set('mode', 'doer');
    next.set('tab', t);
    setParams(next, { replace: true });
  };

  useEffect(() => {
    const load = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`${API_URL}/api/companies/user/my-company`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const c = res.data?.data;
        if (c?.id) {
          setCompanyId(c.id);
          setCompanyName(c.company_name || c.name || 'Your company');
        } else {
          setError('no-company');
        }
      } catch {
        setError('no-company');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return <div className="min-h-screen bg-errandify-bg grid place-items-center text-gray-500 text-sm">Loading your company…</div>;
  }

  if (error === 'no-company' || !companyId) {
    return (
      <div className="min-h-screen bg-errandify-bg p-6 grid place-items-center">
        <div className="bg-white border border-gray-200 rounded-company p-7 max-w-sm w-full text-center grid gap-3 justify-items-center shadow-kampung-sm">
          <span className="text-3xl">🏢</span>
          <h1 className="font-extrabold text-lg text-gray-800 tracking-tight">No company yet</h1>
          <p className="text-[13px] text-gray-600">
            Register your company to post errands as a business and take on work from neighbours.
          </p>
          <button
            onClick={() => navigate('/company/register')}
            className="mt-1 bg-errandify-orange text-white font-bold text-[13.5px] px-5 py-2.5 rounded-full shadow-kampung-sm"
          >
            Register company
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-errandify-bg pb-24">
      {/* Header */}
      <div className="bg-kampung-gradient text-white px-4 py-3.5 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="font-extrabold text-[15px] tracking-tight truncate">{companyName}</div>
          <div className="text-[11.5px] text-white/85">Company workspace</div>
        </div>
        <button
          onClick={() => navigate('/company/dashboard')}
          className="bg-white/22 text-white text-[11.5px] font-bold px-3 py-1.5 rounded-full shrink-0"
        >
          Dashboard
        </button>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-4 grid gap-3">
        {/* Asker / Doer toggle — the company's own two sides */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-full self-start">
          <button
            onClick={() => setMode('asker')}
            className={`text-[12.5px] font-bold px-4 py-2 rounded-full transition-colors ${
              mode === 'asker' ? 'bg-white text-errandify-orange-deep shadow-kampung-sm' : 'text-gray-600'
            }`}
          >
            As Asker
          </button>
          <button
            onClick={() => setMode('doer')}
            className={`text-[12.5px] font-bold px-4 py-2 rounded-full transition-colors ${
              mode === 'doer' ? 'bg-white text-errandify-orange-deep shadow-kampung-sm' : 'text-gray-600'
            }`}
          >
            As Doer
          </button>
        </div>

        {mode === 'asker' ? (
          <>
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-extrabold text-[16px] text-gray-800 tracking-tight">Errands we posted</h2>
              <button
                onClick={() => navigate('/company/post-errand')}
                className="bg-errandify-orange text-white font-bold text-[12px] px-3.5 py-2 rounded-full shadow-kampung-sm"
              >
                + Post errand
              </button>
            </div>
            <CompanyAskerErrands companyId={companyId} />
          </>
        ) : (
          <>
            <div className="flex gap-1 self-start">
              <button
                onClick={() => setDoerTab('marketplace')}
                className={`text-[12px] font-bold px-3.5 py-2 rounded-full border ${
                  doerTab === 'marketplace'
                    ? 'bg-errandify-orange-wash border-errandify-orange text-errandify-orange-deep'
                    : 'bg-white border-gray-200 text-gray-600'
                }`}
              >
                Marketplace
              </button>
              <button
                onClick={() => setDoerTab('offers')}
                className={`text-[12px] font-bold px-3.5 py-2 rounded-full border ${
                  doerTab === 'offers'
                    ? 'bg-errandify-orange-wash border-errandify-orange text-errandify-orange-deep'
                    : 'bg-white border-gray-200 text-gray-600'
                }`}
              >
                MyBizOffers
              </button>
            </div>
            {doerTab === 'marketplace' ? (
              <CompanyDoerMarketplace companyId={companyId} />
            ) : (
              <CompanyDoerOffers companyId={companyId} />
            )}
          </>
        )}
      </div>
    </div>
  );
}
