import express, { Request, Response } from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import db from '../db.js';
import { config } from '../config.js';
import { AuthRequest, authMiddleware, requireAdmin } from '../middleware/auth.js';

/**
 * Staff onboarding — the employee supplies their own details after they are hired.
 *
 * Two routers:
 *   adminRouter  mounted at /api/admin  — issuing and tracking invites
 *   publicRouter mounted at /api/onboarding — the employee's form, no login
 *
 * The employee has no account yet, so the form cannot sit behind authMiddleware.
 * Access is a hashed, expiring token PLUS an identity check; see migration 073
 * for why that is stricter than the candidate-screening invites in this repo.
 */

export const adminRouter = express.Router();
export const publicRouter = express.Router();

const uid = (req: Request) => {
  const id = (req as unknown as AuthRequest).userId;
  return id ? parseInt(id, 10) : null;
};

function bad(res: Response, message: string) {
  return res.status(400).json({ success: false, error: message });
}

const INVITE_TTL_DAYS = 14;
const MAX_VERIFY_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 30;
/** Short: it only has to last as long as filling in one form. */
const SESSION_TTL = '30m';

const hashToken = (token: string) => crypto.createHash('sha256').update(token).digest('hex');

/** Compares the last four NRIC characters without leaking timing information. */
function nricLast4Matches(stored: string | null, supplied: string): boolean {
  if (!stored) return false;
  const a = Buffer.from(stored.trim().toUpperCase().slice(-4));
  const b = Buffer.from(String(supplied).trim().toUpperCase().slice(-4));
  if (a.length !== b.length || a.length === 0) return false;
  return crypto.timingSafeEqual(a, b);
}

/** Digits only — a GIRO file cannot take "123-456-789". */
const digitsOnly = (v: unknown): string => String(v ?? '').replace(/[^0-9]/g, '');

const SG_BANK_CODES = new Set([
  '7171', '7339', '7375', '7302', '9496', '7214', '7232', '7144', '8712', '7454', '9548', '9666',
]);

/**
 * What we tell the employee before they type anything. PDPA requires notifying
 * the purpose at or before the point of collection; burying it in a policy page
 * does not count.
 */
export const COLLECTION_NOTICE = {
  purpose: [
    'Your bank details are used only to pay your salary, and are sent to our bank as part of a salary payment file.',
    'Your home address is used for employment records and statutory filings.',
    'Your emergency contact is used only if something happens to you at work.',
  ],
  retention:
    'We keep employment and payment records for the period required by law after you leave, then remove the details that identify you.',
  rights:
    'You can ask HR to correct anything here at any time, or ask what we hold about you.',
};

// ===========================================================================
// Admin: issuing and tracking invites
// ===========================================================================

adminRouter.use(
  authMiddleware as unknown as express.RequestHandler,
  requireAdmin(['admin', 'super-admin']) as unknown as express.RequestHandler
);

/**
 * Who still owes us what. Drives the HR chase list, and is the same query the
 * payroll screen uses to explain why someone cannot be paid yet.
 */
adminRouter.get('/staff/onboarding-status', async (_req: Request, res: Response) => {
  try {
    const result = await db.query(
      `SELECT s.staff_id,
              s.first_name || ' ' || s.last_name AS staff_name,
              s.email, s.status, s.onboarding_completed_at,
              (s.bank_account_number IS NOT NULL AND s.bank_code IS NOT NULL) AS has_bank,
              (s.home_address IS NOT NULL AND s.postal_code IS NOT NULL) AS has_address,
              (EXISTS (SELECT 1 FROM emergency_contacts e WHERE e.staff_id = s.staff_id)
                OR s.emergency_contact_name IS NOT NULL) AS has_emergency_contact,
              (s.nric IS NOT NULL) AS can_be_invited,
              i.id AS invite_id, i.status AS invite_status, i.expires_at,
              i.created_at AS invited_at, i.locked_until
         FROM staff s
         LEFT JOIN staff_onboarding_invites i
           ON i.staff_id = s.staff_id AND i.status IN ('sent','verified')
        WHERE s.status = 'active'
        ORDER BY s.staff_id`
    );
    const rows = result.rows.map((r: any) => {
      const outstanding: string[] = [];
      if (!r.has_bank) outstanding.push('bank details');
      if (!r.has_address) outstanding.push('home address');
      if (!r.has_emergency_contact) outstanding.push('emergency contact');
      return { ...r, outstanding, complete: outstanding.length === 0 };
    });
    res.json({
      success: true,
      staff: rows,
      complete_count: rows.filter((r: any) => r.complete).length,
      outstanding_count: rows.filter((r: any) => !r.complete).length,
    });
  } catch (err) {
    console.error('[onboarding] status failed:', err);
    res.status(500).json({ success: false, error: 'Failed to load onboarding status' });
  }
});

