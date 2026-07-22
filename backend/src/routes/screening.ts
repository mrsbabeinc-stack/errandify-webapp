import { Router, Response } from 'express';
import { AuthRequest, authMiddleware, requireAdmin } from '../middleware/auth.js';
import db from '../db.js';
import { resolveOutcome, applyRestrictions, clearRestrictions, isUnrestricted } from '../services/screeningResolver.js';
import { categoriesClosedBy, needsHumanScoping, allRestrictedCategories, OFFENCE_OPTIONS, type OffenceType } from '../services/offenceScope.js';
import { sendNotification } from '../utils/notificationHelper.js';

const router = Router();

// POST /api/screening/declare - User submits criminal screening declaration during signup
/**
 * POST /api/screening/declare — the criminal declaration.
 *
 * Progressive: the form asks everyone one question, and only asks the specific
 * ones of people who answer yes. This accepts both shapes —
 *
 *   { hasConviction: false }
 *   { hasConviction: true, offenceTypes: [...], sentenceCompletedOn, underMonitoring }
 *
 * — and still accepts the five original statutory booleans, so an older client
 * keeps working. Those map onto offence types rather than being dropped: the
 * specific declaration a person made is what gets stored.
 *
 * The outcome is tiered by services/screeningResolver (migration 042), not a
 * blanket permanent ban. Anything it cannot decide becomes pending_review with
 * restrictions applied meanwhile — uncertainty never grants access.
 */
