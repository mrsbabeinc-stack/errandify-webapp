import { useState } from 'react';
import axios from 'axios';

interface JobExecutionPanelProps {
  taskId: number;
  taskTitle: string;
  status: string;
  budget: number;
  doerName: string;
  isDoer: boolean;
  onStatusChange: () => void;
}

export default function JobExecutionPanel({
  taskId,
  taskTitle,
  status,
  budget,
  doerName,
  isDoer,
  onStatusChange,
}: JobExecutionPanelProps) {
  const [isStarting, setIsStarting] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [showPhotos, setShowPhotos] = useState(false);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [gpsEnabled, setGpsEnabled] = useState(false);
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [disputeType, setDisputeType] = useState<'work_not_completed' | 'low_quality' | 'safety_concern' | 'payment_issue' | 'other'>('work_not_completed');
  const [disputeDescription, setDisputeDescription] = useState('');
  const [isSubmittingDispute, setIsSubmittingDispute] = useState(false);
  const [disputeError, setDisputeError] = useState('');

  const handleStartJob = async () => {
    if (!isDoer) return;

    setIsStarting(true);
    setError('');

    try {
      // Get GPS coordinates if available
      let latitude, longitude;
      if (navigator.geolocation) {
        await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              latitude = position.coords.latitude;
              longitude = position.coords.longitude;
              setGpsEnabled(true);
              resolve(null);
            },
            (error) => {
              console.log('GPS not available:', error);
              resolve(null); // Continue even if GPS fails
            }
          );
        });
      }

      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/jobs/${taskId}/start`,
        { latitude, longitude },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success) {
        alert('✓ Job started! Asker notified.');
        onStatusChange();
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to start job');
    } finally {
      setIsStarting(false);
    }
  };

  const handleCompleteJob = async () => {
    if (!isDoer) return;

    setIsCompleting(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/jobs/${taskId}/complete`,
        { photoUrls: photoUrls.length > 0 ? photoUrls : null },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success) {
        alert(
          `✓ Job completed! Payment will be released automatically in 48 hours unless asker raises a dispute.`
        );
        onStatusChange();
        setShowPhotos(false);
        setPhotoUrls([]);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to complete job');
    } finally {
      setIsCompleting(false);
    }
  };

  const handleRaiseDispute = async () => {
    if (!disputeDescription.trim()) {
      setDisputeError('Please describe the issue');
      return;
    }

    setIsSubmittingDispute(true);
    setDisputeError('');

    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/disputes`,
        {
          errandId: taskId,
          type: disputeType,
          description: disputeDescription,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      alert('✅ Dispute raised successfully. Payment is held. Admin will review within 24 hours.');
      setShowDisputeModal(false);
      setDisputeDescription('');
      setDisputeType('work_not_completed');
      onStatusChange();
    } catch (err: any) {
      setDisputeError(err.response?.data?.error || 'Failed to raise dispute');
    } finally {
      setIsSubmittingDispute(false);
    }
  };

  // Doer view: Job execution controls
  if (isDoer && status === 'confirmed') {
    return (
      <div className="bg-white rounded-lg p-4 border border-gray-200">
        <h3 className="font-semibold text-errandify-brown mb-3">Ready to start?</h3>
        <button
          onClick={handleStartJob}
          disabled={isStarting}
          className="w-full bg-errandify-orange text-white py-3 rounded-lg font-bold hover:bg-opacity-90 disabled:opacity-50"
        >
          {isStarting ? 'Starting...' : '▶️ Start Job'}
        </button>
        {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
        {gpsEnabled && <p className="text-xs text-gray-500 mt-2">📍 GPS location recorded</p>}
      </div>
    );
  }

  // Doer view: Job in progress
  if (isDoer && status === 'in_progress') {
    return (
      <div className="bg-white rounded-lg p-4 border border-gray-200">
        <h3 className="font-semibold text-errandify-brown mb-3">Job in progress</h3>
        <p className="text-sm text-gray-600 mb-4">
          You can upload up to 5 proof photos when you're done.
        </p>

        {!showPhotos ? (
          <button
            onClick={() => setShowPhotos(true)}
            className="w-full bg-green-500 text-white py-3 rounded-lg font-bold hover:bg-opacity-90"
          >
            ✓ End Job & Upload Proof
          </button>
        ) : (
          <div>
            <div className="mb-4">
              <label className="block text-sm font-semibold text-errandify-brown mb-2">
                Proof Photos (max 5)
              </label>
              <div className="space-y-2">
                {photoUrls.map((url, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                    <span className="text-sm text-gray-600">{idx + 1}. Photo uploaded</span>
                    <button
                      onClick={() => setPhotoUrls(photoUrls.filter((_, i) => i !== idx))}
                      className="text-red-500 text-sm ml-auto"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
              {photoUrls.length < 5 && (
                <p className="text-xs text-gray-500 mt-2">
                  {photoUrls.length} / 5 photos • TODO: Implement photo upload UI
                </p>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowPhotos(false)}
                className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg font-semibold hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCompleteJob}
                disabled={isCompleting}
                className="flex-1 bg-green-500 text-white py-2 rounded-lg font-bold hover:bg-opacity-90 disabled:opacity-50"
              >
                {isCompleting ? 'Submitting...' : 'Submit & Complete'}
              </button>
            </div>
          </div>
        )}

        {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
      </div>
    );
  }

  // Asker view: Job in progress (informational)
  if (!isDoer && status === 'in_progress') {
    return (
      <div className="bg-orange-50 rounded-lg p-4 border border-errandify-orange-200">
        <p className="text-sm text-errandify-orange-900">
          🔵 <strong>{doerName}</strong> is working on your errand. They'll submit proof photos when done.
        </p>
      </div>
    );
  }

  // Doer view: Job completed, awaiting asker confirmation
  if (isDoer && status === 'completed_unconfirmed') {
    return (
      <div className="bg-blue-50 rounded-lg p-4 border border-blue-200 space-y-3">
        <p className="text-sm text-blue-900">
          ⏳ You've submitted completion evidence. Waiting for asker to review within 48 hours.
        </p>
        <p className="text-xs text-blue-800">
          If you believe there's an issue, you can raise a dispute (safety concerns, payment issues, etc).
        </p>
        <button
          onClick={() => setShowDisputeModal(true)}
          className="w-full border border-blue-300 text-blue-900 py-2 rounded font-semibold text-sm hover:bg-blue-100"
        >
          🚨 Raise a Dispute
        </button>
      </div>
    );
  }

  // Asker view: Job completed, awaiting confirmation
  if (!isDoer && status === 'completed_unconfirmed') {
    return (
      <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200 space-y-3">
        <p className="text-sm text-yellow-900">
          🌸 <strong>{doerName}</strong> has completed the errand. Please confirm or raise a dispute within 48
          hours.
        </p>
        <p className="text-xs text-yellow-800">
          Payment will be released automatically if no action is taken.
        </p>
        <div className="flex gap-2 pt-2">
          <button
            onClick={() => {
              // TODO: Implement confirm
              alert('TODO: Confirm completion flow');
            }}
            className="flex-1 bg-green-500 text-white py-2 rounded font-semibold text-sm hover:bg-opacity-90"
          >
            ✓ Confirm Work
          </button>
          <button
            onClick={() => setShowDisputeModal(true)}
            className="flex-1 border border-yellow-300 text-yellow-900 py-2 rounded font-semibold text-sm hover:bg-yellow-100"
          >
            ⚠️ Raise Dispute
          </button>
        </div>
      </div>
    );
  }

  // Dispute Modal
  if (showDisputeModal) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          {/* Modal Header */}
          <div className="bg-gradient-to-r from-amber-600 to-orange-600 text-white p-6 flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">🤝 Let's Resolve This Together</h2>
              <p className="text-xs text-amber-100 mt-1">We're sorry there's an issue. Our community works best when we understand both sides.</p>
            </div>
            <button
              onClick={() => {
                setShowDisputeModal(false);
                setDisputeDescription('');
                setDisputeError('');
              }}
              className="text-2xl hover:opacity-80"
            >
              ×
            </button>
          </div>

          {/* Modal Content */}
          <div className="p-6 space-y-5">
            {/* Task Info */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <h3 className="font-semibold text-gray-800 mb-1">Errand: {taskTitle}</h3>
              <p className="text-sm text-gray-600">Budget: SGD ${budget} | Doer: {doerName}</p>
            </div>

            {/* Warm Intro */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-sm text-amber-900 leading-relaxed">
                <strong>We've got this 💪</strong> Payment is protected for both of you. We'll review everything fairly
                within 24 hours. Your job is to explain what went wrong—be specific and honest.
              </p>
            </div>

            {/* Issue Category */}
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-3">
                Help us understand what happened *
              </label>
              <div className="space-y-2">
                {(isDoer
                  ? [
                      { value: 'payment_issue', label: '💰 Payment Issue', desc: 'Payment not released or dispute about payment' },
                      { value: 'safety_concern', label: '🚨 Safety/Accident', desc: 'Injury, damage, or safety violation occurred' },
                      { value: 'other', label: '❓ Other Dispute', desc: 'Communication breakdown or other concern' },
                    ]
                  : [
                      { value: 'work_not_completed', label: '❌ Work Wasn\'t Completed', desc: 'Parts of the errand weren\'t done' },
                      { value: 'low_quality', label: '⚠️ Quality Issues', desc: 'Work was done but doesn\'t match what was promised' },
                      { value: 'safety_concern', label: '🚨 Safety/Accident', desc: 'Property damage, injury, or safety violation' },
                      { value: 'other', label: '❓ Other Issue', desc: 'Communication breakdown or other concern' },
                    ]
                ).map((option) => (
                  <label
                    key={option.value}
                    className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition ${
                      disputeType === option.value
                        ? 'bg-amber-50 border-amber-400'
                        : 'bg-white border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="dispute-type"
                      value={option.value}
                      checked={disputeType === option.value}
                      onChange={(e) => setDisputeType(e.target.value as any)}
                      className="mt-1"
                    />
                    <div>
                      <div className="font-semibold text-sm text-gray-800">{option.label}</div>
                      <div className="text-xs text-gray-600">{option.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2">
                Tell us what happened (be specific) *
              </label>
              <textarea
                value={disputeDescription}
                onChange={(e) => {
                  setDisputeDescription(e.target.value);
                  setDisputeError('');
                }}
                placeholder={`Example: "${doerName} was supposed to paint both bedrooms but only did the master bedroom. I have photos."`}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm resize-none"
                rows={4}
              />
              <div className="flex justify-between items-center mt-2">
                <p className="text-xs text-gray-500">
                  ✓ Specific details help us decide fairly
                </p>
                <p className="text-xs text-gray-400">
                  {disputeDescription.length} chars
                </p>
              </div>
            </div>

            {/* Error */}
            {disputeError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-700">❌ {disputeError}</p>
              </div>
            )}

            {/* Safety & Protection */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-2">
              <p className="text-sm font-semibold text-green-900">🛡️ Your Protection</p>
              <ul className="text-xs text-green-800 space-y-1">
                <li>✓ Payment is locked—{doerName} can't access it yet</li>
                <li>✓ We review within 24 hours</li>
                <li>✓ {doerName} gets to share their side too</li>
                <li>✓ Our team looks for fair solutions</li>
                <li>✓ All decisions are final and documented</li>
              </ul>
            </div>

            {/* Buttons */}
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => {
                  setShowDisputeModal(false);
                  setDisputeDescription('');
                  setDisputeError('');
                }}
                disabled={isSubmittingDispute}
                className="flex-1 border border-gray-300 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-50 disabled:opacity-50 transition text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleRaiseDispute}
                disabled={isSubmittingDispute || !disputeDescription.trim()}
                className="flex-1 bg-amber-600 text-white py-3 rounded-lg font-semibold hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition text-sm"
              >
                {isSubmittingDispute ? '⏳ Submitting...' : '✅ Submit for Review'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
