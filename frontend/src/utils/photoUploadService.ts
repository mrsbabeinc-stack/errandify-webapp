import axios from 'axios';

interface UploadPhotoOptions {
  token: string;
  errandId: number;
  file: File;
  caption?: string;
  onProgress?: (progress: number) => void;
}

/**
 * Upload a photo to Alibaba OSS via signed URL
 * This provides direct browser upload without backend bottleneck
 */
export async function uploadPhotoToAlibaba(options: UploadPhotoOptions): Promise<{
  photoId: number;
  photoUrl: string;
  uploadedAt: string;
}> {
  const { token, errandId, file, caption, onProgress } = options;
  const apiUrl = import.meta.env.VITE_API_URL || window.location.origin;

  try {
    // Step 1: Get signed URL from backend
    const signResponse = await axios.get(
      `${apiUrl}/api/uploads/sign-url`,
      {
        params: { fileType: file.type },
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (!signResponse.data.success) {
      throw new Error('Failed to get upload URL');
    }

    const { uploadUrl, key } = signResponse.data.data;

    // Step 2: Upload directly to Alibaba OSS using signed URL
    // This bypasses our backend and goes straight to Alibaba
    const uploadResponse = await axios.put(uploadUrl, file, {
      headers: {
        'Content-Type': file.type,
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded / progressEvent.total) * 100);
          onProgress(progress);
        }
      },
    });

    if (!uploadResponse.data || uploadResponse.status !== 200) {
      throw new Error(`Upload failed with status ${uploadResponse.status}`);
    }

    // Step 3: Verify upload and save metadata to our database
    const verifyResponse = await axios.post(
      `${apiUrl}/api/uploads/verify`,
      {
        key: key,
        errandId: errandId,
        caption: caption || `Photo`,
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!verifyResponse.data.success) {
      throw new Error('Failed to verify upload');
    }

    return {
      photoId: verifyResponse.data.data.photoId,
      photoUrl: verifyResponse.data.data.photoUrl,
      uploadedAt: verifyResponse.data.data.uploadedAt,
    };
  } catch (error) {
    console.error('Photo upload error:', error);
    if (axios.isAxiosError(error)) {
      throw new Error(
        error.response?.data?.error ||
        `Upload failed: ${error.message}`
      );
    }
    throw error;
  }
}

/**
 * Upload multiple photos sequentially
 */
export async function uploadMultiplePhotos(
  options: Omit<UploadPhotoOptions, 'file'> & { files: File[] },
  onPhotoComplete?: (photoUrl: string, index: number, total: number) => void
): Promise<Array<{ photoId: number; photoUrl: string; uploadedAt: string }>> {
  const { files, ...commonOptions } = options;
  const results: Array<{ photoId: number; photoUrl: string; uploadedAt: string }> = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    try {
      const result = await uploadPhotoToAlibaba({
        ...commonOptions,
        file: file,
        caption: `Photo ${i + 1}`,
      });
      results.push(result);
      onPhotoComplete?.(result.photoUrl, i + 1, files.length);
    } catch (error) {
      console.error(`Failed to upload photo ${i + 1}:`, error);
      throw new Error(`Failed to upload photo ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  return results;
}
