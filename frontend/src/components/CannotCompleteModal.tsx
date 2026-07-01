import React, { useState } from 'react';
import axios from 'axios';

interface CannotCompleteModalProps {
  taskId: number;
  taskTitle: string;
  budget: number;
  isOpen: boolean;
  onClose: () => void;
  onSubmit?: (success: boolean) => void;
}

export default function CannotCompleteModal({
  taskId,
  taskTitle,
  budget,
  isOpen,
  onClose,
  onSubmit,
}: CannotCompleteModalProps) {
  const [step, setStep] = useState<'reason' | 'evidence' | 'review' | 'submitted'>('reason');
  const [selectedReason, setSelectedReason] = useState('');
  const [description, setDescription] = useState('');
  const [waitTime, setWaitTime] = useState<number>(0);
  const [photos, setPhotos] = useState<File[]>([]);
  const [gpsLocation, setGpsLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const reasons = [
    {
      value: 'asker_unavailable',
      label: 'Asker Unavailable/Ghosted',
      description: 'Asker wasn\'t home or didn\'t respond',
    },
    {
      value: 'asker_changed_scope',
      label: 'Asker Changed Scope',
      description: 'Job requirements changed mid-work',
    },
    {
      value: 'access_denied',
      label: 'Access Denied',
      description: 'Couldn\'t access location or materials',
    },
    {
      value: 'materials_not_provided',
      label: 'Materials Not Provided',
      description: 'Asker didn\'t provide required materials',
    },
    {
      value: 'asker_unresponsive',
      label: 'Asker Unresponsive',
      description: 'Asker wouldn\'t answer calls/messages',
    },
    {
      value: 'other',
      label: 'Other',
      description: 'Something else prevented completion',
    },
  ];

  // Get GPS location
  const handleGetGPSLocation = async () => {
    if (!navigator.geolocation) {
      setError('GPS not available on this device');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGpsLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setError('');
      },
      (error) => {
        setError(`GPS error: ${error.message}`);
      }
    );
  };

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

    if (description.split(/\s+/).length < 50) {
      setError('Description must be at least 50 words');
      return;
    }

    if (!gpsLocation) {
      setError('GPS location is required');
      return;
    }

    if (photos.length === 0) {
      setError('At least one photo is required');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const token = localStorage.getItem('token');

      // Prepare FormData for file upload
      const formData = new FormData();
      formData.append('errandId', taskId.toString());
      formData.append('type', 'asker_prevented');
      formData.append('description', description);
      formData.append('cannot_complete_reason', selectedReason);
      formData.append('gps_latitude', gpsLocation.lat.toString());
      formData.append('gps_longitude', gpsLocation.lng.toString());
      formData.append('wait_time_minutes', waitTime.toString());

      // Add photos
      photos.forEach((photo, idx) => {
        formData.append(`photo_${idx}`, photo);
      });

      const response = await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/disputes`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      if (response.data.success) {
        setStep('submitted');
        setTimeout(() => {
          onClose();
          onSubmit?.(true);
        }, 2000);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to submit dispute');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 flex justify-between items-center sticky top-0">
          <div>
            <h2 className="text-2xl font-bold">I Cannot Complete This Job</h2>
            <p className="text-xs text-blue-100 mt-1">
              Tell us what prevented you from completing the work
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
        <div className="p-6 space-y-6">
          {/* Step 1: Select Reason */}
          {step === 'reason' && (
            <>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-900">
                  <strong>Job:</strong> {taskTitle} • <strong>Amount:</strong> SGD ${budget}
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-3">
                  What prevented you from completing? *
                </label>
                <div className="space-y-2">
                  {reasons.map((reason) => (
                    <label
                      key={reason.value}
                      className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition ${
                        selectedReason === reason.value
                          ? 'bg-blue-50 border-blue-400'
                          : 'bg-white border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="reason"
                        value={reason.value}
                        checked={selectedReason === reason.value}
                        onChange={(e) => setSelectedReason(e.target.value)}
                        className="mt-1"
                      />
                      <div>
                        <div className="font-semibold text-sm text-gray-800">
                          {reason.label}
                        </div>
                        <div className="text-xs text-gray-600">{reason.description}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">
                  Describe what happened (be specific) *
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Example: I arrived at the location but the asker didn't answer the door or respond to my messages. I waited 25 minutes with no response."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none"
                  rows={4}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Minimum 50 words • {description.split(/\s+/).length} / 50
                </p>
              </div>

              {error && <div className="text-red-600 text-sm p-3 bg-red-50 rounded">{error}</div>}

              <button
                onClick={() => {
                  if (selectedReason && description.split(/\s+/).length >= 50) {
                    setStep('evidence');
                    setError('');
                  } else {
                    setError('Please fill in all fields');
                  }
                }}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition"
              >
                Next: Provide Evidence →
              </button>
            </>
          )}

          {/* Step 2: Collect Evidence */}
          {step === 'evidence' && (
            <>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-green-900">
                  <strong>✓ Reason recorded:</strong> {selectedReason}
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-3">
                  GPS Location (proof you were at the location) *
                </label>
                {gpsLocation ? (
                  <div className="bg-green-50 border border-green-300 rounded-lg p-3 flex items-center justify-between">
                    <div className="text-sm text-green-900">
                      ✓ Location captured
                      <p className="text-xs text-green-700 mt-1">
                        {gpsLocation.lat.toFixed(4)}, {gpsLocation.lng.toFixed(4)}
                      </p>
                    </div>
                    <button
                      onClick={() => setGpsLocation(null)}
                      className="text-sm text-red-600 hover:text-red-800"
                    >
                      Clear
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleGetGPSLocation}
                    className="w-full border-2 border-blue-400 text-blue-700 py-2 rounded-lg font-semibold hover:bg-blue-50 transition"
                  >
                    📍 Capture GPS Location
                  </button>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-3">
                  Photos from the job site (proof of attempt) *
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                    id="photo-upload"
                  />
                  <label htmlFor="photo-upload" className="cursor-pointer">
                    <div className="text-2xl mb-2">📷</div>
                    <p className="text-sm font-semibold text-gray-700">
                      Click to upload or drag photos
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Min: 1 photo • Max: 5 photos • PNG, JPG
                    </p>
                  </label>
                </div>

                {photos.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {photos.map((photo, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between bg-gray-50 p-2 rounded"
                      >
                        <span className="text-xs text-gray-700">{photo.name}</span>
                        <button
                          onClick={() => setPhotos(photos.filter((_, i) => i !== idx))}
                          className="text-red-600 text-sm hover:text-red-800"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">
                  How long did you wait? (minutes)
                </label>
                <input
                  type="number"
                  value={waitTime}
                  onChange={(e) => setWaitTime(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="e.g., 25"
                  min="0"
                  max="120"
                />
              </div>

              {error && <div className="text-red-600 text-sm p-3 bg-red-50 rounded">{error}</div>}

              <div className="flex gap-2">
                <button
                  onClick={() => setStep('reason')}
                  className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg font-semibold hover:bg-gray-50 transition"
                >
                  ← Back
                </button>
                <button
                  onClick={() => {
                    if (gpsLocation && photos.length > 0) {
                      setStep('review');
                      setError('');
                    } else {
                      setError('GPS location and at least one photo are required');
                    }
                  }}
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-bold hover:bg-blue-700 transition"
                >
                  Review & Submit →
                </button>
              </div>
            </>
          )}

          {/* Step 3: Review */}
          {step === 'review' && (
            <>
              <div className="bg-amber-50 border border-amber-300 rounded-lg p-4">
                <p className="text-sm text-amber-900 font-semibold">
                  ⚠️ Important: False claims can result in account restrictions
                </p>
                <p className="text-xs text-amber-800 mt-2">
                  By submitting this dispute, you confirm that everything you've provided is true
                  and accurate.
                </p>
              </div>

              <div className="space-y-3 border-t pt-4">
                <div>
                  <p className="text-xs font-semibold text-gray-600">REASON</p>
                  <p className="text-sm text-gray-800">
                    {reasons.find((r) => r.value === selectedReason)?.label}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-600">DESCRIPTION</p>
                  <p className="text-sm text-gray-800">{description}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-600">EVIDENCE</p>
                  <ul className="text-sm text-gray-800 space-y-1">
                    <li>✓ GPS location: Recorded</li>
                    <li>✓ Photos: {photos.length} uploaded</li>
                    <li>✓ Wait time: {waitTime} minutes</li>
                  </ul>
                </div>
              </div>

              {error && <div className="text-red-600 text-sm p-3 bg-red-50 rounded">{error}</div>}

              <div className="flex gap-2">
                <button
                  onClick={() => setStep('evidence')}
                  className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg font-semibold hover:bg-gray-50 transition disabled:opacity-50"
                  disabled={isSubmitting}
                >
                  ← Back
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-bold hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Dispute'}
                </button>
              </div>
            </>
          )}

          {/* Step 4: Submitted */}
          {step === 'submitted' && (
            <div className="text-center py-8">
              <div className="text-5xl mb-4">✅</div>
              <h3 className="text-xl font-bold text-green-900 mb-2">Dispute Submitted!</h3>
              <p className="text-sm text-gray-600 mb-4">
                Your dispute has been created. Both you and the asker have 48 hours to present evidence.
              </p>
              <p className="text-xs text-gray-500">
                Payment is held safely while we review. You'll be notified of the decision within 24-48 hours.
              </p>
              <p className="text-xs text-blue-600 mt-3">Closing in 2 seconds...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
