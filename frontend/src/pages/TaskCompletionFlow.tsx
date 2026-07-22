import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { uploadMultiplePhotos } from '../utils/photoUploadService.js';

interface TaskDetail {
  id: number;
  title: string;
  budget: number;
  category: string;
  doer?: { id: number; display_name: string };
  asker?: { id: number; display_name: string };
  status: string;
}

interface Review {
  id: number;
  rating: number;
  comment: string;
  rater_name: string;
  created_at: string;
}

interface UserProfile {
  id: number;
  role: 'asker' | 'doer';
}

interface UploadedPhoto {
  id?: number;
  file?: File;
  preview: string;
}

const ENCOURAGEMENT_MESSAGES = [
  '✨ You\'re making a real difference!',
  '🌟 Thank you for being awesome!',
  '💪 You crushed it!',
  '🎯 Great job out there!',
];

const getRatingEmoji = (rating: number) => {
  if (rating >= 5) return '⭐⭐⭐⭐⭐';
  if (rating >= 4) return '⭐⭐⭐⭐';
  if (rating >= 3) return '⭐⭐⭐';
  if (rating >= 2) return '⭐⭐';
  return '⭐';
};

const getRatingLabel = (rating: number) => {
  if (rating >= 5) return 'Excellent';
  if (rating >= 4) return 'Very Good';
  if (rating >= 3) return 'Good';
  if (rating >= 2) return 'Fair';
  return 'Poor';
};

