interface ErrorModalProps {
  isOpen: boolean;
  title: string;
  message?: string;
  icon?: string;
  onClose: () => void;
  buttonLabel?: string;
  subtitle?: string;
}

export default function ErrorModal({
  isOpen,
  title,
  message,
  icon = '⚠️',
  onClose,
  buttonLabel = 'Got it',
  subtitle,
}: ErrorModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-red-50 to-white border-2 border-red-400 rounded-2xl shadow-lg max-w-xs w-full">
        {/* Header with icon */}
        <div className="flex justify-center pt-4">
          <div className="text-4xl animate-bounce">{icon}</div>
        </div>

        {/* Content */}
        <div className="px-4 py-3 text-center">
          {subtitle && <p className="text-xs text-red-600 font-semibold mb-1">{subtitle}</p>}
          <h2 className="text-lg font-bold text-red-800">{title}</h2>
          {message && <p className="text-red-700 text-xs mt-1">{message}</p>}
        </div>

        {/* Button */}
        <div className="px-4 pb-4">
          <button
            onClick={onClose}
            className="w-full bg-gradient-to-r from-red-500 to-pink-500 text-white font-bold py-2 rounded-lg hover:from-red-600 hover:to-pink-600 transition-all text-sm"
          >
            {buttonLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
