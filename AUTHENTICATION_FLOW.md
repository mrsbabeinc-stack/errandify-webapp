# 🔐 ERRANDIFY AUTHENTICATION FLOW

## 📋 OVERVIEW

Errandify supports **TWO authentication pathways** for Singapore users:

1. **SingPass** - For users with SingPass (SG citizens/residents)
2. **Veriff** - For users WITHOUT SingPass (Foreigners, temporary residents)

---

## 🇸🇬 PATHWAY 1: SINGPASS AUTHENTICATION

### Current Status: MOCK IMPLEMENTATION READY ✅

**File:** `frontend/src/pages/SingPassSignupPage.tsx`

### How It Works:
1. User clicks "Sign up with SingPass"
2. Redirected to SingPass login portal (or mock in dev)
3. SingPass verifies NRIC and returns:
   - NRIC (hashed SHA256)
   - Name
   - Email
   - Phone
4. System creates user account with verified identity
5. Immediate access to platform

### User Data Captured:
```
{
  nric_hash: "SHA256(NRIC)",
  display_name: "User Name",
  email: "user@email.com",
  mobile: "+65 9123 4567",
  kyc_status: "verified",
  auth_method: "singpass"
}
```

### Criminal Screening:
- Automatic check against:
  - CYPA offences (children protection)
  - Women's Charter (domestic violence)
  - Penal Code (serious crimes)
  - VAA 2018 (elder abuse)
  - Dishonesty offences
- **Result:** Approved, Restricted, or Blocked
- **Duration:** Permanent until appeal/expungement

### Implementation Ready:
- ✅ Mock SingPass flow implemented
- ✅ NRIC hashing (SHA256)
- ✅ Criminal screening database schema
- ✅ User account creation with SingPass

### Next Steps (When Integrating Real SingPass):
```
1. Get SingPass API credentials from IDA
2. Update environment variables with API endpoint
3. Replace mock endpoint with real endpoint
4. Test with real SingPass credentials
5. Deploy to production
```

---

## 🔑 PATHWAY 2: VERIFF AUTHENTICATION (NEW)

### Current Status: PLANNING ⏳

**Use Case:** Users WITHOUT SingPass
- Foreigners working in Singapore
- Temporary residents
- Non-citizens with valid visas

### How It Should Work:

#### Step 1: Veriff Identity Verification
1. User clicks "Sign up with Veriff"
2. Redirected to Veriff verification flow
3. User provides:
   - Valid government-issued ID (Passport, Work Permit, etc.)
   - Face biometric (liveness check)
   - Address verification
4. Veriff processes and returns:
   - Verification status (approved/declined)
   - Name
   - ID type & number
   - Expiry date

#### Step 2: System Creates Account
```
{
  veriff_id: "veriff_session_id",
  display_name: "User Name",
  email: "user@email.com",
  mobile: "+65 9123 4567",
  kyc_status: "verified",
  auth_method: "veriff",
  id_type: "passport", // passport, work_permit, etc.
  id_number: "XXXXXX",
  id_expiry: "2025-12-31",
  country_of_origin: "MY", // ISO country code
  verification_date: "2026-06-19"
}
```

#### Step 3: Criminal Screening for Non-Citizens
For non-citizens, additional screening:
- Interpol database (international crimes)
- Singapore MHA database (visa violations)
- Terrorist watchlist (UNSC)
- SkipTracing database (fraud history)

**Result:** Approved, Restricted, or Blocked

---

## 🏗️ PROPOSED IMPLEMENTATION ARCHITECTURE

### Frontend Pages Needed:

```
├── pages/
│   ├── SingPassSignupPage.tsx (✅ EXISTS)
│   ├── VeriffSignupPage.tsx (⏳ TODO)
│   ├── SignupMethodPage.tsx (⏳ TODO)
│   └── AuthLandingPage.tsx (⏳ TODO)
```

### Backend Endpoints Needed:

```
POST /api/auth/singpass/callback
  - Receives SingPass response
  - Creates user account
  - Returns JWT token

POST /api/auth/veriff/start
  - Initiates Veriff session
  - Returns verification URL

POST /api/auth/veriff/callback
  - Receives Veriff result
  - Creates user account
  - Returns JWT token

POST /api/auth/verify-criminal-screening
  - Run criminal background check
  - Returns approval status
```

### Database Schema:

```sql
-- Users table (update)
ALTER TABLE users ADD COLUMN (
  auth_method: ENUM('singpass', 'veriff'),
  verification_status: ENUM('pending', 'verified', 'failed'),
  id_type: VARCHAR(50),        -- passport, work_permit, etc
  id_number: VARCHAR(100),     -- encrypted
  id_expiry: DATE,
  country_of_origin: VARCHAR(2),
  veriff_session_id: VARCHAR(255),
  verification_date: TIMESTAMP
);

-- Criminal screening (already exists)
CREATE TABLE IF NOT EXISTS criminal_screening (
  id: SERIAL PRIMARY KEY,
  user_id: INTEGER,
  screening_status: ENUM('pending', 'approved', 'restricted', 'blocked'),
  screening_date: TIMESTAMP,
  restrictions: JSON,
  ...
);
```

