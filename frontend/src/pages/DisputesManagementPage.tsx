import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

interface Dispute {
  id: number;
  taskTitle: string;
  status: 'open' | 'pending_review' | 'resolved' | 'appeal_pending';
  raisedBy: string;
  reason: string;
  description: string;
  evidence: string[];
  createdAt: string;
  resolvedAt?: string;
  resolution?: string;
}

export default function DisputesManagementPage() {
  const navigate = useNavigate();
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'open' | 'resolved'>('all');
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [showRaiseDispute, setShowRaiseDispute] = useState(false);

  useEffect(() => {
    fetchDisputes();
  }, []);

  const fetchDisputes = async () => {
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/disputes`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        }
      );
      setDisputes(response.data.data || []);
    } catch (err) {
      console.error('Failed to fetch disputes:', err);
      setDisputes([
        {
          id: 1,
          taskTitle: 'Home Cleaning - Incomplete Work',
          status: 'open',
          raisedBy: 'You',
          reason: 'incomplete_work',
          description: 'Doer did not complete the cleaning as agreed. Left several rooms untouched.',
          evidence: ['photo1.jpg', 'photo2.jpg'],
          createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: 2,
          taskTitle: 'Moving Help - Quality Issue',
          status: 'resolved',
          raisedBy: 'Mike',
          reason: 'quality_issue',
          description: 'Some items were damaged during the move.',
          evidence: [],
          createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
          resolvedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
          resolution: 'Refund SGD $150 issued to customer',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleRaiseDispute = async (taskId: number, reason: string, description: string) => {
    try {
      await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/disputes`,
        { taskId, reason, description },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        }
      );
      fetchDisputes();
      setShowRaiseDispute(false);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to raise dispute');
    }
  };

  const handleCancelTask = async (taskId: number) => {
    if (!window.confirm('Are you sure you want to cancel this errand? A refund will be issued.')) return;

    try {
      await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/tasks/${taskId}/cancel`,
        {},
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        }
      );
      alert('✅ Errand cancelled. Refund will be processed.');
      fetchDisputes();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to cancel errand');
    }
  };

  const filteredDisputes = disputes.filter(d =>
    filter === 'all' ? true : filter === 'open' ? ['open', 'pending_review'].includes(d.status) : d.status === 'resolved'
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-red-100 text-red-700';
      case 'pending_review':
        return 'bg-yellow-100 text-yellow-700';
      case 'resolved':
        return 'bg-green-100 text-green-700';
      case 'appeal_pending':
        return 'bg-orange-100 text-errandify-orange-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-errandify-bg px-4 py-4"><p className="text-center py-12">Loading...</p></div>;
  }

  return (
    <div className="min-h-screen bg-errandify-bg px-4 py-4 pb-20">
      <div className="max-w-2xl mx-auto">
        <button onClick={() => navigate(-1)} className="mb-4 text-lg text-gray-600 font-bold">‹ Back</button>
        <h1 className="text-2xl font-bold text-errandify-brown mb-6">⚖️ Disputes & Cancellations</h1>

        {/* Action Buttons */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setShowRaiseDispute(true)}
            className="flex-1 bg-red-600 text-white py-2 rounded-lg font-semibold hover:bg-red-700 transition text-sm"
          >
            🚨 Raise Dispute
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-4 bg-white rounded-lg p-1">
          {(['all', 'open', 'resolved'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-1 py-2 rounded-lg font-semibold text-sm transition ${
                filter === f
                  ? 'bg-errandify-orange text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              {f === 'all' ? 'All' : f === 'open' ? '🔴 Open' : '✅ Resolved'}
            </button>
          ))}
        </div>

        {/* Disputes List */}
        {filteredDisputes.length === 0 ? (
          <div className="bg-white rounded-lg p-8 text-center border border-gray-200">
            <p className="text-gray-500">
              {filter === 'open' ? 'No open disputes' : 'No resolved disputes'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredDisputes.map(dispute => (
              <div key={dispute.id} className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-800">{dispute.taskTitle}</h3>
                    <p className="text-xs text-gray-600 mt-1">Raised by: {dispute.raisedBy}</p>
                  </div>
                  <span className={`text-xs px-3 py-1 rounded-full font-semibold ${getStatusColor(dispute.status)}`}>
                    {dispute.status === 'open'
                      ? '🔴 Open'
                      : dispute.status === 'pending_review'
                        ? '⏳ Pending'
                        : dispute.status === 'resolved'
                          ? '✅ Resolved'
                          : '🔵 Appeal'}
                  </span>
                </div>

                <p className="text-sm text-gray-700 mb-2">{dispute.description}</p>

                {dispute.resolution && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-2 mb-2">
                    <p className="text-xs font-semibold text-green-700">✅ Resolution: {dispute.resolution}</p>
                  </div>
                )}

                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>
                    Created: {new Date(dispute.createdAt).toLocaleDateString('en-SG')}
                  </span>
                  {dispute.evidence.length > 0 && (
                    <span>📎 {dispute.evidence.length} files</span>
                  )}
                </div>

                {dispute.status === 'open' && (
                  <button
                    onClick={() => setSelectedDispute(dispute)}
                    className="mt-3 w-full text-xs bg-orange-100 text-errandify-orange-700 px-3 py-2 rounded-lg hover:bg-orange-200 transition font-medium"
                  >
                    View & Update
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
