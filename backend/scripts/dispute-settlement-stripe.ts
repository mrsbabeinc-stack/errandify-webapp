/**
 * Settlement against real Stripe, in TEST MODE.
 *
 * The rest of the dispute suite runs against the live server, where the Stripe
 * calls fail — not because the code is wrong but because Node here cannot
 * verify Stripe's certificate chain (its bundled CA set lacks DigiCert Assured
 * ID Root G2, which macOS itself trusts). So this one runs in-process with
 * NODE_EXTRA_CA_CERTS pointed at that root, and is the only thing that proves
 * the legs actually pay:
 *
 *   NODE_EXTRA_CA_CERTS=/path/to/digicert-root-g2.pem npx tsx scripts/dispute-settlement-stripe.ts
 *
 * It creates a real test-mode charge, settles it through executeSettlement, and
 * then puts everything back: the transfer is reversed and the charge refunded in
 * full. Nothing it creates is left behind, and it refuses to run at all if the
 * key is not a test key.
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
const money = (n: any) => `$${Number(n ?? 0).toFixed(2)}`;

let pass = 0, fail = 0;
const step = (name: string, ok: boolean, detail = '') => {
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  ' + detail : ''}`);
  ok ? pass++ : fail++;
  return ok;
};

async function main() {
  const key = process.env.STRIPE_SECRET_KEY || '';
  if (!key.startsWith('sk_test')) {
    throw new Error('Refusing to run: STRIPE_SECRET_KEY is not a test key.');
  }
  console.log('\n=== Dispute settlement against Stripe (TEST MODE) ===\n');

  const Stripe = (await import('stripe')).default;
  const stripe = new Stripe(key, { apiVersion: '2024-06-20' as any });

  // A connected account that can actually receive money. Reused rather than
  // created: a fresh Express account has payouts disabled until onboarding, and
  // preflight would correctly refuse to transfer to it.
  const accounts = await stripe.accounts.list({ limit: 20 });
  const payee = accounts.data.find((a) => a.payouts_enabled);
  if (!payee) throw new Error('No payouts-enabled test connected account available.');
  step('found a payouts-enabled test account', true, payee.id);

  // ---- fixtures ---------------------------------------------------------
  const mkUser = (name: string, role: string) =>
    Number(q(`INSERT INTO users (display_name, mobile, nric_hash, role, status)
      VALUES ('${name}', '+650${Math.floor(1e8 + Math.random() * 9e8)}', 'ZZSTRIPE_${rnd()}', '${role}', 'active')
      RETURNING id`));

  const asker = mkUser('ZZSTRIPE asker', 'asker');
  const doer = mkUser('ZZSTRIPE doer', 'doer');
  q(`UPDATE users SET stripe_account_id = '${payee.id}' WHERE id = ${doer}`);

  const errand = Number(q(`INSERT INTO errands (asker_id, title, description, category, budget, status, deadline, created_at, payment_authorised_at)
    VALUES (${asker}, 'ZZSTRIPE settlement', 'x', 'delivery-moving', 100, 'completed', '2026-09-05 10:00', NOW(), NOW())
    RETURNING id`));
  const bid = Number(q(`INSERT INTO bids (errand_id, doer_id, amount, status)
    VALUES (${errand}, ${doer}, 100, 'accepted') RETURNING id`));
  q(`UPDATE errands SET accepted_bid_id = ${bid} WHERE id = ${errand}`);

  let disputeId = 0;
  let transferId = '';
  let intentId = '';

  try {
    // ---- a real charge to settle against ---------------------------------
    const intent = await stripe.paymentIntents.create({
      amount: 10000,
      currency: 'sgd',
      payment_method: 'pm_card_visa',
      confirm: true,
      automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
      description: `ZZSTRIPE dispute settlement check (errand ${errand})`,
    });
    intentId = intent.id;
    step('created and confirmed a $100 test charge', intent.status === 'succeeded', `${intent.id} ${intent.status}`);
    q(`UPDATE errands SET payment_intent_id = '${intent.id}' WHERE id = ${errand}`);

    // ---- a decided dispute: 60 to the doer, 40 back, fee on the doer share
    disputeId = Number(q(`INSERT INTO disputes
      (errand_id, filed_by_user_id, defendant_user_id, dispute_type, description, status,
       response_status, resolution, resolution_kind, resolution_notes, resolved_at,
       settlement_doer_amount, settlement_asker_amount, settlement_fee, settlement_status,
       appeal_window_closes_at, claimant_can_appeal, defendant_can_appeal)
      VALUES (${errand}, ${asker}, ${doer}, 'low_quality', 'ZZSTRIPE settlement check', 'resolved',
       'received', 'partial', 'monetary', 'Split for the settlement check.', NOW(),
       60, 40, 12, 'not_started', NOW() - INTERVAL '1 hour', false, false)
      RETURNING id`));

    const { prepareSettlementLegs, checkSettlementReadiness, preflightSettlement, executeSettlement } =
      await import('../src/services/disputeSettlement.js');

    await prepareSettlementLegs(disputeId);
    const legs = q(`SELECT string_agg(leg || '=' || amount, ' ' ORDER BY leg)
                      FROM dispute_settlement_legs WHERE dispute_id = ${disputeId}`);
    step('legs staged', /doer_transfer=48/.test(legs) && /asker_refund=40/.test(legs), legs);

    const readiness = await checkSettlementReadiness(disputeId);
    step('readiness says go', readiness.ready, readiness.reason);

    const pre = await preflightSettlement(disputeId);
    step('preflight clears the payout account', pre.ok, pre.blockers.join('; ') || 'no blockers');

    // ---- the part that has never actually run ---------------------------
    const result = await executeSettlement(disputeId);
    for (const leg of result.legs) {
      step(`leg ${leg.leg} paid`, leg.status === 'succeeded', leg.reference || leg.error || '');
      if (leg.leg === 'doer_transfer' && leg.reference) transferId = leg.reference;
    }
    step('every leg settled', result.allSettled);

    // ---- and the consequences the module promises ------------------------
    const after = q(`SELECT settlement_status || '/' || status FROM disputes WHERE id = ${disputeId}`);
    step('dispute closed and marked settled', after === 'settled/closed', after);

    const errandAfter = q(`SELECT status || '/' || payment_held FROM errands WHERE id = ${errand}`);
    step('errand released and out of dispute', errandAfter === 'completed/false', errandAfter);

    // ---- idempotency: settling twice must not pay twice -------------------
    const again = await executeSettlement(disputeId);
    step('a second settle pays nothing more', again.legs.length === 0, `${again.legs.length} legs touched`);

    // ---- confirm against Stripe itself, not our own database -------------
    const refunds = await stripe.refunds.list({ payment_intent: intent.id, limit: 10 });
    const refunded = refunds.data.reduce((n, r) => n + r.amount, 0);
    step('Stripe shows the refund', refunded === 4000, `${money(refunded / 100)} refunded`);

    if (transferId) {
      const tr = await stripe.transfers.retrieve(transferId);
      step('Stripe shows the transfer', tr.amount === 4800, `${money(tr.amount / 100)} to ${tr.destination}`);
    }
  } finally {
    // ---- put everything back --------------------------------------------
    console.log('\n  cleaning up…');
    try {
      if (transferId) {
        const rev = await stripe.transfers.createReversal(transferId, {});
        console.log(`  reversed transfer ${transferId} (${rev.id})`);
      }
    } catch (e: any) {
      console.log(`  ! could not reverse the transfer: ${e.message}`);
    }
    try {
      if (intentId) {
        const refunds = await stripe.refunds.list({ payment_intent: intentId, limit: 10 });
        const already = refunds.data.reduce((n, r) => n + r.amount, 0);
        if (already < 10000) {
          const r = await stripe.refunds.create({ payment_intent: intentId, amount: 10000 - already });
          console.log(`  refunded the remaining ${money((10000 - already) / 100)} (${r.id})`);
        }
      }
    } catch (e: any) {
      console.log(`  ! could not refund the remainder: ${e.message}`);
    }

    if (disputeId) {
      q(`DELETE FROM dispute_settlement_legs WHERE dispute_id = ${disputeId}`);
      q(`DELETE FROM disputes WHERE id = ${disputeId}`);
    }
    q(`DELETE FROM notifications WHERE related_errand_id = ${errand}`);
    q(`DELETE FROM bids WHERE id = ${bid}`);
    q(`DELETE FROM errands WHERE id = ${errand}`);
    q(`DELETE FROM users WHERE id IN (${asker}, ${doer})`);
    console.log('  fixtures removed');

    console.log(`\n=== ${pass}/${pass + fail} passed ===\n`);
    await db.end?.();
    process.exit(fail === 0 ? 0 : 1);
  }
}

main().catch((e) => {
  console.error('\nERROR:', e.message);
  process.exit(1);
});
