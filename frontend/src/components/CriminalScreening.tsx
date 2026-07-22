import { useState } from 'react';
import axios from 'axios';

interface CriminalScreeningProps {
  onComplete: () => void;
  onCancel?: () => void;
}

/**
 * Criminal declaration, asked progressively.
 *
 * This used to put five statutory yes/no questions in front of every person
 * signing up. Almost everyone answers no to all five, so almost everyone was
 * reading legal text that did not apply to them.
 *
 * Now: one question for everyone. The specific ones appear only for the few who
 * answer yes, and only where the answer changes the outcome — a permanent-tier
 * offence is never asked for a sentence date, because no date could alter the
 * result. The backend tiers the answers (services/screeningResolver).
 *
 * Anything ambiguous becomes a human review rather than a guess, so "something
 * else" is a safe answer to give rather than a dead end.
 */

const OFFENCE_TYPES: Array<{ value: string; label: string; hint: string }> = [
  { value: 'violence', label: 'Violence against a person', hint: 'Assault, causing hurt, or similar' },
  { value: 'sexual', label: 'A sexual offence', hint: 'Including outrage of modesty' },
  { value: 'against_child', label: 'An offence involving a child or young person', hint: '' },
  { value: 'against_vulnerable_adult', label: 'An offence against an elderly or vulnerable adult', hint: '' },
  { value: 'kidnapping', label: 'Kidnapping or abduction', hint: '' },
  { value: 'dishonesty', label: 'Dishonesty, fraud or theft', hint: 'Cheating, criminal breach of trust, shoplifting' },
  { value: 'drug', label: 'A drug-related offence', hint: '' },
  { value: 'other', label: 'Something else', hint: "We'll have someone review it with you" },
];

// Tiers no follow-up question can change. Asking for a sentence date after one
// of these would imply the answer might matter — it does not.
const PERMANENT = new Set(['violence', 'sexual', 'against_child', 'against_vulnerable_adult', 'kidnapping']);

