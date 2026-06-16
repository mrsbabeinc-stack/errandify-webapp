# Errandify Auth Flow — Test Scenarios

Complete walkthroughs for testing the mock signup/login system.

## Scenario 1: Basic Signup (Preset Persona)

**Goal:** User signs up using pre-selected persona

```
1. Open http://localhost:5173

2. SPLASH SCREEN
   ┌─────────────────────────────────┐
   │         Errandify              │
   │   Simplifying lives.           │
   │   Amplifying humanity.         │
   │                                │
   │  🌸 🌼 🌿 🪨                    │
   │                                │
   │  [Sign Up with SingPass]       │
   │  Powered by SingPass—soon      │
   │  Already have account? Log in  │
   └─────────────────────────────────┘

3. MOCK SINGPASS MODAL (Step 1)
   Click: "Sign Up with SingPass"

   ┌─────────────────────────────────┐
   │  SingPass Demo Mode             │
   │  Select a test persona or enter │
   │  custom details.                │
   │                                 │
   │  [Select Persona] [Custom]      │
   │                                 │
   │  ◯ Tan Wei Ming, 51 (selected)  │
   │  ◯ Siti Rahimah, 35             │
   │  ◯ Ravi Kumar, 28               │
   │                                 │
   │  [Back] [Continue]              │
   └─────────────────────────────────┘

   Action: Click "Continue" (default persona selected)

4. COMPLETE PROFILE (Step 2)
   ┌─────────────────────────────────┐
   │  Complete Your Profile          │
   │  One more step to join kampung  │
   │                                 │
   │  Display Name                   │
   │  [Tan Wei Ming]                 │
   │                                 │
   │  Mobile Number                  │
   │  [98765432]                     │
   │                                 │
   │  Language Preference            │
   │  [English] [中文]               │
   │                                 │
   │  Age: 51 ✓ Text size 19px      │
   │                                 │
   │  [Back] [Join the Kampung]      │
   └─────────────────────────────────┘

   Actions:
   - Mobile: Enter "98765432"
   - Language: Select "English" (default)
   - Click "Join the Kampung"

5. BACKEND PROCESSING
   API Call: POST /api/auth/signup
   {
     "name": "Tan Wei Ming",
     "age": 51,
     "nric": "S1234567A",
     "address": "123 Clementi Road, Singapore 129742",
     "mobile": "98765432",
     "language": "en",
     "role": "asker"
   }

   Response: (201 Created)
   {
     "success": true,
     "data": {
       "accessToken": "eyJhbGc...",
       "user": {
         "id": 1,
         "name": "Tan Wei Ming",
         "mobile": "98765432",
         "role": "asker"
       }
     }
   }

6. DATABASE UPDATE
   INSERT INTO users:
   - id: 1
   - nric_hash: SHA256("S1234567A")
   - display_name: "Tan Wei Ming"
   - mobile: "98765432"
   - dob: 1973-06-16 (age 51)
   - address: "123 Clementi Road, Singapore 129742"
   - font_size_pref: 19 (age >= 50)
   - language_pref: "en"
   - role: "asker"
   - kyc_status: "verified"
   - referral_code: "REF-A1B2C3"
   - created_at: now

7. FRONTEND RESPONSE
   - Token stored in localStorage
   - Redirect to home page
   - Font size increased to 19px

   Check console:
   > localStorage.getItem('token')
   'eyJhbGc...'
```

**Assertion:** User successfully signed up with font size 19px

---

## Scenario 2: Custom Signup (New Persona)

**Goal:** User enters custom details

