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
  isMine?: boolean;
  mime?: string | null;
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
  const [preview, setPreview] = useState<{ name: string; mime: string; dataUrl: string } | null>(null);

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

  // Must match the server: it takes photos and PDFs at up to 6MB each. The old
  // 50MB check here passed files the server would always reject.
  const ACCEPTED = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
  const MAX_BYTES = 6_000_000;

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || !files.length) return;

    const validFiles: File[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!ACCEPTED.includes(file.type)) {
        setError(`${file.name} is not a photo or a PDF.`);
        continue;
      }
      if (file.size > MAX_BYTES) {
        setError(`${file.name} is ${(file.size / 1e6).toFixed(1)}MB — the limit is 6MB.`);
        continue;
      }
      validFiles.push(file);
    }

    if (!validFiles.length) return;

    await uploadEvidence(validFiles);
  };

  const readAsDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error(`Could not read ${file.name}`));
      reader.readAsDataURL(file);
    });

  // Sent as base64 JSON, not multipart. There is no object storage in this app
  // and no multipart parser mounted — the server stores the bytes alongside the
  // dispute, the same way the ACRA company document works.
  const uploadEvidence = async (files: File[]) => {
    setUploading(true);
    setError('');

    try {
      const payload = await Promise.all(
        files.map(async (file) => ({
          name: file.name,
          mime: file.type,
          data: await readAsDataUrl(file),
        }))
      );

      const response = await fetch(`${API_URL}/api/disputes/${disputeId}/evidence`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ files: payload }),
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

  // The file bytes are not in the list response — ten 6MB photos would be a 60MB
  // payload for a screen that only draws rows — so each one is fetched on
  // demand. It also cannot be an <img src> or a plain download link: the route
  // needs an Authorization header.
  const loadFile = async (id: number) => {
    const res = await fetch(`${API_URL}/api/disputes/${disputeId}/evidence/${id}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body?.error || 'Could not load that file.');
    return body.data as { dataUrl: string | null; fileName: string; mime: string };
  };

  const handleView = async (item: Evidence) => {
    setError('');
    try {
      const file = await loadFile(item.id);
      if (!file.dataUrl) {
        setError('This file is no longer stored — only the record that it was submitted.');
        return;
      }
      setPreview({ name: file.fileName || item.fileName, mime: file.mime, dataUrl: file.dataUrl });
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDownload = async (item: Evidence) => {
    setError('');
    try {
      const file = await loadFile(item.id);
      if (!file.dataUrl) {
        setError('This file is no longer stored.');
        return;
      }
      const a = document.createElement('a');
      a.href = file.dataUrl;
      a.download = file.fileName || item.fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDelete = async (item: Evidence) => {
    if (!window.confirm(`Remove "${item.fileName}"? This cannot be undone.`)) return;
    setError('');
    try {
      const res = await fetch(`${API_URL}/api/disputes/${disputeId}/evidence/${item.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error || 'Could not remove that.');
      await fetchEvidence();
    } catch (err: any) {
      setError(err.message);
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
                          onClick={() => handleView(item)}
                          title="View"
                          className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 text-xl"
                        >
                          👁️
                        </button>
                        <button
                          onClick={() => handleDownload(item)}
                          title="Download"
                          className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 text-xl"
                        >
                          ⬇️
                        </button>
                      </>
                    )}
                    {/* Only your own, and only while the dispute is still open —
                        the server enforces both, this just stops offering a
                        button that would be refused. */}
                    {canUpload && item.isMine && (
                      <button
                        onClick={() => handleDelete(item)}
                        title="Remove"
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

      {preview && (
        <div
          className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50"
          onClick={() => setPreview(null)}
        >
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center p-4 border-b">
              <p className="font-semibold text-gray-800 truncate">{preview.name}</p>
              <button onClick={() => setPreview(null)} className="text-2xl text-gray-500 hover:text-gray-800">
                ×
              </button>
            </div>
            <div className="p-4">
              {preview.mime === 'application/pdf' ? (
                <iframe title={preview.name} src={preview.dataUrl} className="w-full h-[70vh] border rounded" />
              ) : (
                <img src={preview.dataUrl} alt={preview.name} className="max-w-full rounded" />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
