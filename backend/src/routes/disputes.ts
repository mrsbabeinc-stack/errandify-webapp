import { Router, Response } from 'express';
import { AuthRequest, authMiddleware, requireAdmin } from '../middleware/auth.js';
import db from '../db.js';
import { resolveCompanyRole } from '../utils/companyRole.js';
import { describeWindow, reworkAllowance } from '../utils/authorisationWindow.js';
import {
  calculateDisputeFee,
  checkSettlementReadiness,
  preflightSettlement,
  executeSettlement,
  applyMonetaryDecision,
} from '../services/disputeSettlement.js';
import {
  analyzeDisputeWithAI,
  escalateDispute,
  createDispute,
  classifyDisputeTier,
  holdPayment,
  releaseHeldPayment,
  closeErrandAfterDispute,
} from '../services/disputeResolutionService.js';
// saveDisputeVerdict was imported here and never called. It is the entry point
// to a whole second verdict subsystem — disputeVerdictService plus
// disputeVerdictValidator, ~790 lines writing `dispute_decisions` in a third
// vocabulary (full_payment / refund / partial_payment). Dropping the import
// keeps that off the one decision path; the files are untouched.
import {
  composeOutcomeMessages,
  draftAndStoreOutcomeMessages,
} from '../services/disputeOutcomeMessages.js';
import {
  notifyDisputeRaised,
  notifyDisputeResolved,
} from './notifications.js';
import {
  sendDisputeRaisedEmail,
  sendDisputeResolvedEmail,
  sendDisputeDecisionEmail,
} from '../services/email.js';

const router = Router();

// These endpoints decide money: they release, split or refund held payment, and
// the list endpoint exposes every dispute on the platform. Each one was marked
// "admin only" in a comment but guarded with authMiddleware alone, so ANY logged
// in user could resolve a dispute in their own favour. Support tiers are allowed
// through because L2/L3 do the human review.
const adminOnly: any = [authMiddleware, requireAdmin(['admin', 'super-admin', 'support_l2', 'support_l3'])];

// POST /api/disputes - Create a new dispute
router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.userId || '0', 10);
    const { errandId, type, description, evidence } = req.body;

    if (!errandId || !type || !description) {
      return res.status(400).json({ error: 'errandId, type, description required' });
    }

    // Get errand details for notifications. There is no errands.doer_id — the
    // doer is whoever's offer was accepted, so it has to come through the bid.
    const errandResult = await db.query(
      `SELECT e.id, e.title, e.asker_id, b.doer_id
         FROM errands e
         LEFT JOIN bids b ON b.id = e.accepted_bid_id
        WHERE e.id = $1`,
      [parseInt(errandId)]
    );

    if (errandResult.rows.length === 0) {
      return res.status(404).json({ error: 'Errand not found' });
    }

    const errand = errandResult.rows[0];

    // Nobody has been accepted yet, so there is no counterparty to dispute with
    if (!errand.doer_id) {
      return res.status(400).json({
        error: 'No one has been accepted for this errand yet, so there is nothing to dispute. Cancel it instead if you no longer need it.',
      });
    }

    // Only the two parties on the errand may file
    if (userId !== errand.asker_id && userId !== errand.doer_id) {
      return res.status(403).json({ error: 'Only the asker or the doer on this errand can raise a dispute.' });
    }

    // Create dispute
    const result = await createDispute({
      errandId: parseInt(errandId),
      filedByUserId: userId,
      type: type as any,
      description,
      evidence,
    });

    if (!result.success) {
      return res.status(500).json({ error: 'Failed to create dispute' });
    }

    // The errand is marked disputed inside createDispute(), so every filing path
    // gets it. This one still holds the payment.
    await holdPayment(parseInt(errandId), `Dispute #${result.disputeId} filed`);

    // Determine who filed the dispute and who should be notified
    const isAskerFiling = userId === errand.asker_id;
    const otherPartyId = isAskerFiling ? errand.doer_id : errand.asker_id;

    // Get user details for notifications and emails
    const userResult = await db.query(
      `SELECT COALESCE(alias, display_name) AS name, email FROM users WHERE id = $1`,
      [userId]
    );
    const userName = userResult.rows[0]?.name || 'A user';
    const userEmail = userResult.rows[0]?.email;

    // Get other party details
    const otherPartyResult = await db.query(
      `SELECT COALESCE(alias, display_name) AS name, email FROM users WHERE id = $1`,
      [otherPartyId]
    );
    const otherPartyName = otherPartyResult.rows[0]?.name || 'A user';
    const otherPartyEmail = otherPartyResult.rows[0]?.email;

    // Get issue type label
    const issueTypeLabel = type === 'work_not_completed' ? 'Work Not Completed'
      : type === 'low_quality' ? 'Low Quality'
      : type === 'payment_not_released' ? 'Payment Issue'
      : type === 'safety_concern' ? 'Safety Concern'
      : 'Other';

    // Notify the other party
    try {
      const dl = await db.query('SELECT response_deadline FROM disputes WHERE id = $1', [result.disputeId]);
      await notifyDisputeRaised(
        otherPartyId,
        userName,
        `#${result.disputeId}`,
        errand.title,
        dl.rows[0]?.response_deadline || null
      );
    } catch (notifyErr) {
      console.warn('[Disputes] Failed to notify other party:', notifyErr);
    }

    // Notify the filing party (confirmation)
    try {
      await notifyDisputeRaised(
        userId,
        'Errandify Team',
        `#${result.disputeId}`,
        errand.title
      );
    } catch (notifyErr) {
      console.warn('[Disputes] Failed to notify filing party:', notifyErr);
    }

    // Send emails
    try {
      if (otherPartyEmail) {
        await sendDisputeRaisedEmail(
          otherPartyEmail,
          otherPartyName,
          errand.title,
          issueTypeLabel,
          result.disputeId
        );
      }

      if (userEmail) {
        await sendDisputeRaisedEmail(
          userEmail,
          userName,
          errand.title,
          issueTypeLabel,
          result.disputeId
        );
      }
    } catch (emailErr) {
      console.warn('[Disputes] Failed to send emails:', emailErr);
      // Don't fail the dispute creation if emails fail
    }

    res.status(201).json({
      success: true,
      disputeId: result.disputeId,
    });
  } catch (error) {
    console.error('[Disputes] Create error:', error);
    res.status(500).json({ error: 'Dispute creation failed' });
  }
});

// GET /api/disputes/for-errand/:errandId — the dispute on this errand, if any
//
// A party knows their errand, not the dispute id. Without this the only screen
// an individual ever sees for a disputed errand is a static "under review"
// panel: no outcome, no amounts, and no way to appeal, because nothing could
// tell the page which dispute to ask about. Two path segments, so it cannot be
// swallowed by the single-segment /:id route below.
router.get('/for-errand/:errandId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const errandId = parseInt(req.params.errandId, 10);
    const userId = parseInt(req.userId || '0', 10);
    if (Number.isNaN(errandId)) return res.status(400).json({ error: 'Invalid errand id' });

    const result = await db.query(
      `SELECT d.id, d.status, e.asker_id, ab.doer_id, d.filed_by_user_id, d.defendant_user_id,
              d.company_id, ab.company_id AS doer_company_id
         FROM disputes d
         JOIN errands e ON e.id = d.errand_id
         LEFT JOIN bids ab ON ab.id = e.accepted_bid_id
        WHERE d.errand_id = $1
        ORDER BY d.created_at DESC
        LIMIT 1`,
      [errandId]
    );
    if (result.rows.length === 0) return res.json({ success: true, dispute: null });

    const d = result.rows[0];
    let allowed = [d.asker_id, d.doer_id, d.filed_by_user_id, d.defendant_user_id]
      .filter(Boolean).map(Number).includes(userId);

    if (!allowed) {
      for (const cid of [d.company_id, d.doer_company_id]) {
        if (!cid) continue;
        const membership = await resolveCompanyRole(userId, cid);
        if (membership?.canActForCompany) { allowed = true; break; }
      }
    }
    if (!allowed) {
      const role = await db.query('SELECT role FROM users WHERE id = $1', [userId]);
      if (['admin', 'super-admin', 'support_l2', 'support_l3'].includes(role.rows[0]?.role)) allowed = true;
    }
    // Not a leak to say "no" the same way as "none" — a stranger learns nothing
    // either way.
    if (!allowed) return res.json({ success: true, dispute: null });

    res.json({ success: true, dispute: { id: d.id, status: d.status } });
  } catch (error) {
    console.error('[Disputes] for-errand lookup error:', error);
    res.status(500).json({ error: 'Could not look that up' });
  }
});

