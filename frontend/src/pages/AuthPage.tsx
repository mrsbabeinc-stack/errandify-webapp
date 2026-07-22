import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

interface AuthPageProps {
  onLogin: (role: 'asker' | 'doer' | 'admin' | 'support_l2' | 'support_l3') => void;
}

export default function AuthPage({ onLogin }: AuthPageProps) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  // Handle SingPass Login - Standard OAuth2 Flow
  const handleSingPassLogin = () => {
    try {
      // Generate PKCE parameters for security
      const state = Math.random().toString(36).substring(2, 15);
      const nonce = Math.random().toString(36).substring(2, 15);

      // Store state and nonce for verification after redirect
      // Use localStorage (survives page reload) instead of sessionStorage
      localStorage.setItem('singpass_state', state);
      localStorage.setItem('singpass_nonce', nonce);
      localStorage.setItem('singpass_mode', 'signin'); // Track if this is signin

      // Redirect to SingPass login (for testing: redirect to simulator)
      const singpassUrl = `/singpass-simulator?` + new URLSearchParams({
        client_id: 'errandify-app',
        redirect_uri: `${window.location.origin}/auth/singpass-callback`,
        response_type: 'code',
        scope: 'openid profile email mobile',
        state,
        nonce,
        acr_values: 'urn:singpass:loa2', // Level of Assurance 2 (highest security)
      }).toString();

      window.location.href = singpassUrl;
    } catch (err: any) {
      setError(err.response?.data?.error || 'SingPass login failed');
    }
  };

  // Handle Signup via SingPass - Standard OAuth2 Flow
  const handleSignupSingPass = async () => {
    setError('');

    try {
      // Generate PKCE parameters for security
      const state = Math.random().toString(36).substring(2, 15);
      const nonce = Math.random().toString(36).substring(2, 15);

      // Store state and nonce for verification after redirect
      // Use localStorage (survives page reload) instead of sessionStorage
      localStorage.setItem('singpass_state', state);
      localStorage.setItem('singpass_nonce', nonce);
      localStorage.setItem('singpass_mode', 'signup'); // Track if this is signup

      // Redirect to SingPass login (for testing: redirect to simulator)
      const singpassUrl = `/singpass-simulator?` + new URLSearchParams({
        client_id: 'errandify-app',
        redirect_uri: `${window.location.origin}/auth/singpass-callback`,
        response_type: 'code',
        scope: 'openid profile email mobile',
        state,
        nonce,
        acr_values: 'urn:singpass:loa2', // Level of Assurance 2 (highest security)
      }).toString();

      window.location.href = singpassUrl;
    } catch (err: any) {
      setError(err.response?.data?.error || 'Signup failed. Please try again.');
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

      // Route to appropriate dashboard based on account type
      if (account === 'demo_owner' || account === 'demo_manager') {
        navigate('/company/dashboard');
      } else if (account === 'demo_staff1' || account === 'demo_staff2') {
        navigate('/staff/dashboard');
      } else {
        navigate('/home');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-errandify-orange-50 to-orange-50 flex flex-col items-center justify-center p-4">
      {/* Logo/Header */}
      <div className="mb-8 text-center">
        <img
          src="/images/Errandify Logo.png"
          alt="Errandify"
          className="h-20 w-auto mx-auto mb-4"
        />
        <p className="text-errandify-orange font-semibold text-sm italic mb-2">
          Simplifying Life. Amplifying Humanity.
        </p>
        <p className="text-gray-600 font-bold text-lg">
          Get Help. Give Help. Get Paid
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

            <div className="space-y-1 max-h-[500px] overflow-y-auto">
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
              <button
                onClick={() => handleDemoLogin('admin')}
                disabled={loading}
                className="w-full py-2 px-4 bg-red-50 border-2 border-red-300 text-red-700 rounded-lg font-semibold hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                👨‍💼 Demo: Admin (Support Dashboard)
              </button>
              <button
                onClick={() => handleDemoLogin('support_l2')}
                disabled={loading}
                className="w-full py-2 px-4 bg-blue-50 border-2 border-blue-300 text-blue-700 rounded-lg font-semibold hover:bg-blue-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                👩‍💻 Demo: Support L2 (Dispute Review)
              </button>
              <button
                onClick={() => handleDemoLogin('support_l3')}
                disabled={loading}
                className="w-full py-2 px-4 bg-purple-50 border-2 border-purple-300 text-purple-700 rounded-lg font-semibold hover:bg-purple-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                👨‍⚖️ Demo: Support L3 (Final Appeals)
              </button>
              {/* Company Staff Accounts */}
              <div className="text-xs font-semibold text-gray-600 my-2 px-1">Company Demo Accounts (Staff Management)</div>

              <button
                onClick={() => handleDemoLogin('demo_owner')}
                disabled={loading}
                className="w-full py-2 px-4 bg-yellow-50 border-2 border-yellow-400 text-yellow-700 rounded-lg font-semibold hover:bg-yellow-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                👔 Demo: Owner (Demo Company)
              </button>
              <button
                onClick={() => handleDemoLogin('demo_manager')}
                disabled={loading}
                className="w-full py-2 px-4 bg-yellow-50 border-2 border-yellow-400 text-yellow-700 rounded-lg font-semibold hover:bg-yellow-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                👨‍💼 Demo: Manager (Allocate Errands)
              </button>
              <button
                onClick={() => handleDemoLogin('demo_staff1')}
                disabled={loading}
                className="w-full py-2 px-4 bg-cyan-50 border-2 border-cyan-400 text-cyan-700 rounded-lg font-semibold hover:bg-cyan-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                👷 Demo: Staff 1 (Execute Errands)
              </button>
              <button
                onClick={() => handleDemoLogin('demo_staff2')}
                disabled={loading}
                className="w-full py-2 px-4 bg-cyan-50 border-2 border-cyan-400 text-cyan-700 rounded-lg font-semibold hover:bg-cyan-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                👷‍♀️ Demo: Staff 2 (Execute Errands)
              </button>
            </div>
          </div>
        )}

        {/* Sign Up Mode */}
        {mode === 'signup' && (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
              <p className="font-semibold mb-2">🔐 Quick Sign Up with SingPass</p>
              <p className="text-xs leading-relaxed">
                Your name, phone, and personal details come directly from your SingPass account. No need to enter them again. We'll verify your identity instantly.
              </p>
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
