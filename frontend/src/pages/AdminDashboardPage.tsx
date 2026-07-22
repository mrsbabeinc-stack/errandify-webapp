import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

interface DashboardData {
  stats: {
    totalUsers: number;
    totalTasks: number;
    openTasks: number;
    completedTasks: number;
    totalBids: number;
    openDisputes: number;
    totalValueCompleted: number;
    totalRatings: number;
    averageRating: number;
  };
  screening: {
    totalScreenings: number;
    cypaConvictions: number;
    womensCharterConvictions: number;
    penalCodeConvictions: number;
    elderAbuseConvictions: number;
    dishonestyConvictions: number;
  };
  recentActivity: any[];
}

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'disputes' | 'screening' | 'users'>('overview');

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/admin/dashboard`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setDashboard(response.data.data);
    } catch (error) {
      console.error('Failed to fetch dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-4">⚙️</div>
          <p className="text-gray-600">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow p-8 text-center max-w-md">
          <p className="text-red-600 font-semibold">Access denied</p>
          <p className="text-gray-600 text-sm mt-2">You need admin access to view this page</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-6">
      <div className="max-w-7xl mx-auto">
        <button onClick={() => navigate(-1)} className="mb-4 text-lg text-gray-600 font-bold">‹ Back</button>
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">⚙️ Admin Dashboard</h1>
          <p className="text-gray-600">Platform overview and management</p>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-lg mb-8">
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex-1 px-6 py-4 font-semibold transition ${
                activeTab === 'overview'
                  ? 'bg-orange-100 text-errandify-orange-900 border-b-4 border-errandify-orange-600'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              📊 Overview
            </button>
            <button
              onClick={() => setActiveTab('disputes')}
              className={`flex-1 px-6 py-4 font-semibold transition ${
                activeTab === 'disputes'
                  ? 'bg-orange-100 text-orange-900 border-b-4 border-orange-600'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              ⚖️ Disputes ({dashboard.stats.openDisputes})
            </button>
            <button
              onClick={() => setActiveTab('screening')}
              className={`flex-1 px-6 py-4 font-semibold transition ${
                activeTab === 'screening'
                  ? 'bg-red-100 text-red-900 border-b-4 border-red-600'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              🛡️ Screening ({dashboard.screening.totalScreenings})
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`flex-1 px-6 py-4 font-semibold transition ${
                activeTab === 'users'
                  ? 'bg-green-100 text-green-900 border-b-4 border-green-600'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              👥 Users ({dashboard.stats.totalUsers})
            </button>
          </div>

          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="p-8">
              {/* Key Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-gradient-to-br from-errandify-orange-100 to-errandify-orange-50 rounded-lg p-6 border-l-4 border-errandify-orange-600">
                  <p className="text-gray-600 text-sm font-semibold mb-2">👥 Total Users</p>
                  <p className="text-4xl font-bold text-errandify-orange-600">{dashboard.stats.totalUsers}</p>
                </div>
                <div className="bg-gradient-to-br from-green-100 to-green-50 rounded-lg p-6 border-l-4 border-green-600">
                  <p className="text-gray-600 text-sm font-semibold mb-2">📋 Total Errands</p>
                  <p className="text-4xl font-bold text-green-600">{dashboard.stats.totalTasks}</p>
                </div>
                <div className="bg-gradient-to-br from-yellow-100 to-yellow-50 rounded-lg p-6 border-l-4 border-yellow-600">
                  <p className="text-gray-600 text-sm font-semibold mb-2">🚀 Open Errands</p>
                  <p className="text-4xl font-bold text-yellow-600">{dashboard.stats.openTasks}</p>
                </div>
                <div className="bg-gradient-to-br from-purple-100 to-purple-50 rounded-lg p-6 border-l-4 border-purple-600">
                  <p className="text-gray-600 text-sm font-semibold mb-2">✅ Completed Errands</p>
                  <p className="text-4xl font-bold text-purple-600">{dashboard.stats.completedTasks}</p>
                </div>
              </div>

              {/* Value & Engagement */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white rounded-lg shadow p-6">
                  <p className="text-gray-600 text-sm font-semibold mb-2">💰 Total Value Completed</p>
                  <p className="text-3xl font-bold text-green-600">SGD ${dashboard.stats.totalValueCompleted.toLocaleString()}</p>
                  <p className="text-xs text-gray-500 mt-2">Platform processed value</p>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <p className="text-gray-600 text-sm font-semibold mb-2">⭐ Average Rating</p>
                  <p className="text-3xl font-bold text-yellow-500">
                    {dashboard.stats.averageRating.toFixed(1)}
                  </p>
                  <p className="text-xs text-gray-500 mt-2">Across {dashboard.stats.totalRatings} ratings</p>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <p className="text-gray-600 text-sm font-semibold mb-2">🎯 Offer Conversion</p>
                  <p className="text-3xl font-bold text-errandify-orange-600">
                    {dashboard.stats.totalTasks > 0
                      ? Math.round((dashboard.stats.totalBids / dashboard.stats.totalTasks) * 100)
                      : 0}
                    %
                  </p>
                  <p className="text-xs text-gray-500 mt-2">{dashboard.stats.totalBids} total offers</p>
                </div>
              </div>

              {/* Criminal Screening Stats */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-xl font-bold text-gray-800 mb-6">🛡️ Criminal Screening Statistics</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <p className="text-gray-600 text-sm font-semibold mb-2">📋 Total Screenings</p>
                    <p className="text-3xl font-bold text-gray-800">{dashboard.screening.totalScreenings}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 text-sm font-semibold mb-2">👶 CYPA Convictions</p>
                    <p className="text-3xl font-bold text-red-600">{dashboard.screening.cypaConvictions}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 text-sm font-semibold mb-2">👩 Women's Charter</p>
                    <p className="text-3xl font-bold text-red-600">
                      {dashboard.screening.womensCharterConvictions}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600 text-sm font-semibold mb-2">⚖️ Penal Code</p>
                    <p className="text-3xl font-bold text-red-600">{dashboard.screening.penalCodeConvictions}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 text-sm font-semibold mb-2">👴 VAA 2018</p>
                    <p className="text-3xl font-bold text-red-600">{dashboard.screening.elderAbuseConvictions}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 text-sm font-semibold mb-2">💰 Dishonesty</p>
                    <p className="text-3xl font-bold text-red-600">{dashboard.screening.dishonestyConvictions}</p>
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="mt-8 bg-white rounded-lg shadow p-6">
                <h3 className="text-xl font-bold text-gray-800 mb-4">📜 Recent Activity</h3>
                <div className="space-y-3 max-h-[300px] overflow-y-auto">
                  {dashboard.recentActivity.map((activity, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-3 hover:bg-gray-50 rounded">
                      <span className="text-lg">
                        {activity.event_type === 'task_created' ? '📋' : '⚖️'}
                      </span>
                      <div className="flex-1">
                        <p className="font-semibold text-gray-800">{activity.description}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(activity.timestamp).toLocaleDateString('en-SG')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Disputes Tab */}
          {activeTab === 'disputes' && (
            <div className="p-8">
              <div className="space-y-4">
                {dashboard.stats.openDisputes > 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-600 text-lg">⏳ {dashboard.stats.openDisputes} disputes awaiting review</p>
                    <p className="text-gray-400 text-sm mt-2">Use /api/admin/disputes endpoint for full list</p>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <p className="text-green-600 text-lg font-semibold">✅ All disputes resolved!</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Screening Tab */}
          {activeTab === 'screening' && (
            <div className="p-8">
              <div className="space-y-4">
                <p className="text-gray-600">
                  Total screenings completed: <strong>{dashboard.screening.totalScreenings}</strong>
                </p>
                <p className="text-gray-600">
                  Users with convictions: <strong>{
                    dashboard.screening.cypaConvictions +
                    dashboard.screening.womensCharterConvictions +
                    dashboard.screening.penalCodeConvictions +
                    dashboard.screening.elderAbuseConvictions +
                    dashboard.screening.dishonestyConvictions
                  }</strong>
                </p>
                <p className="text-gray-400 text-sm mt-4">Use /api/admin/screening endpoint for detailed review</p>
              </div>
            </div>
          )}

          {/* Users Tab */}
          {activeTab === 'users' && (
            <div className="p-8">
              <div className="space-y-4">
                <p className="text-gray-600">
                  Total active users: <strong>{dashboard.stats.totalUsers}</strong>
                </p>
                <p className="text-gray-600">
                  Platform engagement: <strong>{
                    Math.round((dashboard.stats.completedTasks / Math.max(dashboard.stats.totalTasks, 1)) * 100)
                  }%</strong> errand completion rate
                </p>
                <p className="text-gray-400 text-sm mt-4">Use /api/admin/users endpoint for user management</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
