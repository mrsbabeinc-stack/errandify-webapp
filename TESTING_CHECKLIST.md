# 🧪 ERRANDIFY MVP - COMPREHENSIVE TESTING CHECKLIST

## ✅ PRE-TESTING REQUIREMENTS

Before testing, ensure:
- [ ] Backend server is running on port 3000
- [ ] Frontend is running on localhost:5173
- [ ] You can log in (use any mock credentials)
- [ ] Browser console is open (F12) to catch errors

---

## 📱 **PHASE 1: NAVIGATION & BASIC UI** 
### (No Backend Required - All Mock Data)

### 1. Landing & Login Page
- [ ] Navigate to `/` - Landing page loads
- [ ] Click "Get Started" → Goes to `/login`
- [ ] Login form displays correctly
- [ ] Use mock credentials (any email/password) → Should log in
- [ ] Redirect to `/home` after login ✅

### 2. Bottom Navigation
- [ ] 🏠 Home icon visible
- [ ] 📋 MyErrands icon visible
- [ ] ➕ Plus button (for askers) visible
- [ ] 🏘️ MyVillage icon visible
- [ ] 💬 Chat icon visible
- [ ] 💰 MyPocket icon visible
- [ ] 👤 MyAccount icon visible
- [ ] All buttons are clickable
- [ ] Active state highlights correctly (orange)

### 3. HomePage Dashboard
- [ ] Page loads with "Welcome back!"
- [ ] Role-specific greeting shows
- [ ] Quick action buttons visible
  - [ ] "Post Errand" (for askers)
  - [ ] "Browse Errands" (for doers)
- [ ] 16 Category grid displays
- [ ] Categories organized in 4 groups:
  - [ ] 🏠 Home & Household
  - [ ] 🚚 Errands & Logistics
  - [ ] ❤️ Care & Wellbeing
  - [ ] 💡 Skills & Services
- [ ] Hover on category → Tooltip appears with description
- [ ] Click category → Navigates to appropriate page

---

## 💼 **PHASE 2: MY POCKET (Wallet)**
### (Uses Mock Data)

### 1. Page Load
- [ ] Navigate to `/wallet` or `/my-pocket`
- [ ] Page loads with "MyPocket" title
- [ ] No console errors

### 2. Main Balance Card
- [ ] Large balance display (SGD format)
- [ ] "Payout Settings" button visible
- [ ] "Pending: SGD $150" badge shows (if pending)

### 3. Stats Grid
- [ ] Total Earned stat card shows
- [ ] Total Spent stat card shows
- [ ] Errandify Points card shows (⭐ 325 EP)
- [ ] All amounts formatted as SGD
- [ ] Colors are distinct (green/blue/orange)

### 4. Quick Actions
- [ ] "Redeem Rewards" button works
- [ ] "Points History" button works
- [ ] "Transaction History" button works
- [ ] Clicking navigates to appropriate pages

### 5. Recent Activity
- [ ] Transaction list displays
- [ ] Each transaction shows:
  - [ ] Description (e.g., "Completed: Clean apartment")
  - [ ] Amount (with +/- sign)
  - [ ] Date
  - [ ] "View Task" link (clickable)
- [ ] Color coding:
  - [ ] Green for earnings (+)
  - [ ] Blue for refunds
  - [ ] Gray for spending (-)

### 6. Mobile Responsiveness
- [ ] Shrink browser to 375px width
- [ ] Layout still looks good
- [ ] No horizontal scrolling
- [ ] Buttons are touch-friendly (44px+ height)

---

## 🏘️ **PHASE 3: MY VILLAGE (Community)**
### (Uses Mock Data)

### 1. Page Load
- [ ] Navigate to `/my-village`
- [ ] Page loads with "MyVillage" title
- [ ] No console errors

### 2. Tabs Navigation
- [ ] "❤️ Trusted" tab visible
- [ ] "🚫 Blocked" tab visible
- [ ] Default shows Trusted users
- [ ] Clicking Blocked tab switches view

### 3. Trusted Users Tab
- [ ] Shows list of trusted users
- [ ] Each user card displays:
  - [ ] Avatar (initials in circle)
  - [ ] Name
  - [ ] Role badge (👷 Doer / 📝 Asker)
  - [ ] ⭐ Rating
  - [ ] Number of completed tasks
  - [ ] Remove button
  - [ ] Block button
- [ ] Remove button is clickable
- [ ] Block button is clickable

### 4. Blocked Users Tab
- [ ] Switch to Blocked tab
- [ ] Shows blocked users (if any)
- [ ] Each card has Unblock button
- [ ] Unblock button is clickable

