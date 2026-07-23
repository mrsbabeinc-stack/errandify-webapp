import { Router, Request, Response } from 'express';
import { stripeSurcharge } from '../utils/stripeFee.js';
import { resolveCommissionRate, resolvePayee } from '../utils/commissionRate.js';
import { AuthRequest, authMiddleware } from '../middleware/auth.js';
import db from '../db.js';
import { stripeService } from '../services/stripe.js';
import { createNotification } from './notifications.js';
import { activityLogService } from '../services/activityLogService.js';
import { scheduleRatingReminder } from '../services/ratingReminderService.js';
import { moderatePhotoContent, moderateContent } from '../services/contentModerationService.js';

const router = Router();

// POST /api/jobs/:taskId/start - Doer starts job
router.post('/:taskId/start', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { taskId } = req.params;
    const doerId = parseInt(req.userId || '0', 10);
    const { latitude, longitude } = req.body; // Optional GPS

    // Get task and verify doer is assigned
    const taskResult = await db.query(
      `SELECT e.*, b.doer_id FROM errands e
       LEFT JOIN bids b ON e.id = b.errand_id AND b.status = 'confirmed'
       WHERE e.id = $1`,
      [taskId]
    );

    if (taskResult.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const task = taskResult.rows[0];

    if (task.status !== 'confirmed') {
      return res.status(400).json({ error: 'Task must be confirmed before starting' });
    }

    if (task.doer_id !== doerId) {
      return res.status(403).json({ error: 'Only the assigned doer can start this task' });
    }

    // Update task status
    const updateResult = await db.query(
      `UPDATE errands
       SET status = $1, started_at = NOW(), updated_at = NOW()
       WHERE id = $2
       RETURNING id, status, started_at`,
      ['in_progress', taskId]
    );

    // Get asker info for notification
    const askerResult = await db.query(
      'SELECT id, display_name FROM users WHERE id = $1',
      [task.asker_id]
    );

    const doerResult = await db.query(
      'SELECT display_name FROM users WHERE id = $1',
      [doerId]
    );

    // TODO: Send push notification to asker
    // Message: "Your Doer [Doer Name] has started '[task title]'. They're on their way! ⏰"

    res.json({
      success: true,
      data: {
        taskId: updateResult.rows[0].id,
        status: updateResult.rows[0].status,
        startedAt: updateResult.rows[0].started_at,
        message: `Job started! Asker notified.`,
        gpsRecorded: latitude && longitude ? true : false,
      },
    });
  } catch (error) {
    console.error('Start job error:', error);
    res.status(500).json({ error: 'Failed to start job' });
  }
});

