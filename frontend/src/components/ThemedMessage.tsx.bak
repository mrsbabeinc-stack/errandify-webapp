import React from 'react';

type MessageType = 'error' | 'success' | 'warning' | 'info';

interface ThemedMessageProps {
  type: MessageType;
  message: string;
  title?: string;
  onClose?: () => void;
  className?: string;
}

/**
 * Themed message component using Errandify brand colors
 * Colors:
 * - errandify-orange: #FF7A29 (primary)
 * - errandify-brown: #4A3221 (secondary)
 * - errandify-bg: #FFFAF6 (background)
 */
export default function ThemedMessage({
  type,
  message,
  title,
  onClose,
  className = '',
}: ThemedMessageProps) {
  const styles = {
    error: {
      bg: 'bg-orange-50',
      border: 'border-orange-200',
      text: 'text-orange-800',
      icon: '⚠',
    },
    success: {
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
      text: 'text-emerald-800',
      icon: '✓',
    },
    warning: {
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      text: 'text-amber-800',
      icon: '!',
    },
    info: {
      bg: 'bg-orange-50',
      border: 'border-orange-200',
      text: 'text-orange-800',
      icon: 'i',
    },
  };

  const style = styles[type];

  return (
    <div className={`${style.bg} border ${style.border} ${style.text} p-4 rounded-lg ${className}`}>
      <div className="flex items-start gap-3">
        <div className="text-lg font-bold pt-0.5">{style.icon}</div>
        <div className="flex-1">
          {title && <p className="font-semibold mb-1">{title}</p>}
          <p className="text-sm leading-relaxed">{message}</p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-lg font-bold hover:opacity-70 transition-opacity"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Inline message box - smaller version for form validation
 */
export function InlineMessage({
  type,
  message,
  className = '',
}: Omit<ThemedMessageProps, 'title' | 'onClose'>) {
  const styles = {
    error: 'bg-orange-50 border border-orange-200 text-orange-700',
    success: 'bg-emerald-50 border border-emerald-200 text-emerald-700',
    warning: 'bg-amber-50 border border-amber-200 text-amber-700',
    info: 'bg-orange-50 border border-orange-200 text-orange-700',
  };

  return (
    <p className={`text-xs ${styles[type]} p-2 rounded ${className}`}>{message}</p>
  );
}

/**
 * Alert box - larger message with heading
 */
export function AlertBox({
  type,
  title,
  message,
  onClose,
  className = '',
}: ThemedMessageProps) {
  const bgGradients = {
    error: 'from-orange-50 to-orange-25',
    success: 'from-emerald-50 to-emerald-25',
    warning: 'from-amber-50 to-amber-25',
    info: 'from-orange-50 to-orange-25',
  };

  const borders = {
    error: 'border-l-4 border-l-orange-400',
    success: 'border-l-4 border-l-emerald-400',
    warning: 'border-l-4 border-l-amber-400',
    info: 'border-l-4 border-l-orange-400',
  };

  const texts = {
    error: 'text-orange-900',
    success: 'text-emerald-900',
    warning: 'text-amber-900',
    info: 'text-orange-900',
  };

  return (
    <div
      className={`bg-gradient-to-r ${bgGradients[type]} ${borders[type]} rounded-lg p-4 ${className}`}
    >
      <div className="flex items-start gap-3">
        <div className={`text-lg font-bold ${texts[type]}`}>
          {type === 'error' && 'Warning'}
          {type === 'success' && 'Success'}
          {type === 'warning' && 'Attention'}
          {type === 'info' && 'Info'}
        </div>
        <div className="flex-1">
          {title && <p className={`font-semibold ${texts[type]}`}>{title}</p>}
          <p className={`text-sm leading-relaxed ${texts[type]}`}>{message}</p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className={`text-lg font-bold ${texts[type]} hover:opacity-70 transition-opacity`}
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
}
