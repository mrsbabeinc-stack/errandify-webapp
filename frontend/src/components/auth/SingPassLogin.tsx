import { useState } from 'react';
import axios from 'axios';

interface SingPassLoginProps {
  onComplete: () => void;
  onBack: () => void;
}

export default function SingPassLogin({ onComplete, onBack }: SingPassLoginProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSingPassLogin = async () => {
    setError('');
    setLoading(true);

    try {
      // In production, this would redirect to SingPass OAuth flow
      // For demo, we'll use the demo accounts
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL || window.location.origin}/api/auth/singpass-login`,
        { demo: true }
      );

      console.log('[SingPass] Login response:', response.data.data);
      localStorage.setItem('token', response.data.data.accessToken);
      localStorage.setItem('user', JSON.stringify(response.data.data.user));
      console.log('[SingPass] Stored user:', response.data.data.user);

      onComplete();
    } catch (err: any) {
      setError(err.response?.data?.error || 'SingPass login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (demoAccount: string) => {
    setError('');
    setLoading(true);

    try {
      // Demo login with predefined accounts
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL || window.location.origin}/api/auth/demo-login`,
        { account: demoAccount }
      );

      console.log('[Demo Login] Response:', response.data.data);
      localStorage.setItem('token', response.data.data.accessToken);
      localStorage.setItem('user', JSON.stringify(response.data.data.user));
      console.log('[Demo Login] Stored user:', response.data.data.user);

      onComplete();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Demo login failed');
    } finally {
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
            Sign in with SingPass
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* SingPass Login Button */}
        <button
          onClick={handleSingPassLogin}
          disabled={loading}
          className="w-full py-3 px-4 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mb-4 flex items-center justify-center gap-2"
        >
          {loading ? 'Redirecting to SingPass...' : '🔐 Sign in with SingPass'}
        </button>

        {/* Divider */}
        <div className="relative mb-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">Demo Accounts</span>
          </div>
        </div>

        {/* Demo Accounts */}
        <div className="space-y-2 mb-4">
          <button
            onClick={() => handleDemoLogin('sarah')}
            disabled={loading}
            className="w-full py-3 px-4 bg-orange-50 border-2 border-errandify-orange-300 text-errandify-orange-700 rounded-lg font-semibold hover:bg-orange-100 transition-colors disabled:opacity-50"
          >
            👩 Sarah (Asker/Doer)
          </button>
          <button
            onClick={() => handleDemoLogin('john')}
            disabled={loading}
            className="w-full py-3 px-4 bg-green-50 border-2 border-green-300 text-green-700 rounded-lg font-semibold hover:bg-green-100 transition-colors disabled:opacity-50"
          >
            👨 John (Asker/Doer)
          </button>
        </div>

        {/* Back Button */}
        <button
          onClick={onBack}
          disabled={loading}
          className="w-full py-2 px-4 border-2 border-gray-300 text-errandify-brown rounded-lg font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          Back
        </button>

        {/* Footer */}
        <p className="text-xs text-gray-500 text-center mt-4">
          Powered by SingPass
        </p>
      </div>
    </div>
  );
}
