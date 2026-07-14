import { useNotificationToast } from '../context/NotificationContext';

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
        maxWidth: '448px',
        pointerEvents: 'none'
      }}
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          style={{
            pointerEvents: 'auto',
            background: 'linear-gradient(to right, white, #faf5f0)',
            borderRadius: '16px',
            boxShadow: '0 20px 25px -5px rgba(255, 107, 53, 0.2)',
            border: '2px solid #ff6b35',
            padding: '16px',
            animation: 'slidedown 0.3s ease-out'
          }}
        >
          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            {toast.icon && (
              <span style={{ fontSize: '24px', flexShrink: 0, animation: 'bounce 1s infinite' }}>
                {toast.icon}
              </span>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontWeight: 'bold', color: '#5c4033', fontSize: '16px', margin: '0' }}>
                {toast.title}
              </p>
              <p style={{ fontSize: '14px', color: '#555', marginTop: '4px', margin: '4px 0 0 0' }}>
                {toast.body}
              </p>
              {toast.actionUrl && toast.actionLabel && (
                <button
                  onClick={() => handleAction(toast.actionUrl, toast.id)}
                  style={{
                    color: 'white',
                    fontWeight: 'bold',
                    fontSize: '14px',
                    marginTop: '8px',
                    background: '#ff6b35',
                    border: 'none',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#e85a25')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = '#ff6b35')}
                >
                  {toast.actionLabel}
                </button>
              )}
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              style={{
                flexShrink: 0,
                color: '#ff6b35',
                background: 'none',
                border: 'none',
                fontSize: '18px',
                cursor: 'pointer',
                fontWeight: 'bold',
                padding: 0,
                transition: 'color 0.2s'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#e85a25')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#ff6b35')}
            >
              ✕
            </button>
          </div>
        </div>
      ))}

      <style>{`
        @keyframes slidedown {
          from {
            transform: translateY(-100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        @keyframes bounce {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-4px);
          }
        }
      `}</style>
    </div>
  );
}
