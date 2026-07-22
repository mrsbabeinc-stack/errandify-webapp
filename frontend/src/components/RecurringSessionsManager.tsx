import { useState, useEffect } from 'react';
import axios from 'axios';

interface Session {
  id: number;
  errandId: number;
  sessionNumber: number;
  scheduledDate: string;
  status: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';
  assignedDoerId?: number;
  assignedDoerName?: string;
  completedAt?: string;
}

interface RecurringErrand {
  id: number;
  title: string;
  description: string;
  frequency: string;
  totalSessions: number;
  completedSessions: number;
  budget: number;
  category: string;
}

interface SessionsManagerProps {
  errandId: number;
  userRole: 'asker' | 'doer';
}

export default function RecurringSessionsManager({
  errandId,
  userRole,
}: SessionsManagerProps) {
  const [errand, setErrand] = useState<RecurringErrand | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [aiSuggestion, setAiSuggestion] = useState('');
  const [loadingAI, setLoadingAI] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);

  useEffect(() => {
    fetchSessionData();
  }, [errandId, userRole]);

  useEffect(() => {
    if (sessions.length > 0) {
      generateAISuggestion();
    }
  }, [sessions]);

  const fetchSessionData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/errands/${errandId}/sessions`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        }
      );

      if (response.data.success) {
        setErrand(response.data.data.errand);
        setSessions(response.data.data.sessions || []);
      }
      setError('');
    } catch (err: any) {
      console.error('Failed to fetch sessions:', err);
      setError(err.response?.data?.error || 'Failed to load sessions');
    } finally {
      setLoading(false);
    }
  };

  const generateAISuggestion = async () => {
    try {
      setLoadingAI(true);
      const completedCount = sessions.filter(s => s.status === 'completed').length;
      const pendingCount = sessions.filter(s => s.status === 'pending').length;
      const assignedCount = sessions.filter(s => s.status === 'assigned').length;

      const prompt = `You are Hana, a warm and helpful AI assistant. Analyze this recurring errand progress and give a brief, encouraging suggestion.

Errand: ${errand?.title}
Total sessions: ${errand?.totalSessions}
Completed: ${completedCount}
Assigned to doers: ${assignedCount}
Waiting for doers: ${pendingCount}

User role: ${userRole}

If asker: Encourage them on progress, suggest when to check on assigned sessions.
If doer: Show enthusiasm, suggest when to accept more sessions.

