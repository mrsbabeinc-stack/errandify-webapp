import React, { useState } from 'react';

interface DisputeReviewPanelProps {
  disputeId: number;
  doerName: string;
  askerName: string;
  jobTitle: string;
  budget: number;
  disputeType: string;
  description: string;
  reason?: string;
  evidence?: {
    hasGps: boolean;
    gpsLocation?: string;
    photoCount: number;
    photoPreviews?: string[];
    hasChat: boolean;
    waitTime?: number;
  };
  analysis?: {
    confidenceScore: number;
    recommendedDecision: string;
    reasoning: string;
    safetyConcern: boolean;
    safetySeverity?: string;
  };
  onClose?: () => void;
  onDecision?: (decision: string, notes: string) => void;
}

export default function DisputeReviewPanel({
  disputeId,
  doerName,
  askerName,
  jobTitle,
  budget,
  disputeType,
  description,
  reason,
  evidence,
  analysis,
  onClose,
  onDecision,
}: DisputeReviewPanelProps) {
  const [decision, setDecision] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmitDecision = async () => {
    if (!decision || !adminNotes.trim()) {
      alert('Please select a decision and add notes');
      return;
    }

    setIsSubmitting(true);
    try {
      onDecision?.(decision, adminNotes);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getConfidenceColor = (score: number) => {
    if (score > 0.8) return 'bg-green-100 text-green-800 border-green-300';
    if (score > 0.5) return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    return 'bg-red-100 text-red-800 border-red-300';
  };

  const getConfidenceLabel = (score: number) => {
    if (score > 0.8) return 'HIGH (Auto-resolvable)';
    if (score > 0.5) return 'MEDIUM (Human review recommended)';
    return 'LOW (Requires careful review)';
  };

  const getDecisionColor = (rec: string) => {
    if (rec === 'full_payment') return 'bg-green-50 border-green-200';
    if (rec === 'partial_payment') return 'bg-yellow-50 border-yellow-200';
    if (rec === 'refund') return 'bg-red-50 border-red-200';
    return 'bg-purple-50 border-purple-200';
  };

  const getDecisionLabel = (rec: string) => {
    if (rec === 'full_payment') return '✅ Full Payment to Doer';
    if (rec === 'partial_payment') return '💰 Partial Payment (50/50)';
    if (rec === 'refund') return '💵 Refund to Asker';
    return '🚨 Escalate to Senior Review';
  };

  return (
    <div className="max-w-5xl mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-600 to-red-600 text-white p-6 flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Dispute Review</h2>
          <p className="text-xs text-orange-100 mt-1">Case #{disputeId}</p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-2xl hover:opacity-80 transition"
          >
            ×
          </button>
        )}
      </div>

      <div className="p-6 space-y-6">
        {/* Safety Alert */}
        {analysis?.safetyConcern && (
          <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4">
            <p className="text-sm font-bold text-red-900">🚨 SAFETY ALERT</p>
            <p className="text-xs text-red-800 mt-2">
              <strong>Severity:</strong> {(analysis.safetySeverity || 'unknown').toUpperCase()}
            </p>
            <p className="text-xs text-red-800 mt-1">
              This dispute contains concerning language and requires careful review for potential coercion
              or abuse.
            </p>
          </div>
        )}

        {/* AI Analysis Summary */}
        {analysis && (
          <div className={`border-2 rounded-lg p-4 ${getDecisionColor(analysis.recommendedDecision)}`}>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-semibold text-gray-600">AI CONFIDENCE</p>
                <p className={`text-sm font-bold mt-1 px-2 py-1 rounded border ${getConfidenceColor(analysis.confidenceScore)}`}>
                  {(analysis.confidenceScore * 100).toFixed(0)}% - {getConfidenceLabel(analysis.confidenceScore)}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-600">RECOMMENDED DECISION</p>
                <p className="text-sm font-bold mt-1">{getDecisionLabel(analysis.recommendedDecision)}</p>
              </div>
            </div>
            {analysis.reasoning && (
              <div className="mt-3 pt-3 border-t">
                <p className="text-xs font-semibold text-gray-600">REASONING</p>
                <p className="text-xs text-gray-700 mt-1 whitespace-pre-wrap">{analysis.reasoning}</p>
              </div>
            )}
          </div>
        )}

        {/* Two Column Layout */}
        <div className="grid grid-cols-2 gap-6">
          {/* Left: Case Details */}
          <div className="space-y-4">
            {/* Job Info */}
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs font-semibold text-gray-600 mb-2">JOB DETAILS</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Title:</span>
                  <span className="font-semibold text-gray-900">{jobTitle}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Budget:</span>
                  <span className="font-semibold text-gray-900">SGD ${budget}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Doer:</span>
                  <span className="font-semibold text-gray-900">{doerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Asker:</span>
                  <span className="font-semibold text-gray-900">{askerName}</span>
                </div>
              </div>
            </div>

            {/* Dispute Reason */}
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <p className="text-xs font-semibold text-blue-900 mb-2">DISPUTE TYPE</p>
              <p className="text-sm text-blue-800 font-semibold">{disputeType.replace(/_/g, ' ').toUpperCase()}</p>
              {reason && (
                <>
                  <p className="text-xs font-semibold text-blue-900 mt-3 mb-1">REASON</p>
                  <p className="text-xs text-blue-800">{reason.replace(/_/g, ' ')}</p>
                </>
              )}
            </div>

            {/* Evidence Summary */}
            {evidence && (
              <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                <p className="text-xs font-semibold text-green-900 mb-2">EVIDENCE</p>
                <ul className="text-xs text-green-800 space-y-1">
                  {evidence.hasGps && <li>✓ GPS Location: {evidence.gpsLocation || 'Captured'}</li>}
                  {!evidence.hasGps && <li>✗ GPS Location: Not provided</li>}
                  {evidence.photoCount > 0 && <li>✓ Photos: {evidence.photoCount} uploaded</li>}
                  {evidence.photoCount === 0 && <li>✗ Photos: None</li>}
                  {evidence.hasChat && <li>✓ Chat History: Available</li>}
                  {!evidence.hasChat && <li>✗ Chat History: Not provided</li>}
                  {evidence.waitTime && <li>✓ Wait Time: {evidence.waitTime} minutes</li>}
                  {!evidence.waitTime && <li>✗ Wait Time: Not documented</li>}
                </ul>
              </div>
            )}
          </div>

          {/* Right: Description & Photos */}
          <div className="space-y-4">
            {/* Description */}
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs font-semibold text-gray-600 mb-2">DISPUTE DESCRIPTION</p>
              <p className="text-sm text-gray-700 leading-relaxed">{description}</p>
              <p className="text-xs text-gray-500 mt-2">
                {description.split(/\s+/).length} words
              </p>
            </div>

            {/* Photo Previews */}
            {evidence?.photoPreviews && evidence.photoPreviews.length > 0 && (
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs font-semibold text-gray-600 mb-2">PHOTO EVIDENCE</p>
                <div className="grid grid-cols-3 gap-2">
                  {evidence.photoPreviews.map((photo, idx) => (
                    <div
                      key={idx}
                      className="bg-white border border-gray-300 rounded overflow-hidden h-24"
                    >
                      <img
                        src={photo}
                        alt={`Evidence ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Admin Decision Section */}
        <div className="border-t-2 pt-6 space-y-4">
          <h3 className="text-lg font-bold text-gray-900">Your Decision</h3>

          {/* Decision Options */}
          <div className="space-y-2">
            {[
              { value: 'full_payment', label: '✅ Approve - Full Payment to Doer', desc: 'Work done satisfactorily → Pay doer' },
              { value: 'partial_payment', label: '💰 Partial - Split Payment (50/50)', desc: 'Some work done with issues → Split fairly' },
              { value: 'refund', label: '💵 Reject - Refund to Asker', desc: 'Work not as promised → Reimburse asker' },
              { value: 'escalate', label: '🚨 Escalate - Send to Senior Review', desc: 'Unclear or safety concern → Expert review' },
            ].map((opt) => (
              <label
                key={opt.value}
                className={`flex items-start gap-3 p-3 border-2 rounded-lg cursor-pointer transition ${
                  decision === opt.value
                    ? 'bg-orange-50 border-orange-500'
                    : 'bg-white border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="decision"
                  value={opt.value}
                  checked={decision === opt.value}
                  onChange={(e) => setDecision(e.target.value)}
                  className="mt-1"
                />
                <div>
                  <div className="font-semibold text-sm text-gray-800">{opt.label}</div>
                  <div className="text-xs text-gray-600">{opt.desc}</div>
                </div>
              </label>
            ))}
          </div>

          {/* Admin Notes */}
          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-2">
              Admin Notes (visible to both parties) *
            </label>
            <textarea
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              placeholder="Explain your reasoning. Be warm and fair to both sides. This will be shown to the dispute parties."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm resize-none"
              rows={4}
            />
            <p className="text-xs text-gray-500 mt-1">
              Min 50 chars • {adminNotes.length} / 50
            </p>
          </div>

          {/* Submit Button */}
          <div className="flex gap-2">
            {onClose && (
              <button
                onClick={onClose}
                className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg font-semibold hover:bg-gray-50 transition disabled:opacity-50"
                disabled={isSubmitting}
              >
                Cancel
              </button>
            )}
            <button
              onClick={handleSubmitDecision}
              disabled={isSubmitting || !decision}
              className="flex-1 bg-orange-600 text-white py-2 rounded-lg font-bold hover:bg-orange-700 transition disabled:opacity-50"
            >
              {isSubmitting ? 'Submitting...' : '📤 Submit Decision'}
            </button>
          </div>
        </div>

        {/* Footer Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
          <p>
            <strong>Note:</strong> Your decision and notes will be sent to both parties immediately.
            Both parties can appeal within 7 days with new evidence.
          </p>
        </div>
      </div>
    </div>
  );
}
