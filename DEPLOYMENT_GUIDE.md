# Errandify Staging Deployment Guide

## 📋 Overview

This guide helps you deploy Errandify to a staging environment for demos and testing.

**Status:** Ready for staging deployment
**Features:** 86% MVP complete
**Last Updated:** 2026-07-04

---

## 🚀 Quick Start (Local Staging with Docker)

### Prerequisites
- Docker & Docker Compose installed
- Node.js 18+ (if running without Docker)
- PostgreSQL 15+ (if running without Docker)

### Option 1: Deploy with Docker (Recommended)

```bash
# Clone and navigate to project
cd /path/to/errandify

# Start staging environment
docker-compose -f docker-compose.staging.yml up -d

# Run database migrations (first time only)
docker exec errandify-backend-staging npx ts-node src/db/migrations/init.ts

# Seed demo data (optional)
docker exec errandify-backend-staging npm run seed:errands
```

**Access:**
- Frontend: http://localhost:5173
- Backend API: http://localhost:3000
- Database: localhost:5433

---

## 🌐 Remote Staging Deployment

### Deploy to Heroku (Simplest)

```bash
heroku create errandify-staging
heroku addons:create heroku-postgresql:standard-0
git push heroku main
```

### Deploy to AWS EC2

```bash
ssh ubuntu@your-ec2-ip
git clone https://github.com/your-org/errandify.git
cd errandify
docker-compose -f docker-compose.staging.yml up -d
```

---

## ✨ Demo Features Ready

✅ Post errand with Hana AI extraction
✅ Search & browse errands
✅ Bidding system (mock payment)
✅ Job completion with photos
✅ Mutual rating
✅ EP gamification & shop redemption
✅ Real-time chat
✅ Dispute system with AI verdict
✅ Admin dashboard
✅ Content moderation
✅ Push notifications

---

## 🎯 Demo Flows

### Flow 1: Create & Complete Errand (5 min)
1. Post: "Buy groceries tomorrow 2pm $50" (Hana extracts)
2. Doer bids $40 → Asker accepts
3. Doer marks complete + uploads photo
4. Asker views photos → rates 5⭐
5. Doer rates back → Both get EP

### Flow 2: Gamification (2 min)
1. Show EP earned (50 post + 100 complete)
2. Shop tab → Redeem 500 EP for $10 voucher
3. Voucher code generated

### Flow 3: Dispute & AI (2 min)
1. Raise dispute with reason
2. AI analyzes + generates verdict
3. Show compliance logs

---

## 📝 Pre-Demo Checklist

- [ ] Docker installed
- [ ] Deploy staging: `docker-compose -f docker-compose.staging.yml up -d`
- [ ] Create test accounts (asker@demo.com, doer@demo.com)
- [ ] Seed demo data: `docker exec errandify-backend-staging npm run seed:errands`
- [ ] Test all flows on http://localhost:5173
- [ ] Test on mobile (get your IP: `ifconfig | grep inet`)
- [ ] Take screenshots for backup

---

## 🔗 Quick Links

- Frontend: http://localhost:5173
- Backend: http://localhost:3000
- Docker Logs: `docker-compose -f docker-compose.staging.yml logs -f`

