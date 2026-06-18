# 🔌 SingPass & Stripe Integration Roadmap

**Timeline**: After core feature testing passes  
**Effort**: ~2-3 days of development  
**Priority**: High (required for real deployment)

---

## Phase 1: Test Current Setup ✅ (You are here)

**Goal**: Verify all features work with demo accounts & dummy payments

**Checklist**:
- [x] Authentication flow works
- [x] Errand creation & browsing works
- [x] Bidding system works
- [x] Chat & messaging works
- [x] Notifications work
- [x] Reviews & ratings work
- [x] Dummy Stripe payments process

**When Complete**: Move to Phase 2

---

## Phase 2: SingPass Integration 🔐

### 2.1 Get SingPass Credentials

**Action Required**:
1. Go to https://www.singpass.gov.sg/
2. Request developer account / API credentials
3. Get: CLIENT_ID, CLIENT_SECRET, API endpoint
4. Set up OAuth2 redirect URI: `https://your-domain/auth/callback`

**Timeline**: 3-5 business days (Singapore government)

### 2.2 Backend Setup

**File**: `backend/src/routes/auth.ts`

```typescript
// Add this to .env
SINGPASS_CLIENT_ID=your_client_id
SINGPASS_CLIENT_SECRET=your_client_secret
SINGPASS_API_URL=https://api.singpass.gov.sg
SINGPASS_REDIRECT_URI=https://your-domain/auth/callback
USE_SINGPASS=true  // Enable SingPass
```

**Changes Needed**:
- Replace `POST /demo-login` with real SingPass OAuth flow
- Exchange auth code for JWT token
- Extract user info from SingPass: name, NRIC, email
- Store in database with proper PII encryption

**Estimated Effort**: 3-4 hours

### 2.3 Frontend Setup

**File**: `frontend/src/components/auth/SingPassLogin.tsx`

Current code already has placeholder. Just needs:
- Update OAuth redirect URL
- Handle SingPass response
- Parse JWT token
- Store in localStorage

**Estimated Effort**: 1-2 hours

### 2.4 Testing

```bash
# Test flow:
1. Click "Login with SingPass"
2. Redirects to SingPass portal
3. Authenticate with your SingPass credentials
4. Redirects back to app
5. Logged in as authenticated user
6. Can post errands, submit bids, etc.
```

**Estimated Effort**: 1 hour

---

## Phase 3: Stripe Integration 💳

### 3.1 Get Stripe Credentials

**Action Required**:
1. Go to https://stripe.com/en-sg/business
2. Create business account
3. Verify account (1-2 business days)
4. Get: Secret Key (sk_live_...), Publishable Key (pk_live_...)
5. Set up webhook endpoints for payment events

**Timeline**: 1-2 business days

### 3.2 Backend Setup

**File**: `backend/src/routes/payment.ts`

```typescript
// Add to .env
STRIPE_SECRET_KEY=sk_live_XXXXXXXXXXXX
STRIPE_PUBLISHABLE_KEY=pk_live_XXXXXXXXXXXX
STRIPE_WEBHOOK_SECRET=whsec_XXXXXXXXXXXX
```

**Changes Needed**:
- Replace dummy Stripe calls with real SDK
- `POST /api/payment/create-intent` → Create real PaymentIntent
- `POST /api/payment/confirm` → Confirm payment with real card
- Add webhook handler for `payment_intent.succeeded` events
- Update payment_releases table with real Stripe transaction ID

**Current Code Location**: 
- Real integration already stubbed in `backend/src/routes/payment.ts`
- Just need to replace dummy logic with actual Stripe SDK calls

**Estimated Effort**: 3-4 hours

### 3.3 Frontend Setup

