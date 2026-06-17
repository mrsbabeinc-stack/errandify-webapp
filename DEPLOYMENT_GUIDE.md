# Errandify Platform - Deployment Guide

**Date**: 2026-06-18  
**Version**: 1.0  
**Status**: ✅ READY FOR PRODUCTION

---

## Pre-Deployment Checklist

### ✅ All Items Complete
- [x] All 10 modules built and tested
- [x] Database schema finalized
- [x] API endpoints verified (48+)
- [x] Security implemented (PDPA compliant)
- [x] CHAS integration ready (manual mode)
- [x] SingPass integration ready
- [x] Stripe payment integration configured
- [x] Voice synthesis working (Alibaba Qwen)
- [x] Hana AI assistant operational
- [x] Documentation complete

---

## Step 1: Database Setup

### 1.1 Apply Core Schema
```bash
psql -U postgres -d errandify < database/schema.sql
```

### 1.2 Apply CHAS Migration (For Manual CHAS Support)
```bash
psql -U postgres -d errandify < database/add_chas_fields.sql
```

### 1.3 Apply Postal Code Migration (Already Done)
```bash
psql -U postgres -d errandify < database/add_postal_code.sql
```

### 1.4 Verify Database
```bash
psql -U postgres -d errandify

-- Should see these tables:
\dt
-- Output includes:
-- users, errands, bids, jobs, messages, notifications, reviews, disputes, payments, chas_verification_audit

-- Should see these indexes:
\di
-- Output includes:
-- idx_users_chas_verified, idx_users_chas_card_color, idx_chas_audit_*
```

---

## Step 2: Environment Configuration

### 2.1 Backend Configuration
Create/update `.env` file in `backend/`:

```bash
# Server
PORT=3000
NODE_ENV=production
DATABASE_URL=postgresql://user:password@localhost:5432/errandify

# JWT
JWT_SECRET=your-super-secret-key-generate-random

# Stripe (Get from Stripe Dashboard)
STRIPE_SECRET_KEY=sk_live_XXXXXXXXXXXX
STRIPE_PUBLISHABLE_KEY=pk_live_XXXXXXXXXXXX

# Alibaba Qwen AI (For Hana)
QWEN_API_KEY=sk-XXXXXXXXXXXX

# SingPass (Optional - for login)
USE_SINGPASS=false  # Set to true when credentials available
SINGPASS_CLIENT_ID=your_client_id
SINGPASS_CLIENT_SECRET=your_client_secret

# Azure Speech (Optional - for TTS fallback)
AZURE_SPEECH_KEY=your_azure_key  # Optional, Qwen is primary
```

### 2.2 Frontend Configuration
Create/update `.env.local` file in `frontend/`:

```bash
VITE_API_URL=http://localhost:3000  # Or your production API URL
```

### 2.3 Database Credentials
```bash
# Securely store database credentials
# Option 1: Use environment variables
export PGUSER=your_user
export PGPASSWORD=your_password
export PGHOST=localhost
export PGPORT=5432
export PGDATABASE=errandify

# Option 2: Use .pgpass file (more secure)
# Create ~/.pgpass with:
# localhost:5432:errandify:user:password
# chmod 600 ~/.pgpass
```

---

## Step 3: Backend Deployment

### 3.1 Install Dependencies
```bash
cd backend
npm install
```

### 3.2 Build (TypeScript → JavaScript)
```bash
npm run build
```

### 3.3 Test Backend
```bash
npm run dev  # For development testing
# Server should start on http://localhost:3000
# Check health: curl http://localhost:3000/health
```

### 3.4 Verify All Endpoints
```bash
# Test a few critical endpoints:
curl http://localhost:3000/health  # Should return {"status":"ok"}

# Test CHAS endpoint (should require auth):
curl -X GET http://localhost:3000/api/chas/profile  # Should return 400 (no auth)

# Test errand endpoint:
curl -X GET http://localhost:3000/api/errands  # Should return 400 (no auth)
```

### 3.5 Production Start
```bash
# Option A: Run directly
node dist/index.js

# Option B: Use PM2 (recommended for production)
pm2 start dist/index.js --name "errandify-api"
pm2 save
pm2 startup

# Option C: Use Docker (if available)
docker build -t errandify-api .
docker run -d -p 3000:3000 --env-file .env errandify-api
```

---

## Step 4: Frontend Deployment

### 4.1 Install Dependencies
```bash
cd frontend
npm install
```

### 4.2 Build for Production
```bash
npm run build
# Creates: dist/ folder with optimized files
```

### 4.3 Test Build Locally
```bash
npm run preview
# Should show: http://localhost:4173
```

### 4.4 Deploy to Hosting

**Option A: Vercel (Recommended)**
```bash
npm install -g vercel
vercel
# Follow prompts to deploy
# Connected to your git repo for auto-deploy on push
```

**Option B: Netlify**
```bash
npm install -g netlify-cli
netlify deploy --prod --dir=dist
```

