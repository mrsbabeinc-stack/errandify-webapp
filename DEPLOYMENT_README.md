# Errandify Staging Deployment Guide

## What's Deployed

This is a **frontend-only deployment** to verify Heroku works.

### Files Included

1. **server.js** - Node.js server (CommonJS)
   - Serves frontend static files from `frontend/dist/`
   - Handles React Router fallback
   - Logs all activity for debugging
   - Listens on PORT env var

2. **package.json** - Root dependencies
   - express ^4.18.2
   - Node 24.x, npm 11.x
   - No build scripts (clean)

3. **Procfile** - Heroku execution
   - `web: node server.js`

4. **frontend/dist/** - Pre-built React app
   - index.html (main entry point)
   - assets/ (CSS, JS bundles)
   - images/ (graphics)
   - service-worker.js

5. **.npmrc** - npm configuration
   - Ensures npm works correctly on Heroku

## Deployment Steps

1. Go to https://dashboard.heroku.com/apps/errandify-staging
2. Click "Deploy" tab
3. Select branch: `admin-system-v1`
4. Click "Deploy Branch"
5. Wait 3-5 minutes for build
6. Test at https://errandify-staging.herokuapp.com

## What to Expect

✅ **Should see**: Errandify homepage with logo, text, images  
✅ **Health check**: https://errandify-staging.herokuapp.com/health returns `{"status":"ok",...}`  
❌ **Will NOT work**: API calls (no backend running)

## If It Fails

Check Heroku logs:
```bash
export NODE_TLS_REJECT_UNAUTHORIZED=0
heroku logs --app errandify-staging --tail
```

Look for:
- `✅ Server running on port` = SUCCESS
- `Frontend exists: true` = Files found
- Error messages = Debug info

## Local Testing

```bash
cd /path/to/errandify
node server.js
# Visit http://localhost:3000
```

## Backend Integration (Future)

Once frontend deployment works, we can add:
- backend/dist compiled code
- backend/package.json dependencies
- Database connection
- API routes

---

**Status**: Frontend deployment tested locally, ready for Heroku.  
**Last updated**: 2026-07-05  
**Commit**: 114dc017
