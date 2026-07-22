import { useEffect, useState } from 'react';
import { usePushNotifications } from '../hooks/usePushNotifications';

interface PushNotificationManagerProps {
  onSubscriptionChange?: (isSubscribed: boolean) => void;
}

export default function PushNotificationManager({
  onSubscriptionChange,
}: PushNotificationManagerProps) {
  const { isSupported, isSubscribed, isLoading, error, subscribe, unsubscribe } =
    usePushNotifications();
  const [showPrompt, setShowPrompt] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    onSubscriptionChange?.(isSubscribed);
  }, [isSubscribed, onSubscriptionChange]);

  // Show prompt if push is supported but not subscribed (on first visit)
  useEffect(() => {
    if (isSupported && !isLoading && !isSubscribed) {
      // Don't show prompt on localhost (dev environment)
      const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      if (isLocalhost) {
        return;
      }

      // Check if user has dismissed this before
      const dismissed = localStorage.getItem('push-prompt-dismissed');
      if (!dismissed) {
        setShowPrompt(true);
      }
    }
  }, [isSupported, isLoading, isSubscribed]);

  const handleSubscribe = async () => {
    setIsProcessing(true);
    const success = await subscribe();
    setIsProcessing(false);

    if (success) {
      setShowPrompt(false);
      localStorage.setItem('push-prompt-dismissed', 'true');
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('push-prompt-dismissed', 'true');
  };

  if (!isSupported || isLoading || !showPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-20 left-4 right-4 bg-white rounded-lg shadow-lg border border-gray-200 p-4 z-40 max-w-sm mx-auto">
      <div className="flex items-start gap-3">
        <span className="text-2xl">🔔</span>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-800 text-sm">Stay Updated!</p>
          <p className="text-xs text-gray-600 mt-1">
            Get instant notifications when offers are accepted, errands reopen, or payments are released.
          </p>

          {error && (
            <p className="text-xs text-red-600 mt-2">{error}</p>
          )}

          <div className="flex gap-2 mt-3">
            <button
              onClick={handleSubscribe}
              disabled={isProcessing}
              className="flex-1 px-3 py-2 bg-errandify-orange text-white rounded-lg font-semibold text-xs hover:bg-opacity-90 disabled:opacity-50"
            >
              {isProcessing ? 'Enabling...' : 'Enable Notifications'}
            </button>
            <button
              onClick={handleDismiss}
              className="px-3 py-2 border border-gray-300 rounded-lg font-semibold text-xs hover:bg-gray-50"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
