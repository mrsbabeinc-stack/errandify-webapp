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
          setError(`SingPass error: ${error_param}`);
          return;
        }

        if (!code) {
          setError('No authorization code received from SingPass');
          return;
        }

        // Verify state parameter (CSRF protection)
        const storedState = sessionStorage.getItem('singpass_state');
        if (state !== storedState) {
          setError('State parameter mismatch - possible CSRF attack');
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
              setTimeout(() => navigate('/home'), 1000);
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
            setTimeout(() => navigate('/home'), 1000);
          }
        } else {
          setError('Failed to authenticate with SingPass');
        }
      } catch (err: any) {
        console.error('Callback error:', err);
        setError(
          err.response?.data?.error ||
          'Authentication failed. Please try again.'
        );
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
    <div className="min-h-screen bg-gradient-to-br from-errandify-orange-50 to-orange-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 text-center">
        {error ? (
          <>
            <div className="text-5xl mb-4">❌</div>
            <h1 className="text-2xl font-bold text-gray-800 mb-4">
              Authentication Failed
            </h1>
            <p className="text-red-600 mb-6">{error}</p>
            <button
              onClick={() => window.location.href = '/auth'}
              className="w-full py-3 px-4 bg-errandify-orange text-white rounded-lg font-semibold hover:bg-orange-600 transition-colors"
            >
              Back to Sign In
            </button>
          </>
        ) : (
          <>
            <div className="text-5xl mb-4 animate-spin">⏳</div>
            <h1 className="text-2xl font-bold text-gray-800 mb-4">
              Completing Authentication
            </h1>
            <p className="text-gray-600">{message}</p>
            <div className="mt-6 flex gap-1 justify-center">
              <div className="w-2 h-2 bg-errandify-orange rounded-full animate-bounce" />
              <div className="w-2 h-2 bg-errandify-orange rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
              <div className="w-2 h-2 bg-errandify-orange rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
