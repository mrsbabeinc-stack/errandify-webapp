import { useEffect, useState } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface Verification {
  id: number;
  company_id: number;
  status: string;
  submitted_at: string;
  acra_profile_date: string | null;
  matched_officer: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  document_name: string | null;
  document_mime: string | null;
  company_name: string;
  uen: string;
  certified: boolean;
  submitted_by_name: string | null;
}

/**
 * Admin review of company ACRA verifications. The reviewer must confirm which
 * director matched — a company shouldn't be able to self-certify that, or the
 * review is pointless. Approving or rejecting discards the document server-side.
 */
export default function CompanyVerifications() {
  const [tab, setTab] = useState<'pending' | 'verified' | 'rejected'>('pending');
  const [rows, setRows] = useState<Verification[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const [openId, setOpenId] = useState<number | null>(null);
  const [doc, setDoc] = useState<{ document: string; mime: string; name: string } | null>(null);
  const [docError, setDocError] = useState('');
  const [officer, setOfficer] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const auth = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

  const load = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/admin/verifications?status=${tab}`, auth());
      setRows(res.data?.data?.verifications || []);
      setPendingCount(res.data?.data?.pendingCount || 0);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const openReview = async (v: Verification) => {
    setOpenId(v.id);
    setOfficer(v.matched_officer || '');
    setReason('');
    setDoc(null);
    setDocError('');
    try {
      const res = await axios.get(`${API_URL}/api/admin/verifications/${v.id}/document`, auth());
      setDoc(res.data?.data);
    } catch (err: any) {
      setDocError(err?.response?.data?.error || 'Could not load the document.');
    }
  };

  const decide = async (id: number, action: 'approve' | 'reject') => {
    setBusy(true);
    setMsg('');
    try {
      const body = action === 'approve' ? { matchedOfficer: officer.trim() || null } : { reason: reason.trim() };
      const res = await axios.post(`${API_URL}/api/admin/verifications/${id}/${action}`, body, auth());
      setMsg(res.data?.message || 'Done');
      setOpenId(null);
      setDoc(null);
      load();
    } catch (err: any) {
      setMsg(err?.response?.data?.error || 'That did not go through.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="font-extrabold text-[17px] text-gray-800 tracking-tight">Company verifications</h2>
        {pendingCount > 0 && (
          <span className="bg-kampung-rose-wash text-danger text-[11.5px] font-bold px-3 py-1 rounded-full">
            {pendingCount} waiting
          </span>
        )}
      </div>

      <div className="flex gap-1.5">
        {(['pending', 'verified', 'rejected'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`text-[12px] font-bold px-3.5 py-1.5 rounded-full border capitalize ${
              tab === t
                ? 'bg-errandify-orange border-errandify-orange text-white'
                : 'bg-white border-gray-200 text-gray-600'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {msg && <p className="text-[12.5px] font-semibold text-ok">{msg}</p>}

      {loading ? (
        <div className="p-6 text-center text-gray-500 text-sm">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="rounded-admin border border-gray-200 bg-white p-6 text-center grid gap-1.5 justify-items-center">
          <span className="text-2xl">{tab === 'pending' ? '✅' : '📄'}</span>
          <p className="font-bold text-gray-800 text-sm">
            {tab === 'pending' ? 'Nothing waiting for review' : `No ${tab} verifications`}
          </p>
        </div>
      ) : (
        <div className="rounded-admin border border-gray-200 bg-white overflow-hidden">
          {rows.map((v) => (
            <div key={v.id} className="border-b border-gray-200 last:border-b-0">
              <button
                onClick={() => (openId === v.id ? setOpenId(null) : openReview(v))}
                className="w-full text-left grid grid-cols-[1fr_auto] gap-x-3 gap-y-0.5 px-3.5 py-2.5 hover:bg-gray-50"
              >
                <span className="font-bold text-[13px] text-gray-800 truncate">{v.company_name}</span>
                <span className="text-[11px] font-bold text-gray-500 self-center">
                  {new Date(v.submitted_at).toLocaleDateString('en-SG', { day: 'numeric', month: 'short' })}
                </span>
                <span className="text-[11px] text-gray-500 truncate">
                  {v.uen}
                  {v.acra_profile_date ? ` · profile ${new Date(v.acra_profile_date).toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: '2-digit' })}` : ''}
                  {v.submitted_by_name ? ` · by ${v.submitted_by_name}` : ''}
                </span>
              </button>

              {openId === v.id && (
                <div className="px-3.5 pb-3.5 grid gap-3 bg-gray-50 border-t border-gray-200 pt-3">
                  {/* Document */}
                  {docError ? (
                    <p className="text-[12px] font-semibold text-danger">{docError}</p>
                  ) : !doc ? (
                    <p className="text-[12px] text-gray-500">Loading document…</p>
                  ) : doc.mime === 'application/pdf' ? (
                    <div className="grid gap-1.5">
                      <object data={doc.document} type="application/pdf" className="w-full h-64 rounded-admin border border-gray-200 bg-white">
                        <a href={doc.document} target="_blank" rel="noreferrer" className="text-[12.5px] font-bold text-errandify-orange-deep">
                          Open {doc.name || 'document'}
                        </a>
                      </object>
                      <a href={doc.document} target="_blank" rel="noreferrer" className="text-[11.5px] font-bold text-errandify-orange-deep">
                        Open in a new tab ↗
                      </a>
                    </div>
                  ) : (
                    <img src={doc.document} alt="ACRA Business Profile" className="w-full max-h-64 object-contain rounded-admin border border-gray-200 bg-white" />
                  )}

                  <div className="rounded-admin bg-white border border-gray-200 p-3 grid gap-2">
                    <label className="grid gap-1">
                      <span className="text-[11.5px] font-bold text-gray-700">
                        Which director did you match? <span className="text-gray-500 font-semibold">(confirm against the document)</span>
                      </span>
                      <input
                        value={officer}
                        onChange={(e) => setOfficer(e.target.value)}
                        placeholder="Director's name as printed"
                        className="px-3 py-2 rounded-admin border border-gray-200 text-[12.5px] text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-errandify-orange"
                      />
                    </label>
                    <button
                      onClick={() => decide(v.id, 'approve')}
                      disabled={busy || !officer.trim()}
                      className="justify-self-start bg-kampung-jade text-white font-bold text-[12.5px] px-4 py-2 rounded-full disabled:opacity-50"
                    >
                      {busy ? 'Saving…' : 'Approve & verify'}
                    </button>
                    {!officer.trim() && (
                      <p className="text-[11px] text-gray-500">Enter the matched director before approving.</p>
                    )}
                  </div>

                  <div className="rounded-admin bg-white border border-gray-200 p-3 grid gap-2">
                    <label className="grid gap-1">
                      <span className="text-[11.5px] font-bold text-gray-700">Reject — tell them what to fix</span>
                      <textarea
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        rows={2}
                        placeholder="e.g. Profile is older than 6 months — please attach a recent one."
                        className="px-3 py-2 rounded-admin border border-gray-200 text-[12.5px] text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-errandify-orange resize-none"
                      />
                    </label>
                    <button
                      onClick={() => decide(v.id, 'reject')}
                      disabled={busy || !reason.trim()}
                      className="justify-self-start bg-white border border-kampung-rose text-danger font-bold text-[12.5px] px-4 py-2 rounded-full disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </div>

                  <p className="text-[11px] text-gray-500">
                    Either decision deletes the uploaded document — only the outcome is kept.
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