// GET /api/disputes/:id - Get a dispute
//
// This previously returned any dispute to any logged-in user — an IDOR that
// leaked both parties' descriptions and amounts to anyone who guessed an id.
// Access is now limited to the people actually involved, plus admins.
router.get('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const disputeId = parseInt(req.params.id, 10);
    const userId = parseInt(req.userId || '0', 10);

    const result = await db.query(
      `SELECT d.id, d.errand_id, d.filed_by_user_id, d.defendant_user_id,
              d.company_id, d.raised_by_staff_id,
              d.dispute_type, d.description, d.status, d.priority,
              d.created_at, d.resolved_at,
              d.response_deadline, d.response_status, d.defendant_response,
              d.response_submitted_at,
              d.verdict_decision, d.verdict_reasoning, d.verdict_doer_amount,
              d.verdict_company_amount, d.verdict_issued_at,
              d.has_appeal, d.appeal_submitted_at,
              d.resolution, d.resolution_notes, d.resolution_kind, d.non_monetary_outcome,
              d.settlement_doer_amount, d.settlement_asker_amount, d.settlement_fee,
              d.settlement_status, d.settled_at,
              d.appeal_window_closes_at, d.claimant_can_appeal, d.defendant_can_appeal,
              d.appeal_reason, d.appeal_reviewed_at, d.appeal_final_decision,
              d.appeal_final_reasoning, d.appeal_round,
              d.hana_proposal, d.hana_recommended_action, d.hana_confidence,
              d.hana_reasoning, d.hana_proposed_at, d.hana_failed_reason,
              e.formatted_id, e.title, e.budget, e.asker_id, e.payment_authorised_at,
              ab.doer_id, ab.amount AS accepted_amount, ab.company_id AS doer_company_id
         FROM disputes d
         JOIN errands e ON e.id = d.errand_id
         LEFT JOIN bids ab ON ab.id = e.accepted_bid_id
        WHERE d.id = $1`,
      [disputeId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Dispute not found' });
    }
    const d = result.rows[0];

    // The individuals directly involved
    let allowed = [d.filed_by_user_id, d.defendant_user_id, d.asker_id, d.doer_id, d.raised_by_staff_id]
      .filter(Boolean)
      .map(Number)
      .includes(userId);

    // Whoever runs the company on either side of the errand
    if (!allowed) {
      for (const cid of [d.company_id, d.doer_company_id]) {
        if (!cid) continue;
        const membership = await resolveCompanyRole(userId, cid);
        if (membership?.canActForCompany) {
          allowed = true;
          break;
        }
      }
    }

    // Admins and the support tiers who review these
    if (!allowed) {
      const role = await db.query('SELECT role FROM users WHERE id = $1', [userId]);
      const r = role.rows[0]?.role;
      if (['admin', 'super-admin', 'support_l2', 'support_l3'].includes(r)) allowed = true;
    }

    if (!allowed) {
      return res.status(403).json({ error: 'You are not involved in this dispute.' });
    }

    // Auto-resolve is 24h after the response deadline — matches the defense flow
    const autoResolveAt = d.response_deadline
      ? new Date(new Date(d.response_deadline).getTime() + 24 * 60 * 60 * 1000).toISOString()
      : null;

    // Whether THIS person can appeal, worked out here rather than left to each
    // caller. Appeal rights follow participation and they are decided at
    // resolution time, so the interface has no way to derive them on its own —
    // which is why no screen ever offered an appeal.
    const isClaimant = Number(d.filed_by_user_id) === userId;
    const isDefendant = Number(d.defendant_user_id) === userId;
    const closesAt = d.appeal_window_closes_at ? new Date(d.appeal_window_closes_at) : null;
    const windowOpen = !!closesAt && closesAt.getTime() > Date.now();
    const alreadyAppealed = !!(d.has_appeal || d.appeal_submitted_at);
    const moneyMoving = !!d.settlement_status && d.settlement_status !== 'not_started';
    const entitled = isClaimant ? !!d.claimant_can_appeal : isDefendant ? !!d.defendant_can_appeal : false;

    const appealView = {
      exists: alreadyAppealed,
      reason: d.appeal_reason || null,
      submittedAt: d.appeal_submitted_at,
      reviewedAt: d.appeal_reviewed_at,
      finalDecision: d.appeal_final_decision || null,
      finalReasoning: d.appeal_final_reasoning || null,
      round: Number(d.appeal_round ?? 0),
      windowClosesAt: d.appeal_window_closes_at,
      canAppeal: !!d.resolution && entitled && windowOpen && !alreadyAppealed && !moneyMoving && Number(d.appeal_round ?? 0) < 1,
      whyNot: !d.resolution
        ? 'There is no decision to appeal yet.'
        : !entitled
        ? isDefendant
          ? 'You did not respond when this was raised with you, so the decision stands.'
          : isClaimant
          ? 'You received the outcome you asked for, so there is nothing to appeal.'
          : 'Only the two people involved can appeal this.'
        : alreadyAppealed
        ? 'This has already been appealed.'
        : moneyMoving
        ? 'The money has already been released.'
        : !windowOpen
        ? 'The appeal window has closed.'
        : null,
    };

    res.json({
      dispute: {
        id: d.id,
        errandDbId: d.errand_id,
        errandId: d.formatted_id,
        jobTitle: d.title,
        status: d.status,
        amount: Number(d.accepted_amount ?? d.budget ?? 0),
        reason: d.description,
        disputeType: d.dispute_type,
        // 'company' when the business filed it, otherwise the individual doer/asker
        raisedBy: d.company_id ? 'company' : Number(d.filed_by_user_id) === Number(d.asker_id) ? 'asker' : 'doer',
        raisedByStaffId: d.raised_by_staff_id,
        createdAt: d.created_at,
        resolvedAt: d.resolved_at,
        responseDeadline: d.response_deadline,
        autoResolveAt,
        responseStatus: d.response_status,
        defendantResponse: d.defendant_response,
        responseSubmittedAt: d.response_submitted_at,
        isDefendant: Number(d.defendant_user_id) === userId,
        // Which side of the errand the person reading this is on, so the
        // interface can say "that means $60 to you" instead of making them work
        // out which of the two figures is theirs. Null for a company owner
        // acting for the business rather than as the named party.
        viewerSide:
          Number(d.asker_id) === userId ? 'asker' : Number(d.doer_id) === userId ? 'doer' : null,
        hasAppeal: !!(d.has_appeal || d.appeal_submitted_at),
        // Hana's suggestion for the admin. Advisory only — she never decides.
        hanaProposal: d.hana_proposed_at
          ? {
              action: d.hana_recommended_action,
              proposal: d.hana_proposal,
              reasoning: d.hana_reasoning,
              confidence: Number(d.hana_confidence ?? 0),
              proposedAt: d.hana_proposed_at,
            }
          : null,
        hanaFailedReason: d.hana_failed_reason || null,
        // The shared 6-day clock every stage spends from
        authorisationWindow: describeWindow(d.payment_authorised_at),
        verdict: d.verdict_decision
          ? {
              decision: d.verdict_decision,
              reasoning: d.verdict_reasoning,
              doerAmount: Number(d.verdict_doer_amount ?? 0),
              companyAmount: Number(d.verdict_company_amount ?? 0),
              issuedAt: d.verdict_issued_at,
            }
          : null,
        // What was decided, and what it means for this person's money. Without
        // this the parties could see that a dispute existed but never what came
        // of it, and there was no way to offer an appeal in the interface.
        decision: d.resolution
          ? {
              resolution: d.resolution,
              kind: d.resolution_kind || 'monetary',
              notes: d.resolution_notes,
              nonMonetaryOutcome: d.non_monetary_outcome || null,
              doerAmount: Number(d.settlement_doer_amount ?? 0),
              askerAmount: Number(d.settlement_asker_amount ?? 0),
              fee: Number(d.settlement_fee ?? 0),
              settlementStatus: d.settlement_status || 'not_started',
              settledAt: d.settled_at,
            }
          : null,
        appeal: appealView,
      },
    });
  } catch (error) {
    console.error('[Disputes] Status error:', error);
    res.status(500).json({ error: 'Failed to fetch dispute' });
  }
});

// GET /api/disputes/:id/analysis - Get AI analysis (Level 2)
// Runs Hana over the case and returns her read of it. Admin-only: it was
// behind authMiddleware alone, so any logged-in user could pull an analysis —
// including the description and amounts — for any dispute id they guessed.
// The only caller is the admin dispute screen.
router.get('/:id/analysis', adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const analysis = await analyzeDisputeWithAI(parseInt(id));

    res.json({ analysis });
  } catch (error) {
    console.error('[Disputes] Analysis error:', error);
    res.status(500).json({ error: 'Analysis failed' });
  }
});

// POST /api/disputes/:id/escalate - Escalate to Level 3
// Admin-only for the same reason: any logged-in user could escalate any
// dispute and set its priority. No screen calls this — it is an operator tool.
router.post('/:id/escalate', adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { notes, priority } = req.body;

    // A missing dispute came back as a 500 — "escalation failed" reads as our
    // fault when the id simply is not there.
    const exists = await db.query('SELECT id FROM disputes WHERE id = $1', [parseInt(id)]);
    if (exists.rows.length === 0) {
      return res.status(404).json({ error: 'Dispute not found' });
    }

    const result = await escalateDispute(parseInt(id), notes, priority || 'normal');

    if (!result.success) {
      return res.status(500).json({ error: 'Escalation failed' });
    }

    res.json({ success: true, data: result.data });
  } catch (error) {
    console.error('[Disputes] Escalation error:', error);
    res.status(500).json({ error: 'Escalation failed' });
  }
});

