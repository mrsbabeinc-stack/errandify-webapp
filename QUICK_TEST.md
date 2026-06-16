# Errandify Auth — Quick Test Guide

**Time needed:** 10-15 minutes  
**Goal:** Test signup, login, font scaling, and database

---

## Step 1: Start PostgreSQL (2 min)

### macOS (Homebrew)
```bash
brew services start postgresql@15
```

### macOS (Docker)
```bash
docker run -d -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres
```

### Linux
```bash
sudo systemctl start postgresql
```

### Verify it's running
```bash
psql --version
# Should show: psql (PostgreSQL) 15.x
```

---

## Step 2: Create Database (1 min)

```bash
# Create database
createdb errandify

# Load schema
psql errandify < database/schema.sql

# Verify tables created
psql errandify -c "\dt"
```

**Expected output:**
```
        List of relations
 Schema |    Name    | Type  | Owner
--------+------------+-------+-------
 public | chat_messages | table | ...
 public | conversations | table | ...
 public | errand_assignments | table | ...
 public | errands    | table | ...
 public | users      | table | ...
```

---

## Step 3: Start Backend (2 min)

### Terminal 1
```bash
cd backend

# Install dependencies (first time only)
npm install

# Start server
npm run dev
```

**Expected output:**
```
Errandify API running on port 3000
Environment: development
SingPass enabled: false
```

✅ **Backend is ready** when you see the above message.

---

## Step 4: Start Frontend (2 min)

### Terminal 2
```bash
cd frontend

# Install dependencies (first time only)
npm install

# Start dev server
npm run dev
```

**Expected output:**
```
  VITE v5.0.0  ready in 123 ms

  ➜  Local:   http://localhost:5173/
  ➜  press h to show help
```

✅ **Frontend is ready** when you see the above message.

---

## Step 5: Test Signup Flow (5 min)

### Open Browser
```
http://localhost:5173
```

You should see:

```
┌─────────────────────────────────┐
│         Errandify              │
│   Simplifying lives.           │
│   Amplifying humanity.         │
│                                │
│  🌸 🌼 🌿 🪨                    │
│  Hana Esha Lian Piers          │
│                                │
│  [Sign Up with SingPass]       │
│  Powered by SingPass—coming soon│
│  Already have account? Log in  │
└─────────────────────────────────┘
```

### Action 1: Click "Sign Up with SingPass"

You'll see the SingPass Demo Modal:

```
┌─────────────────────────────────┐
│  SingPass Demo Mode             │
│  For testing only.              │
│                                 │
│  [Select Persona] [Custom]      │
│                                 │
│  ◯ Tan Wei Ming, 51 (selected)  │
│  ◯ Siti Rahimah, 35             │
│  ◯ Ravi Kumar, 28               │
│                                 │
│  [Back] [Continue]              │
└─────────────────────────────────┘
```

### Action 2: Keep "Tan Wei Ming" Selected (Age 51)

This tests font-size scaling. Click **"Continue"**.

### Action 3: Complete Profile

```
┌─────────────────────────────────┐
│  Complete Your Profile          │
│                                 │
│  Display Name                   │
│  [Tan Wei Ming]   ← Pre-filled  │
│                                 │
│  Mobile Number                  │
│  [___________]                  │
│                                 │
│  Language Preference            │
│  [English] [中文]               │
│                                 │
│  Age: 51 ✓ Font size 19px      │
│                                 │
│  [Back] [Join the Kampung]      │
└─────────────────────────────────┘
```

**Fill in:**
- Mobile: `98765432`
- Language: Keep "English" (default)

Click **"Join the Kampung"**

### Expected Result

✅ You should be redirected to Home page  
✅ Text should be **noticeably larger** (19px, not standard 16px)  
✅ Browser console should have token:

```javascript
// Open DevTools (F12) → Console tab
localStorage.getItem('token')
// Returns: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...."

localStorage.getItem('user')
// Returns: {"id":1,"name":"Tan Wei Ming","mobile":"98765432","role":"asker"}
```

---

## Step 6: Verify Database (2 min)

### Terminal 3: Check Database

```bash
# Open PostgreSQL
psql errandify

# View the user we just created
SELECT id, display_name, mobile, font_size_pref, language_pref, role 
FROM users;
```

**Expected output:**
```
 id | display_name  | mobile   | font_size_pref | language_pref | role
----+---------------+----------+----------------+---------------+-------
  1 | Tan Wei Ming   | 98765432 |             19 | en            | asker
```

