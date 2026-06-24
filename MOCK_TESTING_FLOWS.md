# 🎭 Mock SingPass & Stripe Testing Flows

**For testing without real authentication or payment processing**

---

## Mock SingPass Testing

### Endpoint: POST `/api/mock-auth/mock-singpass-login`

**This simulates real SingPass login flow for testing**

#### Request
```json
{
  "email": "asker@test.com",
  "password": "test123"
}
```

#### Response (Success - Asker)
```json
{
  "success": true,
  "message": "Login successful via mock SingPass",
  "data": {
    "user": {
      "id": 1,
      "nric": "1234567890ABC",
      "displayName": "John Lee",
      "email": "asker@test.com",
      "phone": "+6581234567",
      "role": "asker"
    },
    "token": "eyJhbGc..."
  }
}
```

#### Test Users Available
```
Asker:  email: asker@test.com  | password: test123
Doer:   email: doer@test.com   | password: test123
New:    email: newuser@test.com | password: test123 (creates new account)
```

#### What It Tests
✓ Login form validation
✓ User data retrieval (NRIC, name, phone)
✓ Role assignment (asker vs doer)
✓ JWT token generation
✓ Session management

---

## Mock SingPass OAuth Callback

### Endpoint: GET `/api/mock-auth/mock-singpass-callback`

**This simulates the SingPass OAuth redirect flow**

#### Request
```
GET /api/mock-auth/mock-singpass-callback?code=AUTH_CODE&state=STATE_VALUE
```

#### Response
```json
{
  "success": true,
  "message": "Mock SingPass OAuth simulation",
  "data": {
    "code": "mock_auth_code_12345",
    "state": "mock_state_12345",
    "userData": {
      "sub": "1234567890ABC",
      "name": "John Lee",
      "email": "john@example.com",
      "phone_number": "+6581234567",
      "birthdate": "1990-01-01"
    },
    "nextStep": "POST to /api/auth/singpass-callback with code"
  }
}
```

#### What It Tests
✓ OAuth redirect flow
✓ Authorization code handling
✓ User data extraction from SingPass
✓ NRIC/phone/email data mapping
✓ Birth date handling

---

## Mock Stripe Payment Testing

### Endpoint 1: POST `/api/mock-payment/mock-create-intent`

**This simulates creating a Stripe payment intent**

#### Request
```json
{
  "amount": 150.00,
  "taskId": 19,
  "doerId": 2
}
```

#### Response
```json
{
  "success": true,
  "message": "Mock payment intent created",
  "data": {
    "clientSecret": "pi_mock_1234567890_secret_abc123xyz",
    "intentId": "pi_mock_1234567890_abc123xyz",
    "amount": 150.00,
    "currency": "sgd",
    "testCards": {
      "success": "4242 4242 4242 4242",
      "decline": "4000 0000 0000 0002",
      "cvc": "any 3 digits",
      "expiry": "any future date"
    }
  }
}
```

#### Test Cards
```
Success:  4242 4242 4242 4242  | CVC: any 3 digits | Expiry: any future
Decline:  4000 0000 0000 0002  | CVC: any 3 digits | Expiry: any future
```

#### What It Tests
✓ Payment form initialization
✓ Amount validation
✓ Task and doer assignment
✓ Client secret generation (for Stripe Elements)
✓ Currency handling (SGD)

---

### Endpoint 2: POST `/api/mock-payment/mock-confirm-payment`

**This simulates confirming a Stripe payment**

#### Request
```json
{
  "intentId": "pi_mock_1234567890_abc123xyz",
  "cardToken": "tok_visa"
}
```

#### Response (Success)
```json
{
  "success": true,
  "message": "Mock payment confirmed successfully",
  "data": {
    "intentId": "pi_mock_1234567890_abc123xyz",
    "status": "succeeded",
    "amount": 150.00,
    "currency": "sgd",
    "chargeId": "ch_mock_1234567890",
    "taskId": 19,
    "doerId": 2,
    "timestamp": "2026-06-25T10:30:00.000Z"
  }
}
```

