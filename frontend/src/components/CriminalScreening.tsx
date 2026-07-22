import { useState } from 'react';
import axios from 'axios';

interface CriminalScreeningProps {
  onComplete: () => void;
  onCancel?: () => void;
}

export default function CriminalScreening({ onComplete, onCancel }: CriminalScreeningProps) {
  const [step, setStep] = useState<'disclosure' | 'declaration' | 'confirm'>('disclosure');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [declarations, setDeclarations] = useState({
    cypaConviction: false,
    womensCharterConviction: false,
    penalCodeConviction: false,
    elderAbuseConviction: false,
    dishonestyConviction: false,
  });

  const [understoodRestrictions, setUnderstoodRestrictions] = useState(false);

  const hasAnyConviction = Object.values(declarations).some((val) => val);

  const handleSubmit = async () => {
    if (!understoodRestrictions) {
      setError('Please confirm you understand the restrictions');
      return;
    }

    setLoading(true);
    try {
      await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/screening/declare`,
        {
          ...declarations,
          understoodRestrictions,
        },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        }
      );

      setStep('confirm');
      setTimeout(() => {
        onComplete();
      }, 2000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to submit screening');
      setLoading(false);
    }
  };

  if (step === 'disclosure') {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-2xl w-full max-h-96 overflow-y-auto">
          <div className="p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">⚖️ Safety Screening Declaration</h2>

            <p className="text-gray-700 mb-6">
              Errandify is committed to creating a safe community. To protect everyone, we conduct
              safety screening before allowing access to sensitive errand categories.
            </p>

            <div className="bg-orange-50 border-l-4 border-errandify-orange-500 p-4 mb-6">
              <p className="font-semibold text-errandify-orange-900 mb-2">What are \"Sensitive Categories\"?</p>
              <p className="text-errandify-orange-800 text-sm">
                Errands involving childcare, elderly care, or home access require background screening
                for everyone's safety. If you have a criminal conviction under certain acts, you
                won't be able to access these categories.
              </p>
            </div>

            <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 mb-6">
              <p className="font-semibold text-yellow-900 mb-2">Why are we asking?</p>
              <ul className="text-yellow-800 text-sm space-y-1 list-disc list-inside">
                <li>Protect children under the Children & Young Persons Act</li>
                <li>Prevent domestic violence under the Women's Charter</li>
                <li>Protect vulnerable adults under the Vulnerable Adults Act</li>
                <li>Prevent fraud through dishonesty offence checks</li>
              </ul>
            </div>

            <p className="text-gray-600 text-sm mb-6">
              ✅ You can still use Errandify for many other categories (delivery, shopping, errands,
              etc). Only sensitive home-access and vulnerable-person errands are restricted.
            </p>

            <button
              onClick={() => setStep('declaration')}
              className="w-full px-4 py-3 bg-errandify-orange text-white rounded-lg font-bold hover:bg-opacity-90"
            >
              I Understand, Continue to Declaration
            </button>

            {onCancel && (
              <button
                onClick={onCancel}
                className="w-full mt-2 px-4 py-3 bg-gray-200 text-gray-700 rounded-lg font-bold hover:bg-gray-300"
              >
                Skip (Limited Access)
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (step === 'declaration') {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">📋 Criminal History Declaration</h2>

            <p className="text-gray-700 mb-6">
              Please honestly answer the following questions. Your answers are confidential and used
              only for safety screening.
            </p>

            <div className="space-y-4 mb-6">
              {/* CYPA */}
              <div className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={declarations.cypaConviction}
                    onChange={(e) =>
                      setDeclarations({ ...declarations, cypaConviction: e.target.checked })
                    }
                    className="mt-1 w-5 h-5 text-errandify-orange rounded"
                  />
                  <div>
                    <p className="font-semibold text-gray-800">
                      Children & Young Persons Act (CYPA)
                    </p>
                    <p className="text-sm text-gray-600">
                      Have you been convicted of any offence under this act? (Protects children)
                    </p>
                  </div>
                </label>
              </div>

              {/* Women's Charter */}
              <div className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={declarations.womensCharterConviction}
                    onChange={(e) =>
                      setDeclarations({
                        ...declarations,
                        womensCharterConviction: e.target.checked,
                      })
                    }
                    className="mt-1 w-5 h-5 text-errandify-orange rounded"
                  />
                  <div>
                    <p className="font-semibold text-gray-800">Women's Charter</p>
                    <p className="text-sm text-gray-600">
                      Domestic violence or abuse offences? (Protects from domestic violence)
                    </p>
                  </div>
                </label>
              </div>

              {/* Penal Code */}
              <div className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={declarations.penalCodeConviction}
                    onChange={(e) =>
                      setDeclarations({ ...declarations, penalCodeConviction: e.target.checked })
                    }
                    className="mt-1 w-5 h-5 text-errandify-orange rounded"
                  />
                  <div>
                    <p className="font-semibold text-gray-800">Penal Code</p>
                    <p className="text-sm text-gray-600">
                      Outrage of modesty, rape, hurt, or wrongful confinement offences?
                    </p>
                  </div>
                </label>
              </div>

              {/* Elder Abuse / VAA */}
              <div className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={declarations.elderAbuseConviction}
                    onChange={(e) =>
                      setDeclarations({
                        ...declarations,
                        elderAbuseConviction: e.target.checked,
                      })
                    }
                    className="mt-1 w-5 h-5 text-errandify-orange rounded"
                  />
                  <div>
                    <p className="font-semibold text-gray-800">Vulnerable Adults Act 2018</p>
                    <p className="text-sm text-gray-600">
                      Elder abuse or vulnerable adult offences?
                    </p>
                  </div>
                </label>
              </div>

              {/* Dishonesty */}
              <div className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={declarations.dishonestyConviction}
                    onChange={(e) =>
                      setDeclarations({
                        ...declarations,
                        dishonestyConviction: e.target.checked,
                      })
                    }
                    className="mt-1 w-5 h-5 text-errandify-orange rounded"
                  />
                  <div>
                    <p className="font-semibold text-gray-800">Dishonesty Offences</p>
                    <p className="text-sm text-gray-600">
                      Cheating or criminal breach of trust? (Applies to ALL categories)
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* Confirmation */}
            <div className="border-t pt-6">
              <label className="flex items-start gap-3 mb-6">
                <input
                  type="checkbox"
                  checked={understoodRestrictions}
                  onChange={(e) => setUnderstoodRestrictions(e.target.checked)}
                  className="mt-1 w-5 h-5 text-errandify-orange rounded"
                />
                <div>
                  <p className="font-semibold text-gray-800">I understand the restrictions</p>
                  <p className="text-sm text-gray-600 mt-1">
                    {hasAnyConviction
                      ? 'I acknowledge that I will not be able to access childcare, elderly care, or home-access errands.'
                      : 'I confirm that I have answered honestly and understand these questions are for safety.'}
                  </p>
                </div>
              </label>

              {error && <div className="text-red-600 text-sm mb-4 bg-red-50 p-3 rounded">{error}</div>}

              <button
                onClick={handleSubmit}
                disabled={!understoodRestrictions || loading}
                className="w-full px-4 py-3 bg-errandify-orange text-white rounded-lg font-bold hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Submitting...' : '✓ Submit Declaration'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Confirm step
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6 text-center">
        <div className="text-5xl mb-4">
          {hasAnyConviction ? '⚠️' : '✅'}
        </div>

        <h2 className="text-2xl font-bold text-gray-800 mb-4">
          {hasAnyConviction ? 'Declaration Recorded' : 'All Set!'}
        </h2>

        <p className="text-gray-700 mb-6">
          {hasAnyConviction
            ? 'Your declaration has been recorded. You have access to all categories except: Childcare, Elderly Care, and Home Access errands. You can still use Errandify for many other errands!'
            : 'Welcome to Errandify! You have access to all errand categories. Thank you for your honesty.'}
        </p>

        <p className="text-sm text-gray-600">Continuing...</p>
      </div>
    </div>
  );
}