export default function CriminalScreening({ onComplete, onCancel }: CriminalScreeningProps) {
  const [step, setStep] = useState<'ask' | 'details' | 'confirm'>('ask');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [hasConviction, setHasConviction] = useState<boolean | null>(null);
  const [offenceTypes, setOffenceTypes] = useState<string[]>([]);
  const [sentenceCompletedOn, setSentenceCompletedOn] = useState('');
  const [underMonitoring, setUnderMonitoring] = useState(false);
  const [understood, setUnderstood] = useState(false);

  const needsSentenceDate = offenceTypes.length > 0 && !offenceTypes.some((t) => PERMANENT.has(t));
  const asksMonitoring = offenceTypes.includes('drug');

  const toggleType = (v: string) =>
    setOffenceTypes((cur) => (cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v]));

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
          hasConviction: Boolean(hasConviction),
          offenceTypes: hasConviction ? offenceTypes : [],
          sentenceCompletedOn: hasConviction && needsSentenceDate ? sentenceCompletedOn || null : null,
          underMonitoring: hasConviction && asksMonitoring ? underMonitoring : false,
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

  // ── Step 1: the only question most people ever see ──────────────────────
  if (step === 'ask') {
    return shell(
      <>
        <h2 className="text-2xl font-bold text-gray-800 mb-3">⚖️ Safety declaration</h2>
        <p className="text-gray-700 mb-6">
          Errands involving children, elderly or vulnerable people, home access or driving
          passengers need a background declaration. Everything else is open to everyone.
        </p>

        <p className="font-semibold text-gray-800 mb-4">
          Have you ever been convicted of a criminal offence, in Singapore or elsewhere?
        </p>

        <div className="space-y-3 mb-6">
          <button
            onClick={() => { setHasConviction(false); setOffenceTypes([]); setStep('confirm'); }}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg font-semibold text-left hover:border-errandify-orange"
          >
            No
          </button>
          <button
            onClick={() => { setHasConviction(true); setStep('details'); }}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg font-semibold text-left hover:border-errandify-orange"
          >
            Yes
          </button>
        </div>

        <p className="text-gray-500 text-xs mb-4">
          A conviction does not stop you joining Errandify. It may make some categories
          unavailable, in many cases only for a period.
        </p>

        {onCancel && (
          <button onClick={onCancel} className="w-full px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm">
            Skip for now (limited access)
          </button>
        )}
      </>
    );
  }

  // ── Step 2: only for people who said yes ────────────────────────────────
  if (step === 'details') {
    return shell(
      <>
        <h2 className="text-xl font-bold text-gray-800 mb-2">What kind of offence was it?</h2>
        <p className="text-gray-600 text-sm mb-5">
          Select all that apply. This decides which categories are affected and for how long, so it
          is worth being accurate.
        </p>

        <div className="space-y-2 mb-5">
          {OFFENCE_TYPES.map((o) => (
            <label
              key={o.value}
              className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer ${
                offenceTypes.includes(o.value) ? 'border-errandify-orange bg-orange-50' : 'border-gray-200'
              }`}
            >
              <input
                type="checkbox"
                checked={offenceTypes.includes(o.value)}
                onChange={() => toggleType(o.value)}
                className="mt-1 w-4 h-4"
              />
              <span>
                <span className="text-sm font-semibold text-gray-800">{o.label}</span>
                {o.hint && <span className="block text-xs text-gray-500">{o.hint}</span>}
              </span>
            </label>
          ))}
        </div>

        {/* Only asked when it can change the answer — a permanent-tier offence
            is unaffected by when the sentence ended. */}
        {needsSentenceDate && (
          <div className="mb-4 p-4 bg-gray-50 rounded-lg">
            <label className="block text-sm font-semibold text-gray-800 mb-1">
              When did you complete your sentence?
            </label>
            <p className="text-xs text-gray-500 mb-2">
              Any restriction period is counted from this date. Leave blank if it is ongoing.
            </p>
            <input
              type="date"
              value={sentenceCompletedOn}
              onChange={(e) => setSentenceCompletedOn(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg"
            />
          </div>
        )}

        {asksMonitoring && (
          <label className="flex items-center gap-3 mb-4 p-3 bg-gray-50 rounded-lg cursor-pointer">
            <input
              type="checkbox"
              checked={underMonitoring}
              onChange={(e) => setUnderMonitoring(e.target.checked)}
              className="w-4 h-4"
            />
            <span className="text-sm text-gray-800">
              I am currently on a monitoring or rehabilitation programme
            </span>
          </label>
        )}

        {error && <p className="text-red-600 text-sm mb-3">{error}</p>}

        <div className="flex gap-2">
          <button
            onClick={() => setStep('ask')}
            className="px-4 py-3 bg-gray-200 text-gray-700 rounded-lg font-bold"
          >
            Back
          </button>
          <button
            onClick={() => {
              if (offenceTypes.length === 0) {
                setError('Please choose at least one, or select "Something else"');
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
  const permanent = offenceTypes.some((t) => PERMANENT.has(t));
  return shell(
    <>
      <h2 className="text-xl font-bold text-gray-800 mb-4">Confirm your declaration</h2>

      <div className="bg-gray-50 rounded-lg p-4 mb-5 text-sm">
        {!hasConviction ? (
          <p className="text-gray-800">You have declared that you have no criminal convictions.</p>
        ) : (
          <>
            <p className="text-gray-800 mb-2">You have declared a conviction for:</p>
            <ul className="list-disc list-inside text-gray-700 space-y-0.5">
              {offenceTypes.map((t) => (
                <li key={t}>{OFFENCE_TYPES.find((o) => o.value === t)?.label}</li>
              ))}
            </ul>
            {sentenceCompletedOn && (
              <p className="text-gray-600 mt-2">Sentence completed {sentenceCompletedOn}</p>
            )}
          </>
        )}
      </div>

      {hasConviction && (
        <div className="bg-orange-50 border-l-4 border-errandify-orange p-4 mb-5 text-sm text-gray-800">
          {permanent
            ? 'Categories involving children, vulnerable adults, home access and passenger transport will not be available on your account. Everything else stays open.'
            : 'Some categories may be unavailable for a period, or while our team reviews your declaration. Everything else stays open.'}
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
          onClick={() => setStep(hasConviction ? 'details' : 'ask')}
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