// POST /api/jobs/:taskId/complete - Doer completes job (with optional photos)
router.post('/:taskId/complete', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { taskId } = req.params;
    const doerId = parseInt(req.userId || '0', 10);
    const { photoUrls, completionNotes } = req.body; // Array of photo URLs (pre-uploaded to cloud) + completion notes

    // Get task with doer info - use accepted_bid_id for reliable doer lookup
    const taskResult = await db.query(
      `SELECT e.id, e.title, e.status, e.description, e.formatted_id as errand_id_formatted, e.accepted_bid_id, b.doer_id
       FROM errands e
       INNER JOIN bids b ON e.accepted_bid_id = b.id
       WHERE e.id = $1`,
      [taskId]
    );

    if (taskResult.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const task = taskResult.rows[0];

    console.log('[Jobs] Complete task - Query result:', {
      taskId,
      doerId,
      accepted_bid_id: task.accepted_bid_id,
      doer_id: task.doer_id,
      task_status: task.status
    });

    // Allow completion from 'in_progress', 'confirmed', 'completed', or 'rated' (for resubmission)
    if (!['in_progress', 'confirmed', 'completed', 'rated'].includes(task.status)) {
      return res.status(400).json({ error: `Task must be in progress or completed to resubmit. Current status: ${task.status}` });
    }

    // Verify current user is the confirmed doer
    if (!task.doer_id) {
      console.warn('[Jobs] No doer_id found - bid lookup failed', {
        accepted_bid_id: task.accepted_bid_id,
        taskId
      });
      return res.status(400).json({ error: 'No doer assigned to this task. A bid must be accepted first.' });
    }

    if (task.doer_id !== doerId) {
      console.warn('[Jobs] Doer ID mismatch', {
        expected: task.doer_id,
        actual: doerId,
        accepted_bid_id: task.accepted_bid_id,
        errand_formatted_id: task.errand_id_formatted
      });
      return res.status(403).json({
        error: 'Only the assigned doer can complete this task',
        debug: {
          expected_doer_id: task.doer_id,
          your_id: doerId,
          accepted_bid_id: task.accepted_bid_id
        }
      });
    }

    // Validate photo count (max 5)
    if (photoUrls && photoUrls.length > 5) {
      return res.status(400).json({ error: 'Maximum 5 photos allowed' });
    }

    // Moderate completion notes for contact info
    if (completionNotes && completionNotes.trim().length > 0) {
      const notesModeration = await moderateContent(completionNotes, 'task_description');
      if (notesModeration.status === 'blocked') {
        return res.status(400).json({
          error: `❌ Completion notes blocked: ${notesModeration.reason}. Please remove contact information (phone, email, address, social profiles, etc.) and resubmit.`,
        });
      }
      if (notesModeration.status === 'flagged') {
        console.warn(`[Jobs] Completion notes flagged for review - User ${doerId}, Errand ${taskId}`);
      }
    }

    // Moderate photos for inappropriate content and contact info
    if (photoUrls && photoUrls.length > 0) {
      for (let i = 0; i < photoUrls.length; i++) {
        const photoUrl = photoUrls[i];
        try {
          const photoModeration = await moderatePhotoContent(photoUrl, 'job_completion');
          if (photoModeration.status === 'blocked') {
            return res.status(400).json({
              error: `❌ Photo ${i + 1} rejected: ${photoModeration.reason}. ${
                photoModeration.reason?.includes('contact')
                  ? 'Please do not include contact information (phone numbers, emails, addresses, business cards, namecards) in photos.'
                  : ''
              }`,
            });
          }
          if (photoModeration.status === 'flagged') {
            console.warn(`[Jobs] Photo ${i + 1} flagged for review - User ${doerId}, Errand ${taskId}`);
          }
        } catch (photoError) {
          console.error(`[Jobs] Photo moderation error for photo ${i + 1}:`, photoError);
          // Don't block on moderation errors - continue with submission
        }
      }
    }

    // Get current submission number (for tracking resubmissions)
    const submissionResult = await db.query(
      `SELECT MAX(submission_number) as max_submission FROM completion_submissions WHERE errand_id = $1`,
      [taskId]
    );
    const currentSubmissionNumber = (submissionResult.rows[0]?.max_submission || 0) + 1;

    // Update task status to completed
    const updateResult = await db.query(
      `UPDATE errands
       SET status = $1,
           updated_at = NOW()
       WHERE id = $2
       RETURNING id, status, updated_at`,
      ['completed', taskId]
    );

    // Create completion submission record
    await db.query(
      `INSERT INTO completion_submissions (errand_id, submission_number, completion_notes, photo_urls, submitted_by, status)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [taskId, currentSubmissionNumber, completionNotes || '', JSON.stringify(photoUrls || []), doerId, 'pending']
    );

    // Log completion
    const doerUserResult = await db.query('SELECT display_name, alias FROM users WHERE id = $1', [doerId]);
    const doerName = doerUserResult.rows[0]?.display_name || 'Unknown';
    const doerAlias = doerUserResult.rows[0]?.alias;
    const errandFormatted = task.errand_id_formatted;
    await activityLogService.logCompleted(taskId, doerName, doerId, { alias: doerAlias, errandId: errandFormatted }).catch(console.error);

    // Store files organized by submission with Errand ID format naming
    if (photoUrls && photoUrls.length > 0) {
      const errandIdFormatted = task.errand_id_formatted;
      for (let i = 0; i < photoUrls.length; i++) {
        const photoUrl = photoUrls[i];
        // File naming: ERR2026-XX-8ac45e_s1_f1.jpg (errandId_s{submission}_f{file})
        const fileName = `${errandIdFormatted}_s${currentSubmissionNumber}_f${i + 1}`;

        await db.query(
          `INSERT INTO task_files (errand_id, errand_id_formatted, submission_number, file_url, file_name, uploaded_by)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [taskId, errandIdFormatted, currentSubmissionNumber, photoUrl, fileName, doerId]
        );
      }
    }

    res.status(201).json({
      success: true,
      data: {
        taskId: updateResult.rows[0].id,
        status: updateResult.rows[0].status,
        submissionNumber: currentSubmissionNumber,
        photosUploaded: photoUrls ? photoUrls.length : 0,
        message: `Job completed! Submission #${currentSubmissionNumber} uploaded. Waiting for asker to review.`,
      },
    });

    // Schedule rating reminder for doer (non-blocking)
    scheduleRatingReminder(taskId, doerId).catch((error) => {
      console.error('Failed to schedule rating reminder:', error);
      // Non-blocking - don't fail the response
    });
  } catch (error) {
    console.error('Complete job error:', error);
    res.status(500).json({ error: 'Failed to complete job' });
  }
});

