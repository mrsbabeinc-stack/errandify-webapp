import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { uploadMultiplePhotos } from '../utils/photoUploadService.js';
import ThemedMessage, { InlineMessage, AlertBox } from '../components/ThemedMessage';

interface TaskDetail {
  id: number;
  title: string;
  category: string;
  status: string;
  budget: number;
  asker_id: number;
  asker?: { display_name: string; alias?: string };
  asker_alias?: string;
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
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [rating, setRating] = useState(0);
  const [ratingComment, setRatingComment] = useState('');
  const [ratingSubmitting, setRatingSubmitting] = useState(false);
  const [zoomedImageIndex, setZoomedImageIndex] = useState<number | null>(null);

  const generateSuggestedText = () => {
    if (!task) return '';

    const title = task.title.toLowerCase();

    // Generate contextual suggestions based on task title keywords (max 150 chars)
    if (title.includes('clean')) {
      return `I've completed the cleaning. Everything is fresh and well-organized!`;
    } else if (title.includes('repair') || title.includes('fix')) {
      return `I've completed the repair. Everything is working properly now!`;
    } else if (title.includes('deliver') || title.includes('send')) {
      return `I've completed the delivery as requested. It was safely delivered on time!`;
    } else if (title.includes('design') || title.includes('create')) {
      return `I've finished the design work. The result looks great and is ready for use!`;
    } else if (title.includes('teach') || title.includes('tutor') || title.includes('lesson')) {
      return `I've completed the tutoring session. Your student made good progress!`;
    } else if (title.includes('cook') || title.includes('food') || title.includes('meal')) {
      return `I've prepared the meal perfectly. Everything is fresh and ready to serve!`;
    } else if (title.includes('move') || title.includes('transport')) {
      return `I've completed the moving errand. All items were handled with care safely!`;
    } else if (title.includes('photography') || title.includes('photo')) {
      return `I've completed the photography session. Great shots captured and ready!`;
    } else if (title.includes('garden') || title.includes('landscape') || title.includes('plant')) {
      return `I've completed the gardening. Your space looks beautiful and maintained!`;
    } else if (title.includes('babysit') || title.includes('childcare')) {
      return `I've completed the childcare session. The children had a great time!`;
    } else {
      return `I've completed the errand successfully. Everything went smoothly!`;
    }
  };

  const suggestedText = generateSuggestedText();

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
      console.log('[TaskComplete] Fetched errand data:', response.data.data);
      setTask(response.data.data);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load errand');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB per file
      const MAX_FILES = 5;

      let validFiles: File[] = [];
      let warnings: string[] = [];

      Array.from(files).forEach((file) => {
        // Check file size
        if (file.size > MAX_FILE_SIZE) {
          warnings.push(`${file.name} is too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Max 5MB per file.`);
          return;
        }

        // Check total file count
        if (validFiles.length + uploadedFiles.length >= MAX_FILES) {
          warnings.push('Maximum 5 files allowed');
          return;
        }

        validFiles.push(file);
      });

      if (warnings.length > 0) {
        setError(warnings.join(' '));
        setTimeout(() => setError(''), 4000);
      }

