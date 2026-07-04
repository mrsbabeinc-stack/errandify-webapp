# 🎯 Leap East Event Demo Script

**Duration:** 10-15 minutes
**Devices:** Laptop + Mobile (optional)
**Pre-Demo:** Run `./deploy-staging.sh start` and `./deploy-staging.sh seed`

---

## Opening (1 min)

> *"Errandify is an AI-powered gig marketplace for Singapore. Think TaskRabbit but powered by AI to make task posting and matching instant and seamless."*

### Key Points:
- Singapore's growing gig economy
- 86% of features built and ready
- 7 AI features differentiating us from competitors
- Demo uses mock payment (Stripe test mode)

---

## DEMO #1: AI-Powered Task Creation (2 min)

### Show: Hana AI Voice-to-Task

**Demo Script:**
1. Click "Create Errand" on homepage
2. **Show Hana input:** "I need someone to buy groceries at Tampines next Monday 2pm. Budget $40. Need milk, eggs, bread"
3. **Watch AI extract:**
   - Title: "Buy groceries"
   - Category: Auto-selected as "Shopping & Errands"
   - Date/Time: Next Monday, 2pm
   - Budget: $40
   - Location: Tampines (auto-mapped to postal code)
   - Instructions: "Milk, eggs, bread"
   
4. **Click Post** → Errand appears instantly in search

**Talking Points:**
- "Hana AI extracts all details from natural language"
- "No manual form filling required"
- "AI validates and suggests category"
- "Takes < 30 seconds to post an errand"

---

## DEMO #2: Find & Bid Flow (3 min)

### Show: Doer browsing, bidding, and acceptance

**Demo Script:**
1. **Switch to Doer Account** (logged in as doer@demo.com)
2. Click "Search Errands"
3. **Find the errand** you just posted
4. Show errand details:
   - Title, description
   - Full address (shown to confirmed doer)
   - Budget: $40
   - 3 photos (if available)
5. **Click "Submit Offer"** → Price: $38 (negotiate down)
6. **Switch back to Asker**
7. **Notifications appear** → "doer@demo.com offered $38"
8. **Click Accept** → Bid accepted
9. **Activity Timeline** shows: "Offer accepted" 
10. **Real-time chat opens** between asker and doer

**Talking Points:**
- "Smart matching algorithm finds right doers"
- "Full address only shown after bid accepted (privacy)"
- "Real-time chat for communication"
- "Both parties can negotiate"

---

## DEMO #3: Completion & Mutual Rating (2 min)

### Show: Doer completing and submitting photos

**Demo Script:**
1. **Switch to Doer** → "Start Job"
2. Doer goes shopping (simulated)
3. **Click "Mark as Complete"** → Upload receipt photo
4. **Photo validation** → AI checks for contact info
5. **Submit** → Job marked complete
6. **Switch to Asker**
7. **Photo Gallery appears** with:
   - 3-column thumbnail grid
   - Click to zoom into each photo
   - Full receipt visible
8. **Click "Rate Doer"** → Modal appears
9. Rate 5⭐ + comment: "Great job! Bought exactly what I needed"
10. **Doer rates back** → Modal for 5⭐
11. **Both complete** → Show EP awarded:
    - Asker: 50 EP for posting
    - Doer: 100 EP for completing
    - Doer bonus: 50 EP for perfect rating
    - Total doer: 150 EP (≈ $1.50 voucher value)

**Talking Points:**
- "AI photo moderation checks for safety"
- "Asker can zoom and verify photos"
- "Mutual 5-star rating system builds trust"
- "EP gamification incentivizes quality work"

---

## DEMO #4: Gamification & Rewards (2 min)

### Show: EP system and shop redemption

**Demo Script:**
1. **Click MyRewardSpace** (top nav)
2. Show **Overview tab**:
   - EP Balance: 150 EP
   - Tier: Bronze → Silver at 500 EP
   - Progress bar
3. **Click Shop tab**
4. Show **"Recommended For You"**:
   - Starbucks $10 (500 EP)
   - KFC Voucher (450 EP)
   - Cineplex (350 EP)
   - Changi Lounge (1000 EP)
5. **Click Redeem** on Starbucks
6. **Confirmation modal** → 500 EP = $10 off Starbucks
7. **Click Confirm**
8. **Success** → Voucher code generated: "STARBUCKS10"
9. **Balance updated** → Now 0 EP (150 - 150 spent)
10. **Check Reward History** → Shows redemption record

**Talking Points:**
- "EP converts directly to discounts"
- "Personalized voucher recommendations"
- "Tier system: Bronze → Silver → Gold → Platinum"
- "Badges and streaks create loyalty"
- "Real partnerships with Starbucks, KFC, etc."

