import React, { useState, useEffect } from 'react';
import axios from 'axios';

/**
 * Everything that happens to a dispute AFTER the admin has decided it.
 *
 * The decision screen existed and worked; nothing after it did. An admin could
 * record a 60/40 split and then had no way to see whether it was releasable,
 * no way to release it, no way to see an appeal, and no way to answer one — so
 * every resolved dispute stopped there and paid nobody. This is that missing
 * half: the appeal, the readiness check, the legs, and the one button that
 * moves real money.
 */

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const auth = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
const money = (n: any) => `$${Number(n ?? 0).toFixed(2)}`;

interface Leg {
  leg: string;
  amount: string | number;
  status: string;
  stripe_reference?: string;
  error_message?: string;
  attempts?: number;
  succeeded_at?: string;
}

interface Props {
  disputeId: number;
  onClose: () => void;
  onChanged?: () => void;
}

const LEG_LABEL: Record<string, string> = {
  doer_transfer: 'To the doer',
  asker_refund: 'Back to the asker',
};

const LEG_STYLE: Record<string, string> = {
  succeeded: 'bg-green-100 text-green-800',
  pending: 'bg-yellow-100 text-yellow-800',
  failed: 'bg-red-100 text-red-800',
  skipped: 'bg-gray-100 text-gray-600',
};