```
1. Same as Scenario 1, step 1-2

2. MOCK SINGPASS MODAL — Click "Custom"

   ┌─────────────────────────────────┐
   │  SingPass Demo Mode             │
   │  [Select Persona] [Custom]      │
   │                                 │
   │  Full Name                      │
   │  [John Chua]                    │
   │                                 │
   │  Age                            │
   │  [35]                           │
   │                                 │
   │  NRIC                           │
   │  [S7654321Z]                    │
   │                                 │
   │  Address                        │
   │  [999 Bukit Merah, Singapore]  │
   │                                 │
   │  [Back] [Continue]              │
   └─────────────────────────────────┘

   Actions:
   - Full Name: "John Chua"
   - Age: "35"
   - NRIC: "S7654321Z"
   - Address: "999 Bukit Merah, Singapore 160999"
   - Click "Continue"

3. COMPLETE PROFILE
   ┌─────────────────────────────────┐
   │  Display Name: [John Chua]      │
   │  Mobile: [91234567]             │
   │  Language: [中文]   ← Selected   │
   │  Age: 35 ← Standard 16px text  │
   │  [Back] [Join the Kampung]      │
   └─────────────────────────────────┘

   Actions:
   - Mobile: "91234567"
   - Language: Click "中文"
   - Click "Join the Kampung"

4. VERIFICATION
   - User created in DB with id=2
   - font_size_pref: 16 (age < 50)
   - language_pref: "zh"
   - Redirected to home with standard text size

   Check:
   > localStorage.getItem('user')
   {"id":2,"name":"John Chua","mobile":"91234567","role":"asker"}
```

**Assertion:** Custom user signup works with language preference

---

## Scenario 3: Login with OTP

**Goal:** Existing user logs in via OTP

```
Precondition: User from Scenario 1 exists (mobile: 98765432)

1. Open http://localhost:5173

2. SPLASH SCREEN
   Click: "Already have account? Log in"

3. LOGIN FLOW — Step 1: Mobile Number
   ┌─────────────────────────────────┐
   │  Welcome Back                   │
   │  Sign in with mobile number     │
   │                                 │
   │  Mobile Number                  │
   │  [98765432]                     │
   │                                 │
   │  [Back] [Send OTP]              │
   └─────────────────────────────────┘

   Action: Enter "98765432", click "Send OTP"

4. BACKEND: REQUEST OTP
   API Call: POST /api/auth/request-otp
   { "mobile": "98765432" }

   Backend Console Output:
   📱 OTP for 98765432: 123456

   Response:
   { "success": true, "message": "OTP sent to mobile" }

5. LOGIN FLOW — Step 2: OTP Verification
   ┌─────────────────────────────────┐
   │  Welcome Back                   │
   │  Enter OTP sent to 98765432     │
   │                                 │
   │  OTP Code                       │
   │  [1 2 3 4 5 6 ]                 │
   │                                 │
   │  💡 Demo: Use 123456            │
   │                                 │
   │  [Back] [Verify]                │
   └─────────────────────────────────┘

   Action: Enter "123456", click "Verify"

6. BACKEND: VERIFY OTP
   API Call: POST /api/auth/verify-otp
   {
     "mobile": "98765432",
     "otp": "123456"
   }

   Logic:
   - Fetch from otpStore["98765432"]
   - Verify: code matches, not expired
   - Delete OTP
   - Generate JWT
   - Return user data

   Response: (200 OK)
   {
     "success": true,
     "data": {
       "accessToken": "eyJhbGc...",
       "user": {
         "id": 1,
         "name": "Tan Wei Ming",
         "mobile": "98765432",
         "role": "asker"
       }
     }
   }

7. VERIFICATION
   - Token stored in localStorage
   - Redirected to home page
   - Font size increased to 19px (from profile)

   Check:
   > localStorage.getItem('token')
   'eyJhbGc...'
```

**Assertion:** OTP login works, returns correct user with saved preferences

---

## Scenario 4: Font Size Auto-Scaling

**Goal:** Verify font size increases for users 50+

```
Test Case A: Age 50+
1. Sign up with Tan Wei Ming (age 51)
2. Check database:
   SELECT font_size_pref FROM users WHERE mobile='98765432'
   Result: 19

3. Open app
4. Check text size: Should be visibly larger (19px vs 16px)
5. Inspect element: <body> has text-lg or style="font-size: 19px"

Test Case B: Age < 50
1. Sign up with Siti Rahimah (age 35)
2. Check database:
   SELECT font_size_pref FROM users WHERE mobile='91234567'
   Result: 16

3. Open app
4. Check text size: Standard (16px)
5. Inspect element: <body> has text-base
```

**Assertion:** Font size scales correctly based on age threshold

---

## Scenario 5: OTP Expiration

**Goal:** Verify OTP expires after 10 minutes

