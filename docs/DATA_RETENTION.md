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

4. **The purge job does not exist yet.** The schedule above is enforced by
   nothing. Writing a schedule and not running it is arguably worse than having
   no schedule, since it evidences an intention we are not meeting.

## Where this lives in the code

- `services/accountDeletion.ts` — blockers, the identifying-column list, and the
  anonymisation itself. It reads back after writing and refuses to report
  success if anything identifying survived.
- `routes/users.ts` — `GET /deletion-eligibility` and `POST /delete-account`,
  both going through the same blocker function so they cannot disagree.
- `migrations/048_account_deletion_pdpa.ts` — `anonymised_at`, which the purge
  job will count from.
