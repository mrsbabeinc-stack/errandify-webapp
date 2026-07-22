# Do these when you wake up

Written 23 July 2026. Everything here needs your credentials or your account
access, so I could not do any of it for you.

Work top to bottom. Item 1 matters far more than the rest.

---

## 1. Rotate four secrets — 20 minutes

`.env.staging` was a tracked file on `origin/main` at
`github.com/mrsbabeinc-stack/errandify-webapp`, containing real values. Assume
all four are compromised. Untracking the file (done) does **not** fix this — the
values are in pushed history and in anyone's existing clone.

**Rotate in this order.**

### a. JWT_SECRET — do this one first

This is the worst of the four. Anyone holding it can mint a valid login token
for **any user id and any role, including admin**, with no bug required. It is
exactly how I generated admin tokens for testing all session.

1. Generate a new one:
   ```bash
   openssl rand -base64 48
   ```
2. Put it in your **local** `.env` and in whatever staging/production
   environment actually runs (Docker env, host panel — not a committed file).
3. Restart the backend.

Every existing session is invalidated, so everyone gets logged out once. That is
the correct outcome, because you cannot tell a legitimate token from a forged
one right now.

### b. QWEN_API_KEY

1. https://dashscope.console.aliyun.com → API keys
2. Create a new key, put it in your environment, delete the old one.
3. While you are there, check usage for anything you do not recognise. The key
   was exposed and this bills to you.

### c. DATABASE_URL

Change the database password, update the connection string. If that database is
reachable from the internet, also restrict it to known IPs.

### d. STRIPE_SECRET_KEY

1. https://dashboard.stripe.com/apikeys → roll the secret key
2. Check the payments log for charges you do not recognise.

---

## 2. Check whether the repo is public — 2 minutes

I could not check this: `gh` is not authenticated on this machine.

Open https://github.com/mrsbabeinc-stack/errandify-webapp and look for a
**Public** or **Private** badge next to the repo name.

- **Private** → exposure is limited to people with repo access. Still rotate.
- **Public, or ever has been** → treat as fully compromised. Rotate, then check
  every dashboard above for unfamiliar activity. Assume the keys were scraped;
  bots find committed keys within minutes.

---

## 3. Check two Stripe test keys — 5 minutes

These files carry `sk_test_` values whose 24-character mixed-case suffix looks
like a real Stripe test key rather than a placeholder:

- `BETA_DEPLOYMENT_GUIDE.md` line 59
- `DEPLOY_AND_TEST_GUIDE.md` line 56

Open each. If the value is real, roll it in Stripe and replace the line with
`sk_test_your_key_here`. Test keys cannot move real money, so this is lower
priority — but they can read your test data.

---

## 4. Decide about git history — your call, no rush

The secrets remain in pushed history. Purging them means rewriting `origin/main`
with a force-push, which breaks every clone and every open branch.

**My honest view: do not bother.** Once you have rotated, the old values are
worthless. History rewriting cannot reach clones anyone already has, so it buys
tidiness rather than security. Rotation is the actual fix.

If you want it done anyway, it needs `git filter-repo` and a coordinated
force-push. Ask me and I will walk through it — but I will want explicit
approval before touching `origin`.

---

## 5. For your lawyer — the PDPA items I could not decide

Collected from this session. Details are in `docs/DATA_RETENTION.md`.

1. **Transfer to Alibaba Cloud (PDPA s26).** Private chat messages between
   users, errand descriptions containing addresses, and voice recordings are
   sent to Alibaba's DashScope. I moved all 22 call sites from the mainland
   China endpoint to the Singapore region, but s26 needs the recipient bound by
   legally enforceable obligations comparable to the PDPA. **You need a data
   processing agreement with Alibaba Cloud.** The code change alone does not
   discharge this.

2. **Re-registration by barred users.** Account deletion overwrites `nric_hash`,
   so someone restricted from childcare or eldercare on screening grounds can
   close their account and sign up clean. Keeping a one-way hash would prevent
   it and is arguably a legitimate safety purpose, but it retains data about a
   person who asked to leave, and it is criminal-adjacent. **The safety gap is
   real and currently open.**

3. **Pseudonymous vs anonymous.** Retained errand and payment rows keep a
   `user_id` whose `users` row has had every identifying field stripped. Is that
   "removing the means by which the personal data can be associated with a
   particular individual" under s25, or does the retained id still count?

4. **Retention period.** I used 7 years, taken from PDPC's own worked example
   citing the Limitation Act. Confirm against your actual tax, accounting and
   contract obligations.

5. **Still unaudited:** s11(3) requires a Data Protection Officer to be
   appointed and their business contact published — I saw no sign of one.
   s26D requires a data breach notification process — none exists. s20 requires
   notification of purpose at collection.

I am not a lawyer. Every statute and guideline above is named so your
practitioner can check it.

---

## What I already did, so you do not redo it

- Untracked `.env.staging` and added it to `.gitignore`. Your local file is
  untouched.
- Scanned every other tracked file for key patterns. Everything else matched was
  a documented placeholder or mock data generated with `Math.random()`.
- Moved all AI calls to the Singapore region (`config/aiRegion.ts`).
- Fixed PDPA s21 access and s25 deletion, both of which returned 500 for every
  user before today.
- Wrote `docs/DATA_RETENTION.md`.

**Not done:** the retention purge job. The schedule exists and nothing enforces
it, which is arguably worse than having no schedule, because it evidences an
intention you are not meeting. That is the next build.
