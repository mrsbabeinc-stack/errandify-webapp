# Morning report — 23 July 2026

Read this one first. `SECURITY_ACTIONS.md` has the rotation steps; this is
everything else, and the questions I need answered to keep moving.

---

## Answer these four and I can keep going

Nothing below needs a long reply. A word each is enough.

**1. Turn on the retention purge?**
It is built, tested and running in dry-run. It permanently deletes anonymised
accounts past the 7-year retention period. I will not enable it without you
saying so. The 7 years also wants your lawyer's confirmation.

**2. Delete the dead duplicate components?**
`CriminalScreening.tsx`, `AllocateStaffModal.tsx` and probably others are older
twins sitting next to the working component, rendered by nothing. They have
twice made me report a working feature as broken. I have verified nothing
imports them. Yes = I remove them.

**3. Company ownership has two sources of truth — which wins?**
`companies.owner_user_id` says user 17 owns company 3.
`company_staff.role='owner'` says user 12 does.
Account deletion reads the first, the company role gate reads the second. So
the same person is an owner in one module and not the other. Picking a winner
changes who can approve leave and allocate errands, so it is your call.

**4. Should I do the "one choke-point for assignment" refactor?**
This is the one I recommended. Two places write "person X is doing errand Y"
(bid acceptance, company allocation), so every protection has to be built
twice — which is exactly how the screening hole happened. Merging them makes
protections structural. It is a real refactor touching money-adjacent code, so
I want an explicit yes, and I would run the journey tests before and after.

---

## What I fixed while you slept

### The criminal screening had a company-shaped hole through it

The most serious functional finding. Your correction about companies allocating
to staff is what surfaced it.

- Individual path: a doer with an unspent conviction is blocked from childcare,
  eldercare and home-access categories.
- Company path: the same person joins a company as staff. An owner offers on the
  company's behalf — **the owner gets screened, not them**. A manager allocates
  the errand to them. Nothing checked anything.

Anyone barred could route around the whole scheme by joining a company. The
check now happens at allocation, which is the first moment the real doer is
known. Verified: undeclared staff refused, a dishonesty conviction closes
cleaning and home-maintenance and the allocation is refused, re-declaring clean
lets it through.

The refusal names the person and the category but not their record. A manager
needs to know to pick someone else; they are not entitled to know why.

### The core errand lifecycle could not complete

Four defects, each fatal on its own:

- `complete` selected `stripe_payment_intent_id`, which is not a column — it
  threw on the first query, so no errand could ever be marked complete.
- The status gate accepted only `confirmed`, but `start` moves an errand to
  `in_progress`. **Starting an errand made it uncompletable.**
- Rating flips the errand to `rated`, and the eligibility check then refused
  anything not `completed` — so whoever rated first silently locked the other
  party out. No errand has ever carried ratings from both sides.
- Ratings were written with the right columns and read with wrong ones, so every
  rating ever submitted was stored perfectly and never displayed.

All verified working end to end.

### A linter for the pattern behind all of it

Seven features were dead for the same reason: a query naming a column that does
not exist, wrapped in a catch that returns a generic message. Nobody could see
it, because an empty list reads as "nothing here yet".

`backend/scripts/check-schema.ts` reads the SQL out of the source, asks the
database what exists, and prints the difference.

```
cd backend && npx tsx scripts/check-schema.ts
```

It found 21 more on its first run. Fixed from that list:

- **Web push has never delivered anything.** `routes/push.ts` inserted `auth`
  and `p256dh`; the columns are `auth_key` and `p256dh_key`. Every subscribe
  threw. `services/pushService.ts` had it right all along — the mounted route
  was a broken duplicate of a working service.
- **Completion photos have never been stored.** Both upload routes wrote
  `errand_id`, `doer_id`, `key` and `caption` into a table with `task_id`,
  `uploaded_by` and neither `key` nor `caption`. These photos are the doer's
  evidence the work was done — a dispute over "was this finished" has nothing
  to look at. Migration 049 adds the missing columns.
- **Users could not save their errand categories.** Wrong column name, and then
  a `JSON.stringify` into a Postgres `text[]`.

Six of the remaining findings are in code nothing imports, so they are broken
but harmless. The rest are listed by running the script.

### PDPA, continued from last night

- **s21 right of access restored.** The export named three columns that do not
  exist and returned 500 for every user. Both halves of PDPA data-subject rights
  were dead at once — access and deletion.
- **s26 transfer.** All 22 AI call sites moved from Alibaba's mainland China
  endpoint to the Singapore region. Private chat messages were crossing.
  **This does not discharge s26** — that needs a data processing agreement with
  Alibaba Cloud. It is on the lawyer list.
- **Retention purge built**, dry-run, per question 1 above.

### Four screens stopped inventing data

`Disputes`, `Cases`, `SOSAlerts` and `MyCases` caught their error, rendered a
hardcoded array, then called `setError('')` so nothing looked wrong. 291 lines
of fake data. Two of the four endpoints were fine all along; the third was
hiding that **the SOS feature does not exist** — no endpoint, no table, and the
button is rendered nowhere, so nobody can trigger one.

I did not build SOS. Per your steer: quietly present, kampung-style — someone is
around if you need them, not a panic button implying danger. It needs your
decisions on who is alerted and how fast, and a channel nobody watches would be
worse than none.

---

## Still not done

- **Company-as-asker has never run.** `errands.company_posted_by` has 0 rows.
  Half the role matrix is untested — both untested combinations are
  company-as-asker.
- **s11(3)** — no Data Protection Officer appointed or published anywhere.
- **s26D** — no data breach notification process. Given `.env.staging`, this one
  has a certain irony.
- **s20** — notification of purpose at collection.
- ~35 dead routes and 23 admin screens still writing to `localStorage`.
- The lifecycle proposal in the artifact — CHECK constraint, single state
  machine module, derive company order status from the errand.

## State

Frontend typecheck 146, backend 522 — both at baseline throughout. No test data
left: 0 test users, 0 test errands, 0 test leave rows, 0 test declarations.
Migrations 048 and 049 applied.
