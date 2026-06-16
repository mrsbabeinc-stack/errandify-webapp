# 🚀 START HERE — How to Test Errandify Auth

**Read this first.** Everything else is documentation.

---

## The Fastest Way to Test (10 minutes)

### Copy & Paste These Commands

```bash
# 1. Create database (run in any terminal)
createdb errandify
psql errandify < database/schema.sql

# 2. Terminal A: Start Backend
cd backend
npm install  # First time only
npm run dev

# 3. Terminal B: Start Frontend
cd frontend
npm install  # First time only
npm run dev

# 4. Browser
Open http://localhost:5173
```

### Then in Browser

1. **Splash Screen** → Click "Sign Up with SingPass"
2. **Select Persona** → Pick "Tan Wei Ming" (age 51)
3. **Click Continue**
4. **Mobile Number** → Type `98765432`
5. **Language** → Keep English (default)
6. **Click "Join the Kampung"**
7. **Verify:** Text is noticeably **larger** (19px vs standard 16px)
8. **Check Console:** `localStorage.getItem('token')` has JWT

### Test Login

1. Open DevTools (F12) → Console
2. Run: `localStorage.clear()`
3. Refresh page
4. Click "Already have account? Log in"
5. Mobile: `98765432`
6. Click "Send OTP"
7. **Check Terminal A (Backend)** → Look for: `📱 OTP for 98765432: 123456`
8. **Back in Browser:** Type `123456` in OTP field
9. Click "Verify"
10. **Verify:** Logged in, text is 19px again

### Verify Database

```bash
# Terminal C: Check database
psql errandify

# Inside psql:
SELECT display_name, mobile, font_size_pref, language_pref FROM users;

# Should show:
#  display_name  | mobile   | font_size_pref | language_pref
# ---------------+----------+----------------+---------------
#  Tan Wei Ming   | 98765432 |             19 | en

\q  # Exit psql
```

---

## ✅ That's It!

If everything above works, you have:

✅ **Signup working** — User created in database  
✅ **Font scaling working** — 19px for age 50+  
✅ **Language preference working** — Saved to profile  
✅ **OTP login working** — Mobile + 6-digit code  
✅ **Database working** — Users table populated  
✅ **JWT working** — Token stored in localStorage  

---

## 📖 Want More Details?

| Document | For |
|----------|-----|
| **QUICK_TEST.md** | Step-by-step 11-step guide (full checklist) |
| **TEST_SCENARIOS.md** | 9 detailed test cases with expected outputs |
| **AUTH_FLOW.md** | Technical deep-dive on implementation |
| **GETTING_STARTED.md** | Setup, troubleshooting, tips |

---

## 🐛 Something Broke?

### "Connection refused" / "Cannot connect to server"

PostgreSQL not running:
```bash
brew services start postgresql@15  # macOS
# or
sudo systemctl start postgresql     # Linux
# or
docker run -d -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres
```

### "ECONNREFUSED" in browser console

Backend not running. Check Terminal A shows:
```
Errandify API running on port 3000
```

### "Cannot GET /" in browser

Frontend not running. Check Terminal B shows:
```
Local: http://localhost:5173
```

### Dependencies errors

```bash
cd frontend && npm install
cd backend && npm install
```

### Database errors

```bash
createdb errandify
psql errandify < database/schema.sql
```

---

## 🎯 Success Criteria

All of these should work:

- [ ] Signup with Tan Wei Ming (age 51)
- [ ] Mobile number: `98765432`
- [ ] Language: English
- [ ] Page text is **noticeably larger** (19px)
- [ ] User in database with `font_size_pref: 19`
- [ ] Token in `localStorage.getItem('token')`
- [ ] Log in with OTP from backend console
- [ ] Text remains 19px after login

If all are checked ✅, **you're done testing!**

---

## 🚀 Next Phase

After you verify everything works:

1. Share test results
2. We build Category Selection screen
3. Then Errand browsing
4. Then Chat with Qwen AI

---

**That's it! Run the commands above and come back with results.** 🎉
