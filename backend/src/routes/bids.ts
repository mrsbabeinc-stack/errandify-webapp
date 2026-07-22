import { Router, Request, Response } from 'express';
import { AuthRequest, authMiddleware } from '../middleware/auth.js';
import db from '../db.js';
import { getRestrictionReason, needsDeclaration } from '../services/categoryRestrictions.js';
import axios from 'axios';
import { getCategoryCode } from '../utils/categoryCodes.js';
import { activityLogService } from '../services/activityLogService.js';
import * as contentMod from '../modules/content-moderation.js';
import { notifyUser } from '../socket.js';
import postalCodeLookup from '../services/postalCodeToAreaLookup.js';
import { resolveMyCompany } from '../utils/companyRole.js';
import { checkPayoutReadiness } from '../utils/payoutReadiness.js';
import { recordModerationEvent, decideAction, blockedMessage } from '../utils/moderationLog.js';

const router = Router();

// Category code mapping for OFFERID

// Generate unique OFFERID: OF[YY][CATEGORY][4-RANDOM-CHARS]
function generateOfferId(category: string): string {
  const year = new Date().getFullYear().toString().slice(-2); // 26
  const categoryCode = getCategoryCode(category);
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `OF${year}${categoryCode}-${code}`.toUpperCase();
}

// POST /api/bids - Submit a bid (single errand or multiple sessions for recurring tasks)
router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { task_id, amount, note, sessions } = req.body;
    const doerId = parseInt(req.userId || '0', 10);

    if (!task_id || !amount) {
      return res.status(400).json({ error: 'Let us know your offer amount so the neighbour knows what to expect.' });
    }

    // sessions is optional array of instance numbers for recurring tasks
    const selectedSessions = Array.isArray(sessions) ? sessions.map(s => parseInt(s, 10)) : [];

    // Validate minimum bid amount
    const bidAmount = parseFloat(amount);
    if (bidAmount < 8) {
      return res.status(400).json({ error: 'Offers start at SGD 8. This helps our community stay healthy.' });
    }

    // Check if errand exists and is open
    const errandResult = await db.query(
      'SELECT id, status, asker_id, category FROM errands WHERE id = $1',
      [task_id]
    );

    if (errandResult.rows.length === 0) {
      return res.status(404).json({ error: 'Looks like this errand got taken care of or the neighbour changed their mind.' });
    }

    const errand = errandResult.rows[0];

    if (errand.status !== 'open' && errand.status !== 'confirmed') {
      return res.status(400).json({ error: 'This errand has moved on. But there are plenty more neighbours who need help!' });
    }

    // Prevent asker from bidding on their own errand
    if (errand.asker_id === doerId) {
      return res.status(403).json({ error: 'You posted this one yourself. Gotta help other neighbours instead!' });
    }

    // A restricted category is closed to this doer, not merely hidden from
    // their feed. Filtering the browse list is what they see; this is what
    // actually stops them — a direct link, a stale page or a crafted request
    // all arrive here, and none of them should get past it.
    // Also skipped for company offers, for the same reason and with the same
    // relocation to allocation time.
    const restrictionReason = req.body.actAsCompany
      ? null
      : await getRestrictionReason(doerId, errand.category);
    if (restrictionReason) {
      console.log('[Bids] Blocked restricted-category offer from user', doerId, 'on', errand.category);
      return res.status(403).json({ error: restrictionReason });
    }

    // Never asked is not the same as nothing to declare, and both used to look
    // identical here. This one is answerable rather than final, so it carries a
    // code the client can act on by opening the declaration instead of showing
    // a dead end.
    //
    // Skipped when offering on a company's behalf, because the person clicking
    // is the owner or manager and is NOT the person who will do the work — a
    // staff member is allocated later. Screening the wrong person is worse than
    // not screening: it blocks a manager who will never attend, while the
    // eventual doer walks through unchecked.
    //
    // The check does not disappear, it MOVES to allocation, where the actual
    // doer is finally known. See POST /companies/:companyId/errands/:errandId/
    // allocate. If that check is ever removed, this bypass becomes a hole big
    // enough to drive the whole screening scheme through: someone barred from
    // childcare as an individual could join a company and be allocated
    // childcare work.
    if (!req.body.actAsCompany && await needsDeclaration(doerId, errand.category)) {
      return res.status(403).json({
        code: 'DECLARATION_REQUIRED',
        category: errand.category,
        error:
          'This kind of errand needs a short declaration first — one question for most people. ' +
          'It only has to be done once.',
      });
    }

    // Moderate offer note content if provided
    if (note) {
      try {
        const moderationResult = await contentMod.checkContentWithQwen('', '', note);
        const category = moderationResult.flags?.[0] || null;
        const action = decideAction({
          layer: 'ai',
          isSafe: moderationResult.is_safe,
          category,
          flags: moderationResult.flags,
        });

        const eventId = await recordModerationEvent({
          userId: doerId,
          errandId: parseInt(task_id, 10) || null,
          surface: 'offer_note',
          layer: 'ai',
          decision: action,
          category,
          flags: moderationResult.flags,
          confidence: moderationResult.confidence ?? null,
          content: note,
        });

        // Serious categories still block. A note the model merely dislikes now
        // goes through and gets looked at, rather than being refused outright.
        if (action === 'blocked') {
          return res.status(400).json({
            ...blockedMessage('Please keep your offer note friendly and respectful.', eventId),
            message: "We want to keep Errandify a safe and welcoming community. Tell the neighbour why you're a good fit instead.",
          });
        }
      } catch (modError) {
        console.error('[Bids] Content moderation error:', modError);
        // Don't block the bid if moderation fails, just log it
      }
    }

    // Get doer info (use alias for notifications)
    const doerResult = await db.query(
      'SELECT display_name, alias FROM users WHERE id = $1',
      [doerId]
    );
    const doerName = doerResult.rows[0]?.display_name || 'Anonymous';
    const doerAlias = doerResult.rows[0]?.alias || doerName;

    // Check if bid already exists (update or insert)
    const existingBidResult = await db.query(
      'SELECT id, status FROM bids WHERE errand_id = $1 AND doer_id = $2',
      [task_id, doerId]
    );

    let bid;
    if (existingBidResult.rows.length > 0) {
      const existingBid = existingBidResult.rows[0];

      // Prevent updating a rejected bid
      if (existingBid.status === 'rejected') {
        return res.status(403).json({
          error: 'This neighbour picked someone else. No worries, there are more errands to help with!',
          message: 'Your offer was not selected for this errand. You cannot submit another offer for this errand.'
        });
      }

      // Prevent updating a closed bid (another doer confirmed the job)
      if (existingBid.status === 'closed') {
        return res.status(403).json({
          error: 'This errand already started with another neighbour. Good luck next time!',
          message: 'The job has started with another doer. Your offer is closed.'
        });
      }

      // Prevent updating a cancelled bid (job was cancelled)
      if (existingBid.status === 'cancelled') {
        return res.status(403).json({
          error: 'This errand was cancelled. The neighbour no longer needs help.',
          message: 'The job has been cancelled. Your offer is no longer valid.'
        });
      }

      // Prevent updating a confirmed bid (job already confirmed)
      if (existingBid.status === 'confirmed') {
        return res.status(403).json({
          error: 'Great news, your offer was accepted. Head to your tasks to get started!',
          message: 'This offer is confirmed and the job has started. You cannot modify it anymore.'
        });
      }

      // Update existing bid (only if still pending or accepted)
      const bidId = existingBid.id;
      await db.query(
        'UPDATE bids SET amount = $1, note = $2, updated_at = NOW() WHERE id = $3',
        [parseFloat(amount), note || null, bidId]
      );
      const updated = await db.query('SELECT * FROM bids WHERE id = $1', [bidId]);
      bid = updated.rows[0];
    } else {
      // Check if doer has a rejected bid for this errand
      const rejectedBidResult = await db.query(
        'SELECT id FROM bids WHERE errand_id = $1 AND doer_id = $2 AND status = $3',
        [task_id, doerId, 'rejected']
      );

      if (rejectedBidResult.rows.length > 0) {
        return res.status(403).json({
          error: 'You already offered to help with this one. Wait to see if the neighbour picks you!',
          message: 'Your previous offer was not selected. You cannot submit another offer for this errand.'
        });
      }

      // Get errand category for OFFERID
      const errandCategoryResult = await db.query(
        'SELECT title, errand_id, category FROM errands WHERE id = $1',
        [task_id]
      );
      const errandTitle = errandCategoryResult.rows[0]?.title || 'Your errand';
      const formattedErrandId = errandCategoryResult.rows[0]?.errand_id || `ER26-${task_id}`;
      const errandCategory = errandCategoryResult.rows[0]?.category || 'admin-business';

      // Generate unique OFFERID
      const offerId = generateOfferId(errandCategory);

      // If this offer is being made on a company's behalf, attribute it to the
      // COMPANY — it becomes the counterparty the asker sees, and the party that
      // gets paid. Only owner/manager of a verified company may do this; anyone
      // else offers personally (company_id stays null).
      let companyId: number | null = null;
      if (req.body.actAsCompany) {
        const m = await resolveMyCompany(doerId);
        if (m && m.canActForCompany && m.certified) {
          companyId = m.companyId;
        } else if (m && !m.certified) {
          return res.status(403).json({
            error: 'Verify your company before making offers on its behalf.',
            reason: 'not_verified',
          });
        } else if (m && !m.canActForCompany) {
          return res.status(403).json({
            error: 'Only the company owner or manager can make offers for the company.',
            reason: 'wrong_role',
          });
        }
      }

      // Nobody should do the work and only then discover we cannot pay them.
      // Checked here, at the offer, rather than at settlement.
      const payout = await checkPayoutReadiness({ userId: doerId, companyId });
      if (!payout.ready) {
        return res.status(403).json({
          error: payout.message,
          title: payout.title,
          reason: 'payout_not_ready',
          payoutBlock: payout,
        });
      }

      // Create new bid with offer_id
      const result = await db.query(
        `INSERT INTO bids (errand_id, doer_id, amount, note, status, offer_id, company_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [task_id, doerId, parseFloat(amount), note || null, 'pending', offerId, companyId]
      );
      bid = result.rows[0];

      // Send notification to asker about new bid with OFFERID in title (showing doer alias)
      try {
        await db.query(
          `INSERT INTO notifications (user_id, type, title, message, related_errand_id, created_at, is_read)
           VALUES ($1, $2, $3, $4, $5, NOW(), false)`,
          [
            errand.asker_id,
            'bid_placed',
            `New Offer Placed • ${offerId}`,
            `${formattedErrandId}: ${doerAlias} has placed an offer for $\${parseFloat(amount)}`,
            task_id,
          ]
        );
      } catch (notifErr) {
        console.warn('[Bids] Failed to send notification:', notifErr);
        // Don't fail the entire request if notification fails
      }
    }

    // If this is a recurring task bid with selected sessions, map bid to sessions
    if (selectedSessions.length > 0) {
      try {
        // Get session IDs for selected instance numbers
        const sessionResult = await db.query(
          `SELECT id, instance_number FROM recurring_sessions
           WHERE parent_errand_id = $1 AND instance_number = ANY($2::int[])`,
          [task_id, selectedSessions]
        );

        // Insert bid-session mappings
        for (const session of sessionResult.rows) {
          await db.query(
            'INSERT INTO bid_sessions (bid_id, session_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [bid.id, session.id]
          );
        }

        console.log(`[Bids] Mapped bid ${bid.id} to ${sessionResult.rows.length} sessions for errand ${task_id}`);
      } catch (sessionErr) {
        console.error('[Bids] Failed to map bid to sessions:', sessionErr);
        // Don't fail the bid creation if session mapping fails
      }
    }

    // Log activity: Bid placed
    // Note: doerAlias is already set from lines 100-105 above

    await activityLogService.logBidPlaced(task_id, doerName, doerId, parseFloat(amount), bid.offer_id, doerAlias);

    res.status(201).json({
      success: true,
      data: {
        id: bid.id,
        taskId: task_id,
        doerId: doerId,
        doerName: doerName,
        amount: bid.amount,
        note: bid.note,
        status: bid.status,
        selectedSessions: selectedSessions.length > 0 ? selectedSessions : undefined,
        createdAt: bid.created_at,
      },
    });
  } catch (error) {
    console.error('[Bids] Error creating bid:', error);
    res.status(500).json({ error: 'Oops, we had a hiccup saving your offer. Give it another go!' });
  }
});

// GET /api/bids/task/:taskId - Get all bids for a task
router.get('/task/:taskId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { taskId } = req.params;
    const parsedTaskId = parseInt(taskId, 10);
    const currentUserId = parseInt(req.userId || '0', 10);

    console.log('[Bids GET] Fetching bids for task:', parsedTaskId, 'User:', currentUserId);

    // Verify user is the asker of this task
    const errandResult = await db.query(
      'SELECT asker_id FROM errands WHERE id = $1',
      [parsedTaskId]
    );

    if (errandResult.rows.length === 0) {
      return res.status(404).json({ error: 'Looks like this errand got taken care of or the neighbour changed their mind.' });
    }

    if (errandResult.rows[0].asker_id !== currentUserId) {
      console.log('[Bids GET] Access denied. Errand asker:', errandResult.rows[0].asker_id, 'Current user:', currentUserId);
      return res.status(403).json({ error: 'Only the neighbour who asked can see the offers.' });
    }

    // Get bids from database
    const bidsResult = await db.query(
      `SELECT b.id, b.errand_id as taskId, b.doer_id as doerId, u.display_name as doerName,
              u.alias as doerAlias, b.amount, b.note, b.status, b.created_at as createdAt,
              b.offer_id as offerId, u.profile_image_url as doerAvatar
       FROM bids b
       JOIN users u ON b.doer_id = u.id
       WHERE b.errand_id = $1
       ORDER BY b.created_at DESC`,
      [parsedTaskId]
    );

    console.log('[Bids GET] Found', bidsResult.rows.length, 'bids');
    res.json({ success: true, data: bidsResult.rows });
  } catch (error) {
    console.error('[Bids] Error fetching bids:', error);
    res.status(500).json({ error: 'We are having trouble loading the offers. Just refresh and we will sort it!' });
  }
});

// POST /api/bids/:id/accept - Accept a bid
router.post('/:id/accept', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const currentUserId = parseInt(req.userId || '0', 10);

    // Get bid and verify errand ownership
    const bidResult = await db.query(
      `SELECT b.*, e.asker_id FROM bids b
       JOIN errands e ON b.errand_id = e.id
       WHERE b.id = $1`,
      [id]
    );

    if (bidResult.rows.length === 0) {
      return res.status(404).json({ error: 'This offer is no longer around. Looks like things moved on.' });
    }

    const bid = bidResult.rows[0];

    if (bid.asker_id !== currentUserId) {
      return res.status(403).json({ error: 'Only the asker can accept bids' });
    }

    // Update bid status to accepted
    await db.query(
      'UPDATE bids SET status = $1 WHERE id = $2',
      ['accepted', id]
    );

    // Reject all other bids for this errand
    await db.query(
      'UPDATE bids SET status = $1 WHERE errand_id = $2 AND id != $3',
      ['rejected', bid.errand_id, id]
    );

    // Notify other bidders that the job is closed
    try {
      const otherBids = await db.query(
        'SELECT DISTINCT doer_id FROM bids WHERE errand_id = $1 AND id != $2',
        [bid.errand_id, id]
      );

      const errandData = await db.query(
        'SELECT title, errand_id FROM errands WHERE id = $1',
        [bid.errand_id]
      );
      const errandTitle = errandData.rows[0]?.title || 'A task';
      const formattedErrandId = errandData.rows[0]?.errand_id || `ER26-${bid.errand_id}`;

      for (const otherBid of otherBids.rows) {
        await db.query(
          `INSERT INTO notifications (user_id, type, title, message, related_errand_id, created_at, is_read)
           VALUES ($1, $2, $3, $4, $5, NOW(), false)`,
          [
            otherBid.doer_id,
            'bid_rejected',
            'Offer Not Selected',
            `${formattedErrandId}: Your offer was not selected. Don't worry, more errands coming!`,
            bid.errand_id,
          ]
        );
      }
    } catch (notifErr) {
      console.warn('[Bids] Failed to notify other bidders:', notifErr);
      // Don't fail the entire request if notification fails
    }

    // Update errand status to 'confirmed' and set 24h confirmation deadline
    console.log('[Bids] Updating errand status to confirmed:', { bidId: id, errandId: bid.errand_id, status: 'confirmed' });
    const updateResult = await db.query(
      'UPDATE errands SET status = $1, accepted_bid_id = $2, confirmation_expires_at = NOW() + INTERVAL \'24 hours\' WHERE id = $3',
      ['confirmed', id, bid.errand_id]
    );
    console.log('[Bids] Errand update result:', { rowCount: updateResult.rowCount, errandId: bid.errand_id });

    // If a COMPANY won this offer, it now owes the work — create the allocation
    // record so a manager can assign a staff member. This belongs here (the
    // company as doer), not when the company posts an errand: an errand the
    // company posts is done by somebody else entirely.
    if (bid.company_id) {
      try {
        await db.query(
          `INSERT INTO company_orders (company_id, errand_id, status)
           VALUES ($1, $2, 'open')
           ON CONFLICT DO NOTHING`,
          [bid.company_id, bid.errand_id]
        );
        console.log('[Bids] Company', bid.company_id, 'won errand', bid.errand_id, '- ready to allocate staff');
      } catch (coErr) {
        console.error('[Bids] Could not create company_orders row:', coErr);
      }
    }

    // Log activity for confirmation
    try {
      await activityLogService.logConfirmed(bid.errand_id);
    } catch (activityErr) {
      console.warn('[Bids] Failed to log confirmation activity:', activityErr);
    }

    // Create errand assignment record for the accepted doer
    try {
      await db.query(
        `INSERT INTO errand_assignments (errand_id, doer_id, status, created_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (errand_id, doer_id) DO UPDATE
         SET status = $3`,
        [bid.errand_id, bid.doer_id, 'accepted']
      );
      console.log('[Bids] Errand assignment created:', { errandId: bid.errand_id, doerId: bid.doer_id });
    } catch (assignmentErr) {
      console.error('[Bids] Failed to create errand assignment:', assignmentErr);
      // Don't fail the entire request if assignment creation fails
    }

    // Send notification to doer that their bid was accepted
    try {
      const errandData = await db.query(
        'SELECT title, errand_id, asker_id FROM errands WHERE id = $1',
        [bid.errand_id]
      );
      const errandTitle = errandData.rows[0]?.title || 'Your task';
      const formattedErrandId = errandData.rows[0]?.errand_id || `ER26-${bid.errand_id}`;
      const askerId = errandData.rows[0]?.asker_id;

      await db.query(
        `INSERT INTO notifications (user_id, type, title, message, related_errand_id, created_at, is_read)
         VALUES ($1, $2, $3, $4, $5, NOW(), false)`,
        [
          bid.doer_id,
          'bid_accepted',
          'Offer Accepted',
          `${formattedErrandId}: Your offer of $${bid.amount} for "${errandTitle}" was accepted! Please confirm you're ready to help.`,
          bid.errand_id,
        ]
      );

      // If doer is part of a company, notify the company owner
      try {
        const companyCheckResult = await db.query(
          'SELECT owner_user_id FROM company_staff WHERE user_id = $1 LIMIT 1',
          [bid.doer_id]
        );
        if (companyCheckResult.rows.length > 0) {
          const companyOwnerId = companyCheckResult.rows[0].owner_user_id;

          await db.query(
            `INSERT INTO notifications (user_id, type, title, message, related_errand_id, created_at, is_read)
             VALUES ($1, $2, $3, $4, $5, NOW(), false)`,
            [
              companyOwnerId,
              'company_offer_accepted',
              '🎉 Your Offer Was Accepted!',
              `${formattedErrandId}: "${errandTitle}" - Your team's offer accepted! Go to "Allocate Errands" to assign to staff.`,
              bid.errand_id,
            ]
          );
        }
      } catch (companyNotifErr) {
        console.warn('[Bids] Failed to notify company owner:', companyNotifErr);
      }
    } catch (notifErr) {
      console.warn('[Bids] Failed to send bid accepted notification:', notifErr);
      // Don't fail the entire request if notification fails
    }

    // Log activity: Bid accepted
    // Log the DOER whose bid was accepted (not the asker who accepted it)
    const doerResult = await db.query('SELECT display_name, alias FROM users WHERE id = $1', [bid.doer_id]);
    const doerName = doerResult.rows[0]?.display_name || 'Unknown User';
    const doerAlias = doerResult.rows[0]?.alias || undefined;
    await activityLogService.logBidAccepted(bid.errand_id, doerName, bid.doer_id, doerAlias);

    // Notify doer in real-time that their bid was confirmed
    try {
      notifyUser(bid.doer_id, 'bid_confirmed', {
        bidId: bid.id,
        errandId: bid.errand_id,
        message: 'Your offer has been confirmed!',
      });
      console.log('[Bids] Notified doer of bid confirmation:', { doerId: bid.doer_id, bidId: bid.id });
    } catch (notifyErr) {
      console.warn('[Bids] Failed to notify doer of confirmation:', notifyErr);
    }

    // Authorise the asker's card for this amount.
    //
    // This used to return a FABRICATED intent — `pi_mock_${Date.now()}` with
    // status 'succeeded' — and the UI told the asker "Payment is held safely".
    // Nothing was ever charged or held. Now it asks Stripe for a real
    // manual-capture PaymentIntent (authorise now, capture on completion).
    //
    // If Stripe cannot be reached the offer is still accepted — the two are
    // separate concerns and losing the acceptance would be worse — but we say
    // so plainly instead of claiming the money is secured.
    let stripeIntent: any = null;
    let paymentSetupError: string | null = null;

    try {
      const { stripeService } = await import('../services/stripe.js');

      // Bounded wait. Accepting an offer must not hang on a slow or unreachable
      // payment provider — the asker is sitting in front of a spinner. If Stripe
      // does not answer quickly we accept the offer and flag payment separately.
      const intent: any = await Promise.race([
        stripeService.createPaymentIntent(Number(bid.amount), bid.errand_id, bid.doer_id),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Stripe did not respond in time')), 8000)
        ),
      ]);
      // Keep the id and the clock. Without the id the payment can never be
      // captured; without the timestamp we cannot tell how much of the ~7 day
      // authorisation window is left when setting later deadlines.
      await db.query(
        `UPDATE errands
            SET payment_intent_id = $1, payment_authorised_at = NOW()
          WHERE id = $2`,
        [intent.intentId, bid.errand_id]
      );

      stripeIntent = {
        id: intent.intentId,
        clientSecret: intent.clientSecret,
        amount: Math.round(Number(bid.amount) * 100),
        currency: 'sgd',
        status: intent.status || 'requires_payment_method',
      };
    } catch (payErr: any) {
      console.error('[Bids] Could not set up payment for accepted offer:', payErr?.message || payErr);
      paymentSetupError = 'Payment could not be set up yet. The offer is accepted — we will follow up to arrange payment.';
    }

    res.json({
      success: true,
      data: {
        bid,
        stripeIntent,
        paymentSetupError,
      },
    });
  } catch (error) {
    console.error('[Bids] Error accepting bid:', error);
    res.status(500).json({ error: 'Oops, we had a hiccup confirming this offer. Give it another shot!' });
  }
});