      if (validFiles.length > 0) {
        setUploadedFiles([...uploadedFiles, ...validFiles]);
      }
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
        (_photoUrl: string, index: number, total: number) => {
          setUploadProgress(Math.round((index / total) * 100));
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
      await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/jobs/${id}/complete`,
        {
          photoUrls: uploadedUrls,
          completionNotes: completionNotes.trim(),
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      // Show success message and show rating modal instead of immediate redirect
      setError(''); // Clear any errors
      setShowRatingModal(true);

      // Create a warm, engaging toast notification
      const askerName = task?.asker_alias || task?.asker?.alias || task?.asker?.display_name || 'The person';
      const toastDiv = document.createElement('div');
      toastDiv.className = 'fixed top-4 left-4 right-4 bg-gradient-to-r from-emerald-400 via-teal-500 to-cyan-600 text-white p-5 rounded-lg shadow-2xl z-50 text-center';
      toastDiv.innerHTML = `
        <p style="font-size: 1.1rem; font-weight: bold; margin-bottom: 0.5rem;">Wonderful! You've shared it all</p>
        <p style="font-size: 0.95rem; opacity: 0.95; margin-bottom: 0.75rem; font-weight: 500; line-height: 1.5;">
          ${askerName} will take a look at everything soon. Thank you for giving your best - your effort really makes a difference!
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
          <p className="text-lg font-semibold text-gray-700">Loading errand details...</p>
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="min-h-screen bg-errandify-bg flex items-center justify-center">
        <div className="bg-white rounded-lg p-8 shadow-lg max-w-sm text-center">
          <p className="text-4xl mb-4">😕</p>
          <p className="text-lg font-bold text-gray-800 mb-2">Oops! Errand not found</p>
          <p className="text-gray-600 mb-6">This errand seems to have disappeared. Let's get you back to your offers!</p>
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
            <p className="text-xs opacity-95">Let's show {task?.asker?.alias || task?.asker?.display_name || 'them'} what you've done!</p>
            <p className="text-xs opacity-85 mt-1 font-semibold">{task?.title}</p>
          </div>

          {/* Content */}
          <div className="p-4 space-y-4">
            {/* Error Alert */}
            {error && (
              <AlertBox type="error" title="Action Required" message={error} onClose={() => setError('')} />
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
                  <div className="grid grid-cols-2 gap-2">
                    {uploadedFiles.map((file, index) => {
                      const isImage = file.type.startsWith('image/');
                      const previewUrl = isImage ? URL.createObjectURL(file) : null;

                      return (
                        <div key={index} className="relative group">
                          {isImage && previewUrl ? (
                            <div className="relative rounded-lg overflow-hidden border-2 border-gray-200 hover:border-errandify-orange transition-colors bg-gray-100 cursor-pointer group">
                              <img
                                src={previewUrl}
                                alt={file.name}
                                className="w-full h-32 object-cover hover:opacity-75 transition-opacity"
                                onClick={() => setZoomedImageIndex(index)}
                              />
                              <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-30 transition-opacity flex items-center justify-center">
                                <div className="flex gap-2">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setZoomedImageIndex(index);
                                    }}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity bg-blue-500 hover:bg-blue-700 text-white rounded-full p-2 font-bold text-lg"
                                    title="Zoom/Preview"
                                  >
                                    🔍
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      removeFile(index);
                                    }}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity bg-red-500 hover:bg-red-700 text-white rounded-full p-2 font-bold text-lg"
                                    title="Remove photo"
                                  >
                                    ✕
                                  </button>
                                </div>
                              </div>
                              <p className="text-xs text-gray-700 p-1 truncate bg-gray-50">{file.name}</p>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between bg-gray-50 p-2 rounded border border-gray-200 h-32 flex-col">
                              <div className="flex flex-col items-center gap-1">
                                <span className="text-lg">📄</span>
                                <span className="text-xs text-gray-700 truncate">{file.name}</span>
                                <span className="text-xs text-gray-500">({(file.size / 1024 / 1024).toFixed(1)} MB)</span>
                              </div>
                              <button
                                onClick={() => removeFile(index)}
                                className="text-red-500 hover:text-red-700 font-bold"
                              >
                                ✕
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Image Zoom Modal */}
              {zoomedImageIndex !== null && uploadedFiles[zoomedImageIndex] && (
                <div
                  className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4"
                  onClick={() => setZoomedImageIndex(null)}
                >
                  <div
                    className="relative max-w-2xl max-h-[80vh] w-full bg-white rounded-lg shadow-2xl overflow-auto"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => setZoomedImageIndex(null)}
                      className="absolute top-2 right-2 bg-red-500 hover:bg-red-700 text-white rounded-full p-2 font-bold z-10"
                    >
                      ✕
                    </button>

                    <img
                      src={URL.createObjectURL(uploadedFiles[zoomedImageIndex])}
                      alt="Zoomed preview"
                      className="w-full h-auto"
                    />

                    <div className="bg-gray-50 p-3 border-t">
                      <p className="text-xs font-semibold text-gray-800">{uploadedFiles[zoomedImageIndex].name}</p>
                      <p className="text-xs text-gray-600">
                        {(uploadedFiles[zoomedImageIndex].size / 1024 / 1024).toFixed(1)} MB
                      </p>
                    </div>

                    {/* Navigation */}
                    <div className="flex justify-center gap-2 p-3 bg-gray-100 border-t">
                      <button
                        onClick={() => {
                          let newIndex = zoomedImageIndex - 1;
                          if (newIndex < 0) newIndex = uploadedFiles.length - 1;
                          setZoomedImageIndex(newIndex);
                        }}
                        className="px-3 py-1 bg-gray-400 hover:bg-gray-500 text-white rounded text-xs font-semibold"
                      >
                        ← Previous
                      </button>
                      <span className="text-xs text-gray-700 font-semibold self-center">
                        {zoomedImageIndex + 1} / {uploadedFiles.filter(f => f.type.startsWith('image/')).length}
                      </span>
                      <button
                        onClick={() => {
                          let newIndex = zoomedImageIndex + 1;
                          if (newIndex >= uploadedFiles.length) newIndex = 0;
                          setZoomedImageIndex(newIndex);
                        }}
                        className="px-3 py-1 bg-gray-400 hover:bg-gray-500 text-white rounded text-xs font-semibold"
                      >
                        Next →
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Completion Notes Editor */}
            <div>
              <h3 className="font-semibold text-errandify-brown mb-2 text-sm">📝 Share the Details</h3>

              {/* AI Suggested Text */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="text-xs text-blue-900 font-semibold mb-2">🤖 AI Suggestion:</p>
                    <p className="text-xs text-blue-800 leading-relaxed">{suggestedText}</p>
                  </div>
                </div>
                <button
                  onClick={() => setCompletionNotes(suggestedText)}
                  className="mt-2 text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                >
                  Use this text
                </button>
              </div>

              {/* Editable Textbox */}
              <textarea
                value={completionNotes}
                onChange={(e) => setCompletionNotes(e.target.value)}
                placeholder="Tell them what you did and how it went! You can use the suggestion above or write your own"
                rows={4}
                className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-errandify-orange focus:border-orange-300 text-xs font-medium bg-white"
              />
              <p className="text-xs text-gray-500 mt-1">{completionNotes.length} characters</p>
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

      {/* Post-Submission Rating Modal */}
      {showRatingModal && task && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="text-center mb-6">
              <p className="text-3xl mb-2">💫</p>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Your Turn Now!</h2>
              <p className="text-gray-600">How did {task?.asker_alias || task?.asker?.display_name || 'they'} do as an asker?</p>
            </div>

            {/* Star Rating */}
            <div className="flex gap-3 mb-6 justify-center">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  disabled={ratingSubmitting}
                  className={`text-5xl transition-all transform hover:scale-125 hover:-translate-y-2 ${
                    star <= rating ? 'text-yellow-400 drop-shadow-lg' : 'text-gray-300 hover:text-yellow-300'
                  } ${ratingSubmitting ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                  title={['Not great', 'Could be better', 'Good!', 'Really good!', 'Amazing!'][star - 1]}
                >
                  ★
                </button>
              ))}
            </div>

            {/* Rating Message */}
            {rating > 0 && (
              <p className="text-center mb-4 text-sm font-semibold text-amber-800">
                {rating === 1 && '😕 Let us know what could improve'}
                {rating === 2 && '😐 Share what could be better'}
                {rating === 3 && '😊 Good job! Add details if you like'}
                {rating === 4 && '😄 Really impressed! Tell them why'}
                {rating === 5 && '🎉 Wow! They were amazing! Let us know!'}
              </p>
            )}

            {/* Comment Textarea */}
            <textarea
              value={ratingComment}
              onChange={(e) => setRatingComment(e.target.value)}
              disabled={ratingSubmitting}
              placeholder="📝 Share your experience... (optional)"
              maxLength={200}
              rows={3}
              className={`w-full text-sm px-3 py-2 border-2 border-amber-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none transition mb-4 ${ratingSubmitting ? 'opacity-50 cursor-not-allowed bg-gray-50' : ''}`}
            />

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowRatingModal(false);
                  setTimeout(() => navigate('/my-offer'), 500);
                }}
                disabled={ratingSubmitting}
                className="flex-1 px-4 py-3 text-gray-700 bg-gray-100 rounded-lg font-semibold hover:bg-gray-200 disabled:opacity-50 transition"
              >
                Skip for now
              </button>
              <button
                onClick={async () => {
                  if (rating === 0) {
                    alert('Please select a rating');
                    return;
                  }

                  setRatingSubmitting(true);
                  try {
                    const token = localStorage.getItem('token');
                    await axios.post(
                      `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/ratings`,
                      {
                        taskId: id,
                        ratedUserId: task.asker_id,
                        rating,
                        comment: ratingComment || null,
                      },
                      { headers: { Authorization: `Bearer ${token}` } }
                    );

                    // Award bonus points
                    await axios.post(
                      `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/wallet/award-ep-bonus`,
                      {
                        errandId: id,
                        userId: JSON.parse(localStorage.getItem('user') || '{}').id,
                        bonus: 5,
                        reason: 'doer_rating_bonus',
                      },
                      { headers: { Authorization: `Bearer ${token}` } }
                    );

                    // Show success and redirect
                    setShowRatingModal(false);
                    const successDiv = document.createElement('div');
                    successDiv.className = 'fixed top-4 left-4 right-4 bg-gradient-to-r from-green-400 to-emerald-500 text-white p-5 rounded-lg shadow-2xl z-50 text-center';
                    successDiv.innerHTML = `
                      <p style="font-size: 1.2rem; font-weight: bold;">✅ Thanks for the feedback!</p>
                      <p style="font-size: 0.95rem; margin-top: 0.5rem;">+5 Errandify Points earned 🎉</p>
                    `;
                    document.body.appendChild(successDiv);

                    setTimeout(() => {
                      successDiv.style.transition = 'opacity 0.5s ease-out';
                      successDiv.style.opacity = '0';
                      setTimeout(() => successDiv.remove(), 500);
                    }, 4000);

                    setTimeout(() => navigate('/my-offer'), 2000);
                  } catch (err: any) {
                    console.error('Rating submission error:', err);
                    alert('Error submitting rating: ' + (err.response?.data?.error || err.message));
                  } finally {
                    setRatingSubmitting(false);
                  }
                }}
                disabled={ratingSubmitting || rating === 0}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg font-bold hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105"
              >
                {ratingSubmitting ? '✨ Submitting...' : '💙 Submit & Earn +5 EP'}
              </button>
            </div>

            {/* Info Text */}
            <p className="text-xs text-gray-500 text-center mt-4">
              Your honest feedback helps build trust in our community
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
