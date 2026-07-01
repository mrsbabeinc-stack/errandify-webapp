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
  const [disputeType, setDisputeType] = useState<'work_not_completed' | 'low_quality' | 'other'>('work_not_completed');
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
          🔵 <strong>{doerName}</strong> is working on your task. They'll submit proof photos when done.
        </p>
      </div>
    );
  }

  // Asker view: Job completed, awaiting confirmation
  if (!isDoer && status === 'completed_unconfirmed') {
    return (
      <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200 space-y-3">
        <p className="text-sm text-yellow-900">
          🌸 <strong>{doerName}</strong> has completed the task. Please confirm or raise a dispute within 48
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
        <div className="bg-white rounded-lg shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
          {/* Modal Header */}
          <div className="bg-gradient-to-r from-red-600 to-orange-600 text-white p-6 flex justify-between items-center">
            <h2 className="text-xl font-bold">Raise a Dispute</h2>
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
          <div className="p-6 space-y-4">
            <div>
              <h3 className="font-semibold text-gray-800 mb-2">Task: {taskTitle}</h3>
              <p className="text-sm text-gray-600">Budget: SGD ${budget}</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2">
                What's the issue? *
              </label>
              <select
                value={disputeType}
                onChange={(e) => setDisputeType(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
              >
                <option value="work_not_completed">Work Not Completed</option>
                <option value="low_quality">Poor Quality Work</option>
                <option value="other">Other Issue</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2">
                Describe the problem in detail *
              </label>
              <textarea
                value={disputeDescription}
                onChange={(e) => {
                  setDisputeDescription(e.target.value);
                  setDisputeError('');
                }}
                placeholder="Explain what went wrong and include any relevant details..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                rows={5}
              />
              <p className="text-xs text-gray-500 mt-1">
                Min 20 characters. Include specific details about the issue.
              </p>
            </div>

            {disputeError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-700">❌ {disputeError}</p>
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs text-blue-700">
                <strong>ℹ️ What happens next:</strong> Your dispute will be reviewed by our team within 24 hours. Both parties can provide evidence in the chat. Payment is held until resolved.
              </p>
            </div>

            <div className="flex gap-2 pt-4">
              <button
                onClick={() => {
                  setShowDisputeModal(false);
                  setDisputeDescription('');
                  setDisputeError('');
                }}
                disabled={isSubmittingDispute}
                className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg font-semibold hover:bg-gray-50 disabled:opacity-50 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleRaiseDispute}
                disabled={isSubmittingDispute}
                className="flex-1 bg-red-600 text-white py-2 rounded-lg font-semibold hover:bg-red-700 disabled:opacity-50 text-sm"
              >
                {isSubmittingDispute ? '⏳ Submitting...' : '🚨 Raise Dispute'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
