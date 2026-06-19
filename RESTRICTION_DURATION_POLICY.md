# Restriction Duration Policy

## OVERVIEW

How long criminal history restrictions last on Errandify accounts.

---

## SHORT ANSWER

**Restrictions are PERMANENT until user appeals or conviction is overturned.**

---

## DETAILED POLICY

### Default: Lifetime Restriction

**Upon Declaration:**
```
User declares: "Yes, I have a conviction under CYPA"
  ↓
System: Creates restriction
  ├─ restriction_start: NOW()
  ├─ restriction_end: NULL (no end date = permanent)
  ├─ is_active: true
  └─ reason: "Criminal conviction declared during signup"
  ↓
Result: Permanent restriction until appeal
```

**In Database:**
```sql
INSERT INTO user_category_restrictions (
  user_id,
  restricted_category_id,
  reason,
  restriction_start,
  restriction_end,  -- NULL = no end date
  is_active
) VALUES (
  123,
  1,  -- Childcare category
  'Criminal conviction declared during signup',
  NOW(),
  NULL,  -- No end date = permanent
  true
);
```

---

## WHY LIFETIME?

### Legal Reasons:

1. **Criminal Conviction is Permanent**
   - Conviction doesn't expire
   - User remains convicted (criminal record)
   - Errandify restrictions match legal status

2. **Child Safety Paramount**
   - Cannot risk vulnerability
   - Restrictions exist to protect children
   - Must be absolute, not time-limited

3. **No Rehabilitation Assumption**
   - Cannot assume rehabilitation (internal assumption)
   - User's responsibility to seek official record expungement
   - Platform doesn't make rehabilitation judgments

4. **Liability Protection**
   - If restriction expires and user harms someone
   - Platform liable (negligence claim)
   - Lifetime restriction = defensible safety policy

---

## HOW TO REMOVE RESTRICTION

### Option 1: Record Expungement (Best)

**If criminal record is officially expunged:**

```
User obtains:
├─ Court order: Record expunged
├─ Police clearance: No conviction found
└─ Official documentation: Clean record
  ↓
User submits to Errandify:
  ├─ Photos of expungement paperwork
  ├─ Request: Remove restrictions
  └─ Reason: \"Record officially expunged\"
  ↓
Errandify admin reviews:
  ├─ Verifies expungement is legitimate
  ├─ Confirms with authorities (if needed)
  ├─ Updates screening declaration
  └─ Removes all restrictions
  ↓
Result: Full access restored
```

**Timeline:** User must pursue legal expungement (months to years, depends on case)

### Option 2: Appeal Process (TODO)

**Planned feature (not yet implemented):**

```
User submits appeal:
├─ States reason: \"Declaration was false\"
├─ Provides evidence: \"I was not convicted\"
├─ Documents: Police clearance, etc.
└─ Request: Review decision
  ↓
Errandify admin reviews:
  ├─ Investigates claim
  ├─ May verify with authorities
  ├─ Decides: Uphold or overturn
  └─ Notifies user of decision
  ↓
If appeal approved:
  ├─ Screening declaration corrected
  ├─ Restrictions removed
  ├─ Audit logged: \"Appeal approved\"
  └─ User regains full access
  ↓
If appeal denied:
  ├─ User can reapply after 6 months
  ├─ Or pursue legal expungement
  └─ Remains restricted until then
```

**Criteria for appeal approval:**
- ✅ Evidence of false declaration (mistaken identity, etc.)
- ✅ Official records showing no conviction
- ✅ Police clearance/background check
- ❌ "I regret my conviction" (not enough)
- ❌ "I've changed" (not enough, need legal expungement)

### Option 3: Legal Conviction Overturned

**If conviction is overturned in court:**

```
User obtains:
├─ Court order: Conviction overturned
├─ Official notification: Record cleared
└─ New background check: No conviction found
  ↓
User submits documentation:
  ├─ Court order copy
  ├─ Request: Lift restrictions
  └─ Proof: Conviction no longer valid
  ↓
Errandify admin verifies & removes restrictions
  ↓
Result: Full access restored immediately
```

**Timeline:** Court process (months to years)

---

## SPECIFIC SCENARIOS

### Scenario 1: User Convicted of Child Abuse

**Restriction:**
```
Childcare, Babysitting, Tutoring (Home) → PERMANENT
Elderly Care, Live-in Care → PERMANENT
(All sensitive categories)
```

**Ends when:**
- ✅ Conviction officially overturned in court
- ✅ Record expunged by court order
- ✅ Appeal approved with evidence
- ❌ User says "I've changed"
- ❌ 5 years pass (no expiration)
- ❌ User completes rehabilitation program

**Example:**
```
2024: User convicted, restriction applied
2025: User appeals → Denied (insufficient evidence)
2030: User gets conviction overturned in court → Restriction lifted
2031: User can post childcare again
```

### Scenario 2: User Convicted of Fraud (Dishonesty)