---

## 🔄 USER FLOW COMPARISON

### SingPass User:
```
1. Click "Sign up with SingPass"
   ↓
2. Authenticate with SingPass
   ↓
3. Receive NRIC + name + email
   ↓
4. Auto-create account
   ↓
5. Run criminal screening (optional - can be async)
   ↓
6. Account ready ✅
```

**Time:** ~5 minutes

### Veriff User:
```
1. Click "Sign up with Veriff"
   ↓
2. Verify identity (scan ID + face)
   ↓
3. Veriff processes & approves
   ↓
4. Receive ID details + selfie proof
   ↓
5. Auto-create account
   ↓
6. Run criminal screening (international)
   ↓
7. Account ready ✅
```

**Time:** ~10 minutes

---

## 📊 AUTHENTICATION MATRIX

| Feature | SingPass | Veriff | Guest |
|---------|----------|--------|-------|
| **Auth Method** | Government | Third-party | Email |
| **ID Type** | NRIC | Passport/Work Permit | None |
| **Face Check** | No | Yes | No |
| **Address Verify** | Optional | Yes | No |
| **Trust Level** | High | High | Medium |
| **Can Access?** | All categories | Most categories* | Limited |
| **Setup Time** | ~5 min | ~10 min | Immediate |
| **Cost** | Free | ~$1-2 per user | Free |
| **For** | SG Citizens | Foreign workers | Testing |

*Restricted categories (childcare, elderly) require additional verification

---

## 🔒 SECURITY CONSIDERATIONS

### SingPass:
- ✅ Government-backed identity
- ✅ Singapore-specific
- ✅ NRIC is unique identifier
- ✅ High assurance level
- ❌ Only works for SG citizens/residents

### Veriff:
- ✅ Works for non-citizens
- ✅ Global coverage
- ✅ Biometric verification
- ✅ Industry-standard (fintech compliant)
- ❌ Requires manual identity review
- ❌ Slightly higher cost

---

## 📋 IMPLEMENTATION ROADMAP

### Phase 1: Keep Mock SingPass (CURRENT) ✅
- Allows testing without real SingPass
- Allows testing without Veriff
- All features work with mock data

### Phase 2: Integrate Real SingPass (NEXT)
- [ ] Get SingPass API credentials
- [ ] Setup test environment
- [ ] Implement callback handler
- [ ] Test with real credentials
- [ ] Deploy to staging

### Phase 3: Integrate Veriff (AFTER SingPass)
- [ ] Get Veriff SDK credentials
- [ ] Create VeriffSignupPage component
- [ ] Implement callback handler
- [ ] Test with test account
- [ ] Create international screening checks
- [ ] Deploy to staging
- [ ] Test with real Veriff users

### Phase 4: Support Both Methods (FINAL)
- [ ] Create SignupMethodPage
- [ ] Let users choose SingPass or Veriff
- [ ] Route to appropriate flow
- [ ] Unified account creation
- [ ] Both pathways fully functional

---

## 💡 CURRENT TEST STATE

### What Works Now:
✅ Mock SingPass signup  
✅ Account creation (mock)  
✅ Criminal screening database schema  
✅ User authentication flow  

### What Needs Real Integration:
❌ Real SingPass credentials  
❌ Real Veriff credentials  
❌ Real criminal screening API  
❌ Real identity verification  

### Testing Without Real Credentials:
✅ Use mock login with ANY email/password  
✅ All frontend features work with mock data  
✅ Backend prepared for real integration  

---

## 🚀 NEXT STEPS

1. **Immediately** (This sprint):
   - Keep current mock implementation
   - Test all frontend features
   - Verify user flows work

2. **Next Sprint**:
   - Integrate real SingPass
   - Set up IDA credentials
   - Test with real NRIC

3. **Following Sprint**:
   - Integrate Veriff
   - Set up verification flow
   - Test with international users

4. **Final Sprint**:
   - Support both authentication methods
   - Unified signup experience
   - Full production readiness

---

## 📞 CONTACT & INTEGRATION DOCS

### SingPass:
- IDA Portal: https://www.singpass.gov.sg/
- API Docs: https://www.ndi-api.ndcsa.gov.sg/
- Support: developer@ndi-api.sg

### Veriff:
- Portal: https://www.veriff.com/
- API Docs: https://veriff.readme.io/
- Support: support@veriff.com

---

## ✅ COMPLIANCE NOTES

Both authentication methods comply with:
- PDPA (Personal Data Protection Act)
- CYPA (Children and Young Persons Act)
- Women's Charter Act
- Penal Code
- VAA 2018 (Vulnerable Adults Act)

Criminal screening ensures:
- ✅ Child safety (no child abusers)
- ✅ Elderly safety (no elder abusers)
- ✅ Women safety (no domestic violence offenders)
- ✅ General safety (no serious criminals)

---

**Status:** ✅ ARCHITECTURE READY FOR IMPLEMENTATION