/**
 * Issue an invite. The token is returned exactly once, here — it is hashed
 * before it is stored, so it cannot be looked up again afterwards. If it is
 * lost, issue a new one; that is cheaper than being able to recover it.
 */
adminRouter.post('/staff/:staffId/onboarding-invite', async (req: Request, res: Response) => {
  const client = await db.getClient();
  try {
    const staffId = req.params.staffId;
    const staff = await db.query(
      `SELECT staff_id, first_name, last_name, email, nric, status FROM staff WHERE staff_id = $1`,
      [staffId]
    );
    const s = staff.rows[0];
    if (!s) return res.status(404).json({ success: false, error: 'Staff member not found' });
    if (s.status !== 'active') {
      return bad(res, 'Only a confirmed, active staff member can be onboarded');
    }
    if (!s.nric) {
      return bad(
        res,
        'This staff record has no NRIC, so there is nothing to verify their identity against. Add it before inviting them.'
      );
    }

    const token = crypto.randomBytes(32).toString('hex');

    await client.query('BEGIN');
    // Re-inviting supersedes any outstanding link, so an old email stops working.
    await client.query(
      `UPDATE staff_onboarding_invites
          SET status = 'revoked', revoked_by = $1, revoked_at = NOW()
        WHERE staff_id = $2 AND status IN ('sent','verified')`,
      [uid(req), staffId]
    );
    const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 86400000);
    const invite = await client.query(
      `INSERT INTO staff_onboarding_invites (staff_id, token_hash, expires_at, created_by)
       VALUES ($1,$2,$3,$4) RETURNING id, expires_at, created_at`,
      [staffId, hashToken(token), expiresAt.toISOString(), uid(req)]
    );
    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      invite: {
        id: invite.rows[0].id,
        staff_id: staffId,
        staff_name: `${s.first_name} ${s.last_name}`,
        email: s.email,
        expires_at: invite.rows[0].expires_at,
        /** Shown once. Send this to the employee; it is not recoverable. */
        invite_path: `/onboarding/${token}`,
      },
      note: 'Send this link to the staff member. It is shown once and cannot be retrieved later — issue a new invite if it is lost.',
    });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('[onboarding] create invite failed:', err);
    res.status(500).json({ success: false, error: 'Failed to create onboarding invite' });
  } finally {
    client.release();
  }
});

adminRouter.patch('/onboarding-invites/:id/revoke', async (req: Request, res: Response) => {
  try {
    const result = await db.query(
      `UPDATE staff_onboarding_invites
          SET status = 'revoked', revoked_by = $1, revoked_at = NOW()
        WHERE id = $2 AND status IN ('sent','verified') RETURNING id, staff_id`,
      [uid(req), req.params.id]
    );
    if (!result.rows[0]) {
      return res.status(409).json({ success: false, error: 'No live invite to revoke' });
    }
    res.json({ success: true, invite: result.rows[0] });
  } catch (err) {
    console.error('[onboarding] revoke failed:', err);
    res.status(500).json({ success: false, error: 'Failed to revoke invite' });
  }
});

// ===========================================================================
// Public: the employee's form
// ===========================================================================

interface LoadedInvite {
  id: number;
  staff_id: string;
  status: string;
  expires_at: Date;
  failed_attempts: number;
  locked_until: Date | null;
  first_name: string;
  last_name: string;
  nric: string | null;
}

async function loadInvite(token: string): Promise<LoadedInvite | null> {
  if (!token || token.length < 32) return null;
  const r = await db.query(
    `SELECT i.id, i.staff_id, i.status, i.expires_at, i.failed_attempts, i.locked_until,
            s.first_name, s.last_name, s.nric
       FROM staff_onboarding_invites i
       JOIN staff s ON s.staff_id = i.staff_id
      WHERE i.token_hash = $1`,
    [hashToken(token)]
  );
  return r.rows[0] || null;
}

/**
 * Deliberately says almost nothing before the identity check: a first name to
 * confirm the link is not misdirected, and nothing else. No email, no NRIC, no
 * existing details.
 */
