# 🧪 Quick Start Testing Guide

## Prerequisites
- Node.js installed
- PostgreSQL running locally
- `.env` files configured

---

## Step 1: Start Backend Server

```bash
cd backend
npm install  # If needed
npm start
```

**Expected output:**
```
Server running on http://localhost:3000
Database connected
```

---

## Step 2: Start Frontend App

**In a new terminal:**
```bash
cd frontend
npm install  # If needed
npm run dev
```

**Expected output:**
```
Local: http://localhost:5173
```

---

## Step 3: Open Your Browser

Go to: `http://localhost:5173`

---

## 🎬 What to Test

### 1. Login (Mock - Using Test Account)
- Click login button
- Use: Email: `test@example.com` Password: `test123`
- See: Dashboard loads

### 2. Create Task (Using Hana AI)
- Click "+" button or "Create Task"
- Describe task: "Need help with furniture assembly"
- See: Hana extracts details (category, location, deadline, budget)
- Click create
- See: Task appears in dashboard

### 3. Chat Feature
- Click on a task
- Click "Chat" button
- Type: "Hello, ready to help?"
- See: Message appears with timestamp
- Online status shows as 🟢 Green
- Try: Upload a file (click 📎)

### 4. Postal Code Display
- View task details
- See location format: "433 Choa Chu Kang Ave 4, #10-51 S680433"
- Postal code shows as S + 6 digits

### 5. Audio Playback
- In chat, click 🔊 Listen button
- See: "Playing..." text
- Hear: Qwen AI reads message aloud
- Try: Different voices (if available)

### 6. Bidding System
- Switch to different user role (asker/doer)
- Place bid on task
- See: Bid appears in task
- Asker accepts/rejects bid

### 7. Notifications
- Perform actions (bid, message, etc)
- See: Bell icon shows count (updates every 3 seconds)
- Click bell 🔔
- See: Notification list with search & filter
- Try: Mark as read, filter by type

### 8. Activity Timeline
- View task details
- Scroll down to "Activity Timeline"
- See: Posted → Bid → Accepted → Confirmed → Started → Completed
- Shows timestamps and actor names

### 9. Rating System
- After task completion
- Click "Rate this task"
- Give 5-star rating
- Write review
- See: Both asker and doer ratings

---

## 🔧 Testing Common Flows

### Flow 1: Complete Task (Happy Path)
1. User A creates task
2. User B views task
3. User B places bid
4. User A accepts bid
5. Offer gets confirmed
6. User B starts job
7. User B completes job
8. User A rates User B
9. Task marked as completed
10. Both see activity timeline

### Flow 2: Chat & Messaging
1. Open task
2. Click Chat
3. Both users see messages in real-time
4. Upload file
5. See file info in message
6. Click Listen to hear message

### Flow 3: Notifications
1. User A creates task
2. User B places bid → User A gets notification
3. User A accepts → User B gets notification
4. User A marks as read → Count updates
5. Search notifications by keyword
6. Filter by type (Offers, Messages, Status)

---

## ⚙️ Test Data Available

### Test Users (Built-in)
- User ID: 1, 2, 3, 4, 5, 6, 8
- Password: (all use SingPass mock)
- Can switch roles: Asker ↔ Doer

### Test Tasks
- Sample tasks already in database
- Different categories, budgets, locations
- Some with bids, some completed

### Test Data to Use
**Location Format:** "433 Choa Chu Kang Ave 4, #10-51"
**Postal Code:** Will show as "S680433"
**Budget:** SGD 50-500
**Deadline:** Any future date

---

## 🐛 Common Issues & Fixes

### Issue: Port 3000 already in use
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9
npm start
```

### Issue: Database connection error
```bash
# Check PostgreSQL is running
psql -U postgres -d errandify_db -c "SELECT 1"
```

### Issue: Frontend won't load
```bash
# Clear node modules and reinstall
rm -rf frontend/node_modules
cd frontend
npm install
npm run dev
```

### Issue: API calls failing (CORS)
```bash
# Make sure backend is running
curl http://localhost:3000/api/notifications
# Should return a JSON response
```

---

## ✅ Testing Checklist

### Basic Setup
- [ ] Backend starts without errors
- [ ] Frontend loads at localhost:5173
- [ ] Can log in with test account
- [ ] Dashboard displays tasks

### Chat System
- [ ] Can open chat
- [ ] Can send message
- [ ] Message appears in real-time
- [ ] Can upload file
- [ ] Online status shows correctly

### Postal Code
- [ ] Location displays with format "Address Sxxxxxx"
- [ ] Postal code is 6 digits with S prefix
- [ ] Works on task detail and chat

### Notifications
- [ ] Bell icon shows notification count
- [ ] Count updates every 3 seconds
- [ ] Can mark as read
- [ ] Can search notifications
- [ ] Can filter by type

### Audio
- [ ] 🔊 Listen button appears on messages
- [ ] Can click to hear message
- [ ] Shows "Playing..." status
- [ ] Audio plays without errors

### Activity Timeline
- [ ] Timeline appears on task detail
- [ ] Shows multiple events
- [ ] Has timestamps
- [ ] Professional layout

### Bidding
- [ ] Can place bid on task
- [ ] Asker can see bids
- [ ] Can accept/reject bids
- [ ] Confirmed bids lock task editing

---

## 📊 What to Look For

### Performance
- [ ] Page loads in < 2 seconds
- [ ] Chat messages appear instantly
- [ ] Notifications update smoothly
- [ ] No console errors

### UI/UX
- [ ] Mobile responsive
- [ ] Colors match Errandify branding
- [ ] All buttons work
- [ ] Text is readable
- [ ] Bottom navigation works

### Data
- [ ] User data persists
- [ ] Messages are saved
- [ ] Notifications are stored
- [ ] Activity timeline is accurate
- [ ] Bid history is tracked

---

## 🎯 Success Criteria

**You'll know it's working when:**
1. ✅ Can log in
2. ✅ Can create task
3. ✅ Can chat with another user
4. ✅ Postal code shows as "S123456" format
5. ✅ Bell icon shows notification count
6. ✅ Can listen to messages with audio
7. ✅ Activity timeline shows all events
8. ✅ Can bid and accept/reject offers
9. ✅ Complete task flow works
10. ✅ No errors in browser console

---

## 📝 Testing Notes

**Take notes on:**
- What works well
- What needs improvement
- Any bugs you find
- UI/UX feedback
- Performance issues
- Missing features

**Report format:**
```
Feature: [Feature Name]
Status: ✅ Working / ❌ Bug / ⚠️ Needs Work
Notes: [What happened]
Impact: [How critical]
```

---

## 🚀 After Testing

1. Document findings
2. List bugs found
3. Note improvements needed
4. Test again after fixes
5. Repeat until satisfied

---

## 📞 If Something Breaks

1. Check backend is running: `curl http://localhost:3000/api/notifications`
2. Check frontend is running: `curl http://localhost:5173`
3. Check database: `psql -U postgres -d errandify_db`
4. Check `.env` files are correct
5. Check no errors in terminal
6. Restart both servers

---

**Ready to test? Start the backend and frontend now!** 🎬
