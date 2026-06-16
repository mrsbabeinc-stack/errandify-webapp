import { useState } from 'react';

interface LoginPageProps {
  onLogin: (role: 'asker' | 'doer') => void;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [selectedRole, setSelectedRole] = useState<'asker' | 'doer'>('asker');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement actual authentication (mock or SingPass)
    if (email.trim()) {
      onLogin(selectedRole);
    }
  };

  return (
    <div className="min-h-screen bg-errandify-bg flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <h1 className="text-4xl font-bold text-errandify-orange mb-2 text-center">
          Errandify
        </h1>
        <p className="text-center text-errandify-brown mb-8">
          Singapore's Community Task Platform
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Email Input */}
          <div>
            <label className="block text-sm font-medium text-errandify-brown mb-2">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-errandify-orange"
            />
          </div>

          {/* Role Selection */}
          <div>
            <label className="block text-sm font-medium text-errandify-brown mb-3">
              I want to:
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setSelectedRole('asker')}
                className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${
                  selectedRole === 'asker'
                    ? 'bg-errandify-orange text-white'
                    : 'bg-gray-200 text-errandify-brown hover:bg-gray-300'
                }`}
              >
                Ask for Help
              </button>
              <button
                type="button"
                onClick={() => setSelectedRole('doer')}
                className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${
                  selectedRole === 'doer'
                    ? 'bg-errandify-orange text-white'
                    : 'bg-gray-200 text-errandify-brown hover:bg-gray-300'
                }`}
              >
                Help Others
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!email.trim()}
            className="w-full bg-errandify-orange text-white py-3 rounded-lg font-bold hover:bg-opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Continue
          </button>
        </form>

        {/* TODO: Add SingPass button when USE_SINGPASS is true */}
        <div className="mt-6 pt-6 border-t border-gray-300">
          <p className="text-center text-xs text-gray-600">
            Mock login for now. SingPass integration coming soon.
          </p>
        </div>
      </div>
    </div>
  );
}
