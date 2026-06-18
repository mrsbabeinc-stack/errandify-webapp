# 🚀 Quick Start Testing Guide

## 60-Second Setup

```bash
# Terminal 1: Backend
cd backend && npm run dev

# Terminal 2: Frontend  
cd frontend && npm run dev

# Browser: http://localhost:5173
```

---

## 5-Minute Quick Test

### 1. Login (30 sec)
- Click "Demo: Login as Asker"
- See dashboard with categories

### 2. Post Errand (2 min)
- Click "+" button in bottom nav
- Fill form: Title, Description, Budget, Category
- Click "Post"
- Success! Errand now "Open"

### 3. Switch to Doer (30 sec)
- Click Profile → Logout
- Click "Demo: Login as Doer"

### 4. Bid on Errand (2 min)
- Click "Browse ToHelp"
- Find the errand you posted
- Click it → "Submit a Bid"
- Enter amount and note
- Submit bid

### 5. Back to Asker (1 min)
- Logout → Login as Asker
- Go to MyErrands → Click errand
- See the bid in "Bids" section
- Click "Accept" → Bid accepted!
- Status changes to "Confirmed"

### 6. Test Chat (1 min)
- See "Chat with Doer" button appears
- Click it → Chatbox opens
- Type message → Send
- Message appears instantly

### 7. Test Notifications (30 sec)
- Look at notification icon (🔊)
- Should show badge "1"
- Click it → see bid notification
- Click notification → marks as read

---

## Complete Testing Flow (90 minutes)

See **TESTING_CHECKLIST.md** for 11 detailed test modules covering:

1. ✅ Authentication
2. ✅ Profile Management  
3. ✅ Errand Creation (AI + Manual)
4. ✅ Errand Browsing
5. ✅ Bidding System
6. ✅ Chat & Real-time Messaging
7. ✅ Job Execution & Proof Upload
8. ✅ Reviews & Ratings
9. ✅ Hana AI (3 languages)
10. ✅ Notifications System
11. ✅ Error Handling

---

## Key Features to Verify

### Must Work
- [x] Demo login works
- [ ] Create errand (both AI & manual)
- [ ] Browse errands as doer
- [ ] Submit bid
- [ ] Accept bid (dummy payment OK)
- [ ] Chat between users
- [ ] Notifications show badge
- [ ] Messages persist & update

### Nice to Verify  
- [ ] Hana AI works in 3 languages
- [ ] Job completion flow
- [ ] Review submission
- [ ] Profile edits save
- [ ] CHAS card selection

### Can Test Later (After SingPass/Stripe)
- [ ] Real SingPass login
- [ ] Real Stripe payments
- [ ] Payment confirmations
- [ ] Dispute resolution

---

## Demo Accounts

```
ASKER
Email: sarah@example.com
Password: anything (demo mode)
Role: Asker

DOER  
Email: john@example.com
Password: anything (demo mode)
Role: Doer
```

Or create your own during signup!

---

## Troubleshooting

### Services won't start
```bash
# Check ports
lsof -i :3000   # Backend
lsof -i :5173   # Frontend

# If in use, kill and retry
kill -9 <PID>
```

### Database errors
```bash
# Verify database exists
psql -U postgres -d errandify -c "SELECT 1"

# Run migrations if needed
cd backend && npm run migrate
```

### Frontend shows blank
```bash
# Clear cache
rm -rf frontend/node_modules
cd frontend && npm install && npm run dev
```

---

## After Testing

1. **All modules pass?** → Move to Phase 2
2. **Found issues?** → Create ISSUES.md with list
3. **Ready to integrate?** → Follow SingPass & Stripe guides

---

**Status**: 🟢 Ready to Test  
**Time to Complete**: 60-90 minutes  
**After Testing**: Integrate SingPass & Stripe

Good luck! 🚀