// POST /api/bids/:id/reject - Reject a bid with optional feedback
router.post('/:id/reject', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { reason, custom_reason } = req.body;
    const currentUserId = parseInt(req.userId || '0', 10);

    // Get bid and verify errand ownership
    const bidResult = await db.query(
      `SELECT b.*, e.asker_id FROM bids b
       JOIN errands e ON b.errand_id = e.id
       WHERE b.id = $1`,
      [id]
    );

    if (bidResult.rows.length === 0) {
      return res.status(404).json({ error: 'This offer is no longer around. Looks like things moved on.' });
    }

    const bid = bidResult.rows[0];

    if (bid.asker_id !== currentUserId) {
      return res.status(403).json({ error: 'Only the asker can reject bids' });
    }

    // Update bid status with rejection reason
    await db.query(
      'UPDATE bids SET status = $1, rejection_reason = $2, custom_reason = $3, rejected_at = NOW() WHERE id = $4',
      ['rejected', reason, custom_reason || null, id]
    );

    // Get updated bid
    const updated = await db.query('SELECT * FROM bids WHERE id = $1', [id]);
    const updatedBid = updated.rows[0];

    // Send notification to doer with reason
    try {
      const reasonText = reason === 'other' ? custom_reason : reason;
      const errandData = await db.query(
        'SELECT title, formatted_id FROM errands WHERE id = $1',
        [bid.errand_id]
      );
      const errandTitle = errandData.rows[0]?.title || 'Your errand';
      // formattedErrandId was referenced below but never defined, so every
      // rejection notification threw a ReferenceError instead of being sent
      const formattedErrandId = errandData.rows[0]?.formatted_id || errandTitle;

      await db.query(
        `INSERT INTO notifications (user_id, type, title, message, related_errand_id, created_at, is_read)
         VALUES ($1, $2, $3, $4, $5, NOW(), false)`,
        [
          bid.doer_id,
          'bid_rejected',
          'Offer Not Selected',
          `${formattedErrandId}: Your offer wasn't selected.${reasonText ? ` Feedback: ${reasonText}` : ''}`,
          bid.errand_id,
        ]
      );
    } catch (notifErr) {
      console.warn('[Bids] Failed to send rejection notification:', notifErr);
      // Don't fail the entire request if notification fails
    }

    // Log activity: Bid rejected
    const doerResult = await db.query('SELECT display_name FROM users WHERE id = $1', [bid.doer_id]);
    const doerName = doerResult.rows[0]?.display_name || 'Unknown User';
    await activityLogService.logBidRejected(bid.errand_id, doerName, bid.doer_id);

    res.json({ success: true, data: updatedBid });
  } catch (error) {
    console.error('[Bids] Error rejecting bid:', error);
    res.status(500).json({ error: 'We had a hiccup declining this offer. Give it another try!' });
  }
});

