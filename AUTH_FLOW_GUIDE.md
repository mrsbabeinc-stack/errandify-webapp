# 🔐 Authentication Flow Guide

## What Changed

Your app now has a **proper authentication flow** that:
1. Shows a clean home page (`/`) with Sign In / Sign Up options
2. Redirects to Sign In or Sign Up pages
3. Integrates with SingPass for both flows

---

## 📱 User Flow Diagram

```
User opens app (http://localhost:5173)
            ↓
    AuthPage displayed
            ↓
    ┌───────┴────────┐
    ↓                ↓
[Sign In Tab]   [Sign Up Tab]
    ↓                ↓
Option 1:       Enter Name
SingPass        & Phone
    ↓                ↓
    │            Click "Sign Up
    │            with SingPass"
    │                ↓
    └────────┬───────┘
             ↓
    SingPass Authentication
             ↓
    Account Created/Verified
             ↓
    Redirect to /home (Dashboard)
```

---

## 🎨 AuthPage Design

### Sign In Tab
```
┌─────────────────────────────────┐
│     Errandify                   │
│  Get things done. Earn rewards. │
├─────────────────────────────────┤
│ [Sign In]  [Sign Up]            │
├─────────────────────────────────┤
│ Email (optional)                │
│ [________________]              │
│                                 │
│ Password (optional)             │
│ [________________]              │
│                                 │
│ [🔐 Sign In with SingPass]     │
│                                 │
│ ─────── Or try demo ──────      │
│                                 │
│ [👩 Demo: Sarah]               │
│ [👨 Demo: John]                │
├─────────────────────────────────┤
│ Powered by SingPass & Stripe    │
└─────────────────────────────────┘
```

### Sign Up Tab
```
┌─────────────────────────────────┐
│     Errandify                   │
│  Get things done. Earn rewards. │
├─────────────────────────────────┤
│ [Sign In]  [Sign Up]            │
├─────────────────────────────────┤
│ Create your account using       │
│ SingPass - Singapore's national │
│ digital identity platform       │
│                                 │
│ Your Name                       │
│ [________________]              │
│                                 │
│ Phone Number                    │
│ [________________]              │
│                                 │
│ [🔐 Sign Up with SingPass]     │
│                                 │
│ By signing up, you agree to    │
│ Terms of Service & Privacy     │
├─────────────────────────────────┤
│ Powered by SingPass & Stripe    │
└─────────────────────────────────┘
```

---

## 🔌 Sign In Flow (Real)

### 1. User clicks "Sign In with SingPass"

```typescript
// Frontend: AuthPage.tsx
const handleSingPassLogin = async () => {
  // Send to mock endpoint (testing) or real SingPass
  const response = await axios.post(
    '/api/mock-auth/mock-singpass-login',
    { email, password }
  );
  
  // Save token & user
  localStorage.setItem('token', response.data.token);
  localStorage.setItem('user', JSON.stringify(response.data.user));
  
  // Redirect to home
  onLogin(userData.role);
};
```

### 2. Backend authenticates with SingPass

```typescript
// Backend: routes/mockAuth.ts (for testing)
// In production: routes/auth.ts uses real SingPass API
POST /api/mock-auth/mock-singpass-login
Request: { email, password }
Response: {
  success: true,
  data: {
    user: { id, nric, name, email, phone, role },
    token: "jwt_token_here"
  }
}
```

### 3. Redirect to Dashboard

```
/auth (AuthPage) → /home (Dashboard)
```

---

## 🔌 Sign Up Flow (Real)

### 1. User enters name & phone, clicks "Sign Up with SingPass"

```typescript
// Frontend: AuthPage.tsx
const handleSignupSingPass = async () => {
  // Step 1: Get SingPass authorization URL
  const authResponse = await axios.get('/api/auth/singpass-authorize');
  
  // In real: redirect to SingPass login
  // For testing: use mock callback
  const callbackResponse = await axios.get('/api/mock-auth/mock-singpass-callback');
  
  // Step 2: Create account with SingPass data
  const signupResponse = await axios.post('/api/auth/signup', {
    nric: singpassData.sub,
    displayName,
    email: singpassData.email,
    phone,
    role: 'asker',
    singpassVerified: true
  });
  
  // Step 3: Auto-login
  localStorage.setItem('token', signupResponse.data.token);
  onLogin(userData.role);
};
```

### 2. SingPass returns user data

```
GET /api/mock-auth/mock-singpass-callback
Response: {
  success: true,
  data: {
    userData: {
      sub: "NRIC",
      name: "John Lee",
      email: "john@example.com",
      phone_number: "+6581234567",
      birthdate: "1990-01-01"
    }
  }
}
```

### 3. Backend creates account

```typescript
// Backend: routes/auth.ts
POST /api/auth/signup
Request: {
  nric: "1234567890ABC",
  displayName: "John Lee",
  email: "john@example.com",
  phone: "+6581234567",
  role: "asker",
  singpassVerified: true
}
Response: {
  success: true,
  data: {
    user: { id, nric_hash, display_name, email, mobile, role },
    token: "jwt_token_here"
  }
}
```

