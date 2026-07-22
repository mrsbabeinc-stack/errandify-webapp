import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

interface TaskDetail {
  id: number;
  title: string;
  category: string;
  status: string;
  budget: number;
  doer_id?: number;
  asker_id?: number;
  doer?: { display_name: string; alias?: string };
  doer_alias?: string;
  description?: string;
  completion_notes?: string;
  accepted_bid_id?: number;
}

interface Photo {
  id: number;
  photo_url: string;
  uploaded_by: number;
  uploaded_at: string;
}

export default function ReviewCompletionPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [task, setTask] = useState<TaskDetail | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [completionNotes, setCompletionNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [nominateAsStarOfMonth, setNominateAsStarOfMonth] = useState(false);

  useEffect(() => {
    fetchTaskAndCompletion();
  }, [id]);

  const fetchTaskAndCompletion = async () => {
    try {
      const token = localStorage.getItem('token');

      // Fetch task details
      const taskResponse = await axios.get(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/errands/${id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const taskData = taskResponse.data.data;
      setTask(taskData);

      // Fetch doer info if not included in task response
      if (!taskData.doer && taskData.accepted_bid_id) {
        try {
          // Try to fetch bid details to get doer info
          const bidResponse = await axios.get(
            `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/bids/${taskData.accepted_bid_id}`,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );
          if (bidResponse.data.data?.doer_name) {
            taskData.doer = { display_name: bidResponse.data.data.doer_name };
          }
        } catch (e) {
          console.warn('Could not fetch doer info:', e);
        }
      }

      // Fetch completion photos
      const photosResponse = await axios.get(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/jobs/${id}/photos`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setPhotos(photosResponse.data.data || []);

      // Fetch completion notes from task
      const notes = taskData?.completion_notes;
      if (notes) {
        setCompletionNotes(notes);
      }

      setError('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load completion details');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveCompletion = async () => {
    if (!window.confirm('Approve this completion and release payment?')) {
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/jobs/${id}/confirm`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      // If nomination is checked, submit nomination
      if (nominateAsStarOfMonth && task?.doer) {
        try {
          await axios.post(
            `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/community/nominate`,
            {
              doer_id: task.doer_id,
              doer_name: task.doer.display_name,
              task_id: task.id,
              task_title: task.title,
              nomination_reason: `Exceptional work on ${task.title}`,
              budget: task.budget,
            },
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );
          alert('✓ Completion approved! Payment released.\n✓ Doer nominated as Star of the Month!');
        } catch (nominationErr) {
          console.warn('Nomination failed but completion approved:', nominationErr);
          alert('✓ Completion approved! Payment released.\n⚠️ Nomination could not be submitted.');
        }
      } else {
        alert('✓ Completion approved! Payment released.');
      }

      navigate('/errands');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to approve completion');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequestMoreWork = async () => {
    const reason = window.prompt('Please explain what additional work is needed:');
    if (reason === null || !reason.trim()) {
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/jobs/${id}/request-more-work`,
        { reason: reason.trim() },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      alert('✓ Doer notified. Errand status returned to in progress.');
      navigate('/errands');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to request more work');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-errandify-bg flex items-center justify-center">
        <p className="text-gray-600">Loading completion details...</p>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="min-h-screen bg-errandify-bg flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-700 font-semibold mb-4">Errand not found</p>
          <button
            onClick={() => navigate('/errands')}
            className="text-errandify-orange font-semibold"
          >
            ← Back to My Errands
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-errandify-bg pb-32">
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Header */}
        <button
          onClick={() => navigate('/errands')}
          className="text-errandify-orange font-semibold mb-6 text-sm"
        >
          ← Back
        </button>

        {/* Card */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {/* Header Section */}
          <div className="bg-gradient-to-r from-errandify-orange to-orange-500 text-white p-4">
            <h1 className="text-xl font-bold mb-2">Review Completion</h1>
            <p className="text-sm opacity-90">{task.title}</p>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Error Alert */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* Task Info */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h2 className="font-semibold text-errandify-brown mb-3">Errand Information</h2>
              <div className="space-y-2 text-sm">
                <div><span className="text-gray-600">Title:</span> <span className="font-medium">{task.title}</span></div>
                <div><span className="text-gray-600">Category:</span> <span className="font-medium">{task.category}</span></div>
                <div><span className="text-gray-600">Doer:</span> <span className="font-medium">{task.doer?.alias || task.doer?.display_name || 'Unknown'}</span></div>
                <div><span className="text-gray-600">Budget:</span> <span className="font-bold text-errandify-orange">SGD ${task.budget.toFixed(2)}</span></div>
              </div>
            </div>

            {/* Photos Gallery */}
            {photos.length > 0 && (
              <div>
                <h3 className="font-semibold text-errandify-brown mb-3">📸 Completion Evidence</h3>

                {/* Main Photo Display */}
                <div className="mb-4 bg-gray-100 rounded-lg overflow-hidden">
                  <img
                    src={photos[selectedPhotoIndex]?.photo_url}
                    alt={`Completion photo ${selectedPhotoIndex + 1}`}
                    className="w-full h-80 object-cover"
                  />
                </div>

                {/* Photo Thumbnails */}
                {photos.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {photos.map((photo, index) => (
                      <button
                        key={photo.id}
                        onClick={() => setSelectedPhotoIndex(index)}
                        className={`flex-shrink-0 w-16 h-16 rounded border-2 overflow-hidden transition-all ${
                          index === selectedPhotoIndex
                            ? 'border-errandify-orange'
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                      >
                        <img
                          src={photo.photo_url}
                          alt={`Thumb ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}

                <p className="text-xs text-gray-500 mt-2">
                  Photo {selectedPhotoIndex + 1} of {photos.length}
                </p>
              </div>
            )}

            {/* Completion Notes */}
            {completionNotes && (
              <div>
                <h3 className="font-semibold text-errandify-brown mb-2">📝 Doer's Notes</h3>
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {completionNotes}
                  </p>
                </div>
              </div>
            )}

            {/* No Evidence */}
            {photos.length === 0 && !completionNotes && (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  ⚠️ No completion evidence provided
                </p>
              </div>
            )}

            {/* Nomination Checkbox */}
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={nominateAsStarOfMonth}
                  onChange={(e) => setNominateAsStarOfMonth(e.target.checked)}
                  className="w-5 h-5 mt-0.5 cursor-pointer accent-errandify-orange"
                />
                <div>
                  <p className="font-semibold text-errandify-brown">🌟 Nominate as Star of the Month</p>
                  <p className="text-xs text-gray-600 mt-1">
                    Recognize {task?.doer?.alias || task?.doer?.display_name || 'this doer'} for exceptional work and add them to the Hall of Stars
                  </p>
                </div>
              </label>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3 mt-6">
              <button
                onClick={handleApproveCompletion}
                disabled={submitting}
                className={`py-3 rounded-lg font-bold text-white transition-all ${
                  submitting
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                ✓ Approve
              </button>
              <button
                onClick={handleRequestMoreWork}
                disabled={submitting}
                className={`py-3 rounded-lg font-bold text-white transition-all ${
                  submitting
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-orange-600 hover:bg-orange-700'
                }`}
              >
                ← Request Changes
              </button>
            </div>

            {/* Info */}
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs text-blue-800">
                ℹ️ <strong>Approve</strong> to release payment immediately. <strong>Request Changes</strong> to send the errand back to in progress status.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
