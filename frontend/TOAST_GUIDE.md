# Toast Notifications - Complete Guide

## Overview

Toast notifications appear in the **bottom-right corner** of the screen and are perfect for:
- Secondary notifications
- Action confirmations
- Status updates
- Messages that don't need immediate top-of-screen attention

## System Details

**Location:** Bottom-right corner  
**Animation:** Smooth slide-up  
**Auto-dismiss:** Yes (5 seconds default)  
**Status:** ✅ **FULLY WORKING**

## How to Use

### Method 1: Hook (Inside React Components) - Recommended

```typescript
import { useToastNotification } from '@/utils/toastNotification';

const MyComponent = () => {
  const { showSuccess, showError, showWarning, showInfo } = useToastNotification();

  return (
    <button onClick={() => showSuccess('Profile updated!')}>
      Save
    </button>
  );
};
```

### Method 2: Direct Context (Inside React Components)

```typescript
import { useNotificationToast } from '@/context/NotificationContext';

const MyComponent = () => {
  const { addToast } = useNotificationToast();

  const handleSave = () => {
    addToast({
      type: 'success',
      title: 'Success!',
      body: 'Your profile has been saved',
      icon: '✓',
      duration: 5000,
    });
  };

  return <button onClick={handleSave}>Save</button>;
};
```

### Method 3: Using Message Templates

```typescript
import { useToastNotification, toastMessages } from '@/utils/toastNotification';

const MyComponent = () => {
  const { showSuccess, showError } = useToastNotification();
  const msgConfig = toastMessages.success.saved('Profile');

  return (
    <button onClick={() => showSuccess(msgConfig.title, msgConfig.body)}>
      Save
    </button>
  );
};
```

## Toast Types

### Success (Green)
```typescript
const { showSuccess } = useToastNotification();
showSuccess('Profile updated!');
showSuccess('Profile updated!', 'Your changes have been saved');
showSuccess('Profile updated!', 'Your changes have been saved', 3000);
```

**Use for:**
- Form submissions
- Successful operations
- Completions
- Approvals

### Error (Red)
```typescript
const { showError } = useToastNotification();
showError('Failed to save');
showError('Failed to save', 'Please check your connection');
showError('Failed to save', 'Please check your connection', 5000);
```

**Use for:**
- Failed operations
- Errors
- Invalid input
- Connection issues

### Warning (Yellow)
```typescript
const { showWarning } = useToastNotification();
showWarning('Rejected');
showWarning('Rejected', 'Your request has been rejected');
```

**Use for:**
- Rejections
- Warnings
- Low resources
- Cautions

### Info (Blue)
```typescript
const { showInfo } = useToastNotification();
showInfo('New message');
showInfo('New message', 'You have a new message from Jordan');
```

**Use for:**
- Informational messages
- Updates
- Hints
- Background notifications

## Advanced Usage

### With Action Button

```typescript
const { addToast } = useNotificationToast();

addToast({
  type: 'success',
  title: 'Profile saved!',
  body: 'Your profile changes have been saved',
  icon: '✓',
  actionLabel: 'View Profile',
  actionUrl: '/profile',
  duration: 5000,
});
```

### Without Auto-dismiss

```typescript
const { addToast } = useNotificationToast();

addToast({
  type: 'info',
  title: 'Important notice',
  body: 'Please review the terms and conditions',
  icon: 'ℹ️',
  duration: 0, // Won't auto-dismiss
});
```

### Custom Duration

```typescript
showSuccess('Quick notification!', '', 2000);  // Dismiss after 2 seconds
showError('Important error', '', 10000);       // Dismiss after 10 seconds
```

## Pre-built Message Templates

### Success Templates
```typescript
import { toastMessages } from '@/utils/toastNotification';

// Returns: { title: "Profile saved", body: "Your profile has been saved successfully" }
toastMessages.success.saved('Profile');

toastMessages.success.created('Errand');
toastMessages.success.updated('Settings');
toastMessages.success.deleted('Item');
toastMessages.success.submitted('Application');
toastMessages.success.approved('Request');
toastMessages.success.completed('Task');
toastMessages.success.uploaded('File');
```

### Error Templates
```typescript
toastMessages.error.failed('update');              // "Failed to update..."
toastMessages.error.required('Email');             // "Email is required"
toastMessages.error.invalid('Phone number');       // "Phone number is invalid"
toastMessages.error.notFound('User');              // "User not found"
toastMessages.error.unauthorized();                // "You do not have permission..."
toastMessages.error.networkError();                // "Please check your connection..."
```

### Warning Templates
```typescript
toastMessages.warning.rejected('Leave request');
toastMessages.warning.cancelled('Errand');
toastMessages.warning.expiring('Subscription');
toastMessages.warning.insufficientBalance('EP');
```

### Info Templates
```typescript
toastMessages.info.welcome('John');
toastMessages.info.processing();
toastMessages.info.hint('Save your work');
```

## Real-World Examples

### Form Submission
```typescript
const handleSubmit = async (formData) => {
  try {
    await saveProfile(formData);
    showSuccess('Profile saved!', 'Your changes have been saved');
  } catch (error) {
    showError('Failed to save', 'Please try again');
  }
};
```