router.post('/declare', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.userId || '0', 10);
    const {
      hasUnspentConviction,
      thirdScheduleOffence,
      exceededSentenceThreshold,
      otherDisqualification,
      convictedOn,
      offenceType,
      applicantNote,
      understoodRestrictions,
      // legacy shapes still accepted
      hasConviction,
      cypaConviction,
      womensCharterConviction,
      penalCodeConviction,
      elderAbuseConviction,
      dishonestyConviction,
    } = req.body;

    if (!understoodRestrictions) {
      return res.status(400).json({
        error: 'Please confirm your declaration before continuing',
      });
    }

    // Older clients sent "any conviction ever". That is a broader question than
    // the law asks, so those answers are treated conservatively: an unspent
    // conviction whose s7C position is unknown, which routes to review rather
    // than being silently downgraded to "no conviction".
    const legacyDeclared =
      hasConviction === true ||
      Boolean(cypaConviction || womensCharterConviction || penalCodeConviction ||
              elderAbuseConviction || dishonestyConviction);

    const usedLegacy = hasUnspentConviction === undefined;
    const unspent = usedLegacy ? legacyDeclared : Boolean(hasUnspentConviction);

    const offence: OffenceType | null =
      OFFENCE_OPTIONS.some((o) => o.value === offenceType) ? offenceType : null;

    const outcome = await resolveOutcome({
      hasUnspentConviction: unspent,
      thirdScheduleOffence: usedLegacy ? null : (thirdScheduleOffence ?? null),
      exceededSentenceThreshold: usedLegacy ? null : (exceededSentenceThreshold ?? null),
      otherDisqualification: usedLegacy ? null : (otherDisqualification ?? null),
      convictedOn: convictedOn || null,
    });

    // An offence we cannot scope is not an offence we can bar on. "Drugs" and
    // "something else" tell us nothing about these specific categories, so they
    // go to a person rather than to a blanket restriction — which is the
    // reasoning this whole change exists to remove.
    const reviewStatus =
      unspent && needsHumanScoping(offence, usedLegacy ? null : thirdScheduleOffence)
        ? 'pending_review'
        : outcome.reviewStatus;

    const result = await db.query(
      `INSERT INTO screening_declarations (
        user_id, has_unspent_conviction, third_schedule_offence,
        exceeded_sentence_threshold, other_disqualification, convicted_on,
        any_conviction, understood_restrictions, ip_address, review_status,
        applicant_note, offence_type
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
      ON CONFLICT (user_id) DO UPDATE SET
        has_unspent_conviction = $2, third_schedule_offence = $3,
        exceeded_sentence_threshold = $4, other_disqualification = $5,
        convicted_on = $6, any_conviction = $7, understood_restrictions = $8,
        review_status = $10, applicant_note = $11, offence_type = $12,
        consent_timestamp = NOW()
      RETURNING id`,
      [
        userId,
        unspent,
        usedLegacy ? null : (thirdScheduleOffence ?? null),
        usedLegacy ? null : (exceededSentenceThreshold ?? null),
        usedLegacy ? null : (otherDisqualification ?? null),
        convictedOn || null,
        unspent,
        Boolean(understoodRestrictions),
        req.ip || null,
        reviewStatus,
        (applicantNote || '').trim() || null,
        offence,
      ]
    );

    await db.query(
      `UPDATE users
          SET screening_completed = true, screening_completed_date = NOW(),
              criminal_conviction = $2
        WHERE id = $1`,
      [userId, unspent]
    );

    // Only the categories this offence actually bears on. Everything else stays
    // open, including categories an earlier blanket declaration had closed.
    //
    // But an unscoped declaration restricts everything until a person has
    // looked at it. Scoping narrows a restriction on the strength of knowing
    // what happened; not knowing is not the same as knowing it was minor. An
    // older client that never asks for an offence type, or a "something else"
    // answer, would otherwise leave someone who has just declared a conviction
    // with full access to childcare and eldercare while their case sits in a
    // queue. Uncertainty must not grant access — it is temporary, and the
    // review is what lifts it.
    const closed = isUnrestricted(outcome)
      ? []
      : needsHumanScoping(offence, usedLegacy ? null : thirdScheduleOffence)
      ? allRestrictedCategories()
      : categoriesClosedBy(offence, usedLegacy ? null : thirdScheduleOffence);

    if (isUnrestricted(outcome)) {
      // Nothing to restrict — and this also lifts anything from an earlier
      // declaration, so a record that has since spent stops biting.
      await clearRestrictions(userId);
    } else {
      const n = await applyRestrictions(userId, outcome, closed);
      console.log(`[Screening] user ${userId}: ${outcome.tier} (${outcome.basis}) offence=${offence ?? 'unknown'} — ${n} categories, ends ${outcome.restrictionEnd?.toISOString() ?? 'never'}`);
    }

    const allCats = await db.query('SELECT DISTINCT category FROM errands WHERE category IS NOT NULL');
    const open = allCats.rows
      .map((r: any) => r.category)
      .filter((c: string) => !closed.includes(c));

    res.json({
      success: true,
      data: {
        screeningId: result.rows[0].id,
        restrictedCategories: isUnrestricted(outcome) ? [] : closed,
        openCategories: isUnrestricted(outcome) ? allCats.rows.map((r: any) => r.category) : open,
        hasUnspentConviction: unspent,
        tier: outcome.tier,
        restrictionEnd: outcome.restrictionEnd,
        needsReview: reviewStatus === 'pending_review',
        basis: outcome.basis,
        // Tone matters here: most people reading these have done nothing, and
        // the ones who have are looking for work, not being sentenced again.
        // Say what happens, say it is not personal, and never imply removal.
        message: isUnrestricted(outcome)
          ? "Thanks — you're all set. Nothing is restricted."
          : reviewStatus === 'pending_review'
          ? "Thanks for telling us. Someone will look at this and come back to you. In the meantime these categories are paused — everything else is unaffected."
          : outcome.tier === 'until_spent'
          ? "Thanks. These categories open up once your record becomes spent, and that happens automatically — you won't need to ask. Everything else is unaffected."
          : "Thanks. These particular categories aren't available, but the rest of Errandify is open to you as normal.",
      },
    });
  } catch (error) {
    console.error('Screening declaration error:', error);
    res.status(500).json({ error: 'Failed to submit screening declaration' });
  }
});

