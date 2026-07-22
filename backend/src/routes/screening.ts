import { Router, Response } from 'express';
import { AuthRequest, authMiddleware, requireAdmin } from '../middleware/auth.js';
import db from '../db.js';
import { resolveOutcome, applyRestrictions, clearRestrictions } from '../services/screeningResolver.js';

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
      hasConviction,
      offenceTypes,
      sentenceCompletedOn,
      underMonitoring,
      understoodRestrictions,
      // legacy shape
      cypaConviction,
      womensCharterConviction,
      penalCodeConviction,
      elderAbuseConviction,
      dishonestyConviction,
    } = req.body;

    if (!understoodRestrictions) {
      return res.status(400).json({
        error: 'Please confirm you understand the restrictions before continuing',
      });
    }

    // Older clients send the five booleans; translate them so the same
    // declaration still produces the same protection.
    const LEGACY_MAP: Array<[boolean, string]> = [
      [Boolean(cypaConviction), 'against_child'],
      [Boolean(womensCharterConviction), 'sexual'],
      [Boolean(penalCodeConviction), 'violence'],
      [Boolean(elderAbuseConviction), 'against_vulnerable_adult'],
      [Boolean(dishonestyConviction), 'dishonesty'],
    ];
    const legacyTypes = LEGACY_MAP.filter(([on]) => on).map(([, t]) => t);
    const usedLegacy = hasConviction === undefined;

    const types: string[] = Array.isArray(offenceTypes) && offenceTypes.length
      ? offenceTypes
      : legacyTypes;
    const declared = usedLegacy ? legacyTypes.length > 0 : Boolean(hasConviction);

    if (declared && types.length === 0) {
      return res.status(400).json({
        error: 'Please tell us what kind of offence it was so we can assess it correctly',
      });
    }

    const outcome = declared
      ? await resolveOutcome(types, sentenceCompletedOn || null, Boolean(underMonitoring))
      : null;

    const result = await db.query(
      `INSERT INTO screening_declarations (
        user_id, cypa_conviction, womens_charter_conviction, penal_code_conviction,
        elder_abuse_conviction, dishonesty_conviction, any_conviction,
        understood_restrictions, ip_address,
        offence_types, sentence_completed_on, under_monitoring, review_status
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
      ON CONFLICT (user_id) DO UPDATE SET
        cypa_conviction = $2, womens_charter_conviction = $3, penal_code_conviction = $4,
        elder_abuse_conviction = $5, dishonesty_conviction = $6, any_conviction = $7,
        understood_restrictions = $8, offence_types = $10,
        sentence_completed_on = $11, under_monitoring = $12, review_status = $13,
        consent_timestamp = NOW()
      RETURNING id`,
      [
        userId,
        types.includes('against_child'),
        types.includes('sexual'),
        types.includes('violence') || types.includes('kidnapping'),
        types.includes('against_vulnerable_adult'),
        types.includes('dishonesty'),
        declared,
        Boolean(understoodRestrictions),
        req.ip || null,
        JSON.stringify(types),
        sentenceCompletedOn || null,
        Boolean(underMonitoring),
        outcome ? outcome.reviewStatus : 'auto',
      ]
    );

    await db.query(
      `UPDATE users
          SET screening_completed = true, screening_completed_date = NOW(),
              criminal_conviction = $2
        WHERE id = $1`,
      [userId, declared]
    );

    if (declared && outcome) {
      const n = await applyRestrictions(userId, outcome);
      console.log(`[Screening] user ${userId}: ${outcome.tier} — ${n} categories, ends ${outcome.restrictionEnd?.toISOString() ?? 'never'}`);
    } else {
      // A clean declaration should lift anything left from an earlier one.
      await clearRestrictions(userId);
    }

    res.json({
      success: true,
      data: {
        screeningId: result.rows[0].id,
        anyConviction: declared,
        tier: outcome?.tier ?? null,
        restrictionEnd: outcome?.restrictionEnd ?? null,
        needsReview: outcome?.reviewStatus === 'pending_review',
        message: !declared
          ? 'Thank you for confirming. You can access all categories.'
          : outcome?.reviewStatus === 'pending_review'
          ? 'Your declaration has been recorded and is with our team for review. Some categories are unavailable while we look at it.'
          : outcome?.tier === 'temporary'
          ? 'Your declaration has been recorded. Some categories are unavailable until your restriction period ends.'
          : 'Your declaration has been recorded. Some categories are unavailable on your account.',
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

export default router;
