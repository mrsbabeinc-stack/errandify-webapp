/**
 * The dispute retention sweep, proved on backdated fixtures.
 *
 * docs/DATA_RETENTION.md promises seven years for resolved dispute outcomes.
 * The point of this script is that the promise is now kept AND bounded: the
 * personal narrative and the evidence images go, the financial record stays.
 * Getting either half wrong is a problem — over-deleting destroys evidence the
 * counterparty relies on, under-deleting is the s25 breach.
 *
 *   npx tsx scripts/dispute-retention.ts
 *
 * Runs against the local database directly (no server needed) and removes every
 * fixture it creates.
 */
import 'dotenv/config';
import db from '../src/db.js';
import { execSync } from 'child_process';

const DB = 'errandify_local';
const q = (sql: string) =>
  execSync(`psql ${DB} -tAc ${JSON.stringify(sql.replace(/\s+/g, ' ').trim())}`, { encoding: 'utf8' })
    .split('\n').map((l) => l.trim()).filter(Boolean)
    .filter((l) => !/^(INSERT|UPDATE|DELETE|SELECT) \d/.test(l))[0] || '';

const rnd = () => Math.random().toString(36).slice(2, 11);
let pass = 0, fail = 0;
const step = (name: string, ok: boolean, detail = '') => {
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  ' + detail : ''}`);
  ok ? pass++ : fail++;
};

const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

