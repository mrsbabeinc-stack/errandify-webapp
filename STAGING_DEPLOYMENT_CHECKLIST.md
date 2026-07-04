# ✅ Staging Deployment Checklist - Leap East Event

## 🎯 Before You Leave for Hong Kong

### 1. Local Testing (30 min)
- [ ] Clone latest code: `git pull origin admin-system-v1`
- [ ] Install Docker & Docker Compose
- [ ] Test local deployment: `./deploy-staging.sh start`
- [ ] Verify frontend loads: http://localhost:5173
- [ ] Verify backend responds: http://localhost:3000/health
- [ ] Seed demo data: `./deploy-staging.sh seed`
- [ ] Create test accounts:
  - [ ] asker@demo.com / password123
  - [ ] doer@demo.com / password123
- [ ] Walk through all 6 demo flows
- [ ] Take screenshots of each flow
- [ ] Record backup video of full flow

### 2. Deploy to Staging Server (15 min)

Choose one:

**Option A: Local Machine (No Internet Required)**
- [ ] Download latest code
- [ ] Run: `./deploy-staging.sh start`
- [ ] Demo on http://localhost:5173
- [ ] Backup: USB drive with full code

**Option B: Heroku (Cloud - Recommended)**
```bash
heroku create errandify-staging
heroku config:set NODE_ENV=staging
heroku config:set JWT_SECRET=your-secret
heroku config:set QWEN_API_KEY=your-key
heroku config:set MAPBOX_API_KEY=your-key
git push heroku main
```
- [ ] Note staging URL: https://errandify-staging.herokuapp.com
- [ ] Test on mobile network (get hotspot)

**Option C: AWS EC2**
- [ ] Launch EC2 instance (t3.medium)
- [ ] Install Docker
- [ ] Clone repo and run `./deploy-staging.sh start`
- [ ] Point domain to IP
- [ ] Note URL

### 3. Prepare Demo Content (30 min)

**Pre-Create Accounts:**
- [ ] Admin account for admin dashboard demo
- [ ] Multiple asker accounts with errands
- [ ] Multiple doer accounts with bids

**Pre-Load Demo Data:**
- [ ] Run: `./deploy-staging.sh seed`
- [ ] Create 5-10 completed errands with ratings
- [ ] Create 3-5 pending errands waiting for bids
- [ ] Create 1-2 disputed errands with AI verdicts

**Screenshots & Backup:**
- [ ] Screenshots of all 6 demo flows
- [ ] Video recording of entire demo flow (10 min)
- [ ] Export as MP4 (smaller file size)
- [ ] Test video plays on USB/laptop

### 4. Equipment Check

**Bring to Hong Kong:**
- [ ] Laptop (fully charged, bring charger)
- [ ] Mobile phone (for hotspot, screen demo)
- [ ] USB drive with:
  - [ ] Full codebase (zip file)
  - [ ] Demo script (LEAP_EAST_DEMO_SCRIPT.md)
  - [ ] Backup video recording
  - [ ] Screenshots
  - [ ] Deployment guide
- [ ] HDMI cable (for projector/monitor)
- [ ] Power adapter
- [ ] WiFi adapter (backup)

### 5. Performance Optimization (15 min)

**Frontend:**
- [ ] Build production bundle: `cd frontend && npm run build`
- [ ] Test bundle size
- [ ] Test on slow 4G network

**Backend:**
- [ ] Test with 100+ sample records
- [ ] Test response times: < 200ms
- [ ] Test database queries: < 50ms

**Database:**
- [ ] Create backup: `docker exec errandify-postgres-staging pg_dump`
- [ ] Verify backup file size
- [ ] Test restore

### 6. Security Check (10 min)

- [ ] Ensure .env is NOT committed (check .gitignore)
- [ ] Verify JWT_SECRET is staging-only
- [ ] Verify no production credentials exposed
- [ ] Confirm SingPass is set to false (mock auth)
- [ ] Confirm Stripe is in test mode

### 7. Documentation Check

- [ ] DEPLOYMENT_GUIDE.md is clear
- [ ] LEAP_EAST_DEMO_SCRIPT.md covers all flows
- [ ] Technical troubleshooting section complete
- [ ] Emergency contact info documented
- [ ] API endpoints documented

---

## 🎤 At the Event

### Setup (30 min before demo)
- [ ] Connect laptop to WiFi / get hotspot
- [ ] Test loading app: http://localhost:5173
- [ ] Test on mobile device
- [ ] Open terminal with logs: `./deploy-staging.sh logs`
- [ ] Have demo script open on separate window
- [ ] Test projector/HDMI connection
- [ ] Do a dry-run of the full 15-min demo
- [ ] Have backup video ready to play

### Demo Execution (15 min)

**Pre-Demo (1 min):**
- [ ] Introduce yourself
- [ ] 30-second pitch about Errandify

**Demo Flow (14 min):**
- [ ] Flow 1: AI Task Creation (2 min)
- [ ] Flow 2: Bid & Acceptance (3 min)
- [ ] Flow 3: Completion & Rating (2 min)
- [ ] Flow 4: Gamification & Rewards (2 min)
- [ ] Flow 5: Dispute & AI (2 min)
- [ ] Flow 6: Admin Dashboard (1 min)
- [ ] Q&A (2 min buffer)

### If Things Go Wrong

**App Doesn't Load:**
- [ ] Switch to backup video recording
- [ ] Explain while playing video
- [ ] Have screenshots ready as fallback

**Internet Drops:**
- [ ] Run locally: `./deploy-staging.sh start`
- [ ] Access: http://localhost:5173 (no internet needed)
- [ ] Use hotspot from phone as backup

**Photos Don't Upload:**
- [ ] Use pre-recorded screenshots
- [ ] Explain photo moderation feature anyway
- [ ] Show compliance logs from other errands

---

## 📊 Post-Demo Follow-Up

### Collect Feedback (Next Day)
- [ ] Note down all questions asked
- [ ] Collect business cards / emails
- [ ] Ask what impressed them most
- [ ] Ask what features they want next

### Send Follow-Up (Within 24h)
- [ ] Email with demo video link
- [ ] GitHub link to open-source repo
- [ ] Deployment guide for self-demo
- [ ] Call to action for beta testing
- [ ] Contact info for investor discussions

---

## 🚨 Emergency Contacts

**If app crashes:**
1. Check logs: `docker-compose logs -f`
2. Restart services: `./deploy-staging.sh stop && ./deploy-staging.sh start`
3. If that fails, play backup video
4. Take questions about features

**If you lose internet:**
1. Use phone hotspot
2. Or run locally from laptop
3. Or play recorded video

**If you forget password:**
- Asker: asker@demo.com / password123
- Doer: doer@demo.com / password123
- Admin: admin@demo.com / password123

---

## ✨ Ace the Demo!

### Key Phrases
- "AI-powered gig marketplace"
- "Post → Bid → Execute → Rate in minutes"
- "7 AI features differentiating us"
- "86% MVP complete, ready to scale"
- "Real integration with Starbucks, KFC"

### Confidence Boosters
- You've built 86% of an MVP in weeks
- 52 features fully implemented
- Production-ready code
- Real AI integration (Qwen, Mapbox)
- Enterprise-grade infrastructure

### If Asked About Funding
- "We're currently at MVP stage"
- "Seeking seed round Q3 2026"
- "Looking for validators and beta users first"
- "TAM is $2B regional gig economy"

---

**You've got this! Go get 'em! 🚀**

