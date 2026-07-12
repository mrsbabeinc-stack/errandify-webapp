import { useState } from 'react';
import MockSingpassModal from './MockSingpassModal';
import CompleteProfileStep from './CompleteProfileStep';
import RoleSelectionStep from './RoleSelectionStep';

type SignupStep = 'mock-singpass' | 'complete-profile' | 'role-selection';

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
    // After profile completion, user selects role (individual or company)
    setStep('role-selection');
  };

  const handleRoleSelectionComplete = () => {
    // Role selection complete, flow is done
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
      {step === 'role-selection' && mockData && (
        <RoleSelectionStep
          mockData={mockData}
          onComplete={handleRoleSelectionComplete}
          onBack={() => setStep('complete-profile')}
        />
      )}
    </div>
  );
}
