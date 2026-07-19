import React, { useState, useEffect } from 'react';
import { EvidenceViewer } from '../disputes/EvidenceViewer';

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
  verdict?: {
    decision: 'APPROVE_DOER' | 'APPROVE_COMPANY' | 'PARTIAL_SPLIT';
    compensationAmount: number;
    compensationRecipient: 'doer' | 'company';
    reasoning: string;
    issuedAt: string;
  };
}

interface DisputeResponsePageProps {
  disputeId: number;
  onBack: () => void;
  userRole: 'owner' | 'manager'; // Company owner or manager
}

export function DisputeResponsePage({ disputeId, onBack, userRole }: DisputeResponsePageProps) {
  const [dispute, setDispute] = useState<Dispute | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Response form state
  const [responseText, setResponseText] = useState('');
  const [hasResponded, setHasResponded] = useState(false);
  const [responseSubmittedAt, setResponseSubmittedAt] = useState<string | null>(null);

  useEffect(() => {
    fetchDisputeDetails();
  }, [disputeId]);

  const fetchDisputeDetails = async () => {
    try {
      setLoading(true);

      // Mock disputes for testing - using dynamic dates
      const now = new Date();
      const t24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const t48h = new Date(now.getTime() + 48 * 60 * 60 * 1000);
      const t72h = new Date(now.getTime() + 72 * 60 * 60 * 1000);

      const mockDisputes: Record<number, Dispute> = {
        1: {
          id: 1,
          errandId: 'ERR-2026-001',
          status: 'In Review',
          amount: 150,
          reason: 'Incomplete task completion - not all areas cleaned',
          raisedBy: 'doer',
          createdAt: now.toISOString(),
          responseDeadline: t24h.toISOString(),
          autoResolveAt: t48h.toISOString(),
          doerEvidenceCount: 2,
          companyEvidenceCount: 0,
        },
        2: {
          id: 2,
          errandId: 'ERR-2026-002',
          status: 'Resolved',
          amount: 85,
          reason: 'Late delivery - staff arrived after deadline',
          raisedBy: 'doer',
          createdAt: new Date(now.getTime() - 72 * 60 * 60 * 1000).toISOString(),
          responseDeadline: new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString(),
          autoResolveAt: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(),
          doerEvidenceCount: 1,
          companyEvidenceCount: 1,
          verdict: {
            decision: 'PARTIAL_SPLIT',
            compensationAmount: 42.50,
            compensationRecipient: 'doer',
            reasoning: 'Based on the evidence submitted by both parties, we found that while the delivery was late, the service was partially completed. The doer is entitled to 50% compensation for the partial service completion. The company receives a $42.50 credit for the inconvenience caused by the late delivery.',
            issuedAt: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(),
          },
        },
      };

      const dispute = mockDisputes[disputeId];
      if (!dispute) {
        throw new Error('Dispute not found');
      }

      setDispute(dispute);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitResponse = async () => {
    if (!responseText.trim()) {
      setError('Please enter a response');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const response = await fetch(`/api/disputes/${disputeId}/response`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          message: responseText,
        }),
      });

      if (!response.ok) throw new Error('Failed to submit response');

      setSuccess('Response submitted successfully!');
      setHasResponded(true);
      setResponseSubmittedAt(new Date().toISOString());
      setResponseText('');

      // Refresh dispute details
      setTimeout(() => {
        fetchDisputeDetails();
        setSuccess('');
      }, 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dispute details...</p>
        </div>
      </div>
    );
  }

  if (!dispute) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <p className="text-red-700">Dispute not found</p>
        <button
          onClick={onBack}
          className="mt-4 bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600"
        >
          Go Back
        </button>
      </div>
    );
  }

  const now = new Date();
  const deadline = new Date(dispute.responseDeadline);
  const autoResolve = new Date(dispute.autoResolveAt);

  const hoursUntilDeadline = Math.max(
    0,
    Math.round((deadline.getTime() - now.getTime()) / (1000 * 60 * 60))
  );

  const hoursUntilAutoResolve = Math.max(
    0,
    Math.round((autoResolve.getTime() - now.getTime()) / (1000 * 60 * 60))
  );

  const isDeadlinePassed = hoursUntilDeadline <= 0;
  const isUrgent = hoursUntilDeadline > 0 && hoursUntilDeadline <= 12;
  const canRespond = !isDeadlinePassed;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPEN':
      case 'PENDING_RESPONSE':
        return 'bg-red-100 text-red-700';
      case 'EVIDENCE_RECEIVED':
        return 'bg-blue-100 text-blue-700';
      case 'VERDICT_ISSUED':
        return 'bg-orange-100 text-orange-700';
      case 'CLOSED':
        return 'bg-green-100 text-green-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={onBack}
          className="p-2 hover:bg-gray-100 rounded-lg transition text-2xl"
          title="Go back"
        >
          ←
        </button>
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Dispute Response</h1>
          <p className="text-gray-600 mt-1">Errand {dispute.errandId}</p>
        </div>
      </div>

      {/* Alerts */}
      {dispute.verdict && (
        <div className="bg-green-50 border border-green-300 rounded-lg p-4 flex gap-3">
          <span className="text-green-600 flex-shrink-0 text-xl">📢</span>
          <div>
            <p className="font-semibold text-green-900">Decision Notification</p>
            <p className="text-green-700 text-sm">The Errandify admin team has issued a decision on your dispute. See details below.</p>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
          <span className="text-red-600 flex-shrink-0 text-xl">⚠️</span>
          <div>
            <p className="font-semibold text-red-900">Error</p>
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex gap-3">
          <span className="text-green-600 text-xl">✓</span>
          <p className="text-green-700 font-semibold">{success}</p>
        </div>
      )}

      {isUrgent && !hasResponded && (
        <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4 flex gap-3">
          <span className="text-yellow-600 text-xl">⚠️</span>
          <div>
            <p className="font-semibold text-yellow-900">Response Deadline Urgent</p>
            <p className="text-yellow-700 text-sm">
              Only {hoursUntilDeadline} hours remaining to respond. Submit your response now.
            </p>
          </div>
        </div>
      )}

      {isDeadlinePassed && !hasResponded && (
        <div className="bg-red-50 border border-red-300 rounded-lg p-4 flex gap-3">
          <span className="text-red-600 text-xl">❌</span>
          <div>
            <p className="font-semibold text-red-900">Response Deadline Passed</p>
            <p className="text-red-700 text-sm">
              The response deadline has passed. The system will auto-resolve this dispute at {autoResolve.toLocaleString()}.
            </p>
          </div>
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase font-semibold mb-2">Dispute Amount</p>
          <p className="text-2xl font-bold text-gray-800">${dispute.amount.toFixed(2)}</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase font-semibold mb-2">Status</p>
          <span className={`inline-block px-3 py-1 rounded-full text-sm font-bold ${getStatusColor(dispute.status)}`}>
            {dispute.status.replace(/_/g, ' ')}
          </span>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase font-semibold mb-2">Response Deadline</p>
          <p className={`text-2xl font-bold ${isDeadlinePassed ? 'text-red-600' : 'text-orange-600'}`}>
            {isDeadlinePassed ? 'Passed' : `${hoursUntilDeadline}h`}
          </p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase font-semibold mb-2">Auto-Resolve In</p>
          <p className={`text-2xl font-bold ${hoursUntilAutoResolve <= 12 ? 'text-red-600' : 'text-gray-800'}`}>
            {hoursUntilAutoResolve}h
          </p>
        </div>
      </div>

      {/* Dispute Details */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Dispute Details</h2>

        <div className="grid grid-cols-2 gap-6">
          <div>
            <p className="text-sm text-gray-500 uppercase font-semibold mb-2">Raised By</p>
            <p className="text-lg font-medium text-gray-800">
              {dispute.raisedBy === 'doer' ? 'Doer (Service Provider)' : 'Company'}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500 uppercase font-semibold mb-2">Errand ID</p>
            <p className="text-lg font-medium text-gray-800">{dispute.errandId}</p>
          </div>

          <div className="col-span-2">
            <p className="text-sm text-gray-500 uppercase font-semibold mb-2">Reason for Dispute</p>
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <p className="text-gray-800">{dispute.reason}</p>
            </div>
          </div>

          <div>
            <p className="text-sm text-gray-500 uppercase font-semibold mb-2">Dispute Created</p>
            <p className="text-gray-800">{new Date(dispute.createdAt).toLocaleString()}</p>
          </div>

          <div>
            <p className="text-sm text-gray-500 uppercase font-semibold mb-2">Response Deadline</p>
            <p className="text-gray-800">{deadline.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Response Section */}
      <div className="bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg border border-orange-200 p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          📨
          Submit Your Response
        </h2>

        {!hasResponded && canRespond ? (
          <div className="space-y-4">
            {/* Response Text */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Your Response *
              </label>
              <textarea
                value={responseText}
                onChange={(e) => setResponseText(e.target.value)}
                placeholder="Explain your position on this dispute. Be clear and factual about what happened..."
                className="w-full h-40 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                disabled={submitting}
              />
              <p className="text-xs text-gray-500 mt-1">Minimum 20 characters required</p>
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm font-semibold text-blue-900 mb-2">💡 Tips for a strong response:</p>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>✓ Be specific and factual about what happened</li>
                <li>✓ Reference relevant dates and times</li>
                <li>✓ Explain any misunderstandings clearly</li>
                <li>✓ Avoid accusations or emotional language</li>
              </ul>
            </div>

            {/* Submit Button */}
            <button
              onClick={handleSubmitResponse}
              disabled={submitting || !responseText.trim()}
              className="w-full bg-orange-500 text-white py-3 rounded-lg font-bold hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {submitting ? 'Submitting...' : 'Submit Response'}
            </button>

            <p className="text-xs text-gray-600 text-center">
              You can add evidence files after submitting your response
            </p>
          </div>
        ) : hasResponded ? (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <span className="text-green-600 text-2xl">✓</span>
              <div>
                <h3 className="font-bold text-green-900">Response Submitted</h3>
                <p className="text-green-700 text-sm mt-1">
                  Your response was submitted on {new Date(responseSubmittedAt!).toLocaleString()}
                </p>
                <p className="text-green-700 text-sm mt-2">
                  You can continue to submit additional evidence until {autoResolve.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-700 font-semibold mb-2">Response Window Closed</p>
            <p className="text-red-600 text-sm">
              The deadline for responding has passed at {deadline.toLocaleString()}. The system will auto-resolve this dispute based on available evidence.
            </p>
          </div>
        )}
      </div>

      {/* Evidence Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          📤
          Evidence & Documentation
        </h2>

        <EvidenceViewer
          disputeId={disputeId}
          canUpload={hoursUntilAutoResolve > 0}
          userType="company_staff"
          timeRemaining={hoursUntilAutoResolve}
          onEvidenceUploaded={() => fetchDisputeDetails()}
        />
      </div>

      {/* Verdict Section - Show if verdict issued */}
      {dispute.verdict && (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-300 p-6">
          <div className="flex items-start gap-3 mb-4">
            <span className="text-3xl">⚖️</span>
            <div>
              <h2 className="text-2xl font-bold text-green-900">Decision Made</h2>
              <p className="text-sm text-green-700 mt-1">
                Issued on {new Date(dispute.verdict.issuedAt).toLocaleString()}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Decision Badge */}
            <div className="bg-white rounded-lg p-4 border border-green-200">
              <p className="text-xs text-gray-500 uppercase font-semibold mb-2">Decision</p>
              <div className="flex items-center gap-2">
                {dispute.verdict.decision === 'APPROVE_DOER' && (
                  <>
                    <span className="text-2xl">✅</span>
                    <p className="text-lg font-bold text-green-700">Doer Approved</p>
                  </>
                )}
                {dispute.verdict.decision === 'APPROVE_COMPANY' && (
                  <>
                    <span className="text-2xl">✅</span>
                    <p className="text-lg font-bold text-green-700">Company Approved</p>
                  </>
                )}
                {dispute.verdict.decision === 'PARTIAL_SPLIT' && (
                  <>
                    <span className="text-2xl">🤝</span>
                    <p className="text-lg font-bold text-blue-700">Partial Split</p>
                  </>
                )}
              </div>
            </div>

            {/* Compensation Details */}
            <div className="bg-white rounded-lg p-4 border border-green-200">
              <p className="text-xs text-gray-500 uppercase font-semibold mb-2">Compensation</p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-gray-800">${dispute.verdict.compensationAmount.toFixed(2)}</span>
                <span className="text-gray-600">
                  {dispute.verdict.compensationRecipient === 'doer' ? 'to Doer' : 'to Company'}
                </span>
              </div>
            </div>

            {/* Reasoning */}
            <div className="bg-white rounded-lg p-4 border border-green-200">
              <p className="text-xs text-gray-500 uppercase font-semibold mb-2">Admin Reasoning</p>
              <p className="text-gray-800 leading-relaxed text-sm">
                {dispute.verdict.reasoning}
              </p>
            </div>

            {/* Next Actions */}
            {dispute.verdict.compensationRecipient === 'doer' ? (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <p className="text-sm text-orange-900">
                  <strong>💰 Payment Status:</strong> $
                  {dispute.verdict.compensationAmount.toFixed(2)} will be paid to the doer. Your account will be credited.
                </p>
              </div>
            ) : (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-900">
                  <strong>💳 Refund Issued:</strong> ${dispute.verdict.compensationAmount.toFixed(2)} credit issued to your account.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Role Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-900">
          <strong>📋 You're responding as:</strong> {userRole === 'owner' ? 'Company Owner' : 'Company Manager'}
        </p>
        <p className="text-xs text-blue-800 mt-2">
          Your response will be reviewed by the Errandify admin team along with all evidence and the doer's response.
        </p>
      </div>

      {/* Timeline Info */}
      <div className="bg-gray-50 rounded-lg border border-gray-200 p-6">
        <h3 className="font-bold text-gray-800 mb-4">📅 What Happens Next</h3>

        <div className="space-y-4">
          <div className="flex gap-4">
            <div className="flex flex-col items-center">
              <div className={`w-4 h-4 rounded-full ${hasResponded || isDeadlinePassed ? 'bg-green-500' : 'bg-orange-500'}`}></div>
              <div className="w-1 h-12 bg-gray-300"></div>
            </div>
            <div>
              <p className="font-semibold text-gray-800">📝 Step 1: Your Response (Next 24 hours)</p>
              <p className="text-sm text-gray-600 mt-1">
                {hasResponded ? '✓ You submitted your response.' : isDeadlinePassed ? '✓ Response deadline passed.' : 'Submit your response and upload evidence to support your case.'}
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex flex-col items-center">
              <div className={`w-4 h-4 rounded-full ${!isDeadlinePassed && hoursUntilAutoResolve > 24 ? 'bg-orange-500' : 'bg-green-500'}`}></div>
              <div className="w-1 h-12 bg-gray-300"></div>
            </div>
            <div>
              <p className="font-semibold text-gray-800">🔍 Step 2: Review & Investigation (24-48 hours)</p>
              <p className="text-sm text-gray-600 mt-1">
                {hoursUntilAutoResolve > 24 ? 'Our team is reviewing both sides. You can continue uploading evidence.' : '✓ Review phase completed.'}
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex flex-col items-center">
              <div className={`w-4 h-4 rounded-full ${hoursUntilAutoResolve <= 24 ? 'bg-orange-500' : 'bg-gray-300'}`}></div>
              <div className="w-1 h-12 bg-gray-300"></div>
            </div>
            <div>
              <p className="font-semibold text-gray-800">⚖️ Step 3: Decision Made (48 hours)</p>
              <p className="text-sm text-gray-600 mt-1">
                {hoursUntilAutoResolve > 0 ? `Decision in ${hoursUntilAutoResolve} hour${hoursUntilAutoResolve === 1 ? '' : 's'}.` : '✓ Verdict issued.'}
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex flex-col items-center">
              <div className={`w-4 h-4 rounded-full ${isDeadlinePassed && !hasResponded ? 'bg-red-500' : 'bg-gray-300'}`}></div>
            </div>
            <div>
              <p className="font-semibold text-gray-800">🔄 Step 4: Appeal (48-60 hours only)</p>
              <p className="text-sm text-gray-600 mt-1">
                {isDeadlinePassed && !hasResponded
                  ? '❌ No appeal available - you did not respond to the dispute.'
                  : hoursUntilAutoResolve <= 0
                  ? 'Available within 12 hours of the decision.'
                  : 'You can appeal if you disagree with the verdict.'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mt-4">
          <p className="text-xs text-orange-800">
            <strong>⏱️ Total Time:</strong> The entire process takes up to 3 days. Your payment is held until resolved.
          </p>
        </div>
      </div>
    </div>
  );
}
