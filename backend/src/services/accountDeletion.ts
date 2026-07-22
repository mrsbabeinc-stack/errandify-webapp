import db from '../db.js';

/**
 * Account deletion under PDPA s25.
 *
 * The obligation is to cease retaining personal data once its purpose is served
 * and no legal or business need remains. PDPC Advisory Guidelines on Key
 * Concepts give two lawful ways to do that (18.10): destroy it, or anonymise it
 * — and 18.14 deems anonymised data no longer retained.
 *
 * Dropping the rows is not available to us. The counterparty's errand and
 * payment history is retained for a legal purpose (18.4(b)); PDPC's worked
 * example cites the Limitation Act's six-year window for contract claims and
 * suggests keeping contract records around seven years. Deleting a doer would
 * also delete half of an asker's record of what happened to them.
 *
 * So the identity is stripped and the transaction kept. What survives is a bare
 * integer id with no name, contact, document, biometric or financial detail
 * attached — pseudonymous rather than perfectly anonymous, which is why the
 * purge in docs/DATA_RETENTION.md finishes the job once the retention periods
 * expire. That distinction is worth putting to a lawyer.
 *
 * NOT LEGAL ADVICE. Statute and guideline references are given so they can be
 * checked.
 */

/**
 * Every column on `users` that identifies a person or reveals something about
 * them. Listed explicitly rather than by exclusion: a new column should default
 * to surviving deletion only because someone decided it should, not because a
 * wildcard missed it.
 */
const IDENTIFYING_COLUMNS: string[] = [
  // Who they are
  'display_name', 'alias', 'dob', 'gender', 'bio', 'profile_image_url',
  // How to reach them
  'email', 'mobile', 'address',
  // Government and platform identifiers
  'nric_hash', 'singpass_id', 'referral_code', 'formatted_user_id', 'user_id',
  // Financial — the most damaging of the lot to leave behind
  'bank_name', 'account_holder', 'account_number',
  'stripe_account_id', 'stripe_external_account_id',
  // Sensitive: criminal declarations. Kept no longer than the account itself.
  'conviction_details', 'conviction_declaration_date',
  // Free-text and documents that can name a person
  'certificates',
  // Preferences that profile someone
  'category_can_help', 'category_need_help', 'notification_preferences',
  'email_preferences', 'chas_card_color',
];

export interface DeletionBlocker {
  type: string;
  count: number;
  message: string;
  details?: string;
}

/**
 * Reasons this account cannot be closed yet.
 *
 * Shared by the eligibility endpoint and the deletion itself, because they used
 * to disagree: eligibility checked errands, disputes and company ownership
 * while the delete route checked only errands, so anyone with an open dispute
 * could delete by calling the API directly and skipping the screen.
 */
export async function getDeletionBlockers(userId: number): Promise<DeletionBlocker[]> {
  const blockers: DeletionBlocker[] = [];

  const errands = await db.query(
    `SELECT COUNT(*) AS count FROM errands
      WHERE (asker_id = $1
             OR id IN (SELECT errand_id FROM errand_assignments WHERE doer_id = $1))
        AND status IN ('posted','bidding','open','accepted','confirmed','in_progress','pending_review')`,
    [userId]
  );
  const pendingErrands = Number(errands.rows[0]?.count || 0);
  if (pendingErrands > 0) {
    blockers.push({
      type: 'PENDING_ERRANDS',
      count: pendingErrands,
      message: `${pendingErrands} errand${pendingErrands > 1 ? 's' : ''} still open`,
      details: 'Finish or cancel these first — someone is relying on them.',
    });
  }

  const disputes = await db.query(
    `SELECT COUNT(*) AS count
       FROM disputes d
       JOIN errands e ON e.id = d.errand_id
       LEFT JOIN bids ab ON ab.id = e.accepted_bid_id
      WHERE (d.raised_by_id = $1 OR d.filed_by_user_id = $1
             OR e.asker_id = $1 OR ab.doer_id = $1)
        AND d.status IN ('open','pending_review','under_investigation')`,
    [userId]
  );
  const pendingDisputes = Number(disputes.rows[0]?.count || 0);
  if (pendingDisputes > 0) {
    blockers.push({
      type: 'PENDING_DISPUTES',
      count: pendingDisputes,
      message: `${pendingDisputes} dispute${pendingDisputes > 1 ? 's' : ''} still open`,
      details: 'These need to close before the account can be — the other party has a stake in them too.',
    });
  }

  const companies = await db.query(
    `SELECT COUNT(*) AS count FROM companies WHERE owner_user_id = $1`,
    [userId]
  );
  const ownedCompanies = Number(companies.rows[0]?.count || 0);
  if (ownedCompanies > 0) {
    blockers.push({
      type: 'ACTIVE_COMPANY',
      count: ownedCompanies,
      message: `${ownedCompanies} compan${ownedCompanies > 1 ? 'ies' : 'y'} owned`,
      details: 'Transfer ownership or close the company first. Its staff would otherwise lose their employer.',
    });
  }

  // Escrow and platform-fee ledgers do not exist yet — no payment_holds table,
  // no transactions table, no capture_method anywhere. When they land, a
  // blocker belongs here: an account must not be closable while it is holding
  // someone else's money.

  return blockers;
}

