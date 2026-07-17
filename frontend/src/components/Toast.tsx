import React, { useState } from 'react';
import { useNotificationToast } from '../context/NotificationContext';

interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

/**
 * Legacy Toast hook - maintained for backward compatibility
 * Redirects to NotificationContext for global state management
 */
export const useToast = () => {
  const { addToast } = useNotificationToast();

  const showToast = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    const typeMap = {
      success: '✓',
      error: '✕',
      warning: '⚠',
      info: 'ℹ',
    };

    addToast({
      title: type.charAt(0).toUpperCase() + type.slice(1),
      body: message,
      type: type as any,
      duration: 7000,
      icon: typeMap[type],
    });
  };

  const removeToast = (id: string) => {
    // Handled by NotificationContext
  };

  // Return legacy structure for compatibility
  const [toasts] = useState<ToastMessage[]>([]);
  return { toasts, showToast, removeToast };
};

/**
 * Legacy Toast Container - maintained for backward compatibility
 * This is now redundant since NotificationToastContainer handles display
 */
export const ToastContainer: React.FC<{ toasts: ToastMessage[], onClose?: (id: string) => void }> = ({ toasts, onClose }) => {
  return (
    <div style={{
      position: 'fixed',
      top: '80px',
      right: '20px',
      zIndex: 500,
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
    }}>
      {toasts.map(toast => {
        const bgColor = {
          success: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
          error: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
          warning: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
          info: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
        }[toast.type];

        const borderColor = {
          success: '#10b981',
          error: '#ef4444',
          warning: '#f59e0b',
          info: '#3b82f6',
        }[toast.type];

        const textColor = {
          success: '#047857',
          error: '#991b1b',
          warning: '#92400e',
          info: '#1e40af',
        }[toast.type];

        const icon = {
          success: '✓',
          error: '✕',
          warning: '⚠',
          info: 'ℹ',
        }[toast.type];

        return (
          <div
            key={toast.id}
            style={{
              background: bgColor,
              color: textColor,
              padding: '14px 16px',
              borderRadius: '8px',
              border: `2px solid ${borderColor}`,
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              maxWidth: '420px',
              wordBreak: 'break-word',
              animation: 'slideIn 0.3s ease-out',
              boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
              backdropFilter: 'blur(4px)',
            }}
          >
            <span style={{ fontSize: '18px', flexShrink: 0, fontWeight: 'bold' }}>{icon}</span>
            <span style={{ fontSize: '14px', fontWeight: '500', flex: 1 }}>{toast.message}</span>
            <button
              onClick={() => onClose?.(toast.id)}
              style={{
                background: 'none',
                border: 'none',
                color: borderColor,
                cursor: 'pointer',
                fontSize: '16px',
                padding: '0 4px',
                flexShrink: 0,
                opacity: 0.7,
                transition: 'opacity 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.7')}
              title="Close notification"
            >
              ✕
            </button>
          </div>
        );
      })}
      <style>{`
        @keyframes slideIn {
          from {
            transform: translateX(400px);
            opacity: 0;
            scale: 0.95;
          }
          to {
            transform: translateX(0);
            opacity: 1;
            scale: 1;
          }
        }
      `}</style>
    </div>
  );
};
