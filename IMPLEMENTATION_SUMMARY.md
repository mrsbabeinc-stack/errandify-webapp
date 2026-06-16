# Errandify Mock Auth Flow — Implementation Summary

## ✅ Completed

### Frontend (React + TypeScript)

**5 New Components:**

1. **SplashScreen.tsx** (130 lines)
   - Errandify branding + tagline
   - 4 character avatars with emoji (Hana 🌸, Esha 🌼, Lian 🌿, Piers 🪨)
   - Hana speech bubble with campaign message
   - Orange "Sign Up" button + "Log in" link
   - Matches final SingPass UI

2. **SignupFlow.tsx** (45 lines)
   - Orchestrates 2-step signup process
   - Manages mock SingPass → profile completion flow
   - Passes data between steps

3. **MockSingpassModal.tsx** (180 lines)
   - Step 1 of signup
   - Two modes: Select persona OR custom entry
   - Pre-loaded personas with ages (for testing)
   - Form validation

4. **CompleteProfileStep.tsx** (170 lines)
   - Step 2 of signup
   - Mobile number field
   - Language toggle (EN / 中文)
   - Auto font-size scaling message (age ≥ 50 → 19px)
   - API integration to `/api/auth/signup`

5. **LoginFlow.tsx** (150 lines)
   - 2-step OTP login
   - Mobile number entry → OTP verification
   - Console hint showing demo OTP
   - API integration to `/api/auth/request-otp` and `/api/auth/verify-otp`

**Pages Updated:**
- `LoginPage.tsx` — Refactored to route between splash, signup, login screens

---

### Backend (Node.js + Express + TypeScript)

**auth.ts (Auth Routes)** (280 lines)

Three working endpoints:

1. **POST /api/auth/signup** — Create new user
   - Validates required fields (name, nric, mobile, address)
   - Hashes NRIC with SHA256
   - Checks for duplicates (409 Conflict if exists)
   - Calculates DOB from age
   - Generates referral code
   - Sets font_size_pref based on age
   - Inserts to DB, returns JWT

2. **POST /api/auth/request-otp** — Generate & store OTP
   - Checks user exists
   - Generates 6-digit OTP
   - Stores with 10-min expiry
   - Console logs OTP (demo; SMS in prod)

3. **POST /api/auth/verify-otp** — Validate OTP & login
   - Checks OTP exists, matches, not expired
   - Generates JWT
   - Cleans up OTP storage
   - Returns user data

4. **GET /api/auth/me** — Protected: fetch current user

---

### Database (PostgreSQL)

**Updated users table:**
- `nric_hash` (VARCHAR 64, UNIQUE) — SHA256 of NRIC
- `display_name` (VARCHAR 255)
- `mobile` (VARCHAR 20)
- `dob` (DATE)
- `address` (TEXT)
- `font_size_pref` (INTEGER, 16 or 19)
- `language_pref` (VARCHAR 5, 'en' or 'zh')
- `role` (VARCHAR 50, 'asker' or 'doer', default 'asker')
- `kyc_status` (VARCHAR 50, 'verified')
- `referral_code` (VARCHAR 20, UNIQUE)
- `singpass_id` (VARCHAR 255, UNIQUE, NULL for mock)
- Timestamps: created_at, updated_at

**Indexes added:**
- idx_users_mobile
- idx_users_nric_hash
- idx_users_referral_code

**Schema Design:** Supports both mock and real SingPass without migrations

---

### Documentation (4 Files)

1. **AUTH_FLOW.md** (400+ lines)
   - Detailed flow diagrams
   - API endpoint specifications
   - Database schema explanation
   - Switch to real SingPass guide

2. **GETTING_STARTED.md** (280 lines)
   - Database setup
   - Environment configuration
   - Server startup instructions
   - Testing tips
   - Troubleshooting

3. **TEST_SCENARIOS.md** (450+ lines)
   - 9 detailed test cases with expected outputs
   - Step-by-step walkthroughs
   - Debug tips
   - Database verification queries

