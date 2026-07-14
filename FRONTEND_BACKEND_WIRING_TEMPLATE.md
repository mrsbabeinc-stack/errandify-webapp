# 🔗 Frontend-Backend Wiring Template

**Purpose:** Instructions for wiring all admin module buttons to backend API

---

## 📋 STEP-BY-STEP WIRING PROCESS

### Step 1: Import Required Libraries

Add at the top of each admin module (after existing imports):

```typescript
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

// Add axios interceptor for auth token (if not already done globally)
axios.defaults.headers.common['Authorization'] = `Bearer ${localStorage.getItem('token')}`;
```

### Step 2: Add useNavigate Hook

In the main component function:

```typescript
export default function AdminAuthManagement() {
  const navigate = useNavigate(); // <- ADD THIS LINE
  // ... rest of code
}
```

### Step 3: Add Back Button to Header

In the JSX header section (after h2 title):

```typescript
<div style={{ marginBottom: '32px' }}>
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
    <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#333', marginBottom: '8px' }}>
      🔐 Admin Users
    </h2>
    <button
      onClick={() => navigate(-1)} // Goes back to previous page
      style={{
        fontSize: '24px',
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        color: '#FF6B35',
        fontWeight: '700',
        padding: '0 8px',
      }}
      title="Go back"
    >
      ←
    </button>
  </div>
  <p style={{ fontSize: '14px', color: '#666' }}>
    Manage admin accounts and permissions
  </p>
</div>
```

### Step 4: Replace localStorage with API Calls

**Pattern 1: CREATE Operation**

```typescript
// BEFORE (localStorage only):
const handleAddStaff = () => {
  if (!newStaffName.trim() || !newStaffEmail.trim()) return;
  const newStaff = {
    id: `staff_${Date.now()}`,
    name: newStaffName,
    email: newStaffEmail,
    role: newStaffRole,
    // ...
  };
  const updated = [...staffList, newStaff];
  setStaffList(updated);
  localStorage.setItem(`company_staff_${selectedCompany}`, JSON.stringify(updated));
};

// AFTER (API + localStorage):
const handleAddStaff = async () => {
  try {
    if (!newStaffName.trim() || !newStaffEmail.trim()) return;

    // Call backend
    const response = await axios.post(`/api/admin/companies/${selectedCompany}/staff`, {
      name: newStaffName,
      email: newStaffEmail,
      role: newStaffRole,
    });

    // Update local state
    const updatedStaff = [...staffList, response.data];
    setStaffList(updatedStaff);
    
    // Keep localStorage as backup
    localStorage.setItem(`company_staff_${selectedCompany}`, JSON.stringify(updatedStaff));
    
    // Clear form
    setNewStaffName('');
    setNewStaffEmail('');
    
    // Show success
    alert('✓ Staff member added successfully');
  } catch (error: any) {
    alert('❌ Failed to add staff: ' + (error.response?.data?.error || error.message));
  }
};
```

**Pattern 2: DELETE Operation**

```typescript
// BEFORE (localStorage only):
const handleRemoveStaff = (staffId: string) => {
  const updated = staffList.filter(s => s.id !== staffId);
  setStaffList(updated);
  localStorage.setItem(`company_staff_${selectedCompany}`, JSON.stringify(updated));
};

// AFTER (API + localStorage):
const handleRemoveStaff = async (staffId: string) => {
  try {
    if (!window.confirm('Are you sure you want to remove this staff member?')) return;

    // Call backend
    await axios.delete(`/api/admin/companies/${selectedCompany}/staff/${staffId}`);

    // Update local state
    const updated = staffList.filter(s => s.id !== staffId);
    setStaffList(updated);
    
    // Update localStorage
    localStorage.setItem(`company_staff_${selectedCompany}`, JSON.stringify(updated));
    
    // Show success
    alert('✓ Staff member removed');
  } catch (error: any) {
    alert('❌ Failed to remove staff: ' + (error.response?.data?.error || error.message));
  }
};
```

**Pattern 3: UPDATE/TOGGLE Operation**

```typescript
// BEFORE (localStorage only):
const handleToggleRule = (ruleId: string) => {
  const updated = alertRules.map(r =>
    r.id === ruleId ? { ...r, enabled: !r.enabled } : r
  );
  setAlertRules(updated);
  localStorage.setItem('alertRules', JSON.stringify(updated));
};

// AFTER (API + localStorage):
const handleToggleRule = async (ruleId: string) => {
  try {
    // Find current rule
    const rule = alertRules.find(r => r.id === ruleId);
    if (!rule) return;

    // Call backend
    await axios.patch(`/api/admin/alert-rules/${ruleId}`, {
      enabled: !rule.enabled,
    });

    // Update local state
    const updated = alertRules.map(r =>
      r.id === ruleId ? { ...r, enabled: !r.enabled } : r
    );
    setAlertRules(updated);
    
    // Update localStorage
    localStorage.setItem('alertRules', JSON.stringify(updated));
    
    // Show success
    alert('✓ Alert rule updated');
  } catch (error: any) {
    alert('❌ Failed to update rule: ' + (error.response?.data?.error || error.message));
  }
};
```

**Pattern 4: FORM SUBMISSION (Complex Create)**

