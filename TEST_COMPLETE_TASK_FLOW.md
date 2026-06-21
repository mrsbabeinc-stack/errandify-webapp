# 🧪 Complete Task Flow Testing Guide

**Goal:** Test entire task lifecycle from posting to completion  
**Time:** 20 minutes  
**Participants:** 2 users (Asker + Doer)

---

## Setup: Start with 2 Browser Windows 🖥️

### **Window 1: ASKER**
```
1. Open: http://localhost:5173
2. Click: "Demo: Login as Asker"
3. You're now logged in as Asker
```

### **Window 2: DOER**
```
1. Open new incognito window: http://localhost:5173
2. Click: "Demo: Login as Doer"
3. You're now logged in as Doer
```

**Keep both windows open side-by-side**

---

## PHASE 1: ASKER CREATES TASK ✏️

### **Step 1.1: Go to Create Task**
```
Window 1 (Asker):
  Menu → "Create Errand"
  OR
  Click "+" button in bottom nav
```

**Check:**
- [ ] Page loads without errors
- [ ] Hana floating button visible
- [ ] Back button in top-left
- [ ] All form fields show

### **Step 1.2: Fill Task Form**

```
Title: "Clean my apartment living room"
Description: "Need to vacuum, dust, and tidy up my living room. Takes about 2 hours. I have cleaning supplies ready."
Category: "Cleaning & Household"
Location: "Blk 123 Ang Mo Kio, Singapore 567890"
Budget: $45
Deadline: [Pick tomorrow's date]
Time: 14:00 (2 PM)
Recurring: No
```

**Check for errors:**
- [ ] Form accepts all inputs
- [ ] Validation shows helpful messages
- [ ] Budget field only accepts numbers
- [ ] Date picker works
- [ ] Category dropdown has 16 options

### **Step 1.3: Submit Task**

```
Click: "Post Errand"
```

**Check:**
- [ ] No form validation errors
- [ ] Success message appears
- [ ] Page redirects to home/errands list
- [ ] NEW task appears in list
- [ ] Task shows correct title, budget, location
- [ ] Task shows in "Open" status

**Browser Console Check** (F12):
- [ ] No red error messages
- [ ] API call succeeded (POST /api/errands)
- [ ] Response shows task ID

---

## PHASE 2: DOER BROWSES & BIDS 👀

### **Step 2.1: Doer Views Available Tasks**

```
Window 2 (Doer):
  Menu → "Browse Errands"
  OR
  Click "Browse" in bottom nav
```

**Check:**
- [ ] Page loads without errors
- [ ] YOUR ASKER'S task appears in list
- [ ] Task shows:
  - Title: "Clean my apartment living room"
  - Budget: $45
  - Location: "Blk 123 Ang Mo Kio"
  - Category: "Cleaning & Household"
  - Status: "Open"

### **Step 2.2: Doer Clicks Task**

```
Click on the task card
```

**Check:**
- [ ] Task detail page loads
- [ ] All info displays correctly
- [ ] See full description
- [ ] Hana floating visible
- [ ] Back button works

### **Step 2.3: Doer Places Bid**

```
Bid Amount: $40
Optional Note: "I'm experienced cleaner, can finish in 1.5 hours"
Click: "Place Bid" OR "Submit Bid"
```

**Check:**
- [ ] Bid field shows
- [ ] Can enter amount less than budget ($40 < $45) ✓
- [ ] Submit button works
- [ ] Success message appears
- [ ] Page updates showing bid submitted

**Browser Console Check:**
- [ ] POST /api/bids succeeds
- [ ] No error messages

---

## PHASE 3: ASKER ACCEPTS BID ✅

### **Step 3.1: Asker Sees New Bid**

```
Window 1 (Asker):
  Go to: Menu → "My Errands"
  OR
  Click task from home screen
```

**Check:**
- [ ] Task shows "1 bid received"
- [ ] Can see bid details:
  - Doer name
  - Doer rating
  - Bid amount: $40
  - Doer note (optional)

### **Step 3.2: Asker Accepts Bid**

```
Click: "Accept Bid"
```

**Check:**
- [ ] Bid marked as "Accepted"
- [ ] Task status changes from "Open" to "Accepted"
- [ ] Other bids (if any) are rejected
- [ ] Chat/messaging option appears
- [ ] Payment section shows (if applicable)

**Browser Console Check:**
- [ ] PATCH /api/bids/{id} succeeds
- [ ] No errors

---

## PHASE 4: DOER SEES ACCEPTANCE & CHATS 💬

### **Step 4.1: Doer Checks Status**

```
Window 2 (Doer):
  Go to: Menu → "My Bids"
```

**Check:**
- [ ] Bid shows as "Accepted"
- [ ] Can see task details
- [ ] Chat/messaging button available

### **Step 4.2: Both Chat**

**Asker Window 1:**
```
Click: "Chat with Doer"
Type: "Hi! See you at 2 PM tomorrow?"
Send
```

