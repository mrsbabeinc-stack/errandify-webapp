# How to rotate the leaked secrets — step by step

You said you are not sure how. This walks through it. It takes about 20 minutes.
You do the parts that need your logins; I have written a helper for the rest.

**Why this matters, in one line:** `.env.staging` was pushed to GitHub with real
values. Anyone who has the `JWT_SECRET` can log in as any user, including admin,
with no password. Rotating means changing the values so the leaked ones stop
working.

Do them in this order. Number 1 is the urgent one.

---

## 1. JWT_SECRET — the login key (5 minutes)

**What it is:** the key that signs login tokens. Change it and every leaked token
becomes worthless. Everyone gets logged out once, which is fine and expected.

**Step 1 — make a new one.** In a terminal:

```bash
openssl rand -base64 48
```

That prints a long random string. Copy it.

**Step 2 — put it in your live config.** Open `backend/.env` in your editor. Find
the line starting `JWT_SECRET=` and replace everything after the `=` with the
string you copied. Save. Do the same in the root `.env` if it has a `JWT_SECRET`
line (both files have one here).

**Step 3 — do the same wherever the app actually runs.** If staging or production
runs from a host panel, Docker environment, or a secrets manager rather than a
committed file, change it there too. The committed `.env.staging` does NOT count
— nothing should read from it anymore.

**Step 4 — restart the backend** so it picks up the new value. Everyone is logged
out; they sign in again as normal.

---

## 2. QWEN_API_KEY — the AI key (5 minutes)

**What it is:** the key that pays for the AI features. A leaked one means someone
can spend on your account.

1. Go to https://dashscope.console.aliyun.com and sign in.
2. Find **API Keys** (sometimes under "API-KEY Management").
3. Create a new key. Copy it.
4. Put it in `backend/.env` on the `QWEN_API_KEY=` line, same as before.
5. **Delete the old key** in the console.
6. While you are there, look at the usage graph for anything you do not recognise.

---

## 3. DATABASE_URL — the database password (5 minutes)

**What it is:** the username, password and address of your database.

1. In whatever hosts your database (the provider's dashboard), change the
   database user's password.
2. Update the `DATABASE_URL=` line in `backend/.env` with the new password.
3. Restart the backend.
4. If the database is reachable from the public internet, restrict it to known
   IP addresses while you are in there. This is the single biggest reduction in
   risk after the JWT key.

---

## 4. STRIPE_SECRET_KEY — the payments key (5 minutes)

1. Go to https://dashboard.stripe.com/apikeys
2. **Roll** the secret key (there is a button — it makes a new one and retires
   the old).
3. Put the new value in `backend/.env`.
4. Check the payments log for charges you do not recognise.

Also check these two doc files, which carry Stripe **test** keys that look real —
`BETA_DEPLOYMENT_GUIDE.md` line 59 and `DEPLOY_AND_TEST_GUIDE.md` line 56. Test
keys cannot move real money, so this is lower priority, but replace them with
`sk_test_your_key_here` if they are real.

---

## What I set up to help

Run this to check your progress without exposing any value:

```bash
node scripts/check-secrets.mjs
```

It tells you, for each secret, whether your local `.env` still matches the value
that leaked to git — i.e. whether you have actually rotated it. It never prints
the secrets themselves, only "rotated" or "STILL THE LEAKED VALUE".

---

## After you have rotated all four

**Is the repo public?** I could not check — open
https://github.com/mrsbabeinc-stack/errandify-webapp and look for a Public or
Private badge. If it is or ever was public, assume bots already scraped the keys,
which is exactly why you rotate rather than just delete the file.

**Do you need to scrub git history?** My honest answer is no. Once the four
values are rotated, the old ones in history are worthless. Scrubbing history
means a force-push that breaks every clone and cannot reach copies people already
have — effort for no security gain. Rotation is the fix. If you want it done
anyway for tidiness, ask me and I will walk you through it, but not before you
have rotated.

---

## What next, after the secrets

That closes the security hole. From there, the priorities on the desk are:

1. Answer the design questions in `COMPANY_MODEL_DECISIONS.md` — I have folded in
   everything you told me tonight and flagged the two places I would push back.
2. The account-deletion approval flow you asked for (retention report → Errandify
   owner admin approves → then it runs). I have NOT built the auto-purge to run
   without that gate.
3. The single assignment choke-point you approved. It is money-adjacent, so I
   want to do it with you awake and the smoke test running before and after.
