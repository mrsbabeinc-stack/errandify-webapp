import { useEffect, useState } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface RequestRow {
  id: number;
  errand_id: number;
  dispute_type: string;
  description: string;
  status: 'pending_company' | 'approved' | 'rejected' | 'withdrawn';
  review_note: string | null;
  reviewed_at: string | null;
  dispute_id: number | null;
  created_at: string;
  formatted_id: string;
  title: string;
  location: string | null;
  raised_by: string | null;
  reviewed_by: string | null;
}

const TYPE_LABEL: Record<string, string> = {
  work_not_completed: "Couldn't finish the job",
  low_quality: 'Disagreement over the work',
  payment_not_released: 'Payment problem',
  safety_concern: 'Safety concern',
  other: 'Something else',
};

/**
 * Issues staff have raised. The same component serves both sides — owner and
 * manager get the approve/reject controls, staff get a read-only view of their
 * own requests — because the API already scopes the rows and returns canReview.
 */
export default function CompanyDisputeRequests({ companyId }: { companyId: number }) {
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [canReview, setCanReview] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // The row being decided, and which way — the note is required for a reject so
  // the staff member always gets a reason back
  const [deciding, setDeciding] = useState<{ row: RequestRow; decision: 'approve' | 'reject' } | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const auth = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

  const load = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/companies/${companyId}/dispute-requests`, auth());
      setRequests(res.data?.data?.requests || []);
      setCanReview(!!res.data?.data?.canReview);
      setError('');
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Could not load raised issues.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  const decide = async () => {
    if (!deciding) return;
    setBusy(true);
    try {
      await axios.post(
        `${API_URL}/api/companies/${companyId}/dispute-requests/${deciding.row.id}/decide`,
        { decision: deciding.decision, note: note.trim() || null },
        auth()
      );
      setDeciding(null);
      setNote('');
      load();
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Could not save that decision.');
      setDeciding(null);
    } finally {
      setBusy(false);
    }
  };

  const chip = (r: RequestRow) => {
    if (r.status === 'pending_company')
      return <span className="bg-kampung-sun-wash text-warn text-[11px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap">Waiting on you</span>;
    if (r.status === 'approved')
      return <span className="bg-kampung-jade-wash text-ok text-[11px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap">Dispute #{r.dispute_id}</span>;
    return <span className="bg-gray-100 text-gray-600 text-[11px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap">Not taken forward</span>;
  };

  if (loading) return <div className="p-5 text-center text-gray-500 text-sm">Loading raised issues…</div>;
  if (error && requests.length === 0) {
    return <div className="p-4 rounded-company bg-kampung-rose-wash text-danger text-sm font-semibold">{error}</div>;
  }

  if (requests.length === 0) {
    return (
      <div className="rounded-company border border-gray-200 bg-white p-6 text-center grid gap-2 justify-items-center">
        <span className="text-2xl">🌤️</span>
        <p className="font-bold text-gray-800 text-sm">No issues raised</p>
        <p className="text-[12.5px] text-gray-600 max-w-xs">
          {canReview
            ? 'When someone on your team hits a problem on a job, it lands here for you to approve before it becomes a formal dispute.'
            : 'If something goes wrong on a job, raise it from the job card and your manager will pick it up here.'}
        </p>
      </div>
    );
  }

  const pending = requests.filter((r) => r.status === 'pending_company');

  return (
    <div className="grid gap-2.5">
      {canReview && pending.length > 0 && (
        <div className="rounded-company bg-kampung-sun-wash px-3.5 py-2.5">
          <p className="text-[12.5px] text-warn">
            <b>{pending.length} issue{pending.length > 1 ? 's' : ''} waiting.</b> Approving files a
            formal dispute under your company and holds the payment until it's settled.
          </p>
        </div>
      )}

      {error && <p className="text-[12.5px] font-semibold text-danger">{error}</p>}

      {requests.map((r) => (
        <div key={r.id} className="rounded-company border border-gray-200 bg-white p-3.5 grid gap-2 shadow-kampung-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-extrabold text-[13.5px] text-gray-800 tracking-tight truncate">{r.title}</p>
              <p className="text-[11.5px] text-gray-500 mt-0.5">
                {r.formatted_id}
                {r.location ? ` · ${r.location}` : ''}
                {r.raised_by && canReview ? ` · raised by ${r.raised_by}` : ''}
              </p>
            </div>
            {chip(r)}
          </div>

          <p className="text-[12px] font-bold text-gray-700">{TYPE_LABEL[r.dispute_type] || r.dispute_type}</p>
          <p className="text-[12.5px] text-gray-600 leading-snug">{r.description}</p>

          {r.status !== 'pending_company' && r.review_note && (
            <p className="text-[12px] text-gray-600 bg-gray-50 rounded-company px-3 py-2">
              <b>{r.reviewed_by || 'Manager'}:</b> {r.review_note}
            </p>
          )}

          {canReview && r.status === 'pending_company' && (
            <div className="flex gap-2 mt-0.5">
              <button
                onClick={() => { setDeciding({ row: r, decision: 'approve' }); setNote(''); }}
                className="flex-1 bg-kampung-jade text-white font-bold text-[12.5px] py-2.5 rounded-full"
              >
                Approve &amp; file dispute
              </button>
              <button
                onClick={() => { setDeciding({ row: r, decision: 'reject' }); setNote(''); }}
                className="flex-1 bg-gray-100 text-gray-700 font-bold text-[12.5px] py-2.5 rounded-full"
              >
                Handle internally
              </button>
            </div>
          )}
        </div>
      ))}

      {deciding && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-company w-full max-w-sm p-5 grid gap-3 shadow-kampung">
            <h3 className="font-extrabold text-[15px] text-gray-800 tracking-tight">
              {deciding.decision === 'approve' ? 'File this as a dispute?' : 'Keep this internal?'}
            </h3>
            <p className="text-[12.5px] text-gray-600 leading-snug">
              {deciding.decision === 'approve'
                ? `This files a formal dispute under your company on "${deciding.row.title}". The other party is notified and the payment is held until it's settled.`
                : `Nothing happens on "${deciding.row.title}" and the customer is never told. It stays as an internal record, and ${deciding.row.raised_by || 'your staff'} gets your note.`}
            </p>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder={
                deciding.decision === 'approve'
                  ? 'Optional note for your records'
                  : 'Let them know why — e.g. "I called the customer and sorted it"'
              }
              className="w-full px-3 py-2.5 rounded-company border border-gray-200 text-[13px] text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-errandify-orange"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setDeciding(null)}
                className="flex-1 bg-gray-100 text-gray-700 font-bold text-[13px] py-2.5 rounded-full"
              >
                Back
              </button>
              <button
                onClick={decide}
                disabled={busy}
                className={`flex-1 text-white font-bold text-[13px] py-2.5 rounded-full disabled:opacity-60 ${
                  deciding.decision === 'approve' ? 'bg-kampung-jade' : 'bg-errandify-orange'
                }`}
              >
                {busy ? 'Saving…' : deciding.decision === 'approve' ? 'Yes, file it' : 'Yes, keep internal'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
