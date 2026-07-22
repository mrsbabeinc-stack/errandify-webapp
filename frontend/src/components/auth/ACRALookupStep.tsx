import { useState } from 'react';
import { useToastNotification } from '../../utils/toastNotification';
import CompanySettingsStep from './CompanySettingsStep';

interface MockUserData {
  name: string;
  age: number;
  nric: string;
  address: string;
}

interface ACRALookupStepProps {
  mockData: MockUserData;
  onComplete: () => void;
  onBack: () => void;
}

/**
 * Previously populated from an ACRA API lookup. There is no lookup — the company
 * uploads its ACRA Business Profile and an Errandify admin matches a director on
 * it to the SingPass-verified person. Only the UEN is known at this point, so
 * every other field is optional and the old "verified" result screen is skipped.
 */
interface ACRAData {
  uen?: string;
  companyName?: string;
  businessType?: string;
  ownerName?: string;
  address?: string;
  ownerVerified?: boolean;
  singpassName?: string;
}

type ACRAStep = 'lookup' | 'verification-result' | 'company-settings';

export default function ACRALookupStep({
  mockData,
  onComplete,
  onBack
}: ACRALookupStepProps) {
  const { showSuccess, showError } = useToastNotification();
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  const [step, setStep] = useState<ACRAStep>('lookup');
  const [uen, setUEN] = useState('');
  const [loading, setLoading] = useState(false);
  const [acraData, setACRAData] = useState<ACRAData | null>(null);
  const [error, setError] = useState('');

  /**
   * There is no ACRA API lookup. The company uploads its ACRA Business Profile
   * and an Errandify admin matches a director on that document against the
   * SingPass-verified person. This step just validates the UEN format and
   * collects the file — the real check happens at review.
   */
  const handleUENLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const clean = uen.trim().toUpperCase();
      if (!/^[0-9]{8,9}[A-Z]$/.test(clean) && !/^[A-Z]\d{2}[A-Z]{2}\d{4}[A-Z]$/.test(clean)) {
        throw new Error('That does not look like a UEN. It is usually 9–10 characters ending in a letter.');
      }

      // Straight to company settings — there is no lookup result to show, and
      // displaying a fabricated "verified" screen would be misleading.
      setACRAData({ uen: clean });
      setStep('company-settings');
      showSuccess('UEN noted', 'Next, fill in your details and attach your ACRA Business Profile');
    } catch (err: any) {
      const errorMsg = err.message || 'Please check your UEN';
      setError(errorMsg);
      showError('Check your UEN', errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleTryAgain = () => {
    setUEN('');
    setACRAData(null);
    setError('');
    setStep('lookup');
  };

  const handleProceedToSettings = () => {
    setStep('company-settings');
  };

  // LOOKUP STEP
  if (step === 'lookup') {
    return (
      <div className="min-h-screen bg-errandify-bg flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-lg p-8">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="text-5xl mb-4">🏢</div>
              <h1 className="text-3xl font-bold text-errandify-brown mb-2">
                Verify Your Company
              </h1>
              <p className="text-gray-600">
                Enter your UEN to verify company ownership
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleUENLookup} className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-errandify-brown mb-2">
                  UEN (Unique Entity Number) *
                </label>
                <input
                  type="text"
                  value={uen}
                  onChange={(e) => setUEN(e.target.value.toUpperCase())}
                  placeholder="e.g., 123456789A"
                  maxLength={9}
                  required
                  disabled={loading}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-errandify-orange focus:ring-2 focus:ring-orange-100 font-mono text-lg"
                />
                <p className="text-xs text-gray-500 mt-2">
                  8 digits + 1 letter (Format: 123456789A)
                </p>
              </div>

              {error && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
                  <p className="text-red-700 font-semibold flex items-center gap-2">
                    <span>⚠️</span>
                    {error}
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !uen.trim()}
                className="w-full bg-errandify-orange text-white py-3 rounded-lg font-bold hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {loading ? '⏳ Looking up...' : '🔍 Look Up UEN'}
              </button>
            </form>

            {/* Info Box */}
            <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-900">
                <strong>ℹ️ What's a UEN?</strong><br />
                Your Unique Entity Number issued by ACRA when you registered your business.
              </p>
            </div>

            {/* Back Button */}
            <div className="text-center mt-6">
              <button
                onClick={onBack}
                className="text-errandify-orange hover:text-orange-600 font-semibold transition-colors"
              >
                ← Back
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // VERIFICATION RESULT STEP
  if (step === 'verification-result' && acraData) {
    return (
      <div className="min-h-screen bg-errandify-bg flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-lg p-8">
            {acraData.ownerVerified ? (
              <>
                {/* Success State */}
                <div className="text-center mb-8">
                  <div className="text-6xl mb-4 animate-pulse">✅</div>
                  <h1 className="text-3xl font-bold text-green-600 mb-2">
                    Owner Verified!
                  </h1>
                  <p className="text-gray-600">
                    Your identity matches ACRA records
                  </p>
                </div>

                {/* Company Details (Read-only from ACRA) */}
                <div className="space-y-4 mb-8">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <label className="text-xs font-semibold text-gray-600 uppercase">
                      Company Name (ACRA)
                    </label>
                    <p className="text-lg font-bold text-errandify-brown mt-1">
                      {acraData.companyName}
                    </p>
                  </div>

                  <div className="p-4 bg-gray-50 rounded-lg">
                    <label className="text-xs font-semibold text-gray-600 uppercase">
                      Registered Owner
                    </label>
                    <p className="text-lg font-bold text-errandify-brown mt-1">
                      {acraData.ownerName}
                    </p>
                  </div>

                  <div className="p-4 bg-gray-50 rounded-lg">
                    <label className="text-xs font-semibold text-gray-600 uppercase">
                      Business Type
                    </label>
                    <p className="text-lg font-bold text-errandify-brown mt-1">
                      {acraData.businessType}
                    </p>
                  </div>

                  <div className="p-4 bg-gray-50 rounded-lg">
                    <label className="text-xs font-semibold text-gray-600 uppercase">
                      Address
                    </label>
                    <p className="text-sm font-semibold text-errandify-brown mt-1">
                      {acraData.address}
                    </p>
                  </div>
                </div>

                {/* Verification Badge */}
                <div className="mb-8 p-4 bg-green-50 border border-green-200 rounded-lg text-center">
                  <p className="text-green-700 font-semibold">
                    ✓ Verified as legitimate company owner
                  </p>
                </div>

                {/* Button */}
                <button
                  onClick={handleProceedToSettings}
                  className="w-full bg-errandify-orange text-white py-3 rounded-lg font-bold hover:bg-opacity-90 transition-all mb-3"
                >
                  Proceed to Company Settings →
                </button>

                <button
                  onClick={handleTryAgain}
                  className="w-full border-2 border-gray-300 text-gray-700 py-3 rounded-lg font-bold hover:bg-gray-50 transition-all"
                >
                  Try Another UEN
                </button>
              </>
            ) : (
              <>
                {/* Failure State */}
                <div className="text-center mb-8">
                  <div className="text-6xl mb-4">❌</div>
                  <h1 className="text-3xl font-bold text-red-600 mb-2">
                    Verification Failed
                  </h1>
                  <p className="text-gray-600">
                    Name mismatch detected
                  </p>
                </div>

                {/* Name Comparison */}
                <div className="grid grid-cols-2 gap-4 mb-8">
                  <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                    <label className="text-xs font-semibold text-red-700 uppercase">
                      Your SingPass Name
                    </label>
                    <p className="text-sm font-bold text-red-900 mt-2">
                      {acraData.singpassName}
                    </p>
                  </div>

                  <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                    <label className="text-xs font-semibold text-red-700 uppercase">
                      ACRA Owner Name
                    </label>
                    <p className="text-sm font-bold text-red-900 mt-2">
                      {acraData.ownerName}
                    </p>
                  </div>
                </div>

                {/* Error Message */}
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg mb-8">
                  <p className="text-red-700 font-semibold mb-3">
                    ⚠️ Only the registered ACRA owner can register this company account.
                  </p>
                  <ul className="text-sm text-red-700 space-y-2">
                    <li>
                      <strong>Option 1:</strong> If you are the owner, update your SingPass name to match ACRA records
                    </li>
                    <li>
                      <strong>Option 2:</strong> Contact ACRA to update company owner details
                    </li>
                    <li>
                      <strong>Option 3:</strong> Ask the registered owner to register the company account
                    </li>
                  </ul>
                </div>

                {/* Support */}
                <div className="p-4 bg-blue-50 rounded-lg mb-8 border border-blue-200">
                  <p className="text-sm text-blue-900">
                    <strong>Need help?</strong><br />
                    Contact support@errandify.sg with your UEN
                  </p>
                </div>

                {/* Buttons */}
                <button
                  onClick={handleTryAgain}
                  className="w-full bg-errandify-orange text-white py-3 rounded-lg font-bold hover:bg-opacity-90 transition-all mb-3"
                >
                  Try Another UEN
                </button>

                <button
                  onClick={onBack}
                  className="w-full border-2 border-gray-300 text-gray-700 py-3 rounded-lg font-bold hover:bg-gray-50 transition-all"
                >
                  Back to Role Selection
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // COMPANY SETTINGS STEP
  // No longer gated on a fake ownerVerified — the real check is the admin
  // reviewing the uploaded ACRA profile after registration.
  if (step === 'company-settings' && acraData) {
    return (
      <CompanySettingsStep
        companyData={{
          companyName: acraData.companyName,
          ownerName: acraData.ownerName,
          uen: uen
        }}
        onComplete={onComplete}
        onBack={() => setStep('verification-result')}
      />
    );
  }

  return null;
}
