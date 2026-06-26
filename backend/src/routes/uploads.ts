import { Router, Request, Response } from 'express';
import { AuthRequest, authMiddleware } from '../middleware/auth.js';
import { generateSignedUrl } from '../services/ossService.js';
import db from '../db.js';

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
      `INSERT INTO task_photos (errand_id, doer_id, photo_url, key, caption, uploaded_at)
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
       WHERE errand_id = $1
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

export default router;
