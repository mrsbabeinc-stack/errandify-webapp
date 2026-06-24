import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';

interface SingPassCallbackPageProps {
  onLogin: (role: 'asker' | 'doer') => void;
}

export default function SingPassCallbackPage({ onLogin }: SingPassCallbackPageProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState('');
  const [message, setMessage] = useState('Processing SingPass login...');
  const [loading, setLoading] = useState(true);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get authorization code from SingPass redirect
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const error_param = searchParams.get('error');

        // Check for errors from SingPass
        if (error_param) {
          setError('SingPass verification failed');
          setLoading(false);
          return;
        }

        if (!code) {
          setError('No authorization code received from SingPass');
          setLoading(false);
          return;
        }

        // Verify state parameter (CSRF protection)
        const storedState = sessionStorage.getItem('singpass_state');
        if (state !== storedState) {
          setError('Security verification failed');
          setLoading(false);
          return;
        }

        setMessage('Exchanging authorization code...');

        // Exchange code for token with backend
        const response = await axios.post(
          `${API_URL}/api/auth/singpass-callback`,
          { code }
        );

        if (response.data.success) {
          setMessage('Verifying identity...');

          const singpassData = response.data.data;
          const mode = sessionStorage.getItem('singpass_mode') || 'signin';

          // Check if user exists or create new account
          if (mode === 'signup') {
            setMessage('Creating account...');
            try {
              // Create new account with SingPass data
              const signupResponse = await axios.post(
                `${API_URL}/api/auth/signup`,
                {
                  nric: singpassData.sub,
                  displayName: singpassData.name,
                  email: singpassData.email,
                  phone: singpassData.phone_number,
                  role: 'asker',
                  singpassVerified: true,
                }
              );

              if (signupResponse.data.success) {
                localStorage.setItem('token', signupResponse.data.data.token);
                localStorage.setItem('user', JSON.stringify(signupResponse.data.data.user));
                onLogin(signupResponse.data.data.user.role || 'asker');
                setMessage('Account created successfully!');
                setLoading(false);
                setTimeout(() => navigate('/home'), 500);
              }
            } catch (signupErr: any) {
              // If user already exists (409), just log them in
              if (signupErr.response?.status === 409) {
                setMessage('Account already exists, signing in...');
                localStorage.setItem('token', 'mock_token_' + Date.now());
                localStorage.setItem('user', JSON.stringify({
                  id: 1,
                  nric_hash: singpassData.sub,
                  display_name: singpassData.name,
                  email: singpassData.email,
                  mobile: singpassData.phone_number,
                  role: 'asker',
                  singpass_verified: true,
                }));
                onLogin('asker');
                setMessage('Login successful!');
                setLoading(false);
                setTimeout(() => navigate('/home'), 500);
              } else {
                throw signupErr;
              }
            }
          } else {
            // Sign in existing user
            setMessage('Signing in...');
            localStorage.setItem('token', response.data.data.token || 'mock_token_' + Date.now());
            localStorage.setItem('user', JSON.stringify({
              id: 1,
              nric_hash: singpassData.sub,
              display_name: singpassData.name,
              email: singpassData.email,
              mobile: singpassData.phone_number,
              role: 'asker',
              singpass_verified: true,
            }));
            onLogin('asker');
            setMessage('Login successful!');
            setLoading(false);
            setTimeout(() => navigate('/home'), 500);
          }
        } else {
          setError('Failed to authenticate with SingPass');
          setLoading(false);
        }
      } catch (err: any) {
        console.error('Callback error:', err);
        setError('SingPass verification failed');
        setLoading(false);
      } finally {
        // Clean up session storage
        sessionStorage.removeItem('singpass_state');
        sessionStorage.removeItem('singpass_nonce');
        sessionStorage.removeItem('singpass_mode');
      }
    };

    handleCallback();
  }, [searchParams, navigate, onLogin, API_URL]);

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-12 text-center">
        {error ? (
          <>
            {/* Error Icon */}
            <div className="text-6xl mb-6 flex justify-center">
              <svg className="w-20 h-20 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>

            {/* Error Heading */}
            <h1 className="text-4xl font-bold text-gray-900 mb-3">
              Authentication Failed
            </h1>

            {/* Error Message */}
            <p className="text-xl text-red-500 font-semibold mb-8">
              {error}
            </p>

            {/* Back Button */}
            <button
              onClick={() => window.location.href = '/auth'}
              className="w-full py-4 px-6 bg-errandify-orange text-white rounded-xl font-bold text-lg hover:bg-orange-600 transition-colors"
            >
              Back to Sign In
            </button>
          </>
        ) : (
          <>
            {/* Loading Icon */}
            <div className="text-6xl mb-6 flex justify-center">
              <div className="animate-spin">⏳</div>
            </div>

            {/* Loading Heading */}
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Completing Authentication
            </h1>

            {/* Loading Message */}
            <p className="text-gray-600 mb-8">{message}</p>

            {/* Loading Dots */}
            <div className="flex gap-2 justify-center">
              <div className="w-3 h-3 bg-errandify-orange rounded-full animate-bounce" />
              <div className="w-3 h-3 bg-errandify-orange rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
              <div className="w-3 h-3 bg-errandify-orange rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
