import { useEffect, useRef, useState } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface LatestRequest {
  id: number;
  status: 'pending' | 'verified' | 'rejected';
  submitted_at: string;
  acra_profile_date: string | null;
  matched_officer: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
}

/**
 * Company verification — upload the latest ACRA Business Profile so the company
 * carries a "Verified business" badge. Stripe already handles the regulatory
 * KYB, so this is a trust signal. We tell the company plainly that we record the
 * result and don't keep the document.
 */
interface ChecklistItem {
  key: string;
  label: string;
  done: boolean;
  required: boolean;
  why?: string;
}

interface ProfileState {
  checklist: ChecklistItem[];
  completeness: number;
  missingRequired: string[];
  readyToSubmit: boolean;
  hasLogo: boolean;
}

export default function CompanyVerification({ companyId }: { companyId: number }) {
  const [certified, setCertified] = useState(false);
  const [certifiedOn, setCertifiedOn] = useState<string | null>(null);
  const [latest, setLatest] = useState<LatestRequest | null>(null);
  const [profile, setProfile] = useState<ProfileState | null>(null);
  const [loading, setLoading] = useState(true);
  const [logoBusy, setLogoBusy] = useState(false);
  const logoRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [profileDate, setProfileDate] = useState('');
  const [officer, setOfficer] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/api/companies/${companyId}/verification`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = res.data?.data;
      setCertified(!!d?.certified);
      setCertifiedOn(d?.certification_date || null);
      setLatest(d?.latestRequest || null);
      setProfile(d?.profile || null);
    } catch {
      /* status is optional chrome — stay quiet if it fails */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  const toDataUri = (f: File) =>
    new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.onerror = () => reject(new Error('Could not read that file'));
      r.readAsDataURL(f);
    });

  const uploadLogo = async (f: File) => {
    setError('');
    if (f.size > 1.5 * 1024 * 1024) return setError('Logo is too large — please use an image under 1.5MB.');
    setLogoBusy(true);
    try {
      const logoUrl = await toDataUri(f);
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_URL}/api/companies/${companyId}/logo`,
        { logoUrl },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setDone('Logo saved.');
      if (logoRef.current) logoRef.current.value = '';
      load();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Could not save that logo.');
    } finally {
      setLogoBusy(false);
    }
  };

  const submit = async () => {
    setError('');
    setDone('');
    if (!file) return setError('Please attach your ACRA Business Profile.');
    if (file.size > 6 * 1024 * 1024) return setError('That file is over 6MB — please attach a smaller one.');
    if (!profileDate) return setError('Enter the date printed on the ACRA profile.');

    setSubmitting(true);
    try {
      const document = await toDataUri(file);
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_URL}/api/companies/${companyId}/verification`,
        {
          document,
          documentName: file.name,
          documentMime: file.type,
          acraProfileDate: profileDate,
          matchedOfficer: officer.trim() || null,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setDone("Sent for review. We'll let you know once it's checked.");
      setFile(null);
      setProfileDate('');
      setOfficer('');
      if (fileRef.current) fileRef.current.value = '';
      load();
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Could not submit right now. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="p-4 text-center text-gray-500 text-sm">Loading verification…</div>;

  // Verified — show the badge, nothing to do
  if (certified) {
    return (
      <div className="rounded-company border border-kampung-jade bg-kampung-jade-wash p-4 flex items-start gap-3">
        <span className="w-8 h-8 rounded-full bg-kampung-jade text-white grid place-items-center text-sm font-extrabold shrink-0">✓</span>
        <div>
          <p className="font-extrabold text-[14px] text-ok">Verified business</p>
          <p className="text-[12.5px] text-ok/90 mt-0.5">
            Checked against your ACRA Business Profile
            {certifiedOn ? ` on ${new Date(certifiedOn).toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' })}` : ''}.
            {latest?.matched_officer ? ` Matched officer: ${latest.matched_officer}.` : ''}
          </p>
          <p className="text-[11.5px] text-ok/80 mt-1.5">Askers see a “Verified business” badge on your errands and offers.</p>
        </div>
      </div>
    );
  }

  const pending = latest?.status === 'pending';

  return (
    <div className="grid gap-3">
      {pending && (
        <div className="rounded-company border border-kampung-sun bg-kampung-sun-wash p-3.5 flex items-start gap-3">
          <span className="w-7 h-7 rounded-full bg-kampung-sun text-white grid place-items-center text-[13px] font-extrabold shrink-0">⏳</span>
          <div>
            <p className="font-bold text-[13.5px] text-warn">Under review</p>
            <p className="text-[12px] text-warn/90 mt-0.5">
              Sent {new Date(latest!.submitted_at).toLocaleDateString('en-SG', { day: 'numeric', month: 'short' })}. We'll update you here once it's checked.
            </p>
          </div>
        </div>
      )}

      {latest?.status === 'rejected' && (
        <div className="rounded-company border border-kampung-rose bg-kampung-rose-wash p-3.5">
          <p className="font-bold text-[13.5px] text-danger">Not verified yet</p>
          <p className="text-[12.5px] text-danger/90 mt-1">{latest.rejection_reason}</p>
          <p className="text-[11.5px] text-danger/80 mt-1.5">Fix the above and send a new profile below.</p>
        </div>
      )}

      {/* Fill the profile first — a complete one is verified faster and performs
          better once live, so we show exactly what's missing and why it matters. */}
      {!pending && profile && (
        <div className="rounded-company border border-gray-200 bg-white p-4 grid gap-3">
          <div className="flex items-center justify-between gap-3">
            <p className="font-extrabold text-[14.5px] text-gray-800 tracking-tight">Complete your profile</p>
            <span className="text-[12px] font-extrabold text-errandify-orange-deep">{profile.completeness}%</span>
          </div>

          <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-errandify-orange transition-all"
              style={{ width: `${profile.completeness}%` }}
            />
          </div>

          <div className="grid gap-1.5">
            {profile.checklist.map((i) => (
              <div key={i.key} className="flex items-start gap-2">
                <span
                  className={`w-4 h-4 rounded-full grid place-items-center text-[9px] font-extrabold shrink-0 mt-0.5 ${
                    i.done ? 'bg-kampung-jade text-white' : 'bg-gray-100 text-gray-400 border border-gray-300'
                  }`}
                >
                  {i.done ? '✓' : ''}
                </span>
                <span className="min-w-0">
                  <span className={`text-[12.5px] font-semibold ${i.done ? 'text-gray-500 line-through' : 'text-gray-800'}`}>
                    {i.label}
                  </span>
                  {i.required && !i.done && <span className="text-[11px] font-bold text-danger ml-1.5">required</span>}
                  {!i.done && i.why && <span className="block text-[11px] text-gray-500 leading-snug">{i.why}</span>}
                </span>
              </div>
            ))}
          </div>

          {/* Logo — called out because it's what shows on adverts */}
          {!profile.hasLogo && (
            <div className="rounded-company bg-errandify-orange-wash p-3 grid gap-2">
              <p className="text-[12px] text-errandify-orange-deep leading-snug">
                <b>Add your logo.</b> It appears on your offers and on every advert you run — companies with a logo look
                established rather than anonymous.
              </p>
              <input
                ref={logoRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                disabled={logoBusy}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) uploadLogo(f);
                }}
                className="text-[12px] text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-[11.5px] file:font-bold file:bg-white file:text-errandify-orange-deep"
              />
              {logoBusy && <span className="text-[11.5px] text-gray-600">Saving logo…</span>}
            </div>
          )}

          {!profile.readyToSubmit && (
            <p className="text-[12px] text-gray-600">
              Still needed before you can send for approval: <b>{profile.missingRequired.join(', ')}</b>. Fill these in
              under Company Profile below.
            </p>
          )}
        </div>
      )}

      {!pending && (
        <div className="rounded-company border border-gray-200 bg-white p-4 grid gap-3">
          <div>
            <p className="font-extrabold text-[14.5px] text-gray-800 tracking-tight">Get your “Verified business” badge</p>
            <p className="text-[12.5px] text-gray-600 mt-1">
              Attach your latest ACRA Business Profile so askers can see your company is real. We check that a
              director's name matches your SingPass account.
            </p>
          </div>

          {/* Plain-language PDPA note — why we're asking and what we keep */}
          <div className="rounded-company bg-gray-50 border border-gray-200 p-3">
            <p className="text-[11.5px] text-gray-600 leading-snug">
              <b className="text-gray-800">What we do with it:</b> we use it only to verify your company, record the result
              (date, matching officer, who reviewed it) and then <b className="text-gray-800">delete the document</b>. We don't
              keep a copy of your directors' details.
            </p>
          </div>

          <label className="grid gap-1.5">
            <span className="text-[12px] font-bold text-gray-700">ACRA Business Profile (PDF or photo)</span>
            <input
              ref={fileRef}
              type="file"
              accept="application/pdf,image/png,image/jpeg,image/webp"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="text-[12.5px] text-gray-600 file:mr-3 file:py-2 file:px-3.5 file:rounded-full file:border-0 file:text-[12px] file:font-bold file:bg-errandify-orange-wash file:text-errandify-orange-deep"
            />
          </label>

          <div className="grid sm:grid-cols-2 gap-3">
            <label className="grid gap-1.5">
              <span className="text-[12px] font-bold text-gray-700">Date on the profile</span>
              <input
                type="date"
                value={profileDate}
                max={new Date().toISOString().split('T')[0]}
                onChange={(e) => setProfileDate(e.target.value)}
                className="px-3 py-2 rounded-company border border-gray-200 bg-white text-[13px] text-gray-800 focus:outline-none focus:border-errandify-orange"
              />
              <span className="text-[11px] text-gray-500">Must be within the last 6 months</span>
            </label>

            <label className="grid gap-1.5">
              <span className="text-[12px] font-bold text-gray-700">Director's name to match (optional)</span>
              <input
                value={officer}
                onChange={(e) => setOfficer(e.target.value)}
                placeholder="As printed on the profile"
                className="px-3 py-2 rounded-company border border-gray-200 bg-white text-[13px] text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-errandify-orange"
              />
              <span className="text-[11px] text-gray-500">Our reviewer confirms this against the document</span>
            </label>
          </div>

          {error && <p className="text-[12.5px] font-semibold text-danger">{error}</p>}
          {done && <p className="text-[12.5px] font-semibold text-ok">{done}</p>}

          <button
            onClick={submit}
            disabled={submitting || (profile ? !profile.readyToSubmit : false)}
            className="justify-self-start bg-errandify-orange text-white font-bold text-[13px] px-5 py-2.5 rounded-full disabled:opacity-50"
          >
            {submitting ? 'Sending…' : 'Send for verification'}
          </button>
          {profile && !profile.readyToSubmit && (
            <p className="text-[11.5px] text-gray-500">
              Complete the required items above first — it saves a round trip with our reviewer.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
