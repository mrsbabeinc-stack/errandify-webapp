# ✅ Button Wiring Checklist - All 32 Buttons

## Track Progress as You Wire Each Module

---

## 📦 TIER 1: Operations (11 Buttons)

### AdminAuthManagement.tsx
- [ ] Import axios & useNavigate
- [ ] Add back button
- [ ] **+ Create Admin** → POST `/api/admin/admins`
- [ ] **Delete** (×4) → DELETE `/api/admin/admins/:id`
- [ ] **Toggle 2FA** (×4) → PATCH `/api/admin/admins/:id/2fa`
- [ ] Test in Network tab

### AdminUserManagement.tsx
- [ ] Import axios & useNavigate
- [ ] Add back button
- [ ] **Suspend** → POST `/api/admin/users/:userId/suspend`
- [ ] **Ban** → POST `/api/admin/users/:userId/ban`
- [ ] **Restore** → POST `/api/admin/users/:userId/restore`
- [ ] **Change Tier** → PATCH `/api/admin/users/:userId/tier`
- [ ] Test in Network tab

### AdminPaymentsManagement.tsx
- [ ] Import axios & useNavigate
- [ ] Add back button
- [ ] **Process Refund** → POST `/api/admin/payments/:transactionId/refund`
- [ ] **Retry Payment** → POST `/api/admin/payments/:transactionId/retry`
- [ ] Test in Network tab

### AdminErrandManagement.tsx
- [ ] Import axios & useNavigate
- [ ] Add back button
- [ ] **Reassign** → PATCH `/api/admin/errands/:errandId/reassign`
- [ ] **Extend Deadline** → PATCH `/api/admin/errands/:errandId/extend`
- [ ] **Force Complete** → POST `/api/admin/errands/:errandId/complete`
- [ ] **Cancel & Compensate** → POST `/api/admin/errands/:errandId/cancel`
- [ ] Test in Network tab

---

## 🛠️ TIER 2: Configuration (15 Buttons)

### AdminCompanyDeepManagement.tsx
- [ ] Import axios & useNavigate
- [ ] Add back button
- [ ] **+ Add Staff** → POST `/api/admin/companies/:companyId/staff`
- [ ] **Remove Staff** → DELETE `/api/admin/companies/:companyId/staff/:staffId`
- [ ] **+ Generate API Key** → POST `/api/admin/companies/:companyId/api-keys`
- [ ] **Revoke API Key** → PATCH `/api/admin/api-keys/:keyId/revoke`
- [ ] **+ Create Webhook** → POST `/api/admin/companies/:companyId/webhooks`
- [ ] **Toggle Webhook** → PATCH `/api/admin/webhooks/:webhookId/toggle`
- [ ] **Delete Webhook** → DELETE `/api/admin/webhooks/:webhookId`
- [ ] Test in Network tab

### AdminSystemConfiguration.tsx
- [ ] Import axios & useNavigate
- [ ] Add back button
- [ ] **Toggle Feature** → PATCH `/api/admin/feature-flags/:flagId`
- [ ] **Rollout Slider** → PATCH `/api/admin/feature-flags/:flagId/rollout`
- [ ] **+ Add Holiday** → POST `/api/admin/holidays`
- [ ] **Delete Holiday** → DELETE `/api/admin/holidays/:holidayId`
- [ ] Test in Network tab

### AdminAuditCompliance.tsx
- [ ] Import axios & useNavigate
- [ ] Add back button
- [ ] **View Logs** → GET `/api/admin/audit-logs`
- [ ] **Process GDPR** → POST `/api/admin/gdpr-requests/:requestId/process`
- [ ] Test in Network tab

### AdminAlertsNotifications.tsx
- [ ] Import axios & useNavigate
- [ ] Add back button
- [ ] **+ Create Alert** → POST `/api/admin/alert-rules`
- [ ] **Toggle Alert** → PATCH `/api/admin/alert-rules/:ruleId`
- [ ] Test in Network tab