**Doer Window 2:**
```
Click: "Chat with Asker"
Type: "Yes! I'll be there at 1:50 PM"
Send
```

**Check:**
- [ ] Messages appear immediately
- [ ] Both can see each other's messages
- [ ] Timestamps show
- [ ] No loading errors
- [ ] Chat history persists

**Browser Console Check:**
- [ ] No WebSocket errors
- [ ] Messages POST successfully

---

## PHASE 5: TASK EXECUTION 🏃

### **Step 5.1: Simulate Task Start**

```
(Imagine it's now the scheduled time: 2 PM tomorrow)

Doer Window 2:
  Go to task
  Look for: "Start Task" or "In Progress" button
```

**Check:**
- [ ] Button to start task exists
- [ ] Can mark task as "In Progress"
- [ ] Status changes from "Accepted" to "In Progress"

### **Step 5.2: Doer Completes Task**

```
Look for: "Complete Task" or "Task Done" button

Click it
Look for: "Upload Evidence" or "Work Proof" option
```

**Check:**
- [ ] Evidence upload appears
- [ ] Can take photo/upload screenshot
- [ ] Optional description field works
- [ ] Submit button enabled

**If Evidence Upload Works:**
```
Upload a screenshot or image
Add note: "Cleaning complete! Everything sparkles"
Click: "Submit Evidence"
```

**Check:**
- [ ] Image uploaded successfully
- [ ] Task shows as "Awaiting Acceptance"
- [ ] Asker gets notification

**Browser Console Check:**
- [ ] No file upload errors
- [ ] POST /api/tasks/{id}/complete succeeds

---

## PHASE 6: ASKER VERIFIES & PAYS 🎉

### **Step 6.1: Asker Reviews Evidence**

```
Asker Window 1:
  Go to: Menu → "My Errands"
  Find: The cleaning task
```

**Check:**
- [ ] Can see work evidence/photos
- [ ] Can read doer's note
- [ ] "Accept Completion" or "Approve" button shows

### **Step 6.2: Asker Approves**

```
Click: "Accept Completion"
OR
Click: "Approve & Pay"
```

**Check:**
- [ ] Success message appears
- [ ] Task marked as "Completed"
- [ ] Payment processed (or marked as paid)
- [ ] Doer's balance/earnings increase

**Browser Console Check:**
- [ ] PATCH /api/tasks/{id} status=completed succeeds
- [ ] Payment endpoint called (POST /api/payments or similar)

---

## PHASE 7: BOTH RATE EACH OTHER ⭐

### **Step 7.1: Asker Rates Doer**

```
Asker Window 1:
  Should see: "Rate this doer" or "Leave review"
  Click it
```

**Check:**
- [ ] Rating form appears
- [ ] Can select 1-5 stars
- [ ] Can write review (optional)
- [ ] Submit works

```
Stars: 5
Review: "Excellent work! Very thorough, finished early, very professional!"
Submit
```

**Check:**
- [ ] Rating saved
- [ ] Success message
- [ ] Doer's rating updates (should show 5.0 if first rating)

### **Step 7.2: Doer Rates Asker**

```
Doer Window 2:
  Should see: "Rate this asker" or "Leave review"
  Click it

Stars: 5
Review: "Great communication, provided all supplies, paid promptly!"
Submit
```

**Check:**
- [ ] Asker's rating updates
- [ ] Both profiles now show ratings

**Browser Console Check:**
- [ ] POST /api/ratings succeeds
- [ ] No errors

---

## PHASE 8: CHECK FINAL STATE ✅

### **Step 8.1: Asker's View**

```
Window 1:
  Go to: Menu → "My Errands"
  Find: The cleaning task
```

**Check:**
- [ ] Task shows "Completed" status
- [ ] Rating displayed (5.0 stars)
- [ ] Amount paid shows ($40)
- [ ] Doer's name and photo visible
- [ ] Task archived or grayed out

### **Step 8.2: Doer's View**

```
Window 2:
  Go to: Menu → "My Bids"
  Find: The cleaning task
```

**Check:**
- [ ] Bid shows "Completed" status
- [ ] Rating displayed (5.0 stars)
- [ ] Amount earned shows ($40)
- [ ] Task history updated
- [ ] Earnings reflect in balance

### **Step 8.3: Check Profiles**

**Asker Profile:**
```
Menu → MyAccount → View Profile
```

**Check:**
- [ ] Rating shows (e.g., "5.0 ⭐")
- [ ] Completed tasks count: 1
- [ ] Recent activity shows completion

**Doer Profile:**
```
Menu → MyAccount → View Profile
```

**Check:**
- [ ] Rating shows (e.g., "5.0 ⭐")
- [ ] Completed tasks count: 1
- [ ] Earnings show (e.g., "$40 earned")
- [ ] Recent activity shows completion

### **Step 8.4: Check MyPocket/Wallet**

**Asker Window 1:**
```
Menu → MyPocket
```

**Check:**
- [ ] Balance shows (should be negative: -$40)
- [ ] "Spent" total includes $40
- [ ] Transaction history shows payment