```
1. Request OTP (valid)
2. Wait 10 minutes
3. Try to verify old OTP

   API Call: POST /api/auth/verify-otp
   { "mobile": "98765432", "otp": "123456" }

   Response: (401 Unauthorized)
   { "error": "Invalid or expired OTP" }

Assertion: Expired OTP rejected
```

---

## Scenario 6: Invalid OTP

**Goal:** Verify wrong OTP is rejected

```
1. Request OTP: Backend generates "123456"
2. Try to verify with wrong code

   API Call: POST /api/auth/verify-otp
   { "mobile": "98765432", "otp": "999999" }

   Response: (401 Unauthorized)
   { "error": "Invalid or expired OTP" }

Assertion: Wrong OTP rejected
```

---

## Scenario 7: Language Persistence

**Goal:** Verify language preference saved and accessible

```
1. Sign up with language "中文"
   - app.language_pref = "zh"

2. Call GET /api/auth/me (authenticated)

   Response:
   {
     "success": true,
     "data": {
       "id": 2,
       "name": "John Chua",
       "mobile": "91234567",
       "role": "asker",
       "language": "zh"
     }
   }

3. Later: Use language_pref for:
   - UI translations (i18n)
   - Default form language
   - Chat assistant language

Assertion: Language preference correctly stored and retrieved
```

---

## Scenario 8: Duplicate NRIC

**Goal:** Prevent multiple accounts with same NRIC

```
Precondition: User with NRIC "S1234567A" exists

Attempt: Sign up another user with same NRIC

API Call: POST /api/auth/signup
{
  "name": "Fake Tan Wei Ming",
  "age": 30,
  "nric": "S1234567A",  ← Duplicate
  "address": "...",
  "mobile": "81234567",
  "language": "en",
  "role": "doer"
}

Response: (409 Conflict)
{
  "error": "User already exists with this NRIC"
}

Assertion: Duplicate NRIC rejected
```

---

## Scenario 9: Database Integrity

**Goal:** Verify all fields stored correctly

```
Setup: Sign up user with all details

SQL Query:
SELECT * FROM users WHERE mobile='98765432';

Expected Output:
id              | 1
nric_hash       | SHA256("S1234567A") [64 chars]
display_name    | "Tan Wei Ming"
mobile          | "98765432"
dob             | 1973-06-16
address         | "123 Clementi Road, Singapore 129742"
font_size_pref  | 19
language_pref   | "en"
role            | "asker"
kyc_status      | "verified"
referral_code   | "REF-XXXXXX" (unique)
singpass_id     | NULL (for mock)
created_at      | now
updated_at      | now

Assertions:
✓ All fields populated
✓ Timestamps set
✓ NRIC hashed (not plain text)
✓ Referral code unique
✓ kyc_status = "verified"
```

---

## Test Checklist

- [ ] Splash screen loads with 4 character illustrations
- [ ] Signup: Select persona → flow completes
- [ ] Signup: Custom entry → flow completes
- [ ] Complete profile: Mobile required, language saveable
- [ ] Font size increases to 19px for age 50+
- [ ] Database user created with correct fields
- [ ] Token stored in localStorage
- [ ] Login: Request OTP → console shows code
- [ ] Login: OTP verification with correct code → logged in
- [ ] Login: Wrong OTP → error message
- [ ] Language preference persists in DB
- [ ] Duplicate NRIC → conflict error
- [ ] GET /api/auth/me returns correct user data
- [ ] Font size persists across page refresh

---

## Debug Tips

### Check Backend Console
```bash
# Backend terminal should show:
Errandify API running on port 3000
📱 OTP for 98765432: 123456
```

### Check Database
```bash
psql errandify
SELECT id, display_name, mobile, font_size_pref, language_pref FROM users;
\q
```

### Check Browser Console
```javascript
localStorage.getItem('token')
localStorage.getItem('user')
JSON.parse(localStorage.getItem('user'))
```

### Check Network Tab
Open DevTools → Network → Monitor POST requests to `/api/auth/signup`, etc.

---

## Ready for Phase 2?

Once all tests pass:
- ✅ Auth system working
- ✅ Database schema supports SingPass
- ✅ User preferences (font size, language) stored
- ✅ Next: Category selection & errand browsing