#### What It Tests
✓ Card validation
✓ Payment processing
✓ Status transitions
✓ Transaction recording
✓ Charge ID generation

---

### Endpoint 3: POST `/api/mock-payment/mock-refund`

**This simulates processing a refund**

#### Request
```json
{
  "intentId": "pi_mock_1234567890_abc123xyz",
  "reason": "customer_request"
}
```

#### Response
```json
{
  "success": true,
  "message": "Mock refund processed",
  "data": {
    "refundId": "re_mock_1234567890",
    "intentId": "pi_mock_1234567890_abc123xyz",
    "amount": 150.00,
    "status": "succeeded",
    "reason": "customer_request",
    "timestamp": "2026-06-25T10:35:00.000Z"
  }
}
```

#### What It Tests
✓ Refund processing
✓ Amount reversal
✓ Status changes
✓ Refund reason tracking

---

### Endpoint 4: POST `/api/mock-payment/mock-create-account`

**This simulates creating a Stripe Connected Account for doers**

#### Request
```json
{
  "doerId": 2,
  "email": "sarah@example.com",
  "name": "Sarah Tan"
}
```

#### Response
```json
{
  "success": true,
  "message": "Mock Stripe connected account created",
  "data": {
    "stripeAccountId": "acct_mock_2_xyz789abc",
    "doerId": 2,
    "email": "sarah@example.com",
    "name": "Sarah Tan",
    "type": "express",
    "country": "SG",
    "status": "active",
    "testBankAccount": {
      "accountNumber": "000123456789",
      "routingNumber": "110000000",
      "accountHolderName": "Sarah Tan",
      "country": "SG"
    }
  }
}
```

#### What It Tests
✓ Account creation for payouts
✓ Doer verification
✓ Bank account linking
✓ Country validation (SG)

---

### Endpoint 5: POST `/api/mock-payment/mock-payout`

**This simulates creating a payout to a doer**

#### Request
```json
{
  "stripeAccountId": "acct_mock_2_xyz789abc",
  "amount": 135.00,
  "taskId": 19
}
```

#### Response
```json
{
  "success": true,
  "message": "Mock payout created",
  "data": {
    "payoutId": "po_mock_1234567890",
    "stripeAccountId": "acct_mock_2_xyz789abc",
    "amount": 135.00,
    "currency": "sgd",
    "status": "in_transit",
    "taskId": 19,
    "estimatedArrival": "2026-06-27T10:30:00.000Z",
    "timeline": {
      "created": "2026-06-25T10:30:00.000Z",
      "processing": "Now",
      "arrival": "In 2 business days"
    }
  }
}
```

#### What It Tests
✓ Payout creation
✓ Amount calculation (after fees)
✓ Destination account validation
✓ Timeline and arrival date
✓ Payout status

---

## 🧪 Complete Testing Flows

### Flow 1: Full Payment from Task to Payout

```
1. Create task (asker)
2. Doer places bid
3. Asker accepts bid
4. POST /api/mock-payment/mock-create-intent
   - amount: $150, taskId: 19, doerId: 2
5. Frontend shows payment form
6. User enters test card: 4242 4242 4242 4242
7. POST /api/mock-payment/mock-confirm-payment
   - intentId: from step 4
8. Payment succeeds!
9. POST /api/mock-payment/mock-create-account
   - doerId: 2, email: doer@test.com, name: Sarah Tan
10. POST /api/mock-payment/mock-payout
   - stripeAccountId: from step 9
   - amount: 135.00 (after 10% fee)
11. Doer receives payout notification
```

### Flow 2: Failed Payment & Refund