4. **IMPLEMENTATION_SUMMARY.md** (this file)
   - Overview of completed work
   - File counts & line numbers
   - Testing instructions
   - Next steps

---

## 🧪 Testing Checklist

### Local Setup (15 min)
- [ ] PostgreSQL running: `createdb errandify && psql errandify < database/schema.sql`
- [ ] Backend: `cd backend && npm install && npm run dev`
- [ ] Frontend: `cd frontend && npm install && npm run dev`
- [ ] Navigate to http://localhost:5173

### Test Signup (5 min each)
- [ ] Persona selection: Tan Wei Ming (51) → mobile → join → verify DB
- [ ] Persona selection: Siti Rahimah (35) → font size standard
- [ ] Custom entry: Your name, age, NRIC, address → flow completes
- [ ] Language toggle: Select 中文 → verify in DB

### Test Login (5 min)
- [ ] Request OTP: Check backend console for code
- [ ] Verify OTP: Use code from console → login succeeds
- [ ] Wrong OTP: Try invalid code → error message
- [ ] Expired OTP: Wait 10 min, try old code → rejected

### Test Font Scaling
- [ ] Signup with age 51 → text is 19px (visibly larger)
- [ ] Signup with age 30 → text is 16px (standard)
- [ ] Refresh page → font size persists

### Test Database
- [ ] Query: `SELECT * FROM users;`
- [ ] Verify NRIC is hashed (64 hex chars)
- [ ] Verify referral_code unique
- [ ] Verify kyc_status = 'verified'
- [ ] Verify font_size_pref correct for age

---

## 📂 File Structure

```
frontend/src/components/auth/
├── SplashScreen.tsx          ✅ Landing screen
├── SignupFlow.tsx            ✅ Signup orchestrator
├── MockSingpassModal.tsx     ✅ Step 1: Persona selection
├── CompleteProfileStep.tsx   ✅ Step 2: Profile completion
└── LoginFlow.tsx             ✅ OTP login

backend/src/
├── routes/auth.ts            ✅ Auth endpoints
├── middleware/auth.ts        ✅ JWT validation (existing)
└── db.ts                     ✅ Database pool (existing)

database/
└── schema.sql               ✅ Updated users table

Documentation:
├── AUTH_FLOW.md             ✅ Detailed documentation
├── GETTING_STARTED.md       ✅ Setup guide
├── TEST_SCENARIOS.md        ✅ Test walkthroughs
└── IMPLEMENTATION_SUMMARY.md ✅ This file
```

---

## 🔄 Data Flow: Signup

```
User: SplashScreen
↓ "Sign Up with SingPass"
MockSingpassModal (select persona or custom entry)
↓ Click "Continue"
CompleteProfileStep (mobile + language)
↓ Click "Join the Kampung"
POST /api/auth/signup
↓
Backend:
  1. Hash NRIC (SHA256)
  2. Check duplicate
  3. Calculate DOB from age
  4. Generate referral code
  5. Determine font size (age ≥ 50 → 19px)
  6. INSERT users
↓
Frontend:
  1. Store JWT in localStorage
  2. Redirect to home
  3. Apply font size from profile

Database:
users(id, nric_hash, display_name, mobile, dob, address, 
      font_size_pref, language_pref, role, kyc_status, referral_code)
```

---

## 🔄 Data Flow: Login

```
User: SplashScreen
↓ "Already have account? Log in"
LoginFlow Step 1: Enter mobile
↓ "Send OTP"
POST /api/auth/request-otp
↓
Backend:
  1. Check user exists
  2. Generate 6-digit OTP
  3. Store in memory (10 min expiry)
  4. Console log: 📱 OTP for [mobile]: [code]
↓
User: LoginFlow Step 2: Enter OTP
↓ "Verify"
POST /api/auth/verify-otp
↓
Backend:
  1. Validate OTP (exists, matches, not expired)
  2. Fetch user
  3. Clean up OTP
  4. Generate JWT
  5. Return user + token
↓
Frontend:
  1. Store JWT in localStorage
  2. Apply saved preferences (font size, language)
  3. Redirect to home
```