// POST /api/disputes/:id/resolve - Resolve dispute (admin only)
router.post('/:id/resolve', adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { resolution, notes, doerAmount, askerAmount } = req.body;
    const userId = parseInt(req.userId || '0', 10);

    // The form sent 'approve' while this checked for 'approved', so the payment
    // branch below could never fire. Accept either spelling and canonicalise.
    const CANONICAL: Record<string, 'approved' | 'rejected' | 'partial'> = {
      approve: 'approved', approved: 'approved',
      reject: 'rejected', rejected: 'rejected', refund: 'rejected',
      partial: 'partial', split: 'partial',
    };
    // Only a monetary resolution needs approve/reject/partial. A rework or a
    // non-monetary outcome has no payment decision to make, and demanding one
    // meant a rework could not be proposed without also picking a settlement.
    const kindEarly = ['monetary', 'rework', 'non_monetary'].includes(req.body.resolutionKind)
      ? req.body.resolutionKind
      : 'monetary';

    const decision = CANONICAL[String(resolution || '').toLowerCase()];
    if (kindEarly === 'monetary' && !decision) {
      return res.status(400).json({ error: 'Decision must be approve, reject or partial.' });
    }
    if (!notes || !String(notes).trim()) {
      return res.status(400).json({ error: 'Resolution notes are required — both parties will read them.' });
    }

    // Get dispute and errand details before updating
    const disputeResult = await db.query(
      `SELECT d.id, d.errand_id, d.settlement_status, d.response_status, d.filed_by_user_id,
              d.rework_round,
              e.title, e.asker_id, e.budget, e.payment_authorised_at,
              b.doer_id, b.amount AS accepted_amount
       FROM disputes d
       JOIN errands e ON d.errand_id = e.id
       LEFT JOIN bids b ON b.id = e.accepted_bid_id
       WHERE d.id = $1`,
      [parseInt(id)]
    );

    if (disputeResult.rows.length === 0) {
      return res.status(404).json({ error: 'Dispute not found' });
    }

    const dispute = disputeResult.rows[0];

    // Never re-decide a dispute whose money has already moved
    if (['pending', 'settled'].includes(dispute.settlement_status)) {
      return res.status(409).json({
        error: `This dispute has already been settled (${dispute.settlement_status}). Reopening it would risk paying twice.`,
      });
    }

    // Three ways a dispute can end. Default stays monetary so existing callers
    // behave exactly as before.
    const kind = kindEarly as 'monetary' | 'rework' | 'non_monetary';

    // Work out who gets what. The total is the accepted offer amount, falling
    // back to the errand budget if the offer has gone.
    const total = Number(dispute.accepted_amount ?? dispute.budget ?? 0);
    let toDoer = 0;
    let toAsker = 0;

    // ---- Rework: a proposal both sides must accept -------------------------
    //
    // Not a settlement. The payment hold STAYS — it is the leverage that gets
    // the work done and the fallback if it isn't — so no appeal window opens
    // and no settlement legs are staged. Silence counts as a decline after 24h
    // so the money cannot stay frozen while someone ignores it.
    if (kind === 'rework') {
      if (dispute.rework_round >= 1) {
        return res.status(400).json({
          error: 'This dispute has already been through a rework. It needs a compensation decision now.',
        });
      }
      // The rework must finish inside the shared 6-day authorisation window.
      // Day 1 is the day the offer was accepted, and every stage before this —
      // the defence window, Hana, admin review — has already spent from it.
      const allowance = reworkAllowance(dispute.payment_authorised_at, Number(req.body.reworkDays) || 3);

      // reworkAllowance no longer returns null for timing reasons — the money is
      // captured and cannot lapse — but keep the guard so a future constraint
      // surfaces honestly rather than crashing.
      if (!allowance) {
        return res.status(400).json({
          error: 'A rework is not available on this errand. It needs a compensation decision instead.',
          reason: 'rework_unavailable',
        });
      }

      const { days, deadline: reworkDeadline, maxDays } = allowance;
      const consentDeadline = new Date(Date.now() + 24 * 60 * 60 * 1000);

      // The hold is the whole basis of a rework — the leverage that gets the work
      // done and the fallback if it isn't. Assert it rather than assume it: if
      // anything released it earlier, a rework would otherwise proceed with
      // nothing backing it.
      await holdPayment(dispute.errand_id, `Rework agreed on dispute #${id}`);

      await db.query(
        `UPDATE disputes
            SET resolution_kind = 'rework',
                resolution_notes = $1,
                rework_deadline = $2,
                rework_consent_deadline = $3,
                rework_proposed_at = NOW(),
                rework_round = 1,
                rework_outcome = NULL,
                rework_asker_response = NULL,
                rework_doer_response = NULL,
                decided_by_user_id = $4,
                status = 'rework_proposed',
                updated_at = NOW()
          WHERE id = $5`,
        [notes, reworkDeadline, consentDeadline, userId, parseInt(id)]
      );

      for (const uid of [dispute.asker_id, dispute.doer_id].filter(Boolean)) {
        try {
          await db.query(
            `INSERT INTO notifications (user_id, type, title, message, related_errand_id)
             VALUES ($1, 'dispute_rework_proposed', $2, $3, $4)`,
            [
              uid,
              `A way to sort out "${dispute.title}"`,
              `${notes}\n\nIf you both agree, the work gets reworked by ${reworkDeadline.toLocaleDateString('en-SG', { dateStyle: 'medium' })} and the payment stays held until it's done. Let us know within 24 hours — if we don't hear back we'll decide the compensation instead.`,
              dispute.errand_id,
            ]
          );
        } catch (e) {
          console.warn('[Disputes] Could not notify about rework proposal:', e);
        }
      }

      return res.json({
        success: true,
        data: {
          resolutionKind: 'rework',
          reworkDeadline,
          consentDeadline,
          maxDays,
          message: 'Both sides have been asked. Nothing is settled until they agree.',
        },
      });
    }

    // ---- Non-monetary: nothing changes hands -----------------------------
    if (kind === 'non_monetary') {
      const outcome = String(req.body.nonMonetaryOutcome || '').trim();
      const allowed = ['sorted_between_parties', 'apology_given', 'guidance_given', 'warning_issued', 'no_action_needed'];
      if (!allowed.includes(outcome)) {
        return res.status(400).json({ error: 'Choose what the outcome was.' });
      }

      await db.query(
        `UPDATE disputes
            SET resolution_kind = 'non_monetary',
                non_monetary_outcome = $1,
                resolution = 'no_payment_change',
                resolution_notes = $2,
                resolved_at = NOW(),
                status = 'resolved',
                decided_by_user_id = $3,
                settlement_status = 'not_started',
                updated_at = NOW()
          WHERE id = $4`,
        [outcome, notes, userId, parseInt(id)]
      );

      // Nothing is owed either way, so the money resumes its normal path.
      // Leaving it frozen would punish someone over a non-financial complaint.
      await releaseHeldPayment(dispute.errand_id);
      // Nothing changed hands, so the errand goes back exactly where it was
      // rather than to a guessed-at status.
      await closeErrandAfterDispute(dispute.errand_id, 'restore');

      return res.json({
        success: true,
        data: { resolutionKind: 'non_monetary', outcome, paymentHoldReleased: true },
      });
    }

    // ---- Monetary ---------------------------------------------------------
    if (decision === 'approved') {
      toDoer = total;
    } else if (decision === 'rejected') {
      toAsker = total;
    } else {
      toDoer = Number(doerAmount);
      toAsker = Number(askerAmount);
      if (!isFinite(toDoer) || !isFinite(toAsker) || toDoer < 0 || toAsker < 0) {
        return res.status(400).json({ error: 'A partial split needs both amounts as positive numbers.' });
      }
      // Cent-level tolerance so a 1/3 split does not get rejected
      if (Math.abs(toDoer + toAsker - total) > 0.01) {
        return res.status(400).json({
          error: `The split must add up to the errand total of $${total.toFixed(2)}. You entered $${(toDoer + toAsker).toFixed(2)}.`,
        });
      }
    }

    // Record the decision, work out the fee and who may appeal, and stage the
    // money movements — all of it shared with /verdict so the two routes cannot
    // decide the same dispute differently. The money does NOT move here; that
    // is a separate, deliberate step after the appeal window closes.
    const applied = await applyMonetaryDecision({
      disputeId: parseInt(id),
      decision,
      notes,
      toDoer,
      toAsker,
      adminUserId: userId,
      waiveFee: !!req.body.waiveFee,
      waiveFeeReason: req.body.waiveFeeReason || null,
    });
    const result = { rows: [applied.dispute] };

    // Hana drafts what each side will be told, using the admin's own reasoning.
    // Drafted only — an admin reads and sends it. Runs in the background so the
    // decision itself never waits on the AI.
    draftAndStoreOutcomeMessages(parseInt(id)).catch((err) =>
      console.error(`[Disputes] Outcome drafting failed for ${id}:`, err)
    );

    // The hold deliberately stays on. Releasing it here would mark the funds as
    // free while nothing has actually paid anyone — the hold is lifted by the
    // settlement step once Stripe confirms the transfer/refund.

    // Map resolution to user-friendly decision message
    const decisionMap: { [key: string]: string } = {
      'approved': `Payment of $${toDoer.toFixed(2)} released to doer`,
      'rejected': `Refund of $${toAsker.toFixed(2)} issued to asker`,
      'partial': `Split: $${toDoer.toFixed(2)} to doer, $${toAsker.toFixed(2)} to asker`,
    };

    const decisionMessage = decisionMap[decision] || 'Dispute resolved';

    // Get user details for emails
    const askerResult = await db.query(
      `SELECT COALESCE(alias, display_name) AS name, email FROM users WHERE id = $1`,
      [dispute.asker_id]
    );
    const askerName = askerResult.rows[0]?.name || 'A user';
    const askerEmail = askerResult.rows[0]?.email;

    const doerResult = await db.query(
      `SELECT COALESCE(alias, display_name) AS name, email FROM users WHERE id = $1`,
      [dispute.doer_id]
    );
    const doerName = doerResult.rows[0]?.name || 'A user';
    const doerEmail = doerResult.rows[0]?.email;

    // Notify both parties
    try {
      await notifyDisputeResolved(
        dispute.asker_id,
        dispute.title,
        decisionMessage,
        `#${dispute.id}`
      );

      await notifyDisputeResolved(
        dispute.doer_id,
        dispute.title,
        decisionMessage,
        `#${dispute.id}`
      );
    } catch (notifyErr) {
      console.warn('[Disputes] Failed to send resolution notifications:', notifyErr);
    }

    // Send resolution emails
    try {
      if (askerEmail) {
        await sendDisputeResolvedEmail(
          askerEmail,
          askerName,
          dispute.title,
          resolution,
          decisionMessage,
          dispute.id
        );
      }

      if (doerEmail) {
        await sendDisputeResolvedEmail(
          doerEmail,
          doerName,
          dispute.title,
          resolution,
          decisionMessage,
          dispute.id
        );
      }
    } catch (emailErr) {
      console.warn('[Disputes] Failed to send resolution emails:', emailErr);
      // Don't fail the resolution if emails fail
    }

    res.json({ success: true, dispute: result.rows[0] });
  } catch (error) {
    console.error('[Disputes] Resolve error:', error);
    res.status(500).json({ error: 'Resolution failed' });
  }
});

