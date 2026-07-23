import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';

interface SingPassUser {
  nric: string;
  name: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  address: string;
  nationality: string;
}

export default function SingPassSimulator() {
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState<'login' | 'verify' | 'confirm'>('login');
  const [nric, setNric] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Simulated SingPass users database
  const singpassUsers: Record<string, SingPassUser> = {
    'S1234567A': {
      nric: 'S1234567A',
      name: 'John Lee',
      email: 'john.lee@example.com',
      phone: '+6581234567',
      dateOfBirth: '1990-01-15',
      address: '123 Clementi Ave 3, Singapore 129957',
      nationality: 'Singapore',
    },
    'S9876543B': {
      nric: 'S9876543B',
      name: 'Sarah Tan',
      email: 'sarah.tan@example.com',
      phone: '+6587654321',
      dateOfBirth: '1992-05-20',
      address: '456 Ang Mo Kio Ave 1, Singapore 569969',
      nationality: 'Singapore',
    },
    'S5555555C': {
      nric: 'S5555555C',
      name: 'David Wong',
      email: 'david.wong@example.com',
      phone: '+6589999999',
      dateOfBirth: '1988-12-10',
      address: '789 Bukit Merah Lane, Singapore 150789',
      nationality: 'Singapore',
    },
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Validate NRIC format
    if (!nric.match(/^S\d{7}[A-Z]$/)) {
      setError('Invalid NRIC format. Use format: S1234567A');
      setLoading(false);
      return;
    }

    // Check if user exists
    const user = singpassUsers[nric];
    if (!user) {
      setError('NRIC not found. Try: S1234567A, S9876543B, or S5555555C');
      setLoading(false);
      return;
    }

    // Verify password (demo: any non-empty password works)
    if (!password) {
      setError('Password is required');
      setLoading(false);
      return;
    }

    // Move to verification step
    setStep('verify');
    setLoading(false);
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Simulate network delay and 2FA verification
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Move to confirmation step
    setStep('confirm');
    setLoading(false);
  };

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Simulate final verification
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const user = singpassUsers[nric];
    if (!user) return;

    // Prepare the callback data
    const singpassData = {
      sub: user.nric, // Subject (NRIC)
      name: user.name,
      email: user.email,
      phone_number: user.phone,
      birthdate: user.dateOfBirth,
      address: user.address,
      nationality: user.nationality,
    };

    // Store in session storage temporarily for callback handler
    sessionStorage.setItem('singpass_auth_data', JSON.stringify(singpassData));

    // Get the redirect URI and state from query params
    const redirectUri = searchParams.get('redirect_uri');
    const state = searchParams.get('state');

    /*
     * The chosen NRIC travels in the mock authorization code.
     *
     * This screen offers three identities, but the code carried only a
     * timestamp — and the backend's simulator branch answered with a
     * hardcoded S1234567A no matter which one you picked. So every simulated
     * login was the same person, and the two other identities were unreachable
     * decoration. That also made it impossible to exercise signup at all,
     * because S1234567A already has an account: the flow could only ever take
     * the "user already exists" path.
     *
     * Real Singpass codes are opaque and this one is not; it is only ever
     * accepted by the development branch of the callback, which is gated on
     * the `singpass_auth_code` prefix.
     */
    const mockCode = `singpass_auth_code_${nric}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const base = redirectUri || '/auth/singpass-callback';
    window.location.href = `${base}?code=${mockCode}&state=${state || 'state'}`;
  };

  return (
    <div className="min-h-screen bg-blue-50 flex flex-col items-center justify-center p-4">
      {/* SingPass Header - Compact */}
      <div className="mb-6 text-center">
        {/* Lock & Key Icon */}
        <div className="text-5xl mb-2">🔐</div>
        {/* SingPass Title */}
        <h1 className="text-3xl font-bold text-blue-900">SingPass</h1>
        {/* Subtitle */}
        <p className="text-sm text-blue-600">Singapore's National Digital Identity</p>
      </div>

      {/* Main Card - Compact Design */}
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
        {/* Step 1: Login */}
        {step === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4">
            {/* Header */}
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-1">Sign In</h2>
              <p className="text-sm text-gray-600">
                Enter your NRIC and password
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-300 text-red-700 rounded-lg text-sm text-center font-semibold">
                {error}
              </div>
            )}

            {/* NRIC Input */}
            <div>
              <label className="block text-xs font-bold text-gray-900 mb-1">
                NRIC / FIN
              </label>
              <input
                type="text"
                value={nric}
                onChange={(e) => setNric(e.target.value.toUpperCase())}
                placeholder="S1234567A"
                disabled={loading}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-200 font-mono text-center text-base disabled:bg-gray-100 transition-all"
              />
              <p className="text-xs text-gray-500 mt-1">
                Demo: S1234567A, S9876543B, S5555555C
              </p>
            </div>

            {/* Password Input */}
            <div>
              <label className="block text-xs font-bold text-gray-900 mb-1">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={loading}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-200 disabled:bg-gray-100 transition-all"
              />
              <p className="text-xs text-gray-500 mt-1">
                Demo: Use any password
              </p>
            </div>

            {/* Sign In Button */}
            <button
              type="submit"
              disabled={loading || !nric || !password}
              className="w-full py-2.5 px-4 bg-blue-500 text-white rounded-lg font-bold text-base hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing In...' : 'Sign In'}
            </button>

            {/* Forgot Password Link */}
            <div className="text-center">
              <a href="#" className="text-blue-600 hover:text-blue-700 font-semibold text-sm">
                Forgot password?
              </a>
            </div>
          </form>
        )}

        {/* Step 2: 2FA Verification */}
        {step === 'verify' && (
          <form onSubmit={handleVerify} className="space-y-4">
            {/* Header */}
            <div className="text-center mb-5">
              <div className="text-4xl mb-2">📱</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-1">
                Verify Your Identity
              </h2>
              <p className="text-sm text-gray-600">
                We've sent a code to your registered phone
              </p>
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-300 rounded-lg p-3 text-center">
              <p className="font-bold text-blue-900 mb-1 text-sm">2-Factor Authentication</p>
              <p className="text-blue-700 text-xs">For demo, just click "Verify" - no code needed</p>
            </div>

            {/* Verify Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-blue-500 text-white rounded-lg font-bold text-base hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Verifying...' : 'Verify'}
            </button>

            {/* Back Button */}
            <button
              type="button"
              onClick={() => setStep('login')}
              disabled={loading}
              className="w-full py-2.5 px-4 bg-gray-300 text-gray-900 rounded-lg font-bold text-base hover:bg-gray-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Back
            </button>
          </form>
        )}

        {/* Step 3: Confirmation */}
        {step === 'confirm' && (
          <form onSubmit={handleConfirm} className="space-y-4">
            {/* Header */}
            <div className="text-center mb-4">
              <div className="text-4xl mb-2">✅</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-1">
                Confirm Login
              </h2>
              <p className="text-sm text-gray-600">
                Review your information before proceeding
              </p>
            </div>

            {/* User Information - Compact */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between items-center py-1">
                <p className="text-xs font-bold text-gray-600 uppercase">
                  Name
                </p>
                <p className="text-sm font-semibold text-gray-900">
                  {singpassUsers[nric]?.name || '—'}
                </p>
              </div>

              <div className="flex justify-between items-center py-1">
                <p className="text-xs font-bold text-gray-600 uppercase">
                  NRIC
                </p>
                <p className="text-sm font-mono font-semibold text-gray-900">{nric}</p>
              </div>

              <div className="flex justify-between items-center py-1">
                <p className="text-xs font-bold text-gray-600 uppercase">
                  Email
                </p>
                <p className="text-sm text-gray-900">
                  {singpassUsers[nric]?.email || '—'}
                </p>
              </div>

              <div className="flex justify-between items-center py-1">
                <p className="text-xs font-bold text-gray-600 uppercase">
                  Phone
                </p>
                <p className="text-sm text-gray-900">
                  {singpassUsers[nric]?.phone || '—'}
                </p>
              </div>
            </div>

            {/* Verification Badge */}
            <div className="bg-green-50 border border-green-300 rounded-lg p-3 text-center">
              <p className="font-bold text-green-900 text-sm mb-1">✅ Identity Verified</p>
              <p className="text-green-700 text-xs">
                Your information has been verified and will be shared with Errandify.
              </p>
            </div>

            {/* Confirm Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-green-600 text-white rounded-lg font-bold text-base hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Confirming...' : 'Confirm & Continue'}
            </button>

            {/* Back Button */}
            <button
              type="button"
              onClick={() => setStep('login')}
              disabled={loading}
              className="w-full py-2.5 px-4 bg-gray-300 text-gray-900 rounded-lg font-bold text-base hover:bg-gray-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Back
            </button>
          </form>
        )}
      </div>

      {/* Footer */}
      <div className="mt-6 text-center text-xs text-gray-600">
        <p className="font-semibold mb-1">🔒 Secure government authentication</p>
        <a href="https://www.singpass.gov.sg" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700 font-semibold">
          Learn more about SingPass
        </a>
      </div>
    </div>
  );
}
