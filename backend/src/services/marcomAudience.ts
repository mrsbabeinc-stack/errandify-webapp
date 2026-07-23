import db from '../db.js';

/**
 * Who a Marcom message actually goes to.
 *
 * The admin screens used to carry hardcoded audience sizes — "All Users:
 * 24,500", "Doers: 8,750" — on a database with fifteen accounts, and a new
 * group was given `Math.floor(Math.random() * 5000) + 100` members. Every
 * number an admin saw before pressing Send was invented. These are the same
 * five audiences, resolved against the tables.
 *
 * ── Consent ──────────────────────────────────────────────────────────────
 * Marketing and service messages are not the same thing and must not share an
 * audience. A receipt, a maintenance warning, or a reminder for an event the
 * person signed up for is service communication. A promotion is marketing, and
 * under the PDPA (and the Spam Control Act for the email channel) it goes only
 * to people who have opted in — `notification_preferences.marketing_enabled`,
 * which defaults to FALSE, so the opt-in is real rather than assumed.
 *
 * `reachable` is therefore usually smaller than `audience`, and both are
 * returned: an admin whose promotional campaign reaches nobody needs to see
 * that it is consent, not a bug.
 *
 * I am not a lawyer. The provisions relied on are PDPA s13–15 (consent) and
 * the Spam Control Act's requirements for unsolicited commercial messages;
 * confirm the line drawn here with a practitioner before a live send.
 */

export type SegmentKey = 'all-users' | 'doers' | 'askers' | 'new-users' | 'vip';

export const SEGMENTS: Record<SegmentKey, { label: string; where: string }> = {
  'all-users': {
    label: 'Every active account',
    where: 'TRUE',
  },
  doers: {
    label: 'Anyone whose offer has been accepted',
    // account_active is not the liveness flag — it defaults to false and
    // nothing sets it, so filtering on it silently empties every audience.
    // users.status is what the rest of the app reads.
    where: `EXISTS (SELECT 1 FROM bids b
                     WHERE b.doer_id = u.id
                       AND b.status IN ('accepted','confirmed','closed'))`,
  },
  askers: {
    label: 'Anyone who has posted an errand',
    where: `EXISTS (SELECT 1 FROM errands e WHERE e.asker_id = u.id)`,
  },
  'new-users': {
    label: 'Joined in the last 30 days',
    where: `u.created_at >= NOW() - INTERVAL '30 days'`,
  },
  vip: {
    label: '1,000+ Errandify Points',
    where: `COALESCE(u.errandify_points, 0) >= 1000`,
  },
};

export function isSegment(value: unknown): value is SegmentKey {
  return typeof value === 'string' && value in SEGMENTS;
}

/** Accounts that can be messaged at all: live, and not anonymised under s25. */
const LIVE_ACCOUNT = `u.status = 'active' AND u.anonymised_at IS NULL`;

const MARKETING_CONSENT = `EXISTS (
  SELECT 1 FROM notification_preferences p
   WHERE p.user_id = u.id AND p.marketing_enabled = TRUE
)`;

export interface Recipient {
  id: number;
  email: string | null;
  displayName: string | null;
}

export interface AudienceCount {
  /** Live accounts matching the segment, before consent is considered. */
  audience: number;
  /** Of those, how many can actually be sent this kind of message. */
  reachable: number;
  /** Of the reachable ones, how many have an email address on file. */
  withEmail: number;
}

/**
 * Whether a message of this kind needs marketing consent.
 *
 * `promotional` / `promotion` are the only marketing kinds the two screens
 * offer. Announcements, alerts, reminders and transactional mail are service
 * communication about the platform or about something the person already did.
 */
export function needsMarketingConsent(kind: string | null | undefined): boolean {
  return kind === 'promotional' || kind === 'promotion';
}

function buildWhere(segment: SegmentKey, marketing: boolean): string {
  const clauses = [LIVE_ACCOUNT, SEGMENTS[segment].where];
  if (marketing) clauses.push(MARKETING_CONSENT);
  return clauses.filter((c) => c !== 'TRUE').join(' AND ') || 'TRUE';
}

/** Counts for a segment, with and without the consent filter applied. */
export async function countAudience(
  segment: SegmentKey,
  marketing: boolean
): Promise<AudienceCount> {
  const base = await db.query(
    `SELECT COUNT(*)::int AS n FROM users u WHERE ${buildWhere(segment, false)}`
  );
  const reach = await db.query(
    `SELECT COUNT(*)::int AS n,
            COUNT(*) FILTER (WHERE u.email IS NOT NULL AND u.email <> '')::int AS with_email
       FROM users u WHERE ${buildWhere(segment, marketing)}`
  );
  return {
    audience: base.rows[0].n,
    reachable: reach.rows[0].n,
    withEmail: reach.rows[0].with_email,
  };
}

/** The actual recipient list for a send. */
export async function resolveRecipients(
  segment: SegmentKey,
  marketing: boolean,
  opts: { requireEmail?: boolean } = {}
): Promise<Recipient[]> {
  const clauses = [buildWhere(segment, marketing)];
  if (opts.requireEmail) clauses.push(`u.email IS NOT NULL AND u.email <> ''`);

  const result = await db.query(
    `SELECT u.id, u.email, COALESCE(u.alias, u.display_name) AS display_name
       FROM users u
      WHERE ${clauses.join(' AND ')}
      ORDER BY u.id`
  );
  return result.rows.map((r: any) => ({
    id: r.id,
    email: r.email,
    displayName: r.display_name,
  }));
}