// GET /api/users/:userId/confidence-score - Get doer confidence signals
router.get('/user/:userId/confidence', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const parsedUserId = parseInt(userId, 10);

    if (isNaN(parsedUserId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    // Get user info
    const userResult = await db.query(
      'SELECT id, display_name FROM users WHERE id = $1',
      [parsedUserId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Calculate confidence metrics
    const metricsResult = await db.query(
      `SELECT
        COUNT(DISTINCT e.id) as total_jobs_completed,
        COUNT(CASE WHEN e.status = 'completed' THEN 1 END) as successful_jobs,
        AVG(COALESCE(ur.rating, 0)) as avg_rating,
        COUNT(DISTINCT ur.id) as review_count,
        MAX(e.completed_at) as last_job_date,
        CEIL(COUNT(DISTINCT e.id) * 100.0 / NULLIF(COUNT(DISTINCT CASE WHEN b.id IS NOT NULL THEN b.id END), 0)) as acceptance_rate
       FROM bids b
       LEFT JOIN errands e ON b.errand_id = e.id AND b.status = 'accepted'
       LEFT JOIN user_reviews ur ON b.doer_id = ur.reviewed_user_id
       WHERE b.doer_id = $1`,
      [parsedUserId]
    );

    const metrics = metricsResult.rows[0];
    const totalJobs = parseInt(metrics.total_jobs_completed) || 0;
    const successfulJobs = parseInt(metrics.successful_jobs) || 0;
    const avgRating = parseFloat(metrics.avg_rating) || 0;
    const reviewCount = parseInt(metrics.review_count) || 0;
    const acceptanceRate = parseInt(metrics.acceptance_rate) || 0;
    const daysSinceLastJob = metrics.last_job_date
      ? Math.floor((Date.now() - new Date(metrics.last_job_date).getTime()) / (1000 * 60 * 60 * 24))
      : null;

    // Calculate confidence score (0-100)
    const successRate = totalJobs > 0 ? (successfulJobs / totalJobs) * 100 : 0;
    const ratingScore = (avgRating / 5) * 40; // 40 points max
    const jobsScore = Math.min((totalJobs / 20) * 30, 30); // 30 points max
    const acceptanceScore = (acceptanceRate / 100) * 30; // 30 points max
    const confidenceScore = Math.round(ratingScore + jobsScore + acceptanceScore);

    res.json({
      success: true,
      data: {
        total_jobs: totalJobs,
        successful_jobs: successfulJobs,
        success_rate: Math.round(successRate),
        avg_rating: avgRating.toFixed(1),
        review_count: reviewCount,
        acceptance_rate: acceptanceRate,
        days_since_last_job: daysSinceLastJob,
        confidence_score: Math.min(100, confidenceScore),
      },
    });
  } catch (error) {
    console.error('Error calculating confidence:', error);
    res.status(500).json({ error: 'We are having trouble loading the doer info. Just refresh and try again!' });
  }
});

// GET /api/bids/my-bids - Get all bids placed by current doer
router.get('/my-bids', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const doerId = parseInt(req.userId || '0', 10);

    // First, mark any open errands with passed deadlines as expired
    const now = new Date();
    await db.query(
      `UPDATE errands
       SET status = 'expired'
       WHERE status = 'open' AND deadline < $1`,
      [now]
    );

    // Get all bids for this doer with errand details and rating status
    const bidsResult = await db.query(
      `SELECT b.*, e.title, e.budget, e.category, e.status as errand_status, e.location, e.full_address, e.postal_code, e.deadline, e.description, e.formatted_id, e.accepted_bid_id, u.alias, u.display_name as asker_display_name,
              CASE WHEN r.id IS NOT NULL THEN true ELSE false END as has_rated
       FROM bids b
       JOIN errands e ON b.errand_id = e.id
       JOIN users u ON e.asker_id = u.id
       LEFT JOIN ratings r ON e.id = r.errand_id AND r.rater_id = $1
       WHERE b.doer_id = $1
       ORDER BY b.created_at DESC`,
      [doerId]
    );

    // Map of verified postal codes to areas (sourced from OneMap)
    // Note: Only includes postal codes that have been verified through OneMap API
    const postalCodeToArea: Record<string, string> = {
      '507565': 'Bukit Timah',
      '469999': 'Bedok',
      '629652': 'Gul / Tuas / Joo Koon',
      '680433': 'Choa Chu Kang',
      '408600': 'Eunos / Paya Lebar',
      '569957': 'Ang Mo Kio',
    };

    // Process bids and clean up location data
    const processedBids = bidsResult.rows.map((bid) => {
      let cleanLocation = bid.location;

      // If location looks like a unit number (starts with # or is mostly digits), try to extract area
      if (cleanLocation && (cleanLocation.startsWith('#') || /^\d+/.test(cleanLocation))) {
        if (bid.full_address) {
          // Try to extract area name from full_address (usually the last meaningful part before postal code)
          // Common pattern: "123 Some Road, Area Name, Singapore XXXXXX"
          const addressParts = bid.full_address.split(',').map(p => p.trim());
          if (addressParts.length >= 2) {
            // Second to last part is usually the area (before "Singapore XXXXXX")
            const potentialArea = addressParts[addressParts.length - 2];
            if (potentialArea && potentialArea.toLowerCase() !== 'singapore') {
              cleanLocation = potentialArea;
            }
          }
        } else if (bid.postal_code) {
          // Fallback: map postal code to area using postal code lookup
          const mappedArea = postalCodeLookup.getPlanningAreaFromPostalCode(String(bid.postal_code));
          if (mappedArea) {
            cleanLocation = mappedArea;
          }
        }
      }

      return {
        id: bid.id,
        errand_id: bid.errand_id,
        doer_id: bid.doer_id,
        amount: bid.amount,
        note: bid.note,
        status: bid.status,
        is_accepted: bid.accepted_bid_id === bid.id,
        created_at: bid.created_at,
        offer_id: bid.offer_id || `OF${bid.id}`,
        has_rated: bid.has_rated || false,
        errand: {
          title: bid.title,
          budget: bid.budget,
          category: bid.category,
          status: bid.errand_status,
          asker_name: bid.asker_display_name,
          asker_alias: bid.alias,
          location: cleanLocation,
          full_address: bid.full_address,
          postal_code: bid.postal_code,
          deadline: bid.deadline,
          description: bid.description,
          formatted_id: bid.formatted_id || `ER${bid.errand_id}`,
        },
      };
    });

    res.json({
      success: true,
      data: processedBids,
    });
  } catch (error) {
    console.error('Get my bids error:', error);
    res.status(500).json({ error: 'We are having trouble loading the offers. Just refresh and we will sort it!' });
  }
});

