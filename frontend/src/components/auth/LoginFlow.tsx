import { useState } from 'react';
import axios from 'axios';

interface LoginFlowProps {
  onComplete: () => void;
  onBack: () => void;
}

export default function LoginFlow({ onComplete, onBack }: LoginFlowProps) {
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'mobile' | 'otp'>('mobile');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [debugOtp, setDebugOtp] = useState('');

  const handleRequestOtp = async (e: React.FormEvent, phone?: string) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const phoneToUse = phone || mobile;

    try {
      await axios.post(
        `${import.meta.env.VITE_API_URL || window.location.origin}/api/auth/request-otp`,
        { mobile: phoneToUse }
      );

      if (!phone) setMobile(phoneToUse);

      // Fetch the debug OTP
      try {
        const debugResponse = await axios.get(
          `${import.meta.env.VITE_API_URL || window.location.origin}/api/auth/debug/otp/${phoneToUse}`
        );
        setDebugOtp(debugResponse.data.otp);
        console.log('📱 OTP for testing:', debugResponse.data.otp);
      } catch (debugErr) {
        console.log('Could not fetch debug OTP');
        setDebugOtp('');
      }

      setStep('otp');
      if (phone) setMobile(phone);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to request OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL || window.location.origin}/api/auth/verify-otp`,
        { mobile, otp }
      );

      localStorage.setItem('token', response.data.data.accessToken);
      localStorage.setItem('user', JSON.stringify(response.data.data.user));

      onComplete();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-errandify-bg flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-lg shadow-lg p-6">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-errandify-orange mb-2">
            Welcome Back
          </h2>
          <p className="text-sm text-gray-600">
            Sign in with your mobile number
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        {step === 'mobile' ? (
          <form onSubmit={handleRequestOtp} className="space-y-4">
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
                disabled={loading || !mobile.trim()}
                className="flex-1 py-3 px-4 bg-errandify-orange text-white rounded-lg font-semibold hover:bg-opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Sending...' : 'Send OTP'}
              </button>
            </div>

            {/* Quick Demo Accounts */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <p className="text-xs text-gray-600 text-center mb-3 font-semibold">
                🧪 Quick Demo Accounts (Can be both Asker & Doer):
              </p>
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={(e: any) => {
                    setMobile('98765432');
                    handleRequestOtp(e, '98765432');
                  }}
                  disabled={loading}
                  className="w-full py-2 px-3 bg-orange-50 border border-errandify-orange-300 text-errandify-orange-700 rounded-lg text-sm font-semibold hover:bg-orange-100 transition-colors disabled:opacity-50"
                >
                  👩 Sarah - (98765432)
                </button>
                <button
                  type="button"
                  onClick={(e: any) => {
                    setMobile('87654321');
                    handleRequestOtp(e, '87654321');
                  }}
                  disabled={loading}
                  className="w-full py-2 px-3 bg-green-50 border border-green-300 text-green-700 rounded-lg text-sm font-semibold hover:bg-green-100 transition-colors disabled:opacity-50"
                >
                  👨 John - (87654321)
                </button>
              </div>
              <p className="text-xs text-gray-500 text-center mt-3 italic">
                💡 Switch roles anytime from Profile → Role Toggle (top)
              </p>
            </div>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <p className="text-sm text-gray-600">
              Enter the OTP sent to <span className="font-semibold">{mobile}</span>
            </p>

            <div>
              <label className="block text-sm font-medium text-errandify-brown mb-1">
                OTP Code
              </label>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="e.g. 123456"
                maxLength={6}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-errandify-orange text-center text-xl tracking-widest"
              />
            </div>

            {debugOtp && (
              <div className="bg-orange-50 p-3 rounded-lg border border-errandify-orange-200">
                <p className="text-xs text-gray-600 text-center">
                  💡 Demo: Use OTP <span className="font-mono font-bold text-lg text-errandify-orange-600">{debugOtp}</span>
                </p>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => {
                  setStep('mobile');
                  setOtp('');
                }}
                className="flex-1 py-3 px-4 border-2 border-gray-300 text-errandify-brown rounded-lg font-semibold hover:bg-gray-50 transition-colors"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={loading || otp.length !== 6}
                className="flex-1 py-3 px-4 bg-errandify-orange text-white rounded-lg font-semibold hover:bg-opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Verifying...' : 'Verify'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
