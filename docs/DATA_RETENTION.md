# Data retention schedule

PDPC's Advisory Guidelines on Key Concepts, 18.8, expects an organisation to
write down its retention approach and its rationale. This is that document.

**Not legal advice.** Every statute and guideline is named so a practitioner can
check it. Confirm before relying on any of it.

## The obligation

PDPA **s25** requires us to cease retaining personal data once *both*:

1. the purpose it was collected for is no longer served, **and**
2. retention is no longer necessary for legal or business purposes.

Two things follow that shape the design.

**A deleted flag is not compliance.** PDPC 18.11 is explicit that data which is
archived, hidden, or merely access-limited is still being retained. Anything
that keeps the name in the row has not discharged s25.

**Anonymising is a lawful way to cease retention** (18.10(d)), and anonymised
data is deemed no longer retained (18.14). This is the route we take, because
deleting rows outright would destroy the counterparty's record of a transaction
they were also party to.

## What happens when someone closes their account

### Blocked until settled

Closure is refused while any of these are open, because a person cannot exit a
transaction another person is still relying on:

| Blocker | Why |
|---|---|
| Open errands | Someone is waiting on the work |
| Open disputes | The other party has a stake in the outcome |
| Owned company | Its staff would lose their employer |
| *(future)* Money held | An account must not close while holding someone else's funds |

The last one is **not implemented**, because no escrow exists — there is no
`payment_holds` table and no `capture_method` anywhere. When escrow lands, add
the blocker in `services/accountDeletion.ts`.

### Removed immediately

Name, alias, photo, bio, date of birth, gender · email, phone, address ·
NRIC hash, Singpass id, referral and display identifiers · bank name, account
holder, account number, Stripe account ids · category preferences and
notification settings · marketing and consent records · pending notifications.

**Criminal declarations are deleted outright, not anonymised.** The screening
declaration and any category restrictions go at closure. Their purpose ends with
the account and no law requires us to keep them, so the most sensitive data we
hold has the shortest life.

Three columns are `NOT NULL` — `display_name`, `mobile`, `nric_hash` — so they
are overwritten with `deleted-<id>` rather than emptied. That value derives only
from the row id and identifies nobody.

### Retained, with the person stripped out

| Record | Period | Basis |
|---|---|---|
| Errands, offers, assignments | 7 years | Limitation Act 6-year window for contract claims; PDPC's own worked example at 18.4(b) suggests ~7 years for contract records |
| Payments, payouts, invoices | 7 years | Above, plus Income Tax Act and GST Act record-keeping (5 years) and Companies Act s199 accounting records (5 years) — the longest applies |
| Resolved dispute outcomes | 7 years | Evidence in any later claim; the counterparty relies on it |
| Ratings given and received | 7 years | Shown without a name; the counterparty's reputation depends on them |
| Company staff employment records | 2 years after leaving | Employment Act record-keeping |
| Unsuccessful job applications | 12 months from decision | No contract is formed, so the Limitation Act contract window does not apply. What remains is recognising a re-applicant and answering a TAFEP fair-employment complaint. **A judgement, not a citable rule — see open question 4.** |
| Candidate screening invites and answers | 12 months from completion or expiry | As above; the screening exists only to decide one vacancy |

### What recruitment collects, and when

Retention answers how long data is kept. s25 also depends on whether it should
have been collected at all — PDPC's Key Concepts treat collection limitation
and retention limitation as the same discipline. Recruitment collects in two
stages:

| Stage | Collected | Why |
|---|---|---|
| **Application** (public, pre-offer) | Name, email, phone, date of birth, address, work authorisation, ability to perform the duties, any interview adjustments, position, expected salary, notice period, availability, experience, skills, qualifications, employment and education history, referees, CV | Each can bear on whether to shortlist |
| **Hire** (post-offer, into `staff`) | NRIC, residential status, emergency contact, fitness to work, bank details | CPF, IRAS, MOM and payroll obligations that only exist once employed |

The application form asked for all of it up front. Two of those were unlawful
rather than merely unwise, and the distinction matters — the first pass removed
all of them together, which was too blunt and was partly reversed (migrations
070/071):

