import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAppContext } from '../../hooks/useAppContext';
import { CaseReportModal } from '../../components/CaseReportModal';
import CompanyDisputeRequests from '../../components/company/CompanyDisputeRequests';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface Job {
  id: number;
  formatted_id: string;
  title: string;
  description: string | null;
  category: string;
  budget: string | number;
  deadline: string | null;
  location: string | null;
  errand_status: string;
  job_status: 'assigned' | 'in_progress' | 'completed' | string;
  allocated_at: string | null;
}

/**
 * The staff screen — deliberately small. Staff do the work; they don't run the
 * business. Only jobs allocated to them, start/finish, chat, and leave. No
 * marketplace, no offers, no billing, and the company is paid — not them.
 */
export default function StaffMyWorkPage() {
  const navigate = useNavigate();
  const { company, loading: ctxLoading } = useAppContext();

  const [jobs, setJobs] = useState<Job[]>([]);
  const [summary, setSummary] = useState({ today: 0, inProgress: 0, total: 0 });
  const [onLeave, setOnLeave] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<number | null>(null);
  // Raising an issue never files a dispute directly — it goes to owner/manager
  const [raisingOn, setRaisingOn] = useState<Job | null>(null);
  const [issuesKey, setIssuesKey] = useState(0);

  const auth = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

  const load = async () => {
    if (!company?.id) return;
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/companies/${company.id}/staff/my-work`, auth());
      const d = res.data?.data;
      setJobs(d?.jobs || []);
      setSummary(d?.summary || { today: 0, inProgress: 0, total: 0 });
      setOnLeave(!!d?.onLeave);
      setError('');
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Could not load your jobs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!ctxLoading) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctxLoading, company?.id]);

  const act = async (errandId: number, action: 'start' | 'complete') => {
    if (!company?.id) return;
    setBusy(errandId);
    setError('');
    try {
      await axios.post(`${API_URL}/api/companies/${company.id}/staff/jobs/${errandId}/${action}`, {}, auth());
      load();
    } catch (err: any) {
      setError(err?.response?.data?.error || 'That did not go through.');
    } finally {
      setBusy(null);
    }
  };

  const when = (deadline: string | null) => {
    if (!deadline) return null;
    const d = new Date(deadline);
    const hrs = (d.getTime() - Date.now()) / 36e5;
    const time = d.toLocaleTimeString('en-SG', { hour: 'numeric', minute: '2-digit' });
    if (hrs < 0) return { text: 'Overdue', urgent: true };
    if (hrs < 12) return { text: `Today, ${time}`, urgent: true };
    if (hrs < 36) return { text: `Tomorrow, ${time}`, urgent: false };
    return { text: d.toLocaleDateString('en-SG', { day: 'numeric', month: 'short' }) + `, ${time}`, urgent: false };
  };

  if (ctxLoading || loading) {
    return <div className="min-h-screen bg-errandify-bg grid place-items-center text-gray-500 text-sm">Loading your jobs…</div>;
  }

  if (!company) {
    return (
      <div className="min-h-screen bg-errandify-bg grid place-items-center p-6">
        <div className="bg-white border border-gray-200 rounded-company p-6 text-center max-w-sm">
          <p className="font-bold text-gray-800 text-sm">You're not linked to a company</p>
          <button onClick={() => navigate('/home')} className="mt-3 bg-errandify-orange text-white font-bold text-[13px] px-5 py-2.5 rounded-full">
            Go to my errands
          </button>
        </div>
      </div>
    );
  }

  const active = jobs.filter((j) => j.job_status !== 'completed');
  const done = jobs.filter((j) => j.job_status === 'completed');

  return (
    <div className="min-h-screen bg-errandify-bg pb-24">
      <div className="bg-kampung-gradient text-white px-4 py-3.5">
        <div className="font-extrabold text-[15px] tracking-tight truncate">{company.name}</div>
        <div className="text-[11.5px] text-white/85 capitalize">My work · {company.my_role}</div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4 grid gap-3">
        {onLeave && (
          <div className="rounded-company bg-gray-100 border border-gray-200 px-3.5 py-2.5">
            <p className="text-[12.5px] text-gray-700">
              <b>You're marked as on leave.</b> New jobs won't be allocated to you until you're back.
            </p>
          </div>
        )}

        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-company bg-kampung-rose-wash px-3 py-2.5">
            <div className="text-lg font-extrabold leading-none text-danger">{summary.today}</div>
            <div className="text-[11px] font-semibold text-danger mt-0.5">Due today</div>
          </div>
          <div className="rounded-company bg-kampung-jade-wash px-3 py-2.5">
            <div className="text-lg font-extrabold leading-none text-ok">{summary.inProgress}</div>
            <div className="text-[11px] font-semibold text-ok mt-0.5">In progress</div>
          </div>
          <div className="rounded-company bg-errandify-orange-wash px-3 py-2.5">
            <div className="text-lg font-extrabold leading-none text-errandify-orange-deep">{summary.total}</div>
            <div className="text-[11px] font-semibold text-errandify-orange-deep mt-0.5">All jobs</div>
          </div>
        </div>

        {error && <p className="text-[12.5px] font-semibold text-danger">{error}</p>}

        {active.length === 0 ? (
          <div className="rounded-company border border-gray-200 bg-white p-6 text-center grid gap-2 justify-items-center">
            <span className="text-2xl">☕</span>
            <p className="font-bold text-gray-800 text-sm">Nothing allocated right now</p>
            <p className="text-[12.5px] text-gray-600 max-w-xs">
              When your manager assigns you an errand it'll appear here with everything you need to start.
            </p>
          </div>
        ) : (
          <div className="grid gap-2.5">
            {active.map((j) => {
              const w = when(j.deadline);
              const running = j.job_status === 'in_progress';
              return (
                <div key={j.id} className="rounded-company border border-gray-200 bg-white p-3.5 grid gap-2.5 shadow-kampung-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-extrabold text-[14.5px] text-gray-800 tracking-tight truncate">{j.title}</p>
                      <p className="text-[11.5px] text-gray-500 mt-0.5">
                        {j.formatted_id}
                        {j.location ? ` · ${j.location}` : ''}
                      </p>
                    </div>
                    <span
                      className={`${running ? 'bg-kampung-jade-wash text-ok' : 'bg-kampung-sun-wash text-warn'} text-[11px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap shrink-0`}
                    >
                      {running ? 'In progress' : 'Assigned'}
                    </span>
                  </div>

                  {w && (
                    <p className={`text-[12px] font-semibold ${w.urgent ? 'text-danger' : 'text-gray-600'}`}>
                      {w.urgent ? '⚠ ' : ''}
                      {w.text}
                    </p>
                  )}

                  {j.description && <p className="text-[12.5px] text-gray-600 line-clamp-2">{j.description}</p>}

                  <div className="flex gap-2">
                    {!running ? (
                      <button
                        onClick={() => act(j.id, 'start')}
                        disabled={busy === j.id}
                        className="flex-1 bg-errandify-orange text-white font-bold text-[13px] py-2.5 rounded-full disabled:opacity-60"
                      >
                        {busy === j.id ? 'Starting…' : "I'm starting"}
                      </button>
                    ) : (
                      <button
                        onClick={() => act(j.id, 'complete')}
                        disabled={busy === j.id}
                        className="flex-1 bg-kampung-jade text-white font-bold text-[13px] py-2.5 rounded-full disabled:opacity-60"
                      >
                        {busy === j.id ? 'Saving…' : 'Mark as done'}
                      </button>
                    )}
                    <button
                      onClick={() => navigate(`/errand/${j.id}`)}
                      className="bg-gray-100 text-gray-700 font-bold text-[13px] px-4 py-2.5 rounded-full"
                    >
                      Chat
                    </button>
                  </div>

                  <button
                    onClick={() => setRaisingOn(j)}
                    className="justify-self-start text-[11.5px] font-bold text-gray-500 underline underline-offset-2"
                  >
                    Something went wrong on this job
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {done.length > 0 && (
          <div className="grid gap-1.5 mt-1">
            <p className="text-[12px] font-bold text-gray-500 px-1">Finished</p>
            <div className="rounded-company border border-gray-200 bg-white overflow-hidden">
              {done.map((j) => (
                <div key={j.id} className="flex items-center justify-between gap-3 px-3.5 py-2.5 border-b border-gray-200 last:border-b-0">
                  <span className="min-w-0">
                    <span className="block font-bold text-[13px] text-gray-700 truncate">{j.title}</span>
                    <span className="block text-[11px] text-gray-500">{j.formatted_id}</span>
                  </span>
                  <span className="bg-gray-100 text-gray-600 text-[11px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap">
                    Awaiting confirmation
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid gap-1.5 mt-1">
          <p className="text-[12px] font-bold text-gray-500 px-1">Issues you've raised</p>
          <CompanyDisputeRequests key={issuesKey} companyId={company.id} />
        </div>

        <button
          onClick={() => navigate('/apply-leave')}
          className="justify-self-start text-[12.5px] font-bold text-errandify-orange-deep underline underline-offset-2 mt-1"
        >
          Apply for leave / unavailability
        </button>
      </div>

      {/* The platform's existing Report an Issue form. Passing companyId routes
          it to the owner/manager approval queue instead of straight to us. */}
      <CaseReportModal
        isOpen={!!raisingOn}
        companyId={company.id}
        errandId={raisingOn?.id}
        errandTitle={raisingOn?.title}
        onSubmitted={() => setIssuesKey((k) => k + 1)}
        onClose={() => setRaisingOn(null)}
      />
    </div>
  );
}
