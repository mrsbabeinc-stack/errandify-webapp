# Errand Notifications Guide

**Date**: 2026-06-18

---

## What Errand Notifications Would Be Sent

### For ASKERS (Person who posted the errand):

| Event | Notification | Timing |
|-------|--------------|--------|
| New Bid Received | "John Lee bid $45 on 'Iron my clothes'" | Immediately |
| Bid Accepted | "John Lee accepted! Payment processing..." | When doer accepts |
| Doer Started | "John Lee started your errand" | When status = in_progress |
| Work Completed | "John Lee finished. Please confirm." | When doer marks complete |
| Payment Released | "Payment of $45 released to John Lee" | After confirmation |
| New Message | "John Lee: When can I start?" | When doer messages |
| Review Received | "John Lee gave you a 5-star review" | When doer submits review |
| Errand Cancelled | "John Lee cancelled the errand" | When doer cancels |
| Dispute Filed | "Dispute filed for 'Iron my clothes'" | When someone files dispute |
| 24-hour Reminder | "Errand due tomorrow - confirm details" | 24h before deadline |

---

### For DOERS (Person who bids/works on errand):

| Event | Notification | Timing |
|-------|--------------|--------|
| Bid Rejected | "Your bid was rejected" | When asker rejects |
| Bid Accepted | "🎉 Your bid of $45 was accepted!" | When asker accepts |
| Payment Held | "Payment of $45 held in escrow" | After bid accepted |
| Asker Message | "Sarah Tan: When can you start?" | When asker messages |
| Work Due Soon | "Reminder: 'Iron my clothes' due tomorrow" | 24h before deadline |
| Completion Confirmed | "✓ You earned $45! Review pending." | When asker confirms |
| Payment Received | "Payment of $45 received in your account" | After confirmation |
| Review Posted | "Sarah Tan left you a 5-star review" | When asker reviews |
| Dispute Filed | "Dispute filed for 'Iron my clothes'" | When someone files dispute |
| Dispute Resolved | "Dispute resolved. You received $45" | When dispute settles |

---

## Notification Channels Currently Available

### ✅ In-App Notifications (READY)
- Location: Bell icon in app
- Shows: Message + timestamp
- Action: Click to see details

### 🔄 Can Add:
- Push notifications (Android/iOS)
- Email notifications (SMTP)
- SMS notifications (Twilio)

---

## Current Implementation

✅ **Already Working:**
- Notification toggle in Profile (🔔)
- In-app notification structure
- Message notifications (real-time)
- Bid notifications

✅ **Toggle in Profile:**
1. Click Profile icon
2. Scroll to MyPocket
3. Find "Errand Notifications" (🔔)
4. Toggle ON/OFF

---

## Next Steps to Enable All Notifications

1. Add email SMTP setup
2. Add push notification service
3. Add SMS integration (Twilio)
4. Create notification center page
5. Add notification preferences per type

All infrastructure ready - just needs configuration!