export default function TaskCompletionFlow() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [task, setTask] = useState<TaskDetail | null>(null);
  const [userRole, setUserRole] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Step states: 'submit' (doer submits), 'review' (asker reviews), 'final' (both reviewed)
  const [currentStep, setCurrentStep] = useState<'submit' | 'review' | 'final'>('submit');

  // Doer submission state
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
  const [notes, setNotes] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadingPhotoIndex, setUploadingPhotoIndex] = useState<number | null>(null);

  // Reviews state
  const [doerReview, setDoerReview] = useState<Review | null>(null);
  const [askerReview, setAskerReview] = useState<Review | null>(null);
  const [userBidAmount, setUserBidAmount] = useState<number | null>(null);

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      setUserRole(JSON.parse(userStr));
    }
    setMessage(ENCOURAGEMENT_MESSAGES[Math.floor(Math.random() * ENCOURAGEMENT_MESSAGES.length)]);
    fetchTaskDetails();
  }, [id]);

  const fetchTaskDetails = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/errands/${id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setTask(response.data.data);

      // Determine which step to show
      if (response.data.data.status === 'completed') {
        // Task is completed, try to fetch reviews
        fetchReviews(token);
        setCurrentStep('final');
      } else if (response.data.data.status === 'in_progress') {
        setCurrentStep('submit');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load errand details');
    } finally {
      setLoading(false);
    }
  };

  const fetchReviews = async (token: string) => {
    try {
      // Fetch reviews for both parties
      const askerRatings = await axios.get(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/ratings/user/${task?.asker_id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const doerRatings = await axios.get(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/ratings/user/${task?.doer_id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Find reviews for this specific task
      const askerReviewForTask = askerRatings.data.data.ratings.find(
        (r: Review) => r.task_id === parseInt(id!)
      );
      const doerReviewForTask = doerRatings.data.data.ratings.find(
        (r: Review) => r.task_id === parseInt(id!)
      );

      if (askerReviewForTask) setAskerReview(askerReviewForTask);
      if (doerReviewForTask) setDoerReview(doerReviewForTask);
    } catch (err) {
      console.warn('Could not fetch reviews:', err);
    }
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files;
    if (!files) return;

    for (let i = 0; i < Math.min(files.length, 5 - photos.length); i++) {
      const file = files[i];
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotos(prev => [...prev, { file, preview: reader.result as string }]);
      };
      reader.readAsDataURL(file);
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmitCompletion = async () => {
    if (photos.length === 0 && !notes.trim()) {
      setError('Please add at least a photo or some notes to prove completion!');
      return;
    }

    setSubmitting(true);
    setError('');
    setUploadProgress(0);

    try {
      const token = localStorage.getItem('token');

      // Step 1: Mark task as completed
      await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/errands/${id}/complete`,
        { notes: notes.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Step 2: Upload photos to Alibaba OSS (if any)
      if (photos.length > 0) {
        const filesToUpload = photos
          .filter(p => p.file)
          .map(p => p.file as File);

        try {
          await uploadMultiplePhotos(
            {
              token,
              errandId: parseInt(id || '0', 10),
              files: filesToUpload,
            },
            (photoUrl: string, index: number, total: number) => {
              setUploadProgress(Math.round((index / total) * 100));
            }
          );
        } catch (uploadErr: any) {
          setError(`Photo upload failed: ${uploadErr.message || 'Unknown error'}`);
          // Don't fail - photos are optional, move to review anyway
          console.warn('Photo upload warning:', uploadErr);
        }
      }

      setUploadProgress(0);
      setCurrentStep('review');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to submit completion');
      setSubmitting(false);
    } finally {
      setSubmitting(false);
      setUploadProgress(0);
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
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Refresh and move to final step
      await fetchTaskDetails();
      setCurrentStep('final');
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
        { headers: { Authorization: `Bearer ${token}` } }
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
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce">✨</div>
          <p className="text-gray-600 font-semibold">Loading errand details...</p>
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-red-700 font-semibold mb-4">Errand not found</p>
          <button onClick={() => navigate('/home')} className="text-errandify-orange font-semibold">
            ← Back Home
          </button>
        </div>
      </div>
    );
  }

  const isAsker = userRole?.role === 'asker';

  // ============= STEP 1: DOER SUBMITS COMPLETION =============
  if (currentStep === 'submit' && !isAsker) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50 pb-32">
        <div className="max-w-2xl mx-auto px-4 py-6">
          {/* Header */}
          <div className="text-center mb-8 mt-6">
            <div className="text-7xl mb-4 animate-bounce">🎉</div>
            <h1 className="text-3xl font-bold text-errandify-brown mb-2">Ready to Complete?</h1>
            <p className="text-gray-600">{message}</p>
          </div>

          {/* Card */}
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-errandify-orange to-orange-500 text-white p-6">
              <h2 className="text-2xl font-bold mb-1">{task.title}</h2>
              <p className="text-orange-100">Complete with {task.asker?.display_name || 'the asker'}</p>
            </div>

            <div className="p-6 space-y-6">
              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {error}
                </div>
              )}

              {/* Budget */}
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-1">Errand Budget</p>
                <p className="text-3xl font-bold text-errandify-orange">SGD ${task.budget.toFixed(2)}</p>
                <p className="text-xs text-gray-500 mt-2">Payment releases within 24-48 hours</p>
              </div>

              {/* Photos */}
              <div>
                <h3 className="font-semibold text-errandify-brown mb-3">📸 Add Photos (Proof of Completion)</h3>
                <p className="text-xs text-gray-500 mb-3">Upload up to 5 photos showing your completed work</p>

                <label className="border-2 border-dashed border-orange-300 rounded-lg p-6 text-center cursor-pointer hover:bg-orange-50 transition">
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handlePhotoSelect}
                    disabled={photos.length >= 5}
                    className="hidden"
                  />
                  <div className="text-4xl mb-2">📷</div>
                  <p className="font-semibold text-errandify-brown text-sm">Click to add photos</p>
                  <p className="text-xs text-gray-500 mt-1">Or drag & drop images</p>
                  {photos.length > 0 && (
                    <p className="text-xs text-errandify-orange font-semibold mt-2">
                      {photos.length}/{5} photos added
                    </p>
                  )}
                </label>

                {photos.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 mt-4">
                    {photos.map((photo, index) => (
                      <div key={index} className="relative rounded-lg overflow-hidden bg-gray-100">
                        <img src={photo.preview} alt={`Photo ${index + 1}`} className="w-full h-24 object-cover" />
                        <button
                          onClick={() => removePhoto(index)}
                          className="absolute top-1 right-1 bg-red-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold hover:bg-red-600"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Notes */}
              <div>
                <h3 className="font-semibold text-errandify-brown mb-3">📝 Add Notes (Optional)</h3>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="E.g., 'Cleaned the entire apartment, washed dishes, took out trash...'"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-errandify-orange resize-none"
                  rows={4}
                  maxLength={500}
                />
                <p className="text-xs text-gray-500 mt-1">{notes.length}/500 characters</p>
              </div>

              {/* Upload Progress */}
              {submitting && uploadProgress > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-900 font-semibold mb-2">Uploading photos...</p>
                  <div className="w-full bg-blue-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <p className="text-xs text-blue-700 mt-2 text-center">{uploadProgress}% complete</p>
                </div>
              )}

              {/* Buttons */}
              <div className="grid grid-cols-2 gap-3 pt-4">
                <button
                  onClick={() => navigate(-1)}
                  disabled={submitting}
                  className={`py-3 rounded-lg font-bold transition ${
                    submitting
                      ? 'text-gray-400 border-gray-300 cursor-not-allowed'
                      : 'text-errandify-brown border-2 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  ← Cancel
                </button>
                <button
                  onClick={handleSubmitCompletion}
                  disabled={submitting || (photos.length === 0 && !notes.trim())}
                  className={`py-3 rounded-lg font-bold text-white transition-all ${
                    submitting || (photos.length === 0 && !notes.trim())
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600'
                  }`}
                >
                  {submitting ? (uploadProgress > 0 ? `⏳ ${uploadProgress}%` : '⏳ Submitting...') : '✓ Complete Errand'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============= STEP 2: ASKER REVIEWS COMPLETION =============
  if (currentStep === 'review' && isAsker) {
    return (
      <div className="min-h-screen bg-errandify-bg pb-32">
        <div className="max-w-2xl mx-auto px-4 py-6">
          <button onClick={() => navigate('/errands')} className="text-errandify-orange font-semibold mb-6 text-sm">
            ← Back
          </button>

          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="bg-gradient-to-r from-errandify-orange to-orange-500 text-white p-4">
              <h1 className="text-xl font-bold mb-2">Review Completion</h1>
              <p className="text-sm opacity-90">{task.title}</p>
            </div>

            <div className="p-6 space-y-6">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <div className="bg-gray-50 rounded-lg p-4">
                <h2 className="font-semibold text-errandify-brown mb-3">Errand Information</h2>
                <div className="space-y-2 text-sm">
                  <div><span className="text-gray-600">Title:</span> <span className="font-medium">{task.title}</span></div>
                  <div><span className="text-gray-600">Doer:</span> <span className="font-medium">{task.doer?.display_name || 'Unknown'}</span></div>
                  <div><span className="text-gray-600">Budget:</span> <span className="font-bold text-errandify-orange">SGD ${task.budget.toFixed(2)}</span></div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-6">
                <button
                  onClick={handleRequestMoreWork}
                  disabled={submitting}
                  className={`py-3 rounded-lg font-bold text-white transition-all ${
                    submitting ? 'bg-gray-400 cursor-not-allowed' : 'bg-orange-600 hover:bg-orange-700'
                  }`}
                >
                  ← Request Changes
                </button>
                <button
                  onClick={handleApproveCompletion}
                  disabled={submitting}
                  className={`py-3 rounded-lg font-bold text-white transition-all ${
                    submitting ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'
                  }`}
                >
                  ✓ Approve
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============= STEP 3: FINAL - ONLY THEIR OWN REVIEW VISIBLE =============
  if (currentStep === 'final') {
    // Determine which review belongs to current user
    const myReview = isAsker ? askerReview : doerReview;
    const theirReviewPending = isAsker ? !doerReview : !askerReview;

    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 pb-32">
        <div className="max-w-3xl mx-auto px-4 py-6">
          <button onClick={() => navigate('/home')} className="text-errandify-orange font-semibold mb-6 text-sm">
            ← Back Home
          </button>

          {/* Header */}
          <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-6">
            <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white p-8 text-center">
              <h1 className="text-3xl font-bold mb-2">🎉 Errand Completed!</h1>
              <p className="text-lg text-purple-100 mb-4">{task.title}</p>
              <div className="inline-block bg-white/20 rounded-full px-4 py-2">
                <p className="text-white font-semibold">Budget: SGD ${task.budget.toFixed(2)}</p>
              </div>
            </div>

            <div className="p-6 text-center border-b border-gray-200">
              <p className="text-gray-600 text-sm mb-2">Completed with</p>
              <p className="text-xl font-bold text-errandify-brown">
                {isAsker ? task.doer?.display_name : task.asker?.display_name}
              </p>
            </div>
          </div>

          {/* My Review - Only Show Own Review */}
          <div className="space-y-6">
            {myReview ? (
              <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                <div className={`bg-gradient-to-r ${isAsker ? 'from-green-500 to-emerald-500' : 'from-blue-500 to-blue-600'} text-white p-6`}>
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{isAsker ? '👤' : '🐱'}</span>
                    <div>
                      <p className="font-semibold">Your Rating</p>
                      <p className="text-xs opacity-90">{isAsker ? 'You rated the doer' : 'You rated the asker'}</p>
                    </div>
                  </div>
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-2xl">{getRatingEmoji(myReview.rating)}</span>
                      <span className="text-sm font-semibold text-gray-600">{getRatingLabel(myReview.rating)}</span>
                    </div>
                    <p className="text-xs text-gray-500">Rated on {new Date(myReview.created_at).toLocaleDateString()}</p>
                  </div>
                  {myReview.comment && (
                    <div className={`rounded-lg p-4 ${isAsker ? 'bg-green-50' : 'bg-blue-50'}`}>
                      <p className="text-gray-700 italic">"{myReview.comment}"</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                <div className={`bg-gradient-to-r ${isAsker ? 'from-green-500 to-emerald-500' : 'from-blue-500 to-blue-600'} text-white p-6`}>
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{isAsker ? '👤' : '🐱'}</span>
                    <div>
                      <p className="font-semibold">Your Rating</p>
                      <p className="text-xs opacity-90">{isAsker ? 'Rate the doer' : 'Rate the asker'}</p>
                    </div>
                  </div>
                </div>
                <div className="p-6 text-center">
                  <div className="text-4xl mb-3">⭐</div>
                  <p className="text-gray-600 font-semibold mb-3">You Haven't Rated Yet</p>
                  <button
                    onClick={() => navigate(`/errand/${id}/rate`)}
                    className="px-6 py-2 bg-errandify-orange text-white rounded-lg font-semibold text-sm hover:bg-opacity-90 transition"
                  >
                    Rate Now
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Their Rating Status - No Details Shown */}
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800 mb-2">
              <strong>Their Rating:</strong>
            </p>
            <p className="text-sm text-blue-700">
              {theirReviewPending
                ? `${isAsker ? 'The doer' : 'The asker'} will rate you soon. You won't see their review until they submit it.`
                : `${isAsker ? 'The doer' : 'The asker'} has rated you! Check your profile to see the rating.`
              }
            </p>
          </div>

          {/* Summary */}
          {myReview && (
            <div className="mt-8 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border-2 border-purple-200 p-6">
              <h3 className="font-bold text-errandify-brown mb-4 text-lg">✨ Errand Summary</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Budget</span>
                  <span className="font-bold text-errandify-orange">SGD ${task.budget.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Your Rating</span>
                  <span className="font-bold text-yellow-600">{getRatingEmoji(myReview.rating)}</span>
                </div>
                <div className="flex justify-between items-center pt-3 border-t border-purple-200">
                  <span className="font-semibold text-errandify-brown">Errandify Points Earned</span>
                  <span className="text-2xl font-bold text-errandify-orange">
                    {(myReview.rating || 0) >= 5 ? '40 EP' : `${15 + ((myReview.rating || 0) * 5)} EP`}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Buttons */}
          <div className="mt-8 grid grid-cols-2 gap-4">
            <button
              onClick={() => navigate('/home')}
              className="py-3 rounded-lg font-bold text-white bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 transition"
            >
              🏠 Home
            </button>
            <button
              onClick={() => navigate(`/profile/${isAsker ? task.doer?.id : task.asker?.id}`)}
              className="py-3 rounded-lg font-bold text-errandify-orange border-2 border-orange-200 hover:bg-orange-50 transition"
            >
              👤 View Profile
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
