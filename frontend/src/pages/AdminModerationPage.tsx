import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

interface AdminNotification {
  id: number;
  type: 'flagged_message' | 'user_suspended';
  severity: 'low' | 'medium' | 'high';
  userId: number;
  userName: string;
  userEmail: string;
  message: string;
  details: {
    messageId?: number;
    taskId?: number;
    taskTitle?: string;
    content?: string;
    flagCount?: number;
    reason?: string;
    suspendedUntil?: string;
  };
  createdAt: string;
  resolved: boolean;
}

interface ViolationStats {
  totalFlagged: number;
  totalSuspended: number;
  activeNotifications: number;
}

export default function AdminModerationPage() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [stats, setStats] = useState<ViolationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'flagged' | 'suspended'>('all');
  const [selectedNotification, setSelectedNotification] = useState<AdminNotification | null>(null);

  useEffect(() => {
    checkAdmin();
    fetchNotifications();
  }, [filterType]);

  const checkAdmin = async () => {
    try {
      const user = localStorage.getItem('user');
      if (!user) {
        navigate('/login');
        return;
      }
      const userData = JSON.parse(user);
      if (userData.role !== 'admin') {
        navigate('/home');
      }
    } catch {
      navigate('/login');
    }
  };

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/admin/moderation`,
        {
          headers: { Authorization: `Bearer ${token}` },
          params: { type: filterType !== 'all' ? filterType : undefined },
        }
      );

      if (response.data.success) {
        setNotifications(response.data.data.notifications || []);
        setStats(response.data.data.stats);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (notificationId: number) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/admin/moderation/${notificationId}/resolve`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setNotifications(notifications.map(n =>
        n.id === notificationId ? { ...n, resolved: true } : n
      ));
      setSelectedNotification(null);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to resolve');
    }
  };

  const handleSuspendUser = async (userId: number, days: number = 1) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/admin/users/${userId}/suspend`,
        { days },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      alert(`User suspended for ${days} day(s)`);
      fetchNotifications();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to suspend user');
    }
  };

  return (
    <div className="min-h-screen bg-errandify-bg p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/home')}
            className="text-errandify-orange font-semibold mb-3 text-sm"
          >
            ← Back
          </button>
          <h1 className="text-3xl font-bold text-errandify-brown mb-2">🛡️ Moderation Dashboard</h1>
          <p className="text-gray-600">Review flagged messages and manage violations</p>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-lg p-4 shadow">
              <p className="text-xs text-gray-600 mb-1">Total Flagged</p>
              <p className="text-3xl font-bold text-errandify-orange">{stats.totalFlagged}</p>
            </div>
            <div className="bg-white rounded-lg p-4 shadow">
              <p className="text-xs text-gray-600 mb-1">Suspended Users</p>
              <p className="text-3xl font-bold text-red-600">{stats.totalSuspended}</p>
            </div>
            <div className="bg-white rounded-lg p-4 shadow">
              <p className="text-xs text-gray-600 mb-1">Active Issues</p>
              <p className="text-3xl font-bold text-errandify-brown">{stats.activeNotifications}</p>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex gap-2 mb-6">
          {(['all', 'flagged', 'suspended'] as const).map(type => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-4 py-2 rounded-lg font-semibold text-sm transition ${
                filterType === type
                  ? 'bg-errandify-orange text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:border-errandify-orange'
              }`}
            >
              {type === 'all' ? '📋 All' : type === 'flagged' ? '🚩 Flagged Messages' : '🔒 Suspended Users'}
            </button>
          ))}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-red-700 text-sm">
            ⚠️ {error}
          </div>
        )}

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Notifications List */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow">
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <h2 className="font-bold text-errandify-brown">Violations & Issues</h2>
                <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                  {notifications.length} items
                </span>
              </div>

              {loading ? (
                <div className="p-8 text-center text-gray-500">
                  <p>Loading notifications...</p>
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <p>✓ No violations found</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {notifications.map(notif => (
                    <div
                      key={notif.id}
                      onClick={() => setSelectedNotification(notif)}
                      className={`p-4 hover:bg-gray-50 cursor-pointer transition ${
                        notif.resolved ? 'opacity-50' : ''
                      } ${selectedNotification?.id === notif.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''}`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2 flex-1">
                          <span className={`text-lg ${notif.type === 'flagged_message' ? '🚩' : '🔒'}`} />
                          <div className="flex-1">
                            <p className="font-semibold text-sm text-gray-900">
                              {notif.type === 'flagged_message' ? 'Flagged Message' : 'User Suspended'}
                            </p>
                            <p className="text-xs text-gray-600">
                              {notif.userName} ({notif.userEmail})
                            </p>
                          </div>
                        </div>
                        <span className={`text-xs font-semibold px-2 py-1 rounded ${
                          notif.severity === 'high' ? 'bg-red-100 text-red-800' :
                          notif.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {notif.severity.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 mb-2">{notif.message}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">
                          {new Date(notif.createdAt).toLocaleString()}
                        </span>
                        <span className={`text-xs font-semibold ${notif.resolved ? 'text-green-600' : 'text-orange-600'}`}>
                          {notif.resolved ? '✓ Resolved' : '⏳ Active'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Details Panel */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow sticky top-4">
              <div className="p-4 border-b border-gray-200">
                <h2 className="font-bold text-errandify-brown">Details</h2>
              </div>

              {selectedNotification ? (
                <div className="p-4 space-y-4">
                  {/* User Info */}
                  <div>
                    <p className="text-xs text-gray-600 font-semibold mb-1">User</p>
                    <p className="text-sm font-semibold text-gray-900">{selectedNotification.userName}</p>
                    <p className="text-xs text-gray-600">{selectedNotification.userEmail}</p>
                  </div>

                  {/* Type */}
                  <div>
                    <p className="text-xs text-gray-600 font-semibold mb-1">Type</p>
                    <p className="text-sm">
                      {selectedNotification.type === 'flagged_message' ? '🚩 Flagged Message' : '🔒 User Suspended'}
                    </p>
                  </div>

                  {/* Message Content */}
                  {selectedNotification.details.content && (
                    <div>
                      <p className="text-xs text-gray-600 font-semibold mb-1">Message</p>
                      <div className="bg-gray-50 p-2 rounded text-xs text-gray-900 max-h-24 overflow-y-auto">
                        {selectedNotification.details.content}
                      </div>
                    </div>
                  )}

                  {/* Task Info */}
                  {selectedNotification.details.taskTitle && (
                    <div>
                      <p className="text-xs text-gray-600 font-semibold mb-1">Errand</p>
                      <p className="text-sm">{selectedNotification.details.taskTitle}</p>
                      {selectedNotification.details.taskId && (
                        <button
                          onClick={() => window.open(`/errand/${selectedNotification.details.taskId}`, '_blank')}
                          className="text-xs text-errandify-orange hover:underline mt-1"
                        >
                          View Errand →
                        </button>
                      )}
                    </div>
                  )}

                  {/* Flag Count */}
                  {selectedNotification.details.flagCount !== undefined && (
                    <div>
                      <p className="text-xs text-gray-600 font-semibold mb-1">Violation Count</p>
                      <p className="text-sm">
                        <span className="font-bold text-red-600">{selectedNotification.details.flagCount}</span>
                        <span className="text-gray-600"> violations</span>
                      </p>
                    </div>
                  )}

                  {/* Suspension Info */}
                  {selectedNotification.details.reason && (
                    <div>
                      <p className="text-xs text-gray-600 font-semibold mb-1">Reason</p>
                      <p className="text-sm">{selectedNotification.details.reason}</p>
                    </div>
                  )}

                  {selectedNotification.details.suspendedUntil && (
                    <div>
                      <p className="text-xs text-gray-600 font-semibold mb-1">Suspended Until</p>
                      <p className="text-sm">
                        {new Date(selectedNotification.details.suspendedUntil).toLocaleString()}
                      </p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="pt-4 border-t border-gray-200 space-y-2">
                    {!selectedNotification.resolved && (
                      <>
                        <button
                          onClick={() => handleResolve(selectedNotification.id)}
                          className="w-full px-3 py-2 bg-green-500 text-white text-sm font-semibold rounded hover:bg-green-600 transition"
                        >
                          ✓ Mark Resolved
                        </button>
                        <button
                          onClick={() => handleSuspendUser(selectedNotification.userId, 1)}
                          className="w-full px-3 py-2 bg-red-500 text-white text-sm font-semibold rounded hover:bg-red-600 transition"
                        >
                          🔒 Suspend 1 Day
                        </button>
                        <button
                          onClick={() => handleSuspendUser(selectedNotification.userId, 7)}
                          className="w-full px-3 py-2 bg-red-600 text-white text-sm font-semibold rounded hover:bg-red-700 transition"
                        >
                          🔒 Suspend 7 Days
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-gray-500">
                  <p>← Select a violation to view details</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