✅ **Font size is 19** (because age ≥ 50)  
✅ **Mobile stored correctly**  
✅ **Language preference saved**

### Check NRIC Hash

```sql
SELECT id, nric_hash, kyc_status, referral_code FROM users;
```

**Expected output:**
```
 id |                          nric_hash                          | kyc_status |  referral_code
----+--------------------------------------------------------------+------------+-----------------
  1 | 6b86b273f403ebbd....(64 hex characters)....| verified   | REF-A1B2C3
```

✅ **NRIC is hashed** (64 hex chars, not plain text)  
✅ **kyc_status is "verified"**  
✅ **Referral code auto-generated**

Exit PostgreSQL:
```sql
\q
```

---

## Step 7: Test Login Flow (3 min)

### Clear Login State

Open **Browser DevTools** (F12 → Console):

```javascript
localStorage.clear()
location.reload()
```

You should be back on the **Splash Screen**.

### Action 1: Click "Already have account? Log in"

```
┌─────────────────────────────────┐
│  Welcome Back                   │
│  Sign in with mobile number     │
│                                 │
│  Mobile Number                  │
│  [_________________]            │
│                                 │
│  [Back] [Send OTP]              │
└─────────────────────────────────┘
```

### Action 2: Enter Mobile Number

Type: `98765432`

Click **"Send OTP"**

### Action 3: Check Backend Console

Go back to **Terminal 1** (backend):

You should see:
```
📱 OTP for 98765432: 123456
```

✅ **OTP was generated** and logged to console

### Action 4: Enter OTP

Back in browser, you should see:

```
┌─────────────────────────────────┐
│  Welcome Back                   │
│  Enter OTP sent to 98765432     │
│                                 │
│  OTP Code                       │
│  [1 2 3 4 5 6 ]  ← monospace   │
│                                 │
│  💡 Demo: Use OTP 123456        │
│                                 │
│  [Back] [Verify]                │
└─────────────────────────────────┘
```

### Action 5: Verify OTP

Type the OTP you saw in the backend console (e.g., `123456`)

Click **"Verify"**

### Expected Result

✅ Logged in successfully  
✅ Redirected to Home page  
✅ Text is **19px** (saved preference from signup)

---

## Step 8: Test Font Size Scaling (3 min)

Test that different ages produce different font sizes.

### Test Case 1: Age 50+ → 19px (Already Done)

✅ Tan Wei Ming (51) → Font size 19px

### Test Case 2: Age < 50 → 16px

Clear localStorage again:

```javascript
localStorage.clear()
location.reload()
```

Go through signup again:

1. Click "Sign Up with SingPass"
2. **Select "Siti Rahimah" (age 35)** ← Different persona
3. Mobile: `91234567`
4. Language: English
5. Click "Join the Kampung"

**Compare:** Text should be **noticeably smaller** than before (16px)

Check database:

```bash
psql errandify -c "SELECT display_name, font_size_pref FROM users ORDER BY id;"
```

**Expected output:**
```
 display_name  | font_size_pref
---------------+----------------
 Tan Wei Ming   |             19
 Siti Rahimah   |             16
```

✅ Font sizes differ based on age

---

## Step 9: Test Custom Entry (2 min)

Clear localStorage:

```javascript
localStorage.clear()
location.reload()
```

### Custom Signup Flow

1. Click "Sign Up with SingPass"
2. Click **"Custom"** button (instead of selecting persona)

```
┌─────────────────────────────────┐
│  [Select Persona] [Custom]      │
│                                 │
│  Full Name                      │
│  [John Doe]                     │
│                                 │
│  Age                            │
│  [40]                           │
│                                 │
│  NRIC                           │
│  [S1111111X]                    │
│                                 │
│  Address                        │
│  [123 Main Street, Singapore]  │
│                                 │
│  [Back] [Continue]              │
└─────────────────────────────────┘
```

**Fill in:**
- Full Name: `John Doe`
- Age: `40`
- NRIC: `S1111111X`
- Address: `123 Main Street, Singapore 160000`

Click **"Continue"**

### Complete Profile

- Mobile: `81234567`
- Language: `中文` (Chinese)
- Click "Join the Kampung"

### Verify in Database

```bash
psql errandify -c "SELECT display_name, age, language_pref FROM users WHERE mobile='81234567';"
```

Wait, we stored DOB, not age. Check this instead:

```bash
psql errandify -c "SELECT display_name, dob, language_pref FROM users WHERE mobile='81234567';"
```

✅ Custom user created with correct fields

