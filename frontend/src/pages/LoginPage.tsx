import { useState } from 'react';
import SplashScreen from '../components/auth/SplashScreen';
import SignupFlow from '../components/auth/SignupFlow';
import LoginFlow from '../components/auth/LoginFlow';

interface LoginPageProps {
  onLogin: (role: 'asker' | 'doer') => void;
}

type AuthScreen = 'splash' | 'signup' | 'login';

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [screen, setScreen] = useState<AuthScreen>('splash');

  const handleSignupComplete = () => {
    onLogin('asker');
  };

  const handleLoginComplete = () => {
    onLogin('asker');
  };

  return (
    <div className="min-h-screen bg-errandify-bg">
      {screen === 'splash' && (
        <SplashScreen
          onSignup={() => setScreen('signup')}
          onLogin={() => setScreen('login')}
        />
      )}
      {screen === 'signup' && (
        <SignupFlow
          onComplete={handleSignupComplete}
          onBack={() => setScreen('splash')}
        />
      )}
      {screen === 'login' && (
        <LoginFlow
          onComplete={handleLoginComplete}
          onBack={() => setScreen('splash')}
        />
      )}
    </div>
  );
}
