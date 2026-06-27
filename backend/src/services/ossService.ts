// import OSS from 'ali-oss';
import { v4 as uuidv4 } from 'uuid';

// Initialize OSS client
// TODO: Implement Ali OSS integration when ali-oss package is added
// const ossClient = new OSS({
//   region: process.env.ALIBABA_OSS_REGION || 'oss-ap-southeast-1',
//   accessKeyId: process.env.ALIBABA_ACCESS_KEY_ID,
//   accessKeySecret: process.env.ALIBABA_ACCESS_KEY_SECRET,
//   bucket: process.env.ALIBABA_OSS_BUCKET || 'errandify-jobs',
// });

/**
 * Generate signed URL for direct browser upload
 * URL is valid for 30 minutes
 */
export async function generateSignedUrl(
  fileType: string = 'image/jpeg'
): Promise<{
  uploadUrl: string;
  key: string;
}> {
  try {
    // Generate unique key for the photo
    const timestamp = Date.now();
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    const key = `jobs/${year}/${month}/${uuidv4()}.jpg`;

    // Generate signed URL for direct upload from frontend
    // URL valid for 30 minutes
    const signedUrl = ossClient.generateObjectUrl(key, {
      expires: 30 * 60, // 30 minutes
      method: 'PUT',
    });

    return {
      uploadUrl: signedUrl,
      key: key,
    };
  } catch (error) {
    console.error('OSS generateSignedUrl error:', error);
    throw new Error('Failed to generate upload URL');
  }
}

/**
 * Upload file directly to OSS (server-side)
 */
export async function uploadFile(
  buffer: Buffer,
  filename: string,
  contentType: string = 'image/jpeg'
): Promise<string> {
  try {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    const key = `jobs/${year}/${month}/${uuidv4()}-${filename}`;

    const result = await ossClient.put(key, buffer, {
      contentType: contentType,
      headers: {
        'Cache-Control': 'max-age=31536000', // Cache for 1 year
      },
    });

    return result.url;
  } catch (error) {
    console.error('OSS upload error:', error);
    throw new Error('Failed to upload file to Alibaba OSS');
  }
}

/**
 * Delete file from OSS
 */
export async function deleteFile(key: string): Promise<void> {
  try {
    await ossClient.delete(key);
  } catch (error) {
    console.error('OSS delete error:', error);
    throw new Error('Failed to delete file from Alibaba OSS');
  }
}

/**
 * Get public URL for file
 */
export function getFileUrl(key: string): string {
  try {
    const url = ossClient.getObjectUrl(key);
    return url;
  } catch (error) {
    console.error('OSS getFileUrl error:', error);
    throw new Error('Failed to get file URL');
  }
}

/**
 * List files for a job (for debugging/admin)
 */
export async function listFiles(prefix: string): Promise<string[]> {
  try {
    const result = await ossClient.list({ prefix });
    return result.objects?.map(obj => obj.name) || [];
  } catch (error) {
    console.error('OSS listFiles error:', error);
    throw new Error('Failed to list files');
  }
}