// GET /api/screening/status - Check user's screening status
router.get('/status', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.userId || '0', 10);

    const result = await db.query(
      `SELECT
         screening_completed,
         criminal_conviction,
         (SELECT COUNT(*) FROM user_category_restrictions WHERE user_id = $1 AND is_active = true)::INTEGER as restricted_categories_count
       FROM users
       WHERE id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];

    res.json({
      success: true,
      data: {
        screeningCompleted: user.screening_completed,
        hasConviction: user.criminal_conviction,
        restrictedCategoriesCount: user.restricted_categories_count || 0,
      },
    });
  } catch (error) {
    console.error('Screening status error:', error);
    res.status(500).json({ error: 'Failed to get screening status' });
  }
});

// GET /api/screening/declarations/:userId - Admin: View user's declaration
router.get('/declarations/:userId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.params.userId, 10);
    const currentUserId = parseInt(req.userId || '0', 10);

    // Only allow user to view their own or if admin (future)
    if (currentUserId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await db.query(
      `SELECT
         id,
         cypa_conviction,
         womens_charter_conviction,
         penal_code_conviction,
         elder_abuse_conviction,
         dishonesty_conviction,
         any_conviction,
         understood_restrictions,
         consent_timestamp
       FROM screening_declarations
       WHERE user_id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No screening declaration found' });
    }

    const declaration = result.rows[0];

    res.json({
      success: true,
      data: {
        id: declaration.id,
        cypeConviction: declaration.cypa_conviction,
        womensCharterConviction: declaration.womens_charter_conviction,
        penalCodeConviction: declaration.penal_code_conviction,
        elderAbuseConviction: declaration.elder_abuse_conviction,
        dishonestyConviction: declaration.dishonesty_conviction,
        anyConviction: declaration.any_conviction,
        understoodRestrictions: declaration.understood_restrictions,
        consentTimestamp: declaration.consent_timestamp,
      },
    });
  } catch (error) {
    console.error('Get declaration error:', error);
    res.status(500).json({ error: 'Failed to get declaration' });
  }
});

// GET /api/screening/restrictions - Get user's category restrictions
router.get('/restrictions', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.userId || '0', 10);

    const result = await db.query(
      `SELECT
         rc.category_name,
         rc.reason as category_reason,
         ucr.reason as restriction_reason,
         ucr.restriction_start,
         ucr.restriction_end
       FROM user_category_restrictions ucr
       JOIN restricted_categories rc ON ucr.restricted_category_id = rc.id
       WHERE ucr.user_id = $1
       AND ucr.is_active = true
       AND (ucr.restriction_end IS NULL OR ucr.restriction_end > NOW())
       ORDER BY rc.category_name`,
      [userId]
    );

    res.json({
      success: true,
      data: {
        restrictions: result.rows.map((r) => ({
          categoryName: r.category_name,
          categoryReason: r.category_reason,
          restrictionReason: r.restriction_reason,
          restrictionStart: r.restriction_start,
          restrictionEnd: r.restriction_end,
        })),
        count: result.rows.length,
      },
    });
  } catch (error) {
    console.error('Get restrictions error:', error);
    res.status(500).json({ error: 'Failed to get restrictions' });
  }
});