export const DisputeSettlementPanel: React.FC<Props> = ({ disputeId, onClose, onChanged }) => {
  const [dispute, setDispute] = useState<any>(null);
  const [readiness, setReadiness] = useState<any>(null);
  const [preflight, setPreflight] = useState<any>(null);
  const [legs, setLegs] = useState<Leg[]>([]);
  const [drafts, setDrafts] = useState<any>(null);
  const [askerDraft, setAskerDraft] = useState('');
  const [doerDraft, setDoerDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  // Appeal review form
  const [appealDecision, setAppealDecision] = useState<'' | 'UPHELD' | 'OVERTURNED' | 'MODIFIED'>('');
  const [appealReasoning, setAppealReasoning] = useState('');
  const [newDoer, setNewDoer] = useState('');
  const [newAsker, setNewAsker] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      const [d, s] = await Promise.all([
        axios.get(`${API}/api/disputes/${disputeId}`, auth()),
        axios.get(`${API}/api/disputes/${disputeId}/settlement`, auth()),
      ]);
      setDispute(d.data?.dispute || null);
      setReadiness(s.data?.data?.readiness || null);
      setPreflight(s.data?.data?.preflight || null);
      setLegs(s.data?.data?.legs || []);
      setError('');

      // Drafts only exist once a decision has been made
      try {
        const m = await axios.get(`${API}/api/disputes/${disputeId}/outcome-messages`, auth());
        setDrafts(m.data?.data || null);
        setAskerDraft(m.data?.data?.outcome_message_asker || '');
        setDoerDraft(m.data?.data?.outcome_message_doer || '');
      } catch {
        setDrafts(null);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Could not load the settlement for this dispute.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disputeId]);

  const total = Number(dispute?.amount ?? 0);
  const decision = dispute?.decision;
  const appeal = dispute?.appeal;
  const appealWaiting = appeal?.exists && !appeal?.reviewedAt;

  // An overturn or a modification has to add up to the same errand total the
  // original decision did — the appeal changes who gets what, not how much
  // money exists.
  const revisedSum = (parseFloat(newDoer) || 0) + (parseFloat(newAsker) || 0);
  const revisedBalances = Math.abs(revisedSum - total) <= 0.01;

  const submitAppeal = async () => {
    if (!appealDecision) return setError('Choose whether the appeal is upheld, overturned or modified.');
    if (!appealReasoning.trim()) return setError('Explain the appeal outcome — both people will read it.');
    if (appealDecision === 'MODIFIED' && !revisedBalances) {
      return setError(`The revised split must add up to ${money(total)}. Right now it comes to ${money(revisedSum)}.`);
    }
    setBusy('appeal');
    setError('');
    try {
      const res = await axios.post(
        `${API}/api/disputes/${disputeId}/resolve-appeal`,
        {
          decision: appealDecision,
          reasoning: appealReasoning.trim(),
          ...(appealDecision === 'MODIFIED' && {
            newDoerAmount: parseFloat(newDoer),
            newCompanyAmount: parseFloat(newAsker),
          }),
        },
        auth()
      );
      setNotice(res.data?.message || 'Appeal decided.');
      setAppealDecision('');
      setAppealReasoning('');
      await load();
      onChanged?.();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Could not record the appeal decision.');
    } finally {
      setBusy('');
    }
  };

  const settle = async () => {
    const ok = window.confirm(
      `This moves real money now.\n\n` +
        legs
          .filter((l) => l.status !== 'succeeded' && l.status !== 'skipped')
          .map((l) => `  ${LEG_LABEL[l.leg] || l.leg}: ${money(l.amount)}`)
          .join('\n') +
        `\n\nIt cannot be undone from here — a mistake has to be reversed in Stripe. Release?`
    );
    if (!ok) return;

    setBusy('settle');
    setError('');
    try {
      const res = await axios.post(`${API}/api/disputes/${disputeId}/settle`, {}, auth());
      setNotice(res.data?.message || 'Settlement attempted.');
      await load();
      onChanged?.();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Could not settle this dispute.');
    } finally {
      setBusy('');
    }
  };

  // The endpoint takes whatever the admin submits, so the drafts are editable
  // and what is on screen is exactly what goes out. Posting an empty body — as
  // this did at first — is rejected, correctly.
  const sendMessages = async () => {
    if (!askerDraft.trim() || !doerDraft.trim()) {
      setError('Both messages need to say something before they go out.');
      return;
    }
    setBusy('messages');
    setError('');
    try {
      await axios.post(
        `${API}/api/disputes/${disputeId}/outcome-messages/send`,
        { askerMessage: askerDraft, doerMessage: doerDraft },
        auth()
      );
      setNotice('Both people have been told the outcome.');
      await load();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Could not send the outcome messages.');
    } finally {
      setBusy('');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="bg-gradient-to-r from-orange-600 to-red-600 text-white p-6 flex justify-between items-center sticky top-0 z-10">
          <div>
            <h2 className="text-2xl font-bold">Settlement — Dispute #{disputeId}</h2>
            <p className="text-orange-100 text-sm">{dispute?.jobTitle || ''}</p>
          </div>
          <button onClick={onClose} className="text-2xl hover:opacity-80">
            ×
          </button>
        </div>

        <div className="p-6 space-y-5">
          {loading && <p className="text-gray-500">Loading…</p>}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 rounded p-3 text-sm">{error}</div>
          )}
          {notice && (
            <div className="bg-green-50 border border-green-200 text-green-800 rounded p-3 text-sm">{notice}</div>
          )}

          {!loading && !decision && (
            <div className="bg-yellow-50 border border-yellow-200 rounded p-4 text-sm text-yellow-900">
              This dispute has not been decided yet, so there is nothing to settle. Decide it first.
            </div>
          )}

          {/* A rework or a non-monetary close has no split to release. Showing
              them the settlement machinery — $0.00 legs, a release button that
              can never fire — reads as something being stuck when it is not. */}
          {decision && decision.kind !== 'monetary' && (
            <div className="bg-orange-50 border border-orange-200 rounded p-4 text-sm text-orange-900">
              {decision.kind === 'rework'
                ? 'This one ended in a rework, so nothing is split. The payment stays held until the work is confirmed put right, then it goes through as originally agreed.'
                : 'This one ended without money changing hands, so there is nothing to release.'}
            </div>
          )}

          {/* ---- what was decided ------------------------------------- */}
          {decision && decision.kind === 'monetary' && (
            <section>
              <h3 className="font-semibold text-gray-800 mb-2">The decision</h3>
              <div className="bg-gray-50 rounded p-4 text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-600">To the doer</span>
                  <span className="font-semibold">{money(decision.doerAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Back to the asker</span>
                  <span className="font-semibold">{money(decision.askerAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Our fee (doer's share only)</span>
                  <span className="font-semibold">{money(decision.fee)}</span>
                </div>
                {decision.notes && <p className="text-gray-700 pt-2 border-t mt-2">{decision.notes}</p>}
              </div>
            </section>
          )}

          {/* ---- an appeal waiting on a person ------------------------- */}
          {appealWaiting && (
            <section className="border-2 border-orange-300 rounded-lg p-4 bg-orange-50">
              <h3 className="font-semibold text-orange-900 mb-1">⚖️ An appeal is waiting</h3>
              <p className="text-xs text-orange-800 mb-3">
                Nothing can be released until this is answered. One round only — your decision here is final.
              </p>
              <blockquote className="bg-white rounded p-3 text-sm text-gray-700 mb-4 border-l-4 border-orange-400">
                {appeal.reason}
              </blockquote>

              <div className="grid grid-cols-3 gap-2 mb-3">
                {(['UPHELD', 'OVERTURNED', 'MODIFIED'] as const).map((opt) => (
                  <button
                    key={opt}
                    onClick={() => {
                      setAppealDecision(opt);
                      if (opt === 'MODIFIED') {
                        setNewDoer(Number(decision?.doerAmount ?? 0).toFixed(2));
                        setNewAsker(Number(decision?.askerAmount ?? 0).toFixed(2));
                      }
                    }}
                    className={`px-3 py-2 rounded text-sm font-semibold border-2 transition ${
                      appealDecision === opt
                        ? 'border-orange-600 bg-orange-600 text-white'
                        : 'border-gray-300 bg-white text-gray-700 hover:border-orange-400'
                    }`}
                  >
                    {opt === 'UPHELD' ? 'Keep as is' : opt === 'OVERTURNED' ? 'Swap it round' : 'Change amounts'}
                  </button>
                ))}
              </div>

              {appealDecision === 'MODIFIED' && (
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <label className="text-sm">
                    <span className="text-gray-600">To the doer</span>
                    <input
                      type="number"
                      step="0.01"
                      value={newDoer}
                      onChange={(e) => setNewDoer(e.target.value)}
                      className="w-full border rounded px-3 py-2 mt-1"
                    />
                  </label>
                  <label className="text-sm">
                    <span className="text-gray-600">Back to the asker</span>
                    <input
                      type="number"
                      step="0.01"
                      value={newAsker}
                      onChange={(e) => setNewAsker(e.target.value)}
                      className="w-full border rounded px-3 py-2 mt-1"
                    />
                  </label>
                  <p className={`col-span-2 text-xs ${revisedBalances ? 'text-gray-500' : 'text-red-600'}`}>
                    Must add up to {money(total)} — currently {money(revisedSum)}.
                  </p>
                </div>
              )}

              <textarea
                value={appealReasoning}
                onChange={(e) => setAppealReasoning(e.target.value)}
                rows={3}
                placeholder="Why this is the outcome. Both people will read this."
                className="w-full border rounded px-3 py-2 text-sm mb-3"
              />

              <button
                onClick={submitAppeal}
                disabled={busy === 'appeal'}
                className="w-full bg-orange-600 text-white rounded py-2 font-semibold hover:bg-orange-700 disabled:opacity-50"
              >
                {busy === 'appeal' ? 'Recording…' : 'Record the appeal decision'}
              </button>
            </section>
          )}

          {appeal?.reviewedAt && (
            <div className="bg-gray-50 border rounded p-3 text-sm">
              <span className="font-semibold text-gray-800">Appeal {String(appeal.finalDecision).toLowerCase()}</span>
              {appeal.finalReasoning && <p className="text-gray-600 mt-1">{appeal.finalReasoning}</p>}
            </div>
          )}

          {/* ---- readiness -------------------------------------------- */}
          {decision && decision.kind === 'monetary' && readiness && (
            <section>
              <h3 className="font-semibold text-gray-800 mb-2">Can it be released?</h3>
              <div
                className={`rounded p-3 text-sm ${
                  readiness.ready
                    ? 'bg-green-50 border border-green-200 text-green-900'
                    : 'bg-yellow-50 border border-yellow-200 text-yellow-900'
                }`}
              >
                {readiness.ready ? '✅ ' : '⏳ '}
                {readiness.reason}
              </div>

              {preflight && !preflight.ok && (
                <ul className="mt-2 text-sm text-red-700 list-disc list-inside">
                  {preflight.blockers.map((b: string, i: number) => (
                    <li key={i}>{b}</li>
                  ))}
                </ul>
              )}
              {preflight?.warnings?.length > 0 && (
                <ul className="mt-2 text-sm text-amber-700 list-disc list-inside">
                  {preflight.warnings.map((w: string, i: number) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {/* ---- the legs --------------------------------------------- */}
          {decision?.kind === 'monetary' && legs.length > 0 && (
            <section>
              <h3 className="font-semibold text-gray-800 mb-2">What moves</h3>
              <div className="space-y-2">
                {legs.map((l) => (
                  <div key={l.leg} className="flex items-center justify-between bg-gray-50 rounded p-3 text-sm">
                    <div>
                      <span className="font-medium text-gray-800">{LEG_LABEL[l.leg] || l.leg}</span>
                      <span className="text-gray-500 ml-2">{money(l.amount)}</span>
                      {l.error_message && (
                        <p className="text-red-600 text-xs mt-1">
                          {l.error_message}
                          {l.attempts ? ` (attempt ${l.attempts})` : ''}
                        </p>
                      )}
                      {l.stripe_reference && (
                        <p className="text-gray-400 text-xs mt-1 font-mono">{l.stripe_reference}</p>
                      )}
                    </div>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        LEG_STYLE[l.status] || 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {l.status}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ---- the messages each side gets --------------------------- */}
          {drafts?.outcome_message_asker && (
            <section>
              <h3 className="font-semibold text-gray-800 mb-2">
                What each of them is told{drafts.outcome_messages_sent_at ? ' (sent)' : ' — draft'}
              </h3>
              {drafts.outcome_messages_sent_at ? (
                <div className="space-y-2 text-sm">
                  <div className="bg-orange-50 rounded p-3">
                    <p className="text-xs font-semibold text-orange-900 mb-1">To the asker</p>
                    <p className="text-gray-700 whitespace-pre-wrap">{drafts.outcome_message_asker}</p>
                  </div>
                  <div className="bg-rose-50 rounded p-3">
                    <p className="text-xs font-semibold text-rose-900 mb-1">To the doer</p>
                    <p className="text-gray-700 whitespace-pre-wrap">{drafts.outcome_message_doer}</p>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-xs text-gray-500 mb-2">
                    Hana drafted these from your reasoning. Edit them — what is here is what goes out.
                  </p>
                  <label className="block text-sm mb-2">
                    <span className="text-xs font-semibold text-orange-900">To the asker</span>
                    <textarea
                      value={askerDraft}
                      onChange={(e) => setAskerDraft(e.target.value)}
                      rows={4}
                      className="w-full border rounded px-3 py-2 mt-1 text-sm"
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="text-xs font-semibold text-rose-900">To the doer</span>
                    <textarea
                      value={doerDraft}
                      onChange={(e) => setDoerDraft(e.target.value)}
                      rows={4}
                      className="w-full border rounded px-3 py-2 mt-1 text-sm"
                    />
                  </label>
                  <button
                    onClick={sendMessages}
                    disabled={busy === 'messages'}
                    className="mt-2 text-sm text-orange-600 hover:text-orange-800 font-semibold disabled:opacity-50"
                  >
                    {busy === 'messages' ? 'Sending…' : 'Send these →'}
                  </button>
                </>
              )}
            </section>
          )}

          {/* ---- release ---------------------------------------------- */}
          {decision && decision.kind === 'monetary' && decision.settlementStatus !== 'settled' && (
            <button
              onClick={settle}
              disabled={busy === 'settle' || !readiness?.ready || (preflight && !preflight.ok)}
              className="w-full bg-green-600 text-white rounded-lg py-3 font-semibold hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {busy === 'settle' ? 'Releasing…' : `Release the money (${money(decision.doerAmount)} / ${money(decision.askerAmount)})`}
            </button>
          )}

          {decision?.settlementStatus === 'settled' && (
            <div className="bg-green-50 border border-green-200 rounded p-4 text-sm text-green-900">
              ✅ Settled{decision.settledAt ? ` on ${new Date(decision.settledAt).toLocaleString('en-SG')}` : ''}. Both
              sides have been paid their share.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DisputeSettlementPanel;
