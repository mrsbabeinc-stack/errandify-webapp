// Photo Upload Utilities for Dispute Resolution
// Handle camera capture, file upload, and image processing

import api from '../services/api';

export interface PhotoMetadata {
  id: string;
  dataUrl: string;
  timestamp: number;
  source: 'camera' | 'upload';
  fileName?: string;
  mimeType: string;
  size: number;
}

/**
 * Capture photo from device camera
 */
export async function capturePhotoFromCamera(): Promise<PhotoMetadata | null> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    if (!context) {
      resolve(null);
      return;
    }

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment' } })
      .then((stream) => {
        video.srcObject = stream;
        video.play();

        // Wait for video to load
        setTimeout(() => {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          context.drawImage(video, 0, 0);

          // Stop camera stream
          stream.getTracks().forEach((track) => track.stop());

          // Convert to data URL
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);

          resolve({
            id: `photo_${Date.now()}`,
            dataUrl,
            timestamp: Date.now(),
            source: 'camera',
            mimeType: 'image/jpeg',
            size: new Blob([dataUrl]).size,
          });
        }, 500);
      })
      .catch((error) => {
        console.error('Camera access error:', error);
        resolve(null);
      });
  });
}

/**
 * Upload photo from file input
 */
export async function uploadPhotoFromFile(file: File): Promise<PhotoMetadata | null> {
  return new Promise((resolve) => {
    if (!file.type.startsWith('image/')) {
      console.error('Invalid file type:', file.type);
      resolve(null);
      return;
    }

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      console.error('File too large:', file.size);
      resolve(null);
      return;
    }

    const reader = new FileReader();

    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;

      resolve({
        id: `photo_${Date.now()}`,
        dataUrl,
        timestamp: Date.now(),
        source: 'upload',
        fileName: file.name,
        mimeType: file.type,
        size: file.size,
      });
    };

    reader.onerror = () => {
      console.error('File read error');
      resolve(null);
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Compress image for efficient storage/transfer
 */
export async function compressImage(dataUrl: string, maxWidth: number = 1024, maxHeight: number = 1024): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();

    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      // Calculate new dimensions
      if (width > height) {
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
      }

      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };

    img.onerror = () => {
      console.error('Image compression error');
      resolve(dataUrl); // Return original if compression fails
    };

    img.src = dataUrl;
  });
}

/**
 * Upload photo to backend (for dispute evidence)
 */
export async function uploadPhotoToBackend(
  photo: PhotoMetadata,
  context: 'dispute_evidence' | 'task_details' = 'task_details'
): Promise<{ url: string; error?: string } | null> {
  try {
    const formData = new FormData();
    formData.append('image', photo.dataUrl);
    formData.append('context', context);
    formData.append('fileName', photo.fileName || `photo_${photo.timestamp}.jpg`);

    const response = await api.post('/api/uploads/photo', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  } catch (error: any) {
    console.error('Photo upload error:', error);
    return {
      url: '',
      error: error.response?.data?.error || 'Failed to upload photo',
    };
  }
}

/**
 * Get file from input element
 */
export function getFileFromInput(inputElement: HTMLInputElement): File | null {
  const files = inputElement.files;
  return files && files.length > 0 ? files[0] : null;
}

/**
 * Create file input element for camera/file selection
 */
export function createPhotoInput(accept: string = 'image/*'): HTMLInputElement {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = accept;
  return input;
}

/**
 * Create camera input element
 */
export function createCameraInput(): HTMLInputElement {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.capture = 'environment';
  return input;
}

/**
 * Validate photo before upload
 */
export function validatePhoto(photo: PhotoMetadata): { valid: boolean; error?: string } {
  if (!photo.dataUrl) {
    return { valid: false, error: 'No photo data' };
  }

  if (photo.size > 5 * 1024 * 1024) {
    return { valid: false, error: 'Photo too large (max 5MB)' };
  }

  if (!photo.mimeType.startsWith('image/')) {
    return { valid: false, error: 'Invalid image format' };
  }

  return { valid: true };
}