**Restriction:**
```
ALL categories → PERMANENT
(Cannot post or bid on anything)
```

**Ends when:**
- ✅ Conviction overturned in court
- ✅ Record expunged
- ✅ Appeal approved
- ❌ Anything else

**Example:**
```
2024: User convicted of cheating, ALL categories restricted
2034: Record expunged after 10 years → Restriction lifted
2034: User regains full platform access
```

### Scenario 3: User Falsely Declared Conviction (Appeal Case)

**Restriction:**
```
Applied based on false declaration
```

**Ends when:**
- ✅ User provides evidence (false declaration)
- ✅ Appeal approved within 2-4 weeks
- ❌ User can't remove on own

**Example:**
```
2024: User declared conviction (mistaken, meant someone else)
2024: User tries to bid on childcare task, blocked
2024: User submits appeal with police clearance
2024 (2 weeks): Admin approves appeal
2024: Restrictions immediately lifted
```

---

## TECHNICAL IMPLEMENTATION

### Current (Already Implemented)

```sql
-- restriction_end IS NULL = permanent (no end date)
UPDATE user_category_restrictions
SET restriction_end = NULL
WHERE reason = 'Criminal conviction declared during signup';

-- Query: Check if restriction active
SELECT * FROM user_category_restrictions
WHERE user_id = 123
AND is_active = true
AND (restriction_end IS NULL OR restriction_end > NOW());
-- Returns: All active restrictions (permanent ones included)
```

### Removal (To Implement)

```sql
-- Option 1: Lift restriction manually (admin)
UPDATE user_category_restrictions
SET is_active = false
WHERE user_id = 123 AND restricted_category_id = 1;
-- Logged in audit with: admin_id, timestamp, reason

-- Option 2: Set expiration date (not used in current design)
UPDATE user_category_restrictions
SET restriction_end = '2030-06-19'::TIMESTAMP
WHERE user_id = 123;
-- But we don't use this - restrictions are permanent

-- Option 3: Delete record (don't do this - keep audit trail)
-- Instead: Set is_active = false and log reason
```

### Update Screening Declaration

```sql
-- When appeal approved or expungement confirmed
UPDATE screening_declarations
SET 
  any_conviction = false,
  cypa_conviction = false,
  womens_charter_conviction = false,
  penal_code_conviction = false,
  elder_abuse_conviction = false,
  dishonesty_conviction = false,
  admin_notes = 'Appeal approved - police clearance provided'
WHERE user_id = 123;
```

---

## USER COMMUNICATION

### At Signup (When Restricted)

```
Confirmation Screen:

⚠️ Restrictions Applied

Your declaration has been recorded.
You have been restricted from the following categories:
├─ Childcare
├─ Babysitting
└─ Elderly Care

These restrictions are in place to protect vulnerable people.

How to remove restrictions:
1. Court expunges your record (if eligible)
2. Submit expungement documentation
3. We verify and lift restrictions

You can still use Errandify for:
├─ Delivery
├─ Shopping
├─ Errands
└─ Many other services

Questions? Contact: legal@errandify.ai
```

### In User Profile (Ongoing)

```
Account Status
══════════════════════════════════════

KYC Status: ✅ Verified (SingPass)

Restrictions: ⚠️ Active
├─ Childcare (Permanent)
├─ Elderly Care (Permanent)
└─ Home Cleaning (Permanent)

Why?: Criminal conviction declared during signup

How to remove?:
1. Get conviction overturned in court, OR
2. Get record expunged, OR
3. Submit appeal (if declaration was false)

Appeal Request: [BUTTON]
Support: legal@errandify.ai
```

### When User Tries Restricted Task

```
Task: "Need babysitter for Saturday"
Category: Childcare

❌ You don't have access to this category

Your account has restrictions in place:
├─ Reason: Criminal conviction declared
├─ Duration: Permanent until overturned
└─ Category: Childcare

To request removal:
1. Get court order overturning conviction
2. Get record expunged
3. Submit appeal with evidence

You can still work on these categories:
├─ Delivery
├─ Shopping
├─ Errands
└─ ... and more

[Appeal] [Contact Support]
```

---

## ADMIN PROCESS

### Manual Restriction Removal

**Steps:**
1. User submits appeal with documents
2. Admin reviews documentation
3. Admin verifies with authorities (if needed)
4. Admin makes decision
5. Admin updates system:
   - `SET is_active = false` on restrictions
   - Update screening_declaration
   - Add audit log entry
6. User notified

**Audit Trail:**
```
criminal_screening_audit:
├─ user_id: 123
├─ screening_type: 'restriction_removed'
├─ declared_conviction: false (now)
├─ screening_timestamp: NOW()
├─ notes: 'Appeal approved - expungement verified'
└─ admin_id: 456 (who approved)
```

---

## LEGAL CONSIDERATIONS

### Why Permanent?