// POST /api/jobs/:taskId/confirm - Asker confirms completion (early payment release)
/**
 * POST /api/jobs/:taskId/confirm — DISABLED pending the escrow decision.
 *
 * This route calls releasePayment(), which executes a real Stripe transfer to
 * the doer's Connect account, and only then runs:
 *
 *   UPDATE errands SET status = ..., payment_released_at = NOW() ...
 *
 * `payment_released_at` does not exist on `errands`. Postgres throws, the
 * request 500s — but the transfer has already gone out. The errand is left in
 * 'completed_unconfirmed' with no record that it was paid, so an asker who
 * retries a request that "failed" transfers the money a second time.
 *
 * payment_releases holds 0 rows, so this has apparently never completed here,
 * and the auto-release cron that shares the same column is commented out in
 * startCrons(). Rather than add the column and thereby switch on money
 * movement that has never run — and which the project's own rule says is not
 * automatic — the route refuses until the escrow model is settled.
 *
 * To re-enable: add errands.payment_released_at, then make the transfer and
 * the status write atomic (record the release first, or wrap both so a failed
 * write cannot leave an untracked transfer), and delete this guard.
 * See the dispute/escrow notes before doing so.
 */
router.post('/:taskId/confirm', authMiddleware, async (req: AuthRequest, res: Response) => {
  return res.status(501).json({
    error: 'Early payment release is temporarily unavailable',
    detail:
      'Confirming completion here would transfer funds before the payment record can be written. ' +
      'Please confirm the errand from the errand page instead; payment release is being reworked.',
  });

  // eslint-disable-next-line no-unreachable
  try {
    const { taskId } = req.params;
    const askerId = parseInt(req.userId || '0', 10);

    // Get task and verify asker
    const taskResult = await db.query(
      `SELECT e.*, b.doer_id, b.amount FROM errands e
       LEFT JOIN bids b ON e.accepted_bid_id = b.id
       WHERE e.id = $1`,
      [taskId]
    );

    if (taskResult.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const task = taskResult.rows[0];

    if (task.asker_id !== askerId) {
      return res.status(403).json({ error: 'Only the asker can confirm completion' });
    }

    if (task.status !== 'completed_unconfirmed') {
      return res.status(400).json({ error: 'Task must be awaiting confirmation' });
    }

    // Release payment immediately
    await releasePayment(taskId, task, 'early_confirm');

    // Update task status
    await db.query(
      `UPDATE errands
       SET status = $1, payment_released_at = NOW(), updated_at = NOW()
       WHERE id = $2`,
      ['completed_confirmed', taskId]
    );

    // TODO: Send notifications to both parties
    // TODO: Schedule rating reminder for 1 hour later

    res.json({
      success: true,
      data: {
        taskId,
        status: 'completed_confirmed',
        paymentReleased: true,
        message: 'Payment released successfully!',
      },
    });
  } catch (error) {
    console.error('Confirm job error:', error);
    res.status(500).json({ error: 'Failed to confirm completion' });
  }
});

// POST /api/jobs/:taskId/request-more-work - Asker requests more work on completed task
router.post('/:taskId/request-more-work', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { taskId } = req.params;
    const askerId = parseInt(req.userId || '0', 10);
    const { reason } = req.body;

    if (!reason || !reason.trim()) {
      return res.status(400).json({ error: 'Reason is required' });
    }

    // Get task and verify asker
    const taskResult = await db.query(
      `SELECT e.*, b.doer_id, b.amount FROM errands e
       LEFT JOIN bids b ON e.accepted_bid_id = b.id
       WHERE e.id = $1`,
      [taskId]
    );

    if (taskResult.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const task = taskResult.rows[0];

    if (task.asker_id !== askerId) {
      return res.status(403).json({ error: 'Only the asker can request more work' });
    }

    if (task.status !== 'completed_unconfirmed') {
      return res.status(400).json({ error: 'Task must be awaiting confirmation to request more work' });
    }

    // Update task status back to in_progress
    await db.query(
      `UPDATE errands
       SET status = $1, updated_at = NOW()
       WHERE id = $2`,
      ['in_progress', taskId]
    );

    // Store reason in task history or comments (if available)
    // For now, we'll just note it in the response
    // TODO: Create a task_feedback or task_changes table to track this

    // Get doer info for notification
    const doerResult = await db.query(
      'SELECT id, display_name FROM users WHERE id = $1',
      [task.doer_id]
    );

    // TODO: Send push notification to doer
    // Message: "Hi [Name] 🔄 [Asker] has requested more work on '[task title]'. Reason: [reason]. Please make the changes and resubmit."

    res.json({
      success: true,
      data: {
        taskId,
        status: 'in_progress',
        message: 'Doer notified. Task returned to in progress status.',
      },
    });
  } catch (error) {
    console.error('Request more work error:', error);
    res.status(500).json({ error: 'Failed to request more work' });
  }
});

