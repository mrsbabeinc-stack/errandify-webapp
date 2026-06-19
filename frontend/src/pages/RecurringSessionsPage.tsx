import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

interface Session {
  id: number;
  taskTitle: string;
  status: 'pending' | 'assigned' | 'completed' | 'skipped';
  scheduledDate: string;
  doerName?: string;
  budget: number;
  progress: number;
}

export default function RecurringSessionsPage() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/recurring-sessions`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        }
      );
      setSessions(response.data.data || []);
    } catch (err) {
      console.error('Failed to fetch sessions:', err);
      // Mock data
      setSessions([
        {
          id: 1,
          taskTitle: 'Water Plants',
          status: 'pending',
          scheduledDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
          budget: 20,
          progress: 0,
        },
        {
          id: 2,
          taskTitle: 'Water Plants',
          status: 'completed',
          scheduledDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          doerName: 'Sarah',
          budget: 20,
          progress: 100,
        },
        {
          id: 3,
          taskTitle: 'House Cleaning',
          status: 'assigned',
          scheduledDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          doerName: 'Mike',
          budget: 80,
          progress: 0,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteSession = async (sessionId: number) => {
    try {
      await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/recurring-sessions/${sessionId}/complete`,
        {},
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      fetchSessions();
    } catch (err) {
      console.error('Failed to complete session:', err);
    }
  };

  const handleSkipSession = async (sessionId: number) => {
    try {
      await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/recurring-sessions/${sessionId}/skip`,
        {},
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      fetchSessions();
    } catch (err) {
      console.error('Failed to skip session:', err);
    }
  };

  const filteredSessions = sessions.filter(s => 
    filter === 'all' ? true : s.status === filter
  );

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-SG', { month: 'short', day: 'numeric', weekday: 'short' });
  };

  if (loading) {
    return <div className="min-h-screen bg-errandify-bg px-4 py-4"><p className="text-center py-12 text-gray-600">Loading sessions...</p></div>;
  }

  return (
    <div className="min-h-screen bg-errandify-bg px-4 py-4 pb-20">
      <div className="max-w-2xl mx-auto">
        <button onClick={() => navigate(-1)} className="mb-4 text-lg text-gray-600 font-bold">‹ Back</button>
        <h1 className="text-2xl font-bold text-errandify-brown mb-6">🔄 Recurring Sessions</h1>

        {/* Filters */}
        <div className="flex gap-2 mb-4 bg-white rounded-lg p-1">
          {(['all', 'pending', 'completed'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-1 py-2 rounded-lg font-semibold text-sm transition ${
                filter === f
                  ? 'bg-errandify-orange text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              {f === 'all' ? 'All' : f === 'pending' ? '⏳ Pending' : '✅ Completed'}
            </button>
          ))}
        </div>

        {/* Sessions List */}
        {filteredSessions.length === 0 ? (
          <div className="bg-white rounded-lg p-8 text-center border border-gray-200">
            <p className="text-gray-500">No sessions found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredSessions.map(session => (
              <div key={session.id} className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-800">{session.taskTitle}</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      📅 {formatDate(session.scheduledDate)}
                      {session.doerName && ` • 👤 ${session.doerName}`}
                    </p>
                  </div>
                  <span className={`text-xs px-3 py-1 rounded-full font-semibold ${
                    session.status === 'completed'
                      ? 'bg-green-100 text-green-700'
                      : session.status === 'assigned'
                        ? 'bg-errandify-orange-100 text-errandify-orange-700'
                        : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {session.status === 'completed' ? '✅ Done' : session.status === 'assigned' ? '👤 Assigned' : '⏳ Pending'}
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="mb-3">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-500 h-2 rounded-full transition-all"
                      style={{ width: `${session.progress}%` }}
                    />
                  </div>
                </div>

                {/* Budget & Actions */}
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-errandify-orange">SGD ${session.budget}</p>
                  {session.status === 'pending' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleCompleteSession(session.id)}
                        className="text-xs bg-green-100 text-green-700 px-3 py-1.5 rounded-lg hover:bg-green-200 font-medium"
                      >
                        Mark Done
                      </button>
                      <button
                        onClick={() => handleSkipSession(session.id)}
                        className="text-xs bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-200 font-medium"
                      >
                        Skip
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