// POST /api/disputes/:id/defense - Defendant submits response
router.post('/:id/defense', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const disputeId = parseInt(req.params.id);
    const userId = parseInt(req.userId || '0', 10);
    const { response, evidence } = req.body;

    if (!response || response.trim().length < 20) {
      return res.status(400).json({ error: 'Response must be at least 20 characters' });
    }

    // Verify this user is the defendant
    const dispute = await db.query(
      `SELECT id, defendant_user_id, response_deadline, response_status FROM disputes WHERE id = $1`,
      [disputeId]
    );

    if (dispute.rows.length === 0) {
      return res.status(404).json({ error: 'Dispute not found' });
    }

    const d = dispute.rows[0];

    if (d.defendant_user_id !== userId) {
      return res.status(403).json({ error: 'Only the defendant can submit a defense' });
    }

    if (d.response_status !== 'pending') {
      return res.status(400).json({ error: 'Defense response already submitted or forfeited' });
    }

    if (new Date() > new Date(d.response_deadline)) {
      // Mark as forfeited
      await db.query(
        `UPDATE disputes SET response_status = 'forfeited', response_submitted_at = NOW() WHERE id = $1`,
        [disputeId]
      );
      return res.status(400).json({ error: 'Response deadline has passed. Forfeited right to respond.' });
    }

    // Store defendant's response
    await db.query(
      `UPDATE disputes
       SET defendant_response = $1, defendant_response_evidence = $2, response_status = 'received', response_submitted_at = NOW()
       WHERE id = $3`,
      [response, evidence ? JSON.stringify(evidence) : null, disputeId]
    );

    // Update defense request
    await db.query(
      `UPDATE dispute_defense_requests SET response_received = true, response_received_at = NOW() WHERE dispute_id = $1`,
      [disputeId]
    );

    console.log(`[Disputes] Defense response submitted for dispute ${disputeId}`);

    res.json({ success: true, message: 'Defense response submitted successfully' });
  } catch (error) {
    console.error('[Disputes] Defense submission error:', error);
    res.status(500).json({ error: 'Failed to submit defense response' });
  }
});

// ============ 3-DAY RESOLUTION SYSTEM ENDPOINTS ============

// POST /api/disputes/:id/request-extension - Request extension (max 1 × 12h)
router.post('/:id/request-extension', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const disputeId = parseInt(req.params.id);
    const { reason } = req.body;

    const dispute = await db.query(
      `SELECT id, status, response_deadline, created_at, defendant_user_id
         FROM disputes WHERE id = $1`,
      [disputeId]
    );

    if (dispute.rows.length === 0) {
      return res.status(404).json({ error: 'Dispute not found' });
    }

    const d = dispute.rows[0];

    // Only the person being asked to respond can ask for longer to respond.
    // This was open to any logged-in user, on any dispute.
    if (Number(d.defendant_user_id) !== parseInt(req.userId || '0', 10)) {
      return res.status(403).json({ error: 'Only the person asked to respond can request more time.' });
    }
    const now = new Date();
    const autoResolveTime = new Date(d.created_at.getTime() + 48 * 60 * 60 * 1000); // T+48h

    if (now > new Date(d.response_deadline)) {
      return res.status(400).json({ error: 'Response deadline has passed' });
    }

    // Mark extension requested
    await db.query(
      `UPDATE disputes SET extension_requested = true, extension_reason = $1 WHERE id = $2`,
      [reason, disputeId]
    );

    res.json({
      success: true,
      message: 'Extension request submitted. Admin will review within 30 minutes.',
      hoursUntilAutoResolve: Math.round((autoResolveTime.getTime() - now.getTime()) / (1000 * 60 * 60)),
    });
  } catch (error) {
    console.error('[Disputes] Extension request error:', error);
    res.status(500).json({ error: 'Failed to request extension' });
  }
});

// POST /api/disputes/:id/approve-extension (admin only)
router.post('/:id/approve-extension', adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const disputeId = parseInt(req.params.id);

    const dispute = await db.query(
      `SELECT id, response_deadline FROM disputes WHERE id = $1`,
      [disputeId]
    );

    if (dispute.rows.length === 0) {
      return res.status(404).json({ error: 'Dispute not found' });
    }

    const currentDeadline = new Date(dispute.rows[0].response_deadline);
    const newDeadline = new Date(currentDeadline.getTime() + 12 * 60 * 60 * 1000); // +12h

    await db.query(
      `UPDATE disputes
       SET response_deadline = $1, extension_approved_at = NOW(), extension_approved = true
       WHERE id = $2`,
      [newDeadline, disputeId]
    );

    res.json({
      success: true,
      message: 'Extension approved. New deadline: +12 hours.',
      newDeadline: newDeadline.toISOString(),
    });
  } catch (error) {
    console.error('[Disputes] Extension approval error:', error);
    res.status(500).json({ error: 'Failed to approve extension' });
  }
});

// POST /api/disputes/:id/deny-extension (admin only)
router.post('/:id/deny-extension', adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const disputeId = parseInt(req.params.id);
    const { reason } = req.body;

    // RETURNING, because the UPDATE matched nothing on a dispute id that does
    // not exist and this still reported "Extension denied" — success for
    // something that never happened.
    const denied = await db.query(
      `UPDATE disputes
       SET extension_denied_at = NOW(), extension_requested = false
       WHERE id = $1
       RETURNING id`,
      [disputeId]
    );
    if (denied.rows.length === 0) {
      return res.status(404).json({ error: 'Dispute not found' });
    }

    res.json({
      success: true,
      message: 'Extension denied. Original deadline remains.',
    });
  } catch (error) {
    console.error('[Disputes] Extension denial error:', error);
    res.status(500).json({ error: 'Failed to deny extension' });
  }
});

// POST /api/disputes/:id/verdict (admin only - before T+48h)
// POST /api/disputes/:id/verdict — the same decision, in the older vocabulary.
//
// This used to be a second, parallel decision path: it wrote status
// 'VERDICT_ISSUED' and the verdict_* columns and stopped there. It never set
// `resolution`, which is the column both the appeal route and the settlement
// check read, so a dispute decided here could be neither appealed nor paid —
// it announced "parties have 12 hours to appeal" and then refused every appeal,
// and sat decided-but-frozen forever. It now translates its vocabulary onto the
// one decision path and records the verdict columns alongside, so anything
// still reading them keeps working.
router.post('/:id/verdict', adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const disputeId = parseInt(req.params.id);
    const { decision, doerAmount, companyAmount, reasoning } = req.body;
    const userId = parseInt(req.userId || '0', 10);

    if (!['APPROVE_DOER', 'APPROVE_COMPANY', 'PARTIAL_SPLIT'].includes(decision)) {
      return res.status(400).json({ error: 'Invalid decision type' });
    }
    if (!reasoning || !String(reasoning).trim()) {
      return res.status(400).json({ error: 'Reasoning is required — both parties will read it.' });
    }

    const ctx = await db.query(
      `SELECT d.id, d.errand_id, d.settlement_status,
              COALESCE(ab.amount, e.budget) AS total
         FROM disputes d
         JOIN errands e ON e.id = d.errand_id
         LEFT JOIN bids ab ON ab.id = e.accepted_bid_id
        WHERE d.id = $1`,
      [disputeId]
    );
    if (ctx.rows.length === 0) {
      return res.status(404).json({ error: 'Dispute not found' });
    }
    const total = Number(ctx.rows[0].total ?? 0);

    // 'company' here is the side that paid — the asker on an individual errand,
    // the company when a company posted it. Either way the money goes back.
    let toDoer = 0;
    let toAsker = 0;
    if (decision === 'APPROVE_DOER') {
      toDoer = total;
    } else if (decision === 'APPROVE_COMPANY') {
      toAsker = total;
    } else {
      toDoer = Number(doerAmount);
      toAsker = Number(companyAmount);
      if (!isFinite(toDoer) || !isFinite(toAsker) || toDoer < 0 || toAsker < 0) {
        return res.status(400).json({ error: 'A split needs both amounts as positive numbers.' });
      }
      if (Math.abs(toDoer + toAsker - total) > 0.01) {
        return res.status(400).json({
          error: `The split must add up to the errand total of $${total.toFixed(2)}. You entered $${(toDoer + toAsker).toFixed(2)}.`,
        });
      }
    }

    const applied = await applyMonetaryDecision({
      disputeId,
      decision: decision === 'APPROVE_DOER' ? 'approved' : decision === 'APPROVE_COMPANY' ? 'rejected' : 'partial',
      notes: String(reasoning).trim(),
      toDoer,
      toAsker,
      adminUserId: userId,
    });

    // Kept in step for anything still reading the verdict vocabulary.
    await db.query(
      `UPDATE disputes
          SET verdict_issued_at = NOW(), verdict_decision = $1,
              verdict_doer_amount = $2, verdict_company_amount = $3,
              verdict_reasoning = $4, verdict_issued_by = 'admin'
        WHERE id = $5`,
      [decision, toDoer, toAsker, String(reasoning).trim(), disputeId]
    );

    draftAndStoreOutcomeMessages(disputeId).catch((err) =>
      console.error(`[Disputes] Outcome drafting failed for ${disputeId}:`, err)
    );

    res.json({
      success: true,
      message: applied.appeal.immediate
        ? `Verdict issued: ${decision}. Nobody can appeal this one, so it is ready to release.`
        : `Verdict issued: ${decision}. ${applied.appeal.reason}`,
      dispute: applied.dispute,
      appealDeadline: applied.appeal.windowClosesAt.toISOString(),
    });
  } catch (error: any) {
    console.error('[Disputes] Verdict error:', error);
    res.status(500).json({ error: error?.message || 'Failed to issue verdict' });
  }
});