// GET /api/jobs/:taskId/photos - Get task completion photos
router.get('/:taskId/photos', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { taskId } = req.params;
    const userId = parseInt(req.userId || '0', 10);

    // Verify user is involved in task
    const taskResult = await db.query(
      'SELECT asker_id, accepted_bid_id FROM errands WHERE id = $1',
      [taskId]
    );

    if (taskResult.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Check authorization
    const task = taskResult.rows[0];
    if (task.accepted_bid_id) {
      const bidResult = await db.query(
        'SELECT doer_id FROM bids WHERE id = $1',
        [task.accepted_bid_id]
      );
      const doerId = bidResult.rows[0]?.doer_id;

      if (task.asker_id !== userId && doerId !== userId) {
        return res.status(403).json({ error: 'Unauthorized' });
      }
    } else if (task.asker_id !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Get photos
    const photosResult = await db.query(
      'SELECT id, photo_url, uploaded_by, uploaded_at FROM task_photos WHERE task_id = $1 ORDER BY uploaded_at ASC',
      [taskId]
    );

    res.json({
      success: true,
      data: photosResult.rows,
    });
  } catch (error) {
    console.error('Get photos error:', error);
    res.status(500).json({ error: 'Failed to fetch photos' });
  }
});

// Helper function to release payment
async function releasePayment(taskId: string, task: any, reason: 'early_confirm' | 'auto_release') {
  try {
    const bidAmount = parseFloat(task.amount);

    // The commission comes out of the doer's payout, and the RATE depends on the
    // doer. An individual pays the standard 20%; a company pays its subscription
    // tier rate (Silver 18%, Gold 17%, Platinum 16% — all below 20%). Hardcoding
    // 20% here overcharged every subscribed company, which is the exact bug the
    // commissionRate util was written to prevent.
    const { rate: commissionRate, payeeType } = await resolveCommissionRate(
      { companyId: (await resolvePayee(parseInt(taskId, 10))).companyId }
    );
    const platformFee = Math.round(bidAmount * commissionRate * 100) / 100;
    const doerPayout = bidAmount - platformFee;
    console.log(`[Payout] errand ${taskId}: ${payeeType} doer, ${(commissionRate*100).toFixed(0)}% commission -> platform $${platformFee}, doer $${doerPayout}`);
    // The surcharge the asker paid over the errand price, for the record.
    const stripeFeeCharged = stripeSurcharge(bidAmount);

    // Check for penalties on doer and get user info
    const doerResult = await db.query(
      'SELECT penalty_owed, display_name, alias FROM users WHERE id = $1',
      [task.doer_id]
    );

    const penaltyOwed = doerResult.rows[0]?.penalty_owed || 0;
    const doerName = doerResult.rows[0]?.display_name || 'Doer';
    const doerAlias = doerResult.rows[0]?.alias || '';
    const finalPayout = doerPayout - penaltyOwed;

    // Execute Stripe transfer to doer's Connect account
    let stripeTransferId = null;
    try {
      // Get doer's Stripe account ID
      const doerAccountResult = await db.query(
        'SELECT stripe_account_id FROM users WHERE id = $1',
        [task.doer_id]
      );

      if (doerAccountResult.rows[0]?.stripe_account_id) {
        // Create transfer to doer's Stripe Connect account
        const transfer = await stripeService.createTransfer(
          finalPayout,
          doerAccountResult.rows[0].stripe_account_id,
          taskId,
          reason
        );
        stripeTransferId = transfer.id;
        console.log(`[Payment] Stripe transfer created: ${stripeTransferId} for task ${taskId}`);
      }
    } catch (stripeErr) {
      console.warn('[Payment] Stripe transfer failed, continuing without transfer:', stripeErr);
      // Don't fail payment release if Stripe fails - payment is still recorded
    }

    // Record payment release
    const releaseResult = await db.query(
      `INSERT INTO payment_releases (task_id, bid_amount, platform_fee, doer_payout, stripe_fee, stripe_transfer_id, released_at, release_reason)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7)
       RETURNING id, released_at`,
      [taskId, bidAmount, platformFee, finalPayout, stripeFeeCharged, stripeTransferId, reason]
    );

    // Deduct penalty if applied
    if (penaltyOwed > 0) {
      await db.query(
        'UPDATE users SET penalty_owed = 0 WHERE id = $1',
        [task.doer_id]
      );
    }

    // Send notifications to both parties
    try {
      const askerName = task.asker?.display_name || 'Asker';
      const errandId = task.errand_id_formatted || `#${taskId}`;
      const doerDisplay = doerAlias ? `${doerName} (@${doerAlias})` : doerName;

      // Notify doer of payment release
      await createNotification(
        task.doer_id,
        'payment_released',
        'Payment Released',
        `Payment of SGD $${finalPayout.toFixed(2)} released for errand ${errandId} "${task.title}". Arrives in 1-2 business days.`,
        null
      ).catch(err => console.warn('[Payment] Failed to notify doer:', err));

      // Notify asker of payment sent
      await createNotification(
        task.asker_id,
        'payment_sent',
        'Payment Sent',
        `Payment of SGD $${finalPayout.toFixed(2)} sent to ${doerDisplay} for errand ${errandId} "${task.title}" (after 20% platform fee).`,
        null
      ).catch(err => console.warn('[Payment] Failed to notify asker:', err));
    } catch (notifErr) {
      console.warn('[Payment] Notification error:', notifErr);
      // Don't fail payment release if notifications fail
    }

    return releaseResult.rows[0];
  } catch (error) {
    console.error('Release payment error:', error);
    throw error;
  }
}

