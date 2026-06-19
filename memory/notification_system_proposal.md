---
name: notification_system_proposal
description: Proposed notification system architecture for webapp - real-time, UI components, user preferences
metadata:
  type: project
  status: proposal
  date: 2026-06-19
---

# Notification System Proposal for Errandify Webapp

## PROBLEM STATEMENT

Users need to know when:
- Their bid was accepted/rejected
- Task is reopened (doer cancelled)
- Payment released
- Task completed
- Review left

Currently: Notifications stored in DB but NOT displayed in UI

---

## PROPOSED SOLUTION: 3-LAYER NOTIFICATION SYSTEM

### LAYER 1: NOTIFICATION BELL (Always visible) 🔔
```
Header/Navbar: 
┌─────────────────────────────────┐
│  Errandify   [🔔(3)]  [👤]      │  ← Bell icon with unread count
└─────────────────────────────────┘

Click bell → Dropdown/Sidebar opens:
┌────────────────────────────────┐
│ NOTIFICATIONS            [✓ All read]
├────────────────────────────────┤
│ 🎯 Task Available Again!      │
│    "Cleaning House" $95 ready  │
│    2 mins ago                  │
│    [Accept Now] → action link  │
├────────────────────────────────┤
│ 💰 Bid Accepted!              │
│    Your bid of $120 accepted!  │
│    5 hours ago                 │
├────────────────────────────────┤
│ ✅ Payment Released           │
│    $115 released to wallet     │
│    1 day ago                   │
└────────────────────────────────┘
```

**Features:**
- ✓ List of all notifications
- ✓ Unread count badge
- ✓ Timestamp (e.g., "2 mins ago")
- ✓ Action buttons (Accept, Pay, Review)
- ✓ Mark as read on click
- ✓ Clear all button
- ✓ Infinite scroll load more

---

### LAYER 2: TOAST NOTIFICATIONS (Temporary popups) 🍞
```
When important event happens (while user is on page):

┌─────────────────────────────────────┐
│ 🎯 Task Available Again!            │
│ "Cleaning House" reopened!          │
│ Your bid of $95 ready.              │
│                  [Accept Now] [✕]   │
└─────────────────────────────────────┘
  (Auto-dismiss after 5-10 seconds)
```

**When to show:**
- User just cancelled a bid (show success)
- New notification arrives (if real-time WebSocket enabled)
- User accepts/rejects something (confirmation)

**Behavior:**
- Auto-dismiss after 5-10 seconds
- Click action → goes to URL
- Click X → dismiss immediately
- Stack multiple toasts (up to 3)

---

### LAYER 3: PAGE INTEGRATION (In-context notifications)
```
Example: On Errand Detail Page

If task is reopened:
┌─────────────────────────────────────┐
│ ⚠️ Task Status Changed              │
│ Doer cancelled. Task reopened.      │
│ You can accept other bids or wait.  │
│                         [Dismiss]   │
└─────────────────────────────────────┘

Example: On My Bids Page

Bid card shows:
┌──────────────────────────────────────┐
│ Cleaning House - $95 bid             │
│ Status: ⭕ Pending                   │
│ 🔔 Task reopened!                    │
│    Original doer cancelled.          │
│    [Accept This Bid] [View Details]  │
└──────────────────────────────────────┘
```

---

## IMPLEMENTATION PLAN

### PHASE 1: Core Components (Week 1) ⭐ RECOMMENDED START

**Files to create:**
1. `frontend/src/components/NotificationBell.tsx` - Bell icon + dropdown
2. `frontend/src/hooks/useNotifications.ts` - Fetch & manage notifications
3. `frontend/src/components/NotificationToast.tsx` - Toast popup
4. `frontend/src/context/NotificationContext.tsx` - Global state

**Simple architecture:**
```
App.tsx
├─ NotificationContext (global state)
│  └─ notifications: []
│  └─ addNotification(type, message, action)
│  └─ dismissNotification(id)
├─ NotificationBell (header)
│  └─ Shows list, click action
└─ NotificationToastContainer (bottom-right)
   └─ Stacked toasts

Every API call that creates notification:
├─ Backend: saves to DB + returns response
└─ Frontend: addNotification() → shows toast
```

**No WebSocket yet** - just polling (simpler, works immediately)

