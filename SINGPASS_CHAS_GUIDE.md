# SingPass & CHAS Integration Guide for Errandify

## 1. SingPass Auto-Fill (Already Implemented)

### What SingPass Can Auto-Fill
SingPass integration pre-populates the following profile fields:

✅ **Personal Information**
- Full Name
- Date of Birth
- NRIC/Singapore ID Number
- Email Address
- Mobile Number
- Residential Address
- Gender

✅ **Verification Status**
- Verified ✅ badge
- Verified timestamp
- NRIC validity

### Implementation
```typescript
// Backend endpoint for SingPass callback
POST /api/auth/singpass/login
- Receives SingPass token
- Decrypts user info
- Auto-populates profile
- Creates user account
- Returns JWT token
```

### User Flow
1. Click "Login with SingPass"
2. Redirect to SingPass portal
3. User authenticates with 2FA
4. SingPass returns user info
5. System auto-populates profile
6. User redirected to app
7. Profile data already filled ✅

---

## 2. CHAS Card Color - Why It's NOT in SingPass

### What is CHAS?
- **CHAS** = Community Health Assist Scheme
- **Managed By**: Ministry of Health, Singapore
- **Purpose**: Healthcare subsidies for low-income Singaporeans
- **Card Colors**: 
  - 🟦 **Blue** = Monthly household income ≤ $1,900
  - 🟩 **Green** = Monthly household income ≤ $3,900
  - (Also works for elderly and persons with disabilities)

### Why Not in SingPass?
❌ **CHAS is a separate system**
- CHAS data is in MOH database, not SingPass
- Requires separate API access from MOH
- Requires user consent to share CHAS status
- Not automatically available through SingPass
- Would need additional authentication

---

## 3. How to Add CHAS Support

### Option A: Manual User Input (Simple)
Users manually select CHAS card color in profile:

```typescript
// In profile form
CHAS Card Status:
○ No CHAS Card
○ 🟦 Blue Card
○ 🟩 Green Card
```

**Pros**: Simple, no API needed, user controls what they share
**Cons**: Requires user action, not auto-filled

### Option B: CHAS API Integration (Advanced)
Add official CHAS API integration:

```
1. Register with MOH for CHAS API access
2. Get CHAS API credentials
3. Implement CHAS verification endpoint
4. Add to SingPass callback workflow
5. Auto-populate CHAS status
```

**Pros**: Automatic, verified data, fraud prevention
**Cons**: Requires MOH approval, additional compliance

---

## 4. Recommended Implementation

### For Errandify v1.0 (Current)
✅ **Use Manual Selection**
- Add "CHAS Card Color" field to profile
- Let users optionally specify
- Use for eligibility verification (e.g., special pricing)
- Store in database with verification timestamp

### For Errandify v2.0 (Future)
🔄 **Add CHAS API Integration**
- Partner with MOH for CHAS API access
- Auto-verify CHAS status during signup
- Use verified status for benefits/pricing
- Maintain audit trail for compliance

---

## 5. Database Schema Update

### Add to Users Table
```sql
ALTER TABLE users ADD COLUMN (
  chas_card_color VARCHAR(10),  -- 'blue', 'green', 'none'
  chas_verified BOOLEAN DEFAULT FALSE,
  chas_verified_at TIMESTAMP,
  chas_verification_method VARCHAR(50)  -- 'manual', 'api', 'singpass'
);
```

---

## 6. API Endpoints

### Get User Profile with CHAS
```
GET /api/users/profile
Response:
{
  id: 123,
  name: "John Doe",
  singpass_verified: true,
  chas_card_color: "blue",  // NEW
  chas_verified: true,       // NEW
  chas_verified_at: "2026-06-18T00:00:00Z"
}
```

### Update CHAS Status
```
PUT /api/users/profile/chas
Body:
{
  chas_card_color: "green"
}
```

---

## 7. Use Cases for CHAS in Errandify

### 1. **Eligibility Verification**
- Show CHAS users special benefits or discounts
- "Get 20% cashback on your first 5 errands!"

### 2. **Pricing Adjustments**
- CHAS users might get lower prices for certain services
- Elderly care or health-related errands

### 3. **Verified Help Seeker Badge**
- Display "Verified Resident" status
- Builds trust in community

### 4. **Analytics & Impact**
- Track community health impact
- Show how many low-income residents used platform
- Demonstrate social impact

---

## 8. Privacy & Compliance

### PDPA Compliance
✅ **Never share CHAS status publicly**
- Only show to relevant users (e.g., doers helping)
- Requires explicit user consent
- Stored securely with encryption
- Right to be forgotten (GDPR-style)

### CHAS-Specific Compliance
- If using MOH API: Follow MOH data handling guidelines
- Only use for intended purpose (eligibility)
- Annual audit of usage
- Incident reporting to MOH if breached

---

## 9. Implementation Checklist

### Phase 1: Manual Selection (Immediate)
- [ ] Add CHAS field to profile form
- [ ] Add CHAS column to database
- [ ] Store user-selected CHAS color
- [ ] Display CHAS status in profile
- [ ] Use CHAS for eligibility checks

### Phase 2: CHAS API (Future)
- [ ] Contact MOH for API access
- [ ] Get API credentials & documentation
- [ ] Implement CHAS verification endpoint
- [ ] Integrate with SingPass callback
- [ ] Test with MOH sandbox
- [ ] Move to production

---

## 10. Current Status in Errandify

### ✅ SingPass Integration
- **Status**: Implemented and ready
- **Auto-fill**: Full name, DOB, address, email, mobile
- **Verification**: Verified badge shown in profile
- **Location**: `/api/auth/singpass/login` endpoint

### 🔄 CHAS Support
- **Status**: Not yet implemented
- **Recommendation**: Add manual selection first
- **Timeline**: Could be added in next sprint
- **Complexity**: Low (manual), Medium (API)

---

## Quick Setup Guide

### To Enable CHAS Manual Selection:
1. Add CHAS field to profile form
2. Add database column: `ALTER TABLE users ADD COLUMN chas_card_color VARCHAR(10);`
3. Update API to store/retrieve CHAS color
4. Display CHAS status in profile page
5. Use for eligibility checks (e.g., discounts)

### To Enable CHAS API (Later):
1. Email MOH Health IT Services
2. Request CHAS API access
3. Get sandbox credentials
4. Follow MOH API documentation
5. Implement verification endpoint
6. Integrate with signup flow

---

## Questions?

For SingPass specifics: See `/api/auth/singpass/login` backend implementation
For CHAS info: Visit www.healthhub.sg/chas
For implementation help: Contact development team

---

**Current Recommendation**: Start with manual CHAS selection (simple), upgrade to API integration later (after MOH approval).