// GET /api/categories/accessible - Get categories user can access
router.get('/categories/accessible', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.userId || '0', 10);

    // Get all categories
    const allCategoriesResult = await db.query(
      `SELECT DISTINCT category FROM errands WHERE category IS NOT NULL ORDER BY category`
    );

    // Get user's restrictions. category_slug, not category_name: the labels
    // ('Childcare') never equal the slugs stored on errands
    // ('childcare-education'), so comparing them let every category through.
    // See migration 037.
    const restrictionsResult = await db.query(
      `SELECT rc.category_name, rc.category_slug
       FROM user_category_restrictions ucr
       JOIN restricted_categories rc ON ucr.restricted_category_id = rc.id
       WHERE ucr.user_id = $1
       AND ucr.is_active = true
       AND (ucr.restriction_end IS NULL OR ucr.restriction_end > NOW())`,
      [userId]
    );

    const restrictedSlugs = new Set(
      restrictionsResult.rows.map((r) => r.category_slug).filter(Boolean)
    );
    const accessibleCategories = allCategoriesResult.rows
      .filter((cat) => !restrictedSlugs.has(cat.category))
      .map((cat) => cat.category);

    res.json({
      success: true,
      data: {
        accessible: accessibleCategories,
        // Slugs are what a caller compares an errand against; the labels stay
        // alongside them so this is still readable to a person.
        restricted: Array.from(restrictedSlugs),
        restrictedLabels: restrictionsResult.rows.map((r) => r.category_name),
        totalRestricted: restrictedSlugs.size,
      },
    });
  } catch (error) {
    console.error('Get accessible categories error:', error);
    res.status(500).json({ error: 'Failed to get categories' });
  }
});

// PATCH /api/screening/restrictions/:categoryId - Admin: Manually restrict category
router.patch(
  '/restrictions/:categoryId',
  authMiddleware,
  requireAdmin(),
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = parseInt(req.body.userId, 10);
      const categoryId = parseInt(req.params.categoryId, 10);
      const { reason, restrictionEnd } = req.body;

      const result = await db.query(
        `INSERT INTO user_category_restrictions (user_id, restricted_category_id, reason, restriction_end)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (user_id, restricted_category_id) DO UPDATE
         SET reason = $3, restriction_end = $4, is_active = true
         RETURNING id`,
        [userId, categoryId, reason || 'Manual admin restriction', restrictionEnd || null]
      );

      res.json({
        success: true,
        data: {
          restrictionId: result.rows[0].id,
          message: 'Restriction applied',
        },
      });
    } catch (error) {
      console.error('Apply restriction error:', error);
      res.status(500).json({ error: 'Failed to apply restriction' });
    }
  }
);

/**
 * Admin review of declarations the resolver could not decide.
 *
 * A declaration becomes pending_review when the applicant answered "I'm not
 * sure", left the conviction date out, or arrived from an older client. Those
 * people are restricted meanwhile, so an unattended queue quietly bars someone
 * indefinitely — this is the screen that stops that happening.
 */
const screeningAdmin: any = [authMiddleware, requireAdmin(['admin', 'super-admin'])];

/** GET /api/screening/reviews — the queue. */
router.get('/reviews', screeningAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const status = (req.query.status as string) || 'pending_review';
    const result = await db.query(
      `SELECT sd.id, sd.user_id,
              COALESCE(u.alias, u.display_name) AS name,
              u.email,
              sd.has_unspent_conviction AS "hasUnspentConviction",
              sd.third_schedule_offence AS "thirdScheduleOffence",
              sd.exceeded_sentence_threshold AS "exceededSentenceThreshold",
              sd.other_disqualification AS "otherDisqualification",
              to_char(sd.convicted_on, 'YYYY-MM-DD') AS "convictedOn",
              sd.applicant_note AS "applicantNote",
              sd.review_status AS "reviewStatus",
              sd.review_note AS "reviewNote",
              sd.consent_timestamp AS "declaredAt",
              -- DISTINCT slug, not row count. restricted_categories holds 11
              -- rows mapping onto 7 errand categories, so counting rows told
              -- the reviewer someone had lost 11 of 16 categories when they had
              -- lost 7. Materially misleading for a decision about a person.
              (SELECT COUNT(DISTINCT rc2.category_slug)
                 FROM user_category_restrictions r
                 JOIN restricted_categories rc2 ON rc2.id = r.restricted_category_id
                WHERE r.user_id = sd.user_id AND r.is_active = true
                  AND rc2.category_slug IS NOT NULL)::int AS "restrictedCount"
         FROM screening_declarations sd
         JOIN users u ON u.id = sd.user_id
        WHERE sd.review_status = $1
        ORDER BY sd.consent_timestamp ASC`,
      [status]
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('[Screening] Review queue failed:', error);
    res.status(500).json({ error: 'Could not load the review queue' });
  }
});