### 4. Auto-login and redirect

```
/auth (AuthPage) → /home (Dashboard)
```

---

## 📁 Files Involved

### Frontend
- `src/pages/AuthPage.tsx` ← **NEW** Main authentication page
- `src/App.tsx` ← Updated routing
  - `/` → AuthPage
  - `/auth` → AuthPage
  - `/login` → Redirect to `/auth`

### Backend
- `src/routes/auth.ts` ← Real SingPass
- `src/routes/mockAuth.ts` ← Testing (already created)
- `src/services/singpass.ts` ← SingPass client (already created)

---

## 🧪 Testing the Auth Flow

### Test Environment Setup
```bash
# Terminal 1: Backend
cd backend
npm start
# Output: Server running on http://localhost:3000

# Terminal 2: Frontend
cd frontend
npm run dev
# Output: Local: http://localhost:5173
```

### Test Sign In
1. Open http://localhost:5173
2. You see AuthPage with Sign In tab active
3. Click "Sign In with SingPass"
4. ✅ Auto-login with mock data
5. ✅ Redirect to /home (Dashboard)

### Test Sign Up
1. Open http://localhost:5173
2. Click "Sign Up" tab
3. Enter:
   - Name: "Sarah Lee"
   - Phone: "+65 9876 5432"
4. Click "Sign Up with SingPass"
5. ✅ Account created with SingPass data
6. ✅ Auto-login
7. ✅ Redirect to /home (Dashboard)

### Test Demo Accounts
1. Open http://localhost:5173
2. Sign In tab → Click "Demo: Sarah"
3. ✅ Login as Sarah (asker/doer)
4. ✅ Redirect to /home

---

## 🔄 How It Works in Production

### Real SingPass Flow
```
1. Frontend requests /api/auth/singpass-authorize
2. Backend returns SingPass authorization URL
3. Frontend redirects user to SingPass login page
4. User logs in with their Singapore ID
5. SingPass redirects back to your app with authorization code
6. Frontend sends code to /api/auth/singpass-callback
7. Backend exchanges code for access token
8. Backend retrieves user data from SingPass
9. Backend creates/finds user in database
10. Frontend stores JWT token
11. User logged in ✅
```

### For Testing (Current)
```
Steps 1-9 are simulated with mock endpoints
User gets logged in with test data
Same final result - JWT token + user data
```

---

## 🔒 Security Features

✅ **SingPass Authentication**
- National ID verification
- OAuth2 flow
- No password storage
- NRIC hashed in database

✅ **JWT Tokens**
- Stored in localStorage
- Sent with every API request
- Expires after 7 days
- Can be revoked on logout

✅ **HTTPS Ready**
- All API calls support HTTPS
- SingPass requires HTTPS
- Stripe requires HTTPS

---

## 📊 User Roles

After login, users can have roles:

```typescript
interface User {
  id: number;
  nric_hash: string;
  display_name: string;
  email: string;
  phone: string;
  role: 'asker' | 'doer';  // Can toggle between roles
}
```

Users can switch roles in the dashboard using the role toggle button.

---

## 🚀 Next Steps

1. **Test the auth flow** (today)
   - Sign In with SingPass
   - Sign Up with SingPass
   - Use demo accounts
   - Switch roles

2. **Activate real SingPass** (before production)
   - Get SingPass staging credentials
   - Update environment variables
   - Test with real SingPass account

3. **Deploy to production** (when ready)
   - Use real SingPass API
   - Use real Stripe API
   - HTTPS configured
   - Email verification (optional)

---

## 📞 API Endpoints

### Authentication
- `GET /api/auth/singpass-authorize` - Get SingPass login URL
- `POST /api/auth/singpass-callback` - Handle OAuth callback (real)
- `POST /api/auth/signup` - Create new account
- `POST /api/auth/demo-login` - Demo login (testing only)

### Testing
- `POST /api/mock-auth/mock-singpass-login` - Mock login
- `GET /api/mock-auth/mock-singpass-callback` - Mock OAuth

---

## ✅ Success Checklist

- [ ] Open http://localhost:5173
- [ ] See AuthPage with Sign In / Sign Up tabs
- [ ] Click Sign In → See form
- [ ] Click Sign Up → See different form
- [ ] Click "Sign In with SingPass"
- [ ] Auto-login succeeds
- [ ] Redirect to /home (Dashboard)
- [ ] Click logout → Return to /auth
- [ ] Click Sign Up tab
- [ ] Enter name & phone
- [ ] Click "Sign Up with SingPass"
- [ ] New account created
- [ ] Auto-login succeeds
- [ ] Redirect to /home
- [ ] Try demo accounts (Sarah, John)
- [ ] All work correctly ✅

---

## 🎉 Auth Flow is Complete!

Your Errandify app now has:
- ✅ Professional auth page
- ✅ Sign In with SingPass
- ✅ Sign Up with SingPass
- ✅ Demo accounts for testing
- ✅ Role-based access
- ✅ JWT token management
- ✅ Secure password handling (SingPass)

**Ready to test!** 🚀

