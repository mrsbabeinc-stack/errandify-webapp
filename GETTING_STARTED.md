# Getting Started with Errandify

Quick setup guide to run the mock auth flow locally.

## Prerequisites

- Node.js 18+ and npm
- PostgreSQL installed locally
- A text editor (VS Code recommended)

## 1. Database Setup

```bash
# Create the database
createdb errandify

# Load the schema
psql errandify < database/schema.sql

# Verify (optional)
psql errandify -c "SELECT * FROM users LIMIT 1;"
```

## 2. Install Dependencies

### Frontend
```bash
cd frontend
npm install
```

### Backend
```bash
cd backend
npm install
```

## 3. Environment Setup

### Frontend (`.env` file in `/frontend`)
```
VITE_API_URL=http://localhost:3000
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_dummy
VITE_USE_SINGPASS=false
```

### Backend (`.env` file in `/backend`)
```
DATABASE_URL=postgresql://localhost/errandify
JWT_SECRET=your-secret-key-for-testing
QWEN_API_KEY=your-qwen-key-later
STRIPE_SECRET_KEY=sk_test_dummy
USE_SINGPASS=false
PORT=3000
NODE_ENV=development
```

## 4. Start the Servers

### Terminal 1: Backend
```bash
cd backend
npm run dev
```

You should see:
```
Errandify API running on port 3000
Environment: development
SingPass enabled: false
```

### Terminal 2: Frontend
```bash
cd frontend
npm run dev
```

You should see:
```
  VITE v5.0.0  ready in 123 ms

  ➜  Local:   http://localhost:5173/
```

## 5. Test the Auth Flow

### Open http://localhost:5173 in your browser

### Test Signup

1. **Click "Sign Up with SingPass"**
   - Splash screen shows Errandify logo, 4 character illustrations
   - Speech bubble from Hana: "Hello neighbour!..."

2. **Select or customize persona**
   - Default: "Tan Wei Ming, 51, Asker"
   - Or click "Custom" to enter your own name/age/NRIC
   - Click "Continue"

3. **Complete profile**
   - Display name (pre-filled)
   - Mobile number (e.g., `98765432`)
   - Language (EN or 中文)
   - Age shown (if 50+, font size increases to 19px)
   - Click "Join the Kampung"

4. **Verify success**
   - Should redirect to home page
   - Check browser console: `localStorage.getItem('token')` should have JWT
   - Font size larger if age ≥ 50

### Test Login

1. **Go back to splash screen** (clear localStorage or click "Log in")

2. **Click "Log in"**
   - Enter mobile number from signup (e.g., `98765432`)
   - Click "Send OTP"

3. **Check OTP**
   - Open backend terminal
   - Look for: `📱 OTP for 98765432: 123456`
   - Copy the 6-digit code

4. **Verify OTP**
   - Enter `123456` in the OTP field
   - Click "Verify"
   - Should log in and redirect to home

## 6. Verify the Database

```bash
# Connect to the database
psql errandify

# Check users created
SELECT id, display_name, mobile, age_from_dob, role FROM users;

# Logout
\q
```

---

## Testing Tips

### Test Different Personas

Three pre-loaded personas to quickly test:

1. **Tan Wei Ming (51 years old)**
   - Tests font size scaling (19px)
   - Shows age-friendly UI

2. **Siti Rahimah (35 years old)**
   - Standard setup (16px)
   - Tests Doer role

3. **Ravi Kumar (28 years old)**
   - Young user
   - Tests custom roles

### Test Custom Entry

Click "Custom" in the Mock SingPass modal to enter:
- Any name
- Any age (to test font scaling)
- Any NRIC format (it's just text in mock mode)
- Any address

### Font Size Scaling

- Sign up with age ≥ 50 → Text increases to 19px throughout app
- Sign up with age < 50 → Standard 16px text

### Language Preference

- Select "中文" during signup
- Saved to user profile for later use
- (i18n translations coming in Phase 2)

### OTP Testing

- Mobile number must match signup
- OTP valid for 10 minutes
- Expires after use
- Check backend console for the code
- Use `123456` as the demo OTP

---

## Troubleshooting

### "Connection refused" on backend startup

**Problem:** Database not running or wrong URL

**Fix:**
```bash
# Check if PostgreSQL is running
psql -l

# If not, start it
# macOS with Homebrew:
brew services start postgresql

# Linux:
sudo service postgresql start
```

### "Module not found" errors

**Problem:** Dependencies not installed

**Fix:**
```bash
# Frontend
cd frontend && npm install

# Backend
cd backend && npm install
```

### CORS errors in browser console

**Problem:** Frontend can't reach backend

**Fix:**
```bash
# Make sure backend is running on port 3000
# Check VITE_API_URL in frontend/.env is set to http://localhost:3000
# Restart both servers
```

### OTP not showing in console

**Problem:** Backend not logging OTP

**Fix:**
- Check backend terminal for the OTP log
- Backend must be running in dev mode (`npm run dev`)
- OTP is generated after clicking "Send OTP"

---

## Next: Category Selection

After login, you'll be redirected to the home page. The next prompt builds:
- **Category selection screen**
- **Errand browsing/creation**
- **Chat interface**

---

## File Reference

| File | Purpose |
|------|---------|
| `frontend/src/components/auth/SplashScreen.tsx` | Landing page with illustrations |
| `frontend/src/components/auth/MockSingpassModal.tsx` | Test persona selection |
| `frontend/src/components/auth/CompleteProfileStep.tsx` | Mobile & language setup |
| `frontend/src/components/auth/LoginFlow.tsx` | OTP login |
| `backend/src/routes/auth.ts` | Auth API endpoints |
| `database/schema.sql` | Database schema |
| `AUTH_FLOW.md` | Detailed auth documentation |

---

## Switching to Real SingPass

When SingPass sandbox is approved:

1. Update `shared/config.js`:
   ```javascript
   const USE_SINGPASS = true;
   ```

2. Implement SingPass OAuth route in `backend/src/routes/auth.ts`

3. Add SingPass button handler in frontend (UI stays the same)

**No database migrations needed** — schema already supports SingPass fields.

---

**Questions?** Check `AUTH_FLOW.md` for detailed flow documentation.
