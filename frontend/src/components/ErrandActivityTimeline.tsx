import { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import axios from 'axios';

interface Activity {
  id: number;
  activity_type: string;
  actor_name: string;
  actor_role: string;
  details: any;
  created_at: string;
}

interface ErrandActivityTimelineProps {
  errandId: number;
  userRole: 'asker' | 'doer';
}

interface ErrandActivityTimelineHandle {
  refreshActivity: () => Promise<void>;
}

const ErrandActivityTimeline = forwardRef<ErrandActivityTimelineHandle, ErrandActivityTimelineProps>(
  ({ errandId }, ref) => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchActivityLog();
  }, [errandId]);

  // Expose refresh method to parent components
  useImperativeHandle(ref, () => ({
    refreshActivity: fetchActivityLog,
  }));

  const fetchActivityLog = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/errands/${errandId}/activity-log`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        }
      );

      setActivities(response.data.data || []);
      setError('');
    } catch (err: any) {
      console.error('Failed to fetch activity log:', err);
      setError(err.response?.data?.error || 'Failed to load activity timeline');
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (type: string) => {
    const icons: { [key: string]: string } = {
      posted: '📝',
      bid_placed: '💰',
      bid_accepted: '✅',
      bid_rejected: '❌',
      started: '⏱️',
      completed: '✅',
      rating_submitted: '⭐',
      dispute_raised: '⚠️',
      reopened: '🔄',
      cancelled: '🚫',
      changes_requested: '🔧',
      dispute_resolved: '✓',
      payment_made: '💸',
    };
    return icons[type] || '📌';
  };

  const getActivityLabel = (type: string, actor: string, actorRole: string, details: any) => {
    const role = actorRole === 'asker' ? '(Asker)' : '(Doer)';
    // Use alias for doers when available
    const displayName = actorRole === 'doer' && details?.alias ? details.alias : actor;

    switch (type) {
      case 'posted':
        return `${displayName} ${role} posted the errand`;
      case 'bid_placed':
        return `${displayName} ${role} submitted an offer (${details?.offerId || '?'} - SGD $${details?.amount || '?'})`;
      case 'bid_accepted':
        return `${displayName}'s offer was selected`;
      case 'bid_rejected':
        return `${displayName} ${role} rejected the offer`;
      case 'started':
        return `${displayName} ${role} started the job`;
      case 'completed':
        return `${displayName} ${role} completed the work`;
      case 'rating_submitted':
        return `${displayName} ${role} rated with ${details?.rating}⭐`;
      case 'dispute_raised':
        return `${displayName} ${role} raised a dispute`;
      case 'reopened':
        return `${displayName} ${role} reopened the job`;
      case 'cancelled':
        return `${displayName} ${role} cancelled the errand`;
      case 'changes_requested':
        return `${displayName} ${role} requested changes`;
      case 'dispute_resolved':
        return `Admin resolved the dispute`;
      case 'payment_made':
        return `Payment of $${details?.amount || '?'} was released`;
      default:
        return `${displayName} ${role} ${type.replace('_', ' ')}`;
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-SG', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="rounded-lg border border-gray-200 p-6 bg-gray-50">
        <p className="text-gray-600 text-center">Loading activity timeline...</p>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 p-6 bg-gray-50">
        <p className="text-gray-600 text-center italic">
          No activities recorded yet. Activities will appear as the errand progresses.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-orange-100 overflow-hidden bg-white shadow-sm">
      {/* Header - Warm & Compact */}
      <div className="bg-gradient-to-r from-orange-50 to-orange-100 px-3 py-2 border-b border-orange-200">
        <h3 className="font-bold text-sm flex items-center gap-2 text-errandify-brown">
          📅 Activity Timeline
        </h3>
        <p className="text-xs text-gray-600 mt-0.5">
          What's happened on this errand
        </p>
      </div>

      {/* Timeline - Compact */}
      <div className="p-2 space-y-1.5">
        {activities.map((activity, idx) => {
          const isLastItem = idx === activities.length - 1;

          return (
            <div key={activity.id} className="flex gap-2">
              {/* Timeline Dot and Line */}
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 rounded-full bg-orange-100 border-2 border-errandify-orange flex items-center justify-center text-sm flex-shrink-0">
                  {getActivityIcon(activity.activity_type)}
                </div>
                {!isLastItem && (
                  <div className="w-0.5 bg-orange-200 flex-grow my-1" style={{ minHeight: '2rem' }} />
                )}
              </div>

              {/* Activity Content - Compact */}
              <div className="flex-1 pb-1.5">
                <div className="bg-gradient-to-r from-orange-50 to-orange-100 border border-orange-200 rounded-lg p-2">
                  <div className="flex justify-between items-start">
                    <p className="font-semibold text-xs text-errandify-brown">
                      {getActivityLabel(
                        activity.activity_type,
                        activity.actor_name,
                        activity.actor_role,
                        activity.details
                      )}
                    </p>
                    <span className="text-xs text-gray-600 font-medium whitespace-nowrap ml-1 flex-shrink-0">
                      {formatTime(activity.created_at)}
                    </span>
                  </div>

                  {/* Additional Details */}
                  {activity.details && Object.keys(activity.details).length > 0 && (
                    <div className="text-sm text-gray-600 mt-2 space-y-1">
                      {Object.entries(activity.details).map(([key, value]: [string, any]) => (
                        key !== 'amount' && key !== 'rating' && (
                          <p key={key}>
                            <strong>{key}:</strong> {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                          </p>
                        )
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
  }
);

ErrandActivityTimeline.displayName = 'ErrandActivityTimeline';
export default ErrandActivityTimeline;
