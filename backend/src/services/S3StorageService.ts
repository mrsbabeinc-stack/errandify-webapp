// S3 Storage Service - Evidence File Management
import AWS from 'aws-sdk';
import { createReadStream } from 'fs';
import path from 'path';
import sharp from 'sharp';
import ffmpeg from 'fluent-ffmpeg';

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'us-east-1',
});

interface UploadResult {
  originalUrl: string;
  compressedUrl?: string;
  fileName: string;
  originalSize: number;
  compressedSize?: number;
  isCompressed: boolean;
}

export class S3StorageService {
  private static readonly BUCKET = process.env.AWS_S3_BUCKET || 'errandify-disputes';
  private static readonly MAX_PHOTO_SIZE = 5 * 1024 * 1024; // 5MB
  private static readonly MAX_VIDEO_SIZE = 20 * 1024 * 1024; // 20MB
  private static readonly PHOTO_QUALITY = 80; // JPEG quality

  /**
   * Upload evidence file to S3
   * Auto-compresses photos and videos if needed
   */
  static async uploadEvidence(
    file: Express.Multer.File,
    disputeId: number,
    evidenceId: number,
    fileType: 'photo' | 'video' | 'text'
  ): Promise<UploadResult> {
    try {
      // Generate S3 key
      const timestamp = Date.now();
      const originalKey = `disputes/${disputeId}/evidence/${evidenceId}-${timestamp}-original.${this.getFileExtension(file.originalname)}`;

      // Upload original file
      const originalUrl = await this.uploadToS3(originalKey, file.buffer, file.mimetype);

      // Compress if needed
      let compressedUrl: string | undefined;
      let compressedBuffer: Buffer | undefined;
      let isCompressed = false;

      if (fileType === 'photo' && file.size > this.MAX_PHOTO_SIZE) {
        console.log(`[S3] Compressing photo: ${file.originalname} (${file.size} bytes)`);
        compressedBuffer = await this.compressPhoto(file.buffer);
        isCompressed = true;

        const compressedKey = `disputes/${disputeId}/evidence/${evidenceId}-${timestamp}-compressed.jpg`;
        compressedUrl = await this.uploadToS3(compressedKey, compressedBuffer, 'image/jpeg');
      }

      if (fileType === 'video' && file.size > this.MAX_VIDEO_SIZE) {
        console.log(`[S3] Compressing video: ${file.originalname} (${file.size} bytes)`);
        compressedBuffer = await this.compressVideo(file.buffer, file.mimetype);
        isCompressed = true;

        const videoExtension = this.getVideoExtension(file.mimetype);
        const compressedKey = `disputes/${disputeId}/evidence/${evidenceId}-${timestamp}-compressed.${videoExtension}`;
        compressedUrl = await this.uploadToS3(compressedKey, compressedBuffer, file.mimetype);
      }

      return {
        originalUrl,
        compressedUrl,
        fileName: file.originalname,
        originalSize: file.size,
        compressedSize: compressedBuffer?.length,
        isCompressed,
      };
    } catch (error) {
      console.error('[S3] Upload error:', error);
      throw new Error(`Failed to upload evidence: ${(error as any).message}`);
    }
  }

  /**
   * Download evidence file from S3
   */
  static async downloadEvidence(s3Key: string): Promise<Buffer> {
    try {
      const params = {
        Bucket: this.BUCKET,
        Key: s3Key,
      };

      const object = await s3.getObject(params).promise();
      return object.Body as Buffer;
    } catch (error) {
      console.error('[S3] Download error:', error);
      throw new Error(`Failed to download evidence: ${(error as any).message}`);
    }
  }

  /**
   * Delete evidence file from S3
   */
  static async deleteEvidence(s3Key: string): Promise<void> {
    try {
      const params = {
        Bucket: this.BUCKET,
        Key: s3Key,
      };

      await s3.deleteObject(params).promise();
      console.log(`[S3] Deleted: ${s3Key}`);
    } catch (error) {
      console.error('[S3] Delete error:', error);
      throw new Error(`Failed to delete evidence: ${(error as any).message}`);
    }
  }

  /**
   * Generate signed URL for temporary access (24h expiry)
   */
  static async getSignedUrl(s3Key: string, expiresIn: number = 86400): Promise<string> {
    try {
      const params = {
        Bucket: this.BUCKET,
        Key: s3Key,
        Expires: expiresIn,
      };

      return s3.getSignedUrl('getObject', params);
    } catch (error) {
      console.error('[S3] Signed URL error:', error);
      throw new Error(`Failed to generate signed URL: ${(error as any).message}`);
    }
  }

  /**
   * Compress photo using Sharp
   * Targets 5MB or less
   */
  private static async compressPhoto(buffer: Buffer): Promise<Buffer> {
    try {
      let compressed = await sharp(buffer)
        .rotate() // Auto-rotate based on EXIF
        .jpeg({ quality: this.PHOTO_QUALITY, progressive: true })
        .toBuffer();

      // If still too large, reduce quality further
      while (compressed.length > this.MAX_PHOTO_SIZE && this.PHOTO_QUALITY > 40) {
        const quality = Math.max(40, this.PHOTO_QUALITY - 10);
        compressed = await sharp(buffer)
          .rotate()
          .jpeg({ quality, progressive: true })
          .toBuffer();
      }

      console.log(`[S3] Compressed photo: ${buffer.length} → ${compressed.length} bytes`);
      return compressed;
    } catch (error) {
      console.error('[S3] Photo compression error:', error);
      throw error;
    }
  }

