# 🚀 Deploy Backend to Railway (15 minutes)

**Goal**: Get backend online so testers don't need your local machine  
**Time**: 15 minutes  
**Cost**: Free for first month, then $5/month  
**Result**: Permanent URL for backend API

---

## Why Deploy Backend?

### Current Setup (ngrok)
```
✅ Pros: Free, instant
❌ Cons: URL changes every 2 hours, need tunnel running 24/7
```

### Deployed Backend (Railway)
```
✅ Pros: Permanent URL, works 24/7, professional
❌ Cons: $5/month after free credit
```

### Recommendation
Use ngrok for **quick testing** (this week), then deploy to Railway when ready (next week).

---

## Quick Start: Deploy to Railway

### Step 1: Create Railway Account

1. Go to https://railway.app
2. Sign up with GitHub (click "Login with GitHub")
3. Authorize Railway to access your repos

### Step 2: Create New Project

1. Click "New Project"
2. Select "Deploy from GitHub"
3. Select your `errandify-webapp` repository
4. Click "Deploy"

### Step 3: Add Backend Service

Railway will scan your repo. It should detect:
- Frontend (React)
- Backend (Node.js)

If not automatic:
1. Click "New"
2. Select "Empty Service"
3. Name: `errandify-api`
4. Select Backend folder during config

### Step 4: Configure Environment Variables

Railway needs your `.env` variables:

```bash
# Go to Railway Dashboard
# Select errandify-api service
# Click "Variables"
# Add these:

NODE_ENV=production
PORT=3000
JWT_SECRET=your-super-secret-key-change-this
DATABASE_URL=postgresql://user:password@localhost/errandify
QWEN_API_KEY=sk-xxxxx  # (optional for testing, Hana won't work without)
```

**⚠️ Important**: Don't leave placeholder values! Each must be real.

### Step 5: Deploy

1. Click "Deploy"
2. Watch build logs (takes 2-3 minutes)
3. When done, you'll see a URL:

```
Railway URL: https://errandify-api.up.railway.app
```

### Step 6: Test Backend is Live

```bash
# Test your API endpoint
curl https://errandify-api.up.railway.app/health

# Should return:
# {"status":"ok"}
```

---

## Problem: Database on Local Machine

⚠️ Your PostgreSQL database is on your computer.  
Railway backend in cloud can't reach it!

### Solution A: Keep Database Local (Quick)

**How it works**:
- Backend on Railway
- But Railway connects back to your local DB
- Your computer must have public IP / port forwarding

**Setup**:
```bash
# In DATABASE_URL, use your public IP:
DATABASE_URL=postgresql://user:password@YOUR_PUBLIC_IP:5432/errandify

# Find your public IP:
curl ifconfig.me

# Example:
# 202.123.45.67:5432/errandify
```

**⚠️ Security Risk**: Exposing database to internet!

### Solution B: Migrate Database to Railway (Recommended)

**How it works**:
- Database also in cloud
- Backend in cloud
- Both talk to each other privately
- Fully cloud deployment

**Steps**:

1. **Export current database**:
```bash
# Dump your local database
pg_dump -U postgres -d errandify > errandify_backup.sql

# File created: errandify_backup.sql (keep this safe!)
```

2. **Create PostgreSQL on Railway**:
   - Go to Railway Dashboard
   - Click "New"
   - Select "PostgreSQL"
   - Railway creates database automatically

3. **Get connection string from Railway**:
   - Click PostgreSQL service
   - Copy "DATABASE_URL"
   - Example: `postgresql://postgres:password@containers-us-west-23.railway.app:5432/railway`

4. **Update backend environment**:
   - In Railway dashboard
   - Select errandify-api service
   - Click "Variables"
   - Update `DATABASE_URL` with Railway postgres URL

5. **Restore your data** (optional, for testing):
```bash
# Import your backup into Railway database
psql postgresql://postgres:password@containers-us-west-23.railway.app/railway < errandify_backup.sql
```

6. **Deploy backend** → Should connect to Railway database

---

## Verify Everything Works

### Test 1: Backend Health
```bash
curl https://errandify-api.up.railway.app/health
# Expected: {"status":"ok"}
```

### Test 2: API Endpoint
```bash
curl https://errandify-api.up.railway.app/api/ai/suggestions \
  -H "Content-Type: application/json" \
  -d '{"title":"Need help with moving"}'
# Expected: JSON response with suggestions
```

### Test 3: From Frontend

Update frontend `.env.production`:
```bash
VITE_API_URL=https://errandify-api.up.railway.app
```

Deploy frontend:
```bash
cd frontend && vercel --prod
```

Open: https://errandify.vercel.app
- Should work completely (no 404 errors)
- Bidding system works
- Chat works
- Notifications work

---

## Update Frontend to Use New URL

**File**: `frontend/.env.production`

Change from:
```bash
VITE_API_URL=http://localhost:3000
```

To:
```bash
VITE_API_URL=https://errandify-api.up.railway.app
```

**Deploy**:
```bash
cd frontend && vercel --prod
```

**Wait**: Vercel rebuilds & deploys (1-2 minutes)

**Test**: https://errandify.vercel.app should work perfectly

---

## Full Deployment Architecture

