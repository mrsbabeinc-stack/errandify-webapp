import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import TaskChat from '../components/TaskChat';
import { capitalizeStatus } from '../utils/format';

interface TaskStatus {
  id: number;
  title: string;
  status: string;
  assignmentStatus: string;
  doerName?: string;
  photoCount: number;
  photos: Array<{
    id: number;
    url: string;
    caption?: string;
    uploadedAt: string;
  }>;
  completedAt?: string;
  completionNotes?: string;
}

export default function TaskExecutionPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [task, setTask] = useState<TaskStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [starting, setStarting] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [photoCaption, setPhotoCaption] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [userRole, setUserRole] = useState<'asker' | 'doer' | null>(null);

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      setUserRole(user.role);
    }
    fetchTaskStatus();
  }, [id]);

  const fetchTaskStatus = async () => {
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/tasks/${id}/status`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        }
      );

      setTask(response.data.data);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load errand');
    } finally {
      setLoading(false);
    }
  };

  const handleStartTask = async () => {
    setStarting(true);
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/tasks/${id}/start`,
        {},
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        }
      );

      setSuccess(response.data.data.message);
      setError('');
      setTimeout(() => fetchTaskStatus(), 1000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to start errand');
    } finally {
      setStarting(false);
    }
  };

  const handleUploadPhoto = async () => {
    if (!photoUrl) {
      setError('Please provide a photo URL');
      return;
    }

    setUploading(true);
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/tasks/${id}/upload-photo`,
        {
          photoUrl,
          caption: photoCaption || null,
        },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        }
      );

      setSuccess('Photo uploaded!');
      setPhotoUrl('');
      setPhotoCaption('');
      setError('');
      setTimeout(() => fetchTaskStatus(), 1000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to upload photo');
    } finally {
      setUploading(false);
    }
  };

  const handleCompleteTask = async () => {
    setCompleting(true);
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/tasks/${id}/complete`,
        { approved: true },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        }
      );

      setSuccess(response.data.data.message);
      setError('');
      setTimeout(() => {
        navigate(`/errand/${id}`);
      }, 2000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to complete errand');
    } finally {
      setCompleting(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-center">Loading errand...</div>;
  }

  if (!task) {
    return <div className="p-6 text-center text-red-600">Errand not found</div>;
  }

  const isDoer = userRole === 'doer';
  const isAsker = userRole === 'asker';
  const canStart = isDoer && ['confirmed', 'completed_unconfirmed'].includes(task.status) && task.assignmentStatus !== 'in_progress';
  const canUploadPhotos = isDoer && task.assignmentStatus === 'in_progress';
  const canComplete = isAsker && task.status === 'in_progress';

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white">
      <div className="mb-6">
        <button
          onClick={() => navigate(`/errand/${id}`)}
          className="text-errandify-orange hover:underline text-sm font-semibold"
        >
          ← Back to Errand
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2">
          <h1 className="text-3xl font-bold text-gray-800 mb-4">{task.title}</h1>

          {/* Status Display */}
          <div className="bg-gray-50 p-4 rounded-lg mb-6">
            <p className="text-sm text-gray-600">
              Errand Status: <span className="font-semibold">{capitalizeStatus(task.status)}</span>
            </p>
            {isDoer && (
              <p className="text-sm text-gray-600 mt-1">
                Assignment Status: <span className="font-semibold">{task.assignmentStatus}</span>
              </p>
            )}
          </div>

          {/* Error/Success Messages */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg mb-6 text-red-700">
              {error}
            </div>
          )}

          {success && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg mb-6 text-green-700">
              {success}
            </div>
          )}

          {/* Doer Actions */}
          {isDoer && (
            <div className="space-y-6">
              {/* Start Work */}
              {canStart && (
                <div className="border-2 border-dashed border-errandify-orange rounded-lg p-6">
                  <h2 className="text-xl font-bold mb-3">Ready to Start?</h2>
                  <p className="text-gray-600 mb-4">
                    Click below to mark work as started. Then upload photos of your completed work.
                  </p>
                  <button
                    onClick={handleStartTask}
                    disabled={starting}
                    className="w-full px-4 py-3 bg-errandify-orange text-white rounded-lg font-bold hover:bg-opacity-90 disabled:opacity-50"
                  >
                    {starting ? 'Starting...' : '🚀 Start Work'}
                  </button>
                </div>
              )}

              {/* Upload Photos */}
              {canUploadPhotos && (
                <div className="border-2 border-dashed border-errandify-orange-300 rounded-lg p-6">
                  <h2 className="text-xl font-bold mb-3">📸 Upload Proof of Work</h2>
                  <p className="text-gray-600 mb-4">
                    Share photos of your completed work so the asker can verify.
                  </p>

                  <div className="space-y-3 mb-4">
                    <div>
                      <label className="block text-sm font-semibold mb-2">Photo URL</label>
                      <input
                        type="text"
                        value={photoUrl}
                        onChange={(e) => setPhotoUrl(e.target.value)}
                        placeholder="https://example.com/photo.jpg"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-errandify-orange"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold mb-2">Caption (Optional)</label>
                      <input
                        type="text"
                        value={photoCaption}
                        onChange={(e) => setPhotoCaption(e.target.value)}
                        placeholder="Describe what's in the photo"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-errandify-orange"
                      />
                    </div>

                    <button
                      onClick={handleUploadPhoto}
                      disabled={uploading || !photoUrl}
                      className="w-full px-4 py-2 bg-orange-500 text-white rounded-lg font-semibold hover:bg-orange-600 disabled:opacity-50"
                    >
                      {uploading ? 'Uploading...' : 'Upload Photo'}
                    </button>
                  </div>
                </div>
              )}

              {/* Uploaded Photos */}
              {task.photoCount > 0 && (
                <div>
                  <h3 className="text-lg font-bold mb-3">
                    ✅ Uploaded Photos ({task.photoCount})
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    {task.photos.map((photo) => (
                      <div key={photo.id} className="border border-gray-200 rounded-lg overflow-hidden">
                        <img
                          src={photo.url}
                          alt={photo.caption || 'Work proof'}
                          className="w-full h-32 object-cover"
                        />
                        {photo.caption && (
                          <p className="p-2 text-sm text-gray-600">{photo.caption}</p>
                        )}
                        <p className="p-2 text-xs text-gray-400">
                          {new Date(photo.uploadedAt).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Asker Actions */}
          {isAsker && (
            <div className="space-y-6">
              {/* Review & Complete */}
              {canComplete && (
                <div className="border-2 border-dashed border-green-300 rounded-lg p-6">
                  <h2 className="text-xl font-bold mb-3">✅ Review & Complete</h2>
                  <p className="text-gray-600 mb-4">
                    Review the work and photos. If satisfied, mark as complete.
                  </p>

                  {/* Photos for Review */}
                  {task.photoCount > 0 && (
                    <div className="mb-6">
                      <h3 className="font-semibold mb-3">Work Photos</h3>
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        {task.photos.map((photo) => (
                          <div
                            key={photo.id}
                            className="border border-gray-200 rounded-lg overflow-hidden"
                          >
                            <img
                              src={photo.url}
                              alt={photo.caption || 'Work proof'}
                              className="w-full h-32 object-cover"
                            />
                            {photo.caption && (
                              <p className="p-2 text-sm text-gray-600">{photo.caption}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <button
                    onClick={handleCompleteTask}
                    disabled={completing}
                    className="w-full px-4 py-3 bg-green-500 text-white rounded-lg font-bold hover:bg-green-600 disabled:opacity-50"
                  >
                    {completing ? 'Completing...' : '✓ Mark as Completed'}
                  </button>
                </div>
              )}

              {/* Task Already Completed */}
              {task.status === 'completed_unconfirmed' && (
                <div className="border border-green-200 bg-green-50 p-6 rounded-lg">
                  <p className="text-green-700 font-semibold">
                    ✅ Errand marked complete on {new Date(task.completedAt || '').toLocaleDateString()}
                  </p>
                  {task.completionNotes && (
                    <p className="text-green-600 mt-2">{task.completionNotes}</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar - Task Chat */}
        <div className="lg:col-span-1">
          <TaskChat taskId={parseInt(id || '0', 10)} taskTitle={task.title} />
        </div>
      </div>
    </div>
  );
}