// GET /api/bids/check/:errandId - Check if current user has a bid on this errand (accepts database ID or formatted errand ID)
router.get('/check/:errandId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { errandId } = req.params;
    const doerId = parseInt(req.userId || '0', 10);

    // Resolve errand ID (accepts both database ID and formatted errand ID)
    let parsedErrandId: number | null = null;
    if (/^\d+$/.test(errandId)) {
      // If numeric, use as database ID
      parsedErrandId = parseInt(errandId, 10);
    } else {
      // Otherwise, query by formatted errand ID
      const errandResult = await db.query(
        'SELECT id FROM errands WHERE errand_id = $1',
        [errandId]
      );
      if (errandResult.rows.length > 0) {
        parsedErrandId = errandResult.rows[0].id;
      }
    }

    if (!parsedErrandId) {
      return res.json({
        success: true,
        hasBid: false,
      });
    }

    const result = await db.query(
      `SELECT id, amount, status, note FROM bids
       WHERE errand_id = $1 AND doer_id = $2
       LIMIT 1`,
      [parsedErrandId, doerId]
    );

    if (result.rows.length > 0) {
      const bid = result.rows[0];
      return res.json({
        success: true,
        hasBid: true,
        bidId: bid.id,
        bidAmount: bid.amount,
        bidStatus: bid.status,
        bidNote: bid.note,
      });
    }

    res.json({
      success: true,
      hasBid: false,
    });
  } catch (error) {
    console.error('[Bids] Error checking user bid:', error);
    res.status(500).json({ error: 'We are having trouble checking your offer. Just refresh and we will sort it!' });
  }
});