**Files**:
- `frontend/src/components/payment/StripeCheckout.tsx` (if doesn't exist, create it)
- Update `BidsViewer.tsx` to show real payment UI

**Changes Needed**:
- Use Stripe.js & Stripe Elements for card input
- Call `/api/payment/create-intent` to get client secret
- Present card form to user
- Confirm payment with Stripe
- Handle 3D Secure (SCA) authentication if required
- Show payment success/failure

**Estimated Effort**: 2-3 hours

### 3.4 Testing with Real Cards

**Stripe Test Mode** (always use first):
```
Test Card Success:
4242 4242 4242 4242 | 12/25 | 123 | Any ZIP

Test Card Decline:
4000 0000 0000 0002 | 12/25 | 123 | Any ZIP

Test Card 3D Secure:
4000 0025 0000 3155 | 12/25 | 123 | Any ZIP
```

**Test Flow**:
1. Asker posts errand
2. Doer submits bid
3. Asker accepts bid
4. Real payment form shows (Stripe Elements)
5. Enter test card → Payment processes
6. Status changes to "confirmed"
7. Check Stripe Dashboard → Transaction appears

**Estimated Effort**: 2-3 hours (with troubleshooting)

### 3.5 Production Switch

**Checklist**:
- [ ] All tests pass in Stripe test mode
- [ ] Error handling for declined cards
- [ ] Error handling for authentication failures
- [ ] Webhook integration working
- [ ] Payment confirmation emails setup (optional)
- [ ] Switch env vars from test to live keys

---

## Implementation Checklist

### Before Starting Integration
- [ ] Core feature testing PASSED
- [ ] All test scenarios documented
- [ ] No critical bugs found
- [ ] Database backup created

### SingPass Integration
- [ ] Request credentials from IDA Singapore
- [ ] Backend OAuth flow implemented
- [ ] Frontend redirect handling added
- [ ] Token storage & refresh working
- [ ] Login flow tested with real account

### Stripe Integration  
- [ ] Stripe test account created
- [ ] Backend Stripe SDK integrated
- [ ] Frontend payment form added
- [ ] Payment flow tested with test cards
- [ ] Webhook handlers implemented
- [ ] Error handling for all card scenarios
- [ ] Payment receipts/emails (optional)

### Deployment Readiness
- [ ] Environment variables configured
- [ ] HTTPS/TLS certificate installed
- [ ] Security headers added (CSP, X-Frame-Options, etc.)
- [ ] PDPA compliance review completed
- [ ] Error logging configured
- [ ] Database backups automated
- [ ] Monitoring alerts set up

---

## Environment Variables Reference

### Backend (.env)
```bash
# Current (Demo Mode)
NODE_ENV=development
DATABASE_URL=postgresql://user:pass@localhost/errandify
PORT=3000
JWT_SECRET=your-secret-key

# Add for SingPass
SINGPASS_CLIENT_ID=your_client_id
SINGPASS_CLIENT_SECRET=your_client_secret
SINGPASS_API_URL=https://api.singpass.gov.sg
SINGPASS_REDIRECT_URI=https://errandify.ai/auth/callback
USE_SINGPASS=true

# Add for Stripe (Test Keys)
STRIPE_SECRET_KEY=sk_test_XXXXXXXXXXXX
STRIPE_PUBLISHABLE_KEY=pk_test_XXXXXXXXXXXX
STRIPE_WEBHOOK_SECRET=whsec_test_XXXXXXXXXXXX

# Production (switch to live keys)
# STRIPE_SECRET_KEY=sk_live_XXXXXXXXXXXX
# STRIPE_PUBLISHABLE_KEY=pk_live_XXXXXXXXXXXX
# STRIPE_WEBHOOK_SECRET=whsec_live_XXXXXXXXXXXX
```

### Frontend (.env.local)
```bash
VITE_API_URL=http://localhost:3000
VITE_STRIPE_KEY=pk_test_XXXXXXXXXXXX  # Or pk_live_ for production
VITE_SINGPASS_CLIENT_ID=your_client_id
VITE_SINGPASS_REDIRECT_URI=http://localhost:5173/auth/callback
```

---

## Risk Mitigation

### Payment Failures
**Risk**: User payment fails, errand status unclear  
**Mitigation**: 
- All payment state stored in DB
- Retry mechanism for failed payments
- Clear error messages to user
- Webhook confirms final state

### SingPass Timeouts
**Risk**: SingPass API slow or down  
**Mitigation**:
- Keep demo login as fallback
- Implement retry with exponential backoff
- Monitor SingPass status
- Set 10-second timeout

### Security Issues
**Risk**: PII exposure, payment fraud  
**Mitigation**:
- Never store full card numbers (Stripe handles this)
- Encrypt NRIC/sensitive data in DB
- Use HTTPS everywhere
- Implement rate limiting
- Log payment events for audit

---

## Testing Scenarios After Integration

### SingPass Testing
```
1. Test with valid SingPass credentials
2. Test with expired SingPass
3. Test with invalid SingPass
4. Test browser back button after login
5. Test token refresh after 30 min
6. Test logout & re-login
```

### Stripe Testing
```
1. Successful payment (test card)
2. Declined payment (test card)
3. 3D Secure authentication
4. Timeout handling
5. Webhook verification
6. Refund processing (if implemented)
7. Multiple payments on same errand
8. Large amount handling ($500+)
9. Small amount handling ($1)
```

---

## Support & Resources

### SingPass
- Documentation: https://www.singpass.gov.sg/developer
- Support: developer-support@singpass.gov.sg
- Sandbox: Always available for testing

### Stripe
- Documentation: https://stripe.com/docs
- Test Dashboard: https://dashboard.stripe.com/test/login
- Support: https://support.stripe.com

---

## Timeline Summary

| Phase | Duration | Blocker |
|-------|----------|---------|
| 1. Test Core Features | 2-4 hours | None |
| 2. Request SingPass | 3-5 days | Government approval |
| 3. Implement SingPass | 6-8 hours | SingPass credentials |
| 4. Request Stripe | 1-2 days | None |
| 5. Implement Stripe | 6-8 hours | Stripe verification |
| 6. Testing & QA | 4-6 hours | None |
| **TOTAL** | **2-3 weeks** | SingPass approval |

---

## After Integration

1. ✅ Deploy to staging server
2. ✅ Run full UAT with real SingPass/Stripe
3. ✅ Get security audit clearance
4. ✅ Deploy to production
5. ✅ Monitor payment success rates
6. ✅ Handle user support tickets

---

**Last Updated**: 2026-06-18  
**Status**: Pending Phase 1 Test Completion  
**Next Action**: Run TESTING_CHECKLIST.md
