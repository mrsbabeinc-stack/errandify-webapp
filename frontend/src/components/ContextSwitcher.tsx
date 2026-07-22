import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../hooks/useAppContext';

/**
 * Always-visible indicator of which hat you're wearing, with a one-tap switch.
 * Renders nothing for people without a company — there's no context to confuse.
 */
export default function ContextSwitcher({ compact = false }: { compact?: boolean }) {
  const navigate = useNavigate();
  const { company, mode, setMode, loading } = useAppContext();

  if (loading || !company) return null;

  const inCompany = mode === 'company';

  const switchTo = (m: 'personal' | 'company') => {
    setMode(m);
    if (m === 'personal') {
      navigate('/home');
    } else {
      navigate(company.my_role === 'staff' ? '/company/my-work' : '/company/dashboard');
    }
  };

  if (compact) {
    return (
      <button
        onClick={() => switchTo(inCompany ? 'personal' : 'company')}
        title={inCompany ? `Acting as ${company.name} — tap to switch to yourself` : 'Acting as yourself — tap to switch to your company'}
        className={`text-[11px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap border ${
          inCompany
            ? 'bg-kampung-jade-wash border-kampung-jade text-ok'
            : 'bg-errandify-orange-wash border-errandify-orange text-errandify-orange-deep'
        }`}
      >
        {inCompany ? `🏢 ${company.name}` : '🙋 Personal'}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-full">
      <button
        onClick={() => switchTo('personal')}
        className={`text-[12px] font-bold px-3 py-1.5 rounded-full transition-colors ${
          !inCompany ? 'bg-white text-errandify-orange-deep shadow-kampung-sm' : 'text-gray-600'
        }`}
      >
        Personal
      </button>
      <button
        onClick={() => switchTo('company')}
        className={`text-[12px] font-bold px-3 py-1.5 rounded-full transition-colors truncate max-w-[160px] ${
          inCompany ? 'bg-white text-ok shadow-kampung-sm' : 'text-gray-600'
        }`}
        title={company.name}
      >
        {company.name}
      </button>
    </div>
  );
}
