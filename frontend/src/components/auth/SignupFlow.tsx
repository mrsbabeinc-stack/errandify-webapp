import { useState } from 'react';
import MockSingpassModal from './MockSingpassModal';
import CompleteProfileStep from './CompleteProfileStep';

type SignupStep = 'mock-singpass' | 'complete-profile';

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
    </div>
  );
}
