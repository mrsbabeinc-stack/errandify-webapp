import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import CriminalScreening from '../components/CriminalScreening';

interface SignupData {
  nric: string;
  displayName: string;
  email: string;
  phone: string;
  role: 'asker' | 'doer' | 'both';
}

export default function SingPassSignupPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState<'singpass' | 'profile' | 'screening' | 'complete'>('singpass');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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

  const handleSingPassLogin = () => {
    setLoading(true);
    // In production, this redirects to SingPass
    // For now, mock SingPass flow
    const mockSingPassUrl = `${window.location.origin}?code=mock_singpass_code_123`;
    window.location.href = mockSingPassUrl;
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.displayName || !formData.email || !formData.phone) {
      setError('Please fill in all required fields');
      return;
    }

    // Move to screening
    setStep('screening');
    setError('');
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

          <div className="bg-errandify-orange-50 border-l-4 border-errandify-orange-500 p-4 mb-6">
            <p className="text-errandify-orange-800 text-sm">
              <strong>Why SingPass?</strong> We verify your identity for safety and compliance.
              Your NRIC helps us screen for criminal convictions to protect vulnerable people.
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
            className="w-full py-3 px-4 bg-errandify-orange-600 text-white rounded-lg font-bold hover:bg-errandify-orange-700 disabled:opacity-50 flex items-center justify-center gap-2 mb-4"
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
                  <span className="text-sm">🙋 Asker (Post tasks, hire doers)</span>
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
                  <span className="text-sm">💪 Doer (Find & complete tasks)</span>
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
              className="w-full py-3 px-4 bg-errandify-orange-600 text-white rounded-lg font-bold hover:bg-errandify-orange-700 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Saving...' : 'Continue to Safety Screening'}
            </button>
          </form>

          <p className="text-xs text-gray-500 text-center mt-6">
            Your information is encrypted and never shared.
          </p>
        </div>
      </div>
    );
  }

  // Step 3: Criminal Screening
  if (step === 'screening') {
    return (
      <CriminalScreening
        onComplete={handleScreeningComplete}
        onCancel={() => setStep('profile')}
      />
    );
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
