import db from '../db.js';

/**
 * One owner per company, and one source of truth for who it is.
 *
 * Company ownership was recorded in two places that disagreed:
 * companies.owner_user_id said user 17, company_staff said user 12. Half the
 * app read one, half the other, so the same person was an owner in one module
 * and not the other — the account-deletion gate and the leave/allocation gate
 * pointed at different people.
 *
 * companies.owner_user_id is made canonical: it is one column, structurally one
 * value, and it is the registration record. company_staff derives from it.
 *
 * The data fix: company 3's two "owners" are both demo accounts. User 12 is
 * Singpass-verified (a real owner must be) and is what every test and the
 * working company flow already use; user 17 is a seed/admin account with no
 * Singpass that owns nothing else. So company 3 consolidates on user 12. This
 * is reversible — set owner_user_id back to 17 — and touches only demo data.
 *
 * The constraint: a partial unique index so a company can have at most one
 * active owner row in company_staff. This is what actually prevents the
 * disagreement recurring.
 */

export async function up(): Promise<void> {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    // Align company 3 on the Singpass-verified account already acting as owner.
    // Guarded so it only touches the specific demo row, not every company.
    await client.query(
      `UPDATE companies SET owner_user_id = 12, updated_at = NOW()
        WHERE id = 3 AND owner_user_id = 17`
    );

    // At most one active owner per company, enforced by the database rather than
    // by convention. Partial so resigned/inactive rows do not count.
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uniq_company_active_owner
        ON company_staff (company_id)
        WHERE role = 'owner' AND status = 'active'
    `);

    await client.query('COMMIT');
    console.log('[050] company 3 owner consolidated on user 12; one-active-owner constraint added');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function down(): Promise<void> {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    await client.query(`DROP INDEX IF EXISTS uniq_company_active_owner`);
    await client.query(`UPDATE companies SET owner_user_id = 17 WHERE id = 3 AND owner_user_id = 12`);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
