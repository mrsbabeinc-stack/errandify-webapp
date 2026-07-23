# Dispute flow — tested end to end, 23 July 2026

Tested the full dispute module against the live server with disposable
fixtures. The core works. There are two things about the money side you should
decide on, and I did **not** touch either, because both move money and that is
the one category I will not build while you are asleep.

---

## What works

The whole path, verified:

- **Raise** — an asker (or doer) on the errand raises a dispute. Correctly
  refuses anyone who is not a party, and refuses an errand with no accepted doer.
- **View** — the asker, the defendant, and admin can all see it.
- **Defend** — the defendant submits a written response (must be ≥20 chars).
- **Resolve** — `POST /:id/resolve` marks it resolved and creates the
  settlement plan: for a 100-dollar errand split 60/40, it produced
  `asker_refund: 40.00` and `doer_transfer: 48.00` (the doer's 60 less a
  settlement fee).

The AI (Hana) reviews first — a new dispute sits in `hana_reviewing`, Hana
proposes, and it moves to `admin_review`. Consistent with the rule you set: **AI
proposes, a human decides.** Good.

---

## Two things to decide — money, so I left them

### 1. There are two resolution paths, and only one settles

- `POST /:id/resolve` — **complete.** Creates settlement legs, marks the dispute
  resolved. This is the real path.
- `POST /:id/verdict` — **records the decision only.** It sets `verdict_decision`
  and `VERDICT_ISSUED`, but creates no settlement legs, drafts no messages, and
  leaves the errand untouched.

The verdict path looks like the newer tier-based (L2/L3) flow, where a verdict
is issued, an appeal window opens, and settlement happens afterwards — probably
via the `DisputeAutomationService` cron. **But nothing I could find connects
`VERDICT_ISSUED` to settlement automatically.** So a dispute decided through the
verdict route may sit decided-but-unsettled forever.

**What I need from you:** is `/verdict` meant to auto-settle after the appeal
window, or is `/resolve` the only path that should be used? If both are live,
they can produce different outcomes for the same dispute, which is worse than
either alone.

### 2. Settlement legs are prepared but never paid

The legs are created with status `pending`. **Nothing executes them** — there is
no Stripe transfer, no code that moves a leg from `pending` to `settled` by
actually paying it.

This is the same root as the escrow finding from earlier in the week: the real
payment intent is shadowed by a mock, so there is no held money to release. A
dispute therefore computes *who should get what* correctly, and then no money
moves.

**This is not a dispute bug — it is the escrow gap showing up here.** The dispute
module is ready for real settlement the moment escrow is real. Until then, every
resolution is a correct plan that pays nobody.

---

## Smaller thing

After a dispute resolves, the **errand stays `in_progress`**. It is not moved to
a resolved or closed state. Might be intended (the errand and the dispute are
separate records), but a resolved dispute leaving its errand looking unfinished
is worth a look. Low priority next to the two above.

---

## Test-safety note

The dispute schema has **14 child tables** with foreign keys back to `disputes`.
The fixture kit (`backend/scripts/testkit.mjs`) now clears all 14 before
deleting a dispute, so dispute tests clean up completely. Verified: 0 disputes,
0 errands, 0 orphaned settlement legs left behind. Smoke test still 32/32.
