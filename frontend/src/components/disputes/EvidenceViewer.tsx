import React, { useState, useEffect } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface Evidence {
  id: number;
  submittedBy: 'doer' | 'company';
  type: 'photo' | 'video' | 'text';
  fileName: string;
  size: number;
  compressedSize?: number;
  isCompressed: boolean;
  uploadedAt: string;
  aiStatus: 'PENDING' | 'COMPLETED' | 'FAILED';
  aiConfidence?: number;
  aiVerdictHint?: string;
  url?: string;
}

interface EvidenceViewerProps {
  disputeId: number;
  canUpload: boolean; // Only during OPEN, PENDING_RESPONSE, EVIDENCE_RECEIVED
  userType: 'doer' | 'company_staff' | 'admin';
  timeRemaining: number; // hours until T+48h
  onEvidenceUploaded?: () => void;
}

export function EvidenceViewer({
  disputeId,
  canUpload,
  userType,
  timeRemaining,
  onEvidenceUploaded,
}: EvidenceViewerProps) {
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | 'doer' | 'company'>('all');
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    fetchEvidence();
  }, [disputeId, filter]);

  const fetchEvidence = async () => {
    try {
      setLoading(true);
      const query = filter !== 'all' ? `?party=${filter}` : '';
      const response = await fetch(`${API_URL}/api/disputes/${disputeId}/evidence${query}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });

      if (!response.ok) throw new Error('Failed to fetch evidence');

      const data = await response.json();
      setEvidence(data.evidence || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || !files.length) return;

    // Validate files
    const validFiles: File[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.size > 50 * 1024 * 1024) {
        setError(`${file.name} exceeds 50MB limit`);
        continue;
      }
      validFiles.push(file);
    }

    if (!validFiles.length) return;

    await uploadEvidence(validFiles);
  };

  const uploadEvidence = async (files: File[]) => {
    setUploading(true);
    setError('');

    try {
      const formData = new FormData();
      files.forEach((file) => {
        formData.append('files', file);
      });

      const response = await fetch(`${API_URL}/api/disputes/${disputeId}/evidence`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      await fetchEvidence();
      onEvidenceUploaded?.();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const getFileIcon = (type: Evidence['type']) => {
    switch (type) {
      case 'photo':
        return '🖼️';
      case 'video':
        return '🎬';
      case 'text':
        return '📄';
      default:
        return '📎';
    }
  };

  const getAIStatusBadge = (status: Evidence['aiStatus'], confidence?: number) => {
    switch (status) {
      case 'PENDING':
        return (
          <div className="flex items-center gap-2 text-sm text-yellow-600 bg-yellow-50 px-3 py-1 rounded-full">
            <span className="animate-spin text-lg">⏳</span>
            Analyzing...
          </div>
        );
      case 'COMPLETED':
        return (
          <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 px-3 py-1 rounded-full">
            <span className="text-lg">✓</span>
            {confidence}% confident
          </div>
        );
      case 'FAILED':
        return (
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 px-3 py-1 rounded-full">
            <span className="text-lg">⚠️</span>
            Analysis failed
          </div>
        );
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      {canUpload && timeRemaining > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Submit Evidence</h3>

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-8 text-center transition ${
              dragOver ? 'border-orange-500 bg-orange-100' : 'border-orange-300 hover:border-orange-500'
            }`}
          >
            <div className="text-4xl text-orange-500 mb-3">📤</div>
            <p className="text-gray-700 font-medium mb-2">Drag files here or click to upload</p>
            <p className="text-sm text-gray-600 mb-4">
              Supports: Photos, Videos, Documents (Max 50MB each)
            </p>
            <input
              type="file"
              multiple
              onChange={(e) => handleFileSelect(e.target.files!)}
              className="hidden"
              id="evidence-upload"
              accept="image/*,video/*,.pdf,.doc,.docx"
              disabled={uploading}
            />
            <label htmlFor="evidence-upload">
              <button
                type="button"
                disabled={uploading}
                className="bg-orange-500 text-white px-6 py-2 rounded-lg hover:bg-orange-600 disabled:opacity-50 inline-block cursor-pointer"
              >
                {uploading ? 'Uploading...' : 'Select Files'}
              </button>
            </label>
          </div>

          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded p-3 text-red-700 text-sm flex gap-2">
              <span className="text-lg flex-shrink-0">⚠️</span>
              {error}
            </div>
          )}

          <p className="text-xs text-gray-500 mt-4">
            ⏱️ {timeRemaining} hours remaining to submit evidence (until T+48h auto-resolve)
          </p>
        </div>
      )}

      {!canUpload && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm flex gap-2">
          <span className="text-lg flex-shrink-0">⚠️</span>
          <span>Evidence submission is no longer available. The dispute is past the investigation phase.</span>
        </div>
      )}

      {/* Evidence List */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">
            Evidence ({evidence.length})
          </h3>
          {evidence.length > 0 && (
            <div className="flex gap-2">
              {['all', 'doer', 'company'].map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f as any)}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition ${
                    filter === f
                      ? 'bg-orange-500 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
          )}
        </div>

        {loading ? (
          <div className="text-center py-8 text-gray-500">
            <div className="text-4xl animate-spin mx-auto mb-2">⏳</div>
            Loading evidence...
          </div>
        ) : evidence.length === 0 ? (
          <div className="bg-gray-50 rounded-lg p-8 text-center text-gray-500">
            <p>No evidence submitted yet</p>
            {canUpload && <p className="text-sm mt-2">Upload evidence to support your case</p>}
          </div>
        ) : (
          <div className="space-y-3">
            {evidence.map((item) => (
              <div
                key={item.id}
                className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start gap-3 flex-1">
                    <span className="text-2xl">{getFileIcon(item.type)}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-800 truncate">{item.fileName}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                        <span>{formatFileSize(item.size)}</span>
                        {item.isCompressed && (
                          <span className="text-green-600">
                            Compressed to {formatFileSize(item.compressedSize || 0)}
                          </span>
                        )}
                        <span>{formatDate(item.uploadedAt)}</span>
                        <span className="bg-gray-100 px-2 py-0.5 rounded capitalize">
                          {item.type}
                        </span>
                        <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded">
                          {item.submittedBy === 'doer' ? 'Doer' : 'Company'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 ml-2">
                    {item.url && (
                      <>
                        <button
                          title="View"
                          className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 text-xl"
                        >
                          👁️
                        </button>
                        <a
                          href={item.url}
                          download={item.fileName}
                          title="Download"
                          className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 text-xl"
                        >
                          ⬇️
                        </a>
                      </>
                    )}
                    {canUpload && userType !== 'admin' && (
                      <button
                        title="Delete"
                        className="p-2 text-red-500 hover:text-red-700 rounded-lg hover:bg-red-50 text-xl"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                </div>

                {/* AI Analysis Status */}
                {getAIStatusBadge(item.aiStatus, item.aiConfidence)}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
