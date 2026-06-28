import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

interface Errand {
  id: number;
  errand_id?: string;
  title: string;
  category: string;
  budget: number;
  status: string;
  location?: string;
  postal_code?: string;
  deadline?: string;
  createdAt?: string;
  created_at?: string;
  description?: string;
  askerId?: number;
  asker_id?: number;
}

export default function MyErrands() {
  const navigate = useNavigate();
  const [errands, setErrands] = useState<Errand[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    fetchMyErrands();
    const interval = setInterval(fetchMyErrands, 3000);
    return () => clearInterval(interval);
  }, []);

  const fetchMyErrands = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/errands/my-errands`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setErrands(response.data.data || []);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load errands');
    } finally {
      setLoading(false);
    }
  };

  const getPendingAction = (errand: Errand) => {
    if (errand.status === 'completed') return { type: 'awaiting_rating', label: '⚠️ Rate Now' };
    if (errand.status === 'completed_awaiting_payment') return { type: 'awaiting_payment', label: '💳 Approve Payment' };
    return null;
  };

  const getStatusColor = (errand: Errand) => {
    const pendingAction = getPendingAction(errand);
    if (pendingAction?.type === 'awaiting_rating') return 'bg-red-100 border-l-4 border-red-500';
    if (pendingAction?.type === 'awaiting_payment') return 'bg-orange-100 border-l-4 border-orange-500';
    if (errand.status === 'in_progress') return 'bg-blue-100 border-l-4 border-blue-500';
    if (errand.status === 'rated') return 'bg-green-100 border-l-4 border-green-500';
    return 'bg-gray-50 border-l-4 border-gray-300';
  };

  const getStatusBadge = (errand: Errand) => {
    const pendingAction = getPendingAction(errand);
    if (pendingAction) {
      return (
        <span className="inline-block px-2 py-1 bg-red-500 text-white text-xs font-bold rounded-full ml-2">
          {pendingAction.label}
        </span>
      );
    }
    return null;
  };

  const sortedErrands = [...errands].sort((a, b) => {
    // Sort by pending action first
    const aPending = getPendingAction(a) ? 0 : 1;
    const bPending = getPendingAction(b) ? 0 : 1;
    if (aPending !== bPending) return aPending - bPending;

    // Then by status: active -> pending -> completed
    const statusOrder = { posted: 0, confirmed: 1, in_progress: 2, completed: 3, rated: 4, cancelled: 5 };
    const aOrder = statusOrder[a.status as keyof typeof statusOrder] ?? 99;
    const bOrder = statusOrder[b.status as keyof typeof statusOrder] ?? 99;
    return aOrder - bOrder;
  });

  const filteredErrands = filterStatus === 'all'
    ? sortedErrands
    : sortedErrands.filter(e => e.status === filterStatus);

  const pendingCount = errands.filter(e => getPendingAction(e)).length;

  if (loading) return <div className="p-6 text-center">Loading your errands...</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 pb-20">
      <div className="max-w-2xl mx-auto p-4">
        {/* Header with pending count */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-green-800 mb-2">My Errands</h1>
          {pendingCount > 0 && (
            <div className="inline-block px-3 py-1 bg-red-500 text-white rounded-full text-sm font-bold">
              {pendingCount} pending action{pendingCount !== 1 ? 's' : ''}
            </div>
          )}
        </div>

        {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded text-sm">{error}</div>}

        {/* Status Filter */}
        <div className="mb-4 flex gap-2 overflow-x-auto pb-2">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap transition ${
              filterStatus === 'all'
                ? 'bg-green-600 text-white'
                : 'bg-white border border-green-300 text-green-700 hover:bg-green-50'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilterStatus('posted')}
            className={`px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap transition ${
              filterStatus === 'posted'
                ? 'bg-green-600 text-white'
                : 'bg-white border border-green-300 text-green-700 hover:bg-green-50'
            }`}
          >
            📝 Posted
          </button>
          <button
            onClick={() => setFilterStatus('confirmed')}
            className={`px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap transition ${
              filterStatus === 'confirmed'
                ? 'bg-green-600 text-white'
                : 'bg-white border border-green-300 text-green-700 hover:bg-green-50'
            }`}
          >
            ✅ Confirmed
          </button>
          <button
            onClick={() => setFilterStatus('in_progress')}
            className={`px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap transition ${
              filterStatus === 'in_progress'
                ? 'bg-green-600 text-white'
                : 'bg-white border border-green-300 text-green-700 hover:bg-green-50'
            }`}
          >
            🔄 In Progress
          </button>
          <button
            onClick={() => setFilterStatus('completed')}
            className={`px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap transition ${
              filterStatus === 'completed'
                ? 'bg-green-600 text-white'
                : 'bg-white border border-green-300 text-green-700 hover:bg-green-50'
            }`}
          >
            ✓ Complete
          </button>
        </div>

        {/* Errands List */}
        {filteredErrands.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600">No errands found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredErrands.map((errand) => (
              <div
                key={errand.id}
                onClick={() => navigate(`/errands/${errand.id}`)}
                className={`p-4 rounded-lg cursor-pointer transition transform hover:shadow-lg hover:scale-102 ${getStatusColor(errand)}`}
              >
                {/* Top row: Errand ID + Pending badge */}
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-xs font-bold text-gray-600">
                    {errand.errand_id || `ER-${errand.id}`}
                  </span>
                  {getStatusBadge(errand)}
                </div>

                {/* Title */}
                <h3 className="font-semibold text-lg text-gray-800 mb-2">{errand.title}</h3>

                {/* Details row: Category, Location, Date */}
                <div className="grid grid-cols-3 gap-2 text-xs text-gray-700 mb-2">
                  <div className="flex items-center gap-1">
                    <span>📁</span>
                    <span>{errand.category}</span>
                  </div>
                  {errand.location && (
                    <div className="flex items-center gap-1">
                      <span>📍</span>
                      <span className="truncate">{errand.location}</span>
                    </div>
                  )}
                  {errand.postal_code && (
                    <div className="flex items-center gap-1">
                      <span>🏘️</span>
                      <span>{errand.postal_code}</span>
                    </div>
                  )}
                </div>

                {/* Date and amount row */}
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-1 text-gray-600">
                    <span>📅</span>
                    <span>
                      {errand.deadline
                        ? new Date(errand.deadline).toLocaleDateString('en-SG', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })
                        : 'No date'}
                    </span>
                  </div>
                  <div className="font-bold text-green-700">
                    ${errand.budget.toFixed(2)}
                  </div>
                </div>

                {/* Status label */}
                <div className="mt-2 text-xs font-medium text-gray-600 capitalize">
                  Status: {errand.status.replace(/_/g, ' ')}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
