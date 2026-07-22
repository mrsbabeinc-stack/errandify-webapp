import { useState } from 'react';
import axios from 'axios';

interface Props {
  /** Category the person is trying to work in, for context in the copy. */
  categoryLabel?: string;
  onComplete: () => void;
  onCancel?: () => void;
}

/**
 * The declaration required for work involving children, older or vulnerable
 * people, home access, or driving passengers.
 *
 * Three earlier versions got the tone wrong as well as the scope.
 *
 * SCOPE. It used to be asked of everyone at signup. It gates 7 of 16
 * categories, so a person doing delivery or tech support was being asked to
 * disclose a criminal record that could never affect anything they did. That
 * is poor data minimisation and a discouraging thing to meet on day one. It is
 * now asked only when someone chooses work it applies to.
 *
 * TONE. It was headed "Criminal Record Declaration" under a page called
 * "Safety Verification", which frames the reader as a suspect being cleared.
 * Most people answering this have done nothing, and the ones who have are
 * entitled to be treated as people looking for work rather than risks being
 * managed. So: lead with the reason, name the law rather than implying
 * suspicion, keep the "no" path to a single tap, and make the "yes" path
 * plain about the fact that they are still welcome here.
 *
 * Nothing about the checks themselves is softened — what is asked, and what it
 * results in, is unchanged. Only who is asked, and how.
 */

type Tri = 'yes' | 'no' | 'unsure' | null;
const triToBool = (v: Tri): boolean | null => (v === 'yes' ? true : v === 'no' ? false : null);