```
┌─────────────────────────────────────────────────────┐
│              INTERNET / TESTERS                      │
│                                                       │
│  1. Open https://errandify.vercel.app (Vercel)      │
│  2. Makes API calls to Railway backend               │
│  3. Backend queries Railway PostgreSQL               │
│  4. Data flows back to browser                       │
└─────────────────────────────────────────────────────┘
         ↓
    ┌────────────────┐
    │  Vercel Cloud  │
    │  (Frontend)    │ → React app hosted
    └────────────────┘
         ↓
         ↓ API calls
         ↓
    ┌────────────────────────────────────┐
    │       Railway Cloud                 │
    ├────────────────────────────────────┤
    │ Backend (Node.js)                   │
    │ postgresql://...railway.app         │
    │ errandify-api.up.railway.app        │
    └────────────────────────────────────┘
         ↓
         ↓ Queries
         ↓
    ┌────────────────┐
    │  PostgreSQL    │
    │  (Database)    │ → Data persisted
    └────────────────┘
```

**Result**: Fully cloud-hosted, works anywhere, 24/7

---

## Troubleshooting

### "Build failed" on Railway

Check logs:
```bash
# Click your errandify-api service
# Click "Deployments" tab
# Click latest deployment
# Scroll to see error
```

Common fixes:
```bash
# Missing dependency
npm install

# TypeScript error
npm run build

# Wrong start script
# Ensure package.json has: "start": "node dist/index.js"
```

Then push to GitHub:
```bash
git add .
git commit -m "Fix: backend deployment"
git push

# Railway auto-redeploys
```

### "Can't connect to database"

Check:
```bash
# Railway DATABASE_URL correct?
# Copy from Railway dashboard exactly

# Database running?
# If local: psql -U postgres -d errandify
# If Railway: Check Railway PostgreSQL service status

# Port forwarding working?
# If local IP: check firewall allows port 5432
```

### "API returns 500 errors"

Check backend logs:
```bash
# Railway dashboard
# Click errandify-api
# Click "Logs" tab
# Look for error messages

# Common causes:
# - Missing JWT_SECRET env var
# - Database connection timeout
# - Missing QWEN_API_KEY (Hana fails gracefully)
```

### "Frontend can't reach backend"

Check:
```bash
# Frontend .env.production
cat frontend/.env.production

# Should show Railway URL:
# VITE_API_URL=https://errandify-api.up.railway.app

# Rebuild & deploy frontend:
cd frontend && vercel --prod

# Wait 1-2 minutes, then test
```

---

## Cost Breakdown

| Service | Free Tier | Paid | Notes |
|---------|-----------|------|-------|
| Vercel Frontend | ∞ | N/A | Free forever |
| Railway Backend | $5 free/mo | $5/mo after | Generous free tier |
| Railway Database | $5 free/mo | $5/mo after | Included in Railway plan |
| Custom Domain | - | $12/year | Optional |
| **Total** | **Free** | **$5-10/mo** | Very affordable |

---

## Monitoring & Debugging

### Watch Backend Logs

```bash
# Railway dashboard → errandify-api → Logs
# See all API requests and errors in real-time
```

### Track Errors

```bash
# When testers report bugs
# Check logs for error messages
# Fix on local machine
# Push to GitHub
# Railway auto-deploys (2-3 min)
```

### Performance

```bash
# Railway shows:
# - CPU usage
# - Memory usage
# - Network I/O
# Monitor during testing with many testers
```

---

## Next Steps

### Option 1: Quick Testing (This Week)
- Keep backend local
- Use ngrok tunnel
- Deploy frontend to Vercel
- Share URL with 5-10 testers

### Option 2: Full Deployment (Next Week)
- Migrate database to Railway
- Deploy backend to Railway
- Update frontend URLs
- Share with unlimited testers

---

## One-Command Checklist

```bash
# 1. Push code to GitHub
git push origin main

# 2. Export database backup
pg_dump -U postgres -d errandify > backup.sql

# 3. Go to Railway, create project (3 clicks)
# https://railway.app → New Project → GitHub

# 4. Update frontend .env
echo "VITE_API_URL=https://errandify-api.up.railway.app" > frontend/.env.production

# 5. Deploy frontend
cd frontend && vercel --prod

# Result: https://errandify.vercel.app (production ready!)
```

---

## FAQs

**Q: How long does database migration take?**  
A: 10 minutes to export, 5 minutes to import. 15 min total.

**Q: Will my test data transfer?**  
A: Yes! When you import backup, all errands/bids/users transfer.

**Q: Can I have multiple environments (dev/staging/prod)?**  
A: Yes! Railway supports it. Create separate projects for each.

**Q: Do I need to shut down local backend?**  
A: No, but make sure Railway DATABASE_URL points to Railway Postgres, not local.

**Q: What if Railway backend goes down?**  
A: Use ngrok tunnel as fallback temporarily.

---

## Production Readiness

After deploying to Railway, you're ready to:
- ✅ Share with testers worldwide (no local machine needed)
- ✅ Run 24/7 (no manual server restart needed)
- ✅ Scale if many users (Railway handles it)
- ✅ Integrate SingPass & Stripe (production URLs ready)
- ✅ Deploy to production (one click)

---

**Status**: Ready to Deploy  
**Time Required**: 15 minutes  
**Cost**: Free first month  
**Result**: Professional cloud backend 🎉

Let's do this!