// PUT /api/bids/:id/confirm - Doer confirms they accept the accepted bid
router.put('/:id/confirm', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const bidId = parseInt(req.params.id, 10);
    const doerId = parseInt(req.userId || '0', 10);
    console.log('[Bids] PUT /api/bids/:id/confirm START:', { bidId, doerId });

    // Get the bid
    const bidResult = await db.query(
      'SELECT id, doer_id, errand_id, status FROM bids WHERE id = $1',
      [bidId]
    );
    console.log('[Bids] Bid found:', bidResult.rows.length > 0 ? bidResult.rows[0] : 'NOT FOUND');

    if (bidResult.rows.length === 0) {
      return res.status(404).json({ error: 'This offer is no longer around. Looks like things moved on.' });
    }

    const bid = bidResult.rows[0];

    // Verify the bid belongs to the current doer
    if (bid.doer_id !== doerId) {
      console.log('[Bids] Auth check failed:', { bidDoerId: bid.doer_id, currentDoerId: doerId });
      return res.status(403).json({ error: 'Not authorized to confirm this bid' });
    }

    // Check if bid is in accepted status
    if (bid.status !== 'accepted') {
      console.log('[Bids] Status check failed. Expected accepted, got:', bid.status);
      return res.status(400).json({ error: 'Bid must be in accepted status to confirm' });
    }

    console.log('[Bids] Updating bid to confirmed:', { bidId });
    // Update bid status to confirmed
    await db.query(
      'UPDATE bids SET status = $1 WHERE id = $2',
      ['confirmed', bidId]
    );
    console.log('[Bids] Bid updated to confirmed');

    // Close all other bids for this errand (set status to 'closed')
    await db.query(
      'UPDATE bids SET status = $1 WHERE errand_id = $2 AND id != $3',
      ['closed', bid.errand_id, bidId]
    );

    // Update errand status to 'confirmed' (awaiting doer to start)
    await db.query(
      'UPDATE errands SET status = $1 WHERE id = $2',
      ['confirmed', bid.errand_id]
    );

    // Notify other bidders that the job has started and their offers are closed
    try {
      const otherBids = await db.query(
        'SELECT DISTINCT doer_id FROM bids WHERE errand_id = $1 AND id != $2 AND status = $3',
        [bid.errand_id, bidId, 'closed']
      );

      const errandData = await db.query(
        'SELECT title FROM errands WHERE id = $1',
        [bid.errand_id]
      );
      const errandTitle = errandData.rows[0]?.title || 'A task';

      for (const otherBid of otherBids.rows) {
        await db.query(
          `INSERT INTO notifications (user_id, type, title, message, related_errand_id, created_at, is_read)
           VALUES ($1, $2, $3, $4, $5, NOW(), false)`,
          [
            otherBid.doer_id,
            'bid_closed',
            '❌ Job Started',
            `The job for "${errandTitle}" has started with another doer. Your offer is now closed.`,
            bid.errand_id,
          ]
        );
      }
    } catch (notifErr) {
      console.warn('[Bids] Failed to notify other bidders about job start:', notifErr);
      // Don't fail the entire request if notification fails
    }

    // Get updated bid
    const updatedBid = await db.query('SELECT * FROM bids WHERE id = $1', [bidId]);

    res.json({
      success: true,
      data: {
        id: updatedBid.rows[0].id,
        status: updatedBid.rows[0].status,
        message: 'Bid confirmed successfully and other offers closed'
      }
    });
  } catch (error) {
    console.error('Bid confirm error:', error);
    res.status(500).json({ error: 'Oops, we had a hiccup confirming your offer. Give it another go!' });
  }
});

