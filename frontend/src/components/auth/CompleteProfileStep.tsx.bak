import { useState, useEffect } from 'react';
import axios from 'axios';

interface MockUserData {
  name: string;
  age: number;
  nric: string;
  address: string;
}

interface CompleteProfileStepProps {
  mockData: MockUserData;
  onComplete: () => void;
  onBack: () => void;
}

export default function CompleteProfileStep({
  mockData,
  onComplete,
  onBack,
}: CompleteProfileStepProps) {
  const [displayName, setDisplayName] = useState(mockData.name);
  const [mobile, setMobile] = useState('');
  const [language, setLanguage] = useState<'en' | 'zh'>('en');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Auto-increase font size for users 50+
  const fontSize = mockData.age >= 50 ? 'text-lg' : 'text-base';

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/auth/signup`,
        {
          name: displayName,
          age: mockData.age,
          nric: mockData.nric,
          address: mockData.address,
          mobile,
          language,
          role: 'asker',
        }
      );

      // Store token in localStorage (httpOnly cookie in real implementation)
      localStorage.setItem('token', response.data.data.accessToken);
      localStorage.setItem(
        'user',
        JSON.stringify(response.data.data.user)
      );

      onComplete();
    } catch (err: any) {
      setError(
        err.response?.data?.error || 'Signup failed. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`min-h-screen bg-errandify-bg flex flex-col items-center justify-center p-4 ${fontSize}`}
    >
      <div className="w-full max-w-sm bg-white rounded-lg shadow-lg p-6">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-errandify-orange mb-2">
            Complete Your Profile
          </h2>
          <p className="text-sm text-gray-600">
            One more step to join the kampung
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSignup} className="space-y-4">
          {/* Display Name */}
          <div>
            <label className="block text-sm font-medium text-errandify-brown mb-1">
              Display Name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-errandify-orange"
            />
          </div>

          {/* Mobile Number */}
          <div>
            <label className="block text-sm font-medium text-errandify-brown mb-1">
              Mobile Number
            </label>
            <input
              type="tel"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              placeholder="e.g. 98765432"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-errandify-orange"
            />
          </div>

          {/* Language Preference */}
          <div>
            <label className="block text-sm font-medium text-errandify-brown mb-2">
              Language Preference
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setLanguage('en')}
                className={`flex-1 py-2 px-3 rounded-lg font-medium transition-colors ${
                  language === 'en'
                    ? 'bg-errandify-orange text-white'
                    : 'bg-gray-200 text-errandify-brown hover:bg-gray-300'
                }`}
              >
                English
              </button>
              <button
                type="button"
                onClick={() => setLanguage('zh')}
                className={`flex-1 py-2 px-3 rounded-lg font-medium transition-colors ${
                  language === 'zh'
                    ? 'bg-errandify-orange text-white'
                    : 'bg-gray-200 text-errandify-brown hover:bg-gray-300'
                }`}
              >
                中文
              </button>
            </div>
          </div>

          {/* Age Display (informational) */}
          <div className="p-3 bg-orange-50 rounded-lg">
            <p className="text-sm text-gray-700">
              <span className="font-semibold">Age:</span> {mockData.age}
              {mockData.age >= 50 && (
                <span className="block text-xs text-gray-600 mt-1">
                  ✓ Text size increased for readability
                </span>
              )}
            </p>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onBack}
              className="flex-1 py-3 px-4 border-2 border-gray-300 text-errandify-brown rounded-lg font-semibold hover:bg-gray-50 transition-colors"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={loading || !displayName.trim() || !mobile.trim()}
              className="flex-1 py-3 px-4 bg-errandify-orange text-white rounded-lg font-semibold hover:bg-opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Joining...' : 'Join the Kampung'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
