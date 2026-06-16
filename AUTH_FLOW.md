# Errandify Mock Auth Flow Documentation

## Overview

The authentication system is built to be **identical in UI** to the final SingPass version. Only the backend auth changes when real SingPass is connected. The database schema is designed to support both mock and real SingPass without migrations.

### Key Design Principle

✅ **Same Database Schema** — Whether using mock NRIC or real SingPass:
- `nric_hash` (SHA256) stores NRIC or SingPass unique ID
- `kyc_status: 'verified'` for both (mock = auto-verified, real SingPass = OAuth-verified)
- `dob`, `address`, `language_pref`, `font_size_pref` match SingPass response fields
- When SingPass is enabled, replace OAuth response → same fields, zero migration

---

## Frontend Flow

### 1. Splash Screen (`SplashScreen.tsx`)

User lands on this screen (happens automatically if not authenticated).

```
┌─────────────────────────────────┐
│        Errandify                │
│   Simplifying lives.            │
│   Amplifying humanity.          │
│                                 │
│  🌸 🌼 🌿 🪨                     │
│  Hana Esha Lian Piers           │
│                                 │
│  [Hana speech bubble]           │
│  "Hello neighbour!..."          │
│                                 │
│  [Sign Up with SingPass] ← Orange│
│  Powered by SingPass—coming soon│
│                                 │
│  Already have account? Log in   │
└─────────────────────────────────┘
```

**Buttons:**
- `onSignup` → Navigates to `SignupFlow` → Step 1: Mock SingPass Modal
- `onLogin` → Navigates to `LoginFlow` → Mobile OTP

---

### 2. Sign Up Flow

#### Step 1: Mock SingPass Modal (`MockSingpassModal.tsx`)

Simulates SingPass identity verification with two modes:

**Select Persona (default):**
- [ ] Tan Wei Ming, 51, Asker
- [ ] Siti Rahimah, 35, Doer
- [ ] Ravi Kumar, 28, Both
- [Custom] button to switch mode

**Custom Mode:**
- User manually enters:
  - Full Name (e.g., "Tan Wei Ming")
  - Age (for font size auto-scaling, 50+ → 19px)
  - NRIC (e.g., "S1234567A")
  - Address (e.g., "123 Clementi Rd, Singapore")

**On Continue:**
- Selected/custom persona data passed to Step 2
- No API call yet

#### Step 2: Complete Profile (`CompleteProfileStep.tsx`)

```
┌─────────────────────────────────┐
│  Complete Your Profile          │
│  One more step to join kampung  │
│                                 │
│  Display Name (pre-filled)      │
│  [Tan Wei Ming            ]     │
│                                 │
│  Mobile Number (required)       │
│  [98765432                ]     │
│                                 │
│  Language Preference            │
│  [English] [中文]               │
│                                 │
│  Age: 51 (auto-applied 19px)    │
│                                 │
│  [Back] [Join the Kampung]      │
└─────────────────────────────────┘
```

**Features:**
- Display name pre-filled from mock SingPass (editable)
- Mobile number required
- Language toggle: EN (default) | 中文
- **Font size auto-scales:**
  - Age ≥ 50 → `font_size_pref: 19`, page text increases
  - Age < 50 → `font_size_pref: 16` (default)
- Shows age as informational (from mock SingPass)

**On "Join the Kampung":**
```
POST /api/auth/signup
{
  "name": "Tan Wei Ming",
  "age": 51,
  "nric": "S1234567A",
  "address": "123 Clementi Rd, Singapore",
  "mobile": "98765432",
  "language": "en",
  "role": "asker"
}
```

**Response:**
```json
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
```

**Token Storage:** Saved to `localStorage` (real: httpOnly cookie)

---

### 3. Login Flow

#### Step 1: Request OTP (`LoginFlow.tsx`)

```
┌─────────────────────────────────┐
│  Welcome Back                   │
│  Sign in with mobile number     │
│                                 │
│  Mobile Number                  │
│  [98765432                ]     │
│                                 │
│  [Back] [Send OTP]              │
└─────────────────────────────────┘
```

**On "Send OTP":**
```
POST /api/auth/request-otp
{ "mobile": "98765432" }
```

