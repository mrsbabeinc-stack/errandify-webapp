import React, { useState, useEffect } from 'react';
import axios from 'axios';
import WarmMessage from './WarmMessage';

interface AccountPauseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStatusChange?: (isPaused: boolean) => void;
}

export default function AccountPauseModal({ isOpen, onClose, onStatusChange }: AccountPauseModalProps) {
  const [isPaused, setIsPaused] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      checkAccountStatus();
    }
  }, [isOpen]);

  const checkAccountStatus = async () => {
    try {
      const response = await axios.get('/api/safety/account-status', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setIsPaused(response.data.data.isPaused);
      setLoading(false);
    } catch (err) {
      console.error('Error checking account status:', err);
      setLoading(false);
    }
  };

  const handlePauseAccount = async () => {
    setActionLoading(true);
    setError('');

    try {
      await axios.post('/api/safety/pause-account', {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });

      setIsPaused(true);
      setSuccess(true);
      onStatusChange?.(true);

      setTimeout(() => {
        handleClose();
      }, 2000);
    } catch (err) {
      console.error('Error pausing account:', err);
      setError('Failed to pause account. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleResumeAccount = async () => {
    setActionLoading(true);
    setError('');

    try {
      await axios.post('/api/safety/resume-account', {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });

      setIsPaused(false);
      onStatusChange?.(false);
    } catch (err) {
      console.error('Error resuming account:', err);
      setError('Failed to resume account. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleClose = () => {
    if (!actionLoading) {
      setShowConfirm(false);
      setSuccess(false);
      setError('');
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-8 py-6">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🛡️</span>
            <div>
              <h2 className="text-2xl font-bold">Account Pause - Safety Feature</h2>
              <p className="text-blue-100 text-sm mt-1">Temporarily hide your profile when you need to</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-8 py-8">
          <WarmMessage
            isOpen={!!error}
            type="error"
            title="Something went wrong"
            message={error}
            onClose={() => setError('')}
            buttonLabel="Dismiss"
          />

          {success && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <p className="text-green-800 font-medium mb-2">✅ Account Paused</p>
              <p className="text-green-700 text-sm">
                Your profile is now hidden. You can resume anytime in Settings.
              </p>
            </div>
          )}

          {loading ? (
            <div className="text-center py-6">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-3"></div>
              <p className="text-gray-600">Loading account status...</p>
            </div>
          ) : (
            <>
              {/* Status Display */}
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-900">Current Status</h3>
                  <span
                    className={`px-4 py-2 rounded-full font-bold text-white ${
                      isPaused ? 'bg-red-500' : 'bg-green-500'
                    }`}
                  >
                    {isPaused ? '⏸️ PAUSED' : '✅ ACTIVE'}
                  </span>
                </div>
                <p className="text-gray-700">
                  {isPaused
                    ? 'Your profile is currently hidden from other users.'
                    : 'Your profile is visible to others.'}
                </p>
              </div>

              {!isPaused && (
                <>
                  {/* Pause Info */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
                    <h3 className="text-lg font-bold text-blue-900 mb-4">Why pause your account?</h3>
                    <div className="space-y-2 text-blue-800 mb-6">
                      <label className="flex items-center gap-3 p-3 border border-blue-200 rounded-lg cursor-pointer hover:bg-white">
                        <input type="checkbox" className="w-4 h-4" disabled />
                        <span>I need to step back from the app</span>
                      </label>
                      <label className="flex items-center gap-3 p-3 border border-blue-200 rounded-lg cursor-pointer hover:bg-white">
                        <input type="checkbox" className="w-4 h-4" disabled />
                        <span>I'm unsafe and need to hide</span>
                      </label>
                      <label className="flex items-center gap-3 p-3 border border-blue-200 rounded-lg cursor-pointer hover:bg-white">
                        <input type="checkbox" className="w-4 h-4" disabled />
                        <span>Someone knows my account & I'm afraid</span>
                      </label>
                      <label className="flex items-center gap-3 p-3 border border-blue-200 rounded-lg cursor-pointer hover:bg-white">
                        <input type="checkbox" className="w-4 h-4" disabled />
                        <span>I'm in a forced work situation</span>
                      </label>
                    </div>
                  </div>

                  {/* What Happens */}
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-6">
                    <h3 className="font-bold text-gray-900 mb-4">When you pause your account:</h3>
                    <ul className="space-y-3">
                      <li className="flex items-center gap-3 text-gray-700">
                        <span className="text-xl">✓</span>
                        <span>People can't message you</span>
                      </li>
                      <li className="flex items-center gap-3 text-gray-700">
                        <span className="text-xl">✓</span>
                        <span>Your jobs disappear from browse</span>
                      </li>
                      <li className="flex items-center gap-3 text-gray-700">
                        <span className="text-xl">✓</span>
                        <span>Your profile is hidden</span>
                      </li>
                      <li className="flex items-center gap-3 text-gray-700">
                        <span className="text-xl">✓</span>
                        <span>You keep all your data</span>
                      </li>
                      <li className="flex items-center gap-3 text-gray-700">
                        <span className="text-xl">✓</span>
                        <span>You can un-pause anytime</span>
                      </li>
                    </ul>
                  </div>

                  {/* Privacy Assurance */}
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                    <p className="text-sm text-green-800">
                      <strong>💡 Privacy Guaranteed:</strong> No one will know you paused your account. It won't show on your profile.
                    </p>
                  </div>

                  {/* Help Section */}
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
                    <h4 className="font-bold text-amber-900 mb-2">📞 If you need help right now:</h4>
                    <a href="tel:+6518008388877" className="text-lg font-bold text-red-600 hover:text-red-700">
                      Anti-Trafficking Hotline: +65 1800-838-8877
                    </a>
                    <p className="text-xs text-amber-700 mt-2">(24/7, confidential, free)</p>
                  </div>

                  {/* Action Buttons */}
                  {!showConfirm ? (
                    <div className="flex gap-3">
                      <button
                        onClick={handleClose}
                        className="flex-1 px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-900 font-bold rounded-lg transition"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => setShowConfirm(true)}
                        className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition"
                      >
                        🛡️ Pause My Account
                      </button>
                    </div>
                  ) : (
                    <div>
                      <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-4 mb-4">
                        <p className="text-yellow-900 font-bold mb-2">⚠️ Confirm Account Pause</p>
                        <p className="text-yellow-800 text-sm">
                          Are you sure? Your profile will be hidden from everyone. You can un-pause anytime.
                        </p>
                      </div>
                      <div className="flex gap-3">
                        <button
                          onClick={() => setShowConfirm(false)}
                          disabled={actionLoading}
                          className="flex-1 px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-900 font-bold rounded-lg transition disabled:opacity-50"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handlePauseAccount}
                          disabled={actionLoading}
                          className="flex-1 px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition disabled:opacity-50"
                        >
                          {actionLoading ? 'Pausing...' : 'Yes, Pause My Account'}
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}

              {isPaused && (
                <>
                  {/* Resume Info */}
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 mb-6">
                    <h3 className="text-lg font-bold text-amber-900 mb-3">Your account is paused</h3>
                    <p className="text-amber-800 mb-4">
                      Your profile is currently hidden from other users. When you're ready to come back, you can resume your account below.
                    </p>
                    <div className="space-y-2 text-sm text-amber-700">
                      <p>• No messages are coming in</p>
                      <p>• Your jobs are not visible</p>
                      <p>• Your profile is private</p>
                      <p>• All your data is safe</p>
                    </div>
                  </div>

                  {/* Help Section */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                    <h4 className="font-bold text-blue-900 mb-2">📞 Need support?</h4>
                    <a href="tel:+6518008388877" className="text-lg font-bold text-red-600 hover:text-red-700">
                      Anti-Trafficking Hotline: +65 1800-838-8877
                    </a>
                    <p className="text-xs text-blue-700 mt-2">(24/7, confidential, free)</p>
                  </div>

                  {/* Resume Button */}
                  <div className="flex gap-3">
                    <button
                      onClick={handleClose}
                      className="flex-1 px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-900 font-bold rounded-lg transition"
                    >
                      Close
                    </button>
                    <button
                      onClick={handleResumeAccount}
                      disabled={actionLoading}
                      className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition disabled:opacity-50"
                    >
                      {actionLoading ? 'Resuming...' : '✅ Resume Account'}
                    </button>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