publicRouter.get('/:token', async (req: Request, res: Response) => {
  try {
    const invite = await loadInvite(req.params.token);
    if (!invite || invite.status === 'revoked') {
      return res.status(404).json({ success: false, error: 'This link is not valid. Ask HR for a new one.' });
    }
    if (invite.status === 'completed') {
      return res.json({ success: true, state: 'completed', first_name: invite.first_name });
    }
    if (new Date(invite.expires_at) < new Date()) {
      return res.status(410).json({ success: false, error: 'This link has expired. Ask HR for a new one.' });
    }
    if (invite.locked_until && new Date(invite.locked_until) > new Date()) {
      return res.status(429).json({
        success: false,
        error: 'Too many incorrect attempts. Please try again later, or ask HR for a new link.',
      });
    }
    res.json({
      success: true,
      state: 'needs_verification',
      first_name: invite.first_name,
      notice: COLLECTION_NOTICE,
    });
  } catch (err) {
    console.error('[onboarding] load invite failed:', err);
    res.status(500).json({ success: false, error: 'Something went wrong. Please try again.' });
  }
});

/**
 * Identity check. On success returns a short-lived token scoped to this invite;
 * the submit endpoint accepts nothing else, so possessing the link alone never
 * lets anyone write.
 */
publicRouter.post('/:token/verify', async (req: Request, res: Response) => {
  try {
    const invite = await loadInvite(req.params.token);
    if (!invite || invite.status === 'revoked' || invite.status === 'completed') {
      return res.status(404).json({ success: false, error: 'This link is not valid. Ask HR for a new one.' });
    }
    if (new Date(invite.expires_at) < new Date()) {
      return res.status(410).json({ success: false, error: 'This link has expired. Ask HR for a new one.' });
    }
    if (invite.locked_until && new Date(invite.locked_until) > new Date()) {
      return res.status(429).json({
        success: false,
        error: 'Too many incorrect attempts. Please try again later, or ask HR for a new link.',
      });
    }

    const supplied = String(req.body?.nric_last4 || '').trim();
    if (supplied.length !== 4) {
      return bad(res, 'Enter the last 4 characters of your NRIC or FIN, for example 123A');
    }

    if (!nricLast4Matches(invite.nric, supplied)) {
      const attempts = invite.failed_attempts + 1;
      const lock = attempts >= MAX_VERIFY_ATTEMPTS;
      await db.query(
        `UPDATE staff_onboarding_invites
            SET failed_attempts = $1,
                locked_until = CASE WHEN $2 THEN NOW() + INTERVAL '${LOCKOUT_MINUTES} minutes' ELSE locked_until END
          WHERE id = $3`,
        [attempts, lock, invite.id]
      );
      // Same message either way: never reveal how close a guess was.
      return res.status(401).json({
        success: false,
        error: lock
          ? 'Too many incorrect attempts. Please try again later, or ask HR for a new link.'
          : "That doesn't match our records. Please check and try again.",
        attempts_remaining: lock ? 0 : MAX_VERIFY_ATTEMPTS - attempts,
      });
    }

    await db.query(
      `UPDATE staff_onboarding_invites
          SET status = CASE WHEN status = 'sent' THEN 'verified' ELSE status END,
              verified_at = COALESCE(verified_at, NOW()),
              failed_attempts = 0, locked_until = NULL
        WHERE id = $1`,
      [invite.id]
    );

    const session = jwt.sign(
      { onboardingInviteId: invite.id, staffId: invite.staff_id },
      config.jwtSecret,
      { expiresIn: SESSION_TTL }
    );

    res.json({
      success: true,
      session,
      first_name: invite.first_name,
      last_name: invite.last_name,
      notice: COLLECTION_NOTICE,
    });
  } catch (err) {
    console.error('[onboarding] verify failed:', err);
    res.status(500).json({ success: false, error: 'Something went wrong. Please try again.' });
  }
});

/**
 * Write the details. Requires the session issued by /verify, and the session is
 * bound to one invite — a session for one employee cannot write another's row.
 */
