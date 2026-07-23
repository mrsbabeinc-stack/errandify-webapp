import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

interface AuthPageProps {
  onLogin: (role: 'asker' | 'doer' | 'admin' | 'support_l2' | 'support_l3') => void;
}

/**
 * The same Vanda Miss Joaquim print as the landing page, so the hand-off from
 * "Get Started" into sign-in does not feel like leaving the product.
 */
const AUTH_MOTIF: React.CSSProperties = {
  backgroundImage:
    'url("data:image/svg+xml,' +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="112" height="112" viewBox="0 0 112 112"><g fill="#D2521C" fill-opacity="0.10" stroke="#D2521C" stroke-width="1.25" stroke-opacity="0.20" stroke-linejoin="round"><g transform="translate(28 29) rotate(-12) scale(0.6)"><path d="M0 -2 C-8 -10, -8.5 -20, 0 -28 C8.5 -20, 8 -10, 0 -2 Z"/><path d="M0 -2 C-8 -10, -8.5 -20, 0 -28 C8.5 -20, 8 -10, 0 -2 Z" transform="rotate(72)"/><path d="M0 -2 C-8 -10, -8.5 -20, 0 -28 C8.5 -20, 8 -10, 0 -2 Z" transform="rotate(144)"/><path d="M0 -2 C-8 -10, -8.5 -20, 0 -28 C8.5 -20, 8 -10, 0 -2 Z" transform="rotate(216)"/><path d="M0 -2 C-8 -10, -8.5 -20, 0 -28 C8.5 -20, 8 -10, 0 -2 Z" transform="rotate(288)"/><path d="M0 6 C-6.5 10.5, -7 19.5, 0 26 C7 19.5, 6.5 10.5, 0 6 Z"/><ellipse cx="0" cy="0.5" rx="4.6" ry="4.2"/></g><g transform="translate(84 85) rotate(168) scale(0.6)"><path d="M0 -2 C-8 -10, -8.5 -20, 0 -28 C8.5 -20, 8 -10, 0 -2 Z"/><path d="M0 -2 C-8 -10, -8.5 -20, 0 -28 C8.5 -20, 8 -10, 0 -2 Z" transform="rotate(72)"/><path d="M0 -2 C-8 -10, -8.5 -20, 0 -28 C8.5 -20, 8 -10, 0 -2 Z" transform="rotate(144)"/><path d="M0 -2 C-8 -10, -8.5 -20, 0 -28 C8.5 -20, 8 -10, 0 -2 Z" transform="rotate(216)"/><path d="M0 -2 C-8 -10, -8.5 -20, 0 -28 C8.5 -20, 8 -10, 0 -2 Z" transform="rotate(288)"/><path d="M0 6 C-6.5 10.5, -7 19.5, 0 26 C7 19.5, 6.5 10.5, 0 6 Z"/><ellipse cx="0" cy="0.5" rx="4.6" ry="4.2"/></g></g></svg>`
    ) +
    '")',
  backgroundSize: '112px 112px',
};

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
    <div className="kampung-landing relative min-h-screen bg-errandify-bg flex flex-col items-center justify-center p-4 font-sans">
      {/* Same orchid print and warm glow as the landing page. This is the first
          screen anyone sees after tapping Get Started, and it was arriving on a
          plain grey card with a stock-blue button — a different product to the
          one they just came from. */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 opacity-90" style={AUTH_MOTIF} />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-x-0 top-0 h-[55vh]"
        style={{ background: 'radial-gradient(120% 70% at 50% 0%, rgba(255,138,87,0.20) 0%, rgba(255,250,246,0) 70%)' }}
      />
      {/* Back to the landing page. Someone who tapped "Get Started" and then
          thought better of signing in had no way back except the browser
          button; every other screen in the app offers this. Pinned to the
          corner and matched to the circular back button used elsewhere. */}
      <button
        onClick={() => navigate('/')}
        aria-label="Back to home"
        title="Back to home"
        className="fixed left-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/80 text-lg font-bold text-errandify-orange-deep shadow-kampung-sm backdrop-blur-sm transition-colors hover:bg-errandify-orange-wash"
      >
        ←
      </button>

      {/* Logo/Header */}
      <div className="relative mb-6 text-center">
        <img
          src="/images/Errandify Logo.png"
          alt="Errandify"
          className="h-16 w-auto mx-auto mb-3"
        />
        <p className="k-tagline tracking-wide">
          Simplifying Life. Amplifying Humanity.
        </p>
        <p className="font-display text-[19px] font-black text-errandify-brown">
          Get help. Give help. <span className="text-errandify-orange-deep">Get paid.</span>
        </p>
      </div>

      {/* Auth Card */}
      <div className="relative w-full max-w-md bg-white/95 rounded-individual shadow-kampung p-6 backdrop-blur-sm">
        {/* Mode Toggle */}
        <div className="flex gap-1 mb-5 bg-errandify-orange-wash p-1 rounded-full">
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
          <div className="mb-4 p-3 bg-danger-wash border border-danger/30 text-danger rounded-xl text-sm">
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
              className="w-full py-3 px-4 bg-kampung-gradient text-white rounded-full font-bold shadow-kampung hover:opacity-95 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
                className="w-full py-2 px-4 bg-gray-50 border border-gray-200 text-gray-700 rounded-xl font-semibold text-sm hover:bg-gray-100 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                👩 Demo: Sarah (Asker/Doer)
              </button>
              <button
                onClick={() => handleDemoLogin('john')}
                disabled={loading}
                className="w-full py-2 px-4 bg-gray-50 border border-gray-200 text-gray-700 rounded-xl font-semibold text-sm hover:bg-gray-100 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                👨 Demo: John (Asker/Doer)
              </button>
              <button
                onClick={() => handleDemoLogin('admin')}
                disabled={loading}
                className="w-full py-2 px-4 bg-gray-50 border border-gray-200 text-gray-700 rounded-xl font-semibold text-sm hover:bg-gray-100 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                👨‍💼 Demo: Admin (Support Dashboard)
              </button>
              <button
                onClick={() => handleDemoLogin('support_l2')}
                disabled={loading}
                className="w-full py-2 px-4 bg-gray-50 border border-gray-200 text-gray-700 rounded-xl font-semibold text-sm hover:bg-gray-100 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                👩‍💻 Demo: Support L2 (Dispute Review)
              </button>
              <button
                onClick={() => handleDemoLogin('support_l3')}
                disabled={loading}
                className="w-full py-2 px-4 bg-gray-50 border border-gray-200 text-gray-700 rounded-xl font-semibold text-sm hover:bg-gray-100 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                👨‍⚖️ Demo: Support L3 (Final Appeals)
              </button>
              {/* Company Staff Accounts */}
              <div className="text-xs font-semibold text-gray-600 my-2 px-1">Company Demo Accounts (Staff Management)</div>

              <button
                onClick={() => handleDemoLogin('demo_owner')}
                disabled={loading}
                className="w-full py-2 px-4 bg-gray-50 border border-gray-200 text-gray-700 rounded-xl font-semibold text-sm hover:bg-gray-100 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                👔 Demo: Owner (Demo Company)
              </button>
              <button
                onClick={() => handleDemoLogin('demo_manager')}
                disabled={loading}
                className="w-full py-2 px-4 bg-gray-50 border border-gray-200 text-gray-700 rounded-xl font-semibold text-sm hover:bg-gray-100 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                👨‍💼 Demo: Manager (Allocate Errands)
              </button>
              <button
                onClick={() => handleDemoLogin('demo_staff1')}
                disabled={loading}
                className="w-full py-2 px-4 bg-gray-50 border border-gray-200 text-gray-700 rounded-xl font-semibold text-sm hover:bg-gray-100 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                👷 Demo: Staff 1 (Execute Errands)
              </button>
              <button
                onClick={() => handleDemoLogin('demo_staff2')}
                disabled={loading}
                className="w-full py-2 px-4 bg-gray-50 border border-gray-200 text-gray-700 rounded-xl font-semibold text-sm hover:bg-gray-100 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                👷‍♀️ Demo: Staff 2 (Execute Errands)
              </button>
            </div>
          </div>
        )}

        {/* Sign Up Mode */}
        {mode === 'signup' && (
          <div className="space-y-4">
            <div className="bg-errandify-orange-wash border border-errandify-orange/25 rounded-xl p-4 text-sm text-gray-700">
              <p className="font-semibold mb-2">🔐 Quick Sign Up with SingPass</p>
              <p className="text-xs leading-relaxed">
                Your name, phone, and personal details come directly from your SingPass account. No need to enter them again. We'll verify your identity instantly.
              </p>
            </div>

            {/* SingPass Signup */}
            <button
              onClick={handleSignupSingPass}
              disabled={loading}
              className="w-full py-3 px-4 bg-kampung-gradient text-white rounded-full font-bold shadow-kampung hover:opacity-95 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
            className="text-errandify-orange-deep font-semibold hover:underline"
          >
            Stripe
          </a>
        </div>
      </div>

      {/* Info Box */}
      <div className="mt-8 w-full max-w-md">
        <div className="bg-errandify-orange-wash border border-errandify-orange/25 rounded-xl p-4 text-sm text-gray-700">
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