// POST /api/disputes/:id/appeal
//
// Appeal rights follow participation: the claimant filed so always qualifies,
// the defendant qualifies only if they actually responded. A forfeited
// defendant cannot appeal — which is what makes the no-response case settle
// straight away. Both are decided at resolution time and stored on the row.
router.post('/:id/appeal', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const disputeId = parseInt(req.params.id);
    const userId = parseInt(req.userId || '0', 10);
    const { reason } = req.body;

    if (!reason || String(reason).trim().length < 20) {
      return res.status(400).json({
        error: 'Tell us what specifically was wrong or what new information you have — at least a sentence.',
      });
    }

    const dispute = await db.query(
      `SELECT d.id, d.status, d.resolution, d.appeal_window_closes_at, d.appeal_round,
              d.claimant_can_appeal, d.defendant_can_appeal,
              d.filed_by_user_id, d.defendant_user_id, d.settlement_status
         FROM disputes d WHERE d.id = $1`,
      [disputeId]
    );
    if (dispute.rows.length === 0) {
      return res.status(404).json({ error: 'Dispute not found' });
    }
    const d = dispute.rows[0];

    if (!d.resolution) {
      return res.status(400).json({ error: 'There is no decision to appeal yet.' });
    }
    // One round only — an appeal decision is final
    if (d.appeal_round >= 1) {
      return res.status(400).json({ error: 'This dispute has already been through an appeal. That decision is final.' });
    }
    // Anything past 'not_started' means the release has been attempted, and a
    // half-failed attempt may already have paid one leg. Once real money has
    // left, an appeal cannot put it back.
    if (d.settlement_status && d.settlement_status !== 'not_started') {
      return res.status(400).json({ error: 'The money has already been released, so this can no longer be appealed.' });
    }

    const isClaimant = Number(d.filed_by_user_id) === userId;
    const isDefendant = Number(d.defendant_user_id) === userId;
    if (!isClaimant && !isDefendant) {
      return res.status(403).json({ error: 'Only the two people involved can appeal this.' });
    }

    if (isClaimant && !d.claimant_can_appeal) {
      return res.status(403).json({ error: 'You received the outcome you asked for, so there is nothing to appeal.' });
    }
    if (isDefendant && !d.defendant_can_appeal) {
      return res.status(403).json({
        error: 'You did not respond when this was raised with you, so the decision stands and cannot be appealed.',
      });
    }

    const closesAt = d.appeal_window_closes_at ? new Date(d.appeal_window_closes_at) : null;
    if (!closesAt || new Date() > closesAt) {
      return res.status(400).json({ error: 'The appeal window for this decision has closed.' });
    }

    await db.query(
      `UPDATE disputes
       SET status = 'admin_review',
           has_appeal = true,
           appeal_submitted_at = NOW(),
           appeal_reason = $1,
           appeal_round = 1,
           appeal_reviewed_at = NULL
       WHERE id = $2`,
      [String(reason).trim(), disputeId]
    );

    const minutes = Math.max(0, Math.round((closesAt.getTime() - Date.now()) / 60000));
    res.json({
      success: true,
      message: 'Appeal submitted. Nothing will be paid out until an admin has looked at it again.',
      timeRemainingInWindow: `${minutes} minutes`,
    });
  } catch (error) {
    console.error('[Disputes] Appeal submission error:', error);
    res.status(500).json({ error: 'Failed to submit appeal' });
  }
});

// POST /api/disputes/:id/resolve-appeal (admin only)
//
// The appeal decision is the one that gets paid, so it has to rewrite the
// settlement — and it did not. It read and wrote verdict_doer_amount /
// verdict_company_amount, while everything that actually moves money reads
// settlement_doer_amount / settlement_asker_amount and the staged settlement
// legs. An appeal only ever reaches a dispute decided through /resolve, which
// never fills the verdict columns, so overturning an appeal wrote NULLs into
// columns nobody pays from, left the original legs untouched, and then cleared
// appeal_reviewed_at — which unblocks release. The overturned split was what
// got paid. It now runs the same decision path as any other decision, which
// restates the amounts, the fee and the legs together.
router.post('/:id/resolve-appeal', adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const disputeId = parseInt(req.params.id);
    const { decision, reasoning, newDoerAmount, newCompanyAmount } = req.body;
    const userId = parseInt(req.userId || '0', 10);

    if (!['UPHELD', 'OVERTURNED', 'MODIFIED'].includes(decision)) {
      return res.status(400).json({ error: 'Invalid appeal decision' });
    }
    if (!reasoning || !String(reasoning).trim()) {
      return res.status(400).json({ error: 'Reasoning is required — both parties will read it.' });
    }

    const dispute = await db.query(
      `SELECT d.id, d.errand_id, d.settlement_status, d.has_appeal, d.appeal_submitted_at,
              d.appeal_reviewed_at, d.resolution, d.resolution_notes,
              d.settlement_doer_amount, d.settlement_asker_amount,
              COALESCE(ab.amount, e.budget) AS total
         FROM disputes d
         JOIN errands e ON e.id = d.errand_id
         LEFT JOIN bids ab ON ab.id = e.accepted_bid_id
        WHERE d.id = $1`,
      [disputeId]
    );

    if (dispute.rows.length === 0) {
      return res.status(404).json({ error: 'Dispute not found' });
    }
    const d = dispute.rows[0];

    if (!d.has_appeal && !d.appeal_submitted_at) {
      return res.status(400).json({ error: 'Nobody has appealed this decision.' });
    }
    if (d.appeal_reviewed_at) {
      return res.status(400).json({ error: 'This appeal has already been decided. That decision is final.' });
    }
    if (['pending', 'settled'].includes(d.settlement_status)) {
      return res.status(409).json({
        error: `The money on this dispute is already ${d.settlement_status}, so the appeal cannot change it.`,
      });
    }

    const total = Number(d.total ?? 0);
    const currentDoer = Number(d.settlement_doer_amount ?? 0);
    const currentAsker = Number(d.settlement_asker_amount ?? 0);

    let toDoer = currentDoer;
    let toAsker = currentAsker;

    if (decision === 'OVERTURNED') {
      // The other side wins on the same numbers.
      toDoer = currentAsker;
      toAsker = currentDoer;
    } else if (decision === 'MODIFIED') {
      toDoer = newDoerAmount === undefined || newDoerAmount === null ? currentDoer : Number(newDoerAmount);
      toAsker = newCompanyAmount === undefined || newCompanyAmount === null ? currentAsker : Number(newCompanyAmount);
      if (!isFinite(toDoer) || !isFinite(toAsker) || toDoer < 0 || toAsker < 0) {
        return res.status(400).json({ error: 'A revised split needs both amounts as positive numbers.' });
      }
      if (Math.abs(toDoer + toAsker - total) > 0.01) {
        return res.status(400).json({
          error: `The split must add up to the errand total of $${total.toFixed(2)}. You entered $${(toDoer + toAsker).toFixed(2)}.`,
        });
      }
    }

    // Which of the three outcomes the revised numbers amount to.
    const finalDecision: 'approved' | 'rejected' | 'partial' =
      toAsker <= 0.01 ? 'approved' : toDoer <= 0.01 ? 'rejected' : 'partial';

    // One round only, so this closes the window rather than opening another.
    // The fee and the settlement legs are restated from the revised amounts —
    // that is the whole point of an appeal decision.
    const applied = await applyMonetaryDecision({
      disputeId,
      decision: finalDecision,
      notes: String(reasoning).trim(),
      toDoer,
      toAsker,
      adminUserId: userId,
      waiveFee: !!req.body.waiveFee,
      waiveFeeReason: req.body.waiveFeeReason || null,
      isAppealOutcome: true,
    });

    const result = await db.query(
      `UPDATE disputes
          SET appeal_reviewed_at = NOW(),
              appeal_final_decision = $1,
              appeal_final_reasoning = $2,
              appeal_round = 1,
              verdict_doer_amount = $3,
              verdict_company_amount = $4,
              updated_at = NOW()
        WHERE id = $5
        RETURNING id, errand_id, resolution, settlement_doer_amount, settlement_asker_amount,
                  settlement_fee, appeal_final_decision, appeal_reviewed_at`,
      [decision, String(reasoning).trim(), toDoer, toAsker, disputeId]
    );

    // Both sides are told the revised outcome in the admin's own words.
    draftAndStoreOutcomeMessages(disputeId).catch((err) =>
      console.error(`[Disputes] Outcome drafting failed for ${disputeId}:`, err)
    );

    const parties = await db.query(
      `SELECT e.asker_id, ab.doer_id, e.title
         FROM disputes d JOIN errands e ON e.id = d.errand_id
         LEFT JOIN bids ab ON ab.id = e.accepted_bid_id
        WHERE d.id = $1`,
      [disputeId]
    );
    const p = parties.rows[0];
    for (const uid of [p?.asker_id, p?.doer_id].filter(Boolean)) {
      try {
        await notifyDisputeResolved(
          uid,
          p.title,
          `Appeal ${decision.toLowerCase()} — $${toDoer.toFixed(2)} to the doer, $${toAsker.toFixed(2)} refunded`,
          `#${disputeId}`
        );
      } catch (e) {
        console.warn('[Disputes] Could not notify about the appeal outcome:', e);
      }
    }

    res.json({
      success: true,
      message: `Appeal ${decision.toLowerCase()}. Final: $${toDoer.toFixed(2)} to the doer, $${toAsker.toFixed(2)} back to the asker. There is no further appeal.`,
      dispute: result.rows[0],
      settlementFee: applied.fee,
    });
  } catch (error: any) {
    console.error('[Disputes] Appeal resolution error:', error);
    res.status(500).json({ error: error?.message || 'Failed to resolve appeal' });
  }
});