**Option C: AWS S3 + CloudFront**
```bash
# Build files
npm run build

# Upload to S3
aws s3 sync dist/ s3://your-bucket-name --delete

# Invalidate CloudFront cache
aws cloudfront create-invalidation --distribution-id YOUR_ID --paths "/*"
```

**Option D: Self-Hosted Server**
```bash
# Copy dist/ to your server
scp -r dist/ user@server:/var/www/errandify

# Serve with nginx
sudo cp dist/* /var/www/html/errandify/
sudo systemctl restart nginx
```

---

## Step 5: CHAS Integration Deployment

### 5.1 Verify CHAS Endpoints Are Working

#### Manual CHAS Selection (Ready Now)
```bash
# Test manual CHAS verification
curl -X POST http://localhost:3000/api/chas/verify-manual \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"chasCardColor": "blue"}'

# Expected response:
# {
#   "success": true,
#   "data": {
#     "chasCardColor": "blue",
#     "chasVerified": true,
#     "message": "CHAS BLUE card confirmed",
#     "chasInfo": {
#       "color": "blue",
#       "incomeLimit": "Monthly household income ≤ $1,900",
#       "subsidy": "Higher subsidies (75-100%)",
#       "eligible": true
#     }
#   }
# }
```

#### Check CHAS Eligibility
```bash
curl -X GET http://localhost:3000/api/chas/eligibility/USER_ID
# Shows discount eligibility
```

### 5.2 Activate CHAS in Profile UI
Frontend should show:
- "CHAS Card Status" field in profile
- Options: Blue Card / Green Card / No Card
- Save button updates backend

### 5.3 Future: MOH API Integration
When MOH credentials received:
1. Update `.env` with MOH API details:
   ```
   MOH_CHAS_API_URL=https://api.moh.gov.sg/chas/verify
   MOH_CHAS_CLIENT_ID=xxx
   MOH_CHAS_API_KEY=xxx
   MOH_CHAS_TOKEN=xxx
   ```
2. Code in `backend/src/routes/chas.ts` is already prepared
3. No code changes needed, just environment variables

---

## Step 6: Security Hardening

### 6.1 Enable HTTPS/TLS
```bash
# Get SSL certificate (Let's Encrypt - free)
sudo certbot certonly --standalone -d errandify.ai

# Configure nginx to use certificate
sudo nano /etc/nginx/sites-available/errandify
# Add:
# server {
#   listen 443 ssl;
#   ssl_certificate /etc/letsencrypt/live/errandify.ai/fullchain.pem;
#   ssl_certificate_key /etc/letsencrypt/live/errandify.ai/privkey.pem;
# }
```

### 6.2 Configure Firewall
```bash
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```

### 6.3 Database Security
```bash
# Restrict database access to backend only
psql -U postgres
ALTER ROLE errandify_user WITH PASSWORD 'strong-random-password';
GRANT CONNECT ON DATABASE errandify TO errandify_user;
GRANT USAGE ON SCHEMA public TO errandify_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO errandify_user;
```

### 6.4 API Rate Limiting
Already implemented in Express. Configured to:
- 100 requests per 15 minutes per IP
- Strict limits on auth endpoints (5 attempts/15min)

### 6.5 CORS Configuration
Already set to:
- Allow frontend domain only
- Disallow credentials from unknown origins
- Restrict to necessary headers

---

## Step 7: Monitoring & Logging

### 7.1 Setup Logging
```bash
# Create logs directory
mkdir -p logs
chmod 755 logs

# Start logging (example with PM2)
pm2 start dist/index.js --name "errandify-api" --output logs/out.log --error logs/error.log
```

### 7.2 Monitor Backend Health
```bash
# Health check endpoint
curl http://localhost:3000/health

# Setup monitoring (example with PM2)
pm2 monitor  # Requires PM2 Plus account

# Or use simple monitoring script
*/5 * * * * curl -f http://localhost:3000/health || (systemctl restart errandify-api)
```

### 7.3 Database Backups
```bash
# Daily backup script
#!/bin/bash
BACKUP_FILE="errandify_$(date +%Y%m%d_%H%M%S).sql"
pg_dump -U postgres errandify > "/backups/$BACKUP_FILE"
gzip "/backups/$BACKUP_FILE"
# Keep last 30 days only
find /backups -name "errandify_*.sql.gz" -mtime +30 -delete
```

### 7.4 Error Tracking
```bash
# Setup Sentry (optional but recommended)
npm install @sentry/node
# Add to backend/src/index.ts:
// import * as Sentry from "@sentry/node";
// Sentry.init({ dsn: process.env.SENTRY_DSN });
```

---

## Step 8: Testing Production

### 8.1 Test User Registration
1. Open http://errandify.ai
2. Click "Login"
3. Create test account with email
4. Verify email works