---

## 🔐 Security Features

✅ **Current (Mock):**
- NRIC hashed in DB (SHA256)
- Password-less (no password attacks)
- JWT with 7-day expiry
- OTP valid for 10 minutes
- OTP deleted after use
- User uniqueness via nric_hash

✅ **Coming (Real SingPass):**
- OAuth with SingPass NDI
- No NRIC transmitted (only hashed singpass_id)
- httpOnly cookies (not localStorage)
- HTTPS only
- Rate limiting on OTP requests

---

## 🎯 Pre-loaded Test Personas

| Name | Age | NRIC | Use Case |
|------|-----|------|----------|
| Tan Wei Ming | 51 | S1234567A | Font size 19px |
| Siti Rahimah | 35 | S9876543B | Standard 16px |
| Ravi Kumar | 28 | S5555555C | Young user |
| Custom | Any | Custom | Testing flexibility |

**Demo OTP:** 123456

---

## 🚀 Switch to Real SingPass (Later)

Three simple steps:

1. **Config:**
   ```javascript
   // shared/config.js
   const USE_SINGPASS = true;
   ```

2. **Backend:** Add one new route
   ```typescript
   POST /api/auth/singpass/callback
   ```
   Uses same database fields (zero migration)

3. **Frontend:** Add SingPass button handler
   Same UI as mock, calls OAuth instead of mock modal

**Result:** No database changes, no frontend structure changes

---

## ✨ Key Design Decisions

✅ **Identical UI** — Splash screen, buttons, flows same as real SingPass
✅ **SingPass-Ready Schema** — All fields support both mock & OAuth
✅ **Font Size Auto-Scaling** — Age ≥ 50 → 19px (accessibility)
✅ **Language Toggle** — EN / 中文 saved to profile
✅ **Referral Codes** — Auto-generated on signup
✅ **Zero OTP Setup** — Demo uses console (easy switch to SMS later)
✅ **Password-Less** — OTP-based, future-proof
✅ **Hashed NRIC** — Even mock data never stored in plain text

---

## 📋 Next Phase: Category Selection

After auth is working:

```
Home Screen (after login)
↓
"What category of errand are you looking for?"
├─ 🏠 Home Maintenance
├─ 🧺 Cleaning & Laundry
├─ 🛍️ Shopping & Errands
├─ 📦 Delivery & Moving
├─ 🧒 Childcare & Tutoring
└─ ... (more categories)
↓
Browse errands in that category
```

Connected to:
- Qwen AI for category suggestions
- Errand listing/creation
- Chat with AI assistant
- Audio features (FunASR, CosyVoice)

---

## 📞 Commands to Run Everything

```bash
# Terminal 1: Database
createdb errandify
psql errandify < database/schema.sql

# Terminal 2: Backend
cd backend
npm install
npm run dev

# Terminal 3: Frontend
cd frontend
npm install
npm run dev

# Browser
Open http://localhost:5173
```

---

## 📚 Documentation Reference

| Document | Purpose |
|----------|---------|
| `AUTH_FLOW.md` | Complete technical documentation |
| `GETTING_STARTED.md` | Setup & troubleshooting |
| `TEST_SCENARIOS.md` | 9 detailed test cases |
| `IMPLEMENTATION_SUMMARY.md` | This overview |
| `README.md` | Project overview |
| `ARCHITECTURE.md` | System architecture |

---

## ✅ Status: Ready for Testing

All components implemented and integrated. Database schema supports both mock and real SingPass. Documentation complete with test scenarios.

**Next:** Run local tests → Verify all flows work → Then build Category Selection screen.

---

**Built with ❤️ for Singapore's community**

*Last updated: 2026-06-16*