### 5. Referral Section
- [ ] Referral section visible at bottom
- [ ] "🎁 Invite & Earn" header shows
- [ ] "Share Referral Code" button visible
- [ ] Clicking goes to `/referral` page

### 6. Empty States
- [ ] When no data, shows appropriate message
- [ ] Empty state is user-friendly

---

## 🔄 **PHASE 4: RECURRING SESSIONS**
### (Uses Mock Data)

### 1. Page Load
- [ ] Navigate to `/recurring-sessions`
- [ ] Page loads with "🔄 Recurring Sessions" title
- [ ] No console errors

### 2. Filter Tabs
- [ ] "All" tab visible (shows count)
- [ ] "⏳ Pending" tab visible (shows count)
- [ ] "✅ Completed" tab visible (shows count)
- [ ] Default shows All
- [ ] Clicking tabs filters correctly

### 3. Session Cards
- [ ] Each session shows:
  - [ ] Task title (e.g., "Water Plants")
  - [ ] Date (formatted, e.g., "Tue, Jun 20")
  - [ ] Doer name (if assigned)
  - [ ] Status badge (colored: yellow/blue/green)
  - [ ] Progress bar (visual indicator)
  - [ ] Budget amount (SGD format)
- [ ] Status badges:
  - [ ] ⏳ Pending (yellow)
  - [ ] 👤 Assigned (blue)
  - [ ] ✅ Done (green)

### 4. Session Actions
- [ ] Pending sessions have "Mark Done" button
- [ ] Pending sessions have "Skip" button
- [ ] Buttons are clickable
- [ ] Completed sessions don't have action buttons

### 5. Progress Bars
- [ ] Progress bars show correctly
- [ ] Pending sessions: 0% (empty)
- [ ] Completed sessions: 100% (full)

---

## 📧 **PHASE 5: EMAIL NOTIFICATIONS**
### (No Backend Required - Settings Only)

### 1. Page Load
- [ ] Navigate to `/email-notifications`
- [ ] Page loads with "📧 Email Notifications" title
- [ ] No console errors

### 2. Master Toggle
- [ ] Toggle switch visible
- [ ] Toggle switches on/off
- [ ] When OFF, other options disable
- [ ] When ON, options become available

### 3. Digest Frequency (when enabled)
- [ ] Radio buttons for:
  - [ ] ⚡ Immediate
  - [ ] 📅 Daily Digest
  - [ ] 📆 Weekly Digest
- [ ] Can select different options
- [ ] Selection shows correctly

### 4. Notification Tiers
- [ ] 🔴 Critical section shows (red background)
  - [ ] Bid Accepted
  - [ ] Payment Released
  - [ ] Dispute Opened
  - [ ] All marked "Always"
- [ ] 🟡 Important section shows (yellow background)
  - [ ] Task Completed
  - [ ] New Bid Received
  - [ ] Review Received
  - [ ] Task Cancelled
  - [ ] Toggle switches work
- [ ] 🟢 Optional section shows (green background)
  - [ ] Message Received
  - [ ] Toggle switch works

### 5. Save Button
- [ ] "💾 Save Settings" button visible
- [ ] Clicking shows "Saving..." state
- [ ] Success message appears ("✅ Preferences saved!")
- [ ] Message disappears after 3 seconds

### 6. Mobile Responsiveness
- [ ] Shrink to 375px width
- [ ] Layout still works
- [ ] Toggles are touch-friendly

---

## ⭐ **PHASE 6: RATINGS & REVIEWS**
### (Uses Mock Data)

### 1. Page Load
- [ ] Navigate to `/ratings`
- [ ] Page loads with "⭐ Ratings & Reviews" title
- [ ] No console errors

### 2. Rating Summary (when viewing received)
- [ ] Large star rating displays (4.8)
- [ ] Star visualization shows (visual stars)
- [ ] Total reviews count shows (24 reviews)
- [ ] Distribution bars show:
  - [ ] 5⭐ bar (longest)
  - [ ] 4⭐ bar
  - [ ] 3⭐ bar (shortest)
  - [ ] 2⭐ bar
  - [ ] 1⭐ bar
- [ ] Numbers show correctly for each bar

### 3. Tabs Navigation
- [ ] "📥 Received" tab visible (with count)
- [ ] "📤 Given" tab visible (with count)
- [ ] Default shows Received
- [ ] Clicking Given tab switches view
- [ ] Summary disappears when viewing Given

### 4. Rating Cards
- [ ] Each rating shows:
  - [ ] Task title
  - [ ] Rater name
  - [ ] Star rating (visual stars)
  - [ ] Review text/comment
  - [ ] Date posted