### 8.2 Test Core Flows
1. **Errand Creation**: Post test errand "Test Errand"
2. **Bidding**: Switch account, submit bid
3. **Payment**: Accept bid, verify Stripe integration
4. **Messaging**: Send test message
5. **CHAS**: Select CHAS card color, verify saved
6. **Hana AI**: Click Hana button, test chat in 3 languages
7. **Reviews**: Complete errand, submit review

### 8.3 Performance Testing
```bash
# Load test with Apache Bench
ab -n 1000 -c 100 http://errandify.ai/

# Should handle:
- 1000 requests
- 100 concurrent users
- Without errors or timeouts
```

### 8.4 Security Testing
```bash
# Basic security check
curl -I http://errandify.ai
# Should show security headers:
# Strict-Transport-Security
# X-Content-Type-Options: nosniff
# X-Frame-Options: DENY
# X-XSS-Protection: 1; mode=block
```

---

## Step 9: Post-Deployment Verification

### 9.1 Checklist
- [ ] Backend running (PORT 3000)
- [ ] Frontend accessible (errandify.ai)
- [ ] Database connected
- [ ] HTTPS enabled
- [ ] All API endpoints responding
- [ ] User registration works
- [ ] CHAS selection working
- [ ] Stripe payments working
- [ ] Hana AI responding
- [ ] Voice synthesis working
- [ ] Emails sending
- [ ] Monitoring active
- [ ] Backups scheduled

### 9.2 Go-Live Announcement
```
✅ Errandify Platform is LIVE!

Features:
- Post & find errands
- Bidding system
- Real-time messaging
- Hana AI assistant (3 languages, voice)
- Secure payments with Stripe
- CHAS card support for special pricing
- Full PDPA compliance

Available now at: errandify.ai
```

---

## Troubleshooting

### Backend Won't Start
```bash
# Check port is not in use
lsof -i :3000

# Check environment variables
env | grep -E "DATABASE_URL|JWT_SECRET|QWEN"

# Check database connection
psql postgresql://user:password@localhost/errandify -c "SELECT 1"

# Check Node version
node --version  # Should be 18+
```

### Frontend Not Loading
```bash
# Check build succeeded
ls -la frontend/dist/

# Check web server logs
sudo tail -f /var/log/nginx/error.log

# Check CORS issues
curl -H "Origin: http://localhost:3000" http://errandify.ai
```

### Database Issues
```bash
# Backup current database
pg_dump errandify > backup.sql

# Reset database
dropdb errandify
createdb errandify
psql errandify < database/schema.sql
psql errandify < database/add_chas_fields.sql
```

### CHAS Not Working
```bash
# Verify columns exist
psql errandify -c "\d users" | grep chas

# Check audit table
psql errandify -c "SELECT * FROM chas_verification_audit LIMIT 5"

# Test endpoint
curl -X POST http://localhost:3000/api/chas/verify-manual \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{"chasCardColor":"blue"}'
```

---

## Rollback Procedure

If issues occur after deployment:

### 9.1 Quick Rollback (Backend)
```bash
# Stop current process
pm2 stop errandify-api

# Restore previous version
git checkout HEAD~1
npm run build

# Start previous version
pm2 start dist/index.js --name "errandify-api"
```

### 9.2 Database Rollback
```bash
# Restore from backup
psql errandify < errandify_20260618_backup.sql

# Drop bad tables if needed
psql errandify -c "DROP TABLE IF EXISTS chas_verification_audit CASCADE;"

# Revert columns if needed
psql errandify < database/remove_chas_fields.sql
```

### 9.3 Frontend Rollback (Vercel)
```bash
# Vercel automatically keeps 50 previous deployments
# Click "Rollback" in Vercel dashboard
# Or redeploy from specific git commit
git checkout COMMIT_HASH
vercel --prod
```

---

## Maintenance Schedule

### Daily
- [ ] Check server health
- [ ] Review error logs
- [ ] Verify backups completed

### Weekly
- [ ] Review user feedback
- [ ] Check API performance metrics
- [ ] Verify all integrations working

### Monthly
- [ ] Security audit
- [ ] Database optimization
- [ ] Dependencies update
- [ ] Performance review

### Quarterly
- [ ] Full security penetration test
- [ ] Load testing
- [ ] Disaster recovery drill
- [ ] Compliance audit

---

## Escalation Contacts

**Technical Issues**: dev-team@errandify.ai  
**Security Issues**: security@errandify.ai  
**Data Issues**: dpo@errandify.ai  
**Emergencies**: [24/7 Support Number]

---

## Success Criteria

✅ **Platform is successfully deployed when:**

1. Frontend accessible at errandify.ai
2. User can register/login
3. User can post errand
4. User can bid on errand
5. Payment processing works
6. Hana AI responds in all 3 languages
7. Voice synthesis works naturally
8. CHAS card selection works
9. Messaging works real-time
10. All API endpoints responding
11. No errors in logs
12. Performance acceptable (<2s page load)
13. Security headers present
14. PDPA compliance verified
15. Backups automated

---

**Deployment Status**: ✅ **READY TO DEPLOY**

All systems verified and tested. Platform ready for production.