async function main() {
  console.log('\n=== Dispute retention sweep ===\n');

  const mkUser = (name: string, role: string) =>
    Number(q(`INSERT INTO users (display_name, mobile, nric_hash, role, status)
      VALUES ('${name}', '+650${Math.floor(1e8 + Math.random() * 9e8)}', 'ZZRET_${rnd()}', '${role}', 'active')
      RETURNING id`));

  const asker = mkUser('ZZRET asker', 'asker');
  const doer = mkUser('ZZRET doer', 'doer');

  const mkDispute = (closedYearsAgo: number) => {
    const errand = Number(q(`INSERT INTO errands (asker_id, title, description, category, budget, status, deadline, created_at)
      VALUES (${asker}, 'ZZRET errand', 'x', 'delivery-moving', 100, 'completed', '2026-09-05 10:00', NOW()) RETURNING id`));
    const bid = Number(q(`INSERT INTO bids (errand_id, doer_id, amount, status)
      VALUES (${errand}, ${doer}, 100, 'accepted') RETURNING id`));
    q(`UPDATE errands SET accepted_bid_id = ${bid} WHERE id = ${errand}`);
    const id = Number(q(`INSERT INTO disputes
      (errand_id, filed_by_user_id, defendant_user_id, dispute_type, description, status,
       defendant_response, resolution, resolution_kind, resolution_notes,
       appeal_reason, hana_reasoning, outcome_message_asker, outcome_message_doer,
       settlement_doer_amount, settlement_asker_amount, settlement_fee, settlement_status,
       resolved_at, closed_at)
      VALUES (${errand}, ${asker}, ${doer}, 'low_quality',
       'He left the boxes in the corridor at 21 Bedok North, flat 04-118.', 'closed',
       'I put them where she told me to on the phone.',
       'partial', 'monetary', 'Split because part of the job was done.',
       'I want this looked at again, the photos prove it.',
       'Hana read both statements and suggested a split.',
       'You are getting $40 back.', 'You are keeping $48.',
       60, 40, 12, 'settled',
       NOW() - INTERVAL '${closedYearsAgo} years', NOW() - INTERVAL '${closedYearsAgo} years')
      RETURNING id`));
    q(`INSERT INTO dispute_evidence (dispute_id, evidence_type, submitted_by_user_id, photo_data, photo_mime, photo_filename, photo_bytes)
       VALUES (${id}, 'photo', ${asker}, '${PNG}', 'image/png', 'corridor-boxes.png', 95)`);
    return { id, errand, bid };
  };

  // One long past its seven years, one that closed last month.
  const old = mkDispute(8);
  const recent = mkDispute(0);

  const { purgeExpiredDisputes } = await import('../src/services/retentionPurge.js');

  try {
    // ---- dry run: sees it, touches nothing -------------------------------
    delete process.env.RETENTION_PURGE_ENABLED;
    const dry = await purgeExpiredDisputes();
    step('dry run is the default', dry.dryRun);
    step('the eight-year-old dispute is eligible', dry.eligible >= 1, `${dry.eligible} eligible`);
    step('dry run changes nothing', dry.stripped === 0);
    step('the description is still there after a dry run',
      q(`SELECT description IS NOT NULL FROM disputes WHERE id = ${old.id}`) === 't');

    // ---- live -------------------------------------------------------------
    process.env.RETENTION_PURGE_ENABLED = 'true';
    const live = await purgeExpiredDisputes();
    step('live run strips it', live.stripped >= 1, `${live.stripped} stripped`);
    step('the evidence image was cleared', live.evidenceImagesCleared >= 1);

    // ---- what must be GONE ------------------------------------------------
    const remaining = q(`SELECT concat_ws(',',
        CASE WHEN description IS NOT NULL THEN 'description' END,
        CASE WHEN defendant_response IS NOT NULL THEN 'defendant_response' END,
        CASE WHEN resolution_notes IS NOT NULL THEN 'resolution_notes' END,
        CASE WHEN appeal_reason IS NOT NULL THEN 'appeal_reason' END,
        CASE WHEN hana_reasoning IS NOT NULL THEN 'hana_reasoning' END,
        CASE WHEN outcome_message_asker IS NOT NULL THEN 'outcome_message_asker' END,
        CASE WHEN outcome_message_doer IS NOT NULL THEN 'outcome_message_doer' END)
      FROM disputes WHERE id = ${old.id}`);
    step('every free-text field is gone', remaining === '', remaining || 'nothing left');

    const img = q(`SELECT concat_ws(',',
        CASE WHEN photo_data IS NOT NULL THEN 'photo_data' END,
        CASE WHEN photo_filename IS NOT NULL THEN 'photo_filename' END)
      FROM dispute_evidence WHERE dispute_id = ${old.id}`);
    step('the image and its filename are gone', img === '', img || 'nothing left');

    // ---- what must SURVIVE ------------------------------------------------
    const kept = q(`SELECT settlement_doer_amount || '/' || settlement_asker_amount || '/' ||
                           settlement_fee || '/' || resolution || '/' || settlement_status
                      FROM disputes WHERE id = ${old.id}`);
    step('the financial record survives intact', kept === '60.00/40.00/12.00/partial/settled', kept);
    step('the dispute row still exists',
      q(`SELECT count(*) FROM disputes WHERE id = ${old.id}`) === '1');
    step('the evidence row survives, so the record of what was submitted stands',
      q(`SELECT count(*) FROM dispute_evidence WHERE dispute_id = ${old.id}`) === '1');
    step('and it records that the policy ran',
      q(`SELECT retention_stripped_at IS NOT NULL FROM disputes WHERE id = ${old.id}`) === 't');

    // ---- what must NOT be touched ----------------------------------------
    step('the recent dispute is untouched',
      q(`SELECT description IS NOT NULL AND retention_stripped_at IS NULL FROM disputes WHERE id = ${recent.id}`) === 't');
    step('and its evidence image is still there',
      q(`SELECT photo_data IS NOT NULL FROM dispute_evidence WHERE dispute_id = ${recent.id}`) === 't');

    // ---- idempotent -------------------------------------------------------
    const again = await purgeExpiredDisputes();
    step('a second run finds nothing to do', again.eligible === 0, `${again.eligible} eligible`);
  } finally {
    for (const d of [old, recent]) {
      q(`DELETE FROM dispute_evidence WHERE dispute_id = ${d.id}`);
      q(`DELETE FROM disputes WHERE id = ${d.id}`);
      q(`DELETE FROM bids WHERE id = ${d.bid}`);
      q(`DELETE FROM errands WHERE id = ${d.errand}`);
    }
    q(`DELETE FROM users WHERE id IN (${asker}, ${doer})`);
    console.log('\n  fixtures removed');
    console.log(`\n=== ${pass}/${pass + fail} passed ===\n`);
    await db.end?.();
    process.exit(fail === 0 ? 0 : 1);
  }
}

main().catch((e) => {
  console.error('\nERROR:', e.message);
  process.exit(1);
});
