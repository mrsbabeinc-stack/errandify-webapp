# Deploy & Test with Dummy Stripe & SingPass

**Status**: ✅ **READY TO DEPLOY TODAY WITH TEST CREDENTIALS**

---

## Why Deploy with Dummy Credentials?

✅ **Advantages**:
- Deploy TODAY without waiting for real credentials
- Full end-to-end testing immediately
- No production risks (all test data)
- Can switch to real credentials later
- Verify all features work before go-live
- Test complete user flows

---

## Phase 1: Deploy with Test Credentials (TODAY)

### Step 1: Database Setup (5 minutes)

```bash
# 1.1 Create database
createdb errandify

# 1.2 Apply core schema
psql -U postgres -d errandify < database/schema.sql

# 1.3 Apply CHAS migration
psql -U postgres -d errandify < database/add_chas_fields.sql

# 1.4 Verify
psql -U postgres -d errandify -c "\dt"
# Should show 10+ tables
```

---

### Step 2: Configure Backend (.env)

Create `backend/.env`:

```bash
# Server
PORT=3000
NODE_ENV=development  # Use 'production' after testing

# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/errandify

# JWT (generate random string)
JWT_SECRET=your-super-secret-jwt-key-12345-change-this

# ✅ STRIPE TEST CREDENTIALS (from stripe.com/docs/testing)
STRIPE_SECRET_KEY=sk_test_4eC39HqLyjWDarHw1z4V8c8W  # Test secret key
STRIPE_PUBLISHABLE_KEY=pk_test_4eC39HqLyjWDarH4V8c8W  # Test public key

# ✅ QWEN API (actual - use real key for testing)
QWEN_API_KEY=sk-XXXXXXXXXXXX  # Your real Qwen key for testing

# ✅ SINGPASS (test mode - optional)
USE_SINGPASS=false  # Set to true to enable, false for testing
SINGPASS_CLIENT_ID=test_client_id
SINGPASS_CLIENT_SECRET=test_client_secret

# ✅ AZURE SPEECH (optional fallback)
AZURE_SPEECH_KEY=optional_azure_key
```

---

### Step 3: Configure Frontend (.env.local)

Create `frontend/.env.local`:

```bash
VITE_API_URL=http://localhost:3000
```

---

### Step 4: Start Backend

```bash
cd backend

# Install dependencies
npm install

# Build TypeScript
npm run build

# Start development server
npm run dev

# Expected output:
# Errandify API running on port 3000
# Environment: development
# SingPass enabled: false
```

---

### Step 5: Start Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start dev server
npm run dev

