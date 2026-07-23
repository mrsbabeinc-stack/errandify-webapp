# Dispute flow — end to end, 23 July 2026

Second pass. The first pass (earlier today) walked the flow and left two money
questions open. Both are now answered and closed, along with four other things
found on the way — one of which was an authorisation hole and one of which was
paying out the wrong number.

Verified by `backend/scripts/dispute-e2e.mjs` (30 checks, all passing) against
the live server, with disposable fixtures that clean themselves up. The admin
half was also driven through the real interface, not just the API.

---

## The two open questions, answered

### 1. `/verdict` vs `/resolve` — one path now

`/verdict` was a dead end, and worse than the first pass realised. It wrote
`status = 'VERDICT_ISSUED'` and the `verdict_*` columns, but never set
`resolution` — which is the column both the appeal route and the settlement
check read. So a dispute decided through `/verdict`:

- could not be appealed (`/appeal` returned "there is no decision to appeal
  yet"), while its own response told the parties they had 12 hours to appeal;
- could not be settled (readiness returned "no decision has been made yet");
- staged no settlement legs at all.

It sat decided-but-frozen forever, with no way out.

Both routes now go through one function, `applyMonetaryDecision()` in
`services/disputeSettlement.ts`. `/verdict` keeps its own vocabulary
(`APPROVE_DOER` / `APPROVE_COMPANY` / `PARTIAL_SPLIT`) and translates onto it,
and still writes the `verdict_*` columns for anything reading them. Two routes
can no longer decide the same dispute differently, because there is only one
implementation left.

### 2. Settlement legs are paid

Fixed in `61f9cdd2` between the two passes. `executeSettlement()` pays each leg
— a Stripe transfer to the doer, a partial refund to the asker — each carrying
its own idempotency key. A failing leg records its error and does not block the
other. Nothing here changed in this pass except the bookkeeping around it (see
below).

---

## Found in this pass

### 3. 🔴 The appeal decision was not what got paid

`/resolve-appeal` read and wrote `verdict_doer_amount` / `verdict_company_amount`.
Everything that actually moves money reads `settlement_doer_amount` /
`settlement_asker_amount` and the staged settlement legs.

An appeal only ever reaches a dispute decided through `/resolve`, and `/resolve`
never fills the verdict columns. So overturning an appeal wrote NULLs into
columns nobody pays from, left the original legs untouched at their original
amounts, and then set `appeal_reviewed_at` — which is what unblocks release.

**The overturned split was what got paid.** An admin could rule 80/20 on appeal
and the doer would receive the 60 from the decision that had just been overturned.

It now runs the same decision path as any other decision, so the amounts, the
fee and the legs are restated together. Confirmed through the interface: a
60/40 decision appealed and modified to 85/15 rewrote the fee to $17.00 and the
legs to $68.00 / $15.00.

### 4. 🔴 A second dispute system, with no lock on it

`routes/errands.ts` carried its own dispute flow: `POST /:id/raise-dispute`,
`GET /disputes/list/all`, `POST /:id/resolve-dispute`. It wrote
`errands.status = 'disputed'` and `payment_released_to` straight onto the errand
and created no row in `disputes` at all — no defence window, no Hana, no
settlement legs, never in the admin queue, never payable.

`POST /:id/resolve-dispute` was guarded by `authMiddleware` and the comment
`// TODO: Check if user is admin`. **Any logged-in user could resolve a disputed
errand in their own favour and set who the payment went to.** Same class as the
six routes fixed on 21 July: a comment is not a guard.

All three removed. The only dispute path is `/api/disputes`. Its dead admin
screen (`pages/AdminDisputePanel.tsx`) is not mounted anywhere and was left
alone; it is worth deleting separately.

### 5. The errand knew nothing about being in dispute

Filing held the payment and nothing else, so a disputed errand was
indistinguishable from a clean one on both parties' lists and in every admin
query. Resolving changed nothing either — the errand stayed as it was forever.

Migration `060` adds `errands.pre_dispute_status`. Filing moves the errand to
`disputed` and remembers where it came from. It leaves `disputed` only when the
money has actually moved: `completed` if the doer was paid anything, `cancelled`
on a full refund, and back to exactly where it was for a non-monetary outcome
where nothing changed hands. A decision alone does not move it — the decision is
still appealable at that point.

### 6. A half-failed settlement looked untouched

`settlement_status` went straight from `not_started` to `settled`. If one leg
paid and the other failed, it stayed at `not_started` — so the dispute was still
appealable and still re-decidable after real money had left. That is the exact
sequence the appeal window exists to prevent.

It is now marked `pending` before the first Stripe call and `failed` if any leg
fails. Appeals are refused on anything past `not_started`, and a decision is
refused outright if any leg has already succeeded. `executeSettlement` also
judges completion from every leg the dispute has rather than only the ones the
current run touched, so a retry after a partial failure cannot read a fully-paid
dispute as unsettled.

### 7. Two unreachable copies of the appeal routes

`/:id/appeal` and `/:id/resolve-appeal` were defined in both `disputes.ts` and
`disputes_l2_l3.ts`, both mounted on `/api/disputes`. `disputes.ts` mounts first,
so the L2/L3 copies never served a single request. Removed.

---

## The interface

Half of this module had no way in. The decision screen worked; nothing after it
existed. An admin could record a split and then had no way to see whether it was
releasable, no way to release it, no way to see an appeal and no way to answer
one. A party had a 24-hour appeal window and no button anywhere to use it, which
makes the window decorative.

- `components/admin/DisputeSettlementPanel.tsx` — the appeal review, the
  readiness check, the per-leg state, the outcome drafts, and the one button
  that moves money. Opens from the disputes table on any resolved or closed
  dispute.
- `components/disputes/DisputeOutcomeAndAppeal.tsx` — what was decided, what it
  means for the reader's own money, and the appeal if they are entitled to one.
  Dropped into the company dispute response page; self-contained, so it can go
  anywhere a party sees a dispute.

`GET /api/disputes/:id` now returns the decision, the appeal state, whether
*this* person may appeal and why not if they may not, and which side of the
errand they are on. None of that was exposed before, which is why no screen
could offer an appeal.

---

## Still open

- **Settlement in this sandbox pays nobody**, because Stripe is unreachable
  (`unable to get local issuer certificate`) and the fixture doer has no
  connected payout account. The legs fail honestly and record why; preflight
  catches it first and disables the release button. The real payout path was
  tested in Stripe test mode under `61f9cdd2`.
- **Evidence upload is deliberately 501** — needs a multipart parser and storage.
- **`pages/AdminDisputePanel.tsx`** and **`components/admin/DisputeManagementDashboard.tsx`**
  are unmounted dead screens. The second one was the only caller of `/verdict`.
