import { useState } from 'react';
import DevIdentityStub from './DevIdentityStub';
import CompleteProfileStep from './CompleteProfileStep';
import RoleSelectionStep from './RoleSelectionStep';

type SignupStep = 'dev-identity' | 'complete-profile' | 'role-selection';

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
  const [step, setStep] = useState<SignupStep>('dev-identity');
  const [mockData, setMockData] = useState<MockUserData | null>(null);

  const handleDevIdentityComplete = (data: MockUserData) => {
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
      {step === 'dev-identity' && (
        <DevIdentityStub
          onComplete={handleDevIdentityComplete}
          onBack={onBack}
        />
      )}
      {step === 'complete-profile' && mockData && (
        <CompleteProfileStep
          mockData={mockData}
          onComplete={handleProfileComplete}
          onBack={() => setStep('dev-identity')}
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