---

## DEMO #5: Dispute Resolution & AI (2 min)

### Show: AI-powered dispute system

**Demo Script:**
1. **Find a completed errand** from earlier
2. **Click "Raise Dispute"**
3. Show **16 dispute reasons**:
   - Poor quality work
   - Incomplete delivery
   - Rude behavior
   - Safety concerns
   - etc.
4. **Select:** "Poor quality work"
5. **Add evidence:**
   - Photo of receipt (doesn't match order)
   - Comment: "Got wrong items"
6. **Submit** → Show loading
7. **AI Analysis appears**:
   - "Analyzing evidence..."
   - AI reads receipt
   - Compares with original request
8. **AI Verdict generated**:
   - "Partial refund: $10 (50% of $20 difference)"
   - Reasoning: "Receipt shows wrong items. Asker's claim partially valid."
   - Timeline: "Defendant has 24 hours to respond"
9. **Show Compliance Log**:
   - Safety check: ✅
   - Bias check: ✅
   - Fairness: ✅

**Talking Points:**
- "AI analyzes all evidence in seconds"
- "3-tier defense: Auto, Statement, Full investigation"
- "Compliance framework ensures fairness"
- "24-hour response window for defendant"
- "Audit trail for all decisions"

---

## DEMO #6: Admin Dashboard (1 min)

### Show: Admin powers (if time permits)

**Demo Script:**
1. **Login as admin**
2. Show **16 admin pages**:
   - User Management → View/ban users
   - Category Management → Create new categories
   - Errand Moderation → Flag inappropriate tasks
   - Dispute Management → Review disputes
   - Voucher Management → Manage rewards
   - Analytics → Activity, revenue, trends
3. Quick show of: **Dispute status** → "Pending" disputes
4. Show **Moderation logs** → Content flagged by AI

**Talking Points:**
- "Comprehensive moderation and control"
- "Real-time analytics and reporting"
- "Safety-first platform governance"

---

## Closing (1 min)

> *"Errandify combines marketplace efficiency with AI intelligence. We're not just matching tasks and people—we're using AI to prevent fraud, ensure safety, and create a trusted community."*

### Key Takeaways:
✅ **AI-First:** Hana extracts tasks, AI moderates content, AI resolves disputes
✅ **Trust:** Mutual ratings, photo verification, dispute system
✅ **Engagement:** EP gamification, tier progression, rewards
✅ **Safety:** Content moderation, AI analysis, compliance framework
✅ **Speed:** Post → Bid → Execute → Rate in minutes, not days

### Call to Action:
- "We're looking for early beta testers in Singapore"
- "Interested partners for voucher integrations"
- "Seed funding to scale (target Q3 2026)"

---

## 📊 Quick Stats to Share

- **86% MVP Complete**
- **52 Features Implemented**
- **7 AI Features** vs 0-1 by competitors
- **4-Layer Moderation** (Keywords, Patterns, AI Vision, Compliance)
- **83 Singapore Postal Sectors** mapped
- **16 Dispute Reasons** with AI analysis

---

## 🎬 Demo Video Backup (If Live Demo Fails)

Pre-record these flows:
1. Post errand with Hana
2. Bid and completion
3. Rating and EP reward
4. Redemption in shop
5. Dispute resolution

Upload to: Demo folder (USB backup)

---

## ⚡ Technical Troubleshooting

**If app doesn't load:**
- Check: `docker-compose -f docker-compose.staging.yml ps`
- Restart: `./deploy-staging.sh stop && ./deploy-staging.sh start`
- Clear browser cache: Cmd+Shift+Delete

**If photos don't upload:**
- Check database: `docker logs errandify-backend-staging`
- Verify permissions: OSS bucket policy

**If chat doesn't work:**
- Verify Socket.io connection: Browser DevTools → Network tab
- Check backend logs for socket errors

**Backup Plan:**
- Have screenshots ready
- Video recording of full flow
- Have test accounts pre-loaded

---

## 📱 Mobile Demo Tips

- Use iPhone + laptop screen mirroring
- Or: Run on mobile: http://YOUR-IP:5173
- Test camera/photo upload on actual device
- Show responsive design

---

## 🎯 Audience-Specific Talking Points

### For Investors:
- TAM: $2B regional gig economy
- Moat: AI-powered (7 features)
- Unit economics: $2 commission per task
- Target: 1M users in 2 years

### For Potential Users:
- "Earn money in spare time"
- "Get tasks done instantly"
- "Build trust with ratings"
- "Gamified rewards system"

### For Potential Partners:
- "White-label available"
- "API for integration"
- "Revenue share on vouchers"
- "Admin dashboard controls"

---

**Good luck at Leap East! 🚀**