/**
 * POST /api/screening/reviews/:id/:action — clear or bar.
 *
 * cleared — the admin is satisfied the record is spent or does not disqualify;
 *           restrictions are lifted entirely.
 * barred  — the record cannot become spent; restrictions become permanent.
 *
 * A note is required either way. A decision that bars someone from work, or
 * lets them near vulnerable people, should not be recorded without a reason
 * attached to whoever made it.
 */
// Constrained to clear|bar. As a bare ':action' this swallowed
// /reviews/:id/ask and /reviews/:id/reopen and answered "Unknown action" —
// Express matches in registration order and this was registered first.
router.post('/reviews/:id/:action(clear|bar)', screeningAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const action = req.params.action;
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid declaration id' });
    if (!['clear', 'bar'].includes(action)) return res.status(400).json({ error: 'Unknown action' });

    const note = (req.body?.note || '').trim();
    if (!note) return res.status(400).json({ error: 'Please record why you reached this decision' });

    const decl = await db.query(
      'SELECT user_id, review_status FROM screening_declarations WHERE id = $1',
      [id]
    );
    if (decl.rows.length === 0) return res.status(404).json({ error: 'Declaration not found' });
    // info_requested is still an open case — asking a question should not
    // prevent deciding it once the answer arrives.
    if (!['pending_review', 'info_requested'].includes(decl.rows[0].review_status)) {
      return res.status(409).json({ error: `Already ${decl.rows[0].review_status}` });
    }

    const userId = decl.rows[0].user_id;
    const cleared = action === 'clear';

    await db.query(
      `UPDATE screening_declarations
          SET review_status = $1, review_note = $2, reviewed_by = $3, reviewed_at = NOW()
        WHERE id = $4`,
      [cleared ? 'cleared' : 'barred', note, parseInt(req.userId || '0', 10), id]
    );

    if (cleared) {
      await db.query('DELETE FROM user_category_restrictions WHERE user_id = $1', [userId]);
    } else {
      // Barred means the record does not spend, so no end date.
      await db.query(
        `INSERT INTO user_category_restrictions (user_id, restricted_category_id, reason, restriction_end, is_active)
         SELECT $1, id, $2, NULL, true FROM restricted_categories
         ON CONFLICT (user_id, restricted_category_id) DO UPDATE
           SET is_active = true, reason = EXCLUDED.reason, restriction_end = NULL, updated_at = NOW()`,
        [userId, `Admin review: ${note}`]
      );
    }

    await db.query(
      `INSERT INTO screening_decision_log (declaration_id, user_id, action, note, decided_by)
       VALUES ($1, $2, $3, $4, $5)`,
      [id, userId, cleared ? 'cleared' : 'barred', note, parseInt(req.userId || '0', 10)]
    );

    // Tell them. Being asked a question and then never hearing back is the
    // part of this that would feel worst from the other side.
    sendNotification({
      userId,
      type: 'screening_update',
      title: cleared ? 'Your declaration has been reviewed' : 'About your declaration',
      message: cleared
        ? 'All categories are now open to you. Thanks for your patience.'
        : 'Some categories remain unavailable. If you think this is wrong, reply to this and we will take another look.',
    }).catch((e) => console.error('[Screening] notify failed:', e));

    console.log(`[Screening] declaration ${id} ${cleared ? 'cleared' : 'barred'} by ${req.userId}`);
    res.json({ success: true, data: { id, reviewStatus: cleared ? 'cleared' : 'barred' } });
  } catch (error) {
    console.error('[Screening] Review decision failed:', error);
    res.status(500).json({ error: 'Could not record that decision' });
  }
});

