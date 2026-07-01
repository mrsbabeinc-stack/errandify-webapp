import { useState } from 'react';

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
  const [customAmount, setCustomAmount] = useState('');
  const [amountType, setAmountType] = useState<'$' | '%'>('$');
  const [adminPhotos, setAdminPhotos] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmitDecision = async () => {
    if (!decision || !adminNotes.trim()) {
      alert('Please select a decision and add notes');
      return;
    }

    // For custom amounts, validate input
    if ((decision === 'partial_payment' || decision === 'full_payment') && !customAmount) {
      alert('Please enter an amount');
      return;
    }

    setIsSubmitting(true);
    try {
      const decisionWithAmount = customAmount
        ? `${decision}|${customAmount}${amountType}`
        : decision;
      onDecision?.(decisionWithAmount, adminNotes);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getConfidenceColor = (score: number) => {
    if (score > 0.8) return 'bg-green-100 text-green-800 border-green-300';
    if (score > 0.5) return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    return 'bg-red-100 text-red-800 border-red-300';
  };


  const getDecisionColor = (rec: string) => {
    if (rec === 'full_payment') return 'bg-green-50 border-green-200';
    if (rec === 'partial_payment') return 'bg-yellow-50 border-yellow-200';
    if (rec === 'refund') return 'bg-red-50 border-red-200';
    return 'bg-purple-50 border-purple-200';
  };

  const getDecisionLabel = (rec: string) => {
    if (rec === 'full_payment') return '✅ Full Payment to Doer';
    if (rec === 'partial_payment') {
      if (customAmount) return `💰 Custom: ${customAmount}${amountType}`;
      return '💰 Partial Payment (50/50)';
    }
    if (rec === 'refund') return '💵 Refund to Asker';
    return '🚨 Escalate to Senior Review';
  };

  return (
    <div className="max-w-5xl mx-auto bg-white rounded-2xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white p-5 flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold">Let's Make It Fair</h2>
          <p className="text-xs text-orange-100 mt-0.5">Case #{disputeId} - Review & Decide</p>
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

      <div className="p-5 space-y-5">
        {/* Safety Alert */}
        {analysis?.safetyConcern && (
          <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-3">
            <p className="text-xs font-bold text-red-900">🚨 SAFETY ALERT</p>
            <p className="text-xs text-red-800 mt-1.5">
              Severity: <strong>{(analysis.safetySeverity || 'UNKNOWN').toUpperCase()}</strong>
            </p>
            <p className="text-xs text-red-800 mt-1">
              Concerning language detected. Review carefully for coercion/abuse.
            </p>
          </div>
        )}

        {/* AI Analysis Summary */}
        {analysis && (
          <div className={`border-2 rounded-xl p-3.5 ${getDecisionColor(analysis.recommendedDecision)}`}>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs font-bold text-gray-600 uppercase tracking-wide">Confidence</p>
                <p className={`text-xs font-bold mt-1.5 px-2 py-1 rounded border ${getConfidenceColor(analysis.confidenceScore)}`}>
                  {(analysis.confidenceScore * 100).toFixed(0)}%
                </p>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-600 uppercase tracking-wide">Suggested</p>
                <p className="text-xs font-bold mt-1.5">{getDecisionLabel(analysis.recommendedDecision)}</p>
              </div>
            </div>
            {analysis.reasoning && (
              <div className="mt-2.5 pt-2.5 border-t">
                <p className="text-xs font-bold text-gray-600 uppercase tracking-wide">Why</p>
                <p className="text-xs text-gray-700 mt-1 leading-relaxed">{analysis.reasoning}</p>
              </div>
            )}
          </div>
        )}

        {/* Two Column Layout */}
        <div className="grid grid-cols-2 gap-4">
          {/* Left: Case Details */}
          <div className="space-y-3">
            {/* Job Info */}
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-2">Job</p>
              <div className="space-y-1.5 text-xs">
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
            <div className="bg-blue-50 rounded-xl p-3 border border-blue-200">
              <p className="text-xs font-bold text-blue-900 uppercase tracking-wide mb-2">Type</p>
              <p className="text-xs text-blue-900 font-semibold">{disputeType.replace(/_/g, ' ')}</p>
              {reason && (
                <>
                  <p className="text-xs font-bold text-blue-900 uppercase tracking-wide mt-2 mb-1">Reason</p>
                  <p className="text-xs text-blue-800">{reason.replace(/_/g, ' ')}</p>
                </>
              )}
            </div>

            {/* Evidence Summary */}
            {evidence && (
              <div className="bg-green-50 rounded-xl p-3 border border-green-200">
                <p className="text-xs font-bold text-green-900 uppercase tracking-wide mb-2">Evidence</p>
                <ul className="text-xs text-green-800 space-y-0.5">
                  <li className={evidence.hasGps ? 'text-green-700 font-semibold' : 'text-gray-500'}>{evidence.hasGps ? '✓' : '✗'} GPS</li>
                  <li className={evidence.photoCount > 0 ? 'text-green-700 font-semibold' : 'text-gray-500'}>{evidence.photoCount > 0 ? '✓' : '✗'} {evidence.photoCount} photo{evidence.photoCount !== 1 ? 's' : ''}</li>
                  <li className={evidence.hasChat ? 'text-green-700 font-semibold' : 'text-gray-500'}>{evidence.hasChat ? '✓' : '✗'} Chat</li>
                  <li className={evidence.waitTime ? 'text-green-700 font-semibold' : 'text-gray-500'}>{evidence.waitTime ? '✓' : '✗'} {evidence.waitTime || '—'} min</li>
                </ul>
              </div>
            )}
          </div>

          {/* Right: Description & Photos */}
          <div className="space-y-3">
            {/* Description */}
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-2">Story</p>
              <p className="text-xs text-gray-700 leading-relaxed">{description}</p>
              <p className="text-xs text-gray-500 mt-1.5">
                {description.split(/\s+/).length} words
              </p>
            </div>

            {/* Photo Previews */}
            {evidence?.photoPreviews && evidence.photoPreviews.length > 0 && (
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-2">Photos</p>
                <div className="grid grid-cols-3 gap-1.5">
                  {evidence.photoPreviews.map((photo, idx) => (
                    <div
                      key={idx}
                      className="bg-white border border-gray-300 rounded overflow-hidden h-20"
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
        <div className="border-t-2 pt-4 space-y-3">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Your Decision</h3>

          {/* Decision Options */}
          <div className="space-y-1.5">
            {[
              { value: 'full_payment', label: '✅ Pay Doer Full Amount', desc: 'They deserve full pay' },
              { value: 'partial_payment', label: '💰 Split Payment Fairly', desc: 'Both did some work' },
              { value: 'refund', label: '💵 Refund to Asker', desc: 'Work wasn\'t done right' },
              { value: 'escalate', label: '🚨 Get Expert Opinion', desc: 'Too complicated. Need help.' },
            ].map((opt) => (
              <div key={opt.value}>
                <label
                  className={`flex items-start gap-2.5 p-2.5 border-2 rounded-lg cursor-pointer transition ${
                    decision === opt.value
                      ? 'bg-orange-50 border-orange-400'
                      : 'bg-white border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="decision"
                    value={opt.value}
                    checked={decision === opt.value}
                    onChange={(e) => {
                      setDecision(e.target.value);
                      if (e.target.value !== 'partial_payment' && e.target.value !== 'full_payment') {
                        setCustomAmount('');
                      }
                    }}
                    className="mt-0.5"
                  />
                  <div>
                    <div className="font-bold text-xs text-gray-800">{opt.label}</div>
                    <div className="text-xs text-gray-600">{opt.desc}</div>
                  </div>
                </label>

                {/* Custom amount input for payment options */}
                {(decision === 'full_payment' || decision === 'partial_payment') && opt.value === decision && (
                  <div className="mt-2 ml-7 flex gap-2">
                    <input
                      type="number"
                      value={customAmount}
                      onChange={(e) => setCustomAmount(e.target.value)}
                      placeholder="0"
                      className="flex-1 px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-xs"
                      min="0"
                      step="0.01"
                    />
                    <div className="flex gap-1">
                      <button
                        onClick={() => setAmountType('$')}
                        className={`px-2.5 py-1.5 rounded-lg font-bold text-xs transition ${
                          amountType === '$'
                            ? 'bg-orange-500 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        $
                      </button>
                      <button
                        onClick={() => setAmountType('%')}
                        className={`px-2.5 py-1.5 rounded-lg font-bold text-xs transition ${
                          amountType === '%'
                            ? 'bg-orange-500 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        %
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Admin Notes */}
          <div>
            <label className="block text-xs font-bold text-gray-800 mb-1.5 uppercase tracking-wide">
              Notes (shown to both)
            </label>
            <textarea
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              placeholder="Be warm and fair to both sides."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-xs resize-none"
              rows={3}
            />
            <p className="text-xs text-gray-500 mt-0.5">
              {adminNotes.length} / 50 chars
            </p>
          </div>

          {/* Admin Evidence Upload */}
          <div>
            <label className="block text-xs font-bold text-gray-800 mb-1.5 uppercase tracking-wide">
              📎 Attach Evidence (optional)
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-2.5 text-center">
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => {
                  if (e.target.files) {
                    const newPhotos = Array.from(e.target.files);
                    if (adminPhotos.length + newPhotos.length > 5) {
                      alert('Maximum 5 photos allowed');
                      return;
                    }
                    setAdminPhotos([...adminPhotos, ...newPhotos]);
                  }
                }}
                className="hidden"
                id="admin-photo-upload"
              />
              <label htmlFor="admin-photo-upload" className="cursor-pointer">
                <p className="text-xs font-semibold text-gray-700">
                  Tap to upload evidence
                </p>
              </label>
            </div>

            {adminPhotos.length > 0 && (
              <div className="mt-2 space-y-1">
                {adminPhotos.map((photo, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-gray-50 p-1.5 rounded text-xs">
                    <span className="text-gray-700 truncate">{photo.name}</span>
                    <button
                      onClick={() => setAdminPhotos(adminPhotos.filter((_, i) => i !== idx))}
                      className="text-red-600 hover:text-red-800 font-semibold ml-2"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Submit Button */}
          <div className="flex gap-2">
            {onClose && (
              <button
                onClick={onClose}
                className="flex-1 border-2 border-gray-300 text-gray-700 py-2 rounded-lg font-bold hover:bg-gray-50 transition disabled:opacity-50 text-sm"
                disabled={isSubmitting}
              >
                Cancel
              </button>
            )}
            <button
              onClick={handleSubmitDecision}
              disabled={isSubmitting || !decision}
              className="flex-1 bg-gradient-to-r from-orange-500 to-orange-600 text-white py-2 rounded-lg font-bold hover:from-orange-600 hover:to-orange-700 transition disabled:opacity-50 text-sm"
            >
              {isSubmitting ? 'Sending...' : '✓ Decide'}
            </button>
          </div>
        </div>

        {/* Footer Info */}
        <div className="bg-blue-50 border-l-4 border-blue-400 rounded-lg p-2.5 text-xs text-blue-800">
          <p className="font-semibold">Note:</p>
          <p className="mt-0.5">Sent to both parties immediately. Appeal period: 7 days.</p>
        </div>
      </div>
    </div>
  );
}