  /**
   * Compress video using ffmpeg
   * Targets 20MB or less using H.264 codec
   */
  private static async compressVideo(
    buffer: Buffer,
    mimeType: string
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        // Create temporary file paths
        const inputPath = `/tmp/video-input-${Date.now()}.mp4`;
        const outputPath = `/tmp/video-output-${Date.now()}.mp4`;

        // Write input file
        const fs = require('fs');
        fs.writeFileSync(inputPath, buffer);

        // Use ffmpeg to compress
        ffmpeg(inputPath)
          .videoCodec('libx264') // H.264 codec
          .size('1280x720') // Reduce resolution
          .videoBitrate('1000k') // Reduce bitrate
          .fps(24) // Reduce frame rate
          .audioCodec('aac')
          .audioBitrate('128k')
          .output(outputPath)
          .on('error', (err: any) => {
            fs.unlinkSync(inputPath);
            reject(err);
          })
          .on('end', () => {
            try {
              const compressed = fs.readFileSync(outputPath);
              fs.unlinkSync(inputPath);
              fs.unlinkSync(outputPath);
              console.log(`[S3] Compressed video: ${buffer.length} → ${compressed.length} bytes`);
              resolve(compressed);
            } catch (err) {
              reject(err);
            }
          })
          .run();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Get file extension from filename
   */
  private static getFileExtension(filename: string): string {
    return path.extname(filename).toLowerCase().substring(1) || 'bin';
  }

  /**
   * Get video extension from MIME type
   */
  private static getVideoExtension(mimeType: string): string {
    const mimeToExt: { [key: string]: string } = {
      'video/mp4': 'mp4',
      'video/mpeg': 'mpeg',
      'video/quicktime': 'mov',
      'video/x-msvideo': 'avi',
      'video/webm': 'webm',
    };
    return mimeToExt[mimeType] || 'mp4';
  }

  /**
   * Upload buffer to S3
   */
  private static async uploadToS3(
    key: string,
    buffer: Buffer,
    mimeType: string
  ): Promise<string> {
    try {
      const params = {
        Bucket: this.BUCKET,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
        ServerSideEncryption: 'AES256',
        Metadata: {
          'uploaded-by': 'errandify-disputes',
          'upload-time': new Date().toISOString(),
        },
      };

      await s3.putObject(params).promise();

      // Return HTTPS URL
      const region = process.env.AWS_REGION || 'us-east-1';
      return `https://${this.BUCKET}.s3.${region}.amazonaws.com/${key}`;
    } catch (error) {
      console.error('[S3] Upload to S3 error:', error);
      throw error;
    }
  }

  /**
   * List all evidence files for a dispute
   */
  static async listDisputeEvidence(disputeId: number): Promise<string[]> {
    try {
      const params = {
        Bucket: this.BUCKET,
        Prefix: `disputes/${disputeId}/evidence/`,
      };

      const objects = await s3.listObjectsV2(params).promise();
      return (objects.Contents || []).map((obj) => obj.Key || '');
    } catch (error) {
      console.error('[S3] List error:', error);
      throw error;
    }
  }

  /**
   * Get file metadata from S3
   */
  static async getFileMetadata(s3Key: string): Promise<AWS.S3.HeadObjectOutput> {
    try {
      const params = {
        Bucket: this.BUCKET,
        Key: s3Key,
      };

      return await s3.headObject(params).promise();
    } catch (error) {
      console.error('[S3] Metadata error:', error);
      throw error;
    }
  }
}

/**
 * Initialize S3 bucket if it doesn't exist
 */
export async function initializeS3Bucket() {
  try {
    const bucketName = process.env.AWS_S3_BUCKET || 'errandify-disputes';

    // Check if bucket exists
    try {
      await s3.headBucket({ Bucket: bucketName }).promise();
      console.log(`[S3] Bucket ${bucketName} already exists`);
    } catch (err: any) {
      if (err.code === 'NoSuchBucket') {
        // Create bucket
        await s3.createBucket({ Bucket: bucketName }).promise();
        console.log(`[S3] Created bucket ${bucketName}`);

        // Set public access block
        await s3
          .putPublicAccessBlockConfiguration({
            Bucket: bucketName,
            PublicAccessBlockConfiguration: {
              BlockPublicAcls: true,
              IgnorePublicAcls: true,
              BlockPublicPolicy: true,
              RestrictPublicBuckets: true,
            },
          })
          .promise();

        // Set bucket lifecycle policy (delete old files after 90 days)
        await s3
          .putBucketLifecycleConfiguration({
            Bucket: bucketName,
            LifecycleConfiguration: {
              Rules: [
                {
                  Id: 'DeleteOldDisputes',
                  Status: 'Enabled',
                  Prefix: 'disputes/',
                  ExpirationInDays: 90,
                },
              ],
            },
          })
          .promise();

        console.log(`[S3] Configured bucket ${bucketName} with lifecycle policy`);
      } else {
        throw err;
      }
    }
  } catch (error) {
    console.error('[S3] Initialization error:', error);
    throw error;
  }
}
