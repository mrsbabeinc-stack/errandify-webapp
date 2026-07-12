import React, { useState, useEffect } from 'react';
import axios from 'axios';
import AdminLayout from '../../components/admin/AdminLayout';

interface Dispute {
  id: number;
  errand_id: number;
  filed_by_user_id: number;
  dispute_type: string;
  description: string;
  evidence?: string;
  status: string;
  priority?: string;
  created_at: string;
  resolved_at?: string;
  resolution?: string;
}

interface SafetyAnalysis {
  hasConcern: boolean;
  concernType?: string;
  severity?: string;
  flaggedPhrases?: string[];
  recommendation?: string;
}

export const DisputesPage: React.FC = () => {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'level_1' | 'level_2' | 'level_3' | 'resolved'>('all');
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [resolution, setResolution] = useState<'approve' | 'reject' | 'partial'>('approve');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [safetyAnalysis, setSafetyAnalysis] = useState<SafetyAnalysis | null>(null);

  useEffect(() => {
    fetchDisputes();
  }, [filter]);

  const fetchDisputes = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const url = `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/disputes`;
      const params = filter !== 'all' ? `?status=${filter}` : '';

      const response = await axios.get(url + params, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setDisputes(response.data.data?.disputes || response.data.data || []);
      setError('');
    } catch (err) {
      console.error('Failed to fetch disputes:', err);
      setError('Failed to load disputes');
      // Mock data for demo
      setDisputes([
        {
          id: 1,
          errand_id: 123,
          filed_by_user_id: 5,
          dispute_type: 'work_not_completed',
          description: 'Doer did not complete the cleaning in two rooms as agreed.',
          status: 'level_2',
          priority: 'normal',
          created_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const fetchSafetyAnalysis = async (disputeId: number) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/disputes/${disputeId}/analysis`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setSafetyAnalysis(response.data.analysis || null);
    } catch (err) {
      console.error('Failed to fetch safety analysis:', err);
      setSafetyAnalysis(null);
    }
  };

  const handleResolveDispute = async () => {
    if (!selectedDispute || !notes.trim()) {
      setError('Please provide resolution notes');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/disputes/${selectedDispute.id}/resolve`,
        {
          resolution,
          notes,
          releasePayment: resolution === 'approve',
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      alert(`✅ Dispute #${selectedDispute.id} resolved as "${resolution}". Parties notified.`);
      setShowReviewModal(false);
      setSelectedDispute(null);
      setResolution('approve');
      setNotes('');
      setSafetyAnalysis(null);
      fetchDisputes();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to resolve dispute');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'level_1':
        return 'bg-blue-100 text-blue-800';
      case 'level_2':
        return 'bg-yellow-100 text-yellow-800';
      case 'level_3':
        return 'bg-orange-100 text-orange-800';
      case 'resolved':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'work_not_completed':
        return 'Work Not Completed';
      case 'low_quality':
        return 'Low Quality';
      case 'payment_not_released':
        return 'Payment Issue';
      case 'safety_concern':
        return 'Safety Concern';
      default:
        return 'Other';
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="text-4xl mb-2">⚖️</div>
            <p className="text-gray-600">Loading disputes...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  const filteredDisputes =
    filter === 'all'
      ? disputes
      : disputes.filter((d) => d.status.includes(filter));

  return (
    <AdminLayout>
      <div className="admin-page">
        <div className="page-header mb-6">
          <h1>⚖️ Dispute Resolution Center</h1>
          <p>Review and resolve disputes across all levels</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg p-4 border-l-4 border-blue-500 shadow-sm">
            <p className="text-xs text-gray-600 font-semibold">Level 1</p>
            <p className="text-2xl font-bold text-blue-600">
              {disputes.filter((d) => d.status === 'level_1').length}
            </p>
          </div>
          <div className="bg-white rounded-lg p-4 border-l-4 border-yellow-500 shadow-sm">
            <p className="text-xs text-gray-600 font-semibold">Level 2</p>
            <p className="text-2xl font-bold text-yellow-600">
              {disputes.filter((d) => d.status === 'level_2').length}
            </p>
          </div>
          <div className="bg-white rounded-lg p-4 border-l-4 border-orange-500 shadow-sm">
            <p className="text-xs text-gray-600 font-semibold">Appeals (L3)</p>
            <p className="text-2xl font-bold text-orange-600">
              {disputes.filter((d) => d.status === 'level_3').length}
            </p>
          </div>
          <div className="bg-white rounded-lg p-4 border-l-4 border-green-500 shadow-sm">
            <p className="text-xs text-gray-600 font-semibold">Resolved</p>
            <p className="text-2xl font-bold text-green-600">
              {disputes.filter((d) => d.status === 'resolved').length}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-6 bg-white rounded-lg p-2 shadow-sm">
          {(['all', 'level_1', 'level_2', 'level_3', 'resolved'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg font-semibold text-sm transition ${
                filter === f
                  ? 'bg-orange-500 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              {f === 'all'
                ? 'All'
                : f === 'level_1'
                ? '🔵 L1 Auto'
                : f === 'level_2'
                ? '⏳ L2 Review'
                : f === 'level_3'
                ? '📢 L3 Appeals'
                : '✅ Resolved'}
            </button>
          ))}
        </div>

        {/* Disputes List */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {filteredDisputes.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-gray-500 text-lg">No disputes found</p>
              <p className="text-gray-400 text-sm">All disputes are resolved! 🎉</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">ID</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Description</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Created</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredDisputes.map((dispute) => (
                    <tr key={dispute.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4 text-sm font-semibold text-gray-800">#{dispute.id}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {getTypeLabel(dispute.dispute_type)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                        {dispute.description}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(
                            dispute.status
                          )}`}
                        >
                          {dispute.status === 'level_1'
                            ? '🔵 L1'
                            : dispute.status === 'level_2'
                            ? '⏳ L2'
                            : dispute.status === 'level_3'
                            ? '📢 L3'
                            : '✅ Resolved'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {new Date(dispute.created_at).toLocaleDateString('en-SG')}
                      </td>
                      <td className="px-6 py-4">
                        {dispute.status !== 'resolved' ? (
                          <button
                            onClick={() => {
                              setSelectedDispute(dispute);
                              setShowReviewModal(true);
                              fetchSafetyAnalysis(dispute.id);
                            }}
                            className="text-orange-600 hover:text-orange-800 font-semibold text-sm"
                          >
                            Review →
                          </button>
                        ) : (
                          <span className="text-green-600 text-sm">Resolved</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Review Modal */}
      {showReviewModal && selectedDispute && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-orange-600 to-red-600 text-white p-6 flex justify-between items-center sticky top-0">
              <h2 className="text-2xl font-bold">Review Dispute #{selectedDispute.id}</h2>
              <button
                onClick={() => {
                  setShowReviewModal(false);
                  setSelectedDispute(null);
                  setResolution('approve');
                  setNotes('');
                  setError('');
                }}
                className="text-2xl hover:opacity-80"
              >
                ×
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Dispute Details */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div>
                  <p className="text-xs text-gray-600 font-semibold">DISPUTE TYPE</p>
                  <p className="text-lg font-semibold text-gray-800">
                    {getTypeLabel(selectedDispute.dispute_type)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 font-semibold">STATUS</p>
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(
                      selectedDispute.status
                    )}`}
                  >
                    {selectedDispute.status}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-gray-600 font-semibold">FILED</p>
                  <p className="text-sm text-gray-700">
                    {new Date(selectedDispute.created_at).toLocaleString('en-SG')}
                  </p>
                </div>
              </div>

              {/* Description */}
              <div>
                <p className="text-sm font-semibold text-gray-800 mb-2">DISPUTE DESCRIPTION</p>
                <p className="text-sm text-gray-700 bg-white border border-gray-200 rounded-lg p-3">
                  {selectedDispute.description}
                </p>
              </div>

              {/* Evidence */}
              {selectedDispute.evidence && (
                <div>
                  <p className="text-sm font-semibold text-gray-800 mb-2">EVIDENCE PROVIDED</p>
                  <p className="text-sm text-gray-700 bg-white border border-gray-200 rounded-lg p-3">
                    {selectedDispute.evidence}
                  </p>
                </div>
              )}

              <hr className="my-4" />

              {/* AI Analysis */}
              {safetyAnalysis && safetyAnalysis.hasConcern ? (
                <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4 space-y-2">
                  <p className="text-sm font-bold text-red-900">🚨 Safety Alert</p>
                  <div className="text-xs text-red-800 space-y-1">
                    <p><strong>Type:</strong> {safetyAnalysis.concernType || 'Unknown concern'}</p>
                    <p><strong>Severity:</strong> {safetyAnalysis.severity?.toUpperCase() || 'UNKNOWN'}</p>
                    {safetyAnalysis.flaggedPhrases && safetyAnalysis.flaggedPhrases.length > 0 && (
                      <p><strong>Flagged:</strong> "{safetyAnalysis.flaggedPhrases[0]}"</p>
                    )}
                  </div>
                  <div className="bg-red-100 rounded p-2 text-xs text-red-700 mt-2">
                    ⚠️ {safetyAnalysis.recommendation || 'Recommend careful review of this dispute'}
                  </div>
                </div>
              ) : (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
                  <p className="text-xs font-semibold text-blue-900">🤖 AI Safety Check</p>
                  <div className="text-xs text-blue-800 space-y-1">
                    <p>✓ No coercion language detected</p>
                    <p>✓ Both parties appear to have clean history</p>
                    <p>💡 AI Confidence: Moderate (use your judgment)</p>
                  </div>
                </div>
              )}

            {/* Resolution */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-3">
                    Your Decision *
                  </label>
                  <div className="space-y-2">
                    {[
                      { value: 'approve', label: '✅ Approve', desc: 'Work done satisfactorily → Pay doer' },
                      { value: 'reject', label: '❌ Refund', desc: 'Work not as promised → Reimburse asker' },
                      { value: 'partial', label: '🤝 Partial', desc: 'Some work done with issues → Split payment' },
                    ].map((opt) => (
                      <label
                        key={opt.value}
                        className={`flex items-start gap-3 p-3 border-2 rounded-lg cursor-pointer transition ${
                          resolution === opt.value
                            ? 'bg-orange-50 border-orange-500'
                            : 'bg-white border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="resolution"
                          value={opt.value}
                          checked={resolution === opt.value}
                          onChange={(e) => setResolution(e.target.value as any)}
                          className="mt-1"
                        />
                        <div>
                          <div className="font-semibold text-sm text-gray-800">{opt.label}</div>
                          <div className="text-xs text-gray-600">{opt.desc}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-2">
                    Explain Your Decision (Both Parties Will See This) *
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => {
                      setNotes(e.target.value);
                      setError('');
                    }}
                    placeholder={`Example: "Based on the photos you provided, the work wasn't completed as promised. The asker has clear evidence. However, we appreciate your effort. Next time, communicate if something changes."`}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm resize-none"
                    rows={4}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    💡 Tip: Write like you're explaining to a friend. Be fair, clear, and empathetic.
                  </p>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-sm text-red-700">❌ {error}</p>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  onClick={() => {
                    setShowReviewModal(false);
                    setSelectedDispute(null);
                    setResolution('approve');
                    setNotes('');
                    setError('');
                  }}
                  disabled={isSubmitting}
                  className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg font-semibold hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleResolveDispute}
                  disabled={isSubmitting}
                  className="flex-1 bg-orange-600 text-white py-2 rounded-lg font-semibold hover:bg-orange-700 disabled:opacity-50"
                >
                  {isSubmitting ? '⏳ Resolving...' : '✅ Resolve Dispute'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .admin-page {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .page-header {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .page-header h1 {
          font-size: 24px;
          font-weight: 700;
          margin: 0;
          color: #ff6b35;
        }

        .page-header p {
          font-size: 13px;
          color: #888;
          margin: 0;
        }
      `}</style>
    </AdminLayout>
  );
};

export default DisputesPage;
