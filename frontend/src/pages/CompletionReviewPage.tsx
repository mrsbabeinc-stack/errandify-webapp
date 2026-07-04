import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';

interface CompletionSubmission {
  id: number;
  submission_number: number;
  completion_notes: string;
  photo_urls: string[];
  submitted_by: number;
  submitted_by_name: string;
  submitted_at: string;
  status: string;
  files: any[];
}

interface PageProps {
  isAsker?: boolean;
}

export default function CompletionReviewPage({ isAsker = true }: PageProps) {
  const { id: errandId } = useParams<{ id: string }>();
  const [submissions, setSubmissions] = useState<CompletionSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [zoomedImageIndex, setZoomedImageIndex] = useState<number | null>(null);
  const [selectedSubmissionIndex, setSelectedSubmissionIndex] = useState(0);

  useEffect(() => {
    fetchSubmissions();
  }, [errandId]);

  const fetchSubmissions = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/jobs/${errandId}/submissions`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setSubmissions(response.data.data.submissions);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load completion details');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-errandify-orange mx-auto mb-4"></div>
          <p className="text-gray-600">Loading completion details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen p-4 bg-gray-50">
        <div className="max-w-2xl mx-auto">
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
            {error}
          </div>
        </div>
      </div>
    );
  }

  if (submissions.length === 0) {
    return (
      <div className="min-h-screen p-4 bg-gray-50">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg p-8 text-center">
            <p className="text-gray-600 mb-2">📭 No completion submissions yet</p>
            <p className="text-sm text-gray-500">
              {isAsker ? 'The doer will submit their work here' : 'You can submit your work here'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const currentSubmission = submissions[selectedSubmissionIndex];
  const allPhotos = currentSubmission.photo_urls || [];

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-errandify-brown mb-2">📋 Job Completion Details</h1>
          <p className="text-gray-600 text-sm">
            {submissions.length > 1 ? `Submission ${currentSubmission.submission_number} of ${submissions.length}` : 'Final submission'}
          </p>
        </div>

        {/* Submission Tabs */}
        {submissions.length > 1 && (
          <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
            {submissions.map((sub, idx) => (
              <button
                key={sub.id}
                onClick={() => {
                  setSelectedSubmissionIndex(idx);
                  setZoomedImageIndex(null);
                }}
                className={`px-4 py-2 rounded-lg font-semibold text-sm whitespace-nowrap transition-all ${
                  idx === selectedSubmissionIndex
                    ? 'bg-errandify-orange text-white shadow-md'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                {sub.status === 'pending' ? '⏳' : '✅'} Submission #{sub.submission_number}
              </button>
            ))}
          </div>
        )}

        {/* Completion Notes */}
        {currentSubmission.completion_notes && (
          <div className="bg-white rounded-lg p-4 mb-6 border-l-4 border-errandify-orange">
            <p className="text-xs text-gray-600 font-semibold mb-2">📝 Doer's Notes</p>
            <p className="text-sm text-gray-800 leading-relaxed">{currentSubmission.completion_notes}</p>
            <p className="text-xs text-gray-500 mt-3">
              Submitted by {currentSubmission.submitted_by_name} on{' '}
              {new Date(currentSubmission.submitted_at).toLocaleDateString()} at{' '}
              {new Date(currentSubmission.submitted_at).toLocaleTimeString()}
            </p>
          </div>
        )}

        {/* Photo Gallery */}
        {allPhotos.length > 0 ? (
          <div className="bg-white rounded-lg p-4 mb-6">
            <p className="text-xs text-gray-600 font-semibold mb-4">📸 Completion Photos ({allPhotos.length})</p>

            {/* Thumbnail Grid */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              {allPhotos.map((photoUrl, idx) => (
                <div
                  key={idx}
                  onClick={() => setZoomedImageIndex(idx)}
                  className="relative rounded-lg overflow-hidden border-2 border-gray-200 hover:border-errandify-orange transition-all cursor-pointer group bg-gray-100"
                >
                  <img
                    src={photoUrl}
                    alt={`Completion photo ${idx + 1}`}
                    className="w-full h-24 object-cover hover:opacity-75 transition-opacity"
                  />
                  <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-30 transition-opacity flex items-center justify-center">
                    <span className="text-white text-2xl opacity-0 group-hover:opacity-100 transition-opacity">🔍</span>
                  </div>
                  <div className="absolute top-1 right-1 bg-gray-900 bg-opacity-70 text-white text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center">
                    {idx + 1}
                  </div>
                </div>
              ))}
            </div>

            <p className="text-xs text-gray-500">Click any photo to view full size</p>
          </div>
        ) : (
          <div className="bg-gray-50 rounded-lg p-6 text-center border border-dashed border-gray-300">
            <p className="text-gray-600 text-sm">📭 No photos submitted</p>
          </div>
        )}

        {/* Status Badge */}
        <div className="bg-white rounded-lg p-4 flex items-center justify-between">
          <span className="text-sm text-gray-600 font-semibold">Status:</span>
          <span
            className={`px-4 py-2 rounded-full text-xs font-bold ${
              currentSubmission.status === 'pending'
                ? 'bg-yellow-100 text-yellow-800'
                : currentSubmission.status === 'approved'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
            }`}
          >
            {currentSubmission.status === 'pending' ? '⏳ Awaiting Review' : currentSubmission.status === 'approved' ? '✅ Approved' : '❌ Rejected'}
          </span>
        </div>
      </div>

      {/* Zoom Modal */}
      {zoomedImageIndex !== null && allPhotos[zoomedImageIndex] && (
        <div
          className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4"
          onClick={() => setZoomedImageIndex(null)}
        >
          <div
            className="relative max-w-2xl max-h-[80vh] w-full bg-white rounded-lg shadow-2xl overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => setZoomedImageIndex(null)}
              className="absolute top-2 right-2 bg-red-500 hover:bg-red-700 text-white rounded-full p-2 font-bold z-10"
            >
              ✕
            </button>

            {/* Full Image */}
            <img src={allPhotos[zoomedImageIndex]} alt="Full size preview" className="w-full h-auto" />

            {/* Photo Info */}
            <div className="bg-gray-50 p-4 border-t">
              <div className="flex justify-between items-center mb-2">
                <p className="text-sm font-semibold text-gray-800">Photo {zoomedImageIndex + 1} of {allPhotos.length}</p>
              </div>
              <p className="text-xs text-gray-600">
                {currentSubmission.submitted_by_name} • {new Date(currentSubmission.submitted_at).toLocaleString()}
              </p>
            </div>

            {/* Navigation */}
            <div className="flex justify-center gap-2 p-3 bg-gray-100 border-t">
              <button
                onClick={() => {
                  let newIndex = zoomedImageIndex - 1;
                  if (newIndex < 0) newIndex = allPhotos.length - 1;
                  setZoomedImageIndex(newIndex);
                }}
                className="px-3 py-1 bg-gray-400 hover:bg-gray-500 text-white rounded text-xs font-semibold"
              >
                ← Previous
              </button>
              <span className="text-xs text-gray-700 font-semibold self-center px-3">
                {zoomedImageIndex + 1} / {allPhotos.length}
              </span>
              <button
                onClick={() => {
                  let newIndex = zoomedImageIndex + 1;
                  if (newIndex >= allPhotos.length) newIndex = 0;
                  setZoomedImageIndex(newIndex);
                }}
                className="px-3 py-1 bg-gray-400 hover:bg-gray-500 text-white rounded text-xs font-semibold"
              >
                Next →
              </button>
            </div>

            {/* Download Button */}
            <div className="flex justify-center p-3 bg-white border-t gap-2">
              <a
                href={allPhotos[zoomedImageIndex]}
                download
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-errandify-orange text-white rounded text-xs font-semibold hover:bg-opacity-90"
              >
                ⬇️ Download Photo
              </a>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(allPhotos[zoomedImageIndex]);
                  alert('Photo URL copied to clipboard!');
                }}
                className="px-4 py-2 bg-blue-500 text-white rounded text-xs font-semibold hover:bg-blue-600"
              >
                📋 Copy URL
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
