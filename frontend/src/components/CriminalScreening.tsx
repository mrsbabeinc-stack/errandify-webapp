import { useState } from 'react';
import axios from 'axios';

interface CriminalScreeningProps {
  onComplete: () => void;
  onCancel?: () => void;
}

/**
 * Criminal declaration, scoped to what the law actually asks.
 *
 * Two earlier versions were wrong in opposite directions. The first put five
 * statutory questions in front of every person signing up, when almost nobody
 * they applied to. The second asked "have you EVER been convicted" — broader
 * than the law requires, because under the Registration of Criminals Act 1949
 * s7B a record becomes SPENT after five crime-free years, and the person is
 * then treated as having no conviction at all.
 *
 * So this asks only about UNSPENT convictions, then the two things s7C uses to
 * decide whether a record can ever become spent. The backend applies the
 * statute (services/screeningResolver); nothing here invents a rule.
 *
 * "I'm not sure" is always available and always safe — it routes to a person
 * rather than guessing against the applicant. Most people answer one question.
 */

type Tri = 'yes' | 'no' | 'unsure' | null;

const triToBool = (v: Tri): boolean | null => (v === 'yes' ? true : v === 'no' ? false : null);

export default function CriminalScreening({ onComplete, onCancel }: CriminalScreeningProps) {
  const [step, setStep] = useState<'ask' | 'details' | 'confirm'>('ask');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [hasUnspent, setHasUnspent] = useState<boolean | null>(null);
  const [thirdSchedule, setThirdSchedule] = useState<Tri>(null);
  const [overThreshold, setOverThreshold] = useState<Tri>(null);
  const [convictedOn, setConvictedOn] = useState('');
  const [understood, setUnderstood] = useState(false);

  // A record that can never be spent is permanent, so the conviction date
  // cannot change the outcome and is not worth asking for.
  const canStillSpend = thirdSchedule === 'no' && overThreshold === 'no';

  const submit = async () => {
    if (!understood) {
      setError('Please confirm your declaration before continuing');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/screening/declare`,
        {
          hasUnspentConviction: Boolean(hasUnspent),
          thirdScheduleOffence: hasUnspent ? triToBool(thirdSchedule) : null,
          exceededSentenceThreshold: hasUnspent ? triToBool(overThreshold) : null,
          convictedOn: hasUnspent && canStillSpend ? convictedOn || null : null,
          understoodRestrictions: true,
        },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      if (res.data?.success) onComplete();
      else setError(res.data?.error || 'Could not record your declaration');
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Could not record your declaration. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const shell = (children: React.ReactNode) => (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">{children}</div>
      </div>
    </div>
  );

  const triGroup = (value: Tri, onChange: (v: Tri) => void) => (
    <div className="flex gap-2">
      {(['yes', 'no', 'unsure'] as const).map((v) => (
        <button
          key={v}
          onClick={() => onChange(v)}
          className={`flex-1 px-3 py-2 rounded-lg border-2 text-sm font-semibold ${
            value === v ? 'border-errandify-orange bg-orange-50 text-errandify-orange' : 'border-gray-200 text-gray-600'
          }`}
        >
          {v === 'yes' ? 'Yes' : v === 'no' ? 'No' : "I'm not sure"}
        </button>
      ))}
    </div>
  );

  // ── Step 1: the only question most people ever see ──────────────────────
  if (step === 'ask') {
    return shell(
      <>
        <h2 className="text-2xl font-bold text-gray-800 mb-3">⚖️ Safety declaration</h2>
        <p className="text-gray-700 mb-5">
          Errands involving children, elderly or vulnerable people, home access or driving
          passengers need a background declaration. Everything else is open to everyone.
        </p>

        <p className="font-semibold text-gray-800 mb-2">
          Do you have any <span className="underline">unspent</span> criminal conviction?
        </p>

        {/* Spelling this out matters: someone whose record is spent is entitled
            to answer no, and most people have never heard the term. */}
        <div className="bg-gray-50 rounded-lg p-3 mb-5 text-xs text-gray-600">
          <p className="font-semibold text-gray-700 mb-1">What does “spent” mean?</p>
          <p>
            Under the Registration of Criminals Act, most convictions become <strong>spent</strong>{' '}
            after five years without further offending — and once spent, you are treated as having
            no conviction. You do not need to declare a spent record here. Serious offences and
            longer sentences never become spent.
          </p>
        </div>

        <div className="space-y-3 mb-5">
          <button
            onClick={() => { setHasUnspent(false); setStep('confirm'); }}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg font-semibold text-left hover:border-errandify-orange"
          >
            No — none, or my record is spent
          </button>
          <button
            onClick={() => { setHasUnspent(true); setStep('details'); }}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg font-semibold text-left hover:border-errandify-orange"
          >
            Yes
          </button>
        </div>

        <p className="text-gray-500 text-xs mb-4">
          A conviction does not stop you joining Errandify. It may make some categories
          unavailable, in many cases only until your record becomes spent.
        </p>

        {onCancel && (
          <button onClick={onCancel} className="w-full px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm">
            Skip for now (limited access)
          </button>
        )}
      </>
    );
  }

  // ── Step 2: the two s7C questions, for the few who said yes ─────────────
  if (step === 'details') {
    return shell(
      <>
        <h2 className="text-xl font-bold text-gray-800 mb-2">A couple more questions</h2>
        <p className="text-gray-600 text-sm mb-5">
          These decide whether your record can become spent over time. If you are unsure of
          either, say so — someone will look at it with you rather than assume the worst.
        </p>

        <div className="mb-5">
          <p className="text-sm font-semibold text-gray-800 mb-1">
            Was the offence a serious one such as rape, homicide, kidnapping or gang robbery?
          </p>
          <p className="text-xs text-gray-500 mb-2">
            These are listed in the Third Schedule to the Registration of Criminals Act and never
            become spent.
          </p>
          {triGroup(thirdSchedule, setThirdSchedule)}
        </div>

        <div className="mb-5">
          <p className="text-sm font-semibold text-gray-800 mb-1">
            Was the sentence more than 3 months in prison, or a fine over $2,000?
          </p>
          <p className="text-xs text-gray-500 mb-2">
            Sentences above this threshold also prevent a record becoming spent.
          </p>
          {triGroup(overThreshold, setOverThreshold)}
        </div>

        {/* Only asked when the record can still spend — otherwise the date
            cannot change anything. */}
        {canStillSpend && (
          <div className="mb-5 p-4 bg-gray-50 rounded-lg">
            <label className="block text-sm font-semibold text-gray-800 mb-1">
              When were you convicted?
            </label>
            <p className="text-xs text-gray-500 mb-2">
              The five-year period runs from this date. We use it to work out when your record
              becomes spent.
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

        {error && <p className="text-red-600 text-sm mb-3">{error}</p>}

        <div className="flex gap-2">
          <button onClick={() => setStep('ask')} className="px-4 py-3 bg-gray-200 text-gray-700 rounded-lg font-bold">
            Back
          </button>
          <button
            onClick={() => {
              if (!thirdSchedule || !overThreshold) {
                setError('Please answer both questions, or choose "I\'m not sure"');
                return;
              }
              setError('');
              setStep('confirm');
            }}
            className="flex-1 px-4 py-3 bg-errandify-orange text-white rounded-lg font-bold"
          >
            Continue
          </button>
        </div>
      </>
    );
  }

  // ── Step 3: the attestation ─────────────────────────────────────────────
  const permanent = thirdSchedule === 'yes' || overThreshold === 'yes';
  const needsReview = hasUnspent && (thirdSchedule === 'unsure' || overThreshold === 'unsure' || (canStillSpend && !convictedOn));

  return shell(
    <>
      <h2 className="text-xl font-bold text-gray-800 mb-4">Confirm your declaration</h2>

      <div className="bg-gray-50 rounded-lg p-4 mb-5 text-sm text-gray-800">
        {!hasUnspent ? (
          <p>You have declared that you have no unspent criminal conviction.</p>
        ) : (
          <ul className="space-y-1">
            <li>You have declared an unspent conviction.</li>
            <li>Serious (Third Schedule) offence: <strong>{thirdSchedule === 'yes' ? 'Yes' : thirdSchedule === 'no' ? 'No' : 'Not sure'}</strong></li>
            <li>Sentence over 3 months / $2,000: <strong>{overThreshold === 'yes' ? 'Yes' : overThreshold === 'no' ? 'No' : 'Not sure'}</strong></li>
            {convictedOn && <li>Convicted on <strong>{convictedOn}</strong></li>}
          </ul>
        )}
      </div>

      {hasUnspent && (
        <div className="bg-orange-50 border-l-4 border-errandify-orange p-4 mb-5 text-sm text-gray-800">
          {needsReview
            ? 'Our team will review your declaration. Some categories are unavailable while we do — we will come back to you.'
            : permanent
            ? 'Categories involving children, vulnerable adults, home access and passenger transport will not be available on your account. Everything else stays open.'
            : 'Some categories will be unavailable until your record becomes spent, then they open automatically. Everything else stays open now.'}
        </div>
      )}

      <label className="flex items-start gap-3 mb-5 cursor-pointer">
        <input
          type="checkbox"
          checked={understood}
          onChange={(e) => setUnderstood(e.target.checked)}
          className="mt-1 w-4 h-4"
        />
        <span className="text-sm text-gray-700">
          I declare that the above is true and complete. I understand that giving false information
          may result in my account being removed.
        </span>
      </label>

      {error && <p className="text-red-600 text-sm mb-3">{error}</p>}

      <div className="flex gap-2">
        <button
          onClick={() => setStep(hasUnspent ? 'details' : 'ask')}
          disabled={loading}
          className="px-4 py-3 bg-gray-200 text-gray-700 rounded-lg font-bold disabled:opacity-50"
        >
          Back
        </button>
        <button
          onClick={submit}
          disabled={loading || !understood}
          className="flex-1 px-4 py-3 bg-errandify-orange text-white rounded-lg font-bold disabled:opacity-50"
        >
          {loading ? 'Submitting…' : 'Submit declaration'}
        </button>
      </div>
    </>
  );
}
