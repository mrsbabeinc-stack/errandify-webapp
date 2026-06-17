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
    const user = localStorage.getItem('user');
    if (user) {
      try {
        const userData = JSON.parse(user);
        onLogin(userData.role || 'asker');
      } catch {
        onLogin('asker');
      }
    } else {
      onLogin('asker');
    }
  };

  const handleLoginComplete = () => {
    const user = localStorage.getItem('user');
    if (user) {
      try {
        const userData = JSON.parse(user);
        onLogin(userData.role || 'asker');
      } catch {
        onLogin('asker');
      }
    } else {
      onLogin('asker');
    }
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
