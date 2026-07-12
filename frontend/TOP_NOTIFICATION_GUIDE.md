# Top Notification Bar - Implementation Guide

## Overview
The app now has a **top notification bar** that shows at the top-center of the screen with smooth animations. This replaces `alert()` dialogs and bottom-right toasts for more prominent notifications.

## System Status
✅ **TopNotificationBar component** - Ready and integrated  
✅ **Window.topNotification global function** - Available everywhere  
✅ **Utility functions** - Created and ready to use  
✅ **Leave Calendar integration** - Working with all actions  

## How to Use

### Method 1: Direct Global Call (Anywhere)
```typescript
// Available globally in browser console or any component
window.topNotification?.({
  type: 'success',
  message: 'Profile updated!',
  icon: '✓',
  duration: 4000
});
```

### Method 2: Utility Functions (Recommended)
```typescript
import { showSuccess, showError, showWarning, showInfo } from '@/utils/topNotification';

// Simple usage
showSuccess('Profile updated!');
showError('Failed to upload file');
showWarning('Leave rejected');
showInfo('New message received');

// Custom icon and duration
showSuccess('Saved!', '✓', 3000);
showError('Error occurred', '✗', 5000);
```

### Method 3: Notification Templates (Best for Consistency)
```typescript
import { notifications, showSuccess, showError, showWarning } from '@/utils/topNotification';

// Use pre-built messages
showSuccess(notifications.success.saved('Profile'));
showError(notifications.error.failed('update'));
showWarning(notifications.warning.insufficientBalance('leave'));

// Outputs:
// "✓ Profile saved successfully"
// "✗ Failed to update. Please try again."
// "⚠️ Insufficient leave"
```

## Notification Types

### Success (Green)
```typescript
showSuccess('Profile updated successfully!', '✓', 4000);
```
**Use for:**
- Form submissions
- File uploads
- Approvals
- Confirmations

### Error (Red)
```typescript
showError('Failed to upload file. Please try again.', '✗', 4000);
```
**Use for:**
- Failed operations
- Invalid input
- API errors
- Permission denied

### Warning (Yellow)
```typescript
showWarning('Leave request rejected. Balance refunded.', '⚠️', 4000);
```
**Use for:**
- Rejections
- Cancellations
- Low balance/resources
- Expiring items

### Info (Blue)
```typescript
showInfo('New message received from Jordan', 'ℹ️', 4000);
```
**Use for:**
- General information
- Hints and tips
- Background updates
- Welcome messages

## Replacing alert() Calls

### Before (Using alert)
```typescript
if (success) {
  alert('✅ Profile updated successfully!');
  navigate('/profile');
}
```

### After (Using top notification)
```typescript
import { showSuccess } from '@/utils/topNotification';

if (success) {
  showSuccess('Profile updated successfully!');
  navigate('/profile');
}
```

## Common Patterns

### Form Submission
```typescript
const handleSubmit = async (formData) => {
  try {
    await api.saveProfile(formData);
    showSuccess('Profile updated successfully!');
    setShowModal(false);
  } catch (error) {
    showError('Failed to update profile. Please try again.');
  }
};
```

### File Upload
```typescript
const handleUpload = async (file) => {
  try {
    await api.uploadFile(file);
    showSuccess('File uploaded successfully!');
  } catch (error) {
    showError('Failed to upload file');
  }
};
```

### Approval/Rejection
```typescript
const handleApprove = (itemId) => {
  updateStatus(itemId, 'approved');
  showSuccess(`✓ Approved successfully`);
};

const handleReject = (itemId) => {
  updateStatus(itemId, 'rejected');
  showWarning('Item rejected');
};
```

### Balance Check
```typescript
const handleSubmit = (amount) => {
  if (balance < amount) {
    showError(notifications.error.required('Sufficient balance'));
    return;
  }
  processTransaction(amount);
  showSuccess('Transaction completed!');
};
```

## Pre-built Message Templates

### Success Messages
```typescript
notifications.success.saved(item)     // "✓ Profile saved successfully"
notifications.success.created(item)   // "✓ Errand created successfully"
notifications.success.updated(item)   // "✓ Settings updated successfully"
notifications.success.deleted(item)   // "✓ Item deleted successfully"
notifications.success.submitted(item) // "✓ Form submitted successfully"
notifications.success.approved(item)  // "✓ Request approved"
notifications.success.completed(item) // "✓ Task completed"
notifications.success.uploaded(item)  // "✓ File uploaded successfully"
```

