# 🏥 CHAS Integration Guide for Errandify

## What is CHAS?

**CHAS** = Community Health Assist Scheme
- **Government**: Ministry of Health (MOH), Singapore
- **Purpose**: Healthcare subsidies for low-income Singaporeans
- **Card Color**: Indicates income level

---

## CHAS Card Colors

| Color | Income Level | Monthly Household Income |
|-------|-------------|--------------------------|
| 🟦 **Blue** | Low-income | ≤ $1,900 |
| 🟩 **Green** | Lower-middle income | ≤ $3,900 |
| ⚪ **None** | Above CHAS threshold | > $3,900 |

---

## Current Status: CHAS is NOT Auto-Filled

### Why Not in SingPass?

❌ **CHAS is a separate system managed by MOH**
- SingPass only provides: NRIC, Name, Email, Phone, DOB, Address, Nationality
- CHAS data is in MOH (Ministry of Health) database, NOT SingPass
- Requires separate API access from MOH
- Requires user consent to share CHAS status
- Not automatically available through SingPass OAuth2

### Why It Matters for Errandify

CHAS status can help Errandify:
- ✅ Identify vulnerable users needing support
- ✅ Offer special pricing/discounts for low-income users
- ✅ Provide safety nets for eligible users
- ✅ Track social impact (how many low-income users helped)

---

## Implementation Options

### Option 1: Manual User Input (Current - Simplest)

**User manually selects CHAS status in profile:**

```
CHAS Card Status
○ No CHAS Card
○ 🟦 Blue Card (≤ $1,900/month)
○ 🟩 Green Card (≤ $3,900/month)

[Optional: Upload CHAS card image for verification]
```

**Pros:**
- Simple to implement (no API needed)
- User controls what they share
- Can be done in profile settings

**Cons:**
- Requires user action
- Not automatically verified
- Risk of false claims (but can be verified later)

### Option 2: CHAS API Integration (Future - Most Reliable)

**Automatic CHAS verification via MOH API:**

```
SingPass Authentication
    ↓
Get NRIC from SingPass
    ↓
Query MOH CHAS API with NRIC
    ↓
Return CHAS status (Blue/Green/None)
    ↓
Store verified CHAS status
```

**Pros:**
- Automatic, verified data
- No user fraud possible
- Government-backed verification
- Can be used for social safety nets

**Cons:**
- Requires MOH API access
- Additional compliance requirements
- Takes time to set up (weeks)
- Must be certified by MOH

---

## Recommended Implementation Path

### Phase 1: Manual CHAS Selection (Now)
1. Add CHAS field to user profile
2. Let users optionally declare CHAS status
3. Can optionally ask for card verification image
4. Use for eligibility checks (e.g., special pricing)

### Phase 2: MOH API Integration (Later - 2-4 weeks)
1. Contact MOH Health IT Services
2. Apply for CHAS API access
3. Get sandbox credentials for testing
4. Implement automated verification
5. Launch verified CHAS checks

---

## Database Schema

### Current Users Table
```sql
-- Already exists, from SingPass
id
user_id
nric_hash
display_name
email
mobile
-- ... other fields
```

### Add CHAS Support
```sql
ALTER TABLE users ADD COLUMN (
  chas_card_color VARCHAR(10),        -- 'blue', 'green', 'none'
  chas_verified BOOLEAN DEFAULT FALSE,
  chas_verified_at TIMESTAMP,
  chas_verification_method VARCHAR(50) -- 'manual', 'api', 'image'
);
```

---

## API Endpoints (Optional)

### Get User CHAS Status
```
GET /api/users/profile
Response:
{
  id: 123,
  display_name: "John Lee",
  singpass_verified: true,
  
  // NEW CHAS fields
  chas_card_color: "blue",    // 'blue', 'green', or 'none'
  chas_verified: true,
  chas_verified_at: "2026-06-25T00:00:00Z",
  chas_verification_method: "manual" // or "api", "image"
}
```

### Update CHAS Status (User Self-Declaration)
```
PUT /api/users/profile/chas
Body:
{
  chas_card_color: "green"
}

Response:
{
  success: true,
  message: "CHAS status updated"
}
```

### Verify CHAS via MOH API (Admin Only - Future)
```
POST /api/admin/verify-chas
Body:
{
  user_id: 123,
  nric_hash: "hash_here"
}

Response:
{
  user_id: 123,
  chas_card_color: "blue",
  verified: true,
  verified_at: "2026-06-25T00:00:00Z"
}
```

---

## Use Cases for CHAS in Errandify

### 1. **Special Pricing for CHAS Users**
- CHAS Blue users: 20% discount on all errands
- CHAS Green users: 10% discount on all errands
- Display at checkout: "You qualify for CHAS discount!"

### 2. **Safety Net Feature**
- CHAS Blue users get free/cheap help for:
  - Elderly care
  - Health-related errands
  - Accessibility needs

### 3. **Visible Badge in Profile**
- Show "CHAS Verified" badge
- Builds trust with doers
- Shows user is receiving support

### 4. **Analytics & Impact Reporting**
- Track: "We've helped 500+ CHAS users"
- Report social impact
- Show community benefit