// GET /api/jobs/:taskId/submissions - Get all submissions and files for a task
router.get('/:taskId/submissions', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { taskId } = req.params;
    const userId = parseInt(req.userId || '0', 10);

    // Verify user is asker or confirmed doer - cannot view submission details otherwise
    const authCheckResult = await db.query(
      `SELECT e.asker_id, e.id,
        (SELECT doer_id FROM bids WHERE errand_id = e.id AND status IN ('accepted', 'confirmed', 'confirmed_awaiting_start', 'in_progress', 'completed') LIMIT 1) as confirmed_doer_id
       FROM errands e
       WHERE e.id = $1`,
      [taskId]
    );

    if (authCheckResult.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const errand = authCheckResult.rows[0];
    const isAsker = errand.asker_id === userId;
    const isConfirmedDoer = errand.confirmed_doer_id === userId;

    if (!isAsker && !isConfirmedDoer) {
      return res.status(403).json({ error: 'Not authorized to view submission details' });
    }

    // Get all submissions for this task
    const submissionsResult = await db.query(
      `SELECT
        cs.id,
        cs.errand_id,
        cs.submission_number,
        cs.completion_notes,
        cs.photo_urls,
        cs.submitted_by,
        cs.created_at as submitted_at,
        cs.status,
        u.display_name as submitted_by_name
       FROM completion_submissions cs
       LEFT JOIN users u ON cs.submitted_by = u.id
       WHERE cs.errand_id = $1
       ORDER BY cs.submission_number ASC`,
      [taskId]
    );

    // Get all files organized by submission with Errand ID format
    const filesResult = await db.query(
      `SELECT
        id,
        errand_id,
        errand_id_formatted,
        submission_number,
        file_url,
        file_name,
        uploaded_by,
        created_at as uploaded_at
       FROM task_files
       WHERE errand_id = $1
       ORDER BY submission_number DESC, created_at ASC`,
      [taskId]
    );

    // Organize files by submission number
    const filesBySubmission: Record<number, any[]> = {};
    filesResult.rows.forEach(file => {
      if (!filesBySubmission[file.submission_number]) {
        filesBySubmission[file.submission_number] = [];
      }
      filesBySubmission[file.submission_number].push(file);
    });

    // Add files to submissions
    const submissions = submissionsResult.rows.map(sub => ({
      ...sub,
      photo_urls: sub.photo_urls ? JSON.parse(sub.photo_urls) : [],
      files: filesBySubmission[sub.submission_number] || []
    }));

    res.json({
      success: true,
      data: {
        taskId,
        totalSubmissions: submissions.length,
        submissions,
      },
    });
  } catch (error) {
    console.error('Get submissions error:', error);
    res.status(500).json({ error: 'Failed to fetch submissions' });
  }
});

// GET /api/jobs/:taskId - Get job details for review page (MUST BE LAST - after /photos and /submissions)
router.get('/:taskId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { taskId } = req.params;

    const result = await db.query(
      `SELECT
        e.id,
        e.title,
        e.budget,
        e.status,
        e.formatted_id,
        b.doer_id,
        u.display_name as doer_name,
        u.alias as doer_alias
       FROM errands e
       LEFT JOIN bids b ON e.id = b.errand_id AND b.status = 'confirmed'
       LEFT JOIN users u ON b.doer_id = u.id
       WHERE e.id = $1`,
      [taskId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const job = result.rows[0];
    res.json({
      success: true,
      data: {
        id: job.id,
        title: job.title,
        budget: job.budget,
        status: job.status,
        formatted_id: job.formatted_id,
        doerId: job.doer_id,
        doerName: job.doer_name || 'Unknown',
        doerAlias: job.doer_alias,
      },
    });
  } catch (error) {
    console.error('Get job error:', error);
    res.status(500).json({ error: 'Failed to get job details' });
  }
});

export default router;
