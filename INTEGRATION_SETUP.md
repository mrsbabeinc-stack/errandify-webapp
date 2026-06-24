# Errandify Integration Setup Guide

## ✅ What's Already Configured

### 1. **Stripe Payments** 
- ✅ API Keys stored in `.env`
- ✅ Status: Test mode active
- **Next steps:** 
  - [ ] Implement payment intent creation
  - [ ] Implement Stripe Connect for doer payouts
  - [ ] Webhook handling for payment events
  - [ ] Payment flow in task completion

### 2. **SingPass MyInfo v5 Authentication**
- ✅ Client ID: `STG-202531346W-LOGIN-Errand-d8ZpLL`
- ✅ JWKS endpoint configured
- ✅ Redirect URI: `https://app-dev.errandify.ai/register-sing-pass`
- **Next steps:**
  - [ ] Implement OAuth2 flow on backend
  - [ ] Generate public/private key pair for JWT signing
  - [ ] Implement token validation
  - [ ] Implement user data retrieval from MyInfo

### 3. **Qwen AI API**
- ✅ API key already configured
- ✅ Used for: Text extraction, TTS (audio)
- **Status:** Working (text-to-speech implemented)
- **Next steps:**
  - [ ] Implement MyInfo data extraction via Qwen
  - [ ] Implement additional AI features as needed

### 4. **NewsAPI**
- ✅ API key configured
- ✅ Used for: Singapore news articles
- **Status:** Should be working
- **Next steps:** None needed for MVP

---

## 📋 Integration Checklist

### Phase 1: Authentication (SingPass)
- [ ] Backend: OAuth2 authorization endpoint
- [ ] Backend: JWT token generation with private key
- [ ] Backend: MyInfo user data retrieval
- [ ] Frontend: SingPass login button
- [ ] Frontend: Redirect handling after auth
- [ ] Backend: User profile creation from MyInfo data
- [ ] Testing: Full login flow with test account

### Phase 2: Payments (Stripe)
- [ ] Backend: Payment intent creation endpoint
- [ ] Backend: Stripe Connect setup for doer accounts
- [ ] Backend: Webhook handlers for payment events
- [ ] Frontend: Payment form integration
- [ ] Frontend: Payout status tracking
- [ ] Testing: Test payment flow end-to-end

### Phase 3: Data Privacy & Compliance
- [ ] Store MyInfo data securely (encrypted)
- [ ] Implement data retention policies
- [ ] Add audit logs for sensitive operations
- [ ] Implement PDPA consent management
- [ ] Testing: Data privacy compliance

---

## 🔧 What Still Needs to Be Done

### High Priority
1. **SingPass OAuth2 Implementation**
   - Backend route: `POST /api/auth/singpass` 
   - Validate authorization code from SingPass
   - Exchange for access token
   - Retrieve user data from MyInfo

2. **Stripe Payment Integration**
   - Create payment intent when offer accepted
   - Implement Connect for doer payouts
   - Handle payment webhooks
   - Track payment status

3. **Private Key Generation for SingPass**
   - Generate ED25519 keypair
   - Store private key securely in backend
   - Upload public key (JWKS format) to SingPass

### Medium Priority
1. User data mapping from MyInfo to local database
2. Payment reconciliation system
3. Payout scheduling for doers
4. Invoice generation

### Low Priority
1. Enhanced error handling for external APIs
2. Fallback mechanisms if APIs unavailable
3. Admin dashboard for payment tracking

---

## 🚀 Recommended Next Steps

1. **This Week:**
   - [ ] Generate SingPass keypair (ED25519)
   - [ ] Implement OAuth2 flow on backend
   - [ ] Test SingPass login with staging account

2. **Next Week:**
   - [ ] Implement Stripe Connect setup
   - [ ] Create payment flow UI
   - [ ] Test full payment flow

3. **Following Week:**
   - [ ] Implement webhooks
   - [ ] Add payment status tracking
   - [ ] Full integration testing

---

## 📞 Support Resources

- **SingPass MyInfo:** https://www.singpass.gov.sg/
- **Stripe Docs:** https://stripe.com/docs
- **Qwen API:** https://help.aliyun.com/zh/dashscope

---

## ⚠️ Important Security Notes

1. **Never commit .env file** - It's in .gitignore for a reason
2. **Rotate Stripe keys regularly** in production
3. **Keep private SingPass key secure** - Only in backend .env
4. **Use HTTPS only** for all redirects
5. **Implement rate limiting** on auth endpoints
6. **Log all payment events** for auditing
7. **Encrypt sensitive data** at rest

---

## 📊 Current Integration Status

| Service | Status | Priority | Est. Hours |
|---------|--------|----------|-----------|
| SingPass Auth | 🟡 Configured | High | 16 |
| Stripe Payments | 🟡 Configured | High | 20 |
| Qwen AI | ✅ Working | Done | 0 |
| NewsAPI | ✅ Working | Done | 0 |
| **Total** | | | **36 hours** |

