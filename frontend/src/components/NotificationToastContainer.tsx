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
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-3 max-w-sm pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto bg-white rounded-lg shadow-lg border border-gray-200 p-4 animate-slideup"
        >
          <div className="flex items-start gap-3">
            {toast.icon && <span className="text-2xl flex-shrink-0">{toast.icon}</span>}
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-800">{toast.title}</p>
              <p className="text-sm text-gray-600 mt-1">{toast.body}</p>
              {toast.actionUrl && toast.actionLabel && (
                <button
                  onClick={() => handleAction(toast.actionUrl, toast.id)}
                  className="text-errandify-orange font-semibold text-sm mt-2 hover:underline"
                >
                  {toast.actionLabel}
                </button>
              )}
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="flex-shrink-0 text-gray-400 hover:text-gray-600 text-lg leading-none"
            >
              ✕
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
