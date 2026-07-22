import db from '../db.js';

/**
 * Aligns task_photos with the feature that writes to it.
 *
 * Both upload routes insert errand_id, doer_id, key and caption. The table has
 * task_id, photo_url, uploaded_by and uploaded_at. Every insert therefore threw,
 * so no completion photo has ever been stored — which matters more than it
 * sounds: these photos are the doer's evidence that the work was done, and the
 * asker's evidence of its condition. A dispute over "was this actually
 * finished" currently has nothing to look at.
 *
 * The naming disagreement is settled in the table's favour where the table is
 * already right (task_id, uploaded_by are consistent with the rest of the
 * schema) and the two genuinely missing columns are added:
 *
 *   key     — the object-storage key, needed to delete or re-sign a URL later.
 *             Without it a photo can be shown but never removed, which is a
 *             retention problem as well as an operational one.
 *   caption — what the doer says the photo shows. Evidence without context is
 *             much weaker in a dispute.
 *
 * The table is empty, so nothing migrates and nothing is at risk.
 */

export async function up(): Promise<void> {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    await client.query(`
      ALTER TABLE task_photos
        ADD COLUMN IF NOT EXISTS key     VARCHAR(500),
        ADD COLUMN IF NOT EXISTS caption TEXT
    `);

    // Photos are fetched per errand on every task-detail view.
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_task_photos_task ON task_photos (task_id)
    `);

    await client.query(`
      COMMENT ON COLUMN task_photos.key IS
        'Object-storage key. Required to delete the file when the retention period expires — see docs/DATA_RETENTION.md.'
    `);

    await client.query('COMMIT');
    console.log('[049] task_photos: key + caption added');
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
    await client.query(`DROP INDEX IF EXISTS idx_task_photos_task`);
    await client.query(`ALTER TABLE task_photos DROP COLUMN IF EXISTS key, DROP COLUMN IF EXISTS caption`);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
