# Company model — your decisions, confirmed

Everything you told me on the night of 23 July, written back so you can check I
understood it. Most I agree with and will build. Two I want to push back on
before building — marked **⚠ CHECK THIS**.

---

## Settled — I will build these as described

### Substitution
- A company can swap the assigned staff any number of times, right up to the
  morning of the errand.
- **No acknowledgement from the asker.** You were right: the asker should not be
  blocked by a backend operation. A swap just **notifies** them. *(Already built.)*
- The asker can chat the updated doer, because the chat follows the current
  allocation. *(Already built and tested across a swap.)*

### Who the asker sees
- For a company doer: show **first name + company logo beside it**.
- Display name rule: **if an alias is set, show the alias to the public;
  otherwise the first name.** Never the full legal name.
- The doer can show the **errand ID** at the door for the asker to verify.
- *(The endpoint now returns the allocated person; the logo + alias-else-first
  rule is a small addition I will make next.)*

### Ratings
- The asker rates the **errand**, and that rating is the **company's** rating.
- The asker only ever sees the **company** rating, never an individual staff
  rating — so swapping staff never changes what the asker sees.
- The same score also lands on the **individual staff member's private record**
  (if the errand was rated 4.5, the staff who did it carries 4.5 internally).
  That is not shown to askers; it exists for conduct and accountability.
- **EP (points) go only to the company**, never to the individual staff.

### Accountability
- The **company** is the counterparty for **money and disputes**.
- The **individual** is accountable for **conduct**, and carries their own
  rating and their own category restrictions.
- Both, not either.

### Resignation
- The company can mark a staff member **resigned** from the staff screen.
- Backend records they are **no longer part of the company**, but **keeps the
  record of what they did** — that is a company record. *(Already built: only
  OPEN allocations are released; completed work stays attributed to them.)*
- On resignation, their open allocations return to the company to reallocate,
  and the company chooses the new person. *(Already built.)*

### Screening
- Everyone is screened at signup via Singpass, so their restrictions are known.
- A company therefore **cannot allocate an errand to a staff member whose record
  makes it unsuitable** — the check runs at allocation. *(Already built and
  tested: a restricted staff member is refused, with the category named but not
  their record.)*

### Ownership
- **One owner role only**, to remove confusion. *(I will add a rule that a
  company has exactly one owner.)*
- ⚠ CHECK THIS — see below, because your two tables currently name **different
  people** as the owner of company 3, and I will not guess which is real.

### Assignment choke-point
- **Yes**, one place that owns "who is doing this errand" for both the individual
  and company paths. You approved it. Because it touches money, I will build it
  with you awake and the smoke test running before and after.

### Contactability
- Errands must be contactable end to end. *(Fixed tonight — the chat reached the
  bidding owner, not the allocated staff; now it reaches the person actually
  coming, and follows swaps.)*

---

## ⚠ CHECK THIS — two I want to push back on

### 1. "Since everyone signs up via Singpass, accounts should not be anonymised"

I understand the instinct, and half of it is right — but I do not want to build
it as stated, because it risks the PDPA.

**What is right:** company records of what a staff member did are legitimate to
keep. Nobody is proposing to erase your business records.

**Where I would push back:** Singpass verifies *who someone is*. It does **not**
remove their right under the PDPA to have their personal data deleted when they
leave. Keeping a person's name, NRIC, contact and face on file *because* they
were Singpass-verified is closer to the opposite of what the PDPA wants — a
verified identity is more sensitive to retain, not less.

**What I propose instead**, which gives you everything you actually asked for:

- A person can still ask to delete their account (PDPA, and the app stores need
  it too).
- Deletion does **not** vaporise the record. The **errand and payment history
  stays**, with the identity stripped from the marketplace-facing side — so your
  company records of "this errand was done, by this staff number, on this date,
  paid this much" survive intact.
- **You gate it with approval, as you asked:** a deletion request generates a
  **retention report**, and the **Errandify owner admin approves** before
  anything is stripped. Nothing auto-deletes. *(I will build this — it is a real
  improvement over the automatic version.)*

The one line I need a lawyer on: whether "strip identity, keep the transaction"
is enough, or whether a Singpass-verified NRIC hash must go entirely. I have
written the question into `docs/DATA_RETENTION.md`. **My strong recommendation:
do not keep identity on a departed user without a lawyer saying you may.**

### 2. Company owner — which of two people is real?

You said one owner role, which settles the *rule*. But right now:

- `companies.owner_user_id` says **user 17** owns company 3.
- `company_staff` says **user 12** is the owner.

These are two different people, and the two halves of the app read different
tables — which is its own bug. I will make `companies.owner_user_id` the single
source of truth and sync the staff role to it. **But I need you to tell me
whether 17 or 12 is the actual owner of company 3**, because that decides who can
approve leave, allocate errands, and mark staff resigned. I will not pick.

---

## Build order I propose

1. **You:** rotate the secrets (`ROTATE_SECRETS.md`) and answer the two
   ⚠ questions above.
2. **Me:** display polish — company logo + alias/first-name rule + errand ID at
   the door. Small, isolated.
3. **Me:** the rating model — company-facing aggregate, staff-private aggregate,
   EP to company only.
4. **Me:** deletion approval flow — retention report + owner-admin gate.
5. **Me + you awake:** the assignment choke-point refactor, smoke test each side.

Nothing in 2–5 is built yet. 2, 3 and 4 I can do without you; 5 I want you
present for.