- **NRIC.** PDPC's *Advisory Guidelines on the PDPA for NRIC and other National
  Identification Numbers* (in force 1 Sep 2019) bar collecting an NRIC number
  unless required by law or needed to verify identity to a high degree of
  fidelity. A job application is neither. It becomes lawful at hire, when CPF
  and IRAS require it — which is what `staff.nric` is for.
- **Disability and medical condition.** Asked of every applicant pre-offer,
  under a notice promising it "will not affect hiring decisions" — which is the
  argument against collecting it then, not for it. If it cannot affect the
  outcome, minimisation says do not ask yet; if it could, asking pre-offer is
  what a discrimination complaint would point at. TAFEP expects medical
  questions to be job-relevant and post-offer.

  Replaced by two things that serve the same operational need lawfully:
  `can_perform_duties` at application — whether someone can do the job, with or
  without reasonable adjustment, which is job-relevant — and a fitness-to-work
  record on `staff` collected **after** a conditional offer, which is where a
  pre-employment medical belongs and where MOM's statutory examinations for
  work-pass holders and hazardous occupations are evidenced.

  `staff` deliberately has **no column for a diagnosis**: `fitness_status`,
  restrictions and adjustments only. The employer needs to know someone is
  cleared and what to adjust, not what is wrong with them.
- **Nationality.** A protected characteristic under the Fair Consideration
  Framework — and not the question actually being asked. Replaced by
  `work_authorisation` ("authorised" / "requires_sponsorship"), which answers
  the real need, work-pass eligibility, without recording nationality. It is
  also the more useful field: a citizen and a PR give the same answer, and that
  answer is the one that matters.
- **Date of birth and address are collected.** No rule bars them; address
  supports commute and location matching, and some roles carry statutory age
  requirements. Both are stripped by the retention purge.
- **Emergency contacts.** Onboarding details, and a third party who never
  consented to anything. Collected at hire, onto `staff`.

Fields sent by an older client are ignored and logged by name (never by value),
so a stale form degrades to a lawful application instead of failing outright.

**Getting from applicant to employee.** The over-collection existed because
there was no hire step: the form asked for everything the staff record would
eventually need, months early. `POST /api/recruitment/applications/:id/hire`
now creates the staff record and collects NRIC, residential status, emergency
contact and fitness at that moment — the point at which the person is an
employee and those become lawful and necessary.

### Purging what is kept

Recruitment data is handled by `services/recruitmentRetention.ts`, on its own
clock and separate from the account purge above. It has to be: an applicant is
**not a user**. They have no `users` row, so `users.anonymised_at` — the clock
the account purge runs on — does not exist for them, and they sat outside this
schedule entirely until it was added. `job_applications` holds NRIC, date of
birth, nationality, home address, health declaration, employment history and
referee contacts, so that gap mattered.

Two differences from the account purge, both deliberate:

- **Applicants are anonymised, not purged.** The outcome columns (status,
  scores, timestamps) are kept without identity, because they are what makes
  the hiring process auditable for bias later. Free-text answers are *deleted*
  rather than blanked — prose cannot be reliably de-identified, since an
  answer can name the writer's employer, estate or medical situation.
- **Applicants who were hired are excluded.** Their record stops being a
  recruitment record and becomes an employment one, covered by the 2-year row
  above. Anonymising it on the recruitment clock would destroy an employment
  record still required under the Employment Act.

Live screening tokens are overwritten when a screening is anonymised: a working
credential to a record we have finished with is an access path kept open for no
purpose.

After the period expires the rows are **purged**, not anonymised again. Until
that purge runs, what remains is pseudonymous rather than perfectly anonymous —
a bare integer id with nothing attached. Whether that distinction matters for
s25 is the main thing worth putting to a lawyer.

## Open questions for legal review

1. **Pseudonymous vs anonymous.** Retained rows keep a `user_id` integer whose
   `users` row has no identity left. Is that "removing the means by which the
   personal data can be associated with a particular individual" (s25), or does
   the retained id still count as association?

2. **Re-registration by barred users.** Overwriting `nric_hash` means someone
   restricted from childcare or eldercare on screening grounds can close their
   account and sign up again clean. Keeping a one-way hash on a barred list
   would prevent that and is arguably a legitimate safety purpose under
   18.4(b) — but it retains data about a person who asked to leave, and it is
   criminal-adjacent. **Currently NOT implemented; the safety gap is real.**

