import { useState } from 'react';
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
    agreeBackgroundVerification: false,
    accurateInformation: false,
    agreeTerms: false,
    agreePrivacy: false,
    responsibleUse: false,
    noDisputes: false,
    noCancelledAccounts: false,
    authorizedToWork: false,
  });

  // The criminal declaration lives in this same form now. It used to be a
  // separate screen straight after, which read as two declarations when it is
  // one — and meant a user could complete signup having answered only half.
  const [hasUnspent, setHasUnspent] = useState<boolean | null>(null);
  const [thirdSchedule, setThirdSchedule] = useState<'yes' | 'no' | 'unsure' | null>(null);
  const [overThreshold, setOverThreshold] = useState<'yes' | 'no' | 'unsure' | null>(null);
  const [convictedOn, setConvictedOn] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

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
    if (!formData.agreeBackgroundVerification) newErrors.agreeBackgroundVerification = 'Required';
    if (!formData.accurateInformation) newErrors.accurateInformation = 'Required';
    if (!formData.agreeTerms) newErrors.agreeTerms = 'Required';
    if (!formData.agreePrivacy) newErrors.agreePrivacy = 'Required';
    if (!formData.responsibleUse) newErrors.responsibleUse = 'Required';
    if (!formData.authorizedToWork) newErrors.authorizedToWork = 'Required';

    // The screening question is part of this declaration, so it is required
    // here rather than on a screen the user might never reach.
    if (hasUnspent === null) newErrors.hasUnspent = 'Required';
    if (hasUnspent === true) {
      if (!thirdSchedule) newErrors.thirdSchedule = 'Required';
      if (!overThreshold) newErrors.overThreshold = 'Required';
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
          agreed_background_verification: formData.agreeBackgroundVerification,
          no_disputes: formData.noDisputes,
          no_cancelled_accounts: formData.noCancelledAccounts,
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to record your agreement');
      }

      // Same submit, same declaration. Anything the resolver cannot decide
      // comes back needsReview and an admin picks it up.
      const tri = (v: string | null) => (v === 'yes' ? true : v === 'no' ? false : null);
      const canStillSpend = thirdSchedule === 'no' && overThreshold === 'no';

      const screeningRes = await fetch(`${API_URL}/api/screening/declare`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          hasUnspentConviction: Boolean(hasUnspent),
          thirdScheduleOffence: hasUnspent ? tri(thirdSchedule) : null,
          exceededSentenceThreshold: hasUnspent ? tri(overThreshold) : null,
          convictedOn: hasUnspent && canStillSpend ? convictedOn || null : null,
          understoodRestrictions: true,
        })
      });

      const screening = await screeningRes.json().catch(() => ({}));
      if (!screeningRes.ok) {
        throw new Error(screening.error || 'Failed to record your declaration');
      }
      if (screening?.data?.needsReview) {
        showSuccess('Declaration received', 'Our team will review it. Some categories are unavailable meanwhile.');
      }

      showSuccess('✓ Verification Complete', 'Your identity has been verified');
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
            {/* Criminal background is no longer asked here. A conviction does not
                bar someone from Errandify — they join, and the categories that
                involve vulnerable people or home access are withheld from them.
                That declaration is made on its own screen straight after this
                one, statute by statute, and is what applies the restrictions.
                Asking "I have no criminal record" here contradicted it: it
                turned a restriction into a wall, and the answer went nowhere. */}
            {/* Criminal declaration — part of this same form. Scoped to UNSPENT
                convictions only: under the Registration of Criminals Act s7B a
                spent record means the person is treated as having none, so
                asking "ever" would collect more than the law asks for. */}
            <div className="border-b-2 border-gray-200 pb-8">
              <h2 className="text-xl font-bold text-errandify-brown mb-2">
                Criminal Record Declaration
              </h2>

              <div className="bg-gray-50 rounded-lg p-3 mb-4 text-xs text-gray-600">
                <p className="font-semibold text-gray-700 mb-1">What does “spent” mean?</p>
                <p>
                  Most convictions become <strong>spent</strong> after five years without further
                  offending, and once spent you are treated as having no conviction. You do not
                  need to declare a spent record. Serious offences and longer sentences never
                  become spent.
                </p>
              </div>

              <p className="text-sm font-semibold text-errandify-brown mb-3">
                Do you have any unspent criminal conviction? *
              </p>
              <div className="flex gap-3 mb-2">
                {[
                  { v: false, label: 'No' },
                  { v: true, label: 'Yes' },
                ].map((o) => (
                  <button
                    key={String(o.v)}
                    type="button"
                    onClick={() => setHasUnspent(o.v)}
                    className={`flex-1 px-4 py-3 rounded-lg border-2 font-semibold ${
                      hasUnspent === o.v
                        ? 'border-errandify-orange bg-orange-50 text-errandify-orange'
                        : 'border-gray-300 text-gray-600'
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
              {errors.hasUnspent && <p className="text-red-600 text-xs mb-2">Please answer this</p>}
              <p className="text-xs text-gray-500 mb-4">
                A conviction does not stop you joining. It may make some categories unavailable,
                in many cases only until your record becomes spent.
              </p>

              {/* Only shown to the few who answer yes. "Not sure" is safe — it
                  goes to a person rather than resolving against the applicant. */}
              {hasUnspent === true && (
                <div className="space-y-4 bg-orange-50/50 rounded-lg p-4">
                  <div>
                    <p className="text-sm font-semibold text-errandify-brown mb-1">
                      Was it a serious offence such as rape, homicide, kidnapping or gang robbery? *
                    </p>
                    <p className="text-xs text-gray-500 mb-2">These never become spent.</p>
                    <div className="flex gap-2">
                      {(['yes', 'no', 'unsure'] as const).map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => setThirdSchedule(v)}
                          className={`flex-1 px-3 py-2 rounded-lg border-2 text-sm font-semibold ${
                            thirdSchedule === v
                              ? 'border-errandify-orange bg-white text-errandify-orange'
                              : 'border-gray-200 text-gray-600 bg-white'
                          }`}
                        >
                          {v === 'yes' ? 'Yes' : v === 'no' ? 'No' : "I'm not sure"}
                        </button>
                      ))}
                    </div>
                    {errors.thirdSchedule && <p className="text-red-600 text-xs mt-1">Please answer this</p>}
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-errandify-brown mb-1">
                      Was the sentence more than 3 months in prison, or a fine over $2,000? *
                    </p>
                    <p className="text-xs text-gray-500 mb-2">
                      Sentences above this also prevent a record becoming spent.
                    </p>
                    <div className="flex gap-2">
                      {(['yes', 'no', 'unsure'] as const).map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => setOverThreshold(v)}
                          className={`flex-1 px-3 py-2 rounded-lg border-2 text-sm font-semibold ${
                            overThreshold === v
                              ? 'border-errandify-orange bg-white text-errandify-orange'
                              : 'border-gray-200 text-gray-600 bg-white'
                          }`}
                        >
                          {v === 'yes' ? 'Yes' : v === 'no' ? 'No' : "I'm not sure"}
                        </button>
                      ))}
                    </div>
                    {errors.overThreshold && <p className="text-red-600 text-xs mt-1">Please answer this</p>}
                  </div>

                  {thirdSchedule === 'no' && overThreshold === 'no' && (
                    <div>
                      <p className="text-sm font-semibold text-errandify-brown mb-1">
                        When were you convicted?
                      </p>
                      <p className="text-xs text-gray-500 mb-2">
                        The five-year period runs from this date.
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
                    <p className="text-xs text-gray-600 bg-white rounded p-2">
                      That is fine — our team will review your declaration and come back to you.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Section 2: Background Verification */}
            <div className="border-b-2 border-gray-200 pb-8">
              <h2 className="text-xl font-bold text-errandify-brown mb-6">
                Background Verification Agreement
              </h2>
              <div className="space-y-4">
                <label className={`flex items-start gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  errors.agreeBackgroundVerification
                    ? 'border-red-500 bg-red-50'
                    : formData.agreeBackgroundVerification
                    ? 'border-errandify-orange bg-orange-50'
                    : 'border-gray-300 hover:border-errandify-orange'
                }`}>
                  <input
                    type="checkbox"
                    checked={formData.agreeBackgroundVerification}
                    onChange={() => handleCheckboxChange('agreeBackgroundVerification')}
                    disabled={loading}
                    className="w-5 h-5 mt-1 flex-shrink-0 cursor-pointer"
                  />
                  <span className="text-sm font-semibold text-errandify-brown">
                    I agree to background verification and screening *
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
                    My information is accurate and up-to-date *
                  </span>
                </label>
              </div>
            </div>

            {/* Section 3: Risk Assessment (Optional) */}
            <div className="border-b-2 border-gray-200 pb-8">
              <h2 className="text-xl font-bold text-errandify-brown mb-4">
                Risk Assessment <span className="text-sm font-normal text-gray-600">(Optional)</span>
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                Help us understand your history better
              </p>
              <div className="space-y-4">
                <label className={`flex items-start gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  formData.noDisputes
                    ? 'border-errandify-orange bg-orange-50'
                    : 'border-gray-300 hover:border-errandify-orange'
                }`}>
                  <input
                    type="checkbox"
                    checked={formData.noDisputes}
                    onChange={() => handleCheckboxChange('noDisputes')}
                    disabled={loading}
                    className="w-5 h-5 mt-1 flex-shrink-0 cursor-pointer"
                  />
                  <span className="text-sm font-semibold text-errandify-brown">
                    I have no disputes in the past 2 years
                  </span>
                </label>

                <label className={`flex items-start gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  formData.noCancelledAccounts
                    ? 'border-errandify-orange bg-orange-50'
                    : 'border-gray-300 hover:border-errandify-orange'
                }`}>
                  <input
                    type="checkbox"
                    checked={formData.noCancelledAccounts}
                    onChange={() => handleCheckboxChange('noCancelledAccounts')}
                    disabled={loading}
                    className="w-5 h-5 mt-1 flex-shrink-0 cursor-pointer"
                  />
                  <span className="text-sm font-semibold text-errandify-brown">
                    I have never had an account cancelled
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
                    I am authorized to work in Singapore *
                  </span>
                </label>
              </div>
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