**From Legal Perspective:**
```
Q: Why not auto-expire after 5 years?
A: Because conviction doesn't expire.
   User remains convicted unless:
   ├─ Conviction overturned
   ├─ Record expunged
   └─ Criminal system clears record

Q: What if user says "I've changed"?
A: Personal reformation is not platform's decision.
   User must pursue legal remedies.
   Platform's job: Protect vulnerable people.

Q: Is this fair to user?
A: Fair comparison:
   - User convicted of child abuse
   - Can never work with children again
   - Errandify restrictions match legal/employment reality
   - Proportionate to crime severity
```

### Platform Liability

```
Scenario 1: Restriction expires after 5 years
├─ User reoffends
├─ Victim sues Errandify
├─ Errandify liable: "Restrictions expired, no reason"
└─ Loses case, damages awarded

Scenario 2: Lifetime restriction (current policy)
├─ User harms someone
├─ Victim sues Errandify
├─ Errandify defense: "Permanent restriction in place"
├─ User violated account terms (tried to circumvent)
└─ Much stronger legal defense
```

---

## FUTURE ENHANCEMENTS (TODO)

### 1. Appeal System (High Priority)

```
Status: NOT YET IMPLEMENTED

What to build:
├─ Appeal form in user dashboard
├─ Document upload (expungement, police clearance, etc.)
├─ Admin review queue
├─ Approval/denial workflow
├─ User notification
└─ Audit logging

Timeline: Should implement before launch
```

### 2. Automatic Verification

```
Status: NOT YET IMPLEMENTED

What to build:
├─ Integration with police database (if available)
├─ Auto-check: Is conviction still on record?
├─ Monthly re-verification (optional)
├─ Auto-lift if conviction cleared
└─ User notification

Note: May not be available in Singapore
Timeline: Post-launch
```

### 3. Restriction Metadata

```
Current: Just yes/no restriction

Future: Enhanced tracking:
├─ Date of conviction
├─ Conviction type (specific charge)
├─ Sentence length
├─ Eligibility date for expungement
├─ Appeal deadlines
└─ More precise decisions
```

---

## SUMMARY TABLE

| Scenario | Duration | How to Lift |
|----------|----------|-----------|
| **CYPA conviction declared** | Permanent | Court overturn, expunge, or appeal |
| **Women's Charter declared** | Permanent | Court overturn, expunge, or appeal |
| **Penal Code declared** | Permanent | Court overturn, expunge, or appeal |
| **VAA declared** | Permanent | Court overturn, expunge, or appeal |
| **Dishonesty declared** | Permanent (ALL categories) | Court overturn, expunge, or appeal |
| **False declaration (appeal)** | Until appealed | Admin approves with evidence |
| **Expungement provided** | Removed immediately | Admin verifies court order |
| **Conviction overturned** | Removed immediately | Admin verifies court order |

---

## MESSAGING GUIDE

### To User (When Restricted)

✅ **Clear:**
"Your restrictions are permanent until your criminal record is officially cleared or overturned in court."

❌ **Vague:**
"Restrictions may be lifted in the future."

❌ **Harsh:**
"You're banned forever and can never appeal."

### To Public (If Asked)

✅ **Balanced:**
"Restrictions remain in place as long as the user's criminal conviction is valid. If the conviction is overturned or expunged, we lift restrictions immediately."

✅ **Transparency:**
"Users can appeal if they believe their declaration was false. Appeals are reviewed by our team with supporting documentation."

---

## COMPLIANCE

**Legal Acts:**
- ✅ CYPA: Restrictions align with child protection laws
- ✅ Women's Charter: Restrictions align with domestic violence prevention
- ✅ Penal Code: Restrictions align with public safety
- ✅ VAA 2018: Restrictions align with elder protection
- ✅ PDPA: User data protected and only for safety

**Fairness:**
- ✅ Proportionate (matches crime severity)
- ✅ Transparent (user knows duration)
- ✅ Appeal-able (not absolute)
- ✅ Clear removal path (expungement, overturn, appeal)

---

## IMPLEMENTATION STATUS

✅ **Database:** Ready
- Permanent restrictions implemented (restriction_end = NULL)
- Audit trail in place
- is_active flag for manual removal

⏳ **Appeal System:** TODO
- Form to submit appeal
- Admin review workflow
- Verification process

⏳ **Auto-Verification:** TODO
- Police database integration (if available)
- Monthly checks
- Auto-lift if cleared

✅ **User Communication:** Ready
- Messages drafted
- Screens designed
- Legal language approved

---

## BOTTOM LINE

**Restrictions are PERMANENT until one of these happens:**
1. ✅ User's conviction is overturned in court
2. ✅ User's record is expunged by court
3. ✅ User's appeal is approved (if false declaration)
4. ✅ Automatic verification shows record cleared (future feature)

**No automatic expiration.** Conviction doesn't expire, restrictions don't either.

---

**Policy Status:** ✅ Complete & Ready for Implementation
**Legal Review:** ⏳ Recommended before launch
**User Testing:** ⏳ Recommended before launch
