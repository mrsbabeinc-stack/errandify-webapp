# NewsAPI Setup Guide

## Getting Real Singapore News Running

### Step 1: Get a Free NewsAPI Key

1. Visit: https://newsapi.org/register
2. Sign up with your email (free tier available)
3. Verify your email
4. Copy your API key from the dashboard

### Step 2: Update Your .env File

**Location:** `/backend/.env`

Replace the placeholder API key:
```bash
# Before (placeholder):
NEWS_API_KEY=4b8d2c7f9e1a6b3c5d8f2a4e7c9b1d3f

# After (with your real key):
NEWS_API_KEY=your_actual_newsapi_key_here
```

### Step 3: Restart Your Backend Server

```bash
# Stop your current server (Ctrl+C)
# Then restart:
cd backend
npm run dev
```

### Step 4: Test the Integration

Visit one of these URLs in your browser:
```
# Get all Singapore news:
http://localhost:3000/api/news?type=singapore

# Get specific number of articles:
http://localhost:3000/api/news?type=singapore&limit=20
```

You should see real Singapore news articles with timestamps and external links.

---

## How It Works

### NewsAPI Search Query

The system searches for:
```
"Singapore" + country filter "sg"
```

This returns news articles about Singapore from major news sources.

### Automatic Categorization

Articles are automatically categorized based on keywords:

| Category | Keywords |
|----------|----------|
| housing | HDB, housing, flat, BTO |
| jobs | job, employment, career, salary |
| transport | transport, MRT, LRT, EV, charging |
| healthcare | health, medical, healthcare, hospital |
| education | education, school, university, student |
| policy | economy, growth, business, GDP, green, environment, sustainable, climate, tech, digital, AI |

### Free Tier Limits

- **Requests per day:** 100
- **Article history:** 30 days max
- **Rate limit:** Automatically handled (graceful fallback to mock data)

### What Happens If API Fails?

If the API is unreachable or rate-limited, the system automatically falls back to mock data so your news feed always works.

---

## Real Data Structure

Each article from NewsAPI includes:

```json
{
  "id": "sg-api-0-article-url",
  "type": "singapore",
  "title": "HDB Announces New Housing Plans",
  "content": "The Housing Board announced...",
  "category": "housing",
  "source": "Channel NewsAsia",
  "url": "https://channelnewsasia.com/article/...",
  "image": "https://image-url.com/...",
  "created_at": "2026-06-20T14:30:00Z",
  "author": "Reporter Name"
}
```

---

## Troubleshooting

### "NEWS_API_KEY not configured" Message

**Problem:** You haven't set a valid API key yet.

**Solution:** 
1. Get a key from https://newsapi.org/register
2. Update backend/.env with your key
3. Restart your server

### 401 Unauthorized Error

**Problem:** The API key is invalid or expired.

**Solution:**
1. Check your key in backend/.env
2. Make sure it's copied correctly (no spaces)
3. Verify the key is still active on newsapi.org
4. Generate a new key if needed

### 429 Rate Limited

**Problem:** You've exceeded 100 requests/day on the free tier.

**Solution:**
1. The system automatically falls back to mock data
2. Wait for the daily limit to reset (UTC midnight)
3. Consider upgrading to a paid plan for higher limits

### Articles Not Showing

**Problem:** No articles appear when you load the news page.

**Solution:**
1. Check backend console for error messages
2. Verify backend/.env has NEWS_API_KEY set
3. Restart the backend server
4. Check your internet connection
5. Try http://localhost:3000/api/news directly in browser

---

## Monitoring API Usage

To see API requests in action, check the backend console:

```
[NEWS API] Fetching Singapore news with key: 4b8d2c7...
[NEWS API] Got 25 articles from NewsAPI
```

If you see errors, they'll be logged with helpful messages.

---

## Upgrading to Paid Plan

If you need more than 100 requests/day:

1. Visit https://newsapi.org/pricing
2. Choose a plan (Professional: $449/month for unlimited)
3. Update your API key in backend/.env
4. Your request limits increase immediately

---

## Optional: Custom News Queries

To modify what Singapore news is fetched, edit `backend/src/routes/news.ts`:

### Change the search query:
```typescript
q: 'Singapore policy OR housing OR jobs',  // Current
q: 'Singapore tech OR startup',             // Alternative
q: 'Singapore economic',                    // Alternative
```

### Add more categories:
```typescript
const categorizeArticle = (title: string, content: string): string => {
  const text = (title + ' ' + content).toLowerCase();
  // ... existing categories ...
  if (text.includes('startup') || text.includes('venture')) return 'startup';
  // ... more categories ...
};
```

---

## Summary

✅ **With Real API:**
- 20-25 real Singapore news articles daily
- Auto-updated with latest news
- Proper source attribution
- External links to original articles
- Smart categorization

✅ **Graceful Fallback:**
- If API unavailable, uses 12 quality mock articles
- Users never see broken news section
- No disruption to app functionality

✅ **Zero Cost:**
- Free tier: 100 requests/day
- Perfect for MVP testing
- No credit card required

---

## Questions?

Refer to NewsAPI documentation: https://newsapi.org/docs
