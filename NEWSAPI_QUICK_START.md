# NewsAPI Quick Start (5 Minutes)

## Get Real Singapore News in 3 Steps

### Step 1: Get Free API Key (2 min)
```
1. Go to: https://newsapi.org/register
2. Sign up with email
3. Copy your API key
```

### Step 2: Update Config (1 min)
```bash
# Edit: backend/.env

# Replace this:
NEWS_API_KEY=4b8d2c7f9e1a6b3c5d8f2a4e7c9b1d3f

# With your key:
NEWS_API_KEY=YOUR_ACTUAL_KEY_HERE
```

### Step 3: Restart Backend (1 min)
```bash
# Stop current server (Ctrl+C)
# Restart:
npm run dev
```

**Done!** Real Singapore news is now live! 🎉

---

## Test It

Visit in browser:
```
http://localhost:3000/api/news?type=singapore
```

You should see real Singapore news articles with timestamps and links.

---

## What You Get

✅ Real Singapore news articles
✅ Updated daily
✅ Proper source attribution  
✅ External links to original articles
✅ Auto-categorized by topic
✅ Smart fallback to mock data if API fails
✅ 100 requests/day (free tier)

---

## Free Tier Includes

- 100 API requests per day
- 30-day article history
- No credit card required
- Perfect for MVP testing

---

## If Something Goes Wrong

**"NEWS_API_KEY not configured"**
→ Check your backend/.env has the real key

**"401 Unauthorized"**
→ Your API key is wrong or expired

**"429 Rate Limited"**
→ Hit 100 req/day limit. Wait until tomorrow or upgrade.

**Still seeing mock data?**
→ Restart backend server: `npm run dev`

---

## For Production

Want more than 100 req/day?
→ Upgrade at: https://newsapi.org/pricing

---

That's it! Enjoy real Singapore news! 🇸🇬