### File Upload
```typescript
const handleUpload = async (file) => {
  try {
    await uploadFile(file);
    showSuccess('File uploaded!', `${file.name} has been uploaded`);
  } catch (error) {
    showError('Upload failed', 'File size must be less than 5MB');
  }
};
```

### Leave Approval
```typescript
const handleApprove = (leaveId) => {
  approveLeave(leaveId);
  showSuccess(
    'Approved!',
    'Leave request has been approved',
    { actionLabel: 'View', actionUrl: '/leaves' }
  );
};
```

### Payment Processing
```typescript
const handlePayment = async (amount) => {
  try {
    await processPayment(amount);
    showSuccess(
      'Payment successful!',
      `SGD $${amount} has been transferred`,
      { actionLabel: 'View receipt', actionUrl: '/receipts' }
    );
  } catch (error) {
    showError(
      'Payment failed',
      'Please check your card details and try again'
    );
  }
};
```

## Comparison: Top Notification vs Toast

| Feature | Top Notification | Toast |
|---------|------------------|-------|
| **Location** | Top-center | Bottom-right |
| **Priority** | High | Medium |
| **Auto-dismiss** | 4s default | 5s default |
| **With Action** | No | Yes |
| **Multiple** | Stacked | Stacked |
| **Best for** | Critical actions | Confirmations |
| **Example** | "Leave rejected - insufficient balance" | "Profile updated successfully" |

## Implementation Checklist

### Pages That Should Use Toasts
- [ ] MyAccountPage - Profile updates, preference changes
- [ ] MyCompanyDashboard - Company info updates, logo upload
- [ ] PaymentPage - Payment confirmations
- [ ] SettingsPage - Settings changes
- [ ] ProfilePages - All profile edits
- [ ] UploadPages - File uploads
- [ ] FormPages - Form submissions

### Guidelines
- ✅ Use toasts for secondary confirmations
- ✅ Use toasts with action buttons for follow-up actions
- ✅ Keep toast messages concise
- ✅ Use pre-built templates for consistency
- ✅ Provide both title and body for important toasts
- ❌ Don't use toasts for critical errors (use top notification instead)
- ❌ Don't use toasts for urgent warnings (use top notification instead)

## Code Examples

### Simple Success
```typescript
const { showSuccess } = useToastNotification();
showSuccess('Changes saved!');
```

### With Details
```typescript
const { showSuccess } = useToastNotification();
showSuccess(
  'Payment successful!',
  'SGD $50 has been transferred to Jordan Smith'
);
```

### With Action
```typescript
const { addToast } = useNotificationToast();
addToast({
  type: 'success',
  title: 'Leave approved!',
  body: 'The leave request has been approved',
  icon: '✓',
  actionLabel: 'View Details',
  actionUrl: '/leave-details',
  duration: 5000,
});
```

### Using Template
```typescript
const { showSuccess } = useToastNotification();
const msg = toastMessages.success.saved('Profile');
showSuccess(msg.title, msg.body);
```

## Browser Display

Toast notifications appear as:
- Sliding up from bottom-right corner
- White background with orange border
- Icon (bouncing animation)
- Title (bold brown text)
- Body (gray text)
- Close button (✕)
- Optional action button

## Auto-dismiss Behavior

- **Default:** 5 seconds
- **Custom:** Set `duration` to any milliseconds value
- **Never:** Set `duration: 0` for persistent toasts
- **Quick:** Set `duration: 2000` for 2 second auto-dismiss

## Styling

All toasts use:
- Gradient: white to orange-50
- Border: 2px errandify-orange
- Border-radius: 2xl (rounded corners)
- Shadow: 2xl shadow
- Animation: slide-up with bounce icon

## Performance

- Toasts are stacked (multiple can show)
- Each toast auto-dismisses independently
- No performance impact with multiple toasts
- Animations are smooth and lightweight

## Debugging

**Check if notifications work:**
```typescript
// In browser console, inside a React component context
const { showSuccess } = useToastNotification();
showSuccess('Test notification');
```

**View active toasts:**
```typescript
const { toasts } = useNotificationToast();
console.log(toasts);
```

**Clear all toasts:**
```typescript
const { clearAllToasts } = useNotificationToast();
clearAllToasts();
```

## Best Practices

1. **Use appropriate type** - Match severity to toast type
2. **Keep messages short** - One sentence max
3. **Provide context** - Explain what succeeded/failed
4. **Use templates** - For consistency across app
5. **Include action when needed** - For follow-up steps
6. **Set duration carefully** - Long for important, short for routine
7. **Don't overuse** - Use for significant events only
8. **Test in context** - Make sure timing works for users

## Summary

Toast notifications are **fully functional** and ready to use across the entire application. They work perfectly for:
- ✅ Secondary confirmations
- ✅ Form submissions  
- ✅ File uploads
- ✅ Status updates
- ✅ Action confirmations

Use **top notifications** for urgent/critical alerts, and **toasts** for regular confirmations and updates.

---

**Status:** ✅ **READY TO USE** - All components and utilities are implemented and working
