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
      <div className="bg-errandify-orange-50 rounded-lg p-4 border border-errandify-orange-200">
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
            onClick={() => {
              // TODO: Implement dispute
              alert('TODO: Raise dispute flow');
            }}
            className="flex-1 border border-yellow-300 text-yellow-900 py-2 rounded font-semibold text-sm hover:bg-yellow-100"
          >
            ⚠️ Raise Dispute
          </button>
        </div>
      </div>
    );
  }

  return null;
}