**Backend Response:**
- ✅ OTP generated (6 digits, valid 10 min)
- ✅ Console logs: `📱 OTP for 98765432: 123456`
- ✅ Real implementation: SMS via Twilio/Infobip
- ✅ Returns success to frontend

#### Step 2: Verify OTP

```
┌─────────────────────────────────┐
│  Welcome Back                   │
│  Enter OTP sent to 98765432     │
│                                 │
│  OTP Code                       │
│  [1 2 3 4 5 6 ]  ← monospace    │
│                                 │
│  💡 Demo: Use 123456            │
│                                 │
│  [Back] [Verify]                │
└─────────────────────────────────┘
```

**On "Verify":**
```
POST /api/auth/verify-otp
{ "mobile": "98765432", "otp": "123456" }
```

**Response:** Same as signup (JWT + user data)

---

## Backend Implementation

### Database Schema

```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  nric_hash VARCHAR(64) UNIQUE NOT NULL,  ← SHA256(NRIC)
  display_name VARCHAR(255) NOT NULL,
  mobile VARCHAR(20) NOT NULL,
  dob DATE,
  address TEXT,
  profile_image_url VARCHAR(500),
  singpass_id VARCHAR(255) UNIQUE,         ← Null for mock, populated by real SingPass
  font_size_pref INTEGER DEFAULT 16,      ← 16 or 19
  language_pref VARCHAR(5) DEFAULT 'en',  ← 'en' or 'zh'
  role VARCHAR(50) NOT NULL DEFAULT 'asker',
  kyc_status VARCHAR(50) DEFAULT 'verified', ← Always 'verified' in mock
  referral_code VARCHAR(20) UNIQUE,        ← Auto-generated: "REF-XXXXXX"
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### API Endpoints

#### `POST /api/auth/signup`

**Request:**
```json
{
  "name": "Tan Wei Ming",
  "age": 51,
  "nric": "S1234567A",
  "address": "123 Clementi Rd, Singapore",
  "mobile": "98765432",
  "language": "en",
  "role": "asker"
}
```

**Logic:**
1. Hash NRIC with SHA256
2. Check if `nric_hash` exists → 409 Conflict
3. Calculate DOB from age (subtract years from today)
4. Generate referral code: `"REF-" + 6 random hex chars`
5. Determine `font_size_pref`:
   - age ≥ 50 → 19
   - else → 16
6. Set `kyc_status = 'verified'` (mock auto-verified)
7. Insert user, return JWT

**Response:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "name": "Tan Wei Ming",
      "mobile": "98765432",
      "role": "asker"
    }
  }
}
```

---

#### `POST /api/auth/request-otp`

**Request:**
```json
{ "mobile": "98765432" }
```

**Logic:**
1. Check user exists with `mobile` → 404 if not
2. Generate 6-digit OTP
3. Store in memory: `otpStore[mobile] = { code, expiresAt: now + 10min }`
4. Console log: `📱 OTP for 98765432: 123456`
5. Return success

**Response:**
```json
{
  "success": true,
  "message": "OTP sent to mobile"
}
```

---

#### `POST /api/auth/verify-otp`

**Request:**
```json
{
  "mobile": "98765432",
  "otp": "123456"
}
```

**Logic:**
1. Check OTP valid: exists, matches, not expired
2. Fetch user by mobile
3. Delete OTP from store
4. Generate JWT with userId, mobile, role
5. Return JWT + user data

**Response:** Same as signup

---

#### `GET /api/auth/me`

Protected route (requires JWT in Authorization header).

**Request:**
```
GET /api/auth/me
Authorization: Bearer eyJhbGc...
```

**Response:**
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

---

## Switching to Real SingPass

When the SingPass sandbox is approved:

### 1. Update Backend Config

```javascript
// shared/config.js
const USE_SINGPASS = true; // Flip to true
```

### 2. Implement SingPass OAuth Route

Create new endpoint: `POST /api/auth/singpass/callback`

