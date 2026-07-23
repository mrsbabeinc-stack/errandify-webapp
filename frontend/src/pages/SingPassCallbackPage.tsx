import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { getStoredReferral, clearStoredReferral } from '../utils/referralCapture';

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
        const storedState = localStorage.getItem('singpass_state');
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
          const mode = localStorage.getItem('singpass_mode') || 'signin';

          // Check if user exists or create new account
          if (mode === 'signup') {
            setMessage('Creating account...');
            try {
              // Whoever invited them, picked up when they first arrived and
              // held across the Singpass redirect. POST /api/auth/signup has
              // always accepted `ref` — it sets referred_by, writes
              // referral_tracking and pays the referrer's join bonus — but
              // nothing ever sent it, so no referral has ever been credited.
              const referralCode = getStoredReferral();

              const signupResponse = await axios.post(
                `${API_URL}/api/auth/signup`,
                {
                  nric: singpassData.sub,
                  displayName: singpassData.name,
                  email: singpassData.email,
                  phone: singpassData.phone_number,
                  role: 'asker',
                  gender: singpassData.gender,
                  singpassVerified: true,
                  ref: referralCode || undefined,
                }
              );

              if (signupResponse.data.success) {
                // accessToken, not token. The server has always returned
                // `accessToken`; reading `.token` stored the string
                // "undefined" and every authenticated request straight after
                // signup failed — the first thing a new arrival hit.
                const { accessToken, user } = signupResponse.data.data;
                localStorage.setItem('token', accessToken);
                localStorage.setItem('user', JSON.stringify(user));

                // Only once the account exists, so a failed signup leaves the
                // code in place for the retry.
                clearStoredReferral();

                onLogin(user.role || 'asker');
                setMessage('Account created successfully!');
                setLoading(false);
                // After SingPass + signup: Go to background verification form (new flow)
                setTimeout(() => navigate('/auth/verification'), 500);
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
        // Clean up local storage
        localStorage.removeItem('singpass_state');
        localStorage.removeItem('singpass_nonce');
        localStorage.removeItem('singpass_mode');
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
