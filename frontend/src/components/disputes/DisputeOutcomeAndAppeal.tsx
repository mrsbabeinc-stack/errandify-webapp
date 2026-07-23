import React, { useState, useEffect } from 'react';

/**
 * What was decided, and — if they are entitled to it — the way to appeal.
 *
 * The appeal route existed on the server and enforced real rules about who may
 * use it, but no screen ever offered it. Someone on the losing side of a
 * decision had a 24-hour window to object and no button anywhere to object
 * with, which makes the window decorative. This is that button, plus the plain
 * statement of what the decision means for their money.
 *
 * Self-contained on purpose: it fetches the dispute itself so it can be dropped
 * into any party-side view without that view having to know about settlement
 * columns or appeal rights.
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const money = (n: any) => `$${Number(n ?? 0).toFixed(2)}`;

interface Props {
  /** Pass this when you already know the dispute */
  disputeId?: number;
  /** Or this, when you only have the errand — the usual case for a party */
  errandId?: number;
  onChanged?: () => void;
}

export const DisputeOutcomeAndAppeal: React.FC<Props> = ({ disputeId, errandId, onChanged }) => {
  const [resolvedId, setResolvedId] = useState<number | null>(disputeId ?? null);
  const [dispute, setDispute] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState('');

  const auth = { Authorization: `Bearer ${localStorage.getItem('token')}` };

  const load = async () => {
    try {
      // A party knows their errand, not the dispute id, so resolve it first.
      let id = disputeId ?? resolvedId;
      if (!id && errandId) {
        const lookup = await fetch(`${API_URL}/api/disputes/for-errand/${errandId}`, { headers: auth });
        if (!lookup.ok) return;
        id = (await lookup.json())?.dispute?.id ?? null;
        setResolvedId(id);
      }
      if (!id) return;

      const res = await fetch(`${API_URL}/api/disputes/${id}`, { headers: auth });
      if (!res.ok) return;
      const data = await res.json();
      setDispute(data?.dispute || null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disputeId, errandId]);

  const submit = async () => {
    if (reason.trim().length < 20) {
      setError('Tell us what specifically was wrong, or what new information you have — at least a sentence.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/api/disputes/${disputeId ?? resolvedId}/appeal`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ reason: reason.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Could not submit your appeal.');
      setDone(data?.message || 'Appeal submitted.');
      setShowForm(false);
      await load();
      onChanged?.();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !dispute?.decision) return null;

  const d = dispute.decision;
  const appeal = dispute.appeal || {};
  const closesAt = appeal.windowClosesAt ? new Date(appeal.windowClosesAt) : null;
  const hoursLeft = closesAt ? Math.max(0, Math.round((closesAt.getTime() - Date.now()) / 3600000)) : 0;

  // Say it from the reader's side. "That means $60 to you" is a different
  // sentence from "$60 to the doer" when you are the doer. The server works out
  // which side they are on — it is the only place that knows.
  const side = dispute.viewerSide;
  const yours = side === 'doer' ? d.doerAmount : side === 'asker' ? d.askerAmount : null;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
      <h3 className="text-lg font-semibold text-gray-800">What was decided</h3>

      {d.kind === 'non_monetary' ? (
        <p className="text-gray-700">
          No money changed hands over this one. {d.notes}
        </p>
      ) : (
        <>
          <div className="bg-gray-50 rounded-lg p-4 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">To the person who did the errand</span>
              <span className="font-semibold text-gray-900">{money(d.doerAmount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Back to the person who posted it</span>
              <span className="font-semibold text-gray-900">{money(d.askerAmount)}</span>
            </div>
            {yours !== null && (
              <p className="pt-2 mt-2 border-t text-gray-800 font-medium">
                That means {money(yours)} to you.
              </p>
            )}
          </div>
          {d.notes && <p className="text-gray-700 text-sm whitespace-pre-wrap">{d.notes}</p>}
        </>
      )}

      {d.settlementStatus === 'settled' && (
        <p className="text-sm text-green-700">
          ✅ Paid out{d.settledAt ? ` on ${new Date(d.settledAt).toLocaleDateString('en-SG')}` : ''}.
        </p>
      )}

      {/* ---- the appeal ------------------------------------------------ */}
      {appeal.exists && !appeal.reviewedAt && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 text-sm">
          <p className="font-semibold text-orange-900">An appeal is being looked at</p>
          <p className="text-orange-800 mt-1">
            Nothing will be paid out until someone has read it again.
          </p>
        </div>
      )}

      {appeal.reviewedAt && (
        <div className="bg-gray-50 border rounded-lg p-4 text-sm">
          <p className="font-semibold text-gray-800">
            The appeal was {String(appeal.finalDecision || '').toLowerCase() === 'upheld'
              ? 'considered and the original decision stands'
              : String(appeal.finalDecision || '').toLowerCase()}
          </p>
          {appeal.finalReasoning && <p className="text-gray-600 mt-1">{appeal.finalReasoning}</p>}
          <p className="text-gray-500 mt-2 text-xs">This decision is final.</p>
        </div>
      )}

      {done && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800">{done}</div>
      )}

      {appeal.canAppeal && !showForm && (
        <div className="border-t pt-4">
          <p className="text-sm text-gray-600 mb-2">
            If you think this is wrong, you can ask for it to be looked at once more
            {hoursLeft > 0 ? ` — you have about ${hoursLeft} hour${hoursLeft === 1 ? '' : 's'} left` : ''}.
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 border-2 border-orange-500 text-orange-600 rounded-lg font-semibold text-sm hover:bg-orange-50"
          >
            Ask for another look
          </button>
        </div>
      )}

      {showForm && (
        <div className="border-t pt-4 space-y-3">
          <label className="block text-sm text-gray-700">
            What was wrong, or what have we not seen?
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              placeholder="Be specific — a new photo, a message we did not have, something that was misread. This is the only appeal, so put everything in."
              className="w-full border rounded-lg px-3 py-2 mt-1 text-sm"
            />
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={submit}
              disabled={submitting}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg font-semibold text-sm hover:bg-orange-700 disabled:opacity-50"
            >
              {submitting ? 'Sending…' : 'Send the appeal'}
            </button>
            <button
              onClick={() => {
                setShowForm(false);
                setError('');
              }}
              className="px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {!appeal.canAppeal && !appeal.exists && appeal.whyNot && (
        <p className="text-xs text-gray-500 border-t pt-3">{appeal.whyNot}</p>
      )}
    </div>
  );
};

export default DisputeOutcomeAndAppeal;
