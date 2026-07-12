import { useState } from 'react';
import MockSingpassModal from './MockSingpassModal';
import CompleteProfileStep from './CompleteProfileStep';
import CompanySignupPromptModal from '../CompanySignupPromptModal';

type SignupStep = 'mock-singpass' | 'complete-profile' | 'company-prompt';

interface SignupFlowProps {
  onComplete: () => void;
  onBack: () => void;
}

interface MockUserData {
  name: string;
  age: number;
  nric: string;
  address: string;
}

export default function SignupFlow({ onComplete, onBack }: SignupFlowProps) {
  const [step, setStep] = useState<SignupStep>('mock-singpass');
  const [mockData, setMockData] = useState<MockUserData | null>(null);

  const handleMockSingpassComplete = (data: MockUserData) => {
    setMockData(data);
    setStep('complete-profile');
  };

  const handleProfileComplete = () => {
    // Show company signup prompt instead of immediately completing
    setStep('company-prompt');
  };

  const handleCompanyPromptClose = () => {
    // User dismissed/skipped company signup, complete the overall flow
    onComplete();
  };

  return (
    <div className="min-h-screen bg-errandify-bg">
      {step === 'mock-singpass' && (
        <MockSingpassModal
          onComplete={handleMockSingpassComplete}
          onBack={onBack}
        />
      )}
      {step === 'complete-profile' && mockData && (
        <CompleteProfileStep
          mockData={mockData}
          onComplete={handleProfileComplete}
          onBack={() => setStep('mock-singpass')}
        />
      )}
      <CompanySignupPromptModal
        isOpen={step === 'company-prompt'}
        onClose={handleCompanyPromptClose}
      />
    </div>
  );
}
