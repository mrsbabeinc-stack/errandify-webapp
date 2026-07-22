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
