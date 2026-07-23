import React, { useState, useEffect } from 'react';
import { AlertCircle, Clock, CheckCircle, XCircle, Eye, MessageCircle } from 'lucide-react';

interface Dispute {
  id: number;
  errandId: string;
  status: string;
  amount: number;
  responseDeadline: string;
  autoResolveAt: string;
  verdictIssuedAt?: string;
  extensionRequested: boolean;
  appealSubmittedAt?: string;
}

export function DisputeManagementDashboard() {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [filter, setFilter] = useState<'OPEN' | 'PENDING_RESPONSE' | 'VERDICT_ISSUED' | 'APPEALED' | 'CLOSED'>('OPEN');
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [verdictData, setVerdictData] = useState({
    decision: 'PARTIAL_SPLIT',
    doerAmount: 0,
    companyAmount: 0,
    reasoning: '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchDisputes();
  }, [filter]);

  const fetchDisputes = async () => {
    // TODO: Fetch from API
    console.log('Fetching disputes with status:', filter);
  };

  const getTimeUntilDeadline = (deadline: string) => {
    const now = new Date();
    const deadlineTime = new Date(deadline);
    const diffHours = Math.round((deadlineTime.getTime() - now.getTime()) / (1000 * 60 * 60));

    if (diffHours < 0) return 'OVERDUE';
    if (diffHours <= 12) return `${diffHours}h (URGENT)`;
    return `${diffHours}h`;
  };

  const getStatusBadge = (status: string) => {
    const badges: { [key: string]: { bg: string; text: string; icon: React.ReactNode } } = {
      OPEN: { bg: 'bg-red-100', text: 'text-red-700', icon: <AlertCircle size={16} /> },
      PENDING_RESPONSE: { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: <Clock size={16} /> },
      EVIDENCE_RECEIVED: { bg: 'bg-blue-100', text: 'text-blue-700', icon: <Eye size={16} /> },
      VERDICT_ISSUED: { bg: 'bg-orange-100', text: 'text-orange-700', icon: <CheckCircle size={16} /> },
      APPEALED: { bg: 'bg-purple-100', text: 'text-purple-700', icon: <MessageCircle size={16} /> },
      CLOSED: { bg: 'bg-green-100', text: 'text-green-700', icon: <CheckCircle size={16} /> },
    };

    const badge = badges[status] || badges.OPEN;
    return (
      <div className={`${badge.bg} ${badge.text} px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2`}>
        {badge.icon}
        {status.replace(/_/g, ' ')}
      </div>
    );
  };

  const handleIssueVerdict = async () => {
    if (!selectedDispute) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/disputes/${selectedDispute.id}/verdict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(verdictData),
      });

      if (!response.ok) throw new Error('Failed to issue verdict');

      alert('Verdict issued successfully. Parties have 12 hours to appeal.');
      setSelectedDispute(null);
      fetchDisputes();
    } catch (error) {
      console.error('Error issuing verdict:', error);
      alert('Failed to issue verdict');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveExtension = async (disputeId: number) => {
    try {
      const response = await fetch(`/api/disputes/${disputeId}/approve-extension`, {
        method: 'POST',
      });

      if (!response.ok) throw new Error('Failed to approve extension');

      alert('Extension approved. New deadline: +12 hours.');
      fetchDisputes();
    } catch (error) {
      console.error('Error approving extension:', error);
      alert('Failed to approve extension');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg p-6">
        <h1 className="text-3xl font-bold">Dispute Management Dashboard</h1>
        <p className="text-orange-100 mt-1">3-Day Max Resolution System</p>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b overflow-x-auto">
        {['OPEN', 'PENDING_RESPONSE', 'VERDICT_ISSUED', 'APPEALED', 'CLOSED'].map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status as any)}
            className={`px-4 py-3 font-medium border-b-2 transition ${
              filter === status
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-gray-600 hover:text-gray-800'
            }`}
          >
            {status.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      {/* Disputes List */}
      <div className="space-y-3">
        {disputes.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <p className="text-gray-500">No disputes found</p>
          </div>
        ) : (
          disputes.map((dispute) => (
            <div
              key={dispute.id}
              className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-lg transition cursor-pointer"
              onClick={() => setSelectedDispute(dispute)}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-bold text-lg">Dispute #{dispute.id}</h3>
                  <p className="text-sm text-gray-600">Errand: {dispute.errandId}</p>
                </div>
                {getStatusBadge(dispute.status)}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Amount</p>
                  <p className="font-bold text-gray-800">${dispute.amount.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-gray-500">Response Deadline</p>
                  <p className="font-bold text-gray-800">{getTimeUntilDeadline(dispute.responseDeadline)}</p>
                </div>
                <div>
                  <p className="text-gray-500">Auto-Resolve</p>
                  <p className="font-bold text-gray-800">{getTimeUntilDeadline(dispute.autoResolveAt)}</p>
                </div>
                {dispute.extensionRequested && (
                  <div className="bg-yellow-50 p-2 rounded">
                    <p className="text-gray-500">Extension Requested</p>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleApproveExtension(dispute.id);
                      }}
                      className="text-xs bg-yellow-500 text-white px-2 py-1 rounded mt-1 hover:bg-yellow-600"
                    >
                      Approve
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Verdict Modal */}
      {selectedDispute && selectedDispute.status === 'EVIDENCE_RECEIVED' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4">
            <div className="border-b p-6">
              <h2 className="text-2xl font-bold">Issue Verdict</h2>
              <p className="text-gray-600">Dispute #{selectedDispute.id}</p>
            </div>

            <div className="p-6 space-y-4">
              {/* Decision Selection */}
              <div>
                <label className="block text-sm font-semibold mb-2">Decision</label>
                <div className="space-y-2">
                  {['APPROVE_DOER', 'APPROVE_COMPANY', 'PARTIAL_SPLIT'].map((decision) => (
                    <label key={decision} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="decision"
                        value={decision}
                        checked={verdictData.decision === decision}
                        onChange={(e) => setVerdictData({ ...verdictData, decision: e.target.value })}
                        className="w-4 h-4"
                      />
                      <span className="text-sm">{decision.replace(/_/g, ' ')}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Amount Input */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">Doer Amount</label>
                  <input
                    type="number"
                    value={verdictData.doerAmount}
                    onChange={(e) => setVerdictData({ ...verdictData, doerAmount: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">Company Amount</label>
                  <input
                    type="number"
                    value={verdictData.companyAmount}
                    onChange={(e) => setVerdictData({ ...verdictData, companyAmount: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>

              {/* Reasoning */}
              <div>
                <label className="block text-sm font-semibold mb-2">Reasoning</label>
                <textarea
                  value={verdictData.reasoning}
                  onChange={(e) => setVerdictData({ ...verdictData, reasoning: e.target.value })}
                  placeholder="Explain your decision based on the evidence..."
                  className="w-full h-24 p-3 border border-gray-300 rounded-lg"
                />
              </div>
            </div>

            <div className="border-t bg-gray-50 p-6 flex gap-3">
              <button
                onClick={() => setSelectedDispute(null)}
                className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleIssueVerdict}
                disabled={loading}
                className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50"
              >
                {loading ? 'Issuing...' : 'Issue Verdict'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