```
1. POST /api/mock-payment/mock-create-intent
   - amount: $100, taskId: 19, doerId: 2
2. Frontend shows payment form
3. User enters test card: 4000 0000 0000 0002 (decline card)
4. POST /api/mock-payment/mock-confirm-payment
   - intentId: from step 1
5. Payment FAILS (declined)
6. User retries with correct card
7. POST /api/mock-payment/mock-confirm-payment (again)
8. Payment succeeds
9. Later, user requests refund
10. POST /api/mock-payment/mock-refund
    - intentId: from step 7
    - reason: "customer_request"
11. Refund processed, money returned
```

### Flow 3: Full SingPass Login + Payment

```
1. User clicks "Sign in with SingPass"
2. Frontend redirects to mock OAuth: /api/mock-auth/mock-singpass-callback
3. POST /api/mock-auth/mock-singpass-login
   - email: asker@test.com
   - password: test123
4. User logged in with JWT token
5. User creates task
6. Different user logs in as doer
   - email: doer@test.com
7. Doer places bid
8. Asker accepts bid
9. Continue with payment flow...
```

---

## 🔄 API Test Sequence (cURL Examples)

### 1. Mock SingPass Login
```bash
curl -X POST http://localhost:3000/api/mock-auth/mock-singpass-login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "asker@test.com",
    "password": "test123"
  }'
```

### 2. Create Payment Intent
```bash
curl -X POST http://localhost:3000/api/mock-payment/mock-create-intent \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "amount": 150.00,
    "taskId": 19,
    "doerId": 2
  }'
```

### 3. Confirm Payment
```bash
curl -X POST http://localhost:3000/api/mock-payment/mock-confirm-payment \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "intentId": "pi_mock_...",
    "cardToken": "tok_visa"
  }'
```

### 4. Create Connected Account
```bash
curl -X POST http://localhost:3000/api/mock-payment/mock-create-account \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "doerId": 2,
    "email": "sarah@example.com",
    "name": "Sarah Tan"
  }'
```

### 5. Create Payout
```bash
curl -X POST http://localhost:3000/api/mock-payment/mock-payout \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "stripeAccountId": "acct_mock_2_...",
    "amount": 135.00,
    "taskId": 19
  }'
```

---

## ✅ Validation Checklist

### SingPass Flow
- [ ] Login endpoint works
- [ ] JWT token returned
- [ ] User data correct
- [ ] Role assignment works
- [ ] New user creation works

### Payment Flow
- [ ] Payment intent created
- [ ] Client secret returned
- [ ] Payment confirmation works
- [ ] Refund processing works
- [ ] Connected account created
- [ ] Payout system works

### Field Validation
- [ ] Amount field accepts decimals
- [ ] Currency is SGD
- [ ] Task ID matches task
- [ ] Doer ID matches doer
- [ ] Phone format is correct
- [ ] NRIC format is correct

### Response Validation
- [ ] All responses have success flag
- [ ] All responses have data object
- [ ] Timestamps are ISO format
- [ ] IDs are unique
- [ ] Status values are valid

---

## 🚨 Common Issues & Fixes

### Issue: "Authorization required"
```
Make sure to include JWT token in header:
Authorization: Bearer YOUR_JWT_TOKEN
```

### Issue: "Payment intent not found"
```
Use the intentId from the create-intent response,
not the clientSecret
```

### Issue: "Missing fields"
```
Ensure all required fields are provided:
- Create intent: amount, taskId, doerId
- Confirm payment: intentId, cardToken
- Create account: doerId, email, name
- Create payout: stripeAccountId, amount, taskId
```

---

## 📋 Testing Checklist Before Real Integration

- [ ] SingPass mock endpoint responds correctly
- [ ] Payment intent creation works
- [ ] Payment confirmation processes
- [ ] Test cards work (success & decline)
- [ ] Refund processing works
- [ ] Connected account creation works
- [ ] Payout system works
- [ ] All error cases handled
- [ ] Field validation works
- [ ] JWT token authentication works

---

**These mock endpoints perfectly simulate the real SingPass and Stripe flows, allowing you to test the entire system before going live!**

