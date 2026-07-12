import { useState } from 'react';
import axios from 'axios';

interface LoginPageProps {
  onLogin: (role: 'asker' | 'doer') => void;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleDemoLogin = async (account: string) => {
    setError('');
    setLoading(true);

    try {
      // Demo login with predefined accounts
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/auth/demo-login`,
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
    <div className="min-h-screen bg-errandify-bg flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-lg shadow-lg p-6">
        {/* Header */}
        <div className="mb-6 text-center">
          <h2 className="text-2xl font-bold text-errandify-orange mb-2">
            Welcome to Errandify
          </h2>
          <p className="text-sm text-gray-600">
            Choose a demo account to get started
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Demo Accounts */}
        <div className="space-y-3">
          <button
            onClick={() => handleDemoLogin('sarah')}
            disabled={loading}
            className="w-full py-3 px-4 bg-orange-50 border-2 border-errandify-orange-300 text-errandify-orange-700 rounded-lg font-semibold hover:bg-orange-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Logging in...' : '👩 Sarah (Asker/Doer)'}
          </button>
          <button
            onClick={() => handleDemoLogin('john')}
            disabled={loading}
            className="w-full py-3 px-4 bg-green-50 border-2 border-green-300 text-green-700 rounded-lg font-semibold hover:bg-green-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Logging in...' : '👨 John (Asker/Doer)'}
          </button>
        </div>

        {/* Info Text */}
        <p className="text-xs text-gray-600 text-center mt-4">
          💡 After login, switch roles using the toggle at the top
        </p>

        {/* Footer */}
        <p className="text-xs text-gray-500 text-center mt-4 pt-4 border-t border-gray-200">
          Powered by SingPass
        </p>
      </div>
    </div>
  );
}
