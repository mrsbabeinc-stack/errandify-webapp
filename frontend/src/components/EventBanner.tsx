import { useState } from 'react';

interface EventNotification {
  id: string;
  message: string;
  type: 'alert' | 'info' | 'success' | 'warning';
  icon: string;
  action?: { label: string; url: string };
}

const SAMPLE_EVENTS: EventNotification[] = [
  {
    id: '1',
    message: '🎉 Weekend Bonus: Earn 2x EP on all errands this weekend!',
    type: 'success',
    icon: '🎁',
    action: { label: 'View Details', url: '/promotions' }
  },
  {
    id: '2',
    message: '⚠️ System Maintenance: Platform will be down 2-3am tonight',
    type: 'alert',
    icon: '🔧',
  },
  {
    id: '3',
    message: '📢 New Feature: AI Errand Creation with Hana is now available!',
    type: 'info',
    icon: '✨',
    action: { label: 'Try Now', url: '/create-errand-hana' }
  },
];

export default function EventBanner() {
  const [currentEventIndex, setCurrentEventIndex] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || SAMPLE_EVENTS.length === 0) return null;

  const currentEvent = SAMPLE_EVENTS[currentEventIndex];

  const getStyles = () => {
    switch (currentEvent.type) {
      case 'success':
        return {
          bg: 'bg-green-50',
          border: 'border-l-4 border-green-500',
          text: 'text-green-900',
          action: 'text-green-600 hover:text-green-700'
        };
      case 'alert':
        return {
          bg: 'bg-red-50',
          border: 'border-l-4 border-red-500',
          text: 'text-red-900',
          action: 'text-red-600 hover:text-red-700'
        };
      case 'warning':
        return {
          bg: 'bg-yellow-50',
          border: 'border-l-4 border-yellow-500',
          text: 'text-yellow-900',
          action: 'text-yellow-600 hover:text-yellow-700'
        };
      case 'info':
      default:
        return {
          bg: 'bg-blue-50',
          border: 'border-l-4 border-blue-500',
          text: 'text-blue-900',
          action: 'text-blue-600 hover:text-blue-700'
        };
    }
  };

  const styles = getStyles();

  const handleNext = () => {
    setCurrentEventIndex((prev) => (prev + 1) % SAMPLE_EVENTS.length);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-1">
      <div className={`${styles.bg} ${styles.border} rounded p-2 flex items-center justify-between gap-2 transition-all duration-300 min-h-[50px]`}>
        {/* LEFT: Icon + Message */}
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <span className="text-base flex-shrink-0">{currentEvent.icon}</span>
          <p className={`${styles.text} text-xs font-semibold truncate`}>
            {currentEvent.message}
          </p>
        </div>

        {/* RIGHT: Action Button + Next + Close */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {currentEvent.action && (
            <a
              href={currentEvent.action.url}
              className={`${styles.action} text-xs font-bold px-1.5 py-0.5 hover:underline whitespace-nowrap`}
            >
              {currentEvent.action.label}
            </a>
          )}

          {SAMPLE_EVENTS.length > 1 && (
            <button
              onClick={handleNext}
              className={`${styles.action} text-xs font-bold px-1.5 py-0.5 hover:bg-white hover:bg-opacity-50 rounded transition`}
              title="Next event"
            >
              ›
            </button>
          )}

          <button
            onClick={() => setDismissed(true)}
            className={`${styles.action} text-xs font-bold px-1.5 py-0.5 hover:bg-white hover:bg-opacity-50 rounded transition`}
            title="Dismiss"
          >
            ✕
          </button>
        </div>
      </div>

    </div>
  );
}
