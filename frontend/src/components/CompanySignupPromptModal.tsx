import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface CompanySignupPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRegisterClick?: () => void;
}

export default function CompanySignupPromptModal({
  isOpen,
  onClose,
  onRegisterClick
}: CompanySignupPromptModalProps) {
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(false);

  if (!isOpen || dismissed) return null;

  const handleRegister = () => {
    localStorage.setItem('company_signup_dismissed', 'false');
    if (onRegisterClick) {
      onRegisterClick();
    }
    navigate('/company/register');
    onClose();
  };

  const handleSkip = () => {
    localStorage.setItem('company_signup_dismissed', 'true');
    setDismissed(true);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-8 shadow-2xl animate-slide-up">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-5xl mb-4">🚀</div>
          <h2 className="text-2xl font-bold text-errandify-brown mb-2">
            Ready to Grow Your Business?
          </h2>
          <p className="text-gray-600 text-sm">
            Register your company to unlock powerful team management features
          </p>
        </div>

        {/* Benefits */}
        <div className="space-y-3 mb-8">
          <div className="flex items-start gap-3">
            <span className="text-xl flex-shrink-0">📋</span>
            <div>
              <p className="font-semibold text-errandify-brown">Post Bulk Tasks</p>
              <p className="text-xs text-gray-600">Create and manage multiple errands at once</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-xl flex-shrink-0">👥</span>
            <div>
              <p className="font-semibold text-errandify-brown">Manage Teams</p>
              <p className="text-xs text-gray-600">Tag and manage employee assignments</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-xl flex-shrink-0">⭐</span>
            <div>
              <p className="font-semibold text-errandify-brown">Company Ratings</p>
              <p className="text-xs text-gray-600">Build your company reputation</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-xl flex-shrink-0">📊</span>
            <div>
              <p className="font-semibold text-errandify-brown">Analytics Dashboard</p>
              <p className="text-xs text-gray-600">Track performance and earnings</p>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-gray-200 mb-8"></div>

        {/* Note */}
        <p className="text-xs text-gray-500 mb-6 text-center">
          You can always register later from your account settings
        </p>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleRegister}
            className="flex-1 bg-errandify-orange text-white py-3 rounded-lg font-bold hover:bg-opacity-90 transition-all shadow-md hover:shadow-lg"
          >
            Register Company
          </button>
          <button
            onClick={handleSkip}
            className="flex-1 border-2 border-gray-300 text-gray-700 py-3 rounded-lg font-bold hover:bg-gray-50 transition-all"
          >
            Skip for Now
          </button>
        </div>
      </div>

      <style>{`
        @keyframes slide-up {
          from {
            transform: translateY(20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