// PUT /api/bids/:id/accept-sessions - Asker accepts doer for specific sessions
router.put('/:id/accept-sessions', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const bidId = parseInt(req.params.id, 10);
    const { sessions } = req.body;
    const askerId = parseInt(req.userId || '0', 10);

    if (!Array.isArray(sessions) || sessions.length === 0) {
      return res.status(400).json({ error: 'At least one session must be selected' });
    }

    const selectedSessions = sessions.map(s => parseInt(s, 10));

    // Get the bid
    const bidResult = await db.query(
      `SELECT b.id, b.errand_id, b.doer_id, e.asker_id
       FROM bids b
       JOIN errands e ON b.errand_id = e.id
       WHERE b.id = $1`,
      [bidId]
    );

    if (bidResult.rows.length === 0) {
      return res.status(404).json({ error: 'This offer is no longer around. Looks like things moved on.' });
    }

    const bid = bidResult.rows[0];

    // Verify asker is accepting their own errand
    if (bid.asker_id !== askerId) {
      return res.status(403).json({ error: 'Only asker can accept bids' });
    }

    // Get all sessions for this recurring errand
    const sessionsResult = await db.query(
      `SELECT id, instance_number, errand_id FROM recurring_sessions
       WHERE parent_errand_id = $1 AND instance_number = ANY($2::int[])`,
      [bid.errand_id, selectedSessions]
    );

    const sessionsToConfirm = sessionsResult.rows;

    // For each selected session, update its status to confirmed
    for (const session of sessionsToConfirm) {
      await db.query(
        'UPDATE errands SET status = $1 WHERE id = $2',
        ['confirmed', session.errand_id]
      );

      // Create bid record for this specific session instance
      // (This links the doer to this specific session)
      const bidForSessionResult = await db.query(
        `SELECT id FROM bids WHERE errand_id = $1 AND doer_id = $2 LIMIT 1`,
        [session.errand_id, bid.doer_id]
      );

      if (bidForSessionResult.rows.length === 0) {
        // Create a new bid for this session if one doesn't exist
        await db.query(
          'INSERT INTO bids (errand_id, doer_id, amount, status) VALUES ($1, $2, $3, $4)',
          [session.errand_id, bid.doer_id, bid.amount, 'confirmed']
        );
      } else {
        // Update existing bid to confirmed
        await db.query(
          'UPDATE bids SET status = $1 WHERE id = $2',
          ['confirmed', bidForSessionResult.rows[0].id]
        );
      }
    }

    // Log which sessions were accepted
    console.log(`[Bids] Asker ${askerId} accepted bid ${bidId} for sessions: ${selectedSessions.join(', ')}`);

    res.json({
      success: true,
      data: {
        bidId,
        doerId: bid.doer_id,
        acceptedSessions: selectedSessions,
        message: `Accepted doer for ${selectedSessions.length} session(s)`
      }
    });
  } catch (error) {
    console.error('Error accepting bid sessions:', error);
    res.status(500).json({ error: 'Oops, we had a hiccup confirming this offer. Give it another shot!' });
  }
});