# Expected output:
# VITE v4.x.x ready in xxx ms
# ➜  Local:   http://localhost:5173/
```

---

## Phase 2: Test Complete User Flows

### Test 1: User Registration & Login

**Step 1: Register**
1. Open http://localhost:5173
2. Click "Login"
3. Click "Create Account"
4. Enter:
   - Email: `test@example.com`
   - Password: `Test@123456`
   - Role: "Asker" or "Doer"
5. Click "Sign Up"

**Expected**: Account created, redirected to home

**Step 2: Login**
1. Enter email & password
2. Click "Login"

**Expected**: Logged in, see home page

---

### Test 2: Stripe Payment Flow (TEST MODE)

**Step 1: Post Errand as Asker**
1. Click "+ New Errand"
2. Fill form:
   - Title: "Test Errand"
   - Description: "Test description"
   - Category: "Cleaning-laundry"
   - Budget: "50"
   - Deadline: Tomorrow
3. Click "Post Errand"

**Expected**: Errand created, see confirmation

**Step 2: Submit Bid as Doer**
1. Logout & login as different user (or create new account)
2. Select role "Doer"
3. Click "Browse Errands"
4. Find "Test Errand"
5. Click "Accept This Errand"
6. Enter bid amount: "45"
7. Add note: "I can help"
8. Click "Submit Bid"

**Expected**: Bid submitted, notification sent to asker

**Step 3: Accept Bid & Process Payment**
1. Logout & login as asker
2. Go to "My Errands"
3. Click on errand
4. See bid from doer
5. Click "Accept Bid"

**Expected**: Stripe test payment appears
- **Test Card Numbers** (use with Stripe test mode):
  - ✅ **Success**: `4242 4242 4242 4242`
  - ✅ **Requires Auth**: `4000 0025 0000 3155`
  - ❌ **Decline**: `4000 0000 0000 0002`
  - ❌ **Insufficient Funds**: `4000 0200 0000 0000`

6. Card details:
   - Expiry: Any future date (e.g., 12/25)
   - CVC: Any 3 digits (e.g., 123)
   - ZIP: Any 5 digits (e.g., 12345)

7. Click "Complete Payment"

**Expected**: 
- Payment processed
- Alert: "✓ Bid accepted! Payment confirmed and amount held in escrow."
- Payment status shows: "Held in Escrow"

**Stripe Test Dashboard**:
- Go to https://dashboard.stripe.com/test/payments
- You should see test payment (for $45)
- Status: "Succeeded"

---

### Test 3: Hana AI Assistant (All 3 Languages)

**Test 3a: English**
1. Click Hana floating button (bottom-right)
2. Select "🇬🇧 English"
3. Type: "How do I post an errand?"
4. Press Enter/Send

**Expected**:
- Hana responds with helpful message (in English)
- Response read aloud in natural female voice (Joanna)
- No robotic sound
- Fast response (< 3 seconds)

**Test 3b: 中文 (帮帮乐)**
1. Click Hana button again
2. Select "🇨🇳 中文 (帮帮乐)"
3. Type: "我怎样发布帮帮?"
4. Press Enter

**Expected**:
- Hana responds in Mandarin Chinese
- Voice is female (Siqi), warm, natural
- NOT male sounding
- Mentions "帮帮乐" (app name)

**Test 3c: 粵語 (廣東話)**
1. Click Hana button
2. Select "🇭🇰 粵語 (廣東話)"
3. Type: "我點樣發布幫幫?"
4. Press Enter

**Expected**:
- Hana responds in Cantonese (NOT Mandarin)
- Voice is female, warm, natural
- Proper Cantonese grammar
- Mentions "帮帮乐" or uses Cantonese phrases

---

### Test 4: CHAS Card Selection

**Step 1: View Profile**
1. Click Profile icon
2. Click "View Profile" or "MyProfile"
3. Scroll down to find "Personal Information" section

**Step 2: Select CHAS Card**
1. Look for "CHAS Card Status" field
2. Click dropdown / selection buttons
3. Options should show:
   - 🟦 Blue Card
   - 🟩 Green Card
   - ⚪ No Card

**Step 3: Select and Save**
1. Click "Blue Card"
2. Click "Save" or auto-saves

**Expected**:
- Card color saved in profile
- Profile shows: "CHAS Card: Blue"
- Backend shows eligibility: 25% discount
- Audit log records change

**Test Different Cards**:
- Select "Green Card" → Should show 15% discount
- Select "No Card" → Should show "Not eligible"

---

### Test 5: Real-Time Messaging

**Step 1: Send Message**
1. After accepting bid, click "Message" button
2. Type: "When can you start?"
3. Press Send

**Expected**: Message sent immediately

**Step 2: Receive Reply**
1. Logout & login as doer
2. Should see notification: "New message from [Asker]"
3. Open message
4. Reply: "I can start tomorrow"
5. Press Send

**Expected**: 
- Message appears in real-time
- Asker sees notification
- Chat history shows both messages

---

### Test 6: Submit Review

**Step 1: Complete Job**
1. As doer, mark job "Completed"
2. Confirmation dialog appears
3. Click "Confirm"

**Expected**: Job status changes to "Completed"

**Step 2: Submit Review**
1. As asker, navigate to `/review/:jobId`
   - Or look for "Submit Review" button

2. Select rating: Click stars (1-5)
   - Try 5 stars first for testing

3. Add comment: "Great job! Very professional."

4. Click "Submit Review"

**Expected**:
- Review saved
- Doer profile shows: ⭐ 5.0 rating
- Review count increases
- Redirect to home page

---

### Test 7: Database Verification

**Check CHAS in Database**:
```bash
psql -U postgres -d errandify

-- Check if CHAS data saved
SELECT id, display_name, chas_card_color, chas_verified, chas_verified_at 
FROM users 
WHERE chas_card_color != 'none';

-- Check audit log
SELECT * FROM chas_verification_audit LIMIT 5;

-- Expected output:
-- User with chas_card_color: 'blue', chas_verified: true
-- Audit record showing when it was verified
```

---

## Test Results Checklist

### ✅ Core Functionality
- [ ] User registration works
- [ ] User login works
- [ ] Logout works
- [ ] Password reset works (if implemented)

### ✅ Errand Management
- [ ] Can post errand
- [ ] AI suggests category automatically
- [ ] AI suggests description
- [ ] Errand appears in browse page
- [ ] Can edit errand
- [ ] Can delete errand

### ✅ Bidding & Payment
- [ ] Can submit bid
- [ ] Bidder gets notification
- [ ] Can accept bid
- [ ] Stripe payment dialog appears
- [ ] Can enter test card (4242 4242 4242 4242)
- [ ] Payment succeeds
- [ ] Amount shown in escrow
- [ ] Stripe dashboard shows payment

### ✅ Messaging
- [ ] Can send message
- [ ] Recipient gets notification
- [ ] Can reply to message
- [ ] Chat history shows all messages
- [ ] Real-time updates work

### ✅ Hana AI
- [ ] English button works
- [ ] 中文 button works
- [ ] 粵語 button works
- [ ] Can type messages
- [ ] Hana responds
- [ ] Responses read aloud
- [ ] Female voice (not male)
- [ ] No robotic sound
- [ ] Fast response (< 3 sec)

### ✅ CHAS Card
- [ ] Profile loads
- [ ] Can select Blue Card
- [ ] Can select Green Card
- [ ] Can select No Card
- [ ] Selection saves
- [ ] Eligibility shows correct discount
- [ ] Database audit log records change

### ✅ Reviews
- [ ] Can navigate to review page
- [ ] Can select rating (1-5 stars)
- [ ] Can add comment
- [ ] Review submits successfully
- [ ] Doer profile shows new rating

---

## Troubleshooting During Testing

### Backend Won't Start
```bash
# Check if port 3000 is in use
lsof -i :3000

