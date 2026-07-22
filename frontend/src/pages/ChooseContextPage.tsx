import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../hooks/useAppContext';

const ROLE_BLURB: Record<string, string> = {
  owner: 'Post and offer as the company, allocate work to staff, manage billing and staff.',
  manager: 'Post and offer as the company, review offers and allocate work to staff.',
  staff: 'See the jobs allocated to you, start and finish work, and apply for leave.',
};

/**
 * "Which hat am I wearing?" — shown after login to anyone linked to a company.
 * The whole point is that you always know whether you're acting personally or
 * for your company, instead of inferring it from whichever screen you landed on.
 */
export default function ChooseContextPage() {
  const navigate = useNavigate();
  const { loading, company, setMode } = useAppContext();

  const me = (() => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}');
    } catch {
      return {};
    }
  })();

  // Nothing to choose without a company — never show a one-option screen
  useEffect(() => {
    if (!loading && !company) {
      setMode('personal');
      navigate('/home', { replace: true });
    }
  }, [loading, company, setMode, navigate]);

  const choosePersonal = () => {
    setMode('personal');
    navigate('/home', { replace: true });
  };

  const chooseCompany = () => {
    setMode('company');
    // Staff have their own screen; owner/manager get the full dashboard
    navigate(company?.my_role === 'staff' ? '/company/my-work' : '/company/dashboard', { replace: true });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-errandify-bg grid place-items-center text-gray-500 text-sm">
        Loading your account…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-errandify-bg px-5 py-10 flex items-center justify-center">
      <div className="w-full max-w-md grid gap-5">
        <div className="text-center">
          <h1 className="text-[22px] font-extrabold text-gray-800 tracking-tight">
            How are you using Errandify today?
          </h1>
          <p className="text-[13.5px] text-gray-600 mt-1.5">
            You can switch any time from the menu.
          </p>
        </div>

        {/* Personal */}
        <button
          onClick={choosePersonal}
          className="text-left bg-white border border-gray-200 rounded-individual p-5 shadow-kampung-sm hover:border-errandify-orange transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className="w-11 h-11 rounded-full bg-errandify-orange-wash grid place-items-center text-xl shrink-0">
              🙋
            </span>
            <div className="min-w-0">
              <div className="font-extrabold text-[15px] text-gray-800">Continue as myself</div>
              <div className="text-[12.5px] text-gray-500 truncate">
                {me?.name || me?.display_name || 'My personal account'}
              </div>
            </div>
          </div>
          <p className="text-[12.5px] text-gray-600 mt-3">
            Post your own errands, make your own offers, and get paid to your own account.
          </p>
        </button>

        {/* Company */}
        {company && (
          <button
            onClick={chooseCompany}
            className="text-left bg-white border border-gray-200 rounded-individual p-5 shadow-kampung-sm hover:border-errandify-orange transition-colors"
          >
            <div className="flex items-center gap-3">
              {company.logo_url ? (
                <img
                  src={company.logo_url}
                  alt=""
                  className="w-11 h-11 rounded-xl object-cover shrink-0 border border-gray-200"
                />
              ) : (
                <span className="w-11 h-11 rounded-xl bg-kampung-jade-wash grid place-items-center text-xl shrink-0">
                  🏢
                </span>
              )}
              <div className="min-w-0">
                <div className="font-extrabold text-[15px] text-gray-800 truncate">
                  Continue as {company.name}
                </div>
                <div className="text-[12.5px] text-gray-500 capitalize">
                  {company.my_role}
                  {company.uen ? ` · ${company.uen}` : ''}
                </div>
              </div>
            </div>

            <p className="text-[12.5px] text-gray-600 mt-3">
              {ROLE_BLURB[company.my_role] || ROLE_BLURB.staff}
            </p>

            {/* Be honest up front about what's still blocked */}
            {!company.certified && company.my_role !== 'staff' && (
              <p className="text-[12px] font-semibold text-warn bg-kampung-sun-wash rounded-company px-3 py-2 mt-3">
                Awaiting verification — you can set things up, but not post errands or make offers yet.
              </p>
            )}
            {company.on_leave && (
              <p className="text-[12px] font-semibold text-gray-600 bg-gray-100 rounded-company px-3 py-2 mt-3">
                You're marked as on leave, so new jobs won't be allocated to you.
              </p>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
