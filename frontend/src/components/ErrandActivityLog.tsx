import { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import axios from 'axios';

interface Activity {
  id: number;
  type: string;
  actor: {
    name: string;
    role: string;
  };
  timestamp: string;
  displayText: string;
  details?: any;
}

interface ErrandActivityLogProps {
  errandId: number;
  userRole?: 'asker' | 'doer';
}

interface ErrandActivityLogHandle {
  refreshActivity: () => Promise<void>;
}

const ErrandActivityLog = forwardRef<ErrandActivityLogHandle, ErrandActivityLogProps>(
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
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/errands/${errandId}/activity-log`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      // Handle the response - the API returns success: true with data.activities
      if (response.data && response.data.data) {
        setActivities(response.data.data.activities || []);
        setError('');
      } else if (response.data.success) {
        setActivities(response.data.activities || []);
        setError('');
      } else {
        setActivities([]);
        setError('');
      }
    } catch (err: any) {
      console.error('Failed to fetch activity log:', err);
      // Don't show error if it's authorization - just show empty
      if (err.response?.status === 403) {
        setActivities([]);
        setError('');
      } else {
        setError('Unable to load activity log');
        setActivities([]);
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-xs text-gray-500 italic">Loading timeline...</div>;
  }

  if (error) {
    return <div className="text-xs text-amber-600 italic">Activity log temporarily unavailable</div>;
  }

  if (activities.length === 0) {
    return (
      <div className="text-xs text-gray-600">
        <p className="italic">Activities will appear here as the errand progresses.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {activities.map((activity, index) => (
        <div key={activity.id} className="flex gap-3">
          {/* Timeline dot and line */}
          <div className="flex flex-col items-center">
            <div className="w-3 h-3 rounded-full bg-errandify-orange flex-shrink-0 mt-1" />
            {index < activities.length - 1 && (
              <div className="w-0.5 h-12 bg-gray-300 mt-1" />
            )}
          </div>

          {/* Activity content */}
          <div className="flex-1 pb-2">
            <p className="text-xs font-semibold text-gray-900">
              {activity.displayText}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              {new Date(activity.timestamp).toLocaleDateString('en-SG')} {' '}
              {new Date(activity.timestamp).toLocaleTimeString('en-SG', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
            {activity.details && (
              <p className="text-xs text-gray-600 mt-1">
                {JSON.stringify(activity.details, null, 2)}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
  }
);

ErrandActivityLog.displayName = 'ErrandActivityLog';
export default ErrandActivityLog;

