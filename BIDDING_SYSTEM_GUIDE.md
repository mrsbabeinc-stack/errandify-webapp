# Bidding System & Floating Hana Guide

## What Was Built

### 1. **Complete Bidding System**

#### Doer Perspective:
1. Browse errands (any open errand)
2. Click "Submit a Bid" button
3. Modal appears with:
   - Budget reference
   - Your bid amount field (pre-filled with errand budget)
   - Notes field (optional, for explaining experience)
4. Submit bid → Button changes to "✓ Bid Submitted"

#### Asker Perspective:
1. Post an errand
2. View their posted errand detail
3. See a "Bids" section showing:
   - All pending bids sorted by newest first
   - Doer name & avatar
   - Bid amount
   - Doer's note (if any)
   - "Accept" and "Reject" buttons per bid
4. Click "Accept" on a bid:
   - Bid status → accepted
   - All other bids → rejected
   - Errand status → confirmed
   - Dummy Stripe PaymentIntent created
5. Reject bids individually
   - Doer notified (TODO in code)
   - Can resubmit once

---

### 2. **Floating Hana (Always Available)**

#### Visual:
- Robot emoji button 🤖 in bottom-right corner (fixed position)
- Persists on all authenticated pages
- Above bottom navigation

#### Interactions:
- **Click button** → Hana modal opens in floating window (bottom-right)
- **Close (✕)** → Dismisses Hana completely
- **Minimize (−)** → Collapses window (button shows with ring border)
- Click minimized button → Expands again
- **Completion** → Auto-navigates to CreateErrandPage with prefilled data

---

## API Endpoints Reference

### Bidding Endpoints

#### Submit a Bid
```
POST /api/bids
Body: {
  task_id: number,
  amount: number,
  note?: string
}
Response: {
  success: true,
  data: {
    id: number,
    taskId: number,
    doerId: number,
    doerName: string,
    amount: number,
    note: string | null,
    status: 'pending',
    createdAt: ISO timestamp
  }
}
```

#### View Bids for Task (Asker Only)
```
GET /api/bids/task/:taskId
Headers: Authorization: Bearer <token>
Response: {
  success: true,
  data: [
    {
      id: number,
      taskId: number,
      doerId: number,
      doerName: string,
      doerAvatar: string | null,
      amount: number,
      note: string | null,
      status: 'pending' | 'accepted' | 'rejected',
      createdAt: ISO timestamp
    },
    ...
  ]
}
```

#### Accept a Bid
```
POST /api/bids/:bidId/accept
Headers: Authorization: Bearer <token>
Response: {
  success: true,
  data: {
    bidId: number,
    taskId: number,
    stripeIntent: {
      id: string,        // Dummy: pi_1234567890_abc123def456
      amount: number,    // In cents (budget * 100)
      currency: 'sgd',
      status: 'requires_payment_method',
      client_secret: string,
      capture_method: 'manual'
    }
  }
}
```

#### Reject a Bid
```
POST /api/bids/:bidId/reject
Headers: Authorization: Bearer <token>
Response: {
  success: true,
  data: {
    bidId: number,
    status: 'rejected'
  }
}
```

#### Cancel Task
```
POST /api/tasks/:taskId/cancel
Headers: Authorization: Bearer <token>
Response: {
  success: true,
  data: {
    taskId: number,
    status: 'cancelled_by_asker',
    penalty: number,      // SGD
    refundAmount: number  // SGD
  }
}
```

### Payment Endpoints (Dummy)

#### Get Payment Methods
```
GET /api/payment/methods
Headers: Authorization: Bearer <token>
Response: {
  success: true,
  data: [
    {
      id: string,
      type: 'card',
      last4: string,
      brand: 'visa' | 'mastercard' | 'unknown',
      expiryMonth: number,
      expiryYear: number,
      isDefault: boolean
    },
    ...
  ]
}
```

#### Add Payment Method
```
POST /api/payment/add-method
Headers: Authorization: Bearer <token>
Body: {
  cardNumber: string,
  expiryMonth: number,
  expiryYear: number,
  cvc: string
}
Response: {
  success: true,
  data: {
    id: string,
    type: 'card',
    last4: string,
    brand: string,
    isDefault: boolean
  }
}
```

#### Create Payment Intent
```
POST /api/payment/create-intent
Headers: Authorization: Bearer <token>
Body: {
  amount: number,
  bidId: number
}
Response: {
  success: true,
  data: {
    id: string,
    amount: number,      // In cents
    currency: 'sgd',
    status: 'requires_confirmation',
    client_secret: string,
    capture_method: 'manual'
  }
}
```

#### Confirm Payment
```
POST /api/payment/confirm
Headers: Authorization: Bearer <token>
Body: {
  intentId: string,
  paymentMethodId?: string
}
Response: {
  success: true,
  data: {
    intentId: string,
    status: 'succeeded',
    message: 'Payment confirmed and amount held in escrow'
  }
}
```

---

## Test Flow

### Setup
1. Database must have `bids`, updated `errands`, and updated `users` tables
2. Backend running on `http://localhost:3000`
3. Frontend running on dev server
4. Two test users logged in (different browsers/tabs)

### Test Scenario 1: Complete Bidding Flow