publicRouter.post('/:token/submit', async (req: Request, res: Response) => {
  const client = await db.getClient();
  try {
    const header = req.headers.authorization || '';
    const sessionToken = header.startsWith('Bearer ') ? header.slice(7) : '';
    let claims: any;
    try {
      claims = jwt.verify(sessionToken, config.jwtSecret);
    } catch {
      return res.status(401).json({ success: false, error: 'Your session expired. Please verify again.' });
    }
    if (!claims?.onboardingInviteId) {
      return res.status(401).json({ success: false, error: 'Your session expired. Please verify again.' });
    }

    const invite = await loadInvite(req.params.token);
    if (!invite || invite.id !== claims.onboardingInviteId) {
      return res.status(401).json({ success: false, error: 'Your session does not match this link.' });
    }
    if (invite.status === 'completed') {
      return res.status(409).json({ success: false, error: 'This form has already been submitted.' });
    }
    if (invite.status !== 'verified') {
      return res.status(401).json({ success: false, error: 'Please verify your identity first.' });
    }
    if (new Date(invite.expires_at) < new Date()) {
      return res.status(410).json({ success: false, error: 'This link has expired. Ask HR for a new one.' });
    }

    const b = req.body || {};
    if (!b.notice_accepted) {
      return bad(res, 'Please confirm you have read how your details will be used');
    }

    const accountNumber = digitsOnly(b.bank_account_number);
    const bankCode = String(b.bank_code || '').trim();
    const accountName = String(b.bank_account_name || '').trim();
    const errors: string[] = [];
    if (!accountName) errors.push('Name on the bank account is required');
    if (accountNumber.length < 6 || accountNumber.length > 20) {
      errors.push('Bank account number looks wrong — enter the digits with no spaces or dashes');
    }
    if (!SG_BANK_CODES.has(bankCode)) errors.push('Choose your bank from the list');
    // Confirm-field, so a mistyped digit is caught here rather than by the bank.
    if (digitsOnly(b.bank_account_number_confirm) !== accountNumber) {
      errors.push('The two account numbers do not match');
    }
    const address = String(b.home_address || '').trim();
    const postal = digitsOnly(b.postal_code);
    if (!address) errors.push('Home address is required');
    if (postal.length !== 6) errors.push('Singapore postal codes are 6 digits');
    const ecName = String(b.emergency_contact_name || '').trim();
    const ecPhone = String(b.emergency_contact_phone || '').trim();
    if (!ecName) errors.push('Emergency contact name is required');
    if (!ecPhone) errors.push('Emergency contact phone is required');
    if (errors.length > 0) {
      return res.status(422).json({ success: false, error: errors[0], errors });
    }

    await client.query('BEGIN');
    await client.query(
      `UPDATE staff
          SET bank_account_name = $1, bank_account_number = $2, bank_code = $3,
              bank_branch_code = $4, home_address = $5, postal_code = $6,
              onboarding_completed_at = NOW(), onboarding_notice_accepted_at = NOW(),
              last_modified = NOW()
        WHERE staff_id = $7`,
      [
        accountName, accountNumber, bankCode,
        String(b.bank_branch_code || '').trim() || null,
        address, postal, invite.staff_id,
      ]
    );
    /**
     * ⚠️ The emergency contact currently lives in TWO places: this
     * `emergency_contacts` table, and denormalised columns added straight onto
     * `staff` by migration 071. Different screens read different ones, so
     * writing only one would leave the other stale — the same drift that made
     * the finance screens disagree with each other.
     *
     * Both are written here so neither goes stale, but this is a patch over a
     * modelling decision that should be settled: pick one home for it and drop
     * the other. Worth doing before a third screen reads a third copy.
     */
    const ecRelationship = String(b.emergency_contact_relationship || '').trim() || null;
    const ecEmail = String(b.emergency_contact_email || '').trim() || null;
    await client.query(
      `INSERT INTO emergency_contacts (staff_id, contact_name, relationship, phone, email)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (staff_id) DO UPDATE
         SET contact_name = EXCLUDED.contact_name,
             relationship = EXCLUDED.relationship,
             phone = EXCLUDED.phone,
             email = EXCLUDED.email`,
      [invite.staff_id, ecName, ecRelationship, ecPhone, ecEmail]
    );
    await client.query(
      `UPDATE staff
          SET emergency_contact_name = $1,
              emergency_contact_relationship = $2,
              emergency_contact_phone = $3
        WHERE staff_id = $4`,
      [ecName, ecRelationship, ecPhone, invite.staff_id]
    );
    await client.query(
      `UPDATE staff_onboarding_invites SET status = 'completed', completed_at = NOW() WHERE id = $1`,
      [invite.id]
    );
    // Records that the EMPLOYEE supplied these, not an administrator.
    await client.query(
      `INSERT INTO staff_onboarding_submissions (invite_id, staff_id, fields)
       VALUES ($1,$2,$3)`,
      [invite.id, invite.staff_id, ['bank_details', 'home_address', 'emergency_contact']]
    );
    await client.query('COMMIT');

    res.json({
      success: true,
      message: "Thank you — that's everything we need. Your salary will go to the account you gave us.",
    });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('[onboarding] submit failed:', err);
    res.status(500).json({ success: false, error: 'Something went wrong saving your details. Please try again.' });
  } finally {
    client.release();
  }
});

export default { adminRouter, publicRouter };
