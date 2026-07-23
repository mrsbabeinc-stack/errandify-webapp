# L2/L3 support tier — archived 23 July 2026

Not deleted, because it may be wanted again if a real support team ever exists.
Nothing here is compiled: both `tsconfig.json` files only include `src`, so this
directory is inert until something is moved back.

## What this was

A three-tier dispute model — L1 auto-rules, L2 an agent with AI assistance, L3 a
senior reviewer handling appeals. It shipped with queues, agent assignment and
its own escalation tables.

## Why it is out

The product model was decided on 21 July and it is a single tier: **every dispute
goes to Hana, who proposes, and an admin decides.** Tiers were rejected as
premature — there is no support team to route to. So this was a second decision
model living alongside the real one.

It was also actively harmful while mounted. `POST /api/disputes/:id/resolve-l2`
set `disputes.status = 'resolved_l2_refund'` (or `_split` / `_release`) and
nothing else — no `resolution`, no settlement amounts, no legs, no appeal window.
Both the appeal route and the settlement readiness check read `resolution`, so a
dispute decided this way could be neither appealed nor paid. And because
`resolved_l2_*` matches none of the statuses the admin screen filters on
(`hana_reviewing` / `admin_review` / `resolved` / `closed`), it would not appear
in the list either. An invisible, permanently frozen dispute.

Two more routes in `disputes_l2_l3.ts` — `/:id/appeal` and `/:id/resolve-appeal`
— duplicated routes in `disputes.ts`. Both files mounted on `/api/disputes` and
`disputes.ts` mounts first, so those copies never served a request.

`DisputeAutomationService.ts` had zero callers anywhere in the codebase.

## State when archived

- `dispute_escalations`, `dispute_appeals`, `support_queue`: **0 rows each.** The
  tier never processed a single dispute.
- No navigation anywhere linked to the three screens; they were reachable only by
  typing the URL.
- Two accounts hold `support_l2` / `support_l3` roles. They still do — the roles
  are also accepted by the `adminOnly` guard in `routes/disputes.ts`.

## What was unwired to archive it

- `backend/src/index.ts` — the `disputesL2L3Routes` import and its
  `app.use('/api/disputes', ...)` mount.
- `frontend/src/App.tsx` — three imports and three routes:
  `/support/dashboard`, `/disputes/:disputeId/review`, `/support/appeals`.

The database tables were left in place — dropping them is a separate decision,
and under PDPA s25 they hold no personal data worth purging while empty.

## Bringing it back

Move the files back to `backend/src/routes`, `backend/src/services` and
`frontend/src/pages`, restore the import and mount in `index.ts` and the three
routes in `App.tsx`. **Then fix `resolveL2Dispute` before using it** — route it
through `applyMonetaryDecision()` in `services/disputeSettlement.ts`, which is
the single function allowed to write a money decision, or it will recreate the
frozen-dispute bug described above.
