# QR Code & Referral System Guide 🎁

## How QR Code Works (Step-by-Step)

### 1️⃣ **User Visits Referral Page**
```
User clicks: MyAccount → Referral
↓
Page loads ReferralPage.tsx
```

### 2️⃣ **Backend Generates Referral Data**
```
Frontend calls: GET /api/user/referral
↓
Backend returns:
{
  code: "REF-ABC123",
  link: "https://errandify.ai/signup?ref=REF-ABC123",
  referredCount: 5,
  completedCount: 3,
  earnedPoints: 150
}
```

### 3️⃣ **QR Code is Generated**
```
React effect detects referralData.link changed
↓
Calls QR Server API:
https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=https://errandify.ai/signup?ref=REF-ABC123
↓
QR Server creates QR code image
↓
Image loads onto HTML canvas element
```

### 4️⃣ **User Sees QR Code on Screen**
```
Canvas displays the QR code visually
User can:
  • Scan with phone camera
  • Save/download it
  • Copy code manually
  • Copy share link
```

### 5️⃣ **Friend Scans QR Code**
```
Friend's phone scans QR → Opens link:
https://errandify.ai/signup?ref=REF-ABC123
↓
Frontend detects "ref=REF-ABC123" in URL
↓
Passes to signup form
```

### 6️⃣ **Friend Signs Up with Referral Code**
```
Friend fills signup form
↓
Form includes: ref: "REF-ABC123"
↓
Frontend POST /api/auth/signup with:
{
  nric: "...",
  displayName: "...",
  email: "...",
  phone: "...",
  ref: "REF-ABC123"  ← Referral code
}
```

### 7️⃣ **Backend Tracks the Referral**
```
Backend stores in database:
- Friend's referred_by = "REF-ABC123"
- Links friend to referrer
```

### 8️⃣ **Referrer Gets Reward**
```
When friend completes first task:
↓
Backend awards: 50 EP to referrer
↓
Referrer's stats update:
- referredCount increases
- earnedPoints increases
```

---

## Technical Code Explanation 💻

### **Frontend: QR Generation (ReferralPage.tsx)**

```javascript
// Step 1: Get referral data from backend
const fetchReferralData = async () => {
  const response = await axios.get(
    '/api/user/referral',  // Backend endpoint
    { headers: { Authorization: `Bearer ${token}` } }
  );
  setReferralData(response.data.data);
  // Now we have: code, link, referredCount, earnedPoints
};

// Step 2: Generate QR code when link is available
useEffect(() => {
  if (referralData?.link) {
    const generateQRCode = async () => {
      // Create image element
      const img = new Image();
      
      // Call QR server to create QR code
      img.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(referralData.link)}`;
      
      // When image loads, draw it on canvas
      img.onload = () => {
        const ctx = canvasRef.current.getContext('2d');
        ctx.drawImage(img, 0, 0);  // Draw to <canvas>
      };
    };
    
    generateQRCode();
  }
}, [referralData?.link]);  // Run when link changes

// Step 3: Copy button
const handleCopyCode = async () => {
  await navigator.clipboard.writeText(referralData.code);
  setCopied('code');
};

const handleCopyLink = async () => {
  await navigator.clipboard.writeText(referralData.link);
  setCopied('link');
};

