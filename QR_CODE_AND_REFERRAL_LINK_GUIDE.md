# QR Code & Referral Link Tracking System

## Overview

Generate unique, trackable QR codes + referral links that:
- ✅ Automatically tie to each user
- ✅ Track when someone scans/clicks
- ✅ Verify the referrer before awarding points
- ✅ Auto-generate on signup
- ✅ Allow customization later (EP points per action)

---

## Architecture

### 1. Referral Code (Already Implemented)

**Format**: `REF-XXXXXX` (6 random alphanumeric chars)

**Where generated**: On user signup in `/api/auth/signup`

**Database**: Stored in `users.referral_code`

```sql
-- Example
SELECT referral_code FROM users WHERE id = 123;
-- Output: REF-A1B2C3
```

---

### 2. Referral Link (Auto-Generated)

**Format**: `https://errandify.ai/join?ref=REF-A1B2C3`

**Auto-generated on**: User signup (no manual creation needed)

**Usage**: Share via WhatsApp, SMS, email, social media

**What happens when clicked**:
1. Frontend captures `?ref=REF-A1B2C3` from URL
2. Shows signup page with referrer pre-filled
3. New user completes signup
4. On signup completion, `POST /api/referrals/track-join` called
5. Backend verifies code exists and awards referrer points

---

### 3. QR Code (Generated from Link)

**What it encodes**: The full referral link

**How generated**: From the referral link string

**Tools**:
- **Frontend**: `qrcode.react` npm package (recommended)
- **Backend API**: Free QR service (qrserver.com)
- **Download**: User can download as PNG

---

## Implementation Steps

### Step 1: Ensure Referral Code on Signup ✅ (Already Done)

In `backend/src/routes/auth.ts` signup:

```typescript
// Generate referral code on signup (ALREADY IN CODE)
const referralCode = generateReferralCode(); // REF-XXXXXX

// Save to database
INSERT INTO users (referral_code, ...) VALUES (referralCode, ...)
```

**Verify**: Check that `users.referral_code` is populated for all users.

---

### Step 2: Auto-Generate Referral Link

**Frontend utility** (`frontend/src/utils/referralLink.ts`):

```typescript
export function generateReferralLink(referralCode: string): string {
  const baseUrl = window.location.origin; // or 'https://errandify.ai'
  return `${baseUrl}/join?ref=${encodeURIComponent(referralCode)}`;
}

// Usage:
const link = generateReferralLink('REF-A1B2C3');
// Output: https://errandify.ai/join?ref=REF-A1B2C3
```

**Backend utility** (`backend/src/utils/referralLink.ts`):

```typescript
export function generateReferralLink(referralCode: string): string {
  return `https://errandify.ai/join?ref=${encodeURIComponent(referralCode)}`;
}
```

**Where used**:
- ReferralPage component (already uses this)
- Email invitations
- SMS invitations
- Social media share cards

---

### Step 3: Generate QR Code

**Option A: Frontend QR Generation** (Recommended)

Install: `npm install qrcode.react`

```typescript
import QRCode from 'qrcode.react';

// In ReferralPage.tsx or component
<QRCode
  value={referralLink}  // e.g., "https://errandify.ai/join?ref=REF-A1B2C3"
  size={200}
  level="H"  // Error correction level
  includeMargin={true}
/>

// Download function
const downloadQR = () => {
  const canvas = document.querySelector('canvas');
  const link = document.createElement('a');
  link.href = canvas.toDataURL('image/png');
  link.download = `errandify-referral-${referralCode}.png`;
  link.click();
};
```

**Option B: Backend QR Generation** (Current Implementation)

Use free QR API:
```typescript
const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(referralLink)}`;

// Returns PNG image
<img src={qrUrl} alt="Referral QR Code" />
```

**Option C: Print QR in Email**

Generate QR on backend, embed in email template:
```typescript
const qrImage = await qrcode.toDataURL(referralLink);
// Use qrImage as base64 in <img> tag in email
```

---

## Tracking Flow (How It Works)

### When User Shares QR/Link:

```
User A (Referrer)
    ↓
Generates QR Code from link: https://errandify.ai/join?ref=REF-A1B2C3
    ↓
Shares via WhatsApp/SMS/Email/Social
    ↓
User B (New User) scans QR or clicks link
    ↓
Frontend captures ?ref=REF-A1B2C3
    ↓
Completes signup
    ↓
POST /api/referrals/track-join with referrer_id and referral_code
    ↓
Backend verifies code matches referrer
    ↓
Awards 50 EP to User A (configurable later)
```

---

## Database Records

### After User A generates QR and User B signs up via that QR:

**users table**:
```
ID | name    | referral_code | errandify_points
1  | User A  | REF-A1B2C3    | 150  (50 + 100 from other referrals)
2  | User B  | REF-D4E5F6    | 0
```

**referral_tracking table**:
```
id | referrer_id | referred_user_id | referral_code | status  | joined_at
1  | 1           | 2                | REF-A1B2C3    | joined  | 2026-06-23
```

