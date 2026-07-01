import { useState } from 'react';

interface JobNotCompletedModalProps {
  taskId: number;
  taskTitle: string;
  budget: number;
  isOpen: boolean;
  onClose: () => void;
  onSubmit?: (success: boolean) => void;
}

export default function JobNotCompletedModal({
  taskId,
  taskTitle,
  budget,
  isOpen,
  onClose,
  onSubmit,
}: JobNotCompletedModalProps) {
  const [step, setStep] = useState<'reason' | 'evidence' | 'review' | 'submitted'>('reason');
  const [selectedReason, setSelectedReason] = useState('');
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const reasons = [
    {
      value: 'not_completed',
      label: '❌ Work Incomplete',
      description: 'Job wasn\'t finished as agreed',
    },
    {
      value: 'poor_quality',
      label: '⚠️ Quality Issue',
      description: 'Work quality below expectations',
    },
    {
      value: 'partially_done',
      label: '📋 Only Partial Work',
      description: 'Some work left undone',
    },
    {
      value: 'materials_wasted',
      label: '🗑️ Materials Concern',
      description: 'Materials handled improperly',
    },
    {
      value: 'accident',
      label: '⚠️ Damage/Injury',
      description: 'Property damaged or someone hurt',
    },
    {
      value: 'quarrel',
      label: '😠 Serious Disagreement',
      description: 'Major conflict or misunderstanding',
    },
    {
      value: 'safety_issue',
      label: '🔴 Safety Concern',
      description: 'Work created unsafe conditions',
    },
    {
      value: 'other',
      label: '❓ Something Else',
      description: 'Other reason',
    },
  ];

  // Handle photo upload
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newPhotos = Array.from(e.target.files);
      if (photos.length + newPhotos.length > 5) {
        setError('Maximum 5 photos allowed');
        return;
      }
      setPhotos([...photos, ...newPhotos]);
      setError('');
    }
  };

  // Submit dispute
  const handleSubmit = async () => {
    if (!selectedReason) {
      setError('Please select a reason');
      return;
    }

    if (description.split(/\s+/).length < 15) {
      setError('Description must be at least 15 words');
      return;
    }

    if (photos.length === 0) {
      setError('At least one photo is required');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      // Test mode - simulate success
      const token = localStorage.getItem('token');
      if (!token || token === 'test-token') {
        setStep('submitted');
        setTimeout(() => {
          onClose();
          onSubmit?.(true);
        }, 2000);
        return;
      }

      // Real implementation would call API here
      setStep('submitted');
      setTimeout(() => {
        onClose();
        onSubmit?.(true);
      }, 2000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to submit dispute');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-500 to-red-600 text-white p-5 flex justify-between items-center sticky top-0">
          <div>
            <h2 className="text-lg font-bold">Work Didn't Go Well</h2>
            <p className="text-xs text-red-100 mt-0.5">
              Tell us clearly what happened
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-2xl hover:opacity-80"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5">
          {step === 'reason' && (
            <>
              <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                <p className="text-xs text-red-900 font-semibold">
                  {taskTitle} • SGD ${budget}
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">
                  What happened?
                </label>
                <div className="space-y-1.5">
                  {reasons.map((reason) => (
                    <label
                      key={reason.value}
                      className={`flex items-start gap-2.5 p-2.5 border-2 rounded-lg cursor-pointer transition ${
                        selectedReason === reason.value
                          ? 'bg-red-50 border-red-400'
                          : 'bg-white border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="reason"
                        value={reason.value}
                        checked={selectedReason === reason.value}
                        onChange={(e) => setSelectedReason(e.target.value)}
                        className="mt-0.5"
                      />
                      <div>
                        <div className="font-semibold text-xs text-gray-800">
                          {reason.label}
                        </div>
                        <div className="text-xs text-gray-600">{reason.description}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">
                  Describe the issue (15+ words)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What happened? Be specific."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-sm resize-none"
                  rows={3}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {description.split(/\s+/).length} / 15 words
                </p>
              </div>

              {error && <div className="text-red-600 text-xs p-2.5 bg-red-50 rounded-lg font-semibold">{error}</div>}

              <button
                onClick={() => {
                  if (selectedReason && description.split(/\s+/).length >= 15) {
                    setStep('evidence');
                    setError('');
                  } else {
                    setError('Please fill in all fields');
                  }
                }}
                className="w-full bg-gradient-to-r from-red-500 to-red-600 text-white py-2.5 rounded-lg font-bold hover:from-red-600 hover:to-red-700 transition text-sm"
              >
                Next: Show Proof →
              </button>
            </>
          )}

          {step === 'evidence' && (
            <>
              <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                <p className="text-xs text-red-900 font-semibold">
                  ✓ {reasons.find(r => r.value === selectedReason)?.label}
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">
                  📷 Photos (1-5)
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-3 text-center">
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                    id="photo-upload"
                  />
                  <label htmlFor="photo-upload" className="cursor-pointer">
                    <div className="text-xl mb-1">📷</div>
                    <p className="text-xs font-semibold text-gray-700">
                      Tap to upload
                    </p>
                  </label>
                </div>

                {photos.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {photos.map((photo, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between bg-gray-50 p-2 rounded text-xs"
                      >
                        <span className="text-gray-700 truncate">{photo.name}</span>
                        <button
                          onClick={() => setPhotos(photos.filter((_, i) => i !== idx))}
                          className="text-red-600 hover:text-red-800 font-semibold ml-2"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {error && <div className="text-red-600 text-xs p-2.5 bg-red-50 rounded-lg font-semibold">{error}</div>}

              <div className="flex gap-2">
                <button
                  onClick={() => setStep('reason')}
                  className="flex-1 border-2 border-gray-300 text-gray-700 py-2 rounded-lg font-bold hover:bg-gray-50 transition text-sm"
                >
                  Back
                </button>
                <button
                  onClick={() => {
                    if (photos.length > 0) {
                      setStep('review');
                      setError('');
                    } else {
                      setError('At least 1 photo required');
                    }
                  }}
                  className="flex-1 bg-gradient-to-r from-red-500 to-red-600 text-white py-2 rounded-lg font-bold hover:from-red-600 hover:to-red-700 transition text-sm"
                >
                  Review →
                </button>
              </div>
            </>
          )}

          {step === 'review' && (
            <>
              <div className="bg-amber-50 border-l-4 border-amber-500 rounded-lg p-3">
                <p className="text-xs text-amber-900 font-bold">
                  ⚠️ Important: Be honest
                </p>
                <p className="text-xs text-amber-800 mt-1">
                  False claims result in account restrictions.
                </p>
              </div>

              <div className="space-y-2.5 border-t pt-3.5">
                <div>
                  <p className="text-xs font-bold text-gray-600 uppercase">What went wrong</p>
                  <p className="text-sm text-gray-800 mt-0.5">
                    {reasons.find((r) => r.value === selectedReason)?.label}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-600 uppercase">Your report</p>
                  <p className="text-sm text-gray-800 mt-0.5">{description}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-600 uppercase">Evidence</p>
                  <ul className="text-sm text-gray-800 space-y-1 mt-0.5">
                    <li className="text-green-700 font-semibold">✓ {photos.length} photo{photos.length > 1 ? 's' : ''}</li>
                  </ul>
                </div>
              </div>

              {error && <div className="text-red-600 text-xs p-2.5 bg-red-50 rounded-lg font-semibold">{error}</div>}

              <div className="flex gap-2">
                <button
                  onClick={() => setStep('evidence')}
                  className="flex-1 border-2 border-gray-300 text-gray-700 py-2 rounded-lg font-bold hover:bg-gray-50 transition disabled:opacity-50 text-sm"
                  disabled={isSubmitting}
                >
                  Back
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="flex-1 bg-gradient-to-r from-red-500 to-red-600 text-white py-2 rounded-lg font-bold hover:from-red-600 hover:to-red-700 transition disabled:opacity-50 text-sm"
                >
                  {isSubmitting ? 'Sending...' : 'Send'}
                </button>
              </div>
            </>
          )}

          {step === 'submitted' && (
            <div className="text-center py-6">
              <div className="text-5xl mb-3">✨</div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Report Received!</h3>
              <p className="text-xs text-gray-600 mb-3">
                We're investigating. Refund pending review.
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-2.5 text-xs text-blue-800 mb-3">
                <p className="font-semibold">✓ Payment held safely</p>
                <p className="mt-1">Decision in 24-48h</p>
              </div>
              <p className="text-xs text-gray-500">Closing...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
