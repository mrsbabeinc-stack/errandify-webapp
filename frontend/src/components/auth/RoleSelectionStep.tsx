import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ACRALookupStep from './ACRALookupStep';

interface MockUserData {
  name: string;
  age: number;
  nric: string;
  address: string;
}

interface RoleSelectionStepProps {
  mockData: MockUserData;
  onComplete: () => void;
  onBack: () => void;
}

type RoleStep = 'selection' | 'acra-lookup';

export default function RoleSelectionStep({
  mockData,
  onComplete,
  onBack
}: RoleSelectionStepProps) {
  const navigate = useNavigate();
  const [step, setStep] = useState<RoleStep>('selection');
  const [selectedRole, setSelectedRole] = useState<'individual' | 'company' | null>(null);

  const handleIndividualSelect = async () => {
    setSelectedRole('individual');
    // Individual users get task preferences next
    navigate('/preferences');
  };

  const handleCompanySelect = () => {
    setSelectedRole('company');
    // Company owners go to ACRA lookup
    setStep('acra-lookup');
  };

  const handleACRAComplete = () => {
    // Company registration complete, finish signup flow
    onComplete();
  };

  if (step === 'acra-lookup') {
    return (
      <ACRALookupStep
        mockData={mockData}
        onComplete={handleACRAComplete}
        onBack={() => setStep('selection')}
      />
    );
  }

  return (
    <div className="min-h-screen bg-errandify-bg flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-errandify-brown mb-3">
            How will you use Errandify?
          </h1>
          <p className="text-gray-600 text-lg">
            Choose your role to get started
          </p>
        </div>

        {/* Role Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          {/* Individual Card */}
          <button
            onClick={handleIndividualSelect}
            disabled={selectedRole === 'company'}
            className={`role-card individual-card transition-all ${
              selectedRole === 'individual' ? 'selected' : ''
            }`}
          >
            <div className="role-icon text-5xl mb-6">👤</div>
            <h2 className="text-2xl font-bold text-errandify-brown mb-3">
              I'm an Individual
            </h2>
            <p className="text-gray-600 mb-6">
              Post errands you need done or offer your services to earn money
            </p>
            <ul className="text-sm text-gray-700 space-y-2 mb-6">
              <li className="flex items-center gap-2">
                <span className="text-errandify-orange">✓</span>
                Post errands (Asker)
              </li>
              <li className="flex items-center gap-2">
                <span className="text-errandify-orange">✓</span>
                Do errands (Doer)
              </li>
              <li className="flex items-center gap-2">
                <span className="text-errandify-orange">✓</span>
                Build reputation
              </li>
              <li className="flex items-center gap-2">
                <span className="text-errandify-orange">✓</span>
                Earn Errandify Points
              </li>
            </ul>
            <span className="inline-block px-6 py-2 bg-errandify-orange text-white font-bold rounded-lg">
              Continue as Individual
            </span>
          </button>

          {/* Company Card */}
          <button
            onClick={handleCompanySelect}
            disabled={selectedRole === 'individual'}
            className={`role-card company-card transition-all ${
              selectedRole === 'company' ? 'selected' : ''
            }`}
          >
            <div className="role-icon text-5xl mb-6">🏢</div>
            <h2 className="text-2xl font-bold text-errandify-brown mb-3">
              Register My Company
            </h2>
            <p className="text-gray-600 mb-6">
              Manage teams, post bulk errands, and access business analytics
            </p>
            <ul className="text-sm text-gray-700 space-y-2 mb-6">
              <li className="flex items-center gap-2">
                <span className="text-errandify-orange">✓</span>
                Post bulk errands
              </li>
              <li className="flex items-center gap-2">
                <span className="text-errandify-orange">✓</span>
                Manage teams
              </li>
              <li className="flex items-center gap-2">
                <span className="text-errandify-orange">✓</span>
                Team analytics
              </li>
              <li className="flex items-center gap-2">
                <span className="text-errandify-orange">✓</span>
                Company reputation
              </li>
            </ul>
            <span className="inline-block px-6 py-2 bg-errandify-orange text-white font-bold rounded-lg">
              Verify & Register
            </span>
          </button>
        </div>

        {/* Back Button */}
        <div className="text-center">
          <button
            onClick={onBack}
            className="text-errandify-orange hover:text-orange-600 font-semibold transition-colors"
          >
            ← Back to Profile
          </button>
        </div>
      </div>

      <style>{`
        .role-card {
          background: white;
          border: 3px solid #E0E0E0;
          border-radius: 16px;
          padding: 32px 24px;
          text-align: center;
          cursor: pointer;
          transition: all 0.3s ease;
          position: relative;
        }

        .role-card:hover:not(:disabled) {
          border-color: #FF6B35;
          box-shadow: 0 8px 24px rgba(255, 107, 53, 0.15);
          transform: translateY(-4px);
        }

        .role-card.selected {
          border-color: #FF6B35;
          background: linear-gradient(135deg, rgba(255, 107, 53, 0.05) 0%, rgba(255, 107, 53, 0.02) 100%);
          box-shadow: 0 12px 32px rgba(255, 107, 53, 0.2);
        }

        .role-card:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .role-icon {
          display: inline-block;
          width: 80px;
          height: 80px;
          background: linear-gradient(135deg, #FFF8F0 0%, #FFE8D6 100%);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
      `}</style>
    </div>
  );
}
