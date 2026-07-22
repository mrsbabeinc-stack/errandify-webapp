import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';

interface SignupData {
  nric: string;
  displayName: string;
  email: string;
  phone: string;
  role: 'asker' | 'doer' | 'both';
  gender?: string;
}

interface VerificationStatus {
  status: 'approved' | 'restricted' | 'rejected';
  message: string;
  restrictions?: string[];
}

export default function SingPassSignupPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState<'singpass' | 'profile' | 'verification' | 'complete'>('singpass');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus | null>(null);

  const [singpassData, setSingpassData] = useState<any>(null);
  const [formData, setFormData] = useState<SignupData>({
    nric: '',
    displayName: '',
    email: '',
    phone: '',
    role: 'both',
  });

  // Check if returning from SingPass
  useEffect(() => {
    const code = searchParams.get('code');
    if (code) {
      handleSingPassCallback(code);
    }
  }, [searchParams]);

  const handleSingPassCallback = async (code: string) => {
    setLoading(true);
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/auth/singpass-callback`,
        { code }
      );

      const data = response.data.data;
      setSingpassData(data);
      setFormData((prev) => ({
        ...prev,
        nric: data.nric,
        displayName: data.name || '',
        phone: data.phone || '',
        gender: data.gender || '', // Capture gender from SingPass
      }));

      setStep('profile');
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'SingPass verification failed');
      setStep('singpass');
    } finally {
      setLoading(false);
    }
  };

  const handleSingPassLogin = async () => {
    setLoading(true);
    // Ask the server where to send them, then hand over to Singpass.
    //
    // This used to redirect to our OWN origin with a fabricated code, so the
    // user never left the app and nothing was ever verified. Real sign-in
    // happens on Singpass's screen, on Singpass's domain — we only redirect.
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/auth/singpass-authorize`,
        { credentials: 'include' }
      );
      const data = await res.json();
      if (!data?.redirectUrl) throw new Error('No authorization URL returned');
      window.location.href = data.redirectUrl;
    } catch (err) {
      console.error('Singpass authorize failed:', err);
      setLoading(false);
      alert('We could not reach Singpass just now. Please try again in a moment.');
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.displayName || !formData.email || !formData.phone) {
      setError('Please fill in all required fields');
      return;
    }

    // Move to verification (criminal records check)
    setStep('verification');
    setError('');
  };

  const handleVerificationStart = async () => {
    setLoading(true);
    try {
      // First create the account
      const signupResponse = await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/auth/signup`,
        {
          nric: formData.nric,
          displayName: formData.displayName,
          email: formData.email,
          phone: formData.phone,
          role: formData.role,
          gender: formData.gender,
          singpassVerified: true,
        }
      );

      const userData = signupResponse.data.data;
      const token = userData.accessToken;

      // Then run criminal records check
      const verifyResponse = await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/verification/check-criminal-records`,
        {
          nric: formData.nric,
          name: formData.displayName,
          dateOfBirth: singpassData?.dateOfBirth || '',
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const verification = verifyResponse.data;
      setVerificationStatus({
        status: verification.status,
        message: verification.message,
        restrictions: verification.restrictions,
      });

      // Store user data
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(userData.user));

      setError('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleScreeningComplete = async () => {
    setLoading(true);
    try {
      // Create account with all data
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/auth/signup`,
        {
          nric: formData.nric,
          displayName: formData.displayName,
          email: formData.email,
          phone: formData.phone,
          role: formData.role,
          gender: formData.gender,
          singpassVerified: true,
        }
      );

      const userData = response.data.data;
      localStorage.setItem('token', userData.accessToken);
      localStorage.setItem('user', JSON.stringify(userData.user));

      setStep('complete');
      setTimeout(() => {
        navigate('/home');
      }, 2000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Account creation failed');
      setStep('profile');
    } finally {
      setLoading(false);
    }
  };

  // Step 1: SingPass Login
  if (step === 'singpass') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-errandify-orange-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="text-5xl mb-4">🏛️</div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Errandify</h1>
            <p className="text-gray-600">Verified with SingPass</p>
          </div>

          <div className="bg-orange-50 border-l-4 border-errandify-orange-500 p-4 mb-6">
            <p className="text-errandify-orange-800 text-sm">
              <strong>Why SingPass?</strong> We verify your identity to keep our community safe and trustworthy.
            </p>
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm mb-6">
              {error}
            </div>
          )}

          <button
            onClick={handleSingPassLogin}
            disabled={loading}
            className="w-full py-3 px-4 bg-orange-600 text-white rounded-lg font-bold hover:bg-orange-700 disabled:opacity-50 flex items-center justify-center gap-2 mb-4"
          >
            {loading ? '🔄 Redirecting...' : '🆔 Login with SingPass'}
          </button>

          <p className="text-center text-xs text-gray-600">
            Your data is encrypted and secure. Learn more about{' '}
            <a href="#" className="text-errandify-orange-600 hover:underline">
              our privacy policy
            </a>
            .
          </p>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              Don't have SingPass? Register at{' '}
              <a href="https://www.singpass.gov.sg" className="text-errandify-orange-600 hover:underline" target="_blank" rel="noreferrer">
                singpass.gov.sg
              </a>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Step 2: Profile Setup
  if (step === 'profile') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Complete Your Profile</h2>
          <p className="text-gray-600 text-sm mb-6">SingPass verified ✅</p>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleProfileSubmit} className="space-y-4">
            {/* NRIC (Read-only) */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                NRIC (Verified via SingPass)
              </label>
              <input
                type="text"
                value={formData.nric}
                disabled
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
              />
              <p className="text-xs text-green-600 mt-1">✅ Verified with SingPass</p>
            </div>

            {/* Display Name */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Display Name *
              </label>
              <input
                type="text"
                value={formData.displayName}
                onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                placeholder="How others will see you"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-errandify-orange-500"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Email Address *
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="your@email.com"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-errandify-orange-500"
              />
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Phone Number *
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+65 XXXX XXXX"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-errandify-orange-500"
              />
            </div>

            {/* Role */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                I want to be...
              </label>
              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="role"
                    value="asker"
                    checked={formData.role === 'asker'}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">🙋 Asker (Post errands, hire doers)</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="role"
                    value="doer"
                    checked={formData.role === 'doer'}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">💪 Doer (Find & complete errands)</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="role"
                    value="both"
                    checked={formData.role === 'both'}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">🔄 Both (Flexible)</span>
                </label>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-orange-600 text-white rounded-lg font-bold hover:bg-orange-700 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Saving...' : 'Complete Sign Up'}
            </button>
          </form>

          <p className="text-xs text-gray-500 text-center mt-6">
            Your information is encrypted and never shared.
          </p>
        </div>
      </div>
    );
  }

  // Step 3: Criminal Records Verification
  if (step === 'verification') {
    if (!verificationStatus) {
      // Verification in progress
      return (
        <div className="min-h-screen bg-blue-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Account Verification</h2>
            <p className="text-gray-600 text-sm mb-6">Final step: Safety screening</p>

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm mb-6">
                {error}
              </div>
            )}

            <div className="space-y-4">
              {/* Verification steps */}
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <span className="text-lg">✅</span>
                <div>
                  <p className="font-semibold text-sm text-gray-800">SingPass Verified</p>
                  <p className="text-xs text-gray-600">Identity confirmed</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <span className="text-lg">✅</span>
                <div>
                  <p className="font-semibold text-sm text-gray-800">Profile Complete</p>
                  <p className="text-xs text-gray-600">Contact info verified</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border-2 border-blue-300">
                <span className="text-lg animate-spin">⏳</span>
                <div>
                  <p className="font-semibold text-sm text-blue-800">Safety Screening</p>
                  <p className="text-xs text-blue-600">Checking criminal records...</p>
                </div>
              </div>
            </div>

            <div className="mt-6 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs text-blue-800">
                <strong>Why this step?</strong> We screen all users to keep our community safe. This typically takes less than a minute.
              </p>
            </div>

            <button
              onClick={handleVerificationStart}
              disabled={loading}
              className="w-full mt-6 py-3 px-4 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? '🔄 Verifying...' : '▶ Start Verification'}
            </button>
          </div>
        </div>
      );
    } else {
      // Verification complete - show result
      const isApproved = verificationStatus.status === 'approved';
      const isRestricted = verificationStatus.status === 'restricted';
      const isRejected = verificationStatus.status === 'rejected';

      const bgColor = isApproved ? 'green-50' : isRejected ? 'red-50' : 'yellow-50';
      const borderColor = isApproved ? 'green-200' : isRejected ? 'red-200' : 'yellow-200';
      const textColor = isApproved ? 'green-800' : isRejected ? 'red-800' : 'yellow-800';
      const icon = isApproved ? '✅' : isRejected ? '❌' : '⚠️';

      return (
        <div className={`min-h-screen bg-${bgColor} flex items-center justify-center p-4`}>
          <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8">
            <div className="text-center mb-6">
              <div className="text-6xl mb-4">{icon}</div>
              <h2 className={`text-2xl font-bold text-${textColor} mb-2`}>
                {isApproved ? 'Verification Complete' : isRejected ? 'Verification Failed' : 'Restricted Access'}
              </h2>
            </div>

            <div className={`p-4 bg-${bgColor} border border-${borderColor} rounded-lg mb-6`}>
              <p className={`text-sm text-${textColor} font-semibold`}>
                {verificationStatus.message}
              </p>
            </div>

            {isRestricted && verificationStatus.restrictions && verificationStatus.restrictions.length > 0 && (
              <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm font-semibold text-yellow-800 mb-2">Some job categories unavailable:</p>
                <ul className="text-xs text-yellow-700 space-y-1">
                  {verificationStatus.restrictions.map((r: string) => (
                    <li key={r}>• {r.replace(/_/g, ' ')}</li>
                  ))}
                </ul>
              </div>
            )}

            {isRejected ? (
              <div className="space-y-3">
                <p className="text-sm text-gray-600 text-center">
                  If you believe this is a mistake, please contact our support team.
                </p>
                <button
                  onClick={() => navigate('/')}
                  className="w-full py-3 px-4 bg-gray-600 text-white rounded-lg font-bold hover:bg-gray-700"
                >
                  Return to Home
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setStep('complete');
                  setTimeout(() => {
                    navigate('/home');
                  }, 2000);
                }}
                className={`w-full py-3 px-4 bg-${isApproved ? 'green' : 'yellow'}-600 text-white rounded-lg font-bold hover:bg-${isApproved ? 'green' : 'yellow'}-700`}
              >
                {isApproved ? '✅ Continue to Dashboard' : '⚠️ Continue with Restrictions'}
              </button>
            )}
          </div>
        </div>
      );
    }
  }

  // Step 4: Success
  if (step === 'complete') {
    return (
      <div className="min-h-screen bg-green-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-3xl font-bold text-green-700 mb-2">Welcome to Errandify!</h2>
          <p className="text-gray-700 mb-2">Your account is ready.</p>
          <p className="text-sm text-gray-600">Redirecting...</p>
        </div>
      </div>
    );
  }

  return null;
}