**referral_rewards table**:
```
id | referrer_id | reward_type | points_amount | awarded_at
1  | 1           | join        | 50            | 2026-06-23
```

---

## Configurable EP Points (You Can Change Anytime)

Currently set in `referralService.ts`:

```typescript
// Easy to change:
const joinBonus = 50;           // Award when user joins
const firstJobBonus = 150;      // Award when first job completed
```

**Change anytime**:
1. Edit the numbers in `referralService.ts`
2. Restart backend
3. New referrals will use the new amounts
4. Old referrals unaffected (already awarded)

**Future: Make Dynamic**:
```sql
-- Admin config table (optional later)
CREATE TABLE referral_config (
  id INT PRIMARY KEY,
  join_bonus INT DEFAULT 50,
  first_job_bonus INT DEFAULT 150,
  updated_at TIMESTAMP
);

-- Query it in referralService
const config = await db.query('SELECT join_bonus FROM referral_config');
```

---

## Frontend Changes Needed

### ReferralPage.tsx - What Already Works:

✅ Generates QR code from referral link
✅ Shows referral code (e.g., REF-A1B2C3)
✅ Shows referral link (e.g., https://errandify.ai/join?ref=REF-A1B2C3)
✅ Copy buttons for both
✅ Download QR as PNG

### New Features to Add (Optional):

1. **Share buttons** (WhatsApp, SMS, Email, Twitter):
```typescript
const shareWhatsApp = () => {
  const text = `Join Errandify! ${referralLink}`;
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`);
};
```

2. **Email invite template**:
```typescript
const sendEmail = async () => {
  await fetch('/api/email/send-referral', {
    method: 'POST',
    body: JSON.stringify({
      recipient_email: inviteEmail,
      referral_link: referralLink,
      referrer_name: userName,
    }),
  });
};
```

3. **Real-time stats update**:
```typescript
// After someone joins via your link, show:
// - Referred count: 5
// - Earned points: 250 (5 × 50)
// - Pending first jobs: 2
```

---

## Signup Flow - Auto-Tracking

When new user signs up via referral link:

### Frontend (`/join?ref=REF-A1B2C3`):

```typescript
useEffect(() => {
  const params = new URLSearchParams(location.search);
  const referralCode = params.get('ref');
  
  if (referralCode) {
    // Store for use after signup
    sessionStorage.setItem('referral_code', referralCode);
    // Show "You were invited by User A" message (optional)
  }
}, []);

// After signup form submitted:
const handleSignupSuccess = async () => {
  const referralCode = sessionStorage.getItem('referral_code');
  
  if (referralCode) {
    // Track the referral join
    await fetch('/api/referrals/track-join', {
      method: 'POST',
      body: JSON.stringify({
        referral_code: referralCode,
      }),
      headers: { Authorization: `Bearer ${token}` },
    });
  }
  
  // Continue with signup redirect
  navigate('/home');
};
```

---

## Testing Checklist

- [ ] User A generates QR code on ReferralPage
- [ ] QR code encodes correct referral link
- [ ] User can download QR as PNG
- [ ] User can copy referral code
- [ ] User can copy referral link
- [ ] User B scans QR code → redirected to `/join?ref=REF-A1B2C3`
- [ ] User B completes signup via referral link
- [ ] User A receives 50 EP for the join
- [ ] ReferralPage shows updated stats (referred count +1, earned points +50)
- [ ] User B completes first job
- [ ] User A receives 150 EP for first job bonus
- [ ] ReferralPage shows earned points +150

---

## API Endpoints (Ready to Use)

```bash
# Get your referral code & stats
GET /api/referrals/me
Response: { referral_code, referral_link, stats }

# Get your referral reward history
GET /api/referrals/me/rewards
Response: { rewards: [...] }

# Track when someone joins (called from frontend after signup)
POST /api/referrals/track-join
Body: { referral_code }
Response: { success, points_awarded }

# Track when referred user completes first job
POST /api/referrals/track-first-job
Body: { referrer_id }
Response: { success, points_awarded }

# Get any user's public referral stats
GET /api/referrals/stats/:userId
Response: { referral_code, referral_link, stats }
```

---

## Summary

✅ **What's done**:
- Referral codes auto-generated on signup
- QR code generation working
- API endpoints built
- Database schema ready

⏳ **What's simple to do next**:
- Wire up frontend signup to call `POST /api/referrals/track-join`
- Add email referral invites (optional)
- Add WhatsApp/SMS share buttons (optional)

📊 **To change EP points anytime**:
- Edit numbers in `referralService.ts`
- Restart backend
- Done!

---

## File Locations

- Referral Service: `backend/src/services/referralService.ts`
- Referral Routes: `backend/src/routes/referrals.ts`
- Database Schema: `backend/src/db/migrations/create_referral_tables.sql`
- ReferralPage UI: `frontend/src/pages/ReferralPage.tsx`
- QR Package: Install `qrcode.react` for frontend QR

