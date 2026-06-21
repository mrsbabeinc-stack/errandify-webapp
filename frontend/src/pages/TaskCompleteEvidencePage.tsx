import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import HanaAssistant from '../components/HanaAssistant';

interface TaskDetail {
  id: number;
  title: string;
  category: string;
  status: string;
  budget: number;
  asker_id: number;
  asker?: { display_name: string };
}

export default function TaskCompleteEvidencePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [task, setTask] = useState<TaskDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [completionNotes, setCompletionNotes] = useState('');
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);

  useEffect(() => {
    fetchTaskDetail();
  }, [id]);

  const fetchTaskDetail = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/errands/${id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setTask(response.data.data);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load task');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      // Max 5 files
      const newFiles = Array.from(files).slice(0, 5 - uploadedFiles.length);
      if (uploadedFiles.length + newFiles.length > 5) {
        setError('Maximum 5 photos allowed');
        return;
      }
      setUploadedFiles([...uploadedFiles, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    setUploadedFiles(uploadedFiles.filter((_, i) => i !== index));
  };

  const uploadFiles = async () => {
    if (uploadedFiles.length === 0) {
      return [];
    }

    // In a real implementation, these would be uploaded to a file storage service (S3, Cloudinary, etc.)
    // For MVP, we'll create data URLs or mock URLs
    const urls: string[] = [];

    for (let i = 0; i < uploadedFiles.length; i++) {
      // Create a data URL for the file (for demo purposes)
      // In production, upload to cloud storage and get real URLs
      const reader = new FileReader();
      await new Promise((resolve, reject) => {
        reader.onload = (e) => {
          const dataUrl = e.target?.result as string;
          urls.push(dataUrl);
          resolve(null);
        };
        reader.onerror = reject;
        reader.readAsDataURL(uploadedFiles[i]);
      });
    }

    return urls;
  };

  const handleSubmitCompletion = async () => {
    if (uploadedFiles.length === 0 && !completionNotes.trim()) {
      setError('Please provide at least a photo or completion notes');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      // First upload photos if any
      let uploadedUrls: string[] = [];
      if (uploadedFiles.length > 0) {
        try {
          uploadedUrls = await uploadFiles();
        } catch (uploadErr: any) {
          console.warn('Photo upload failed, continuing without photos:', uploadErr);
          // Continue without photos - notes are sufficient for MVP
        }
      }

      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/jobs/${id}/complete`,
        {
          photoUrls: uploadedUrls,
          completionNotes: completionNotes.trim(),
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      // Redirect to success page or my offers
      alert('✓ Work submitted! Waiting for asker to review.');
      navigate('/my-offer');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to submit completion');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-errandify-bg flex items-center justify-center">
        <p className="text-gray-600">Loading task details...</p>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="min-h-screen bg-errandify-bg flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-700 font-semibold mb-4">Task not found</p>
          <button
            onClick={() => navigate('/my-offer')}
            className="text-errandify-orange font-semibold"
          >
            ← Back to My Offers
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
          onClick={() => navigate('/my-offer')}
          className="text-errandify-orange font-semibold mb-6 text-sm"
        >
          ← Back
        </button>

        {/* Card */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {/* Header Section */}
          <div className="bg-gradient-to-r from-errandify-orange to-orange-500 text-white p-4">
            <h1 className="text-xl font-bold mb-2">Submit Completion Evidence</h1>
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
              <h2 className="font-semibold text-errandify-brown mb-2">Task Information</h2>
              <div className="space-y-1 text-sm">
                <p><span className="text-gray-600">Title:</span> <span className="font-medium">{task.title}</span></p>
                <p><span className="text-gray-600">Category:</span> <span className="font-medium">{task.category}</span></p>
                <p><span className="text-gray-600">Asker:</span> <span className="font-medium">{task.asker?.display_name || 'Anonymous'}</span></p>
                <p><span className="text-gray-600">Budget:</span> <span className="font-bold text-errandify-orange">SGD ${task.budget.toFixed(2)}</span></p>
              </div>
            </div>

            {/* Photo Upload */}
            <div>
              <h3 className="font-semibold text-errandify-brown mb-3">📸 Upload Completion Photos</h3>
              <p className="text-xs text-gray-600 mb-3">Upload up to 5 photos showing the completed work</p>

              <div className="mb-4">
                <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-6 cursor-pointer hover:border-errandify-orange hover:bg-orange-50 transition-colors">
                  <span className="text-3xl mb-2">📷</span>
                  <span className="font-semibold text-gray-700 text-center">Click to upload photos</span>
                  <span className="text-xs text-gray-500 mt-1">or drag and drop</span>
                  <span className="text-xs text-gray-400 mt-1">Max 5 photos • JPG, PNG</span>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Uploaded Files Preview */}
              {uploadedFiles.length > 0 && (
                <div>
                  <p className="text-xs text-gray-600 mb-2">Selected files ({uploadedFiles.length}/5):</p>
                  <div className="space-y-2">
                    {uploadedFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded border border-gray-200">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span className="text-sm">📄</span>
                          <span className="text-sm text-gray-700 truncate">{file.name}</span>
                          <span className="text-xs text-gray-500">({(file.size / 1024 / 1024).toFixed(1)} MB)</span>
                        </div>
                        <button
                          onClick={() => removeFile(index)}
                          className="text-red-500 hover:text-red-700 font-bold ml-2"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Completion Notes */}
            <div>
              <h3 className="font-semibold text-errandify-brown mb-3">📝 Completion Notes</h3>
              <p className="text-xs text-gray-600 mb-3">Describe what you did and any important details</p>
              <textarea
                value={completionNotes}
                onChange={(e) => setCompletionNotes(e.target.value)}
                placeholder="E.g., 'Cleaned the living room thoroughly, organized shelves, took out all trash...'"
                rows={5}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-errandify-orange focus:border-transparent text-sm"
              />
              <p className="text-xs text-gray-500 mt-2">{completionNotes.length} characters</p>
            </div>

            {/* Submit Button */}
            <button
              onClick={handleSubmitCompletion}
              disabled={submitting}
              className={`w-full py-3 rounded-lg font-bold text-white transition-all ${
                submitting
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-errandify-orange hover:bg-opacity-90'
              }`}
            >
              {submitting ? '⏳ Submitting...' : '✓ Submit Completion Evidence'}
            </button>

            {/* Info */}
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs text-blue-800">
                ℹ️ Once submitted, the asker will review your completion evidence and either approve the work or request more changes.
              </p>
            </div>
          </div>
        </div>
      </div>
      <HanaAssistant />
    </div>
  );
}