export default function SensitiveWorkDeclaration({ categoryLabel, onComplete, onCancel }: Props) {
  const [step, setStep] = useState<'ask' | 'details'>('ask');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showSpentHelp, setShowSpentHelp] = useState(false);

  const [hasUnspent, setHasUnspent] = useState<boolean | null>(null);
  const [thirdSchedule, setThirdSchedule] = useState<Tri>(null);
  const [overThreshold, setOverThreshold] = useState<Tri>(null);
  const [convictedOn, setConvictedOn] = useState('');

  const canStillSpend = thirdSchedule === 'no' && overThreshold === 'no';

  const send = async (unspent: boolean) => {
    setLoading(true);
    setError('');
    try {
      const res = await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/screening/declare`,
        {
          hasUnspentConviction: unspent,
          thirdScheduleOffence: unspent ? triToBool(thirdSchedule) : null,
          exceededSentenceThreshold: unspent ? triToBool(overThreshold) : null,
          convictedOn: unspent && canStillSpend ? convictedOn || null : null,
          understoodRestrictions: true,
        },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      if (res.data?.success) onComplete();
      else setError(res.data?.error || 'Something went wrong. Please try again.');
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const shell = (children: React.ReactNode) => (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">{children}</div>
      </div>
    </div>
  );

  const triGroup = (value: Tri, onChange: (v: Tri) => void) => (
    <div className="flex gap-2">
      {(['yes', 'no', 'unsure'] as const).map((v) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          className={`flex-1 px-3 py-2 rounded-lg border-2 text-sm font-semibold ${
            value === v
              ? 'border-errandify-orange bg-orange-50 text-errandify-orange'
              : 'border-gray-200 text-gray-600'
          }`}
        >
          {v === 'yes' ? 'Yes' : v === 'no' ? 'No' : 'Not sure'}
        </button>
      ))}
    </div>
  );

  // ── One question. Most people are done here. ────────────────────────────
  if (step === 'ask') {
    return shell(
      <>
        <div className="text-3xl mb-3">🤝</div>
        <h2 className="text-xl font-bold text-errandify-brown mb-2">
          One thing before you take {categoryLabel ? `${categoryLabel} work` : 'this kind of work'}
        </h2>

        {/* Reason first. The question makes sense once you know why it exists,
            and it stops the whole thing reading as suspicion. */}
        <p className="text-gray-700 text-sm mb-5">
          Errands like this involve looking after children or older people, being in someone's
          home, or driving them somewhere. Singapore law asks platforms to check one thing before
          someone takes on work like that.
        </p>

        <p className="font-semibold text-gray-800 mb-1">
          Do you have any unspent criminal conviction?
        </p>

        <button
          type="button"
          onClick={() => setShowSpentHelp((v) => !v)}
          className="text-xs text-errandify-orange underline mb-3"
        >
          What does “unspent” mean?
        </button>

        {showSpentHelp && (
          <div className="bg-gray-50 rounded-lg p-3 mb-3 text-xs text-gray-600">
            Under the Registration of Criminals Act, most convictions become{' '}
            <strong>spent</strong> after five years without further offending. Once a conviction is
            spent you are treated as having none, and there is nothing to declare here. More
            serious offences and longer sentences do not become spent.
          </div>
        )}

        <div className="space-y-2 mb-4">
          <button
            type="button"
            disabled={loading}
            onClick={() => { setHasUnspent(false); send(false); }}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg font-semibold text-left hover:border-errandify-orange disabled:opacity-50"
          >
            No
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => { setHasUnspent(true); setStep('details'); }}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg font-semibold text-left hover:border-errandify-orange disabled:opacity-50"
          >
            Yes
          </button>
        </div>

        {/* Said plainly and early, because the fear this question creates is
            "am I about to be thrown off the platform". */}
        <p className="text-gray-600 text-xs mb-4">
          Answering yes does not remove you from Errandify or affect the work you already do. It
          only affects these particular categories, and often only for a period.
        </p>

        {error && <p className="text-red-600 text-sm mb-3">{error}</p>}

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="w-full px-4 py-2 text-gray-600 text-sm disabled:opacity-50"
          >
            Not now — take me back
          </button>
        )}
      </>
    );
  }

  // ── Two questions, for the few who said yes. ────────────────────────────
  return shell(
    <>
      <h2 className="text-xl font-bold text-errandify-brown mb-2">Thanks for telling us</h2>
      <p className="text-gray-700 text-sm mb-5">
        Two more questions. They decide whether this is temporary or not — under the law most
        records stop counting after five years. If you are unsure of either, say so and someone
        will go through it with you.
      </p>

      <div className="mb-5">
        <p className="text-sm font-semibold text-gray-800 mb-2">
          Was it a serious offence — for example rape, homicide, kidnapping or gang robbery?
        </p>
        {triGroup(thirdSchedule, setThirdSchedule)}
      </div>

      <div className="mb-5">
        <p className="text-sm font-semibold text-gray-800 mb-2">
          Was the sentence more than 3 months in prison, or a fine over $2,000?
        </p>
        {triGroup(overThreshold, setOverThreshold)}
      </div>

      {canStillSpend && (
        <div className="mb-5">
          <p className="text-sm font-semibold text-gray-800 mb-1">When were you convicted?</p>
          <p className="text-xs text-gray-500 mb-2">
            The five years counts from this date, so it tells us when this stops applying.
          </p>
          <input
            type="date"
            value={convictedOn}
            onChange={(e) => setConvictedOn(e.target.value)}
            max={new Date().toISOString().split('T')[0]}
            className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg"
          />
        </div>
      )}

      {(thirdSchedule === 'unsure' || overThreshold === 'unsure') && (
        <p className="text-xs text-gray-600 bg-gray-50 rounded-lg p-3 mb-4">
          No problem. Someone from our team will look at this and get back to you — you do not need
          to find the paperwork yourself.
        </p>
      )}

      {error && <p className="text-red-600 text-sm mb-3">{error}</p>}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setStep('ask')}
          disabled={loading}
          className="px-4 py-3 bg-gray-100 text-gray-700 rounded-lg font-semibold disabled:opacity-50"
        >
          Back
        </button>
        <button
          type="button"
          disabled={loading || !thirdSchedule || !overThreshold}
          onClick={() => send(true)}
          className="flex-1 px-4 py-3 bg-errandify-orange text-white rounded-lg font-bold disabled:opacity-50"
        >
          {loading ? 'Sending…' : 'Done'}
        </button>
      </div>
    </>
  );
}