// GET /api/disputes - List disputes (admin only)
router.get('/', adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const { status, priority, limit } = req.query;

    // The split form needs the errand total, and the table needs a title —
    // SELECT * off disputes alone gave neither.
    let query = `SELECT d.*, e.formatted_id, e.title, e.asker_id,
                        ab.doer_id, COALESCE(ab.amount, e.budget) AS amount
                   FROM disputes d
                   JOIN errands e ON e.id = d.errand_id
                   LEFT JOIN bids ab ON ab.id = e.accepted_bid_id
                  WHERE 1=1`;
    const params: any[] = [];

    if (status) {
      query += ` AND d.status = $${params.length + 1}`;
      params.push(status);
    }

    if (priority) {
      query += ` AND d.priority = $${params.length + 1}`;
      params.push(priority);
    }

    query += ` ORDER BY d.created_at DESC LIMIT $${params.length + 1}`;
    params.push(parseInt(limit as string) || 50);

    const result = await db.query(query, params);

    res.json({ disputes: result.rows, count: result.rows.length });
  } catch (error) {
    console.error('[Disputes] List error:', error);
    res.status(500).json({ error: 'Failed to list disputes' });
  }
});

// ============ EVIDENCE SUBMISSION ENDPOINTS ============

/**
 * Who is allowed to touch this dispute's evidence, and as which side.
 *
 * Evidence is the most sensitive thing in the module — photos of homes, faces,
 * vehicles, documents — so every read, write and delete goes through this rather
 * than each handler rolling its own check.
 */
async function evidenceAccess(disputeId: number, userId: number) {
  const result = await db.query(
    `SELECT d.id, d.filed_by_user_id, d.defendant_user_id, d.raised_by_staff_id,
            d.settlement_status, d.status,
            e.asker_id, ab.doer_id
       FROM disputes d
       JOIN errands e ON e.id = d.errand_id
       LEFT JOIN bids ab ON ab.id = e.accepted_bid_id
      WHERE d.id = $1`,
    [disputeId]
  );
  if (result.rows.length === 0) return { found: false as const };

  const d = result.rows[0];
  const party = [d.filed_by_user_id, d.defendant_user_id, d.raised_by_staff_id, d.asker_id, d.doer_id]
    .filter(Boolean)
    .map(Number)
    .includes(userId);

  let admin = false;
  if (!party) {
    const role = await db.query('SELECT role FROM users WHERE id = $1', [userId]);
    admin = ['admin', 'super-admin', 'support_l2', 'support_l3'].includes(role.rows[0]?.role);
  }

  return { found: true as const, dispute: d, party, admin, allowed: party || admin };
}

// What a browser may send us, and how much of it. Deliberately narrow: these
// are pictures of what happened, not an attachment store.
const EVIDENCE_MIME = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
const EVIDENCE_MAX_BYTES = 6_000_000; // ~6MB of decoded file per item
const EVIDENCE_MAX_PER_PARTY = 10;

// POST /api/disputes/:id/evidence — submit photos or a written note
//
// Sent as base64 data URLs in JSON, not multipart. That is the pattern this
// codebase already uses for the one upload that works (the ACRA company
// document): there is no object storage here — uploads.ts is still a stub
// returning a placeholder URL — and no multipart parser is mounted. The old
// handler read `req.files`, which was therefore always undefined, so every
// upload since this route was written failed with a misleading validation error.
router.post('/:id/evidence', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const disputeId = parseInt(req.params.id, 10);
    const userId = parseInt(req.userId || '0', 10);
    const { files, description, gps } = req.body || {};

    const access = await evidenceAccess(disputeId, userId);
    if (!access.found) return res.status(404).json({ error: 'Dispute not found' });
    if (!access.allowed) {
      return res.status(403).json({ error: 'Only the people involved in this dispute can add evidence.' });
    }

    // Once the money has moved the case is closed; new evidence then is a
    // support conversation, not a submission that could change an outcome.
    if (access.dispute.settlement_status && access.dispute.settlement_status !== 'not_started') {
      return res.status(409).json({
        error: 'This dispute has already been settled, so evidence can no longer be added.',
      });
    }

    const list: any[] = Array.isArray(files) ? files : [];
    const note = typeof description === 'string' ? description.trim() : '';

    if (list.length === 0 && !note) {
      return res.status(400).json({ error: 'Add a photo or write what happened — one or the other.' });
    }

    const existing = await db.query(
      `SELECT count(*)::int AS n FROM dispute_evidence
        WHERE dispute_id = $1 AND submitted_by_user_id = $2 AND photo_data IS NOT NULL`,
      [disputeId, userId]
    );
    if (Number(existing.rows[0].n) + list.length > EVIDENCE_MAX_PER_PARTY) {
      return res.status(400).json({
        error: `You can attach up to ${EVIDENCE_MAX_PER_PARTY} files. You already have ${existing.rows[0].n}.`,
      });
    }

    // Validate everything BEFORE writing anything, so a bad third file does not
    // leave the first two stored.
    const staged: { mime: string; name: string; data: string; bytes: number }[] = [];
    for (const f of list) {
      const data = typeof f?.data === 'string' ? f.data : '';
      const match = /^data:([a-z0-9/+.-]+);base64,/i.exec(data);
      if (!match) {
        return res.status(400).json({ error: `"${f?.name || 'A file'}" was not sent in a format we can read.` });
      }
      const mime = match[1].toLowerCase();
      if (!EVIDENCE_MIME.includes(mime)) {
        return res.status(400).json({
          error: `We can take photos (JPEG, PNG, WebP) and PDFs. "${f?.name || 'That file'}" is ${mime}.`,
        });
      }
      // 4 base64 chars encode 3 bytes; close enough to reject before decoding.
      const bytes = Math.floor(((data.length - match[0].length) * 3) / 4);
      if (bytes > EVIDENCE_MAX_BYTES) {
        return res.status(400).json({
          error: `"${f?.name || 'That file'}" is ${(bytes / 1e6).toFixed(1)}MB. The limit is ${EVIDENCE_MAX_BYTES / 1e6}MB per file.`,
        });
      }
      staged.push({ mime, name: String(f?.name || 'evidence').slice(0, 255), data, bytes });
    }

    const inserted: number[] = [];
    for (const f of staged) {
      const row = await db.query(
        `INSERT INTO dispute_evidence
           (dispute_id, evidence_type, submitted_by_user_id, photo_data, photo_mime,
            photo_filename, photo_bytes, photo_description, photo_timestamp,
            gps_latitude, gps_longitude, gps_timestamp)
         VALUES ($1, 'photo', $2, $3, $4, $5, $6, $7, NOW(), $8, $9, $10)
         RETURNING id`,
        [
          disputeId, userId, f.data, f.mime, f.name, f.bytes, note || null,
          gps?.latitude ?? null, gps?.longitude ?? null, gps?.timestamp ?? null,
        ]
      );
      inserted.push(row.rows[0].id);
    }

    // A written statement with no photo is still evidence.
    if (list.length === 0 && note) {
      const row = await db.query(
        `INSERT INTO dispute_evidence (dispute_id, evidence_type, submitted_by_user_id, description_text)
         VALUES ($1, 'statement', $2, $3) RETURNING id`,
        [disputeId, userId, note]
      );
      inserted.push(row.rows[0].id);
    }

    res.status(201).json({
      success: true,
      count: inserted.length,
      evidenceIds: inserted,
      message: 'Thanks — this has been added to the case.',
    });
  } catch (error: any) {
    console.error('[Disputes] Evidence submission error:', error);
    res.status(500).json({ error: 'Could not save that. Please try again.' });
  }
});

// GET /api/disputes/:id/evidence — the list, metadata only
//
// Deliberately does NOT include the file bytes. Ten 6MB photos would be a 60MB
// JSON response for a screen that only needs to draw a list; the viewer pulls
// each image from the detail endpoint below when it actually shows it.
router.get('/:id/evidence', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const disputeId = Number(req.params.id);
    const userId = parseInt(req.userId || '0', 10);
    const { party } = req.query; // optional filter: 'doer' | 'company'

    const access = await evidenceAccess(disputeId, userId);
    if (!access.found) return res.status(404).json({ error: 'Dispute not found' });
    if (!access.allowed) return res.status(403).json({ error: 'You are not involved in this dispute.' });

    const result = await db.query(
      `SELECT ev.id, ev.evidence_type, ev.submitted_by_user_id, ev.submitted_at,
              ev.photo_filename, ev.photo_mime, ev.photo_bytes, ev.photo_description,
              ev.description_text, ev.gps_latitude, ev.gps_longitude,
              (ev.photo_data IS NOT NULL) AS has_file
         FROM dispute_evidence ev
        WHERE ev.dispute_id = $1
        ORDER BY ev.submitted_at DESC`,
      [disputeId]
    );

    const doerId = Number(access.dispute.doer_id);
    const evidence = result.rows
      .map((e: any) => ({
        id: e.id,
        submittedBy: Number(e.submitted_by_user_id) === doerId ? 'doer' : 'company',
        isMine: Number(e.submitted_by_user_id) === userId,
        type: e.has_file ? (e.photo_mime === 'application/pdf' ? 'document' : 'photo') : 'text',
        fileName: e.photo_filename || `${e.evidence_type} note`,
        mime: e.photo_mime || null,
        size: Number(e.photo_bytes || 0),
        isCompressed: false,
        uploadedAt: e.submitted_at,
        aiStatus: 'COMPLETED',
        note: e.photo_description || e.description_text || null,
        gps: e.gps_latitude ? { latitude: Number(e.gps_latitude), longitude: Number(e.gps_longitude) } : null,
        // Needs an Authorization header, so it is fetched rather than used as a src
        url: e.has_file ? `/api/disputes/${disputeId}/evidence/${e.id}` : undefined,
      }))
      .filter((e: any) => (party === 'doer' || party === 'company' ? e.submittedBy === party : true));

    res.json({ success: true, count: evidence.length, evidence });
  } catch (error: any) {
    console.error('[Disputes] Get evidence error:', error);
    res.status(500).json({ error: 'Failed to load evidence' });
  }
});