**Doer Window 2:**
```
Menu → MyPocket
```

**Check:**
- [ ] Balance shows (should be positive: +$40)
- [ ] "Earned" total includes $40
- [ ] Transaction history shows earning
- [ ] EP Points updated (if any bonus)

---

## ERROR CHECKLIST 🐛

### **Common Errors to Look For:**

#### **Browser Console (F12 → Console):**
- [ ] No red error messages
- [ ] No "undefined" warnings
- [ ] No CORS errors (red cross icon)
- [ ] No 404 errors (404 = page not found)
- [ ] No 500 errors (500 = server error)

#### **API Issues:**
- [ ] All API calls return 200 or 201 (success)
- [ ] No 400 errors (bad request)
- [ ] No 401 errors (auth failed)
- [ ] No 500 errors (server error)

#### **UI Issues:**
- [ ] All pages load without blank screen
- [ ] All buttons clickable and responsive
- [ ] No "undefined" text displayed
- [ ] No missing images/broken layout
- [ ] Hana floating appears on all pages
- [ ] Back buttons work everywhere

#### **Data Issues:**
- [ ] Task details match what was entered
- [ ] Bid amount correct
- [ ] Chat messages persist
- [ ] Ratings saved correctly
- [ ] Balance calculations correct

---

## SPECIFIC ERROR TESTS 🔍

### **Test 1: Invalid Budget**
```
Go to: Create Errand
Budget: "abc" (letters instead of numbers)

Expected: Error message "Budget must be a number"
Actual: [WHAT HAPPENS?]
```

### **Test 2: Bid Higher Than Budget**
```
Go to: Create Errand
Budget: $30

Switch to Doer:
Bid Amount: $50 (higher than budget!)

Expected: Error "Bid cannot exceed budget"
Actual: [WHAT HAPPENS?]
```

### **Test 3: Missing Required Field**
```
Go to: Create Errand
Leave Title empty
Try to submit

Expected: Error "Title is required"
Actual: [WHAT HAPPENS?]
```

### **Test 4: Past Deadline**
```
Go to: Create Errand
Deadline: Yesterday's date

Expected: Error "Deadline must be in future"
Actual: [WHAT HAPPENS?]
```

### **Test 5: Double Accept Bid**
```
Asker accepts bid
Immediately click "Accept" again

Expected: Error "Already accepted"
Actual: [WHAT HAPPENS?]
```

---

## QUICK REFERENCE: Task Statuses 📊

| Status | Asker Can | Doer Can |
|--------|-----------|----------|
| **Open** | Cancel, Edit | View, Bid |
| **Accepted** | Cancel, Chat | Chat, Start, Cancel |
| **In Progress** | Chat, Monitor | Chat, Complete |
| **Awaiting Review** | Approve, Reject | Wait |
| **Completed** | Rate | Rate |
| **Cancelled** | View history | View history |

---

## REPORTING FORMAT 📝

When you find an error, report like this:

```
ERROR #1: [Brief Title]
Severity: Critical / Major / Minor
Steps to Reproduce:
  1. Click X
  2. Do Y
  3. See Z

Expected: [What should happen]
Actual: [What actually happened]
Console Error: [Copy error message if any]
Screenshot: [Attach if possible]
```

---

## SUCCESS CRITERIA ✅

**Full test passes if:**
- [ ] Can create task without errors
- [ ] Doer can find and bid on task
- [ ] Asker can accept bid
- [ ] Both can chat
- [ ] Doer can complete with evidence
- [ ] Asker can approve
- [ ] Both can rate
- [ ] All data saved correctly
- [ ] Balances/earnings updated
- [ ] No console errors
- [ ] All pages load

**Partial test passes if:**
- [ ] Create, bid, accept, chat work
- [ ] Minor UI issues only
- [ ] No data loss

**Test FAILS if:**
- [ ] Payment doesn't process
- [ ] Data corrupts
- [ ] Critical console errors
- [ ] Can't complete flow

---

## Time Estimate ⏱️

| Phase | Time |
|-------|------|
| Setup (2 windows) | 2 min |
| Create task | 3 min |
| Browse & bid | 2 min |
| Accept bid | 1 min |
| Chat | 2 min |
| Execute & complete | 3 min |
| Review & approve | 2 min |
| Rate each other | 2 min |
| Verify final state | 2 min |
| **TOTAL** | **~20 min** |

---

## Next: Bug Report

After testing, create a file:

`BUG_REPORT.txt`

List any errors found:
```
BUG #1: Title required error doesn't show
  - Page: CreateErrandPage
  - Expected: Red error message
  - Actual: Form just doesn't submit
  - Severity: Major

BUG #2: Console error on chat load
  - Error: "Cannot read property 'messages' of undefined"
  - Page: ChatPage
  - Severity: Critical
```

---

## Ready to Test? 🚀

**Start now:**
1. Open 2 browser windows
2. Login as Asker and Doer
3. Follow steps above
4. Note any errors
5. Report findings

**Good luck! Report back with any issues found.** 🧪

