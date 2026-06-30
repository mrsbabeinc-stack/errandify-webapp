import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { uploadMultiplePhotos } from '../utils/photoUploadService.js';

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
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadingPhotoIndex, setUploadingPhotoIndex] = useState<number | null>(null);

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

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Not authenticated');
      }

      // Upload to Alibaba OSS using signed URLs
      const uploadedPhotos = await uploadMultiplePhotos(
        {
          token,
          errandId: parseInt(id || '0', 10),
          files: uploadedFiles,
        },
        (photoUrl: string, index: number, total: number) => {
          setUploadProgress(Math.round((index / total) * 100));
          setUploadingPhotoIndex(index);
        }
      );

      // Return the public URLs from Alibaba
      return uploadedPhotos.map(photo => photo.photoUrl);
    } catch (err: any) {
      console.error('Alibaba photo upload error:', err);
      throw new Error(`Photo upload failed: ${err.message || 'Unknown error'}`);
    }
  };

  const handleSubmitCompletion = async () => {
    if (uploadedFiles.length === 0 && !completionNotes.trim()) {
      setError('Please provide at least a photo or completion notes');
      return;
    }

    setSubmitting(true);
    setError('');
    setUploadProgress(0);

    try {
      // First upload photos if any
      let uploadedUrls: string[] = [];
      if (uploadedFiles.length > 0) {
        try {
          uploadedUrls = await uploadFiles();
          setUploadProgress(100);
        } catch (uploadErr: any) {
          console.warn('Alibaba photo upload failed, continuing without photos:', uploadErr);
          setError(`⚠️ Photo upload failed: ${uploadErr.message}. Continuing without photos...`);
          // Continue without photos - notes are sufficient for MVP
          setTimeout(() => setError(''), 3000);
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

      // Show success message and redirect
      setError(''); // Clear any errors

      // Create a warm, engaging toast notification
      const toastDiv = document.createElement('div');
      toastDiv.className = 'fixed top-4 left-4 right-4 bg-gradient-to-r from-emerald-400 via-teal-500 to-cyan-600 text-white p-5 rounded-lg shadow-2xl z-50 text-center';
      toastDiv.innerHTML = `
        <p style="font-size: 1.1rem; font-weight: bold; margin-bottom: 0.5rem;">Wonderful! You've shared it all</p>
        <p style="font-size: 0.95rem; opacity: 0.95; margin-bottom: 0.75rem; font-weight: 500; line-height: 1.5;">
          ${task.asker?.display_name || 'The person'} will take a look at everything soon. Thank you for giving your best - your effort really makes a difference!
        </p>
        <p style="font-size: 0.9rem; opacity: 0.9; font-weight: 500;">Payment will arrive in 48 hours. You've earned it, friend!</p>
      `;
      document.body.appendChild(toastDiv);

      // Auto-close toast after 6 seconds with fade-out
      setTimeout(() => {
        toastDiv.style.transition = 'opacity 0.5s ease-out';
        toastDiv.style.opacity = '0';
        setTimeout(() => toastDiv.remove(), 500);
      }, 6000);

      // Redirect after 5 seconds
      setTimeout(() => {
        navigate('/my-offer');
      }, 5000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to submit completion');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-errandify-bg flex items-center justify-center">
        <div className="text-center">
          <p className="text-2xl mb-4">⏳</p>
          <p className="text-lg font-semibold text-gray-700">Loading task details...</p>
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="min-h-screen bg-errandify-bg flex items-center justify-center">
        <div className="bg-white rounded-lg p-8 shadow-lg max-w-sm text-center">
          <p className="text-4xl mb-4">😕</p>
          <p className="text-lg font-bold text-gray-800 mb-2">Oops! Task not found</p>
          <p className="text-gray-600 mb-6">This task seems to have disappeared. Let's get you back to your offers!</p>
          <button
            onClick={() => navigate('/my-offer')}
            className="bg-gradient-to-r from-errandify-orange to-orange-600 text-white py-3 px-6 rounded-lg font-bold hover:shadow-lg transition-all"
          >
            ← Back to My Offers
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-errandify-bg pb-32">
      <div className="max-w-xl mx-auto px-3 py-4">
        {/* Header */}
        <button
          onClick={() => navigate('/my-offer')}
          className="text-errandify-orange font-semibold mb-3 text-sm"
        >
          ← Back
        </button>

        {/* Card */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Header Section - Compact */}
          <div className="bg-gradient-to-r from-green-400 via-emerald-500 to-teal-600 text-white p-3">
            <h1 className="text-lg font-bold mb-1">🎉 Great Job! Share Your Work</h1>
            <p className="text-xs opacity-95">Let's show {task.asker?.display_name || 'them'} what you've done!</p>
            <p className="text-xs opacity-85 mt-1 font-semibold">{task.title}</p>
          </div>

          {/* Content */}
          <div className="p-4 space-y-4">
            {/* Error Alert */}
            {error && (
              <div className="p-4 bg-gradient-to-r from-red-100 to-rose-100 border-2 border-red-300 text-red-700 rounded-lg text-sm font-semibold shadow-sm">
                <p className="mb-1">⚠️ {error}</p>
                <p className="text-xs opacity-80">Please fix this and try again!</p>
              </div>
            )}

            {/* Task Info - Compact */}
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-xs space-y-0.5">
                <p><span className="text-gray-600">Budget:</span> <span className="font-bold text-errandify-orange">SGD ${typeof task.budget === 'number' ? task.budget.toFixed(2) : (task.budget || 0)}</span></p>
              </div>
            </div>

            {/* Photo Upload */}
            <div>
              <h3 className="font-semibold text-errandify-brown mb-2 text-sm">📸 Upload Photos</h3>

              <div className="mb-3">
                <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-4 cursor-pointer hover:border-errandify-orange hover:bg-orange-50 transition-colors">
                  <span className="text-2xl mb-1">📷</span>
                  <span className="font-semibold text-gray-700 text-center text-xs">Click to upload</span>
                  <span className="text-xs text-gray-500 mt-0.5">Max 5 • JPG, PNG</span>
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
              <h3 className="font-semibold text-errandify-brown mb-1 text-sm">📝 Share the Details</h3>
              <textarea
                value={completionNotes}
                onChange={(e) => setCompletionNotes(e.target.value)}
                placeholder="Tell them what you did and how it went! They'd love to know 😊"
                rows={3}
                className="w-full px-2 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-errandify-orange focus:border-transparent text-xs"
              />
            </div>

            {/* Upload Progress */}
            {submitting && uploadProgress > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs text-blue-900 font-semibold mb-2">📸 Uploading photos to Alibaba...</p>
                <div className="w-full bg-blue-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p className="text-xs text-blue-700 mt-2 text-center font-semibold">{uploadProgress}% uploaded</p>
              </div>
            )}

            {/* Submit Button */}
            <button
              onClick={handleSubmitCompletion}
              disabled={submitting}
              className={`w-full py-3 rounded-lg font-bold text-white transition-all shadow-lg active:scale-95 text-base ${
                submitting
                  ? 'bg-gradient-to-r from-gray-400 to-gray-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:shadow-xl hover:scale-105'
              }`}
            >
              {submitting ? (uploadProgress > 0 ? `⏳ ${uploadProgress}%` : '⏳ Submitting...') : '✨ Submit & Get Paid'}
            </button>

            {/* Info - Warm Timeline */}
            <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-cyan-50 border-2 border-emerald-300 rounded-lg p-3">
              <p className="text-xs font-semibold text-emerald-900 mb-2">🎊 What Happens Next</p>
              <div className="text-xs text-emerald-800 space-y-1.5 leading-relaxed">
                <p>✅ <span className="font-semibold">You submit</span> your amazing work</p>
                <p>👀 <span className="font-semibold">Asker reviews</span> within 48 hours</p>
                <p>⭐ <span className="font-semibold">Rate each other</span> & earn +5 bonus points</p>
                <p>💰 <span className="font-semibold">Payment settled</span> to your account</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
