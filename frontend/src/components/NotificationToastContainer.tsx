import { useNotificationToast } from '../context/NotificationContext';
import { Toast } from '../context/NotificationContext';

export default function NotificationToastContainer() {
  const { toasts, removeToast } = useNotificationToast();

  const handleAction = (actionUrl?: string, toastId?: string) => {
    if (actionUrl) {
      window.location.href = actionUrl;
    }
    if (toastId) {
      removeToast(toastId);
    }
  };

  const getTypeStyles = (type: Toast['type']) => {
    const styles: Record<string, any> = {
      success: {
        borderColor: '#10b981',
        backgroundColor: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
        titleColor: '#047857',
        textColor: '#065f46',
        iconColor: '#10b981',
        buttonBg: '#10b981',
        buttonHover: '#059669',
      },
      error: {
        borderColor: '#ef4444',
        backgroundColor: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
        titleColor: '#991b1b',
        textColor: '#7f1d1d',
        iconColor: '#ef4444',
        buttonBg: '#ef4444',
        buttonHover: '#dc2626',
      },
      warning: {
        borderColor: '#f59e0b',
        backgroundColor: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
        titleColor: '#92400e',
        textColor: '#78350f',
        iconColor: '#f59e0b',
        buttonBg: '#f59e0b',
        buttonHover: '#d97706',
      },
      info: {
        borderColor: '#3b82f6',
        backgroundColor: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
        titleColor: '#1e40af',
        textColor: '#1e3a8a',
        iconColor: '#3b82f6',
        buttonBg: '#3b82f6',
        buttonHover: '#2563eb',
      },
    };
    return styles[type] || styles.info;
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: '80px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 999999,
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        maxWidth: '480px',
        pointerEvents: 'none',
        width: '95%',
        maxHeight: '80vh',
        overflowY: 'auto',
      }}
    >
      {toasts.map((toast) => {
        const typeStyles = getTypeStyles(toast.type);
        return (
          <div
            key={toast.id}
            style={{
              pointerEvents: 'auto',
              background: typeStyles.backgroundColor,
              borderRadius: '12px',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
              border: `2px solid ${typeStyles.borderColor}`,
              padding: '16px',
              animation: 'slidedown 0.3s ease-out',
              backdropFilter: 'blur(8px)',
            }}
          >
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              {toast.icon && (
                <span
                  style={{
                    fontSize: '24px',
                    flexShrink: 0,
                    animation: 'pulse 2s infinite',
                    color: typeStyles.iconColor,
                  }}
                >
                  {toast.icon}
                </span>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{
                  fontWeight: '600',
                  color: typeStyles.titleColor,
                  fontSize: '15px',
                  margin: '0',
                  letterSpacing: '-0.3px',
                }}>
                  {toast.title}
                </p>
                <p style={{
                  fontSize: '13px',
                  color: typeStyles.textColor,
                  marginTop: '4px',
                  margin: '4px 0 0 0',
                  lineHeight: '1.4',
                }}>
                  {toast.body}
                </p>
                {toast.actionUrl && toast.actionLabel && (
                  <button
                    onClick={() => handleAction(toast.actionUrl, toast.id)}
                    style={{
                      color: 'white',
                      fontWeight: '600',
                      fontSize: '13px',
                      marginTop: '10px',
                      background: typeStyles.buttonBg,
                      border: 'none',
                      padding: '6px 14px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = typeStyles.buttonHover;
                      e.currentTarget.style.transform = 'translateY(-1px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = typeStyles.buttonBg;
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    {toast.actionLabel}
                  </button>
                )}
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                style={{
                  flexShrink: 0,
                  color: typeStyles.borderColor,
                  background: 'none',
                  border: 'none',
                  fontSize: '20px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  padding: '0 0 0 8px',
                  transition: 'color 0.2s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = typeStyles.buttonHover)}
                onMouseLeave={(e) => (e.currentTarget.style.color = typeStyles.borderColor)}
              >
                ✕
              </button>
            </div>
          </div>
        );
      })}

      <style>{`
        @keyframes slidedown {
          from {
            transform: translateY(-100%);
            opacity: 0;
            scale: 0.95;
          }
          to {
            transform: translateY(0);
            opacity: 1;
            scale: 1;
          }
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.7;
          }
        }
      `}</style>
    </div>
  );
}
