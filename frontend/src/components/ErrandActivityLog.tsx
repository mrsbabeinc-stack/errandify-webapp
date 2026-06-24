import { useState, useEffect } from 'react';
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
}

export default function ErrandActivityLog({ errandId }: ErrandActivityLogProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchActivityLog();
  }, [errandId]);

  const fetchActivityLog = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/errands/${errandId}/activity-log`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success) {
        setActivities(response.data.data.activities);
      }
    } catch (err) {
      console.error('Failed to fetch activity log:', err);
      setError('Failed to load activity log');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-xs text-gray-500">Loading timeline...</div>;
  }

  if (error) {
    return <div className="text-xs text-red-600">{error}</div>;
  }

  if (activities.length === 0) {
    return <div className="text-xs text-gray-500">No activities yet</div>;
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