**User A (Asker):**
1. Navigate to Home
2. Click "Post an Errand" or Hana button 🤖
3. Fill in errand details (or use Hana to auto-fill)
4. Post errand
5. Note the errand ID

**User B (Doer):**
1. Navigate to Browse Errands
2. Find User A's errand
3. Click "Submit a Bid"
4. Enter bid amount (e.g., $80)
5. Add note (e.g., "I have 5 years experience")
6. Submit
7. Button changes to "✓ Bid Submitted"

**User A (Asker):**
1. View their posted errand
2. Scroll to "Bids" section
3. See User B's bid with:
   - Doer name
   - $80 amount
   - Note text
   - "Accept" and "Reject" buttons
4. Click "Accept"
5. Errand status changes to "confirmed"
6. All other bids show as "rejected"
7. Response contains dummy Stripe PaymentIntent

### Test Scenario 2: Floating Hana

**Any User:**
1. Navigate to any authenticated page (home, browse, etc.)
2. Robot emoji 🤖 visible in bottom-right corner
3. Click button → Hana modal opens in floating window
4. Type errand description in Hana
5. Hana extracts info and pre-fills
6. Click complete/submit in Hana
7. Auto-navigate to CreateErrandPage with prefilled URL params
8. Form shows: title, location, time, duration, budget pre-filled
9. User can edit and post

### Test Scenario 3: Bid Rejection

**User A (Asker):**
1. Has multiple bids on an errand
2. Click "Reject" on one bid
3. Bid status → "rejected"
4. User B notified (TODO notification feature)
5. User B can resubmit once (resubmit_count: 1)

### Test Scenario 4: Sensitive Task Declaration

**Errand Setup:**
1. User A posts "Childcare" task
2. User B tries to bid without clean declaration_status
3. API returns 403: "You must have a clean declaration status for this task"

**Fix:**
1. Update User B's `declaration_status` to 'clean' in DB
2. Retry bid → Success

---

## Database Changes

### New Table: `bids`
```sql
CREATE TABLE bids (
  id SERIAL PRIMARY KEY,
  task_id INTEGER NOT NULL REFERENCES errands(id),
  doer_id INTEGER NOT NULL REFERENCES users(id),
  amount DECIMAL(10, 2) NOT NULL,
  note TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  resubmit_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Updated `errands` Table
- `accepted_bid_id` (INTEGER) - References accepted bid
- `stripe_payment_intent_id` (VARCHAR) - Dummy or real Stripe ID
- `status` now includes: 'confirmed', 'cancelled_by_asker', 'cancelled_by_doer'

### Updated `users` Table
- `avatar_url` (VARCHAR) - For doer profiles in bids view
- `declaration_status` (VARCHAR) - 'pending' | 'clean' | 'flagged'
- `trust_score` (DECIMAL) - Default 5.0 (for future: bid recommendations)
- `penalty_owed` (DECIMAL) - Tracks cancellation penalties

---

## Frontend Components

### New Components

#### `FloatingHana` (`frontend/src/components/FloatingHana.tsx`)
- Persistent floating button across all pages
- Modal wrapper around HanaTaskCreation
- Minimize/close/expand states
- Auto-navigates on completion

#### `BidSubmissionModal` (`frontend/src/components/BidSubmissionModal.tsx`)
- Form for doers to submit bids
- Amount input (pre-filled with errand budget)
- Notes textarea
- Submit/cancel buttons
- Error handling

#### `BidsViewer` (`frontend/src/components/BidsViewer.tsx`)
- Displays all bids for an errand (asker only)
- Auto-refreshes every 3 seconds
- Accept/reject buttons
- Shows accepted bid status
- Filters pending vs accepted

### Updated Components

#### `ErrandDetailPage.tsx`
- Integrated BidSubmissionModal for doers
- Integrated BidsViewer for askers
- Shows "Submit a Bid" button (changes to checkmark after bid)
- Shows all bids when viewing own errand

#### `Layout.tsx`
- Now uses FloatingHana instead of conditional modal
- Simplified state management

---

## Known Features

✅ Doers submit bids on open errands
✅ Askers view all bids for their errands
✅ Accept bid → confirm errand + create dummy Stripe intent
✅ Reject individual bids
✅ Sensitive task category validation
✅ Floating Hana on all pages
✅ Bid resubmission tracking (max 1)
✅ Cancellation penalty calculation (5% or $5 min)
✅ Dummy Stripe payment flow

## TODO (Next Phase)

- [ ] Real Stripe Connect integration
- [ ] Notification system (bid updates)
- [ ] Hana AI bidding suggestion (Qwen integration)
- [ ] Actual payment capture after card auth
- [ ] Trust score calculation from ratings
- [ ] Doer completion & rating flow
- [ ] Message notifications to doer when bid rejected
- [ ] Bid resubmission modal/flow
- [ ] Task completion with payment release from escrow

---

## Deployment Notes

1. **Database Migration**: Run updated schema.sql to add bids table and new columns
2. **Environment**: Dummy Stripe works without API keys (ready for real Stripe setup)
3. **Node Version**: Requires Node 18+ (ES modules)
4. **Backend**: TypeScript compiles to ES modules (use `import` not `require`)
