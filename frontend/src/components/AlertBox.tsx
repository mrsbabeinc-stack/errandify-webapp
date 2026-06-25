interface AlertBoxProps {
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  icon?: string;
  onClose?: () => void;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export default function AlertBox({
  type,
  title,
  message,
  icon,
  onClose,
  action,
  className = '',
}: AlertBoxProps) {
  const typeConfig = {
    success: {
      bg: 'from-green-50 to-emerald-50',
      border: 'border-green-400',
      title: 'text-green-800',
      message: 'text-green-700',
      button: 'bg-green-600 hover:bg-green-700',
      icon: icon || '✨',
    },
    error: {
      bg: 'from-red-50 to-pink-50',
      border: 'border-red-400',
      title: 'text-red-800',
      message: 'text-red-700',
      button: 'bg-red-600 hover:bg-red-700',
      icon: icon || '⚠️',
    },
    warning: {
      bg: 'from-yellow-50 to-amber-50',
      border: 'border-yellow-400',
      title: 'text-yellow-800',
      message: 'text-yellow-700',
      button: 'bg-yellow-600 hover:bg-yellow-700',
      icon: icon || '⚡',
    },
    info: {
      bg: 'from-blue-50 to-cyan-50',
      border: 'border-blue-400',
      title: 'text-blue-800',
      message: 'text-blue-700',
      button: 'bg-blue-600 hover:bg-blue-700',
      icon: icon || 'ℹ️',
    },
  };

  const config = typeConfig[type];

  return (
    <div
      className={`bg-gradient-to-r ${config.bg} border-2 ${config.border} rounded-2xl p-4 flex items-start gap-4 ${className}`}
    >
      <span className="text-3xl flex-shrink-0 animate-bounce">{config.icon}</span>
      <div className="flex-1 min-w-0">
        <p className={`font-bold text-lg ${config.title}`}>{title}</p>
        {message && <p className={`text-sm mt-1 ${config.message}`}>{message}</p>}
        {action && (
          <button
            onClick={action.onClick}
            className={`${config.button} text-white font-bold px-4 py-2 rounded-lg mt-3 text-sm transition-colors`}
          >
            {action.label}
          </button>
        )}
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="flex-shrink-0 text-gray-400 hover:text-gray-600 text-xl font-bold"
        >
          ✕
        </button>
      )}
    </div>
  );
}
