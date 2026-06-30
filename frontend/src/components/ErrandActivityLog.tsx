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
    // Poll for activity updates every 2 seconds
    const interval = setInterval(fetchActivityLog, 2000);
    return () => clearInterval(interval);
  }, [errandId]);

  // Expose refresh method to parent components
  useImperativeHandle(ref, () => ({
    refreshActivity: fetchActivityLog,
  }));

  const fetchActivityLog = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/errands/${errandId}/activity-log?t=${Date.now()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Cache-Control': 'no-cache',
          },
        }
      );

      console.log('[ActivityLog] Response:', response.data);
      console.log('[ActivityLog] response.data.data:', response.data.data);
      console.log('[ActivityLog] response.data.data.activities:', response.data.data?.activities);

      // Handle the response - the API returns success: true with data.activities
      if (response.data && response.data.data && Array.isArray(response.data.data.activities)) {
        console.log('[ActivityLog] Setting activities:', response.data.data.activities);
        setActivities(response.data.data.activities);
        setError('');
      } else if (response.data && Array.isArray(response.data.activities)) {
        console.log('[ActivityLog] Setting activities from alternate path:', response.data.activities);
        setActivities(response.data.activities);
        setError('');
      } else {
        console.log('[ActivityLog] No activities found in response, got:', {
          hasData: !!response.data,
          hasDataData: !!response.data.data,
          activitiesValue: response.data.data?.activities,
          isArray: Array.isArray(response.data.data?.activities)
        });
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
    // 403 means user is not authorized to view this errand's activities
    // This is expected for unselected doers after confirmation
    return <div className="text-xs text-gray-600 italic">Activity details not available for this errand</div>;
  }

  if (activities.length === 0) {
    return (
      <div className="text-xs text-gray-600">
        <p className="italic">Activities will appear here as the errand progresses.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {activities.map((activity, index) => (
        <div key={activity.id} className="flex gap-2">
          {/* Timeline dot and line */}
          <div className="flex flex-col items-center">
            <div className="w-2.5 h-2.5 rounded-full bg-errandify-orange flex-shrink-0 mt-1" />
            {index < activities.length - 1 && (
              <div className="w-0.5 h-10 bg-orange-200 mt-0.5" />
            )}
          </div>

          {/* Activity content */}
          <div className="flex-1 pb-1.5">
            <p className="text-xs font-semibold text-gray-800">
              {activity.displayText}
            </p>
            <p className="text-xs text-gray-600 mt-0.5">
              {new Date(activity.timestamp).toLocaleDateString('en-SG')} at {' '}
              {new Date(activity.timestamp).toLocaleTimeString('en-SG', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
  }
);

ErrandActivityLog.displayName = 'ErrandActivityLog';
export default ErrandActivityLog;

