interface WarmMessageProps {
  isOpen: boolean;
  title?: string;
  message?: string;
  onClose: () => void;
  buttonLabel?: string;
  type?: 'success' | 'error' | 'info' | 'warning';
}

export default function WarmMessage({
  isOpen,
  title,
  message,
  onClose,
  buttonLabel = 'Got it',
  type = 'info',
}: WarmMessageProps) {
  if (!isOpen) return null;

  const typeConfig = {
    success: {
      bg: 'bg-white',
      borderLeft: 'border-l-4 border-l-emerald-500',
      textColor: 'text-slate-800',
      buttonColor: 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200',
    },
    error: {
      bg: 'bg-white',
      borderLeft: 'border-l-4 border-l-orange-500',
      textColor: 'text-slate-800',
      buttonColor: 'bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200',
    },
    warning: {
      bg: 'bg-white',
      borderLeft: 'border-l-4 border-l-amber-500',
      textColor: 'text-slate-800',
      buttonColor: 'bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200',
    },
    info: {
      bg: 'bg-white',
      borderLeft: 'border-l-4 border-l-blue-500',
      textColor: 'text-slate-800',
      buttonColor: 'bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200',
    },
  };

  const config = typeConfig[type];

  return (
    <div className="fixed inset-0 bg-slate-900 bg-opacity-25 flex items-center justify-center z-50 p-4">
      <div className={`${config.bg} ${config.borderLeft} rounded-xl shadow-lg max-w-xs w-full`}>
        {/* Compact Content */}
        <div className="p-4 sm:p-5">
          {/* Bold Title - No Punctuation */}
          {title && (
            <h3 className={`${config.textColor} text-sm sm:text-base font-bold mb-2`}>
              {title}
            </h3>
          )}

          {/* Message Text - With Punctuation */}
          {message && (
            <p className={`${config.textColor} text-sm leading-relaxed ${title ? 'opacity-90' : ''}`}>
              {message.endsWith('.') ? message : `${message}.`}
            </p>
          )}
        </div>

        {/* Single Button */}
        <div className="px-4 sm:px-5 pb-4 sm:pb-5">
          <button
            onClick={onClose}
            className={`w-full ${config.buttonColor} font-semibold py-2.5 rounded-lg text-sm transition-all hover:shadow-md`}
          >
            {buttonLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
