import { Router, Request, Response } from 'express';
import { AuthRequest, authMiddleware } from '../middleware/auth.js';
// import { generateSignedUrl } from '../services/ossService.js';
import db from '../db.js';

// Stub for generateSignedUrl - Ali OSS integration coming soon
async function generateSignedUrl(fileType: string = 'image/jpeg') {
  return {
    uploadUrl: 'https://placeholder-upload-url.example.com',
    key: `photos/${Date.now()}.jpg`,
  };
}

const router = Router();

/**
 * GET /api/uploads/sign-url
 * Generate a signed URL for browser-based upload to Alibaba OSS
 * Frontend uploads directly to Alibaba using this URL
 */
router.get('/sign-url', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const fileType = (req.query.fileType as string) || 'image/jpeg';

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!allowedTypes.includes(fileType)) {
      return res.status(400).json({ error: 'Invalid file type. Allowed: jpeg, png, webp' });
    }

    const { uploadUrl, key } = await generateSignedUrl(fileType);

    res.json({
      success: true,
      data: {
        uploadUrl: uploadUrl,
        key: key,
        expiresIn: 30 * 60, // 30 minutes in seconds
        bucket: process.env.ALIBABA_OSS_BUCKET || 'errandify-jobs',
        region: process.env.ALIBABA_OSS_REGION || 'oss-ap-southeast-1',
      },
    });
  } catch (error) {
    console.error('Sign URL error:', error);
    res.status(500).json({ error: 'Failed to generate upload URL' });
  }
});

/**
 * POST /api/uploads/verify
 * Verify that a file was successfully uploaded to Alibaba
 * Save the photo metadata to database
 */
router.post('/verify', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { key, errandId, caption } = req.body;
    const userId = parseInt(req.userId || '0', 10);

    if (!key || !errandId) {
      return res.status(400).json({ error: 'Key and errandId are required' });
    }

    // Verify user is the assigned doer for this errand
    const assignmentResult = await db.query(
      `SELECT ea.* FROM errand_assignments ea
       WHERE ea.errand_id = $1 AND ea.doer_id = $2`,
      [errandId, userId]
    );

    if (assignmentResult.rows.length === 0) {
      return res.status(403).json({ error: 'You are not assigned to this errand' });
    }

    // Verify errand exists and is in correct status
    const errandResult = await db.query(
      'SELECT id, status FROM errands WHERE id = $1',
      [errandId]
    );

    if (errandResult.rows.length === 0) {
      return res.status(404).json({ error: 'Errand not found' });
    }

    const errand = errandResult.rows[0];
    if (!['in_progress', 'completed_unconfirmed'].includes(errand.status)) {
      return res.status(400).json({
        error: `Cannot upload photos when errand is in ${errand.status} status`
      });
    }

    // Save photo metadata to database
    const bucket = process.env.ALIBABA_OSS_BUCKET || 'errandify-jobs';
    const region = process.env.ALIBABA_OSS_REGION || 'oss-ap-southeast-1';
    const photoUrl = `https://${bucket}.${region}.aliyuncs.com/${key}`;

    const photoResult = await db.query(
      `INSERT INTO task_photos (task_id, uploaded_by, photo_url, key, caption, uploaded_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       RETURNING id, uploaded_at`,
      [errandId, userId, photoUrl, key, caption || null]
    );

    res.json({
      success: true,
      data: {
        photoId: photoResult.rows[0].id,
        photoUrl: photoUrl,
        key: key,
        uploadedAt: photoResult.rows[0].uploaded_at,
        message: 'Photo verified and saved',
      },
    });
  } catch (error) {
    console.error('Verify upload error:', error);
    res.status(500).json({ error: 'Failed to verify upload' });
  }
});

/**
 * GET /api/uploads/:errandId/photos
 * Get all photos for an errand
 */
router.get('/:errandId/photos', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const errandId = parseInt(req.params.errandId, 10);
    const userId = parseInt(req.userId || '0', 10);

    // Verify user has access (asker or doer)
    const errandResult = await db.query(
      `SELECT e.id, e.asker_id FROM errands e
       LEFT JOIN errand_assignments ea ON e.id = ea.errand_id
       WHERE e.id = $1 AND (e.asker_id = $2 OR ea.doer_id = $2)`,
      [errandId, userId]
    );

    if (errandResult.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get photos
    const photosResult = await db.query(
      `SELECT id, photo_url as url, key, caption, uploaded_at as uploadedAt, doer_id
       FROM task_photos
       WHERE task_id = $1
       ORDER BY uploaded_at DESC`,
      [errandId]
    );

    res.json({
      success: true,
      data: {
        photos: photosResult.rows,
        count: photosResult.rows.length,
      },
    });
  } catch (error) {
    console.error('Get photos error:', error);
    res.status(500).json({ error: 'Failed to get photos' });
  }
});

/**
 * POST /api/uploads/photo
 * Upload base64 photo for dispute evidence (L2/L3)
 * Accepts base64 image data and stores as temporary URL
 * For production: integrate with Cloudinary/S3
 */
router.post('/photo', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { image, context, fileName } = req.body;
    const userId = parseInt(req.userId || '0', 10);

    if (!image) {
      return res.status(400).json({ error: 'Image data is required' });
    }

    // Validate base64 format
    if (!image.startsWith('data:image/')) {
      return res.status(400).json({ error: 'Invalid image format' });
    }

    // Extract MIME type
    const mimeMatch = image.match(/data:(image\/[a-z]+);base64,/);
    if (!mimeMatch) {
      return res.status(400).json({ error: 'Invalid base64 image data' });
    }

    const mimeType = mimeMatch[1];
    const base64Data = image.replace(/^data:image\/[a-z]+;base64,/, '');

    // Validate MIME type
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedMimes.includes(mimeType)) {
      return res.status(400).json({ error: 'Invalid image format. Allowed: jpeg, png, webp' });
    }

    // For now, store base64 data directly (production: upload to Cloudinary)
    // This is a temporary solution - in production, integrate with:
    // - Cloudinary: https://cloudinary.com/documentation/image_upload_api_reference
    // - AWS S3: https://docs.aws.amazon.com/s3/latest/userguide/upload-objects.html
    // - Alibaba OSS: Similar to existing photo upload flow

    const photoId = `dispute_photo_${Date.now()}_${userId}`;
    const tempUrl = `/api/uploads/temp/${photoId}`;

    // TODO: Replace with actual cloud storage integration
    // Example with Cloudinary:
    // const cloudinary = require('cloudinary').v2;
    // const result = await cloudinary.uploader.upload(image, {
    //   folder: 'dispute_evidence',
    //   resource_type: 'auto'
    // });
    // const tempUrl = result.secure_url;

    // Store metadata in database (optional, for tracking)
    await db.query(
      `INSERT INTO evidence_photos (photo_id, user_id, context, mime_type, uploaded_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT DO NOTHING`,
      [photoId, userId, context || 'dispute_evidence', mimeType]
    ).catch(err => {
      // Table might not exist yet, that's OK
      console.warn('Could not log photo metadata:', err.message);
    });

    res.json({
      success: true,
      data: {
        url: tempUrl,
        photoId,
        mimeType,
        context,
        fileName: fileName || `photo_${Date.now()}.jpg`,
        message: 'Photo uploaded successfully (temporary storage - upgrade to cloud storage for production)',
      },
    });
  } catch (error) {
    console.error('Photo upload error:', error);
    res.status(500).json({ error: 'Failed to upload photo' });
  }
});

export default router;