---

## 📧 Communications (6 Buttons)

### EmailCampaigns.tsx
- [ ] Import axios & useNavigate
- [ ] Add back button
- [ ] **+ Create Campaign** → POST `/api/admin/campaigns/email`
- [ ] Test in Network tab

### NotificationsManagement.tsx
- [ ] Import axios & useNavigate
- [ ] Add back button
- [ ] **+ Send Notification** → POST `/api/admin/notifications/send`
- [ ] Test in Network tab

### EventReminders.tsx
- [ ] Import axios & useNavigate
- [ ] Add back button
- [ ] **+ Schedule Reminder** → POST `/api/admin/event-reminders`
- [ ] Test in Network tab

### BlogArticles.tsx
- [ ] Import axios & useNavigate
- [ ] Add back button
- [ ] **+ Create Article** → POST `/api/admin/blog/articles`
- [ ] Test in Network tab

### Recognition.tsx
- [ ] Import axios & useNavigate
- [ ] Add back button
- [ ] **+ Award Recognition** → POST `/api/admin/recognition/award`
- [ ] Test in Network tab

### CommunityFeed.tsx
- [ ] Import axios & useNavigate
- [ ] Add back button
- [ ] **+ Post to Feed** → POST `/api/admin/community/posts`
- [ ] Test in Network tab

### HeroBanners.tsx
- [ ] Import axios & useNavigate
- [ ] Add back button
- [ ] **+ Create Banner** → POST `/api/admin/banners/hero`
- [ ] Test in Network tab

---

## 🎯 QA CHECKLIST (Per Module)

For each module, verify:

- [ ] Back button exists in header
- [ ] All buttons make API calls (not localStorage)
- [ ] Network tab shows correct HTTP method (POST, PATCH, DELETE, GET)
- [ ] API response status is 200 or 201
- [ ] UI updates after response
- [ ] Success message appears (inline, not alert)
- [ ] Error message is helpful (not technical code)
- [ ] Form fields clear after success
- [ ] No system dialogs (alert, confirm)
- [ ] localStorage updates as fallback
- [ ] Warm design maintained (orange, emojis)

---

## 📊 Progress Tracking

**Module Count:** 15 total

### TIER 1 (4 modules)
- [ ] AdminAuthManagement.tsx
- [ ] AdminUserManagement.tsx
- [ ] AdminPaymentsManagement.tsx
- [ ] AdminErrandManagement.tsx

### TIER 2 (4 modules)
- [ ] AdminCompanyDeepManagement.tsx
- [ ] AdminSystemConfiguration.tsx
- [ ] AdminAuditCompliance.tsx
- [ ] AdminAlertsNotifications.tsx

### Communications (7 modules)
- [ ] EmailCampaigns.tsx
- [ ] NotificationsManagement.tsx
- [ ] EventReminders.tsx
- [ ] BlogArticles.tsx
- [ ] Recognition.tsx
- [ ] CommunityFeed.tsx
- [ ] HeroBanners.tsx

---

## 🎉 Final Verification

Once all 15 modules are wired:

- [ ] 0 system dialogs (alert/confirm/prompt)
- [ ] 32 buttons all make HTTP requests
- [ ] No localStorage calls in buttons (only fallback)
- [ ] Back buttons work in all modules
- [ ] Warm design consistent throughout
- [ ] All error messages are helpful
- [ ] All success messages are celebratory
- [ ] Network tab shows all requests
- [ ] No console errors
- [ ] Ready for testing

---

## 📝 Notes

Use this space to track any issues:

```
Module: _______________
Issue: _______________
Status: [ ] Fixed [ ] In Progress [ ] Blocked
```

---

**Total Work:** ~2-3 hours for all 15 modules  
**Estimated Completion:** Today  
**Success Criteria:** All 32 buttons wired and tested ✅