- [ ] Stars are correct (5 stars = 5 filled)
- [ ] Dates are formatted (e.g., "6/19/2026")

### 5. Empty States
- [ ] When switching tabs with no data, shows message
- [ ] Message is appropriate for the view

---

## ⚖️ **PHASE 7: DISPUTES & CANCELLATION**
### (Uses Mock Data)

### 1. Page Load
- [ ] Navigate to `/disputes-management`
- [ ] Page loads with "⚖️ Disputes & Cancellations" title
- [ ] No console errors

### 2. Action Buttons
- [ ] "🚨 Raise Dispute" button visible
- [ ] Button is clickable

### 3. Filter Tabs
- [ ] "All" tab visible
- [ ] "🔴 Open" tab visible
- [ ] "✅ Resolved" tab visible
- [ ] Default shows All
- [ ] Clicking tabs filters correctly

### 4. Dispute Cards
- [ ] Each dispute shows:
  - [ ] Task title
  - [ ] Who raised it
  - [ ] Status badge (color-coded)
  - [ ] Reason description
  - [ ] Creation date
  - [ ] Evidence file count (if any)
- [ ] Status badges:
  - [ ] 🔴 Open (red)
  - [ ] ⏳ Pending (yellow)
  - [ ] ✅ Resolved (green)
  - [ ] 🔵 Appeal (blue)

### 5. Resolution Details
- [ ] Resolved disputes show resolution text
- [ ] Green background for resolution box
- [ ] Text shows details (e.g., "Refund SGD $150")

### 6. Actions
- [ ] Open disputes have "View & Update" button
- [ ] Button is clickable
- [ ] Resolved disputes don't have action button

---

## 🎨 **PHASE 8: 16-CATEGORY SYSTEM**
### (From HomePage)

### 1. Category Grid Display
- [ ] All 4 category groups visible:
  - [ ] 🏠 Home & Household
  - [ ] 🚚 Errands & Logistics
  - [ ] ❤️ Care & Wellbeing
  - [ ] 💡 Skills & Services
- [ ] Each group has 4 categories
- [ ] Total 16 categories visible

### 2. Category Cards
- [ ] Each category shows:
  - [ ] Large emoji icon
  - [ ] Category name
  - [ ] Proper styling with gradient background
  - [ ] Distinct color per category

### 3. Hover Tooltips
- [ ] Hover on category → Tooltip appears
- [ ] Tooltip shows:
  - [ ] Dark background (gray-800)
  - [ ] White text
  - [ ] Category purpose description
  - [ ] Arrow pointing to button
- [ ] Tooltip is positioned correctly above button
- [ ] Tooltip disappears when moving away

### 4. Click Navigation
- [ ] Click on category → Navigates appropriately
- [ ] Askers go to create-errand?category=XXX
- [ ] Doers go to browse?category=XXX

### 5. Responsive Grid
- [ ] Desktop (1200px+): 4 columns
- [ ] Tablet (768px): 2-4 columns
- [ ] Mobile (375px): 2 columns
- [ ] Layout looks good at all sizes

---

## 🤖 **PHASE 9: HANA FLOATING BUTTON**

### 1. Button Visibility
- [ ] Navigate to any page
- [ ] Floating button visible at bottom-right
- [ ] Button is positioned correctly (not hidden)
- [ ] Button is above BottomNav (z-index correct)

### 2. Button Appearance
- [ ] Shows Hana avatar image
- [ ] Circular shape
- [ ] Border visible
- [ ] Orange color scheme
- [ ] Size looks right (56px)

### 3. Button Interaction
- [ ] Hover → Button scales up slightly
- [ ] Click → Opens Hana chat modal
- [ ] Modal appears at correct position
- [ ] Modal is visible and readable

### 4. Modal Features
- [ ] Hana header shows with avatar
- [ ] Language selector (English, Mandarin, Cantonese)
- [ ] Message display area
- [ ] Input field for text
- [ ] Close button (X)
- [ ] Minimize button (−)
- [ ] Speaker toggle (🔊/🔇)

---

## 📋 **PHASE 10: HANA COPY ERRAND**

### 1. Access Copy Feature
- [ ] Navigate to `/errands` (My Errands)
- [ ] Errands list displays
- [ ] Each errand shows:
  - [ ] "View Details" button (orange)
  - [ ] "📋 Copy" button (blue) - **for askers only**

