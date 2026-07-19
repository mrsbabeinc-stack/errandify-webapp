import React, { useState, useEffect } from 'react';
import { AlertCircle, Clock, CheckCircle, ChevronRight } from 'lucide-react';
import { DisputeResponsePage } from './DisputeResponsePage';

interface Dispute {
  id: number;
  errandId: string;
  status: string;
  amount: number;
  reason: string;
  raisedBy: 'doer' | 'company';
  createdAt: string;
  responseDeadline: string;
  autoResolveAt: string;
  doerEvidenceCount: number;
  companyEvidenceCount: number;
  companyEvidenceSubmittedAt?: string;
}

interface CompanyDisputesTabProps {
  userRole: 'owner' | 'manager';
}

export function CompanyDisputesTab({ userRole }: CompanyDisputesTabProps) {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'open' | 'in_review' | 'resolved'>('all');
  const [selectedDispute, setSelectedDispute] = useState<number | null>(null);

  useEffect(() => {
    fetchDisputes();
  }, [filter]);

  const fetchDisputes = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/disputes?status=${filter}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });

      if (!response.ok) throw new Error('Failed to load disputes');

      const data = await response.json();
      setDisputes(data.disputes || []);
    } catch (error) {
      console.error('Failed to fetch disputes:', error);
    } finally {
      setLoading(false);
    }
  };

  if (selectedDispute) {
    return (
      <DisputeResponsePage
        disputeId={selectedDispute}
        onBack={() => {
          setSelectedDispute(null);
          fetchDisputes();
        }}
        userRole={userRole}
      />
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OPEN':
      case 'PENDING_RESPONSE':
        return {
          bg: 'bg-red-100',
          text: 'text-red-700',
          icon: <AlertCircle size={16} />,
          label: 'Awaiting Response',
        };
      case 'EVIDENCE_RECEIVED':
      case 'UNDER_REVIEW':
        return {
          bg: 'bg-blue-100',
          text: 'text-blue-700',
          icon: <Clock size={16} />,
          label: 'In Review',
        };
      case 'VERDICT_ISSUED':
      case 'APPEALED':
        return {
          bg: 'bg-orange-100',
          text: 'text-orange-700',
          icon: <AlertCircle size={16} />,
          label: 'Verdict Issued',
        };
      case 'CLOSED':
        return {
          bg: 'bg-green-100',
          text: 'text-green-700',
          icon: <CheckCircle size={16} />,
          label: 'Resolved',
        };
      default:
        return {
          bg: 'bg-gray-100',
          text: 'text-gray-700',
          icon: null,
          label: status,
        };
    }
  };

  const getUrgencyLevel = (dispute: Dispute) => {
    const now = new Date();
    const deadline = new Date(dispute.responseDeadline);
    const hoursRemaining = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursRemaining <= 0) return 'overdue';
    if (hoursRemaining <= 12) return 'urgent';
    if (hoursRemaining <= 24) return 'high';
    return 'normal';
  };

  const disputesByStatus = {
    open: disputes.filter((d) => ['OPEN', 'PENDING_RESPONSE'].includes(d.status)),
    in_review: disputes.filter((d) => ['EVIDENCE_RECEIVED', 'UNDER_REVIEW', 'VERDICT_ISSUED', 'APPEALED'].includes(d.status)),
    resolved: disputes.filter((d) => d.status === 'CLOSED'),
  };

  const totalDisputes = disputes.length;
  const openCount = disputesByStatus.open.length;
  const inReviewCount = disputesByStatus.in_review.length;
  const resolvedCount = disputesByStatus.resolved.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Dispute Management</h2>
        <p className="text-gray-600 mt-1">Manage disputes involving your company</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase font-semibold">Total Disputes</p>
          <p className="text-3xl font-bold text-gray-800 mt-2">{totalDisputes}</p>
        </div>

        <div className="bg-white rounded-lg border border-red-200 p-4">
          <p className="text-xs text-red-600 uppercase font-semibold">Awaiting Response</p>
          <p className="text-3xl font-bold text-red-600 mt-2">{openCount}</p>
        </div>

        <div className="bg-white rounded-lg border border-blue-200 p-4">
          <p className="text-xs text-blue-600 uppercase font-semibold">In Review</p>
          <p className="text-3xl font-bold text-blue-600 mt-2">{inReviewCount}</p>
        </div>

        <div className="bg-white rounded-lg border border-green-200 p-4">
          <p className="text-xs text-green-600 uppercase font-semibold">Resolved</p>
          <p className="text-3xl font-bold text-green-600 mt-2">{resolvedCount}</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        {(['all', 'open', 'in_review', 'resolved'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-3 font-medium border-b-2 transition ${
              filter === f
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-gray-600 hover:text-gray-800'
            }`}
          >
            {f === 'all' && 'All Disputes'}
            {f === 'open' && 'Awaiting Response'}
            {f === 'in_review' && 'In Review'}
            {f === 'resolved' && 'Resolved'}
          </button>
        ))}
      </div>

      {/* Disputes List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading disputes...</p>
        </div>
      ) : disputes.length === 0 ? (
        <div className="bg-gray-50 rounded-lg p-12 text-center border border-gray-200">
          <CheckCircle size={48} className="mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600 font-semibold">No disputes found</p>
          <p className="text-gray-500 text-sm mt-1">Great! Your company has no active disputes.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {disputes.map((dispute) => {
            const badge = getStatusBadge(dispute.status);
            const urgency = getUrgencyLevel(dispute);
            const hasResponded = !!dispute.companyEvidenceSubmittedAt;
            const deadline = new Date(dispute.responseDeadline);
            const hoursRemaining = Math.round(
              (deadline.getTime() - new Date().getTime()) / (1000 * 60 * 60)
            );

            return (
              <div
                key={dispute.id}
                onClick={() => setSelectedDispute(dispute.id)}
                className={`bg-white rounded-lg border-2 p-4 hover:shadow-lg transition cursor-pointer ${
                  urgency === 'overdue'
                    ? 'border-red-300 bg-red-50'
                    : urgency === 'urgent'
                    ? 'border-orange-300 bg-orange-50'
                    : 'border-gray-200 hover:border-orange-300'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-bold text-lg text-gray-800">Errand {dispute.errandId}</h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${badge.bg} ${badge.text}`}>
                        {badge.icon}
                        {badge.label}
                      </span>
                      {hasResponded && (
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 flex items-center gap-1">
                          <CheckCircle size={14} />
                          Responded
                        </span>
                      )}
                    </div>
                    <p className="text-gray-600 text-sm">{dispute.reason}</p>
                  </div>

                  <div className="text-right">
                    <p className="text-2xl font-bold text-gray-800">${dispute.amount.toFixed(2)}</p>
                    <ChevronRight className="text-gray-400 ml-auto mt-2" size={20} />
                  </div>
                </div>

                {/* Timeline Info */}
                <div className="grid grid-cols-4 gap-3 mt-4 pt-4 border-t border-gray-200">
                  <div>
                    <p className="text-xs text-gray-500 uppercase font-semibold">Status</p>
                    <p className="text-sm font-medium text-gray-700 mt-1">{dispute.status.replace(/_/g, ' ')}</p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-500 uppercase font-semibold">Response Deadline</p>
                    <p className={`text-sm font-bold mt-1 ${urgency === 'overdue' ? 'text-red-600' : urgency === 'urgent' ? 'text-orange-600' : 'text-gray-700'}`}>
                      {hoursRemaining <= 0 ? 'Overdue' : `${hoursRemaining}h remaining`}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-500 uppercase font-semibold">Evidence</p>
                    <p className="text-sm font-medium text-gray-700 mt-1">
                      Doer: {dispute.doerEvidenceCount} | You: {dispute.companyEvidenceCount}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-500 uppercase font-semibold">Created</p>
                    <p className="text-sm font-medium text-gray-700 mt-1">
                      {new Date(dispute.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {/* Urgency Message */}
                {urgency === 'overdue' && (
                  <div className="mt-3 p-3 bg-red-100 border border-red-300 rounded text-red-700 text-sm font-semibold flex items-center gap-2">
                    <AlertCircle size={16} />
                    Response deadline has passed
                  </div>
                )}

                {urgency === 'urgent' && !hasResponded && (
                  <div className="mt-3 p-3 bg-orange-100 border border-orange-300 rounded text-orange-700 text-sm font-semibold flex items-center gap-2">
                    <Clock size={16} />
                    Urgent: {hoursRemaining} hours to respond
                  </div>
                )}

                {urgency === 'high' && !hasResponded && (
                  <div className="mt-3 p-3 bg-yellow-100 border border-yellow-300 rounded text-yellow-700 text-sm font-semibold flex items-center gap-2">
                    <AlertCircle size={16} />
                    {hoursRemaining} hours remaining to respond
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm font-semibold text-blue-900 mb-2">📋 How to Respond to Disputes</p>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>✓ Click on any dispute to view full details and submit your response</li>
          <li>✓ You have 24 hours from dispute creation to submit an initial response</li>
          <li>✓ Upload evidence (photos, videos, documents) to support your case</li>
          <li>✓ Admin will review all evidence before issuing a verdict (within 48 hours)</li>
          <li>✓ If a verdict is issued, you'll have 12 hours to appeal if you disagree</li>
        </ul>
      </div>
    </div>
  );
}