### 5. **Targeted Promotions**
- Send special offers to CHAS users
- "CHAS members: 30% off first 5 jobs"
- Help vulnerable users first

---

## User Privacy & Compliance

### PDPA (Personal Data Protection Act)
✅ **CHAS status is sensitive PII**
- Never show publicly (no badges visible to others)
- Only show to relevant users (system + self)
- Requires explicit user consent
- Store securely with encryption

### Data Handling
- ❌ Don't share with doers
- ❌ Don't publish on public profiles
- ✅ Use only for eligibility checks
- ✅ Allow users to delete CHAS status
- ✅ Provide clear opt-in/opt-out

### MOH Compliance (If Using API)
- ✅ Follow MOH data handling guidelines
- ✅ Only use CHAS for intended purposes
- ✅ Annual audit of usage
- ✅ Incident reporting to MOH if breached
- ✅ Don't share with third parties

---

## Implementation Checklist

### Phase 1: Manual CHAS (Easy - Start Here)
- [ ] Add CHAS columns to database migration
- [ ] Update user profile form with CHAS dropdown
- [ ] Add CHAS display in user profile page
- [ ] Implement CHAS status update API
- [ ] Use CHAS in eligibility checks (e.g., discounts)
- [ ] Test with manual selection
- [ ] Document CHAS privacy policy

### Phase 2: MOH API (Hard - Do Later)
- [ ] Email MOH Health IT Services for API access
- [ ] Get MOH API credentials & documentation
- [ ] Implement MOH API client service
- [ ] Create CHAS verification endpoint
- [ ] Integrate with signup flow (optional)
- [ ] Test with MOH sandbox
- [ ] Deploy to production
- [ ] Update compliance documentation

---

## Contact & Resources

### For CHAS Information
- **Website**: www.healthhub.sg/chas
- **What CHAS covers**: Subsidies at 900+ participating clinics
- **Apply for CHAS**: Online at www.healthhub.sg

### For MOH API Access
- **Email**: [healthit@moh.gov.sg] (or current MOH contact)
- **Subject**: "Request: CHAS API Integration for Errandify"
- **Include**: Company details, use case, data security measures

### For Help
- **Backend**: `/backend/src/routes/chas.ts` (if implemented)
- **Database**: `/database/add_chas_fields.sql` (migration)
- **Docs**: `/SINGPASS_CHAS_GUIDE.md` (this file)

---

## Current Status in Errandify

### ✅ SingPass Integration
- **Status**: ✅ Fully implemented
- **Captures**: NRIC, Name, Email, Phone, DOB, Address, Nationality
- **Auto-fill**: All personal fields
- **Verification**: Government-verified identity

### ⏳ CHAS Support
- **Status**: 🟡 Ready to implement
- **Complexity**: 🟢 Low (manual), 🟠 Medium (API)
- **Timeline**: 
  - Phase 1 (manual): 2-3 hours
  - Phase 2 (API): 2-4 weeks after MOH approval

---

## Next Steps

### Immediate (This Week)
1. Read MOH CHAS guide at www.healthhub.sg/chas
2. Decide: Manual or API approach
3. If manual: add CHAS field to profile form
4. If API: draft email to MOH

### Short-term (This Month)
1. Implement Phase 1 (manual CHAS selection)
2. Test CHAS eligibility checks
3. Set up discounts for CHAS users

### Medium-term (Next Quarter)
1. Apply for MOH CHAS API access
2. Implement Phase 2 (automated verification)
3. Launch verified CHAS checks
4. Monitor social impact

---

## Quick Start: Add Manual CHAS Selection

```typescript
// 1. Update profile form
<div>
  <label>CHAS Card Status (Optional)</label>
  <select value={chasStatus} onChange={(e) => setChasStatus(e.target.value)}>
    <option value="none">No CHAS Card</option>
    <option value="blue">🟦 Blue Card (≤ $1,900/month)</option>
    <option value="green">🟩 Green Card (≤ $3,900/month)</option>
  </select>
</div>

// 2. API call to update
PUT /api/users/profile/chas
{
  chas_card_color: "blue"
}

// 3. Use in eligibility checks
if (user.chas_card_color === 'blue') {
  // Apply 20% discount
}
```

---

**Recommendation**: Start with Phase 1 (manual CHAS selection) now, plan Phase 2 (API) for next quarter after MOH approval.

---

## Summary Table

| Feature | SingPass | CHAS Manual | CHAS API |
|---------|----------|-----------|----------|
| **Auto-filled** | ✅ Yes | ❌ No | ✅ Yes |
| **User setup time** | 2 min | 1 min | 2 min |
| **Implementation time** | 1 week | 2 hours | 2-4 weeks |
| **Government verified** | ✅ Yes | ⚠️ Partial | ✅ Yes |
| **Cost** | Free | Free | Free |
| **Risk of fraud** | ❌ Low | ⚠️ Medium | ❌ Low |
| **Privacy safe** | ✅ Yes | ✅ Yes | ✅ Yes |
| **Ready now?** | ✅ Yes | ✅ Yes | ❌ No (needs MOH) |

