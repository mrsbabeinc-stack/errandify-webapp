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

    // Simulate OAuth callback by redirecting to the callback endpoint
    if (redirectUri) {
      // Redirect to callback handler with authorization code
      const callbackUrl = `${redirectUri}?code=singpass_auth_code_${Date.now()}_${Math.random().toString(36).substr(2, 9)}&state=${state || 'state'}`;
      window.location.href = callbackUrl;
    } else {
      // Fallback: use default callback URL
      const callbackUrl = `/auth/singpass-callback?code=singpass_auth_code_${Date.now()}_${Math.random().toString(36).substr(2, 9)}&state=${state || 'state'}`;
      window.location.href = callbackUrl;
    }
  };

  return (
    <div className="min-h-screen bg-blue-50 flex flex-col items-center justify-center p-4">
      {/* SingPass Header - Official Design */}
      <div className="mb-12 text-center">
        {/* Lock & Key Icon */}
        <div className="text-6xl mb-4">🔐</div>
        {/* SingPass Title */}
        <h1 className="text-4xl font-bold text-blue-900 mb-2">SingPass</h1>
        {/* Subtitle */}
        <p className="text-lg text-blue-600">Singapore's National Digital Identity</p>
      </div>

      {/* Main Card - Official SingPass Design */}
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl p-12">
        {/* Step 1: Login */}
        {step === 'login' && (
          <form onSubmit={handleLogin} className="space-y-6">
            {/* Header */}
            <div className="text-center mb-8">
              <h2 className="text-4xl font-bold text-gray-900 mb-3">Sign In</h2>
              <p className="text-lg text-gray-700">
                Enter your NRIC and password
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-4 bg-red-50 border border-red-300 text-red-700 rounded-xl text-center font-semibold">
                {error}
              </div>
            )}

            {/* NRIC Input */}
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-3">
                NRIC / FIN
              </label>
              <input
                type="text"
                value={nric}
                onChange={(e) => setNric(e.target.value.toUpperCase())}
                placeholder="S1234567A"
                disabled={loading}
                className="w-full px-6 py-4 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 font-mono text-center text-xl disabled:bg-gray-100 transition-all"
              />
              <p className="text-sm text-gray-600 mt-2">
                Demo: S1234567A, S9876543B, S5555555C
              </p>
            </div>

            {/* Password Input */}
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-3">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={loading}
                className="w-full px-6 py-4 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-100 transition-all"
              />
              <p className="text-sm text-gray-600 mt-2">
                Demo: Use any password
              </p>
            </div>

            {/* Sign In Button */}
            <button
              type="submit"
              disabled={loading || !nric || !password}
              className="w-full py-4 px-6 bg-blue-500 text-white rounded-xl font-bold text-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
            >
              {loading ? 'Signing In...' : 'Sign In'}
            </button>

            {/* Forgot Password Link */}
            <div className="text-center">
              <a href="#" className="text-blue-600 hover:text-blue-700 font-semibold text-lg">
                Forgot password?
              </a>
            </div>
          </form>
        )}

        {/* Step 2: 2FA Verification */}
        {step === 'verify' && (
          <form onSubmit={handleVerify} className="space-y-6">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="text-6xl mb-4">📱</div>
              <h2 className="text-4xl font-bold text-gray-900 mb-3">
                Verify Your Identity
              </h2>
              <p className="text-lg text-gray-700">
                We've sent a code to your registered phone
              </p>
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 border-2 border-blue-300 rounded-xl p-6 text-center">
              <p className="font-bold text-blue-900 mb-2 text-lg">2-Factor Authentication</p>
              <p className="text-blue-700">For demo, just click "Verify" - no code needed</p>
            </div>

            {/* Verify Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 px-6 bg-blue-500 text-white rounded-xl font-bold text-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
            >
              {loading ? 'Verifying...' : 'Verify'}
            </button>

            {/* Back Button */}
            <button
              type="button"
              onClick={() => setStep('login')}
              disabled={loading}
              className="w-full py-4 px-6 bg-gray-300 text-gray-900 rounded-xl font-bold text-lg hover:bg-gray-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Back
            </button>
          </form>
        )}

        {/* Step 3: Confirmation */}
        {step === 'confirm' && (
          <form onSubmit={handleConfirm} className="space-y-6">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="text-6xl mb-4">✅</div>
              <h2 className="text-4xl font-bold text-gray-900 mb-3">
                Confirm Login
              </h2>
              <p className="text-lg text-gray-700">
                Review your information before proceeding
              </p>
            </div>

            {/* User Information */}
            <div className="bg-gray-100 rounded-xl p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-bold text-gray-600 uppercase mb-1">
                    Name
                  </p>
                  <p className="text-lg font-semibold text-gray-900">
                    {singpassUsers[nric]?.name || '—'}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-bold text-gray-600 uppercase mb-1">
                    NRIC
                  </p>
                  <p className="text-lg font-mono font-semibold text-gray-900">{nric}</p>
                </div>

                <div>
                  <p className="text-xs font-bold text-gray-600 uppercase mb-1">
                    Email
                  </p>
                  <p className="text-lg text-gray-900">
                    {singpassUsers[nric]?.email || '—'}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-bold text-gray-600 uppercase mb-1">
                    Phone
                  </p>
                  <p className="text-lg text-gray-900">
                    {singpassUsers[nric]?.phone || '—'}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-bold text-gray-600 uppercase mb-1">
                    Date of Birth
                  </p>
                  <p className="text-lg text-gray-900">
                    {singpassUsers[nric]?.dateOfBirth || '—'}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-bold text-gray-600 uppercase mb-1">
                    Nationality
                  </p>
                  <p className="text-lg text-gray-900">
                    {singpassUsers[nric]?.nationality || '—'}
                  </p>
                </div>
              </div>

              <div className="border-t border-gray-300 pt-4">
                <p className="text-xs font-bold text-gray-600 uppercase mb-1">
                  Address
                </p>
                <p className="text-base text-gray-900">
                  {singpassUsers[nric]?.address || '—'}
                </p>
              </div>
            </div>

            {/* Verification Badge */}
            <div className="bg-green-50 border-2 border-green-300 rounded-xl p-6 text-center">
              <p className="font-bold text-green-900 mb-2 text-lg">✅ Identity Verified</p>
              <p className="text-green-700">
                Your information has been securely verified and will be shared with Errandify.
              </p>
            </div>

            {/* Confirm Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 px-6 bg-green-600 text-white rounded-xl font-bold text-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
            >
              {loading ? 'Confirming...' : 'Confirm & Continue to Errandify'}
            </button>

            {/* Back Button */}
            <button
              type="button"
              onClick={() => setStep('login')}
              disabled={loading}
              className="w-full py-4 px-6 bg-gray-300 text-gray-900 rounded-xl font-bold text-lg hover:bg-gray-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Back
            </button>
          </form>
        )}
      </div>

      {/* Footer */}
      <div className="mt-12 text-center text-sm text-gray-600">
        <p className="font-semibold">🔒 This is a secure government authentication system</p>
        <p className="mt-3">
          <a href="https://www.singpass.gov.sg" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700 font-semibold">
            Learn more about SingPass
          </a>
        </p>
      </div>
    </div>
  );
}
