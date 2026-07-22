import { useState } from 'react';
import { OFFENCE_OPTIONS, type OffenceType } from '../../constants/offenceOptions';
import { useToastNotification } from '../../utils/toastNotification';

interface VerificationStepProps {
  onComplete: () => void;
  onBack: () => void;
}

export default function VerificationStep({ onComplete, onBack }: VerificationStepProps) {
  const { showSuccess, showError } = useToastNotification();
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  const [formData, setFormData] = useState({
    criminalRecord: false,
    accurateInformation: false,
    agreeTerms: false,
    agreePrivacy: false,
    responsibleUse: false,
    authorizedToWork: false,
  });

  // Deliberately NOT a checkbox. The five above are "tick to agree"; a sixth
  // negative one ("I have no conviction") gets ticked on autopilot by someone
  // who does have one, turning carelessness into a false declaration that our
  // own wording says justifies removing their account. A choice with no default
  // cannot be swept up in that.
  const [hasConviction, setHasConviction] = useState<boolean | null>(null);
  const [thirdSchedule, setThirdSchedule] = useState<'yes' | 'no' | 'unsure' | null>(null);
  const [offenceType, setOffenceType] = useState<OffenceType | null>(null);
  const [overThreshold, setOverThreshold] = useState<'yes' | 'no' | 'unsure' | null>(null);
  const [convictedOn, setConvictedOn] = useState('');
  const [applicantNote, setApplicantNote] = useState('');
  // The serious-offence list is disclosure-on-demand, not part of the question.
  const [showSeriousList, setShowSeriousList] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // A Third Schedule offence never becomes spent (RCA s7C(a)), so a yes fixes
  // the outcome and nothing asked afterwards could change it. Everything below
  // that question is therefore skipped entirely rather than asked and ignored.
  const settledByThirdSchedule = thirdSchedule === 'yes';

  const canShowConvictionDate = thirdSchedule === 'no' && overThreshold === 'no';

  const handleCheckboxChange = (field: keyof typeof formData) => {
    setFormData(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Required checkboxes (safety critical)
    if (!formData.accurateInformation) newErrors.accurateInformation = 'Required';
    if (!formData.agreeTerms) newErrors.agreeTerms = 'Required';
    if (!formData.agreePrivacy) newErrors.agreePrivacy = 'Required';
    if (!formData.responsibleUse) newErrors.responsibleUse = 'Required';
    if (!formData.authorizedToWork) newErrors.authorizedToWork = 'Required';

    if (hasConviction === null) newErrors.hasConviction = 'Required';
    if (hasConviction === true) {
      if (!thirdSchedule) newErrors.thirdSchedule = 'Required';
      // A settled case is not asked the rest, so it cannot be required to
      // answer them.
      if (thirdSchedule && !settledByThirdSchedule) {
        if (!offenceType) newErrors.offenceType = 'Required';
        if (!overThreshold) newErrors.overThreshold = 'Required';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      showError('Verification Required', 'Please check all required boxes');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');

      // /api/screenings never existed, so every agreement collected here was
      // discarded while the screen reported success. These are the consents;
      // the criminal declarations are made on the next step.
      const response = await fetch(`${API_URL}/api/users/consents`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          agreed_terms: formData.agreeTerms,
          agreed_privacy: formData.agreePrivacy,
          responsible_use: formData.responsibleUse,
          authorized_to_work: formData.authorizedToWork,
          accurate_information: formData.accurateInformation,
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to record your agreement');
      }

      const tri = (v: string | null) => (v === 'yes' ? true : v === 'no' ? false : null);
      const canStillSpend = thirdSchedule === 'no' && overThreshold === 'no';

      const scRes = await fetch(`${API_URL}/api/screening/declare`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hasUnspentConviction: Boolean(hasConviction),
          // A settled case sends nulls for what it was never asked, rather
          // than values left in state from an answer the person changed.
          offenceType: hasConviction && !settledByThirdSchedule ? offenceType : null,
          thirdScheduleOffence: hasConviction ? tri(thirdSchedule) : null,
          exceededSentenceThreshold:
            hasConviction && !settledByThirdSchedule ? tri(overThreshold) : null,
          convictedOn: hasConviction && canStillSpend ? convictedOn || null : null,
          applicantNote: hasConviction ? applicantNote : null,
          understoodRestrictions: true,
        })
      });
      const sc = await scRes.json().catch(() => ({}));
      if (!scRes.ok) throw new Error(sc.error || 'Could not record your declaration');

      showSuccess('✓ All set', 'Thanks for confirming.');
      localStorage.setItem('verification_completed', 'true');

      setTimeout(() => {
        onComplete();
      }, 1000);
    } catch (err: any) {
      console.error('Verification error:', err);
      showError('Verification Failed', err.message || 'Please try again');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-errandify-bg py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          {/* Header */}
          <div className="mb-8">
            <div className="text-4xl mb-4">🛡️</div>
            <h1 className="text-3xl font-bold text-errandify-brown mb-2">
              Safety Verification
            </h1>
            <p className="text-gray-600">
              We verify all users to create a safe community for everyone
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* The criminal declaration IS asked here, as one question, and
                three earlier comments claiming otherwise have been removed —
                they described a design that was proposed and not adopted, while
                sitting directly above the code that does the opposite.

                Asked at signup rather than at the point of the work: meeting it
                mid-offer means someone browses, writes an offer, and is refused
                at the moment of trying. One neutral question up front, before
                anyone has invested anything, is the kinder order even though it
                collects slightly more than strict minimisation would.

                A conviction does not bar anyone from Errandify. It closes the
                categories the offence bears on, usually temporarily. */}
            {/* Two sections used to sit here and both are gone.
                "Background Verification Agreement" asked everyone to consent to
                screening. Screening now only happens for work involving
                children, vulnerable adults, home access or driving passengers —
                so for most people that consent covered nothing, and the
                agreement to it is asked in SensitiveWorkDeclaration at the point
                it becomes real.
                "Risk Assessment — help us understand your history better" asked
                new users to attest that they had no past disputes and no
                cancelled account. Optional, unverifiable, and framed as
                suspicion of someone who has not done anything yet. We already
                know both facts for our own accounts. */}
            {/* Deliberately styled UNLIKE the five checkboxes above. It is a
                different kind of question and should not be sweepable by
                someone ticking down a list. No default, cannot be skipped.
                Phrased as "last 5 years" rather than "unspent": five years is
                the actual statutory clock (RCA s7B) and is a question anyone
                can answer without a glossary. The follow-ups handle the
                exceptions, which is what they are for. */}
            <div className="border-2 border-errandify-orange/30 rounded-xl p-5 bg-orange-50/30">
              <p className="text-base font-semibold text-errandify-brown mb-1">
                Have you been convicted of a criminal offence in the last 5 years?
              </p>
              <p className="text-xs text-gray-600 mb-4">
                Some errands involve children, older people, or being in someone's home. Singapore
                law asks us to check this before those. It does not affect anything else you do here.
              </p>

              <div className="flex gap-3 mb-1">
                {[{ v: false, label: 'No' }, { v: true, label: 'Yes' }].map((o) => (
                  <button
                    key={String(o.v)}
                    type="button"
                    disabled={loading}
                    onClick={() => setHasConviction(o.v)}
                    className={`flex-1 px-4 py-3 rounded-lg border-2 font-semibold transition-all ${
                      hasConviction === o.v
                        ? 'border-errandify-orange bg-white text-errandify-orange'
                        : 'border-gray-300 bg-white text-gray-600 hover:border-errandify-orange'
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
              {errors.hasConviction && (
                <p className="text-red-600 text-xs mt-2">Please choose one</p>
              )}

              {hasConviction === true && (
                <div className="mt-5 space-y-4 border-t border-errandify-orange/20 pt-4">
                  <p className="text-sm text-gray-700">
                    Thanks for telling us. A few questions so we get this right — answering yes to
                    any of them does not remove you from Errandify.
                  </p>

                  {/* FIRST, because a yes here settles everything. Under RCA
                      s7C(a) a Third Schedule offence never becomes spent, so
                      the outcome is already fixed — permanent, every category
                      closed — and the offence type, the sentence and the
                      conviction date cannot move it. Asking them anyway would
                      collect criminal detail we have no use for, which is both
                      pointless and the sort of thing PDPA exists to stop.

                      Asking it first also fixes a tone problem: it used to come
                      after the offence type, so someone who answered
                      "shoplifting" was then asked whether it was homicide. Up
                      front it reads as triage. After their answer it read as an
                      accusation.

                      The offences are NOT named in the question itself. Opening
                      with "rape, homicide, kidnapping" is the first thing a
                      person sees after admitting a conviction, and for someone
                      who shoplifted once it lands as an accusation of something
                      monstrous. The list still has to be available — the
                      question is unanswerable without it — so it sits behind a
                      disclosure that most people will never need to open. Same
                      accuracy, none of the confrontation. */}
                  <div>
                    <p className="text-sm font-semibold text-errandify-brown mb-1">
                      Was it one of the offences Singapore law treats as most serious?
                    </p>
                    <p className="text-xs text-gray-600 mb-1">
                      For almost everyone the answer is no.
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowSeriousList((v) => !v)}
                      className="text-xs text-errandify-orange underline mb-2"
                    >
                      {showSeriousList ? 'Hide the list' : 'Which offences are these?'}
                    </button>
                    {showSeriousList && (
                      <div className="bg-gray-50 rounded-lg p-3 mb-2 text-xs text-gray-600">
                        The Registration of Criminals Act lists a small set of offences separately —
                        rape, homicide, kidnapping and gang robbery among them. Unlike other
                        convictions, these do not become spent with time.
                      </div>
                    )}
                    <div className="flex gap-2 items-center">
                      {(['yes', 'no'] as const).map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => setThirdSchedule(v)}
                          className={`px-5 py-2 rounded-lg border-2 text-sm font-semibold bg-white ${
                            thirdSchedule === v ? 'border-errandify-orange text-errandify-orange' : 'border-gray-200 text-gray-600'
                          }`}
                        >
                          {v === 'yes' ? 'Yes' : 'No'}
                        </button>
                      ))}
                      {/* Secondary on purpose — an equal third button invites a
                          shrug, but removing it forces a guess. Not certain
                          continues to the rest, because a reviewer needs the
                          detail that a definite yes would have made moot. */}
                      <button
                        type="button"
                        onClick={() => setThirdSchedule('unsure')}
                        className={`text-xs underline ml-1 ${
                          thirdSchedule === 'unsure' ? 'text-errandify-orange' : 'text-gray-500'
                        }`}
                      >
                        I'm not certain
                      </button>
                    </div>
                    {errors.thirdSchedule && <p className="text-red-600 text-xs mt-1">Please answer this</p>}
                  </div>

                  {thirdSchedule === 'yes' && (
                    <div className="text-sm text-gray-700 bg-white border-2 border-errandify-orange/30 rounded-lg p-4">
                      Thank you — that's everything we need to ask. Errands involving children,
                      vulnerable adults, home access or driving passengers won't be available on
                      your account. The rest of Errandify is open to you as normal, and you can
                      post errands of your own without restriction.
                    </div>
                  )}
                </div>
              )}

              {hasConviction === true && thirdSchedule !== null && thirdSchedule !== 'yes' && (
                <div className="mt-4 space-y-4">
                  {/* Asked so we can restrict less, not more. Without it every
                      conviction closed all seven categories, so a shoplifting
                      record barred someone from childcare and eldercare too.
                      Now each category is closed only by offences that bear on
                      it, and most people find one or two closed instead of the
                      lot. Worth the extra tap for that reason and no other. */}
                  <div>
                    <p className="text-sm font-semibold text-errandify-brown mb-1">
                      What kind of offence was it?
                    </p>
                    <p className="text-xs text-gray-600 mb-2">
                      Pick the closest. This is what lets us keep the rest of Errandify open to you
                      rather than restricting everything.
                    </p>
                    <div className="space-y-1.5">
                      {OFFENCE_OPTIONS.map((o) => (
                        <button
                          key={o.value}
                          type="button"
                          onClick={() => setOffenceType(o.value)}
                          className={`w-full text-left px-3 py-2 rounded-lg border-2 text-sm bg-white ${
                            offenceType === o.value
                              ? 'border-errandify-orange text-errandify-orange font-semibold'
                              : 'border-gray-200 text-gray-700'
                          }`}
                        >
                          {o.label}
                        </button>
                      ))}
                    </div>
                    {errors.offenceType && <p className="text-red-600 text-xs mt-1">Please pick one</p>}
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-errandify-brown mb-2">
                      Was the sentence more than 3 months in prison, or a fine over $2,000?
                    </p>
                    <div className="flex gap-2 items-center">
                      {(['yes', 'no'] as const).map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => setOverThreshold(v)}
                          className={`px-5 py-2 rounded-lg border-2 text-sm font-semibold bg-white ${
                            overThreshold === v ? 'border-errandify-orange text-errandify-orange' : 'border-gray-200 text-gray-600'
                          }`}
                        >
                          {v === 'yes' ? 'Yes' : 'No'}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => setOverThreshold('unsure')}
                        className={`text-xs underline ml-1 ${
                          overThreshold === 'unsure' ? 'text-errandify-orange' : 'text-gray-500'
                        }`}
                      >
                        I'm not certain
                      </button>
                    </div>
                    {errors.overThreshold && <p className="text-red-600 text-xs mt-1">Please answer this</p>}
                  </div>

                  {canShowConvictionDate && (
                    <div>
                      <p className="text-sm font-semibold text-errandify-brown mb-1">When were you convicted?</p>
                      <p className="text-xs text-gray-500 mb-2">This tells us when the restriction lifts.</p>
                      <input
                        type="date"
                        value={convictedOn}
                        onChange={(e) => setConvictedOn(e.target.value)}
                        max={new Date().toISOString().split('T')[0]}
                        className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg bg-white"
                      />
                    </div>
                  )}

                  <div>
                    <p className="text-sm font-semibold text-errandify-brown mb-1">
                      Anything you'd like us to know? <span className="font-normal text-gray-500">(optional)</span>
                    </p>
                    <p className="text-xs text-gray-500 mb-2">
                      Goes only to the person reviewing. Never shown on your profile.
                    </p>
                    <textarea
                      value={applicantNote}
                      onChange={(e) => setApplicantNote(e.target.value)}
                      rows={3}
                      maxLength={1000}
                      className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg bg-white text-sm"
                    />
                  </div>

                  {(thirdSchedule === 'unsure' || overThreshold === 'unsure') && (
                    <p className="text-xs text-gray-700 bg-white rounded-lg p-3 border border-gray-200">
                      That's fine — someone will look at this and come back to you. You don't need to
                      find the paperwork yourself.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Section 4: Terms & Agreements */}
            <div className="pb-8">
              <h2 className="text-xl font-bold text-errandify-brown mb-6">
                Terms & Agreements
              </h2>
              <div className="space-y-4">
                <label className={`flex items-start gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  errors.agreeTerms
                    ? 'border-red-500 bg-red-50'
                    : formData.agreeTerms
                    ? 'border-errandify-orange bg-orange-50'
                    : 'border-gray-300 hover:border-errandify-orange'
                }`}>
                  <input
                    type="checkbox"
                    checked={formData.agreeTerms}
                    onChange={() => handleCheckboxChange('agreeTerms')}
                    disabled={loading}
                    className="w-5 h-5 mt-1 flex-shrink-0 cursor-pointer"
                  />
                  <span className="text-sm">
                    I agree to the <strong className="text-errandify-brown">Terms & Conditions</strong> *
                  </span>
                </label>

                <label className={`flex items-start gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  errors.agreePrivacy
                    ? 'border-red-500 bg-red-50'
                    : formData.agreePrivacy
                    ? 'border-errandify-orange bg-orange-50'
                    : 'border-gray-300 hover:border-errandify-orange'
                }`}>
                  <input
                    type="checkbox"
                    checked={formData.agreePrivacy}
                    onChange={() => handleCheckboxChange('agreePrivacy')}
                    disabled={loading}
                    className="w-5 h-5 mt-1 flex-shrink-0 cursor-pointer"
                  />
                  <span className="text-sm">
                    I agree to the <strong className="text-errandify-brown">Privacy Policy</strong> *
                  </span>
                </label>

                <label className={`flex items-start gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  errors.responsibleUse
                    ? 'border-red-500 bg-red-50'
                    : formData.responsibleUse
                    ? 'border-errandify-orange bg-orange-50'
                    : 'border-gray-300 hover:border-errandify-orange'
                }`}>
                  <input
                    type="checkbox"
                    checked={formData.responsibleUse}
                    onChange={() => handleCheckboxChange('responsibleUse')}
                    disabled={loading}
                    className="w-5 h-5 mt-1 flex-shrink-0 cursor-pointer"
                  />
                  <span className="text-sm font-semibold text-errandify-brown">
                    I will use this platform responsibly and lawfully *
                  </span>
                </label>

                <label className={`flex items-start gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  errors.authorizedToWork
                    ? 'border-red-500 bg-red-50'
                    : formData.authorizedToWork
                    ? 'border-errandify-orange bg-orange-50'
                    : 'border-gray-300 hover:border-errandify-orange'
                }`}>
                  <input
                    type="checkbox"
                    checked={formData.authorizedToWork}
                    onChange={() => handleCheckboxChange('authorizedToWork')}
                    disabled={loading}
                    className="w-5 h-5 mt-1 flex-shrink-0 cursor-pointer"
                  />
                  <span className="text-sm font-semibold text-errandify-brown">
                    I am legally authorised to work in Singapore *
                  </span>
                </label>
                <label className={`flex items-start gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  errors.accurateInformation
                    ? 'border-red-500 bg-red-50'
                    : formData.accurateInformation
                    ? 'border-errandify-orange bg-orange-50'
                    : 'border-gray-300 hover:border-errandify-orange'
                }`}>
                  <input
                    type="checkbox"
                    checked={formData.accurateInformation}
                    onChange={() => handleCheckboxChange('accurateInformation')}
                    disabled={loading}
                    className="w-5 h-5 mt-1 flex-shrink-0 cursor-pointer"
                  />
                  <span className="text-sm font-semibold text-errandify-brown">
                    The information I have given is accurate *
                  </span>
                </label>
              </div>
            </div>

            {/* Info Box */}
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-900">
                <strong>ℹ️ Your Safety Matters</strong><br />
                Errandify is committed to creating a safe and trustworthy community. All users go through the same verification process.
              </p>
            </div>

            {/* Buttons */}
            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-errandify-orange text-white py-3 rounded-lg font-bold hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {loading ? '⏳ Verifying...' : '✓ Agree & Continue'}
              </button>
              <button
                type="button"
                onClick={onBack}
                disabled={loading}
                className="flex-1 border-2 border-gray-300 text-gray-700 py-3 rounded-lg font-bold hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                Back
              </button>
            </div>

            {/* Legal Note */}
            <p className="text-xs text-gray-500 text-center">
              * Required fields | By continuing, you acknowledge the importance of honest and safe community participation
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