Be warm, brief (1-2 sentences), and use an emoji. Sound like a friend cheering them on.`;

      const response = await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/ai/suggest`,
        { input: prompt }
      );

      if (response.data.data?.suggestion) {
        setAiSuggestion(response.data.data.suggestion);
      }
      setLoadingAI(false);
    } catch (err) {
      console.error('Failed to generate AI suggestion:', err);
      setLoadingAI(false);
    }
  };

  const handleCompleteSession = async (sessionId: number) => {
    try {
      await axios.patch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/errands/${errandId}/sessions/${sessionId}`,
        { status: 'completed' },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        }
      );

      setSessions((prev) =>
        prev.map((s) =>
          s.id === sessionId
            ? { ...s, status: 'completed', completedAt: new Date().toISOString() }
            : s
        )
      );

      setSelectedSessionId(null);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update session');
    }
  };

  if (loading) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-500">Loading recurring sessions...</p>
      </div>
    );
  }

  if (!errand) {
    return (
      <div className="p-6 text-center text-red-600">
        Recurring errand not found
      </div>
    );
  }

  const completedCount = sessions.filter((s) => s.status === 'completed').length;
  const assignedCount = sessions.filter((s) => s.status === 'assigned').length;
  const pendingCount = sessions.filter((s) => s.status === 'pending').length;
  const progressPercentage = Math.round((completedCount / errand.totalSessions) * 100);

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          📅 {errand.title}
        </h1>
        <p className="text-gray-600 text-sm">
          {errand.frequency} • ${errand.budget} per session
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg mb-6 text-red-700">
          {error}
        </div>
      )}

      {/* AI Suggestion Card */}
      {aiSuggestion && (
        <div className="bg-gradient-to-r from-orange-50 to-yellow-50 border-l-4 border-errandify-orange rounded-lg p-4 mb-6">
          <div className="flex gap-3">
            <span className="text-2xl">🤖</span>
            <div>
              <p className="font-semibold text-errandify-orange mb-1">Hana's Suggestion</p>
              <p className="text-gray-700">{aiSuggestion}</p>
            </div>
          </div>
        </div>
      )}

      {/* Progress Overview */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-green-50 rounded-lg p-4 border border-green-200">
          <p className="text-sm text-gray-600 mb-1">Completed</p>
          <p className="text-3xl font-bold text-green-600">{completedCount}</p>
          <p className="text-xs text-gray-500 mt-1">of {errand.totalSessions}</p>
        </div>

        <div className="bg-orange-50 rounded-lg p-4 border border-errandify-orange-200">
          <p className="text-sm text-gray-600 mb-1">Assigned</p>
          <p className="text-3xl font-bold text-errandify-orange-600">{assignedCount}</p>
          <p className="text-xs text-gray-500 mt-1">working on it</p>
        </div>

        <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
          <p className="text-sm text-gray-600 mb-1">Waiting</p>
          <p className="text-3xl font-bold text-yellow-600">{pendingCount}</p>
          <p className="text-xs text-gray-500 mt-1">for doers</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <p className="font-semibold text-gray-700">Progress</p>
          <p className="text-sm font-bold text-errandify-orange">{progressPercentage}%</p>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
          <div
            className="bg-gradient-to-r from-errandify-orange to-orange-500 h-full transition-all duration-500"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {/* Sessions List */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Sessions</h2>
        <div className="space-y-3">
          {sessions.map((session) => (
            <div
              key={session.id}
              className={`p-4 rounded-lg border-2 transition-all ${
                session.status === 'completed'
                  ? 'bg-green-50 border-green-200'
                  : session.status === 'assigned'
                  ? 'bg-orange-50 border-errandify-orange-200'
                  : session.status === 'in_progress'
                  ? 'bg-purple-50 border-purple-200'
                  : 'bg-gray-50 border-gray-200'
              } cursor-pointer hover:shadow-md`}
              onClick={() => setSelectedSessionId(session.id)}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <p className="font-semibold text-gray-800">
                    Session {session.sessionNumber}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    📅 {new Date(session.scheduledDate).toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </p>
                  {session.assignedDoerName && (
                    <p className="text-sm text-gray-600 mt-1">
                      👤 {session.assignedDoerName}
                    </p>
                  )}
                </div>

                <div className="flex flex-col items-end gap-2">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold ${
                      session.status === 'completed'
                        ? 'bg-green-200 text-green-800'
                        : session.status === 'assigned'
                        ? 'bg-orange-200 text-errandify-orange-800'
                        : session.status === 'in_progress'
                        ? 'bg-purple-200 text-purple-800'
                        : 'bg-gray-200 text-gray-800'
                    }`}
                  >
                    {session.status === 'pending' && '⏳ Waiting'}
                    {session.status === 'assigned' && '✅ Assigned'}
                    {session.status === 'in_progress' && '🚀 Working'}
                    {session.status === 'completed' && '✨ Done'}
                  </span>

                  {session.status === 'completed' && session.completedAt && (
                    <p className="text-xs text-gray-500">
                      {new Date(session.completedAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      {userRole === 'asker' && (
        <div className="bg-orange-50 border border-errandify-orange-200 rounded-lg p-4">
          <p className="text-sm text-gray-700 mb-3">
            💡 <strong>Pro tip:</strong> Doers love consistency! Keep the same sessions each time so
            they know when you need them.
          </p>
          <button className="px-4 py-2 bg-errandify-orange text-white rounded-lg font-semibold hover:bg-opacity-90">
            🔔 Notify All Doers
          </button>
        </div>
      )}

      {userRole === 'doer' && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm text-gray-700 mb-3">
            💡 <strong>You're reliable!</strong> Accept sessions you can do. Skip the ones you can't.
            Consistency builds trust!
          </p>
          <button className="px-4 py-2 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600">
            ➕ Accept More Sessions
          </button>
        </div>
      )}
    </div>
  );
}