// GET /api/disputes/:id/evidence/:evidenceId — one file, as a data URL
router.get('/:id/evidence/:evidenceId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const disputeId = parseInt(req.params.id, 10);
    const evidenceId = parseInt(req.params.evidenceId, 10);
    const userId = parseInt(req.userId || '0', 10);

    const access = await evidenceAccess(disputeId, userId);
    if (!access.found) return res.status(404).json({ error: 'Dispute not found' });
    if (!access.allowed) return res.status(403).json({ error: 'You are not involved in this dispute.' });

    const result = await db.query(
      `SELECT id, photo_data, photo_mime, photo_filename, photo_bytes, photo_description,
              description_text, evidence_type, submitted_at
         FROM dispute_evidence WHERE id = $1 AND dispute_id = $2`,
      [evidenceId, disputeId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Evidence not found' });

    const e = result.rows[0];
    res.json({
      success: true,
      data: {
        id: e.id,
        type: e.evidence_type,
        fileName: e.photo_filename,
        mime: e.photo_mime,
        size: Number(e.photo_bytes || 0),
        note: e.photo_description || e.description_text || null,
        uploadedAt: e.submitted_at,
        // Null once the retention window has stripped the image; the record of
        // what was submitted survives it.
        dataUrl: e.photo_data || null,
      },
    });
  } catch (error: any) {
    console.error('[Disputes] Evidence detail error:', error);
    res.status(500).json({ error: 'Could not load that file' });
  }
});

// DELETE /api/disputes/:id/evidence/:evidenceId
//
// Your own, and only while the dispute is still open. Once a decision has been
// recorded the evidence is part of what was decided on, and letting a party pull
// it afterwards would leave the reasoning referring to something that no longer
// exists. Admins are not given a delete here either — a takedown request is a
// retention decision, not a button.
router.delete('/:id/evidence/:evidenceId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const disputeId = parseInt(req.params.id, 10);
    const evidenceId = parseInt(req.params.evidenceId, 10);
    const userId = parseInt(req.userId || '0', 10);

    const access = await evidenceAccess(disputeId, userId);
    if (!access.found) return res.status(404).json({ error: 'Dispute not found' });
    if (!access.allowed) return res.status(403).json({ error: 'You are not involved in this dispute.' });

    const owned = await db.query(
      `SELECT submitted_by_user_id FROM dispute_evidence WHERE id = $1 AND dispute_id = $2`,
      [evidenceId, disputeId]
    );
    if (owned.rows.length === 0) return res.status(404).json({ error: 'Evidence not found' });
    if (Number(owned.rows[0].submitted_by_user_id) !== userId) {
      return res.status(403).json({ error: 'You can only remove evidence you added yourself.' });
    }
    if (['resolved', 'closed'].includes(access.dispute.status)) {
      return res.status(409).json({
        error: 'This dispute has already been decided, so the evidence it was decided on cannot be removed.',
      });
    }

    await db.query('DELETE FROM dispute_evidence WHERE id = $1 AND dispute_id = $2', [evidenceId, disputeId]);
    res.json({ success: true, message: 'Removed.' });
  } catch (error: any) {
    console.error('[Disputes] Evidence delete error:', error);
    res.status(500).json({ error: 'Could not remove that' });
  }
});

// GET /api/disputes/:id/fee-preview?doerAmount=120 — live fee breakdown for the
// resolution form, so the admin sees what the doer actually receives before
// committing. Driven by the real rate, not a hardcoded 20%.
router.get('/:id/fee-preview', adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const disputeId = parseInt(req.params.id, 10);
    const errand = await db.query('SELECT errand_id FROM disputes WHERE id = $1', [disputeId]);
    if (errand.rows.length === 0) return res.status(404).json({ error: 'Dispute not found' });

    const breakdown = await calculateDisputeFee({
      errandId: errand.rows[0].errand_id,
      doerAmount: Number(req.query.doerAmount) || 0,
      waived: req.query.waiveFee === 'true',
    });

    res.json({ success: true, data: breakdown });
  } catch (error) {
    console.error('[Disputes] Fee preview error:', error);
    res.status(500).json({ error: 'Could not calculate the fee' });
  }
});

// GET /api/disputes/:id/settlement — where this dispute stands on releasing money
router.get('/:id/settlement', adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const disputeId = parseInt(req.params.id, 10);
    const readiness = await checkSettlementReadiness(disputeId);
    const legs = await db.query(
      `SELECT leg, amount, status, stripe_reference, error_message, attempts, succeeded_at
         FROM dispute_settlement_legs WHERE dispute_id = $1 ORDER BY leg`,
      [disputeId]
    );

    // Only worth checking Stripe once the clock has actually run out
    const preflight = readiness.ready ? await preflightSettlement(disputeId) : null;

    res.json({ success: true, data: { readiness, preflight, legs: legs.rows } });
  } catch (error) {
    console.error('[Disputes] Settlement status error:', error);
    res.status(500).json({ error: 'Could not load settlement status' });
  }
});

// POST /api/disputes/:id/settle — the money actually moves here, and only here.
//
// Separate from /resolve on purpose: /resolve records the decision and prepares
// the legs; this pays them. Splitting the two keeps the real Stripe transfers
// as one explicit, admin-triggered, auditable action rather than a side effect
// of recording a verdict. It refuses unless readiness says the dispute is
// actually ready (appeal window closed, doer payout account working), so a
// premature click cannot pay out over an open appeal.
router.post('/:id/settle', adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const disputeId = parseInt(req.params.id, 10);

    const readiness = await checkSettlementReadiness(disputeId);
    if (!readiness.ready && !req.body?.override) {
      return res.status(409).json({
        error: 'Not ready to settle yet.',
        readiness,
      });
    }

    const result = await executeSettlement(disputeId);
    console.log(`[Disputes] Settlement executed for ${disputeId} by admin ${req.userId}:`,
      result.legs.map((l) => `${l.leg}=${l.status}`).join(', '));

    res.json({
      success: result.allSettled,
      message: result.allSettled
        ? 'Settled. Both parties have been paid their share.'
        : 'Some legs could not be paid — see the details and retry.',
      data: result,
    });
  } catch (error) {
    console.error('[Disputes] Settle error:', error);
    res.status(500).json({ error: 'Could not settle the dispute' });
  }
});

// GET /api/disputes/queues/ready-to-release — decided, appeal window closed, unpaid
router.get('/queues/ready-to-release', adminOnly, async (_req: AuthRequest, res: Response) => {
  try {
    const result = await db.query(
      `SELECT d.id, d.resolution, d.settlement_doer_amount, d.settlement_asker_amount,
              d.settlement_fee, d.appeal_window_closes_at, d.resolved_at,
              e.formatted_id, e.title
         FROM disputes d
         JOIN errands e ON e.id = d.errand_id
        WHERE d.resolution IS NOT NULL
          AND d.settlement_status = 'not_started'
          AND d.appeal_window_closes_at IS NOT NULL
          AND d.appeal_window_closes_at <= NOW()
          AND NOT (COALESCE(d.has_appeal, false) AND d.appeal_reviewed_at IS NULL)
        ORDER BY d.appeal_window_closes_at ASC
        LIMIT 100`
    );
    res.json({ success: true, data: { disputes: result.rows, total: result.rows.length } });
  } catch (error) {
    console.error('[Disputes] Ready-to-release error:', error);
    res.status(500).json({ error: 'Could not load the release queue' });
  }
});

// GET /api/disputes/queues/needs-attention — settlements that failed part-way
router.get('/queues/needs-attention', adminOnly, async (_req: AuthRequest, res: Response) => {
  try {
    const result = await db.query(
      `SELECT d.id, e.formatted_id, e.title,
              l.leg, l.amount, l.status, l.error_code, l.error_message, l.attempts, l.last_attempt_at
         FROM dispute_settlement_legs l
         JOIN disputes d ON d.id = l.dispute_id
         JOIN errands e ON e.id = d.errand_id
        WHERE l.status = 'failed'
        ORDER BY l.last_attempt_at DESC NULLS LAST
        LIMIT 100`
    );
    res.json({ success: true, data: { legs: result.rows, total: result.rows.length } });
  } catch (error) {
    console.error('[Disputes] Needs-attention error:', error);
    res.status(500).json({ error: 'Could not load the attention queue' });
  }
});

// GET /api/disputes/:id/outcome-messages — the drafts, for the admin to review
router.get('/:id/outcome-messages', adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const disputeId = parseInt(req.params.id, 10);
    const result = await db.query(
      `SELECT outcome_message_asker, outcome_message_doer,
              outcome_messages_drafted_at, outcome_messages_sent_at
         FROM disputes WHERE id = $1`,
      [disputeId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Dispute not found' });

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('[Disputes] Outcome messages fetch error:', error);
    res.status(500).json({ error: 'Could not load the drafted messages' });
  }
});

// POST /api/disputes/:id/outcome-messages/regenerate — ask Hana for another draft
router.post('/:id/outcome-messages/regenerate', adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const disputeId = parseInt(req.params.id, 10);
    const sent = await db.query('SELECT outcome_messages_sent_at FROM disputes WHERE id = $1', [disputeId]);
    if (sent.rows[0]?.outcome_messages_sent_at) {
      return res.status(409).json({ error: 'These messages have already been sent.' });
    }

    const messages = await draftAndStoreOutcomeMessages(disputeId);
    if (!messages) return res.status(400).json({ error: 'Decide the dispute first, then Hana can draft the messages.' });

    res.json({ success: true, data: messages });
  } catch (error) {
    console.error('[Disputes] Regenerate error:', error);
    res.status(500).json({ error: 'Could not draft new messages' });
  }
});

