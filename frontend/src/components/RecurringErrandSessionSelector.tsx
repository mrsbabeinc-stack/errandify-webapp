import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface Session {
  id: number;
  sessionNumber: number;
  startDate: string;
  deadline: string;
  status: string;
}

interface Errand {
  id: number;
  title: string;
  category: string;
  budget: string;
  totalSessions: number;
}

interface RecurringErrandSessionSelectorProps {
  errandId: number;
  onSessionsSelected: (sessionIds: number[]) => void;
  onCancel: () => void;
}

export default function RecurringErrandSessionSelector({
  errandId,
  onSessionsSelected,
  onCancel,
}: RecurringErrandSessionSelectorProps) {
  const [errand, setErrand] = useState<Errand | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSessions, setSelectedSessions] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const response = await axios.get(
          `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/bids/recurring/${errandId}`,
          {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
          }
        );

        setErrand(response.data.data.errand);
        setSessions(response.data.data.sessions);
      } catch (err) {
        setError('Failed to load recurring errand sessions');
        console.error('Error fetching sessions:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSessions();
  }, [errandId]);

  const toggleSession = (sessionId: number) => {
    const newSelected = new Set(selectedSessions);
    if (newSelected.has(sessionId)) {
      newSelected.delete(sessionId);
    } else {
      newSelected.add(sessionId);
    }
    setSelectedSessions(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedSessions.size === sessions.length) {
      setSelectedSessions(new Set());
    } else {
      setSelectedSessions(new Set(sessions.map((s) => s.id)));
    }
  };

  const handleSubmit = async () => {
    if (selectedSessions.size === 0) {
      setError('Please select at least one session');
      return;
    }

    setSubmitting(true);
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/bids/recurring-sessions`,
        {
          errandId,
          selectedSessionIds: Array.from(selectedSessions),
        },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        }
      );

      onSessionsSelected(Array.from(selectedSessions));
    } catch (err) {
      setError('Failed to accept sessions');
      console.error('Error submitting:', err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-center">Loading sessions...</div>;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-96 overflow-auto">
        <div className="p-6 border-b sticky top-0 bg-white">
          <h2 className="text-2xl font-bold mb-2">Select Sessions</h2>
          {errand && (
            <p className="text-gray-600">
              {errand.title} • {errand.totalSessions} total sessions
            </p>
          )}
        </div>

        {error && (
          <div className="p-4 bg-red-50 border-b border-red-200 text-red-700">
            {error}
          </div>
        )}

        <div className="p-6">
          {/* Select All Button */}
          <button
            onClick={handleSelectAll}
            className="mb-4 px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-full text-sm font-semibold"
          >
            {selectedSessions.size === sessions.length ? 'Deselect All' : 'Select All'}
          </button>

          {/* Sessions List */}
          <div className="space-y-3">
            {sessions.map((session) => (
              <label
                key={session.id}
                className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedSessions.has(session.id)}
                  onChange={() => toggleSession(session.id)}
                  className="w-5 h-5 text-errandify-orange rounded cursor-pointer"
                />
                <div className="ml-4 flex-1">
                  <p className="font-semibold">
                    Session {session.sessionNumber}
                  </p>
                  <p className="text-sm text-gray-600">
                    {new Date(session.startDate).toLocaleDateString('en-SG', {
                      weekday: 'short',
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
                <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                  {session.status}
                </span>
              </label>
            ))}
          </div>

          {/* Summary */}
          <div className="mt-6 p-4 bg-orange-50 rounded-lg">
            <p className="text-sm text-gray-700">
              You've selected <strong>{selectedSessions.size} of {sessions.length}</strong> sessions
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-6 border-t bg-gray-50 flex gap-3 sticky bottom-0">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-full font-semibold text-gray-700 hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || selectedSessions.size === 0}
            className="flex-1 px-4 py-2 bg-errandify-orange text-white rounded-full font-semibold hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Accepting...' : `Accept ${selectedSessions.size} Sessions`}
          </button>
        </div>
      </div>
    </div>
  );
}
