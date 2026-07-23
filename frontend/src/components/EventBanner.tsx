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
          bg: 'bg-ok-wash',
          border: 'border-l-4 border-ok',
          text: 'text-gray-800',
          action: 'text-ok hover:opacity-80'
        };
      case 'alert':
        return {
          bg: 'bg-danger-wash',
          border: 'border-l-4 border-danger',
          text: 'text-gray-800',
          action: 'text-danger hover:opacity-80'
        };
      case 'warning':
        return {
          bg: 'bg-warn-wash',
          border: 'border-l-4 border-warn',
          text: 'text-gray-800',
          action: 'text-warn hover:opacity-80'
        };
      case 'info':
      default:
        return {
          bg: 'bg-errandify-orange-wash',
          border: 'border-l-4 border-errandify-orange',
          text: 'text-gray-800',
          action: 'text-errandify-orange-deep hover:opacity-80'
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
          <p className={`${styles.text} text-xs font-semibold leading-snug line-clamp-2`}>
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
