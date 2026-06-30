interface WarmMessageProps {
  isOpen: boolean;
  title: string;
  message?: string;
  onClose: () => void;
  buttonLabel?: string;
  type?: 'success' | 'error' | 'info' | 'warning';
  action?: {
    label: string;
    onClick: () => void;
  };
}

export default function WarmMessage({
  isOpen,
  title,
  message,
  onClose,
  buttonLabel = 'Got it',
  type = 'info',
  action,
}: WarmMessageProps) {
  if (!isOpen) return null;

  const typeConfig = {
    success: {
      bg: 'bg-white',
      borderLeft: 'border-l-4 border-l-emerald-500',
      titleColor: 'text-slate-900',
      messageColor: 'text-slate-700',
      buttonColor: 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200',
      accentColor: 'text-emerald-600',
    },
    error: {
      bg: 'bg-white',
      borderLeft: 'border-l-4 border-l-orange-500',
      titleColor: 'text-slate-900',
      messageColor: 'text-slate-700',
      buttonColor: 'bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200',
      accentColor: 'text-orange-600',
    },
    warning: {
      bg: 'bg-white',
      borderLeft: 'border-l-4 border-l-amber-500',
      titleColor: 'text-slate-900',
      messageColor: 'text-slate-700',
      buttonColor: 'bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200',
      accentColor: 'text-amber-600',
    },
    info: {
      bg: 'bg-white',
      borderLeft: 'border-l-4 border-l-blue-500',
      titleColor: 'text-slate-900',
      messageColor: 'text-slate-700',
      buttonColor: 'bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200',
      accentColor: 'text-blue-600',
    },
  };

  const config = typeConfig[type];

  return (
    <div className="fixed inset-0 bg-slate-900 bg-opacity-25 flex items-center justify-center z-50 p-4">
      <div className={`${config.bg} ${config.borderLeft} rounded-2xl shadow-2xl max-w-sm w-full transform transition-all`}>
        {/* Content */}
        <div className="p-6 sm:p-8">
          <h2 className={`${config.titleColor} font-bold text-lg sm:text-xl mb-4 leading-snug`}>{title}</h2>
          {message && (
            <p className={`${config.messageColor} text-sm sm:text-base leading-relaxed mb-6`}>
              {message.endsWith('.') ? message : `${message}.`}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="px-6 sm:px-8 pb-6 sm:pb-8 flex gap-3">
          {action && (
            <button
              onClick={action.onClick}
              className={`flex-1 ${config.buttonColor} font-semibold py-3 rounded-lg text-sm sm:text-base transition-all hover:shadow-md`}
            >
              {action.label}
            </button>
          )}
          <button
            onClick={onClose}
            className={`flex-1 ${config.buttonColor} font-semibold py-3 rounded-lg text-sm sm:text-base transition-all hover:shadow-md`}
          >
            {buttonLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
