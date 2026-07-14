import { useNotificationToast } from '../context/NotificationContext';
import { useNavigate } from 'react-router-dom';

export default function NotificationToastContainer() {
  const { toasts, removeToast } = useNotificationToast();
  const navigate = useNavigate();

  const handleAction = (actionUrl?: string, toastId?: string) => {
    if (actionUrl) {
      navigate(actionUrl);
    }
    if (toastId) {
      removeToast(toastId);
    }
  };

  return (
    <div className="fixed top-24 left-1/2 transform -translate-x-1/2 z-50 flex flex-col gap-3 max-w-lg pointer-events-none" style={{ zIndex: 99999 }}>
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto bg-gradient-to-r from-white to-orange-50 rounded-2xl shadow-2xl border-2 border-errandify-orange p-4 animate-slidedown"
        >
          <div className="flex items-start gap-3">
            {toast.icon && <span className="text-3xl flex-shrink-0 animate-bounce">{toast.icon}</span>}
            <div className="flex-1 min-w-0">
              <p className="font-bold text-errandify-brown text-base">{toast.title}</p>
              <p className="text-sm text-gray-700 mt-1">{toast.body}</p>
              {toast.actionUrl && toast.actionLabel && (
                <button
                  onClick={() => handleAction(toast.actionUrl, toast.id)}
                  className="text-white font-bold text-sm mt-2 bg-errandify-orange hover:bg-orange-600 px-3 py-1 rounded-lg transition-colors inline-block"
                >
                  {toast.actionLabel}
                </button>
              )}
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="flex-shrink-0 text-errandify-orange hover:text-orange-600 text-lg leading-none font-bold"
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

        .animate-slidedown {
          animation: slidedown 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