---

## Step 10: Test Language Preference (1 min)

Check that language preference is stored:

```bash
psql errandify << EOF
SELECT display_name, mobile, language_pref FROM users;
EOF
```

**Expected output shows:**
```
 display_name  | mobile   | language_pref
---------------+----------+---------------
 Tan Wei Ming   | 98765432 | en
 Siti Rahimah   | 91234567 | en
 John Doe       | 81234567 | zh
```

✅ Language preferences saved correctly

---

## Step 11: Test API Endpoint (Optional, 1 min)

Use curl to test auth endpoint directly:

```bash
# Test: Get current user profile
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer $(echo 'eyJhbGc...' | tr -d '"')"

# Replace the JWT with an actual token from localStorage
```

Or use browser DevTools:

```javascript
fetch('http://localhost:3000/api/auth/me', {
  headers: {
    'Authorization': 'Bearer ' + localStorage.getItem('token')
  }
})
.then(r => r.json())
.then(d => console.log(d))
```

**Expected response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Tan Wei Ming",
    "mobile": "98765432",
    "role": "asker",
    "language": "en"
  }
}
```

✅ API endpoint working

---

## ✅ Full Test Checklist

- [ ] Splash screen loads with illustrations
- [ ] Sign up flow: Select persona → completes
- [ ] Sign up flow: Custom entry → completes
- [ ] Mobile number required in complete profile
- [ ] Language toggle works (EN / 中文)
- [ ] Text size larger (19px) for age 51+
- [ ] Text size standard (16px) for age < 50
- [ ] User saved in database with correct fields
- [ ] NRIC hashed (not plain text)
- [ ] Referral code auto-generated
- [ ] Token stored in localStorage
- [ ] Login: Mobile → OTP request → OTP in console
- [ ] Login: OTP verification → successful login
- [ ] Wrong OTP → error message
- [ ] Font size persists across page refresh
- [ ] Language preference saved in database
- [ ] GET /api/auth/me returns correct user
- [ ] Multiple users can sign up with different details

---

## 🐛 Troubleshooting

### "Connection refused" error on backend startup

**Problem:** PostgreSQL not running

**Solution:**
```bash
# macOS
brew services start postgresql@15

# Linux
sudo systemctl start postgresql

# Docker
docker run -d -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres
```

### "ECONNREFUSED" in browser console

**Problem:** Backend not running

**Solution:**
```bash
cd backend
npm run dev
# Wait for "Errandify API running on port 3000"
```

### "Cannot GET /" in browser

**Problem:** Frontend not running

**Solution:**
```bash
cd frontend
npm run dev
# Wait for "Local: http://localhost:5173"
```

### "Module not found" errors

**Problem:** Dependencies not installed

**Solution:**
```bash
# Frontend
cd frontend && npm install

# Backend
cd backend && npm install
```

### Database doesn't exist

**Problem:** Schema not loaded

**Solution:**
```bash
createdb errandify
psql errandify < database/schema.sql
psql errandify -c "\dt"  # Should show tables
```

### OTP not showing in backend console

**Problem:** Backend didn't receive the request

**Solution:**
1. Check backend terminal is running (`npm run dev`)
2. Check frontend shows "Sending..." while sending OTP
3. Wait a moment before checking console
4. Check backend URL is `http://localhost:3000` in frontend `.env`

### Text size not changing

**Problem:** Age calculation might be off

**Solution:**
1. Check age in signup form
2. Check database: `SELECT font_size_pref FROM users;`
3. Check browser: Inspect element → check font-size style
4. Try age exactly 50 or 51 to be sure

---

## 📊 Expected Database State After All Tests

```bash
psql errandify -c "SELECT id, display_name, mobile, font_size_pref, language_pref FROM users ORDER BY id;"
```

**Should show 3 users:**
```
 id | display_name  | mobile   | font_size_pref | language_pref
----+---------------+----------+----------------+---------------
  1 | Tan Wei Ming   | 98765432 |             19 | en
  2 | Siti Rahimah   | 91234567 |             16 | en
  3 | John Doe       | 81234567 |             16 | zh
```

---

## ✨ Next Steps After Testing

If all tests pass:

✅ Auth system working  
✅ Database schema correct  
✅ Font scaling works  
✅ Language preferences saved  

**Next phase:** Build Category Selection screen

---

**Questions?** Check `AUTH_FLOW.md` for detailed documentation or `TEST_SCENARIOS.md` for more in-depth scenarios.

Good luck! 🚀
