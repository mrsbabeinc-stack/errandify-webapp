import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

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
  const navigate = useNavigate();
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

    // Store in session storage temporarily for callback
    sessionStorage.setItem('singpass_auth_data', JSON.stringify(singpassData));

    // Get the redirect URI from query params
    const redirectUri = searchParams.get('redirect_uri');

    // In real app, this would be the callback endpoint
    // For testing, we'll just navigate back with the data
    if (redirectUri) {
      // Simulate OAuth callback
      window.location.href = `${redirectUri}?code=singpass_auth_code_${Date.now()}&state=${searchParams.get('state') || 'state'}`;
    } else {
      // Fallback: navigate to home with auth data
      sessionStorage.setItem('singpass_verified', 'true');
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex flex-col items-center justify-center p-4">
      {/* SingPass Header */}
      <div className="mb-8 text-center">
        <div className="text-5xl font-bold text-blue-600 mb-2">🔐</div>
        <h1 className="text-3xl font-bold text-blue-900 mb-1">SingPass</h1>
        <p className="text-blue-700">Singapore's National Digital Identity</p>
      </div>

      {/* Main Card */}
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8">
        {/* Step 1: Login */}
        {step === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Sign In</h2>
              <p className="text-sm text-gray-600">
                Enter your NRIC and password
              </p>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                NRIC / FIN
              </label>
              <input
                type="text"
                value={nric}
                onChange={(e) => setNric(e.target.value.toUpperCase())}
                placeholder="S1234567A"
                disabled={loading}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-600 font-mono text-center text-lg disabled:bg-gray-100"
              />
              <p className="text-xs text-gray-500 mt-2">
                Demo: S1234567A, S9876543B, S5555555C
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={loading}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-600 disabled:bg-gray-100"
              />
              <p className="text-xs text-gray-500 mt-2">
                Demo: Use any password
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || !nric || !password}
              className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Verifying...' : 'Sign In'}
            </button>

            <div className="text-center text-sm text-gray-600">
              <a href="#" className="text-blue-600 hover:underline">
                Forgot password?
              </a>
            </div>
          </form>
        )}

        {/* Step 2: 2FA Verification */}
        {step === 'verify' && (
          <form onSubmit={handleVerify} className="space-y-4">
            <div className="text-center mb-6">
              <div className="text-4xl mb-3">📱</div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                Verify Your Identity
              </h2>
              <p className="text-sm text-gray-600">
                We've sent a code to your registered phone
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
              <p className="font-semibold mb-1">2-Factor Authentication</p>
              <p>For demo, just click "Verify" - no code needed</p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Verifying...' : 'Verify'}
            </button>

            <button
              type="button"
              onClick={() => setStep('login')}
              disabled={loading}
              className="w-full py-3 px-4 bg-gray-200 text-gray-800 rounded-lg font-semibold hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Back
            </button>
          </form>
        )}

        {/* Step 3: Confirmation */}
        {step === 'confirm' && (
          <form onSubmit={handleConfirm} className="space-y-4">
            <div className="text-center mb-6">
              <div className="text-4xl mb-3">✅</div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                Confirm Login
              </h2>
              <p className="text-sm text-gray-600">
                Review your information before proceeding
              </p>
            </div>

            {/* User Info Display */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase">
                  Name
                </p>
                <p className="text-lg font-semibold text-gray-800">
                  {singpassUsers[nric]?.name || '—'}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase">
                  NRIC
                </p>
                <p className="text-lg font-mono text-gray-800">{nric}</p>
              </div>

              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase">
                  Email
                </p>
                <p className="text-lg text-gray-800">
                  {singpassUsers[nric]?.email || '—'}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase">
                  Phone
                </p>
                <p className="text-lg text-gray-800">
                  {singpassUsers[nric]?.phone || '—'}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase">
                  Date of Birth
                </p>
                <p className="text-lg text-gray-800">
                  {singpassUsers[nric]?.dateOfBirth || '—'}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase">
                  Address
                </p>
                <p className="text-sm text-gray-800">
                  {singpassUsers[nric]?.address || '—'}
                </p>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
              <p className="font-semibold mb-1">✅ Identity Verified</p>
              <p>
                Your information has been securely verified and will be shared
                with Errandify.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Confirming...' : 'Confirm & Continue to Errandify'}
            </button>

            <button
              type="button"
              onClick={() => setStep('login')}
              disabled={loading}
              className="w-full py-3 px-4 bg-gray-200 text-gray-800 rounded-lg font-semibold hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Back
            </button>
          </form>
        )}
      </div>

      {/* Footer */}
      <div className="mt-8 text-center text-sm text-gray-600">
        <p>🔒 This is a secure government authentication system</p>
        <p className="mt-2">
          <a href="https://www.singpass.gov.sg" className="text-blue-600 hover:underline">
            Learn more about SingPass
          </a>
        </p>
      </div>
    </div>
  );
}