/**
 * POST /api/screening/reviews/:id/ask — ask the applicant for one more fact.
 *
 * A reviewer could previously only clear or bar, so a case turning on a single
 * missing number got a permanent decision instead of a question. This sends
 * them the question, keeps the case open, and stops the ageing clock: the age
 * badge should measure our delay, not theirs, or every case eventually turns
 * red and the badge stops meaning anything.
 */
router.post('/reviews/:id/ask', screeningAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid declaration id' });

    const question = (req.body?.question || '').trim();
    if (!question) return res.status(400).json({ error: 'Please write the question you want to ask' });

    const d = await db.query(
      'SELECT user_id, review_status FROM screening_declarations WHERE id = $1',
      [id]
    );
    if (d.rows.length === 0) return res.status(404).json({ error: 'Declaration not found' });
    if (!['pending_review', 'info_requested'].includes(d.rows[0].review_status)) {
      return res.status(409).json({ error: `Already ${d.rows[0].review_status}` });
    }

    await db.query(
      `UPDATE screening_declarations
          SET review_status = 'info_requested', info_request = $1, info_requested_at = NOW()
        WHERE id = $2`,
      [question, id]
    );
    await db.query(
      `INSERT INTO screening_decision_log (declaration_id, user_id, action, note, decided_by)
       VALUES ($1, $2, 'info_requested', $3, $4)`,
      [id, d.rows[0].user_id, question, parseInt(req.userId || '0', 10)]
    );

    // Fire and forget — a mail or push failure must not lose the request.
    sendNotification({
      userId: d.rows[0].user_id,
      type: 'screening_update',
      title: 'We need one more detail',
      message: question,
    }).catch((e) => console.error('[Screening] notify failed:', e));

    res.json({ success: true, data: { id, reviewStatus: 'info_requested' } });
  } catch (error) {
    console.error('[Screening] Info request failed:', error);
    res.status(500).json({ error: 'Could not send that question' });
  }
});

/**
 * POST /api/screening/reviews/:id/reopen — undo a decision.
 *
 * People are cleared and barred wrongly. An audit trail that cannot be
 * corrected only records the mistake permanently, so a decision can be put back
 * into the queue with a reason. The original decision stays in the log.
 */
router.post('/reviews/:id/reopen', screeningAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid declaration id' });
    const note = (req.body?.note || '').trim();
    if (!note) return res.status(400).json({ error: 'Please record why you are reopening this' });

    const d = await db.query(
      'SELECT user_id, review_status FROM screening_declarations WHERE id = $1',
      [id]
    );
    if (d.rows.length === 0) return res.status(404).json({ error: 'Declaration not found' });
    if (!['cleared', 'barred'].includes(d.rows[0].review_status)) {
      return res.status(409).json({ error: 'Only a decided case can be reopened' });
    }

    await db.query(
      `UPDATE screening_declarations SET review_status = 'pending_review' WHERE id = $1`,
      [id]
    );
    await db.query(
      `INSERT INTO screening_decision_log (declaration_id, user_id, action, note, decided_by)
       VALUES ($1, $2, 'reopened', $3, $4)`,
      [id, d.rows[0].user_id, note, parseInt(req.userId || '0', 10)]
    );

    res.json({ success: true, data: { id, reviewStatus: 'pending_review' } });
  } catch (error) {
    console.error('[Screening] Reopen failed:', error);
    res.status(500).json({ error: 'Could not reopen that case' });
  }
});

/** GET /api/screening/reviews/:id/history — every action taken on a case. */
router.get('/reviews/:id/history', screeningAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid declaration id' });
    const result = await db.query(
      `SELECT l.id, l.action, l.note, l.created_at AS "createdAt",
              COALESCE(u.alias, u.display_name) AS "decidedBy"
         FROM screening_decision_log l
         LEFT JOIN users u ON u.id = l.decided_by
        WHERE l.declaration_id = $1
        ORDER BY l.created_at DESC`,
      [id]
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('[Screening] History failed:', error);
    res.status(500).json({ error: 'Could not load the history' });
  }
});

export default router;
