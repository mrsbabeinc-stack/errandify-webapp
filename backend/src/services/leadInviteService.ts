import crypto from 'crypto';
import db from '../db.js';

/**
 * Turning a captured lead into an attributed signup.
 *
 * The interest form collects people before launch. This is what closes the
 * loop on launch day: an admin issues an invite, the person follows the link,
 * and when their account is created the lead row is marked converted — so
 * "how many of those 52 became members" is a query rather than a guess.
 *
 * ── The token is stored hashed ───────────────────────────────────────────
 * It travels in a URL, so it lands in browser history, in whatever chat app
 * forwarded it, and in any proxy log that records query strings. Storing the
 * hash means a leaked `lead_invites` table hands nobody a working invite. Same
 * shape as a password reset token: hash the incoming value and compare.
 *
 * ── Single use ───────────────────────────────────────────────────────────
 * `used_at` is set exactly once, by a conditional UPDATE that only matches an
 * unused row. An invite that stayed live after redemption would let one
 * forwarded WhatsApp message create any number of "converted" leads, and the
 * conversion rate — the one number this exists to produce — would be fiction.
 *
 * ── It does not create the account ───────────────────────────────────────
 * Redemption happens inside the signup transaction, so an invite can never be
 * burned by a signup that then fails. If the account is not created, the
 * invite is still good for the retry.
 *
 * PDPA: the invite holds no personal data of its own. It points at a lead and
 * dies with it via ON DELETE CASCADE, so purging a lead under s25 cannot leave
 * a token that still resolves to a name.
 */

/** How long an invite stays good. Long enough to survive a slow launch week. */
const INVITE_TTL_DAYS = 30;

const hash = (token: string) => crypto.createHash('sha256').update(token).digest('hex');

export interface IssuedInvite {
  token: string;
  link: string;
  expiresAt: string;
}

function inviteLink(token: string): string {
  const base = (process.env.FRONTEND_URL || 'https://errandify.ai').replace(/\/+$/, '');
  return `${base}/join?invite=${encodeURIComponent(token)}`;
}

/**
 * Issue an invite for a lead. The plaintext token is returned exactly once —
 * it is never stored and cannot be recovered, so a lost link means issuing a
 * new one.
 *
 * Any earlier unused invite for the same lead is retired first. Otherwise a
 * lead re-invited three times has three live tokens, and whichever is redeemed
 * leaves two that still work.
 */
export async function issueInvite(
  leadId: number,
  adminUserId: number | null,
  channel: 'email' | 'sms' | 'link' = 'link'
): Promise<IssuedInvite> {
  const lead = await db.query(
    `SELECT id, converted_at, consent_contact FROM leads WHERE id = $1`,
    [leadId]
  );
  if (lead.rows.length === 0) throw new Error('Lead not found');
  if (lead.rows[0].converted_at) throw new Error('That lead has already signed up');

  // An invite is a message to a person. Someone who never agreed to be
  // contacted should not receive one — the consent gate belongs here, at the
  // point the invite is created, not only on the screen that offers the button.
  if (!lead.rows[0].consent_contact) {
    throw new Error(
      'That lead has not consented to be contacted. Re-permission them before inviting.'
    );
  }

  await db.query(
    `UPDATE lead_invites SET used_at = NOW()
      WHERE lead_id = $1 AND used_at IS NULL`,
    [leadId]
  );

  const token = crypto.randomBytes(24).toString('base64url');
  const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000);

  await db.query(
    `INSERT INTO lead_invites (lead_id, token_hash, channel, expires_at, created_by)
     VALUES ($1, $2, $3, $4, $5)`,
    [leadId, hash(token), channel, expiresAt, adminUserId]
  );
  await db.query(
    `INSERT INTO lead_events (lead_id, kind, note, actor_admin_id)
     VALUES ($1, 'invited', $2, $3)`,
    [leadId, `Invite issued (${channel}), valid ${INVITE_TTL_DAYS} days`, adminUserId]
  );
  await db.query(
    `UPDATE leads SET stage = 'invited', stage_changed_at = NOW(), updated_at = NOW()
      WHERE id = $1 AND stage IN ('new','contacted','qualified')`,
    [leadId]
  );

  return { token, link: inviteLink(token), expiresAt: expiresAt.toISOString() };
}

export interface InvitePrefill {
  fullName: string;
  email: string | null;
  mobile: string | null;
  leadType: 'individual' | 'company';
  companyName: string | null;
}

/**
 * What the signup form should prefill. Read-only — looking at an invite does
 * not consume it, because someone may open the link, close the tab, and come
 * back tomorrow.
 *
 * Returns null for anything expired, used or unknown, without saying which:
 * the endpoint is public, and distinguishing "expired" from "never existed"
 * tells a stranger which tokens once existed.
 */
export async function peekInvite(token: string): Promise<InvitePrefill | null> {
  if (!token || !token.trim()) return null;

  const result = await db.query(
    `SELECT l.full_name, l.email, l.mobile, l.lead_type, l.company_name
       FROM lead_invites i
       JOIN leads l ON l.id = i.lead_id
      WHERE i.token_hash = $1
        AND i.used_at IS NULL
        AND i.expires_at > NOW()
        AND l.converted_at IS NULL
      LIMIT 1`,
    [hash(token.trim())]
  );
  if (result.rows.length === 0) return null;

  const r = result.rows[0];
  return {
    fullName: r.full_name,
    email: r.email,
    mobile: r.mobile,
    leadType: r.lead_type,
    companyName: r.company_name,
  };
}

/**
 * Redeem an invite against a newly created account.
 *
 * Called with the signup transaction's client so the invite, the lead and the
 * user are committed together. Returns false when the token is unknown,
 * expired or already used — the signup itself must never fail because of it.
 */
export async function redeemInvite(
  client: any,
  token: string,
  newUserId: number
): Promise<{ redeemed: boolean; leadId?: number }> {
  if (!token || !token.trim()) return { redeemed: false };

  // Conditional UPDATE, not SELECT-then-UPDATE: two tabs redeeming the same
  // token race, and only the one that actually moved the row gets a result.
  const claimed = await client.query(
    `UPDATE lead_invites
        SET used_at = NOW(), used_by_user_id = $2
      WHERE token_hash = $1
        AND used_at IS NULL
        AND expires_at > NOW()
      RETURNING lead_id`,
    [hash(token.trim()), newUserId]
  );
  if (claimed.rows.length === 0) return { redeemed: false };

  const leadId = claimed.rows[0].lead_id;

  await client.query(
    `UPDATE leads
        SET converted_user_id = $2,
            converted_at = NOW(),
            stage = 'converted',
            stage_changed_at = NOW(),
            updated_at = NOW()
      WHERE id = $1`,
    [leadId, newUserId]
  );
  await client.query(
    `INSERT INTO lead_events (lead_id, kind, note) VALUES ($1, 'converted', $2)`,
    [leadId, 'Signed up via invite link']
  );

  return { redeemed: true, leadId };
}

export default { issueInvite, peekInvite, redeemInvite };
