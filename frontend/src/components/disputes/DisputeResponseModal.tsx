import React, { useState } from 'react';
import { AlertCircle, Upload, Clock } from 'lucide-react';

interface DisputeResponseModalProps {
  disputeId: number;
  responseDeadline: string;
  onSubmit: (message: string, evidence?: File[]) => Promise<void>;
  onClose: () => void;
}

export function DisputeResponseModal({
  disputeId,
  responseDeadline,
  onSubmit,
  onClose,
}: DisputeResponseModalProps) {
  const [message, setMessage] = useState('');
  const [evidence, setEvidence] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const hoursRemaining = Math.round(
    (new Date(responseDeadline).getTime() - new Date().getTime()) / (1000 * 60 * 60)
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      const validFiles = files.filter((file) => {
        const maxSize = 50 * 1024 * 1024; // 50MB
        return file.size <= maxSize;
      });

      if (validFiles.length < files.length) {
        setError('Some files exceed 50MB and were skipped');
      }

      setEvidence([...evidence, ...validFiles]);
    }
  };

  const handleRemoveFile = (index: number) => {
    setEvidence(evidence.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!message.trim()) {
      setError('Please enter a response');
      return;
    }

    setLoading(true);
    try {
      await onSubmit(message, evidence.length > 0 ? evidence : undefined);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to submit response');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="border-b p-6 bg-gradient-to-r from-orange-50 to-orange-100">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">Submit Your Response</h2>
              <p className="text-gray-600 mt-1">Dispute #{disputeId}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Timeline Alert */}
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 flex gap-3">
            <Clock className="text-orange-600 flex-shrink-0 mt-0.5" size={20} />
            <div>
              <p className="font-semibold text-orange-900">Time Remaining</p>
              <p className="text-orange-700 text-sm">
                You have <strong>{hoursRemaining} hours</strong> to respond. After this time,
                the system will auto-resolve based on available evidence.
              </p>
            </div>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
              <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {/* Response Message */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Your Response *
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Explain your side of the dispute. Be clear and factual. Provide details about what happened and why..."
              className="w-full h-32 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">
              Minimum 20 characters required
            </p>
          </div>

          {/* Evidence Upload */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Evidence (Photos, Videos, Documents)
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-orange-500 hover:bg-orange-50 transition">
              <Upload className="mx-auto text-gray-400 mb-2" size={24} />
              <p className="text-sm text-gray-600 mb-2">
                Drag files here or click to upload
              </p>
              <p className="text-xs text-gray-500 mb-4">
                Maximum 50MB per file. Supports: JPG, PNG, MP4, PDF
              </p>
              <input
                type="file"
                multiple
                onChange={handleFileSelect}
                className="hidden"
                id="evidence-upload"
                accept="image/*,video/*,.pdf"
              />
              <label htmlFor="evidence-upload" className="cursor-pointer">
                <button
                  type="button"
                  className="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 inline-block"
                >
                  Select Files
                </button>
              </label>
            </div>

            {/* Evidence List */}
            {evidence.length > 0 && (
              <div className="mt-4 space-y-2">
                {evidence.map((file, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between bg-gray-50 p-3 rounded-lg"
                  >
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-700">{file.name}</p>
                      <p className="text-xs text-gray-500">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <button
                      onClick={() => handleRemoveFile(idx)}
                      className="text-red-500 hover:text-red-700 text-sm font-medium"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Tips */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm font-semibold text-blue-900 mb-2">Tips for a strong response:</p>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>✓ Be specific and factual about what happened</li>
              <li>✓ Provide evidence that supports your side</li>
              <li>✓ Explain any misunderstandings clearly</li>
              <li>✓ Avoid accusations or emotional language</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t bg-gray-50 p-6 flex gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !message.trim()}
            className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50"
          >
            {loading ? 'Submitting...' : 'Submit Response'}
          </button>
        </div>
      </div>
    </div>
  );
}