**Files to modify:**
- `frontend/src/pages/ErrandDetailPage.tsx` - Import NotificationBell
- `frontend/src/layouts/MainLayout.tsx` - Add NotificationBell to header
- All API calls - show toast after success

---

### PHASE 2: Enhanced Features (Week 2+)

**Add WebSocket real-time:**
```
1. When doer cancels bid
2. Backend emits: socket.emit('bidCancelled', {doerId, errandId})
3. Frontend listens: socket.on('bidCancelled', () => showToast())
4. No page refresh needed - instant notification
```

**Add notification preferences:**
```
Settings page:
✓ Email notifications
✓ In-app toast notifications
✓ Sound alerts
✓ Do not disturb (9pm - 7am)

NotificationBell respects these settings
```

**Add notification filtering:**
```
NotificationBell dropdown:
├─ All Notifications
├─ Bid Updates
├─ Payments
├─ Tasks
└─ Reviews

User can filter by type
```

---

## WHAT NOTIFICATIONS TO SHOW

### HIGH PRIORITY (Toast + Bell) 🔴
- ✅ Bid accepted! (action: View task)
- ✅ Task available again - previous bid reopened (action: Accept Now)
- ✅ Payment released! (action: View wallet)
- ✅ Task completed - ready to rate (action: Leave Review)

### MEDIUM PRIORITY (Bell only) 🟡
- 📌 Bid rejected (with reason if provided)
- 📌 New bid received (for asker)
- 📌 Task marked complete by asker (action: Confirm)
- 📌 Review received (action: View profile)

### LOW PRIORITY (Bell only) 🟢
- 💬 Message received
- 🎁 Referral bonus earned
- 📊 Profile viewed

---

## NOTIFICATION DATA STRUCTURE

```typescript
interface Notification {
  id: number;
  userId: number;
  type: 'bid_accepted' | 'bid_rejected' | 'task_reopened' | 
        'payment_released' | 'task_completed' | 'review_received';
  title: string;
  body: string;
  actionUrl?: string;  // e.g., "/errand/123/accept-bid/95"
  actionLabel?: string; // e.g., "Accept Now"
  icon?: string;  // emoji like 🎯, 💰, ✅
  read: boolean;
  createdAt: Date;
}
```

---

## FRONTEND ARCHITECTURE

### NotificationBell.tsx
```typescript
function NotificationBell() {
  const { notifications, unreadCount, dismissNotification } = useNotifications();
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Bell icon in header */}
      <button onClick={() => setOpen(!open)}>
        🔔 {unreadCount > 0 && <span className="badge">{unreadCount}</span>}
      </button>

      {/* Dropdown list */}
      {open && (
        <NotificationDropdown
          notifications={notifications}
          onDismiss={(id) => {
            dismissNotification(id);
            markAsRead(id);
          }}
          onAction={(url) => {
            navigate(url);
            setOpen(false);
          }}
        />
      )}
    </>
  );
}
```

### useNotifications.ts
```typescript
function useNotifications() {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    // Fetch on mount
    fetchNotifications();

    // Poll every 10 seconds (simple, no WebSocket)
    const interval = setInterval(fetchNotifications, 10000);
    return () => clearInterval(interval);
  }, []);

  async function fetchNotifications() {
    const res = await axios.get('/api/notifications');
    setNotifications(res.data.notifications);
  }

  return { notifications, unreadCount, dismissNotification };
}
```

### NotificationToast.tsx
```typescript
function NotificationToast({ notification, onDismiss }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 8000); // Auto dismiss
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="fixed bottom-4 right-4 bg-white rounded shadow-lg p-4">
      <div className="flex items-start">
        <span className="text-2xl mr-3">{notification.icon}</span>
        <div className="flex-1">
          <p className="font-bold">{notification.title}</p>
          <p className="text-sm text-gray-600">{notification.body}</p>
          {notification.actionUrl && (
            <Link to={notification.actionUrl} className="text-errandify-orange font-semibold text-sm">
              {notification.actionLabel || 'View'}
            </Link>
          )}
        </div>
        <button onClick={onDismiss}>✕</button>
      </div>
    </div>
  );
}
```

---

## EXAMPLE: DOER CANCELS - FULL FLOW

### What Happens:

**Backend:**
1. Doer clicks POST /api/bids/:bidId/cancel
2. Task reopens
3. Previous bidders found
4. For each bidder:
   ```typescript
   await notifyTaskReopenedAfterCancellation(
     doerId: 456,
     taskTitle: "Cleaning House",
     bidAmount: 95,
     errandId: 123
   );
   ```
5. This creates notification in DB:
   ```
   {
     user_id: 456,
     type: 'task_reopened_for_bid',
     title: '🎯 Task Available Again!',
     body: '"Cleaning House" is available! Your bid of $95 ready.',
     actionUrl: '/errand/123/reaccept-bid/95',
     actionLabel: 'Accept Now'
   }
   ```

**Frontend (Real-time if WebSocket):**
1. User 456 (Doer B) has NotificationBell in header
2. WebSocket receives 'notification.created' event
3. Toast appears: "🎯 Task Available Again! ... [Accept Now]"
4. User clicks [Accept Now]
5. Redirects to /errand/123/reaccept-bid/95
6. Auto-fills their previous $95 bid
7. One click to accept ✓

**Frontend (If polling):**
1. NotificationBell polls every 10s
2. New notification fetched
3. Shows in notification list
4. User clicks [Accept Now]
5. Same flow as above

---

## PROPOSED TIMELINE

| Phase | Feature | Time | Priority |
|-------|---------|------|----------|
| **Phase 1a** | NotificationBell component | 2 hours | ⭐ Start here |
| **Phase 1b** | useNotifications hook (polling) | 1 hour | ⭐ |
| **Phase 1c** | NotificationToast component | 1 hour | ⭐ |
| **Phase 1d** | Integration into all API calls | 2 hours | ⭐ |
| **Phase 2a** | WebSocket real-time notifications | 3 hours | 🟡 Later |
| **Phase 2b** | Notification preferences/settings | 2 hours | 🟡 Later |
| **Phase 2c** | Notification filtering | 1 hour | 🟡 Later |

---

## RECOMMENDATION: START WITH PHASE 1a

Why Phase 1a first?
- ✅ Simplest to implement (just UI + hooks)
- ✅ No backend changes needed (DB already has notifications)
- ✅ Works immediately with polling
- ✅ User gets visual feedback
- ✅ Can add WebSocket later without major refactor

Simple polling (every 10s) is enough for MVP:
- Users don't need instant (within 10 seconds is fine)
- No complex WebSocket infrastructure
- Fewer bugs to manage
- Easier to test

---

## DATABASE - ALREADY READY ✓

Good news! The `notifications` table already exists and we're writing to it:
```sql
notifications {
  id, user_id, title, body, type, read, created_at, action_url
}
```

No migrations needed! Just build the UI.

---

## FILES TO CREATE (Phase 1)

```
frontend/src/
├─ components/
│  ├─ NotificationBell.tsx (NEW)
│  ├─ NotificationToast.tsx (NEW)
│  └─ NotificationDropdown.tsx (NEW)
├─ hooks/
│  └─ useNotifications.ts (NEW)
├─ context/
│  └─ NotificationContext.tsx (NEW)
└─ layouts/
   └─ MainLayout.tsx (MODIFY - add NotificationBell to header)
```

Then update:
- All components that call API success → show toast
- ErrandDetailPage, CreateErrandPage, etc.

---

## MY RECOMMENDATION ⭐

**Start with Phase 1a (NotificationBell):**

1. **Hour 1-2:** Build NotificationBell.tsx + NotificationDropdown.tsx
2. **Hour 3:** Build useNotifications.ts hook (with polling)
3. **Hour 4:** Build NotificationToast.tsx
4. **Hour 5:** Integrate into MainLayout header
5. **Hour 6:** Add toast calls to API success flows

**Result:** Working notification system in 6 hours

**Then later (Phase 2):** Add WebSocket when time permits

**Why this approach:**
- ✅ Fast implementation
- ✅ Immediate user feedback
- ✅ Solves the main problem (users don't miss important events)
- ✅ Can iterate and improve incrementally
- ✅ No complex infrastructure needed yet

---

## NEXT STEPS

Ready to build Phase 1a?
1. Create NotificationBell.tsx
2. Create useNotifications.ts hook
3. Create NotificationToast.tsx
4. Add to MainLayout
5. Test with actual notifications

Or would you like me to propose a different approach?
