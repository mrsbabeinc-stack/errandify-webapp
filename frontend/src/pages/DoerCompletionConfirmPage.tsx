import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

interface TaskDetail {
  id: number;
  title: string;
  budget: number;
  asker?: { display_name: string };
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
  '🙌 The community appreciates you!',
  '⭐ You\'re a superstar!',
];

export default function DoerCompletionConfirmPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [task, setTask] = useState<TaskDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
  const [notes, setNotes] = useState('');
  const [message, setMessage] = useState('');
  const [step, setStep] = useState<'completion' | 'rating'>('completion');

  useEffect(() => {
    fetchTaskDetails();
    setMessage(ENCOURAGEMENT_MESSAGES[Math.floor(Math.random() * ENCOURAGEMENT_MESSAGES.length)]);
  }, [id]);

  const fetchTaskDetails = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/errands/${id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setTask(response.data.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load errand details');
    } finally {
      setLoading(false);
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
      alert('Please add at least a photo or some notes to prove completion!');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const token = localStorage.getItem('token');

      // Mark task as completed
      await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/errands/${id}/complete`,
        { notes: notes.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Upload photos
      if (photos.length > 0) {
        const formData = new FormData();
        photos.forEach(photo => {
          if (photo.file) {
            formData.append('photos', photo.file);
          }
        });

        await axios.post(
          `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/jobs/${id}/photos`,
          formData,
          { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' } }
        );
      }

      // Move to rating step
      setStep('rating');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to submit completion');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce">🎉</div>
          <p className="text-gray-600 font-semibold">Loading errand details...</p>
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-700 font-semibold mb-4">Errand not found</p>
          <button onClick={() => navigate('/my-offers')} className="text-errandify-orange font-semibold">
            ← Back to My Offers
          </button>
        </div>
      </div>
    );
  }

  // ============= RATING STEP =============
  if (step === 'rating') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50 p-4 pb-32">
        <div className="max-w-2xl mx-auto">
          {/* Success Message */}
          <div className="text-center mb-8 mt-8">
            <div className="text-8xl mb-4">🎊</div>
            <h1 className="text-4xl font-bold text-errandify-brown mb-2">Amazing Work!</h1>
            <p className="text-lg text-gray-600">
              Your completion has been submitted. <br />
              Now let's rate {task.asker?.display_name || 'the asker'}!
            </p>
          </div>

          {/* Rating Card */}
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white p-6 text-center">
              <h2 className="text-2xl font-bold mb-2">💫 Rate This Experience</h2>
              <p className="opacity-90">Your feedback helps build trust in our community</p>
            </div>

            <div className="p-8 space-y-6">
              {/* Star Rating */}
              <div className="text-center">
                <p className="text-gray-600 font-semibold mb-4">How was your experience?</p>
                <div className="flex gap-3 justify-center mb-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => {
                        // Will navigate to rating page with pre-filled star
                        navigate(`/errand/${id}/rate?stars=${star}`);
                      }}
                      className="text-5xl hover:scale-125 transition-transform duration-200"
                    >
                      ⭐
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-3">Click a star to continue rating</p>
              </div>

              {/* Skip Option */}
              <div className="text-center pt-4 border-t border-gray-200">
                <p className="text-xs text-gray-500 mb-2">Want to rate later?</p>
                <button
                  onClick={() => navigate('/my-offers')}
                  className="text-errandify-orange font-semibold hover:underline text-sm"
                >
                  Skip for Now
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============= COMPLETION STEP =============
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50 pb-32">
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Celebration Header */}
        <div className="text-center mb-8 mt-6">
          <div className="text-7xl mb-4 animate-bounce">🎉</div>
          <h1 className="text-3xl font-bold text-errandify-brown mb-2">Ready to Complete?</h1>
          <p className="text-gray-600">{message}</p>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-errandify-orange to-orange-500 text-white p-6">
            <h2 className="text-2xl font-bold mb-1">{task.title}</h2>
            <p className="text-orange-100">Complete with {task.asker?.display_name || 'the asker'}</p>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Error */}
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            {/* Budget Info */}
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">Errand Budget</p>
              <p className="text-3xl font-bold text-errandify-orange">SGD ${task.budget.toFixed(2)}</p>
              <p className="text-xs text-gray-500 mt-2">Payment releases within 24-48 hours</p>
            </div>

            {/* Photos Section */}
            <div>
              <h3 className="font-semibold text-errandify-brown mb-3">📸 Add Photos (Proof of Completion)</h3>
              <p className="text-xs text-gray-500 mb-3">Upload up to 5 photos showing your completed work</p>

              {/* Photo Upload Area */}
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

              {/* Photo Preview */}
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

            {/* Notes Section */}
            <div>
              <h3 className="font-semibold text-errandify-brown mb-3">📝 Add Notes (Optional)</h3>
              <p className="text-xs text-gray-500 mb-3">Describe what you did and any important details</p>
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

            {/* Helpful Tip */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-xs text-blue-800">
                💡 <strong>Pro Tip:</strong> Good photos + clear notes = faster approval + happier ratings!
              </p>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3 pt-4">
              <button
                onClick={() => navigate(-1)}
                className="py-3 rounded-lg font-bold text-errandify-brown border-2 border-gray-300 hover:bg-gray-50 transition"
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
                {submitting ? '⏳ Submitting...' : '✓ Complete Errand'}
              </button>
            </div>

            {/* Info */}
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-xs text-yellow-800">
                ℹ️ After you submit, {task.asker?.display_name || 'the asker'} will review your work. Once approved, payment releases in 24-48 hours!
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
