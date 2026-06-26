import React, { useState, useEffect } from 'react';
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

export default function ErrandActivityTimeline({
  errandId,
  userRole,
}: ErrandActivityTimelineProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchActivityLog();
  }, [errandId]);

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

    switch (type) {
      case 'posted':
        return `${actor} ${role} posted the errand`;
      case 'bid_placed':
        return `${actor} ${role} placed bid of $${details?.amount || '?'}`;
      case 'bid_accepted':
        return `${actor} ${role} accepted the offer`;
      case 'bid_rejected':
        return `${actor} ${role} rejected the offer`;
      case 'started':
        return `${actor} ${role} started the job`;
      case 'completed':
        return `${actor} ${role} completed the work`;
      case 'rating_submitted':
        return `${actor} ${role} rated with ${details?.rating}⭐`;
      case 'dispute_raised':
        return `${actor} ${role} raised a dispute`;
      case 'reopened':
        return `${actor} ${role} reopened the job`;
      case 'cancelled':
        return `${actor} ${role} cancelled the errand`;
      case 'changes_requested':
        return `${actor} ${role} requested changes`;
      case 'dispute_resolved':
        return `Admin resolved the dispute`;
      case 'payment_made':
        return `Payment of $${details?.amount || '?'} was released`;
      default:
        return `${actor} ${role} ${type.replace('_', ' ')}`;
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
    <div className="rounded-lg border-2 border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gray-100 px-6 py-3 border-b border-gray-200">
        <h3 className="font-bold text-lg flex items-center gap-2">
          📋 Activity Timeline
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          Complete history of all actions on this errand
        </p>
      </div>

      {/* Timeline */}
      <div className="p-6 space-y-4">
        {activities.map((activity, idx) => {
          const isLastItem = idx === activities.length - 1;

          return (
            <div key={activity.id} className="flex gap-4">
              {/* Timeline Dot and Line */}
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 rounded-full bg-blue-100 border-2 border-blue-500 flex items-center justify-center text-lg flex-shrink-0">
                  {getActivityIcon(activity.activity_type)}
                </div>
                {!isLastItem && (
                  <div className="w-1 bg-gray-300 flex-grow my-2" style={{ minHeight: '3rem' }} />
                )}
              </div>

              {/* Activity Content */}
              <div className="flex-1 pb-4">
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <p className="font-bold text-gray-900">
                      {getActivityLabel(
                        activity.activity_type,
                        activity.actor_name,
                        activity.actor_role,
                        activity.details
                      )}
                    </p>
                    <span className="text-xs text-gray-500 whitespace-nowrap ml-2">
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