// POST /api/disputes/:id/outcome-messages/send — admin approves and sends
//
// The admin may have edited the drafts, so whatever they submit is what goes
// out and what gets stored. Nothing sends without this call.
router.post('/:id/outcome-messages/send', adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const disputeId = parseInt(req.params.id, 10);
    const userId = parseInt(req.userId || '0', 10);
    const { askerMessage, doerMessage } = req.body || {};

    if (!askerMessage?.trim() || !doerMessage?.trim()) {
      return res.status(400).json({ error: 'Both messages need to say something before they go out.' });
    }

    const found = await db.query(
      `SELECT d.id, d.resolution, d.outcome_messages_sent_at, e.title, e.asker_id, ab.doer_id
         FROM disputes d
         JOIN errands e ON e.id = d.errand_id
         LEFT JOIN bids ab ON ab.id = e.accepted_bid_id
        WHERE d.id = $1`,
      [disputeId]
    );
    if (found.rows.length === 0) return res.status(404).json({ error: 'Dispute not found' });

    const d = found.rows[0];
    if (!d.resolution) return res.status(400).json({ error: 'This dispute has not been decided yet.' });
    if (d.outcome_messages_sent_at) {
      return res.status(409).json({ error: 'These messages have already gone out.' });
    }

    // In-app notification for each side
    for (const [uid, message] of [
      [d.asker_id, askerMessage],
      [d.doer_id, doerMessage],
    ] as [number, string][]) {
      if (!uid) continue;
      await db.query(
        `INSERT INTO notifications (user_id, type, title, message, related_errand_id)
         VALUES ($1, 'dispute_resolved', $2, $3, (SELECT errand_id FROM disputes WHERE id = $4))`,
        [uid, `Outcome for "${d.title}"`, message, disputeId]
      );
    }

    await db.query(
      `UPDATE disputes
          SET outcome_message_asker = $1, outcome_message_doer = $2,
              outcome_messages_sent_at = NOW(), outcome_messages_sent_by = $3
        WHERE id = $4`,
      [askerMessage, doerMessage, userId, disputeId]
    );

    res.json({ success: true, message: 'Both neighbours have been told.' });
  } catch (error) {
    console.error('[Disputes] Send outcome error:', error);
    res.status(500).json({ error: 'Could not send the messages' });
  }
});

// POST /api/disputes/:id/rework-response — asker or doer accepts/declines a rework
//
// Both must accept. Either declining sends it straight back to the admin for a
// compensation decision — nobody can be made to rework work, and nobody can be
// made to take a rework instead of their money.
router.post('/:id/rework-response', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const disputeId = parseInt(req.params.id, 10);
    const userId = parseInt(req.userId || '0', 10);
    const { accept, reason } = req.body || {};

    if (typeof accept !== 'boolean') {
      return res.status(400).json({ error: 'Let us know whether you agree to the rework.' });
    }

    const found = await db.query(
      `SELECT d.id, d.resolution_kind, d.rework_outcome, d.rework_consent_deadline,
              d.rework_asker_response, d.rework_doer_response, d.rework_deadline,
              e.id AS errand_id, e.title, e.asker_id, ab.doer_id
         FROM disputes d
         JOIN errands e ON e.id = d.errand_id
         LEFT JOIN bids ab ON ab.id = e.accepted_bid_id
        WHERE d.id = $1`,
      [disputeId]
    );
    if (found.rows.length === 0) return res.status(404).json({ error: 'Dispute not found' });

    const d = found.rows[0];
    if (d.resolution_kind !== 'rework') {
      return res.status(400).json({ error: 'There is no rework to respond to on this one.' });
    }
    if (d.rework_outcome) {
      return res.status(409).json({ error: 'This rework has already been settled one way or the other.' });
    }
    if (d.rework_consent_deadline && new Date() > new Date(d.rework_consent_deadline)) {
      return res.status(400).json({ error: 'The window to agree has passed — an admin is deciding the compensation.' });
    }

    const isAsker = Number(d.asker_id) === userId;
    const isDoer = Number(d.doer_id) === userId;
    if (!isAsker && !isDoer) {
      return res.status(403).json({ error: 'Only the two people on this errand can respond.' });
    }

    const answer = accept ? 'accepted' : 'declined';
    const column = isAsker ? 'rework_asker_response' : 'rework_doer_response';
    await db.query(`UPDATE disputes SET ${column} = $1, updated_at = NOW() WHERE id = $2`, [answer, disputeId]);

    // A decline ends it immediately — no point waiting on the other side
    if (!accept) {
      await db.query(
        `UPDATE disputes
            SET rework_outcome = 'declined',
                rework_declined_by = $1,
                rework_decline_reason = $2,
                status = 'admin_review',
                updated_at = NOW()
          WHERE id = $3`,
        [isAsker ? 'asker' : 'doer', reason ? String(reason).slice(0, 500) : null, disputeId]
      );
      return res.json({
        success: true,
        data: { outcome: 'declined', message: "Understood — we'll decide this one ourselves and be in touch." },
      });
    }

    // Both sides in? Then the rework is on.
    const askerOk = isAsker ? true : d.rework_asker_response === 'accepted';
    const doerOk = isDoer ? true : d.rework_doer_response === 'accepted';

    if (askerOk && doerOk) {
      await db.query(
        `UPDATE disputes SET rework_outcome = 'agreed', status = 'rework_in_progress', updated_at = NOW() WHERE id = $1`,
        [disputeId]
      );
      for (const uid of [d.asker_id, d.doer_id].filter(Boolean)) {
        try {
          await db.query(
            `INSERT INTO notifications (user_id, type, title, message, related_errand_id)
             VALUES ($1, 'dispute_rework_agreed', $2, $3, $4)`,
            [
              uid,
              `You both agreed — "${d.title}" will be put right`,
              `The work will be reworked by ${new Date(d.rework_deadline).toLocaleDateString('en-SG', { dateStyle: 'medium' })}. The payment stays held until it's done, then it goes through as originally agreed.`,
              d.errand_id,
            ]
          );
        } catch (e) {
          console.warn('[Disputes] Could not notify about rework agreement:', e);
        }
      }
      return res.json({ success: true, data: { outcome: 'agreed', reworkDeadline: d.rework_deadline } });
    }

    res.json({
      success: true,
      data: { outcome: 'waiting', message: 'Thanks — waiting on the other person now.' },
    });
  } catch (error) {
    console.error('[Disputes] Rework response error:', error);
    res.status(500).json({ error: 'Could not record that. Please try again.' });
  }
});

// POST /api/disputes/:id/rework-complete — the asker confirms the rework is done
router.post('/:id/rework-complete', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const disputeId = parseInt(req.params.id, 10);
    const userId = parseInt(req.userId || '0', 10);

    const found = await db.query(
      `SELECT d.id, d.rework_outcome, d.errand_id, e.asker_id
         FROM disputes d JOIN errands e ON e.id = d.errand_id WHERE d.id = $1`,
      [disputeId]
    );
    if (found.rows.length === 0) return res.status(404).json({ error: 'Dispute not found' });

    const d = found.rows[0];
    if (d.rework_outcome !== 'agreed') {
      return res.status(400).json({ error: 'There is no rework in progress on this one.' });
    }
    if (Number(d.asker_id) !== userId) {
      return res.status(403).json({ error: 'Only the person who asked for the errand can confirm it is put right.' });
    }

    await db.query(
      `UPDATE disputes
          SET rework_outcome = 'completed', rework_completed_at = NOW(),
              resolution = 'approved', resolution_notes = COALESCE(resolution_notes, '') ,
              resolved_at = NOW(), status = 'resolved', updated_at = NOW()
        WHERE id = $1`,
      [disputeId]
    );

    // Work was put right, so payment goes through as originally agreed — no
    // settlement legs, because nothing is being split. The errand goes back to
    // where it was before the dispute so the normal payment flow can finish it;
    // without this it would sit at 'disputed' forever with the hold lifted,
    // which reads as an unresolved dispute over an errand that is actually done.
    await releaseHeldPayment(d.errand_id);
    await closeErrandAfterDispute(d.errand_id, 'restore');

    res.json({
      success: true,
      data: { outcome: 'completed', message: 'Thanks for confirming — the payment will go through as agreed.' },
    });
  } catch (error) {
    console.error('[Disputes] Rework complete error:', error);
    res.status(500).json({ error: 'Could not record that. Please try again.' });
  }
});

/**
 * GET /api/disputes/:id/case-context — the case covering this dispute's errand.
 *
 * The admin dispute screen uses this to show what the support team already
 * knows before a verdict is issued, and reads `case_id` off it to close the
 * case once the dispute is settled.
 *
 * Cases and disputes are related through errand_id — see the note in
 * routes/cases.ts. Responds 200 with data: null when there is no case, since
 * "no related case" is a normal answer here, not an error.
 */
router.get('/:id/case-context', adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const disputeId = parseInt(req.params.id, 10);
    if (Number.isNaN(disputeId)) return res.status(400).json({ error: 'Invalid dispute id' });

    const d = await db.query('SELECT id, errand_id FROM disputes WHERE id = $1', [disputeId]);
    if (d.rows.length === 0) return res.status(404).json({ error: 'Dispute not found' });

    const errandId = d.rows[0].errand_id;
    if (!errandId) return res.json({ success: true, data: null });

    const result = await db.query(
      `SELECT c.id, c.case_id, c.case_type, c.severity, c.status, c.subject,
              c.description, c.ai_recommendation, c.ai_confidence,
              c.final_decision, c.refund_amount, c.created_at, c.resolved_at,
              COALESCE(cu.alias, cu.display_name) AS complainant_name,
              COALESCE(ru.alias, ru.display_name) AS respondent_name,
              (SELECT COUNT(*) FROM case_messages m WHERE m.case_id = c.id) AS message_count
         FROM cases c
         LEFT JOIN users cu ON cu.id = c.complainant_user_id
         LEFT JOIN users ru ON ru.id = c.respondent_user_id
        WHERE c.errand_id = $1
        ORDER BY c.created_at DESC
        LIMIT 1`,
      [errandId]
    );

    const row = result.rows[0];
    res.json({
      success: true,
      data: row ? { ...row, message_count: Number(row.message_count) || 0 } : null,
    });
  } catch (error) {
    console.error('[Disputes] Case context fetch failed:', error);
    res.status(500).json({ error: 'Could not load the linked case' });
  }
});

export default router;
