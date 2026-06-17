# Complete Feature Testing Guide - Errandify Platform
**Date**: 2026-06-18  
**Status**: ✅ READY TO TEST  
**Estimated Time**: 60-90 minutes for full test

---

## Pre-Test Setup (10 minutes)

### Step 1: Start Backend
```bash
cd /Users/celestia/Claude\ code/260616\ Errandify\ WebApp/backend
npm install  # If first time
npm run dev
```

**Expected Output:**
```
Errandify API running on port 3000
Environment: development
SingPass enabled: false
```

### Step 2: Start Frontend (New Terminal)
```bash
cd /Users/celestia/Claude\ code/260616\ Errandify\ WebApp/frontend
npm install  # If first time
npm run dev
```

**Expected Output:**
```
VITE v4.x.x  ready in xxx ms

➜  Local:   http://localhost:5173/
```

### Step 3: Open Browser
- Go to: http://localhost:5173
- You should see Errandify landing page

---

## Test 1: Authentication (5 minutes)

### 1.1 Register New User

**Steps:**
1. Click "Login" button
2. Click "Create Account" link
3. Fill form:
   - Email: `test.asker@example.com`
   - Password: `Test@123456`
   - Confirm Password: `Test@123456`
   - Select Role: **Asker**
   - Accept Terms checkbox

**What to check:**
- ✅ Form validates (password must be 8+ chars with uppercase)
- ✅ No console errors (F12 → Console tab)
- ✅ "Account created" message appears
- ✅ Redirects to home page after signup

**Expected**: New user account created

---

### 1.2 Login Test

**Steps:**
1. Already logged in from above
2. Check localStorage has `token` and `user` stored:
   ```javascript
   // Open browser console (F12) and run:
   localStorage.getItem('token')  // Should show JWT token
   localStorage.getItem('user')   // Should show user JSON with id, name, role
   ```

**What to check:**
- ✅ JWT token starts with `eyJ...`
- ✅ User object contains: id, name, role, email
- ✅ Home page loads without errors

**Expected**: Logged in successfully

---

### 1.3 Logout Test

**Steps:**
1. Click Profile icon (top-right)
2. Find "Logout" button
3. Click "Logout"

**What to check:**
- ✅ Redirected to login page
- ✅ localStorage cleared (token & user gone)
- ✅ Cannot access protected pages

**Expected**: Successfully logged out

---

## Test 2: Profile Management (5 minutes)

### 2.1 View & Edit Profile

**Steps:**
1. Login again with:
   - Email: `test.asker@example.com`
   - Password: `Test@123456`
2. Click Profile icon → "MyProfile"
3. Check profile displays:
   - User name
   - Verified badge
   - Stats (Trusted Users, Errands Completed, Errands Posted)

**What to check:**
- ✅ Profile page loads
- ✅ User info displayed correctly
- ✅ Verified badge shows
- ✅ Stats show (even if 0)

**Expected**: Profile information loaded

### 2.2 CHAS Card Selection

**Steps:**
1. In profile, scroll to "Personal Information"
2. Find "CHAS Card Status" field
3. Select card color:
   - Try: **🟦 Blue Card**
4. Click "Save" (if button exists) or auto-saves
5. Refresh page (F5)
6. Check CHAS card is still selected

**What to check:**
- ✅ Can select card color
- ✅ Selection saves to database
- ✅ Selection persists after refresh
- ✅ Shows eligibility: "25% discount"