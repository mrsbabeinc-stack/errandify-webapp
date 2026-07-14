import React, { useEffect, useState } from 'react';

interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

export const useToast = () => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 8000);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  return { toasts, showToast, removeToast };
};

export const ToastContainer: React.FC<{ toasts: ToastMessage[], onClose?: (id: string) => void }> = ({ toasts, onClose }) => {
  return (
    <div style={{
      position: 'fixed',
      top: '80px',
      right: '20px',
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
    }}>
      {toasts.map(toast => {
        const bgColor = {
          success: '#e8f5e9',
          error: '#ffebee',
          warning: '#fff3e0',
          info: '#e3f2fd',
        }[toast.type];

        const borderColor = {
          success: '#4CAF50',
          error: '#F44336',
          warning: '#FF9800',
          info: '#2196F3',
        }[toast.type];

        const textColor = {
          success: '#2e7d32',
          error: '#c62828',
          warning: '#e65100',
          info: '#1565c0',
        }[toast.type];

        const icon = {
          success: '✓',
          error: '⚠️',
          warning: '⚡',
          info: 'ℹ️',
        }[toast.type];

        return (
          <div
            key={toast.id}
            style={{
              background: bgColor,
              color: textColor,
              padding: '12px 16px',
              borderRadius: '6px',
              border: `2px solid ${borderColor}`,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              maxWidth: '400px',
              wordBreak: 'break-word',
              animation: 'slideIn 0.3s ease-out',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            }}
          >
            <span style={{ fontSize: '16px', flexShrink: 0 }}>{icon}</span>
            <span style={{ fontSize: '13px', fontWeight: '500', flex: 1 }}>{toast.message}</span>
            <button
              onClick={() => onClose?.(toast.id)}
              style={{
                background: 'none',
                border: 'none',
                color: textColor,
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
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
};