// GET /api/bids/recurring/:errandId - Get all bids for a recurring errand grouped by sessions
router.get('/recurring/:errandId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const errandId = parseInt(req.params.errandId, 10);
    const currentUserId = parseInt(req.userId || '0', 10);

    // Verify this is a recurring errand and user is the asker
    const errandResult = await db.query(
      'SELECT id, asker_id, is_recurring FROM errands WHERE id = $1',
      [errandId]
    );

    if (errandResult.rows.length === 0) {
      return res.status(404).json({ error: 'Looks like this errand got taken care of or the neighbour changed their mind.' });
    }

    const errand = errandResult.rows[0];

    if (!errand.is_recurring) {
      return res.status(400).json({ error: 'Not a recurring errand' });
    }

    if (errand.asker_id !== currentUserId) {
      return res.status(403).json({ error: 'Only asker can view bids' });
    }

    // Get all sessions for this recurring errand
    const sessionsResult = await db.query(
      `SELECT rs.id, rs.instance_number, rs.errand_id, rs.scheduled_date,
              e.title, e.status, e.budget
       FROM recurring_sessions rs
       JOIN errands e ON rs.errand_id = e.id
       WHERE rs.parent_errand_id = $1
       ORDER BY rs.instance_number ASC`,
      [errandId]
    );

    const sessions = sessionsResult.rows;

    // Get all bids for all sessions
    const bidsResult = await db.query(
      `SELECT DISTINCT b.id, b.doer_id, b.amount, b.note, b.status, b.created_at,
              u.display_name, u.average_rating, u.total_ratings
       FROM bids b
       JOIN users u ON b.doer_id = u.id
       WHERE b.errand_id IN (
         SELECT errand_id FROM recurring_sessions WHERE parent_errand_id = $1
       )
       ORDER BY b.created_at DESC`,
      [errandId]
    );

    const bids = bidsResult.rows;

    // Map bids to their sessions
    const bidSessionsResult = await db.query(
      `SELECT bs.bid_id, rs.instance_number
       FROM bid_sessions bs
       JOIN recurring_sessions rs ON bs.session_id = rs.id
       WHERE rs.parent_errand_id = $1`,
      [errandId]
    );

    const bidSessionMap: Record<number, number[]> = {};
    for (const row of bidSessionsResult.rows) {
      if (!bidSessionMap[row.bid_id]) {
        bidSessionMap[row.bid_id] = [];
      }
      bidSessionMap[row.bid_id].push(row.instance_number);
    }

    // Build response with sessions and grouped bids
    res.json({
      success: true,
      data: {
        errandId,
        sessions: sessions.map(s => ({
          instanceNumber: s.instance_number,
          errandId: s.errand_id,
          scheduledDate: s.scheduled_date,
          title: s.title,
          status: s.status,
          budget: s.budget,
        })),
        bids: bids.map(b => ({
          bidId: b.id,
          doerId: b.doer_id,
          doerName: b.display_name,
          doerRating: b.average_rating || 'New',
          doerRatings: b.total_ratings || 0,
          amount: b.amount,
          note: b.note,
          status: b.status,
          selectedSessions: bidSessionMap[b.id] || [],
          createdAt: b.created_at,
        })),
      },
    });
  } catch (error) {
    console.error('Error fetching recurring bids:', error);
    res.status(500).json({ error: 'We are having trouble loading the offers. Just refresh and we will sort it!' });
  }
});