3. **Retention period.** 7 years is taken from PDPC's worked example. Confirm it
   against the actual mix of tax, accounting and contract obligations.

4. ~~**The purge job does not exist yet.**~~ **Resolved.** Three purges now run
   daily from `cron.ts`: `services/retentionPurge.ts` for accounts and for
   disputes, and `services/recruitmentRetention.ts` for applicants. All are
   **dry run until `RETENTION_PURGE_ENABLED=true`**, so today they report and
   change nothing — the schedule is still not being *enforced* in any
   environment where that flag is unset. Turning it on is a deliberate
   decision, not a default.

5. **12 months for unsuccessful applicants.** Singapore sets no statutory
   retention period for job applicants, so this is a judgement rather than a
   rule that can be cited. It balances recognising a re-applicant and answering
   a TAFEP fair-employment complaint against holding NRIC and health data for
   people who were never hired. Override with `APPLICANT_RETENTION_MONTHS`.
   Worth confirming, particularly whether any fair-employment or work-pass
   process expects a longer window.

7. ~~**Dead sensitive columns on `job_applications`.**~~ **Resolved.** Migration
   069 dropped all twelve; 070 restored the five with a genuine purpose
   (`date_of_birth`, `home_address`, `city`, `postal_code`, `country`) and
   replaced two with lawful equivalents (`work_authorisation`,
   `can_perform_duties`). `nric`, `nationality`, `residential_status`,
   `emergency_contact_*` and `health_declaration` are gone from the
   application table. 071 put emergency contact on `staff`, where it belongs.

8. **NRIC and bank details in admin API responses.** `GET /api/admin/staff`
   returns `nric` for every employee in the list, and the staff create/update
   handlers return `RETURNING *`, which now includes `bank_account_number`.
   Admin-only and authenticated, so not a breach — but it is more disclosure
   than any of those screens needs, and minimisation applies to disclosure too.

6. **Applicants who are hired.** Their application is excluded from the
   recruitment clock and treated as an employment record (2 years after
   leaving). Confirm that is the right basis — the application still contains
   recruitment-stage data, such as referee contacts, that arguably serves no
   ongoing employment purpose and could be stripped earlier.

## Where this lives in the code

- `services/accountDeletion.ts` — blockers, the identifying-column list, and the
  anonymisation itself. It reads back after writing and refuses to report
  success if anything identifying survived.
- `routes/users.ts` — `GET /deletion-eligibility` and `POST /delete-account`,
  both going through the same blocker function so they cannot disagree.
- `migrations/048_account_deletion_pdpa.ts` — `anonymised_at`, which the purge
  job counts from.
- `services/retentionPurge.ts` — two sweeps on different clocks:
  - `runRetentionPurge` — the account purge. Report → admin approval → purge
    after a week. Dry run unless `RETENTION_PURGE_ENABLED=true`.
  - `purgeExpiredDisputes` — disputes seven years closed. The account purge
    cannot reach these: it counts from `users.anonymised_at`, and a dispute
    outlives the accounts on both sides of it, which is the point of keeping
    it. This one counts from the dispute's own `closed_at`.

    It **deletes nothing**. The outcome record is retained for the legal
    purpose under 18.4(b) — amounts, fee, decision, dates, who the parties
    were — because the counterparty relies on it as much as we do. What is
    nulled is the personal narrative around it: both statements, the appeal
    text, Hana's reasoning, the outcome messages, and the evidence images and
    filenames on `dispute_evidence`. 18.10(d) accepts anonymisation as ceasing
    to retain; 18.11 rules out merely hiding it, which is why these are nulled
    rather than flagged. `disputes.retention_stripped_at` (migration 077)
    records that the policy ran, and makes the sweep idempotent.

    Proved by `scripts/dispute-retention.ts` on backdated fixtures — 15 checks
    covering both halves: that the narrative and images go, and that the
    financial record and the evidence rows survive.
- `services/recruitmentRetention.ts` — applicants and screening candidates, who
  have no `users` row and so cannot be reached by the account purge. Anonymises
  rather than deletes; same dry-run gate.
- `cron.ts` → `runRetentionPurgeJob` — runs both, daily.
