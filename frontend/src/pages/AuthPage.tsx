import { useState } from 'react';
import axios from 'axios';

interface AuthPageProps {
  onLogin: (role: 'asker' | 'doer') => void;
}

export default function AuthPage({ onLogin }: AuthPageProps) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  // Handle Mock SingPass Login
  const handleSingPassLogin = async () => {
    setError('');
    setLoading(true);

    try {
      // Use mock SingPass endpoint for testing
      const response = await axios.post(
        `${API_URL}/api/mock-auth/mock-singpass-login`,
        {
          email: email || 'test@singpass.com',
          password: password || 'test123',
        }
      );

      // Save token and user
      localStorage.setItem('token', response.data.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.data.user));

      const userData = response.data.data.user;
      onLogin(userData.role || 'asker');
    } catch (err: any) {
      setError(err.response?.data?.error || 'SingPass authentication failed');
      setLoading(false);
    }
  };

  // Handle Signup via SingPass
  const handleSignupSingPass = async () => {
    setError('');

    if (!displayName || !phone) {
      setError('Please enter your name and phone number');
      return;
    }

    setLoading(true);

    try {
      // Step 1: Get SingPass authorization URL
      const authResponse = await axios.get(
        `${API_URL}/api/auth/singpass-authorize`
      );

      if (authResponse.data.success && authResponse.data.redirectUrl) {
        // In a real scenario, redirect to SingPass
        // For testing, we'll use the mock endpoint
        console.log('SingPass Authorization URL:', authResponse.data.redirectUrl);

        // For testing: use mock SingPass callback
        const mockResponse = await axios.get(
          `${API_URL}/api/mock-auth/mock-singpass-callback`
        );

        if (mockResponse.data.success) {
          const singpassData = mockResponse.data.data.userData;

          // Step 2: Create account with SingPass data
          const signupResponse = await axios.post(
            `${API_URL}/api/auth/signup`,
            {
              nric: singpassData.sub,
              displayName,
              email: singpassData.email,
              phone,
              role: 'asker',
              singpassVerified: true,
            }
          );

          if (signupResponse.data.success) {
            // Save token and user
            localStorage.setItem('token', signupResponse.data.data.token);
            localStorage.setItem('user', JSON.stringify(signupResponse.data.data.user));

            const userData = signupResponse.data.data.user;
            onLogin(userData.role || 'asker');
          }
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Signup failed. Please try again.');
      setLoading(false);
    }
  };

  // Demo login for testing
  const handleDemoLogin = async (account: string) => {
    setError('');
    setLoading(true);

    try {
      const response = await axios.post(
        `${API_URL}/api/auth/demo-login`,
        { account }
      );

      localStorage.setItem('token', response.data.data.accessToken);
      localStorage.setItem('user', JSON.stringify(response.data.data.user));

      const userData = response.data.data.user;
      onLogin(userData.role || 'asker');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-errandify-orange-50 to-orange-50 flex flex-col items-center justify-center p-4">
      {/* Logo/Header */}
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold text-errandify-orange mb-2">
          Errandify
        </h1>
        <p className="text-gray-600">
          Get things done. Earn rewards. Build community.
        </p>
      </div>

      {/* Auth Card */}
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
        {/* Mode Toggle */}
        <div className="flex gap-2 mb-6 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => {
              setMode('signin');
              setError('');
            }}
            className={`flex-1 py-2 px-4 rounded-md font-semibold transition-all ${
              mode === 'signin'
                ? 'bg-errandify-orange text-white'
                : 'text-gray-600 hover:bg-gray-200'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => {
              setMode('signup');
              setError('');
            }}
            className={`flex-1 py-2 px-4 rounded-md font-semibold transition-all ${
              mode === 'signup'
                ? 'bg-errandify-orange text-white'
                : 'text-gray-600 hover:bg-gray-200'
            }`}
          >
            Sign Up
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Sign In Mode */}
        {mode === 'signin' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Email (Optional for demo)
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-errandify-orange"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Password (Optional for demo)
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-errandify-orange"
              />
            </div>

            {/* SingPass Login */}
            <button
              onClick={handleSingPassLogin}
              disabled={loading}
              className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? 'Signing in...' : '🔐 Sign In with SingPass'}
            </button>

            {/* Demo Login */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">
                  Or try demo accounts
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <button
                onClick={() => handleDemoLogin('sarah')}
                disabled={loading}
                className="w-full py-2 px-4 bg-orange-50 border-2 border-errandify-orange-300 text-errandify-orange-700 rounded-lg font-semibold hover:bg-orange-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                👩 Demo: Sarah (Asker/Doer)
              </button>
              <button
                onClick={() => handleDemoLogin('john')}
                disabled={loading}
                className="w-full py-2 px-4 bg-green-50 border-2 border-green-300 text-green-700 rounded-lg font-semibold hover:bg-green-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                👨 Demo: John (Asker/Doer)
              </button>
            </div>
          </div>
        )}

        {/* Sign Up Mode */}
        {mode === 'signup' && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 mb-4">
              Create your account using SingPass - Singapore's national digital identity platform
            </p>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Your Name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="John Doe"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-errandify-orange"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+65 9234 5678"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-errandify-orange"
              />
            </div>

            {/* SingPass Signup */}
            <button
              onClick={handleSignupSingPass}
              disabled={loading}
              className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? 'Creating account...' : '🔐 Sign Up with SingPass'}
            </button>

            <p className="text-xs text-gray-500 text-center">
              By signing up, you agree to our{' '}
              <a href="/terms" className="text-errandify-orange hover:underline">
                Terms of Service
              </a>{' '}
              and{' '}
              <a href="/privacy" className="text-errandify-orange hover:underline">
                Privacy Policy
              </a>
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="mt-6 pt-6 border-t border-gray-200 text-center text-xs text-gray-500">
          Powered by{' '}
          <a
            href="https://www.singpass.gov.sg"
            target="_blank"
            rel="noopener noreferrer"
            className="text-errandify-orange hover:underline"
          >
            SingPass
          </a>{' '}
          &{' '}
          <a
            href="https://stripe.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            Stripe
          </a>
        </div>
      </div>

      {/* Info Box */}
      <div className="mt-8 w-full max-w-md">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
          <p className="font-semibold mb-2">🔒 Security First</p>
          <p>
            We use SingPass for secure authentication and Stripe for safe payments.
            Your personal data is never stored on our servers.
          </p>
        </div>
      </div>
    </div>
  );
}
