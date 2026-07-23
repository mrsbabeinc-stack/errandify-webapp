# Subscription findings — 23 July 2026

Testing the subscription→commission link (from "companies pay lower commission
as a doer") surfaced one money bug I fixed, one broken feature I flagged, and
one data-model decision that's yours.

---

## FIXED — commission ignored the tier for every company

`getCommissionRate`, the EP-multiplier lookup, and the team-size lookup all
guarded on `subscription.status === 'active'`. **`company_subscriptions` has no
`status` column**, so the check was always false and every company fell through
to the entry (Silver, 18%) rate — plus EP multiplier 1× and the solo team cap —
no matter which tier it paid for.

So a Gold company (17%) or Platinum company (16%) was **overcharged commission**,
and denied its EP multiplier and staff allowance.

Fixed: active is now derived from `expires_at` (no expiry, or not yet lapsed),
and the tier reads `subscription_tier`, not the non-existent `current_tier`.
Verified the mechanism resolves each tier's rate and that a lapsed subscription
correctly falls back rather than honouring an expired Platinum rate.

This is the fix that matters for the money model you asked about.

---

## BROKEN, FLAGGED — the subscription write path

Making the interface honest exposed that create / upgrade / downgrade were
written against a schema that does not exist. They reference eight columns the
table lacks:

    current_tier, status, billing_type, renewal_date, billing_date,
    pending_tier, pending_effective_date, stripe_subscription_id

Five are renames of real columns (billing_type→billing_cycle,
renewal_date→expires_at, billing_date→started_at, current_tier→subscription_tier,
status→derived from expires_at). Three are genuinely missing features:
scheduled downgrades (pending_tier, pending_effective_date) and the Stripe
subscription link (stripe_subscription_id).

So `POST /subscriptions/checkout|upgrade|downgrade` throw at runtime the moment
they touch these columns. This is why only one `company_subscriptions` row
exists at all. I did NOT fix this — it needs the tier decision below first, then
a migration and a rewrite, and it moves money, so it's a with-you job.

---

## YOUR DECISION — the tier names are fragmented three ways

| Where | Tier names |
|---|---|
| `subscription_tiers` (the rate config) | **silver, gold, platinum** |
| `company_subscriptions` CHECK constraint | free, basic, premium, enterprise |
| the one existing data row | premium |
| your pricing memo | silver, gold, platinum (18 / 17 / 16%) |

The rate config and your memo agree on **silver / gold / platinum**. The table's
constraint and its data are from an older scheme. Because they disagree, the
existing `premium` row has no matching rate in `subscription_tiers`, so even the
fixed commission lookup falls back to Silver for it.

Nothing here is safe for me to change silently — it's your pricing model.

**What I need:** confirm the canonical tiers are **silver / gold / platinum**.
Then I can, with you:
1. migrate the CHECK constraint to the real tiers,
2. map the existing `premium` row to its intended tier,
3. add the three missing columns and reconcile the write path,
4. test checkout / upgrade / downgrade in Stripe test mode.

Until then: the commission **read** is correct and safe, and a company simply
resolves to Silver (18%) if its stored tier isn't one the rate config knows.

---

## Also noted (from the commission commit)

Subscription **limits** — `max_staff_members`, `max_errands_per_month` — are read
for display but enforced nowhere. A Silver company can add unlimited staff or
post past its monthly cap. Product decision on how hard to enforce.

---

## Update — tier data reconciled to your spec (23 July, later)

You gave the canonical tier summary. Reconciled the data to it:

- **Team sizes were wrong in the DB.** gold was 20 (spec: 15), platinum was 100
  (spec: unlimited). Fixed — gold 15, platinum 999999 (the "unlimited" sentinel
  the display already uses). Migration 055.
- Commission (18/17/16%), ad credit (50/200/500), EP multiplier (2/3/5×) already
  matched and were left alone.
- **`GET /subscriptions/status` showed a hardcoded silver demo to everyone** —
  now reads the real subscription. A Platinum company saw silver on its own
  screen. Verified it now returns platinum, 16%, 5×, unlimited.
- **`req.companyId` is populated by nothing.** Every subscription endpoint that
  used it (status, checkout, upgrade, downgrade) silently failed to identify the
  company. Fixed in /status by resolving from the user via resolveMyCompany;
  **checkout / upgrade / downgrade still need the same fix** before they work.

### Milestones — definitions right, everything else unbuilt

The milestone amounts in `milestoneService.ts` match your spec exactly
(silver $20@50; gold $50@50, $100@100; platinum $100@50, $200@100, $500@200).
But the service is **MySQL code that was never ported to Postgres**: `?`
placeholders, `"posted"` double-quotes, a `tasks` table that doesn't exist
(it's `errands`), and `subscription_milestones` columns (`milestone_type`,
`bonus_applied`) that don't match the real table (`milestone_threshold`,
`reward_amount`, `achieved`). So:

- `GET /subscriptions/milestones` returns 500.
- The awarding function `checkAndAwardMilestones` is **called by nothing** — no
  milestone is ever awarded on task completion.

This is a feature to build, not a data fix: port the service to Postgres, match
the real schema, and call the check when a company completes a task. Flagged,
not attempted — it needs its own focused pass.