// POST /api/bids/:bidId/mark-viewed - Mark a bid as viewed by asker
router.post('/:bidId/mark-viewed', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { bidId } = req.params;
    const userId = parseInt(req.userId || '0', 10);

    if (!bidId) {
      return res.status(400).json({ error: 'Bid ID required' });
    }

    // Get the bid and verify the user is the asker
    const bidResult = await db.query(
      `SELECT b.*, e.asker_id FROM bids b
       JOIN errands e ON b.task_id = e.id
       WHERE b.id = $1`,
      [bidId]
    );

    if (bidResult.rows.length === 0) {
      return res.status(404).json({ error: 'Bid not found' });
    }

    const bid = bidResult.rows[0];

    // Verify the user is the asker
    if (bid.asker_id !== userId) {
      return res.status(403).json({ error: 'Not authorized to view this bid' });
    }

    // Mark as viewed if not already viewed
    if (!bid.viewed_at) {
      await db.query(
        `UPDATE bids
         SET viewed_at = NOW(), viewed_by_asker = TRUE
         WHERE id = $1`,
        [bidId]
      );

      console.log(`[Bids] Marked bid ${bidId} as viewed by asker ${userId}`);
    }

    res.json({ success: true, message: 'Bid marked as viewed' });
  } catch (error) {
    console.error('Error marking bid as viewed:', error);
    res.status(500).json({ error: 'Failed to mark bid as viewed' });
  }
});

// POST /api/bids/mark-errand-viewed/:errandId - Mark all unviewed bids for an errand as viewed
router.post('/mark-errand-viewed/:errandId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { errandId } = req.params;
    const userId = parseInt(req.userId || '0', 10);

    if (!errandId) {
      return res.status(400).json({ error: 'Errand ID required' });
    }

    // Verify the user is the asker of this errand
    const errandResult = await db.query(
      'SELECT asker_id FROM errands WHERE id = $1 OR formatted_id = $1',
      [errandId]
    );

    if (errandResult.rows.length === 0) {
      return res.status(404).json({ error: 'Errand not found' });
    }

    const errand = errandResult.rows[0];

    if (errand.asker_id !== userId) {
      return res.status(403).json({ error: 'Not authorized to view these bids' });
    }

    // Mark all unviewed bids as viewed
    const updateResult = await db.query(
      `UPDATE bids
       SET viewed_at = NOW(), viewed_by_asker = TRUE
       WHERE task_id = $1 AND viewed_at IS NULL`,
      [errand.id]
    );

    console.log(`[Bids] Marked ${updateResult.rowCount} unviewed bids as viewed for errand ${errandId}`);

    res.json({
      success: true,
      message: `Marked ${updateResult.rowCount} bids as viewed`,
      markedCount: updateResult.rowCount
    });
  } catch (error) {
    console.error('Error marking errand bids as viewed:', error);
    res.status(500).json({ error: 'Failed to mark bids as viewed' });
  }
});

// GET /api/bids/payout-readiness?actAsCompany=true — so the offer form can show
// the reminder up front instead of after someone has typed out an offer.
router.get('/payout-readiness', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const doerId = parseInt(req.userId || '0', 10);
    let companyId: number | null = null;

    if (req.query.actAsCompany === 'true') {
      const m = await resolveMyCompany(doerId);
      if (m && m.canActForCompany && m.certified) companyId = m.companyId;
    }

    const readiness = await checkPayoutReadiness({ userId: doerId, companyId });
    res.json({ success: true, data: readiness });
  } catch (error) {
    console.error('[Bids] Payout readiness error:', error);
    // Never block the form on our own failure to check
    res.json({ success: true, data: { ready: true } });
  }
});

/**
 * GET /api/bids/:id — a single offer.
 *
 * ReviewCompletionPage looks the accepted offer up by id to show who did the
 * errand; there was no such route, so the doer's name never loaded there.
 *
 * Registered last on purpose. Express matches in registration order, and '/:id'
 * would otherwise swallow the literal routes above it — '/my-bids',
 * '/payout-readiness', '/check/:errandId' and the rest would all resolve here.
 *
 * Visible to the two people involved: the asker who received the offer and the
 * doer who made it. Anyone else gets 404 rather than 403, so this cannot be
 * used to probe which offer ids exist.
 */
router.get('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const bidId = parseInt(req.params.id, 10);
    if (Number.isNaN(bidId)) return res.status(400).json({ error: 'Invalid offer id' });
    const currentUserId = parseInt(req.userId || '0', 10);

    const result = await db.query(
      `SELECT b.id, b.errand_id, b.doer_id, b.amount, b.note, b.status, b.created_at,
              COALESCE(u.alias, u.display_name) AS doer_name,
              u.profile_image_url AS doer_avatar,
              e.asker_id
         FROM bids b
         JOIN users u ON u.id = b.doer_id
         JOIN errands e ON e.id = b.errand_id
        WHERE b.id = $1`,
      [bidId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'That offer is no longer around.' });
    }

    const row = result.rows[0];
    if (row.asker_id !== currentUserId && row.doer_id !== currentUserId) {
      return res.status(404).json({ error: 'That offer is no longer around.' });
    }

    const { asker_id, ...bid } = row;
    res.json({ success: true, data: bid });
  } catch (error) {
    console.error('[Bids] Error fetching offer:', error);
    res.status(500).json({ error: 'We are having trouble loading that offer. Just refresh and we will sort it!' });
  }
});

export default router;
