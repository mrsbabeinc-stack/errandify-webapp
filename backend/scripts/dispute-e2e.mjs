/**
 * Dispute module, end to end, against the live server.
 *
 * Walks one dispute the whole way — file -> defend -> Hana -> admin decides ->
 * appeal -> appeal reviewed -> settle -> errand closed — and a second one down
 * the /verdict path, because two decision routes existed and only one of them
 * could ever reach settlement.
 *
 * Fixtures come from testkit.mjs, which only ever deletes ids it created.
 * Run with the backend up:  node backend/scripts/dispute-e2e.mjs
 */
import { tok, call, step, results } from './journey.mjs';
import * as kit from './testkit.mjs';

const money = (n) => Number(n ?? 0).toFixed(2);

async function main() {
  console.log('\n=== Dispute end to end ===\n');

  // ---- fixtures ---------------------------------------------------------
  const asker = kit.makeUser({ name: 'ZZKIT asker', role: 'asker' });
  const doer = kit.makeUser({ name: 'ZZKIT doer', role: 'doer' });
  const admin = kit.makeUser({ name: 'ZZKIT admin', role: 'admin' });
  const errand = kit.makeErrand(asker, { title: 'dispute e2e', budget: 100, status: 'completed' });
  const bid = kit.makeBid(errand, doer, { amount: 100, status: 'accepted' });
  kit.sql(`UPDATE errands SET accepted_bid_id = ${bid}, payment_authorised_at = NOW() WHERE id = ${errand}`);

  const tAsker = tok(asker), tDoer = tok(doer), tAdmin = tok(admin);

  // ---- 1. file ----------------------------------------------------------
  const filed = await call('POST', '/api/disputes', tAsker, {
    errandId: errand, type: 'low_quality',
    description: 'The work delivered was not what we agreed and half of it is missing.',
  });
  step('asker files a dispute', filed, (r) => r.status === 201 && r.body.disputeId);
  const id = filed.body.disputeId;
  if (!id) { report(); return; }
  kit.trackDispute(id);

  step('errand moves out of its normal flow while disputed',
    { status: 200, body: { s: kit.sql(`SELECT status FROM errands WHERE id = ${errand}`) } },
    (r) => r.body.s === 'disputed');

  step('payment is held on filing',
    { status: 200, body: { h: kit.sql(`SELECT payment_held FROM errands WHERE id = ${errand}`) } },
    (r) => r.body.h === 't');

  // ---- 2. both sides can see it -----------------------------------------
  step('defendant can view the dispute', await call('GET', `/api/disputes/${id}`, tDoer));
  step('admin can view the dispute', await call('GET', `/api/disputes/${id}`, tAdmin));

  // ---- 3. defend --------------------------------------------------------
  kit.sql(`UPDATE disputes SET defendant_user_id = ${doer}, requires_defense = true,
           response_deadline = NOW() + INTERVAL '2 days' WHERE id = ${id}`);
  step('defendant responds', await call('POST', `/api/disputes/${id}/defense`, tDoer, {
    response: 'I did the whole job and sent photos at the time. Happy to show them.',
  }));

  // ---- 4. Hana proposes, never decides ----------------------------------
  await new Promise((r) => setTimeout(r, 2500));
  const afterHana = kit.sql(`SELECT status FROM disputes WHERE id = ${id}`);
  step('Hana leaves it with a human (admin_review)',
    { status: 200, body: { s: afterHana } },
    (r) => r.body.s === 'admin_review' || r.body.s === 'hana_reviewing');

  // ---- 5. admin decides: 60/40 split ------------------------------------
  const resolved = await call('POST', `/api/disputes/${id}/resolve`, tAdmin, {
    resolution: 'partial', doerAmount: 60, askerAmount: 40,
    notes: 'Part of the work was done to standard and part was not, so the fee is split.',
  });
  step('admin resolves with a 60/40 split', resolved);

  const legsAfterResolve = kit.sql(
    `SELECT string_agg(leg || '=' || amount || '/' || status, ' ' ORDER BY leg)
       FROM dispute_settlement_legs WHERE dispute_id = ${id}`);
  step(`settlement legs staged (${legsAfterResolve})`,
    { status: 200, body: { l: legsAfterResolve } },
    (r) => /doer_transfer=/.test(r.body.l) && /asker_refund=40/.test(r.body.l));

  // ---- 5b. the parties can actually SEE the decision ---------------------
  // Everything below is what the screens read. The appeal window was enforced
  // server-side but never surfaced, so nobody could use it.
  const doerView = await call('GET', `/api/disputes/${id}`, tDoer);
  step('the decision is visible to the parties', doerView,
    (r) => r.body.dispute?.decision?.doerAmount === 60);
  step('the defendant is told they may appeal, and until when', doerView,
    (r) => r.body.dispute?.appeal?.canAppeal === true && !!r.body.dispute?.appeal?.windowClosesAt);
  step('the viewer is told which side of the errand they are on', doerView,
    (r) => r.body.dispute?.viewerSide === 'doer');

  const askerView = await call('GET', `/api/disputes/${id}`, tAsker);
  step('the claimant who did not fully win may also appeal', askerView,
    (r) => r.body.dispute?.appeal?.canAppeal === true);

  // ---- 6. appeal --------------------------------------------------------
  const appeal = await call('POST', `/api/disputes/${id}/appeal`, tDoer, {
    reason: 'I have the timestamped photos showing the whole job was completed as agreed.',
  });
  step('defendant who responded may appeal', appeal);

  const frozen = await call('GET', `/api/disputes/${id}/settlement`, tAdmin);
  step('money is frozen while the appeal is pending', frozen,
    (r) => r.status === 200 && r.body.data?.readiness?.ready === false);

  const earlySettle = await call('POST', `/api/disputes/${id}/settle`, tAdmin, {});
  step('settling over an open appeal is refused', earlySettle, (r) => r.status === 409);

  // ---- 7. admin reviews the appeal and changes the numbers --------------
  const appealDone = await call('POST', `/api/disputes/${id}/resolve-appeal`, tAdmin, {
    decision: 'MODIFIED', reasoning: 'The photos show more was done than the first look suggested.',
    newDoerAmount: 80, newCompanyAmount: 20,
  });
  step('admin reviews the appeal', appealDone);

  const afterAppeal = kit.sql(
    `SELECT settlement_doer_amount || '/' || settlement_asker_amount FROM disputes WHERE id = ${id}`);
  step(`appeal outcome rewrites the settlement amounts (got ${afterAppeal})`,
    { status: 200, body: { a: afterAppeal } },
    (r) => r.body.a === '80.00/20.00');

  const legsAfterAppeal = kit.sql(
    `SELECT string_agg(leg || '=' || amount, ' ' ORDER BY leg) FROM dispute_settlement_legs WHERE dispute_id = ${id}`);
  step(`settlement legs follow the appeal (got ${legsAfterAppeal})`,
    { status: 200, body: { l: legsAfterAppeal } },
    (r) => /asker_refund=20/.test(r.body.l));

  // ---- 8. window closes, ready to release -------------------------------
  kit.sql(`UPDATE disputes SET appeal_window_closes_at = NOW() - INTERVAL '1 minute' WHERE id = ${id}`);
  const ready = await call('GET', `/api/disputes/${id}/settlement`, tAdmin);
  step('ready to release once the window has closed', ready,
    (r) => r.body.data?.readiness?.ready === true);

  const queue = await call('GET', '/api/disputes/queues/ready-to-release', tAdmin);
  step('it shows up in the release queue', queue,
    (r) => (r.body.data?.disputes || []).some((d) => d.id === id));

  // ---- 9. settle (no Stripe in this sandbox: legs must fail honestly) ---
  const settled = await call('POST', `/api/disputes/${id}/settle`, tAdmin, {});
  const legStatuses = kit.sql(
    `SELECT string_agg(leg || '=' || status, ' ' ORDER BY leg) FROM dispute_settlement_legs WHERE dispute_id = ${id}`);
  step(`settle attempt records a real per-leg outcome (${legStatuses})`, settled,
    (r) => r.status === 200 && /succeeded|failed|skipped/.test(legStatuses));

  // ---- 10. the errand tracks the money, not the decision -----------------
  // Stripe is unreachable from this sandbox, so both legs fail and the errand
  // must STAY disputed — a decision that paid nobody has not finished anything.
  const errandMidSettle = kit.sql(`SELECT status FROM errands WHERE id = ${errand}`);
  step(`errand stays disputed while a leg is unpaid (got ${errandMidSettle})`,
    { status: 200, body: { s: errandMidSettle } },
    (r) => r.body.s === 'disputed');

  // Now stand in for Stripe succeeding, and check the errand is closed out and
  // the hold lifted. This is the only step that fakes anything.
  kit.sql(`UPDATE dispute_settlement_legs SET status = 'succeeded', stripe_reference = 'ZZKIT_fake'
             WHERE dispute_id = ${id}`);
  await call('POST', `/api/disputes/${id}/settle`, tAdmin, {});
  const finalErrand = kit.sql(`SELECT status || '/' || payment_held FROM errands WHERE id = ${errand}`);
  step(`errand closes and the hold lifts once every leg is paid (got ${finalErrand})`,
    { status: 200, body: { s: finalErrand } },
    (r) => r.body.s === 'completed/false');

  const closed = kit.sql(`SELECT status || '/' || settlement_status FROM disputes WHERE id = ${id}`);
  step(`dispute reaches closed/settled (got ${closed})`,
    { status: 200, body: { s: closed } }, (r) => r.body.s === 'closed/settled');

  const lateAppeal = await call('POST', `/api/disputes/${id}/appeal`, tDoer, {
    reason: 'I want to appeal again now that the money has already gone out to the other side.',
  });
  step('cannot appeal once the money has moved', lateAppeal, (r) => r.status === 400);

  // ---- 11. the /verdict path --------------------------------------------
  const errand2 = kit.makeErrand(asker, { title: 'verdict path', budget: 100, status: 'completed' });
  const bid2 = kit.makeBid(errand2, doer, { amount: 100, status: 'accepted' });
  kit.sql(`UPDATE errands SET accepted_bid_id = ${bid2}, payment_authorised_at = NOW() WHERE id = ${errand2}`);
  const filed2 = await call('POST', '/api/disputes', tAsker, {
    errandId: errand2, type: 'work_not_completed',
    description: 'Nothing was delivered at all and there has been no contact since.',
  });
  const id2 = filed2.body.disputeId;
  kit.trackDispute(id2);
  kit.sql(`UPDATE disputes SET defendant_user_id = ${doer} WHERE id = ${id2}`);

  const verdict = await call('POST', `/api/disputes/${id2}/verdict`, tAdmin, {
    decision: 'PARTIAL_SPLIT', doerAmount: 50, companyAmount: 50,
    reasoning: 'Half the job was done before contact stopped.',
  });
  step('/verdict issues a decision', verdict);

  const vSettle = await call('GET', `/api/disputes/${id2}/settlement`, tAdmin);
  step('a dispute decided by /verdict can still reach settlement', vSettle,
    (r) => r.body.data?.readiness?.reason !== 'No decision has been made yet.');

  const vLegs = kit.sql(`SELECT count(*) FROM dispute_settlement_legs WHERE dispute_id = ${id2}`);
  step(`/verdict stages settlement legs (got ${vLegs})`,
    { status: 200, body: { n: vLegs } }, (r) => Number(r.body.n) > 0);

  // ---- 12. rework: a proposal both sides must accept ---------------------
  // Not a settlement. The hold STAYS — it is the leverage that gets the work
  // done — so no legs are staged and nothing can be released.
  const e3 = kit.makeErrand(asker, { title: 'rework path', budget: 100, status: 'completed' });
  const b3 = kit.makeBid(e3, doer, { amount: 100, status: 'accepted' });
  kit.sql(`UPDATE errands SET accepted_bid_id = ${b3}, payment_authorised_at = NOW() WHERE id = ${e3}`);
  const f3 = await call('POST', '/api/disputes', tAsker, {
    errandId: e3, type: 'low_quality', description: 'The shelves went up crooked and one bracket is missing.',
  });
  const id3 = f3.body.disputeId;
  kit.trackDispute(id3);

  const rework = await call('POST', `/api/disputes/${id3}/resolve`, tAdmin, {
    resolutionKind: 'rework', reworkDays: 3,
    notes: 'Straighten the two shelves and fit the missing bracket, and this is settled.',
  });
  step('admin can propose a rework instead of splitting money', rework,
    (r) => r.status === 200 && r.body.data?.resolutionKind === 'rework');

  step('a rework stages no settlement legs',
    { status: 200, body: { n: kit.sql(`SELECT count(*) FROM dispute_settlement_legs WHERE dispute_id = ${id3}`) } },
    (r) => Number(r.body.n) === 0);

  step('the hold stays on through a rework',
    { status: 200, body: { h: kit.sql(`SELECT payment_held FROM errands WHERE id = ${e3}`) } },
    (r) => r.body.h === 't');

  step('doer accepts the rework', await call('POST', `/api/disputes/${id3}/rework-response`, tDoer, { accept: true }));
  const bothIn = await call('POST', `/api/disputes/${id3}/rework-response`, tAsker, { accept: true });
  step('asker accepts, so the rework is on', bothIn, (r) => r.body.data?.outcome === 'agreed');

  const notAsker = await call('POST', `/api/disputes/${id3}/rework-complete`, tDoer, {});
  step('the doer cannot mark their own rework done', notAsker, (r) => r.status === 403);

  step('asker confirms the work was put right',
    await call('POST', `/api/disputes/${id3}/rework-complete`, tAsker, {}));

  const reworkEnd = kit.sql(`SELECT status || '/' || payment_held FROM errands WHERE id = ${e3}`);
  step(`errand comes back out of dispute after a rework (got ${reworkEnd})`,
    { status: 200, body: { s: reworkEnd } },
    (r) => r.body.s === 'completed/false');

  // ---- 13. non-monetary: nothing changes hands ---------------------------
  const e4 = kit.makeErrand(asker, { title: 'non-monetary path', budget: 100, status: 'acknowledged' });
  const b4 = kit.makeBid(e4, doer, { amount: 100, status: 'accepted' });
  kit.sql(`UPDATE errands SET accepted_bid_id = ${b4}, payment_authorised_at = NOW() WHERE id = ${e4}`);
  const f4 = await call('POST', '/api/disputes', tAsker, {
    errandId: e4, type: 'other', description: 'There was a misunderstanding about the drop-off time and words were had.',
  });
  const id4 = f4.body.disputeId;
  kit.trackDispute(id4);

  const nonMonetary = await call('POST', `/api/disputes/${id4}/resolve`, tAdmin, {
    resolutionKind: 'non_monetary', nonMonetaryOutcome: 'sorted_between_parties',
    notes: 'They sorted it out between themselves and both are happy to leave it there.',
  });
  step('admin can close a dispute without moving money', nonMonetary,
    (r) => r.body.data?.paymentHoldReleased === true);

  const nmEnd = kit.sql(`SELECT status || '/' || payment_held FROM errands WHERE id = ${e4}`);
  step(`errand returns to exactly where it was (got ${nmEnd})`,
    { status: 200, body: { s: nmEnd } },
    (r) => r.body.s === 'acknowledged/false');

  step('a non-monetary close stages no legs',
    { status: 200, body: { n: kit.sql(`SELECT count(*) FROM dispute_settlement_legs WHERE dispute_id = ${id4}`) } },
    (r) => Number(r.body.n) === 0);

  // ---- 14. the shadow dispute path on /api/errands ----------------------
  const shadow = await call('POST', `/api/errands/${errand2}/resolve-dispute`, tDoer, {
    resolution: 'doer wins', payment_to: 'doer', amount_percentage: 100,
  });
  step('a party cannot resolve their own dispute via the errands route', shadow,
    (r) => r.status === 403 || r.status === 404);

  report();
}

function report() {
  const pass = results.filter((r) => r.pass).length;
  console.log(`\n=== ${pass}/${results.length} passed ===`);
  const fails = results.filter((r) => !r.pass);
  if (fails.length) {
    console.log('\nFailing:');
    for (const f of fails) console.log(`  - ${f.name}  [${f.status}] ${f.detail}`);
  }
}

try {
  await main();
} catch (err) {
  console.error('\nHARNESS ERROR:', err);
} finally {
  console.log(`\nteardown: removed ${kit.teardown()} fixture rows`);
}