### Error Messages
```typescript
notifications.error.failed(action)      // "✗ Failed to {action}. Please try again."
notifications.error.required(field)     // "✗ {field} is required"
notifications.error.invalid(field)      // "✗ {field} is invalid"
notifications.error.notFound(item)      // "✗ {item} not found"
notifications.error.unauthorized()      // "✗ You do not have permission to do this"
notifications.error.networkError()      // "✗ Network error. Please check your connection."
```

### Warning Messages
```typescript
notifications.warning.rejected(item)         // "{item} has been rejected"
notifications.warning.cancelled(item)        // "{item} has been cancelled"
notifications.warning.insufficientBalance(r) // "⚠️ Insufficient {resource}"
notifications.warning.expiring(item)         // "⚠️ {item} is expiring soon"
```

### Info Messages
```typescript
notifications.info.loading(action)   // "ℹ️ {action}..."
notifications.info.processing()      // "ℹ️ Processing your request..."
notifications.info.welcome(name)     // "ℹ️ Welcome, {name}!"
notifications.info.hint(message)     // "ℹ️ {message}"
```

## Integration Checklist

Pages/Components that should use top notifications:

### ✅ Already Integrated
- [x] CompanyLeaveCalendar - Leave submit, approve, reject, setup save
- [x] TopNotificationBar - Ready for global use

### Priority 1 (Critical User Actions)
- [ ] MyCompanyDashboard - Profile updates, logo upload, policy changes
- [ ] CompanyPostErrandPage - Errand submission
- [ ] EditErrandPage - Errand updates
- [ ] DoerCompletionConfirmPage - Task completion
- [ ] DisputeReviewPage - Dispute resolution
- [ ] CompanyRegistrationPage - Company setup

### Priority 2 (Important Workflows)
- [ ] ErrandDetailPage - Job cancellation, completion
- [ ] PayoutSettingsPage - Payment setup
- [ ] TransactionHistoryPage - Payment updates
- [ ] ReviewPage - Review submission
- [ ] BlogDetailPage - Blog actions

### Priority 3 (Secondary Actions)
- [ ] ProfilePage - Profile edits
- [ ] NotificationPreferencesPage - Preference updates
- [ ] CategoryPreferencePage - Category selection
- [ ] MyRewardsPage - Reward claims

## Debugging

### Check if system is ready
```javascript
// In browser console
window.topNotification
// Should return: function addNotification(notification)

// Manually trigger test
window.topNotification?.({
  type: 'success',
  message: 'Test notification',
  icon: '✓',
  duration: 4000
});
```

### Console Logs
TopNotificationBar logs to console:
```
[TopNotificationBar] Ready - window.topNotification is available
[TopNotificationBar] Adding notification: {type: "success", message: "...", ...}
```

Component logs:
```
[CompanyLeaveCalendar] Test notification button clicked
[CompanyLeaveCalendar] window.topNotification: function
```

## Styling

All notifications use:
- **Animation:** Smooth slide-down from top
- **Duration:** 4 seconds default (configurable)
- **Position:** Top-center of screen
- **Z-index:** 40 (below modals at z-50)
- **Colors:** Type-specific (success=green, error=red, etc.)
- **Dismiss:** Auto-close or manual close button

## Best Practices

1. **Use specific messages** - Not "Error" but "Failed to update profile"
2. **Keep messages short** - One sentence max
3. **Use templates** - For consistency across app
4. **Include action** - What succeeded/failed
5. **Set appropriate duration** - 3-5 seconds typical
6. **Use right type** - Don't show success for warnings
7. **No emojis in messages** - Only in icon field
8. **Test in console** - Before implementing

## Example Implementations

### Before & After Comparison

**Before (Using alert):**
```typescript
const handleSave = async () => {
  try {
    await saveData();
    alert('✅ Saved successfully!');
  } catch (error) {
    alert('❌ Failed to save');
  }
};
```

**After (Using top notification):**
```typescript
import { showSuccess, showError } from '@/utils/topNotification';

const handleSave = async () => {
  try {
    await saveData();
    showSuccess('Changes saved successfully!');
  } catch (error) {
    showError('Failed to save changes. Please try again.');
  }
};
```

## Support

For issues or questions:
1. Check browser console for logs
2. Verify TopNotificationBar is in App.tsx
3. Confirm window.topNotification is available globally
4. Test with manual console call: `window.topNotification?.({...})`

---

**System Ready:** ✅ All components integrated and ready for use