```typescript
// BEFORE (localStorage only):
const handleCancelErrand = (errandId: string) => {
  if (!cancelReason.trim()) {
    alert('Please provide a cancellation reason');
    return;
  }
  const updated = errands.map(e =>
    e.id === errandId ? { ...e, status: 'cancelled' } : e
  );
  setErrands(updated);
  localStorage.setItem('platformErrands', JSON.stringify(updated));
  // ... clear form
};

// AFTER (API + localStorage):
const handleCancelErrand = async (errandId: string) => {
  try {
    if (!cancelReason.trim()) {
      alert('Please provide a cancellation reason');
      return;
    }

    // Call backend
    const response = await axios.post(`/api/admin/errands/${errandId}/cancel`, {
      reason: cancelReason,
      compensationAmount: parseFloat(compensationAmount),
    });

    // Update local state
    const updated = errands.map(e =>
      e.id === errandId ? { ...e, status: 'cancelled' } : e
    );
    setErrands(updated);
    
    // Update localStorage
    localStorage.setItem('platformErrands', JSON.stringify(updated));
    
    // Clear form
    setCancelReason('');
    setCompensationAmount('0');
    setSelectedErrand(null);
    
    // Show success
    alert(`✓ Errand cancelled. Compensation: $${compensationAmount} issued`);
  } catch (error: any) {
    alert('❌ Failed: ' + (error.response?.data?.error || error.message));
  }
};
```

---

## 📁 MODULES TO UPDATE (15 files)

### TIER 1 (4 modules)
1. `AdminAuthManagement.tsx` - Admin create, delete, toggle 2FA
2. `AdminUserManagement.tsx` - Suspend, ban, restore, tier change
3. `AdminPaymentsManagement.tsx` - Refund, retry payment
4. `AdminErrandManagement.tsx` - Cancel, reassign, extend, complete

### TIER 2 (4 modules)
5. `AdminCompanyDeepManagement.tsx` - Staff CRUD, API keys, webhooks
6. `AdminSystemConfiguration.tsx` - Toggle flags, rollout, holidays
7. `AdminAuditCompliance.tsx` - Fetch logs, process GDPR
8. `AdminAlertsNotifications.tsx` - Create alert, toggle rule

### COMMUNICATIONS (7 modules)
9. `EmailCampaigns.tsx` - Create campaign
10. `NotificationsManagement.tsx` - Send notification
11. `EventReminders.tsx` - Create reminder
12. `BlogArticles.tsx` - Create article
13. `Recognition.tsx` - Award recognition
14. `CommunityFeed.tsx` - Post to feed
15. `HeroBanners.tsx` - Create banner

---

## ✅ WIRING CHECKLIST PER MODULE

For each module, verify:

- [ ] Imports: `axios`, `useNavigate`
- [ ] Back button added to header
- [ ] CREATE operations → POST `/api/admin/...`
- [ ] READ operations → GET `/api/admin/...` (if needed)
- [ ] UPDATE operations → PATCH `/api/admin/...`
- [ ] DELETE operations → DELETE `/api/admin/...`
- [ ] Error handling for each API call
- [ ] Success messages shown to user
- [ ] localStorage still acts as fallback
- [ ] Form fields cleared after success
- [ ] Network tab shows correct HTTP methods

---

## 🧪 TESTING API CALLS

**In Browser DevTools:**

1. Open DevTools → Network tab
2. Click any admin button
3. Look for new HTTP request with correct method (POST, PATCH, DELETE, GET)
4. Verify request URL: `http://localhost:5000/api/admin/...`
5. Check request body (for POST/PATCH) has correct data
6. Verify response status: 200, 201, or 4xx for errors
7. Check browser console for any errors

**Expected Flow:**
- Click button → API call made → Backend processes → Response returned → UI updates → Success message shown → localStorage updated

---

## 🔄 AXIOS CONFIGURATION (Global - do once)

Add to `App.tsx` or main.tsx (after imports):

```typescript
import axios from 'axios';

// Set default base URL
axios.defaults.baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// Add authorization token to all requests
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle global errors
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Redirect to login if unauthorized
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
```

---

## 📞 EXAMPLE: Full Module Update

See `AdminAuthManagement.tsx.WIRED.md` for complete example of one module fully wired.

---

## 🚀 IMPLEMENTATION ORDER

1. **Start with 1 module** (e.g., AdminAuthManagement)
2. **Test all buttons** in that module
3. **Check Network tab** to verify API calls
4. **Move to next module**
5. **Repeat** until all 15 are done

**Estimated time:** 2-3 hours to wire all 15 modules

---

## ⚠️ COMMON ISSUES & FIXES

**Issue: "Cannot POST /api/admin/admins"**
- ✅ Check: Backend server running? Routes registered in index.ts?
- ✅ Check: URL correct? (http://localhost:5000/api/admin/...)

**Issue: "403 Forbidden" error**
- ✅ Check: User logged in? JWT token in localStorage?
- ✅ Check: User has admin role?

**Issue: "500 Internal Server Error"**
- ✅ Check: Backend console for error message
- ✅ Check: Required fields passed in request?
- ✅ Check: Database tables exist?

**Issue: "Cannot read property 'data' of undefined"**
- ✅ Fix: Add error handling: `error.response?.data?.error || error.message`

---

## ✨ SUMMARY

**Process:**
1. Import axios & useNavigate
2. Add back button to header
3. Replace each `localStorage.setItem()` with `axios.post/patch/delete()`
4. Add try-catch error handling
5. Show success/error messages
6. Test in browser with Network tab

**All 32 buttons** will work once these changes are applied to 15 modules.
