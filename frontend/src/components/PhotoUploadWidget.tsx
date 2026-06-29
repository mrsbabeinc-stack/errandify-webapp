// Photo Upload Widget for Hana & Dispute Evidence
// Supports camera capture, file upload, and preview

import React, { useState, useRef } from 'react';
import {
  capturePhotoFromCamera,
  uploadPhotoFromFile,
  createPhotoInput,
  createCameraInput,
  validatePhoto,
  PhotoMetadata,
  compressImage,
} from '../utils/photoUpload';
import './PhotoUploadWidget.css';

interface PhotoUploadWidgetProps {
  onPhotoAdded: (photo: PhotoMetadata) => void;
  onPhotosChange: (photos: PhotoMetadata[]) => void;
  maxPhotos?: number;
  disabled?: boolean;
  context?: 'dispute_evidence' | 'task_details';
}

const PhotoUploadWidget: React.FC<PhotoUploadWidgetProps> = ({
  onPhotoAdded,
  onPhotosChange,
  maxPhotos = 5,
  disabled = false,
  context = 'task_details',
}) => {
  const [photos, setPhotos] = useState<PhotoMetadata[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  const handleCameraCapture = async () => {
    try {
      setLoading(true);
      setError(null);

      const photo = await capturePhotoFromCamera();

      if (!photo) {
        setError('Failed to capture photo from camera');
        return;
      }

      // Validate photo
      const validation = validatePhoto(photo);
      if (!validation.valid) {
        setError(validation.error);
        return;
      }

      // Compress image
      const compressed = await compressImage(photo.dataUrl);
      const compressedPhoto = { ...photo, dataUrl: compressed };

      // Add to list
      const updatedPhotos = [...photos, compressedPhoto];
      setPhotos(updatedPhotos);
      onPhotoAdded(compressedPhoto);
      onPhotosChange(updatedPhotos);
    } catch (err: any) {
      setError('Camera error: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setLoading(true);
      setError(null);

      const file = event.target.files?.[0];
      if (!file) return;

      const photo = await uploadPhotoFromFile(file);

      if (!photo) {
        setError('Failed to load photo from file');
        return;
      }

      // Validate photo
      const validation = validatePhoto(photo);
      if (!validation.valid) {
        setError(validation.error);
        return;
      }

      // Compress image
      const compressed = await compressImage(photo.dataUrl);
      const compressedPhoto = { ...photo, dataUrl: compressed };

      // Add to list
      const updatedPhotos = [...photos, compressedPhoto];
      setPhotos(updatedPhotos);
      onPhotoAdded(compressedPhoto);
      onPhotosChange(updatedPhotos);

      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err: any) {
      setError('File error: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleCameraFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setLoading(true);
      setError(null);

      const file = event.target.files?.[0];
      if (!file) return;

      const photo = await uploadPhotoFromFile(file);

      if (!photo) {
        setError('Failed to capture photo');
        return;
      }

      // Validate photo
      const validation = validatePhoto(photo);
      if (!validation.valid) {
        setError(validation.error);
        return;
      }

      // Compress image
      const compressed = await compressImage(photo.dataUrl);
      const compressedPhoto = { ...photo, dataUrl: compressed };

      // Add to list
      const updatedPhotos = [...photos, compressedPhoto];
      setPhotos(updatedPhotos);
      onPhotoAdded(compressedPhoto);
      onPhotosChange(updatedPhotos);

      // Reset input
      if (cameraInputRef.current) {
        cameraInputRef.current.value = '';
      }
    } catch (err: any) {
      setError('Camera error: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const removePhoto = (id: string) => {
    const updatedPhotos = photos.filter((p) => p.id !== id);
    setPhotos(updatedPhotos);
    onPhotosChange(updatedPhotos);
  };

  const canAddMore = photos.length < maxPhotos;

  return (
    <div className="photo-upload-widget">
      <div className="photo-upload-header">
        <h3>📸 Add Photos</h3>
        <span className="photo-count">
          {photos.length}/{maxPhotos}
        </span>
      </div>

      {/* Upload Buttons */}
      <div className="photo-upload-buttons">
        <button
          className="btn-upload btn-camera"
          onClick={() => cameraInputRef.current?.click()}
          disabled={!canAddMore || loading || disabled}
          title="Take a photo using device camera"
        >
          📷 Take Photo
        </button>

        <button
          className="btn-upload btn-file"
          onClick={() => fileInputRef.current?.click()}
          disabled={!canAddMore || loading || disabled}
          title="Upload photo from device"
        >
          📁 Upload Photo
        </button>

        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleCameraFileSelect}
          style={{ display: 'none' }}
        />

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />
      </div>

      {/* Error Message */}
      {error && <div className="photo-error-message">{error}</div>}

      {/* Loading State */}
      {loading && <div className="photo-loading">Processing photo...</div>}

      {/* Photos Grid */}
      {photos.length > 0 && (
        <div className="photos-grid">
          {photos.map((photo) => (
            <div key={photo.id} className="photo-item">
              <img src={photo.dataUrl} alt={`Photo ${photo.id}`} className="photo-thumbnail" />
              <div className="photo-info">
                <span className="photo-source">{photo.source === 'camera' ? '📷' : '📁'}</span>
                <button
                  className="btn-remove"
                  onClick={() => removePhoto(photo.id)}
                  title="Remove this photo"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {photos.length === 0 && !loading && (
        <div className="photo-empty-state">
          <p>📸 No photos yet</p>
          <p className="hint">Add photos to help resolve disputes (max {maxPhotos})</p>
        </div>
      )}

      {/* Max Reached Message */}
      {!canAddMore && (
        <div className="photo-max-reached">Maximum photos reached ({maxPhotos}). Remove photos to add more.</div>
      )}
    </div>
  );
};

export default PhotoUploadWidget;