# Kill process using port
kill -9 <PID>

# Check environment variables
env | grep -E "DATABASE_URL|STRIPE|QWEN"

# Check database connection
psql postgresql://postgres:password@localhost/errandify -c "SELECT 1"
```

### Frontend Won't Load
```bash
# Check if port 5173 is in use
lsof -i :5173

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### Stripe Payment Fails
```bash
# Check backend logs for Stripe errors
# Look for: "Stripe error" or "Invalid API key"

# Verify test key format:
# Should start with: sk_test_
echo $STRIPE_SECRET_KEY

# Common test card errors:
# 4242... → Use for success
# 4000 0025... → Use for auth required
```

### Hana Not Responding
```bash
# Check QWEN_API_KEY is set
echo $QWEN_API_KEY

# Test Qwen API directly:
curl -X POST https://dashscope-intl.aliyuncs.com/api/v1/services/aigc/text-generation/generation \
  -H "Authorization: Bearer YOUR_KEY" \
  -d '{"model":"qwen-plus","input":{"prompt":"Hello"}}'

# Check backend logs for Qwen errors
```

### Voice Not Working
```bash
# Check browser console (F12) for errors
# Look for: "Qwen TTS error" or "audio play failed"

# Test with different browser
# Chrome works best, Firefox also good
```

---

## Transition to Production

### When Ready to Go Live:

**Step 1: Get Real Stripe Credentials**
1. Go to https://stripe.com
2. Sign up for account
3. Get live keys (not test keys)
4. Keys start with: `sk_live_` and `pk_live_`

**Step 2: Get Real SingPass Credentials**
1. Contact IDA Singapore
2. Apply for SingPass integration
3. Get client ID & secret
4. Set `USE_SINGPASS=true` in .env

**Step 3: Get Real Qwen API Key**
1. Already have: `sk-ws-H.IEXLEL...`
2. No need to change - same key works for production

**Step 4: Update Environment**
```bash
# backend/.env
NODE_ENV=production
STRIPE_SECRET_KEY=sk_live_XXXXXXXXXXXX  # Real key
USE_SINGPASS=true  # Enable SingPass
```

**Step 5: Switch to Production Database**
```bash
# Use managed database service (AWS RDS, Google Cloud SQL, etc.)
DATABASE_URL=postgresql://user:password@prod-db.example.com:5432/errandify
```

**Step 6: Deploy**
```bash
# Deploy backend (PM2, Docker, AWS Lambda, etc.)
# Deploy frontend (Vercel, AWS S3+CloudFront, etc.)
# Enable HTTPS/SSL
# Setup monitoring & backups
```

---

## Test Timeline

| Phase | Duration | Status |
|-------|----------|--------|
| Database setup | 5 min | ✅ Ready |
| Backend start | 2 min | ✅ Ready |
| Frontend start | 2 min | ✅ Ready |
| User registration | 2 min | ✅ Ready |
| Errand + bidding | 10 min | ✅ Ready |
| Stripe payment | 5 min | ✅ Ready |
| Hana AI (3 lang) | 5 min | ✅ Ready |
| CHAS selection | 3 min | ✅ Ready |
| Messaging | 5 min | ✅ Ready |
| Reviews | 3 min | ✅ Ready |
| **Total** | **~42 min** | ✅ Ready |

---

## Success Criteria

✅ **Deployment & Testing PASSES when:**

1. Backend starts without errors
2. Frontend loads at http://localhost:5173
3. Can register & login users
4. Can post errands with AI suggestions
5. Can submit bids (no payment required for test)
6. Can accept bids with Stripe test payment
7. Stripe shows test transaction in dashboard
8. Hana AI responds in all 3 languages
9. Voice is female and natural (not robotic)
10. CHAS card selection saves to database
11. Can send/receive messages in real-time
12. Can submit reviews with star ratings
13. No errors in browser console
14. No errors in backend logs
15. Database audit trail records all changes

---

## Deploy Commands (Copy-Paste Ready)

```bash
# Terminal 1 - Database
createdb errandify
psql -U postgres -d errandify < database/schema.sql
psql -U postgres -d errandify < database/add_chas_fields.sql

# Terminal 2 - Backend
cd backend
npm install
npm run build
npm run dev
# Should show: Errandify API running on port 3000

# Terminal 3 - Frontend
cd frontend
npm install
npm run dev
# Should show: Local: http://localhost:5173/

# Then open browser:
# http://localhost:5173
```

---

## Ready to Deploy!

✅ **Everything is set up for testing with dummy Stripe & SingPass**

You can deploy and test the complete platform TODAY without any production credentials. Once testing is complete and you're happy with everything, you can upgrade to real credentials anytime.

**Let's go! 🚀**
