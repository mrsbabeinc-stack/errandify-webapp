# Notification Systems in Errandify

The app has **two independent notification systems** working together:

## 1️⃣ TOP NOTIFICATION BAR ✅ (Working - Ready to Use)

**Location:** Top-center of screen  
**Style:** Smooth slide-down animation  
**Status:** ✅ Fully implemented and tested  

### How to Use

```typescript
import { showSuccess, showError, showWarning, showInfo } from '@/utils/topNotification';

// Simple usage
showSuccess('Profile updated!');
showError('Failed to upload');
showWarning('Leave rejected');
showInfo('New message');

// Or use global function
window.topNotification?.({
  type: 'success',
  message: 'Done!',
  icon: '✓',
  duration: 4000
});
```

### Features
- ✅ Auto-dismisses after 4 seconds (configurable)
- ✅ Manual close button (✕)
- ✅ 4 types: success (green), error (red), warning (yellow), info (blue)
- ✅ Smooth animations
- ✅ Stacked notification support
- ✅ Icons and custom duration

### Current Integrations
- ✅ **Leave Calendar** - All leave actions (submit, approve, reject, setup)
- ✅ **App Load** - Welcome message on startup

### Test It
**Option 1: Easy Test Page**
```
http://localhost:5174/test-notifications
```
Click any button to see notifications in action (16 test buttons)

**Option 2: Leave Calendar**
Navigate to Company Dashboard → Leave Calendar → Click "🔔 Test Notification"

**Option 3: Trigger in Console**
```javascript
window.topNotification?.({
  type: 'success',
  message: 'Hello!',
  icon: '✓'
})
```

---

## 2️⃣ NOTIFICATION BELL 📬 (Not Working - Backend Issue)

**Location:** Header - mailbox icon (📬)  
**Style:** Dropdown with notification list  
**Status:** ❌ Depends on backend API (returning 500 errors)  

### What It Does
- Shows database/API notifications in a dropdown
- Displays unread count badge
- Allows marking notifications as read
- Links to relevant pages when clicked

### Why It's Not Working
The backend API endpoint `/api/notifications` is returning 500 errors:
```
Failed to load resource: the server responded with a status of 500 (Internal Server Error)
```

### To Fix
1. Start the backend server
2. Ensure database is properly configured
3. Verify `/api/notifications` endpoint is working

### Current Code
```typescript
// src/components/NotificationBell.tsx
// Subscribes to notificationService
// Polls backend API via NotificationListener.tsx
```

---

## 📋 Notification Systems Comparison

| Feature | Top Bar | Bell |
|---------|---------|------|
| **Location** | Top-center | Header dropdown |
| **Source** | Code triggers | Backend API |
| **Status** | ✅ Working | ❌ Backend Down |
| **Use Case** | User actions, confirmations | Server events, messages |
| **Auto-dismiss** | Yes (4s) | No |
| **Priority** | High visibility | Persistent list |

---

## 🚀 Implementation Guide

### For Developers

**Step 1: Import utility**
```typescript
import { showSuccess, showError, showWarning, showInfo } from '@/utils/topNotification';
```

**Step 2: Use in your code**
```typescript
const handleSubmit = async () => {
  try {
    await saveData();
    showSuccess('Saved successfully!');
  } catch (error) {
    showError('Failed to save. Try again.');
  }
};
```

**Step 3: Test**
- Run `/test-notifications` page
- Or use leave calendar
- Or trigger in console

---

## 📍 Files & Locations

### Top Notification System
- Component: `src/components/TopNotificationBar.tsx`
- Utility: `src/utils/topNotification.ts`
- Test Page: `src/pages/TopNotificationTestPage.tsx`
- Guide: `TOP_NOTIFICATION_GUIDE.md`
- Route: `/test-notifications`

### Notification Bell
- Component: `src/components/NotificationBell.tsx`
- Service: `src/services/notifications.ts`
- Listener: `src/components/NotificationListener.tsx`
- Backend: `backend/src/routes/notifications.ts` (500 error)

---

## 🧪 Test Page Features

**URL:** `http://localhost:5174/test-notifications`

**Test Buttons:** 16 total
- ✅ 4 Success scenarios
- ❌ 4 Error scenarios  
- ⚠️ 4 Warning scenarios
- ℹ️ 4 Info scenarios

**Each tests:**
- Real-world message
- Appropriate icon
- Custom duration
- Different notification patterns

**Code examples included:**
- Import statements
- Function usage
- Direct window.topNotification call

---

## ✅ Quick Start

### See It Working Right Now
1. Navigate to: `http://localhost:5174/test-notifications`
2. Click any colored button
3. Watch notification appear at top of screen

### Use in Your Component
```typescript
import { showSuccess } from '@/utils/topNotification';

// In your handler
showSuccess('Operation completed!');
```

### Available Functions
```typescript
showSuccess(message, icon, duration)
showError(message, icon, duration)
showWarning(message, icon, duration)
showInfo(message, icon, duration)
```

---

## 🔧 Console Debugging

**Check if system is ready:**
```javascript
console.log(window.topNotification);
// Should show: function addNotification(notification)
```

**View console logs:**
```
[TopNotificationBar] Ready - window.topNotification is available
[TopNotificationBar] Adding notification: {type: "success", ...}
```

**Manual test:**
```javascript
window.topNotification?.({
  type: 'success',
  message: 'Test!',
  icon: '✓',
  duration: 3000
});
```

---

## 📊 Current Status

### ✅ Complete & Ready
- [x] TopNotificationBar component
- [x] Utility functions (show*)
- [x] Message templates (22 total)
- [x] Test page with 16 buttons
- [x] Leave Calendar integration
- [x] Console logging/debugging
- [x] Welcome notification on load
- [x] Full documentation
- [x] Code examples

### ⏳ To Do (Frontend)
- [ ] Integrate with all user action pages
- [ ] Replace alert() calls with top notifications
- [ ] Add notifications to form submissions
- [ ] Add notifications to file uploads
- [ ] Add notifications to approval workflows

### ❌ Blocked (Backend Required)
- [ ] Notification Bell (waiting for backend)
- [ ] Database notifications
- [ ] Real-time message notifications
- [ ] Background update notifications

---

## 📚 References

- **Notification Guide:** `TOP_NOTIFICATION_GUIDE.md`
- **Test Page:** `/test-notifications`
- **Utility File:** `src/utils/topNotification.ts`
- **Component:** `src/components/TopNotificationBar.tsx`

---

**Status Summary:** Top notification system is fully functional and ready for use across the entire application. Bell notifications require backend to be operational.