### 2. Copy Functionality
- [ ] Click Copy button on an errand
- [ ] Redirects to `/create-errand`
- [ ] Form is pre-filled with:
  - [ ] Title from copied task
  - [ ] Description from copied task
  - [ ] Category from copied task
  - [ ] Budget from copied task
  - [ ] Other fields from copied task
- [ ] All fields are editable
- [ ] User can modify before posting

### 3. Form Submission
- [ ] User can edit any field
- [ ] Can change title, budget, category, etc.
- [ ] Can submit to create new task
- [ ] New task should be created successfully

---

## 🔍 **CRITICAL CHECKS: Console Errors**

### 1. Open Browser Console (F12)
- [ ] No red error messages
- [ ] No "TypeError" messages
- [ ] No "Cannot read properties" errors
- [ ] No "404" resource errors
- [ ] No CORS errors (unless expected)

### 2. Network Tab
- [ ] HTML loads (200 status)
- [ ] CSS loads (200 status)
- [ ] JavaScript bundles load (200 status)
- [ ] Images load (200 status)
- [ ] No 404s for critical resources

### 3. Warnings (Yellow)
- [ ] React warnings about props (acceptable)
- [ ] Deprecation warnings (acceptable)
- [ ] Security warnings (check if serious)

---

## 📱 **RESPONSIVE DESIGN CHECKS**

### Mobile (375px width):
- [ ] All text readable
- [ ] No horizontal scrolling
- [ ] Buttons are 44px+ tall
- [ ] Spacing is appropriate
- [ ] Forms are usable

### Tablet (768px width):
- [ ] Layout looks balanced
- [ ] No wasted space
- [ ] Components arranged well
- [ ] Touch-friendly

### Desktop (1200px width):
- [ ] Content doesn't stretch too wide
- [ ] Sidebar/main layout clear
- [ ] White space balanced
- [ ] Professional appearance

---

## 🔐 **AUTHENTICATION CHECKS**

### 1. Login Flow
- [ ] Can log in with any credentials (mock)
- [ ] Token stored in localStorage
- [ ] Redirects to `/home` after login
- [ ] Session persists on page reload

### 2. Protected Routes
- [ ] Can't access `/my-pocket` without login
- [ ] Can't access `/my-village` without login
- [ ] Can't access `/errands` without login
- [ ] Redirects to `/login` when unauthorized

### 3. Logout
- [ ] Profile page has Logout button
- [ ] Clicking logs out
- [ ] Token cleared from localStorage
- [ ] Redirects to `/login`

---

## ⚠️ **KNOWN LIMITATIONS (Won't Work Yet)**

These features require backend/external services:

- [ ] ❌ SingPass integration (will come next)
- [ ] ❌ Stripe payments (will come next)
- [ ] ❌ Email sending (needs email service)
- [ ] ❌ Push notifications (needs service worker)
- [ ] ❌ Database persistence (mock data only)
- [ ] ❌ Criminal screening verification
- [ ] ❌ Qwen AI responses (if enabled)
- [ ] ❌ Real file uploads (would go to AWS S3)

---

## 📊 **TESTING SUMMARY TEMPLATE**

When you finish testing, fill in:

```
ERRANDIFY MVP TESTING REPORT
═════════════════════════════

Date Tested: ___________
Tester: __________________

PHASE 1 - Navigation: ☐ PASS ☐ FAIL
PHASE 2 - MyPocket: ☐ PASS ☐ FAIL
PHASE 3 - MyVillage: ☐ PASS ☐ FAIL
PHASE 4 - Sessions: ☐ PASS ☐ FAIL
PHASE 5 - Email Settings: ☐ PASS ☐ FAIL
PHASE 6 - Ratings: ☐ PASS ☐ FAIL
PHASE 7 - Disputes: ☐ PASS ☐ FAIL
PHASE 8 - Categories: ☐ PASS ☐ FAIL
PHASE 9 - Hana Button: ☐ PASS ☐ FAIL
PHASE 10 - Copy Errand: ☐ PASS ☐ FAIL

CONSOLE ERRORS: ☐ NONE ☐ MINOR ☐ CRITICAL
RESPONSIVE: ☐ EXCELLENT ☐ GOOD ☐ NEEDS WORK

Issues Found:
1. ___________________________________________
2. ___________________________________________
3. ___________________________________________

Overall Status: ___% Complete
```

---

## 🚀 **IF EVERYTHING PASSES**

You're ready for:
✅ User testing
✅ Demo to stakeholders
✅ Backend integration
✅ Real data connectivity

---

## ❌ **IF YOU FIND BUGS**

Please note:
1. Which phase/feature
2. What you did
3. What you expected
4. What happened instead
5. Console error (if any)

Then I can fix immediately!