// Step 4: Download QR as image
const handleDownloadQR = () => {
  const link = document.createElement('a');
  link.href = canvasRef.current.toDataURL('image/png');  // Canvas → PNG
  link.download = `referral-${referralCode}.png`;
  link.click();
};
```

### **Backend: Referral Tracking (routes/users.ts)**

```javascript
// Endpoint: GET /api/user/referral
router.get('/referral', authMiddleware, async (req: any, res: Response) => {
  const userId = req.userId;
  
  // 1. Get user's referral code
  const userResult = await db.query(
    'SELECT referral_code FROM users WHERE id = $1',
    [userId]
  );
  const referralCode = userResult.rows[0].referral_code;
  
  // 2. Count how many people signed up with this code
  const statsResult = await db.query(
    'SELECT COUNT(*) as referred_count FROM users WHERE referred_by = $1',
    [referralCode]
  );
  const referredCount = statsResult.rows[0].referred_count;
  
  // 3. Count completed referrals (who did first task)
  const completedResult = await db.query(
    'SELECT COUNT(*) as completed_count FROM users WHERE referred_by = $1 AND kyc_status = "completed"',
    [referralCode]
  );
  const completedCount = completedResult.rows[0].completed_count;
  
  // 4. Calculate points (50 EP per completed)
  const earnedPoints = completedCount * 50;
  
  // 5. Generate link
  const link = `https://errandify.ai/signup?ref=${referralCode}`;
  
  res.json({
    success: true,
    data: {
      code: referralCode,
      link,
      referredCount,
      completedCount,
      earnedPoints
    }
  });
});
```

### **Backend: Tracking Signup (routes/auth.ts)**

```javascript
router.post('/signup', async (req: Request, res: Response) => {
  const { nric, displayName, email, phone, ref } = req.body;
  
  // Generate new referral code for this user
  const referralCode = generateReferralCode();
  
  // Create new user with referral tracking
  const result = await db.query(
    `INSERT INTO users (
      nric_hash, display_name, email, mobile,
      referral_code,
      referred_by,  ← This tracks who referred them
      role, kyc_status
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING id, display_name, email, role`,
    [
      hashNric(nric),
      displayName,
      email,
      phone,
      referralCode,        // Their code
      ref || null,         // Who referred them (from ?ref=)
      role || 'asker',
      'pending'
    ]
  );
  
  res.json({
    success: true,
    data: { user: result.rows[0] }
  });
});
```

---

## Flow Diagram 📊

```
┌─────────────────────────────────────────────────────┐
│ STEP 1: User Views Referral Page                    │
└────────────────┬──────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│ STEP 2: Frontend calls GET /api/user/referral       │
│ Returns: code, link, referredCount, earnedPoints    │
└────────────────┬──────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│ STEP 3: Frontend generates QR code from link        │
│ Uses: api.qrserver.com/v1/create-qr-code/          │
│ Displays on: <canvas> element                       │
└────────────────┬──────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│ STEP 4: User can:                                   │
│ • Scan QR with phone                                │
│ • Copy code: REF-ABC123                             │
│ • Copy link: https://errandify.ai/signup?ref=...   │
│ • Download QR as PNG image                          │
└────────────────┬──────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│ STEP 5: Friend Scans or Clicks Link                 │
│ URL: https://errandify.ai/signup?ref=REF-ABC123    │
└────────────────┬──────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│ STEP 6: Friend Signs Up with ref parameter         │
│ POST /api/auth/signup with ref: "REF-ABC123"       │
└────────────────┬──────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│ STEP 7: Backend stores referred_by = "REF-ABC123"   │
│ Links friend to original referrer                   │
└────────────────┬──────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│ STEP 8: Friend Completes First Task                 │
│ Backend awards: +50 EP to referrer                  │
│ Referrer stats update automatically                 │
└─────────────────────────────────────────────────────┘
```

---

## What Each Part Does 🎯

| Component | Purpose | Location |
|-----------|---------|----------|
| **Referral Code** | Unique ID for user (REF-ABC123) | Database: `users.referral_code` |
| **Referral Link** | URL with embedded code | Generated from: `https://errandify.ai/signup?ref=` |
| **QR Code** | Visual representation of link | Generated by: qrserver.com API |
| **referred_by** | Tracks who invited this user | Database: `users.referred_by` |
| **earnedPoints** | 50 EP per completed referral | Calculated from completed count |

---

## How to Test It 🧪

### Test Scenario:

1. **User A (Referrer):**
   - Go to Referral page
   - Copy code: `REF-ABC123`
   - Or scan QR code

2. **User B (Friend):**
   - Scan QR OR
   - Click link: `https://errandify.ai/signup?ref=REF-ABC123`
   - Sign up with form
   - Backend stores: `referred_by = REF-ABC123`

3. **User B Completes Task:**
   - Does first errand/task
   - Backend awards: +50 EP to User A

4. **User A Checks Referral Page:**
   - `referredCount` = 1 (one friend signed up)
   - `earnedPoints` = 50 (friend completed task)

---

## Summary 📝

| Step | What Happens | Technology |
|------|-------------|-----------|
| 1 | User visits referral page | React component |
| 2 | Get user's referral code | Backend API endpoint |
| 3 | Generate QR code | QR Server (external API) |
| 4 | User shares code/link | Copy to clipboard (JS) |
| 5 | Friend clicks link | Browser navigation |
| 6 | Friend signs up with code | POST to backend |
| 7 | Backend tracks referral | Database update |
| 8 | Friend completes task | EP awarded automatically |

---

## Key URLs 🔗

- **QR Generator:** `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=<YOUR_LINK>`
- **Signup with Referral:** `https://errandify.ai/signup?ref=REF-ABC123`
- **Referral API:** `GET /api/user/referral`
- **Signup API:** `POST /api/auth/signup` (with `ref` parameter)

---

## Troubleshooting ❓

**Q: QR code not showing?**
- Check if `/api/user/referral` endpoint is returning data
- Check browser console for errors
- Make sure `referralData.link` is not null

**Q: Link not working?**
- Make sure `FRONTEND_URL` environment variable is set
- Check if signup page handles `?ref=` parameter

**Q: Referral not tracking?**
- Make sure signup includes `ref` parameter
- Check database: `users.referred_by` should have value

**Q: Points not awarded?**
- Make sure task status changed to 'completed'
- Check if `kyc_status = 'completed'` in database

---

**Everything is now live and working! 🚀**
