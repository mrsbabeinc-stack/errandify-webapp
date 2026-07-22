import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

interface Dispute {
  id: number;
  taskId: number;
  taskTitle: string;
  budget: number;
  filedBy: string;
  reason: string;
  description: string;
  evidence: string;
  status: string;
  adminNotes: string;
  resolution: string;
  createdAt: string;
  updatedAt: string;
}

export default function DisputePage() {
  const navigate = useNavigate();
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'open' | 'resolved' | 'all'>('all');
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [newEvidence, setNewEvidence] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchDisputes();
  }, [activeTab]);

  const fetchDisputes = async () => {
    try {
      const token = localStorage.getItem('token');
      const status = activeTab === 'all' ? 'all' : activeTab;
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/disputes?status=${status}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setDisputes(response.data.data.disputes);
    } catch (error) {
      console.error('Failed to fetch disputes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileDispute = (taskId: number) => {
    navigate(`/dispute/file/${taskId}`);
  };

  const handleAddEvidence = async (disputeId: number) => {
    if (!newEvidence.trim()) return;

    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/disputes/${disputeId}/evidence`,
        { evidence: newEvidence },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Update selected dispute
      if (selectedDispute) {
        setSelectedDispute({
          ...selectedDispute,
          evidence: response.data.data.evidence,
        });
      }

      setNewEvidence('');
    } catch (error) {
      console.error('Failed to add evidence:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-SG', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-yellow-100 text-yellow-800';
      case 'resolved':
        return 'bg-green-100 text-green-800';
      case 'appeal_pending':
        return 'bg-orange-100 text-errandify-orange-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open':
        return '⏳';
      case 'resolved':
        return '✅';
      case 'appeal_pending':
        return '📢';
      case 'rejected':
        return '❌';
      default:
        return '❓';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-4">⚖️</div>
          <p className="text-gray-600">Loading disputes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 py-8 px-6 pb-32">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">⚖️ Dispute Resolution</h1>
          <p className="text-gray-600">Manage errand disputes and resolutions</p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-yellow-500">
            <p className="text-gray-600 text-sm font-semibold">⏳ Open Disputes</p>
            <p className="text-3xl font-bold text-yellow-600 mt-2">
              {disputes.filter((d) => d.status === 'open').length}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
            <p className="text-gray-600 text-sm font-semibold">✅ Resolved</p>
            <p className="text-3xl font-bold text-green-600 mt-2">
              {disputes.filter((d) => d.status === 'resolved').length}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-errandify-orange-500">
            <p className="text-gray-600 text-sm font-semibold">📢 Appeals</p>
            <p className="text-3xl font-bold text-errandify-orange-600 mt-2">
              {disputes.filter((d) => d.status === 'appeal_pending').length}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-lg mb-8">
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab('open')}
              className={`flex-1 px-6 py-4 font-semibold transition ${
                activeTab === 'open'
                  ? 'bg-yellow-100 text-yellow-900 border-b-4 border-yellow-500'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              ⏳ Open ({disputes.filter((d) => d.status === 'open').length})
            </button>
            <button
              onClick={() => setActiveTab('resolved')}
              className={`flex-1 px-6 py-4 font-semibold transition ${
                activeTab === 'resolved'
                  ? 'bg-green-100 text-green-900 border-b-4 border-green-500'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              ✅ Resolved ({disputes.filter((d) => d.status === 'resolved').length})
            </button>
            <button
              onClick={() => setActiveTab('all')}
              className={`flex-1 px-6 py-4 font-semibold transition ${
                activeTab === 'all'
                  ? 'bg-gray-100 text-gray-900 border-b-4 border-gray-500'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              📊 All ({disputes.length})
            </button>
          </div>

          {/* Disputes List */}
          <div className="p-6">
            {disputes.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 text-lg mb-4">No disputes found</p>
                <p className="text-gray-400 text-sm">
                  You don't have any disputes in this category
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {disputes.map((dispute) => (
                  <div
                    key={dispute.id}
                    className="border rounded-lg p-4 hover:shadow-lg transition cursor-pointer"
                    onClick={() => {
                      setSelectedDispute(dispute);
                      setShowDetail(true);
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(dispute.status)}`}>
                            {getStatusIcon(dispute.status)} {dispute.status.toUpperCase()}
                          </span>
                        </div>
                        <h3 className="text-lg font-bold text-gray-800 mb-1">
                          {dispute.taskTitle}
                        </h3>
                        <p className="text-sm text-gray-600 mb-2">
                          <strong>Reason:</strong> {dispute.reason}
                        </p>
                        <p className="text-sm text-gray-600 mb-2">
                          <strong>Filed by:</strong> {dispute.filedBy} • <strong>Budget:</strong> SGD ${dispute.budget}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatDate(dispute.createdAt)}
                        </p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedDispute(dispute);
                          setShowDetail(true);
                        }}
                        className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition font-semibold ml-4"
                      >
                        View Details →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {showDetail && selectedDispute && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-gradient-to-r from-red-600 to-orange-600 text-white p-6 flex justify-between items-center">
              <h2 className="text-2xl font-bold">Dispute #{selectedDispute.id}</h2>
              <button
                onClick={() => setShowDetail(false)}
                className="text-2xl hover:opacity-80"
              >
                ×
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Status */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 font-semibold mb-2">Status</p>
                <span className={`inline-block px-4 py-2 rounded-full text-sm font-bold ${getStatusColor(selectedDispute.status)}`}>
                  {getStatusIcon(selectedDispute.status)} {selectedDispute.status.toUpperCase()}
                </span>
              </div>

              {/* Task Info */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 font-semibold mb-2">Errand Information</p>
                <p className="text-lg font-bold text-gray-800 mb-1">{selectedDispute.taskTitle}</p>
                <p className="text-sm text-gray-600">Budget: SGD ${selectedDispute.budget}</p>
              </div>

              {/* Dispute Details */}
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-bold text-gray-800 mb-2">Reason</p>
                  <p className="text-gray-700 px-3 py-2 bg-gray-50 rounded">{selectedDispute.reason}</p>
                </div>

                <div>
                  <p className="text-sm font-bold text-gray-800 mb-2">Description</p>
                  <p className="text-gray-700 px-3 py-2 bg-gray-50 rounded whitespace-pre-wrap">
                    {selectedDispute.description || 'No description provided'}
                  </p>
                </div>

                <div>
                  <p className="text-sm font-bold text-gray-800 mb-2">Evidence</p>
                  <div className="px-3 py-2 bg-gray-50 rounded max-h-[200px] overflow-y-auto">
                    {selectedDispute.evidence ? (
                      <p className="text-gray-700 whitespace-pre-wrap">{selectedDispute.evidence}</p>
                    ) : (
                      <p className="text-gray-400">No evidence provided yet</p>
                    )}
                  </div>
                </div>

                {/* Add Evidence */}
                {selectedDispute.status === 'open' && (
                  <div>
                    <p className="text-sm font-bold text-gray-800 mb-2">Add Evidence</p>
                    <textarea
                      value={newEvidence}
                      onChange={(e) => setNewEvidence(e.target.value)}
                      placeholder="Add photos, messages, or other evidence..."
                      maxLength={500}
                      rows={3}
                      className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-errandify-orange-500 resize-none"
                    />
                    <div className="flex justify-between items-center mt-2">
                      <p className="text-xs text-gray-500">{newEvidence.length}/500</p>
                      <button
                        onClick={() => handleAddEvidence(selectedDispute.id)}
                        disabled={submitting || !newEvidence.trim()}
                        className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 transition font-semibold"
                      >
                        {submitting ? '📤 Uploading...' : '📤 Add Evidence'}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Resolution Info */}
              {selectedDispute.status === 'resolved' && (
                <div className="p-4 bg-green-50 border-2 border-green-300 rounded-lg">
                  <p className="text-sm font-bold text-green-900 mb-2">Resolution</p>
                  <p className="text-green-800 font-semibold mb-2">{selectedDispute.resolution}</p>
                  {selectedDispute.adminNotes && (
                    <p className="text-sm text-green-700 italic">{selectedDispute.adminNotes}</p>
                  )}
                </div>
              )}

              {/* Admin Notes */}
              {selectedDispute.adminNotes && selectedDispute.status !== 'resolved' && (
                <div className="p-4 bg-orange-50 rounded-lg">
                  <p className="text-sm font-bold text-errandify-orange-900 mb-2">Admin Notes</p>
                  <p className="text-errandify-orange-800">{selectedDispute.adminNotes}</p>
                </div>
              )}

              {/* Timeline */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm font-bold text-gray-800 mb-3">Timeline</p>
                <div className="space-y-2 text-sm text-gray-600">
                  <p>
                    <strong>Filed:</strong> {formatDate(selectedDispute.createdAt)}
                  </p>
                  {selectedDispute.updatedAt !== selectedDispute.createdAt && (
                    <p>
                      <strong>Updated:</strong> {formatDate(selectedDispute.updatedAt)}
                    </p>
                  )}
                </div>
              </div>

              {/* Actions */}
              {selectedDispute.status === 'resolved' && (
                <div className="p-4 bg-orange-50 border-2 border-errandify-orange-300 rounded-lg">
                  <p className="text-sm text-errandify-orange-900 font-semibold mb-3">Options</p>
                  <button className="w-full px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-semibold">
                    📢 Appeal Decision
                  </button>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-gray-100 px-6 py-4 flex gap-3 justify-end">
              <button
                onClick={() => setShowDetail(false)}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
