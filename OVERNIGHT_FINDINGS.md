# Overnight findings — 23 July 2026

Work done after you went to sleep. `SECURITY_ACTIONS.md` is still the thing to
read first; this is what came after it.

One honest caveat: I do not run unattended for hours. I work in turns while the
session is open, so this is one solid stretch of work, not seven hours of it.

---

## 1. The SOS emergency feature does not exist

The most important thing I found, so it goes first.

`pages/admin/SOSAlertsPage.tsx` displayed a live-looking queue of emergency
alerts with GPS coordinates, device details, severity levels and response
deadlines. **All of it was a hardcoded array** — 100 lines of invented
emergencies, shown whenever the API call failed, which was always.

Behind it:

| Piece | State |
|---|---|
| `GET /api/cases/sos-alerts` | does not exist — hits `/:id` and 500s |
| `POST /api/cases/sos` | does not exist |
| SOS database table | does not exist |
| `SOSButton.tsx` | exists but is **rendered nowhere** |

**The mitigating fact: no user can currently trigger an SOS**, because the
button is not on any screen. So this is not a live safety hole — nobody is
pressing a button that goes nowhere.

But it is worse than a missing feature. An admin watching that screen would
have seen fabricated emergencies, and — after a shift with none — concluded the
system was quiet and working. If anyone had wired that button up without
checking the backend, presses would have vanished silently.

**I did not build it.** An emergency system needs decisions I should not make
for you: who gets alerted, how fast, what escalates to police or SCDF, what
happens when nobody acknowledges. Building a plausible-looking one would repeat
the exact failure I just removed. The screen now shows an honest error.

## 2. Removed 291 lines of fake data from four screens

`Disputes`, `Cases`, `SOSAlerts` and `MyCases` all had the same pattern:

```
catch (err) {
  ...build a mock array...
  setState(mock);
  setError('');     // <- clears the error
}
```

The `setError('')` is the damaging part. A dead endpoint rendered as a healthy
screen full of invented rows. That is how a broken route survives for months —
nobody can see that it is broken.

All four now show the failure. Checked what is actually behind them:

- `/api/disputes` → **200**, returns `{disputes: [], count: 0}` — genuinely
  works, genuinely empty
- `/api/cases` → **200**, genuinely works, genuinely empty
- `/api/cases/sos-alerts` → **500** — see above

So two of the four screens were fine all along and the mock was hiding nothing.
The third was hiding a missing feature.

## 3. Built the retention purge job

The gap I flagged last night: `docs/DATA_RETENTION.md` set out retention periods
and nothing applied them. PDPC 18.5 expects data to be reviewed against the
policy regularly — a schedule nothing enforces is the worse half, because the
document evidences an intention you are not meeting.

`services/retentionPurge.ts`, scheduled daily. Built to be hard to misuse:

- **Dry run by default.** `RETENTION_PURGE_ENABLED=true` is the only way to make
  it delete anything.
- `anonymised_at` is the clock, so it can only reach accounts that were actually
  deleted. A live account is unreachable by construction, not by a filter.
- A retention period outside 1–30 years refuses to run rather than being read as
  "delete everything".
- One transaction per account, user row last, so a failure leaves the account
  anonymised rather than half-deleted.

Verified: an account anonymised 8 years ago is purged, one anonymised today
survives, a live user is untouched, and `RETENTION_YEARS=0` refuses to run.

**It is in dry-run mode.** Turn it on deliberately, once you are happy with the
7-year period — that number still needs your lawyer's confirmation.

---

## What I did not get to

- **s11(3)** — a Data Protection Officer must be appointed and their business
  contact published. I saw no sign of one anywhere in the app.
- **s26D** — mandatory data breach notification. No process exists. Given what
  we found in `.env.staging`, this one has a certain urgency.
- **s20** — notification of purpose at collection.
- The remaining ~35 dead routes and 23 localStorage admin screens.
- The duplicate-component problem: `AllocateStaffModal`, `CriminalScreening` and
  probably others are dead older twins sitting next to working components. They
  distort every audit — I have twice reported a working feature as broken
  because I found the dead twin first.

## Verification state

Frontend typecheck 146, backend 522 — both at baseline. No test data left in the
database: 0 test users, 0 test errands, 0 test leave rows.

Commits from this stretch:

```
f3016ab2  feat: enforce the retention schedule instead of only documenting it
4f6afdaa  docs: security actions handover
f34a1c5f  security: untrack .env.staging
31dc2c20  fix: keep personal data in Singapore, restore s21 access
3f9341ba  feat: PDPA-compliant account deletion
```