```typescript
router.post('/singpass/callback', async (req: Request, res: Response) => {
  const { profile } = req.body; // From SingPass MyInfo OAuth

  // Extract fields (same DB schema!)
  const nricHash = hashNric(profile.nric);
  const existingUser = await db.query(
    'SELECT id FROM users WHERE nric_hash = $1',
    [nricHash]
  );

  if (existingUser.rows.length > 0) {
    // Returning user
    const user = existingUser.rows[0];
    const token = jwt.sign({ userId: user.id }, config.jwtSecret);
    return res.json({ success: true, data: { accessToken: token, user } });
  }

  // New user from SingPass
  const newUser = await db.query(
    `INSERT INTO users (
      nric_hash, display_name, mobile, dob, address,
      singpass_id, font_size_pref, language_pref, role, kyc_status
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING id, display_name, mobile, role`,
    [
      nricHash,
      profile.name,
      profile.mobile,
      profile.dob,
      profile.address,
      profile.singpass_id,
      calculateFontSize(profile.dob),
      'en', // Default language
      'asker', // Default role
      'verified', // SingPass-verified
    ]
  );

  // Return JWT
  const token = jwt.sign({ userId: newUser.rows[0].id }, config.jwtSecret);
  res.json({ success: true, data: { accessToken: token, user: newUser.rows[0] } });
});
```

### 3. Frontend: Conditional UI

```typescript
import { USE_SINGPASS } from '../shared/config.js';

// In SplashScreen
<button onClick={USE_SINGPASS ? redirectToSingpass : showMockModal}>
  Sign Up with SingPass
</button>
```

### What Changes

| Aspect | Mock | Real SingPass |
|--------|------|---------------|
| **Splash Screen UI** | Same | Same |
| **Sign-up UI** | Mock modal + form | OAuth redirect → auto-fill |
| **Database Schema** | Unchanged | Unchanged |
| **API Endpoints** | `/signup`, `/login` | `/singpass/callback` |
| **Stored Fields** | `nric_hash`, DOB, address | `singpass_id`, DOB, address |
| **KYC Status** | Auto-verified | OAuth-verified |
| **No Migrations** | ✅ | ✅ |

---

## Testing the Flow

### Development

1. **Start database:**
   ```bash
   createdb errandify
   psql errandify < database/schema.sql
   ```

2. **Start backend:**
   ```bash
   cd backend
   npm install
   npm run dev
   ```

3. **Start frontend:**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

4. **Test signup:**
   - Click "Sign Up with SingPass"
   - Select persona or enter custom
   - Fill mobile & language
   - Click "Join the Kampung"
   - Verify token stored in localStorage

5. **Test login:**
   - Click "Log in" on splash
   - Enter mobile number
   - Click "Send OTP"
   - Check backend console: `📱 OTP for 98765432: 123456`
   - Enter "123456" in OTP field
   - Verify logged in

### Test Personas

| Name | Age | NRIC | Role | Use Case |
|------|-----|------|------|----------|
| Tan Wei Ming | 51 | S1234567A | Asker | Test font size 19px |
| Siti Rahimah | 35 | S9876543B | Doer | Standard (16px) |
| Ravi Kumar | 28 | S5555555C | Both | Young user |

---

## Security Notes

### Current (Mock)

- ⚠️ NRIC visible in requests (mock only, not real)
- ⚠️ OTP in memory (not persistent)
- ✅ Password-less (no password attacks)
- ✅ SHA256 hashing (prep for real SingPass)

### Production

- ✅ NRIC only hashed in DB
- ✅ OTP via SMS (Twilio/Infobip)
- ✅ SingPass OAuth (no NRIC transmitted)
- ✅ httpOnly, Secure cookies
- ✅ HTTPS only
- ✅ Rate limiting on OTP requests

---

## File Structure

```
frontend/src/components/auth/
  ├── SplashScreen.tsx          # Initial landing
  ├── SignupFlow.tsx            # Signup orchestrator
  ├── MockSingpassModal.tsx     # Step 1: Select/enter persona
  ├── CompleteProfileStep.tsx   # Step 2: Mobile + language
  └── LoginFlow.tsx             # Login: mobile → OTP → verify

backend/src/
  ├── routes/auth.ts           # All auth endpoints
  ├── middleware/auth.ts       # JWT validation
  └── db.ts                    # Database pool

database/
  └── schema.sql              # Users table + indexes
```

---

## Next Steps

1. ✅ Mock signup/login implemented
2. ⏳ Category selection screen (after auth)
3. ⏳ Real SMS integration
4. ⏳ SingPass OAuth setup
5. ⏳ Referral system features