export interface DeletionResult {
  anonymisedFields: number;
  retained: string[];
}

/**
 * Strips the identity and records when. The caller must have checked
 * getDeletionBlockers first.
 */
export async function anonymiseAccount(
  userId: number,
  reason: 'user_request' | 'admin_action' = 'user_request'
): Promise<DeletionResult> {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    // Only null the columns this database actually has. The previous version
    // wrote to is_deleted and password_hash, neither of which exists, so it
    // threw and deleted nothing at all.
    const present = await client.query(
      `SELECT column_name, is_nullable FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = ANY($1::text[])`,
      [IDENTIFYING_COLUMNS]
    );
    const columns: string[] = present.rows.map((r: any) => r.column_name);

    if (columns.length > 0) {
      // display_name, mobile and nric_hash are NOT NULL, so they cannot simply
      // be emptied. They get a value derived only from the row id, which
      // identifies nobody — the point of s25 is that the data can no longer be
      // associated with a particular individual (18.14), not that the field is
      // literally empty. Keeping them unique also avoids collisions on any
      // unique index when a second account is closed.
      const sets = present.rows.map((r: any) =>
        r.is_nullable === 'NO'
          ? `"${r.column_name}" = 'deleted-' || $1::text`
          : `"${r.column_name}" = NULL`
      ).join(', ');
      await client.query(`UPDATE users SET ${sets} WHERE id = $1`, [userId]);

      // Read back as evidence rather than assuming the write did what it said.
      const check = await client.query(
        `SELECT display_name, alias, email, mobile, nric_hash, account_number,
                conviction_details, singpass_id
           FROM users WHERE id = $1`,
        [userId]
      );
      const leftover = Object.entries(check.rows[0] || {})
        .filter(([k, v]) => v !== null && !String(v).startsWith('deleted-'));
      if (leftover.length > 0) {
        throw new Error(
          `Anonymisation incomplete, refusing to report success: ${leftover.map(([k]) => k).join(', ')}`
        );
      }
    }

    await client.query(
      `UPDATE users
          SET status = 'deleted',
              account_active = false,
              anonymised_at = NOW(),
              deletion_reason = $2,
              updated_at = NOW()
        WHERE id = $1`,
      [userId, reason]
    );

    // Things that must stop immediately rather than wait for the purge: they
    // are live channels to a person who has asked to leave.
    await client.query(`DELETE FROM user_consents WHERE user_id = $1`, [userId]);
    await client.query(
      `DELETE FROM notifications WHERE user_id = $1`, [userId]
    ).catch(() => undefined);

    // The screening declaration is criminal-record data. Its purpose ends with
    // the account, and nothing legal requires us to keep it, so it goes now
    // rather than at the seven-year mark.
    await client.query(`DELETE FROM screening_declarations WHERE user_id = $1`, [userId]);
    await client.query(`DELETE FROM user_category_restrictions WHERE user_id = $1`, [userId]);

    await client.query('COMMIT');

    return {
      anonymisedFields: columns.length,
      retained: [
        'Errand and offer history, with your name removed',
        'Payment and payout records, kept for tax and accounting',
        'Resolved dispute outcomes, which the other party also relies on',
        'Ratings you gave or received, shown without your name',
      ],
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
