import { useState } from 'react';

interface SuccessModalProps {
  isOpen: boolean;
  title: string;
  message?: string;
  icon?: string;
  onClose: () => void;
  buttonLabel?: string;
  subtitle?: string;
}

export default function SuccessModal({
  isOpen,
  title,
  message,
  icon = '✨',
  onClose,
  buttonLabel = 'Perfect!',
  subtitle,
}: SuccessModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-green-50 to-white border-2 border-green-400 rounded-2xl shadow-lg max-w-xs w-full">
        {/* Header with icon */}
        <div className="flex justify-center pt-4">
          <div className="text-4xl animate-bounce">{icon}</div>
        </div>

        {/* Content */}
        <div className="px-4 py-3 text-center">
          {subtitle && <p className="text-xs text-green-600 font-semibold mb-1">{subtitle}</p>}
          <h2 className="text-lg font-bold text-green-800">{title}</h2>
          {message && <p className="text-green-700 text-xs mt-1">{message}</p>}
        </div>

        {/* Button */}
        <div className="px-4 pb-4">
          <button
            onClick={onClose}
            className="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold py-2 rounded-lg hover:from-green-600 hover:to-emerald-600 transition-all text-sm"
          >
            {buttonLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
