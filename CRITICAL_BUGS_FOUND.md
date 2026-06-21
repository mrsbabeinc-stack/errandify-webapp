# CRITICAL BUGS - Task Flow Blocking Issues

## BUG #1: Missing Database Column - `confirmation_expires_at` 

**Severity:** 🔴 CRITICAL (Blocks entire workflow)

**Status:** Task Flow Phase 3 - Bid Acceptance FAILS

### The Problem
When an asker tries to accept a bid, the backend crashes with HTTP 500 error.

```
POST /api/bids/8/accept
Response: {"error": "Failed to accept bid"}
```

### Root Cause
The code attempts to update a column that doesn't exist in the database:

**File:** `/backend/src/routes/bids.ts` (line 221)
```typescript
await db.query(
  'UPDATE errands SET status = $1, accepted_bid_id = $2, confirmation_expires_at = NOW() + INTERVAL \'24 hours\' WHERE id = $3',
  ['confirmed', id, bid.errand_id]
);
```

**Database Schema:** `/backend/database/schema.sql`
```sql
CREATE TABLE errands (
  id SERIAL PRIMARY KEY,
  asker_id INTEGER NOT NULL REFERENCES users(id),
  title VARCHAR(255) NOT NULL,
  -- ... other fields ...
  accepted_bid_id INTEGER,  -- ✅ EXISTS
  -- confirmation_expires_at TIMESTAMP,  -- ❌ MISSING!
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### The Fix
Create and execute this database migration:

**File to Create:** `/backend/database/add_confirmation_expires_at.sql`
```sql
-- Add missing columns for bid confirmation workflow
ALTER TABLE errands 
ADD COLUMN confirmation_expires_at TIMESTAMP,
ADD COLUMN confirmation_extended BOOLEAN DEFAULT FALSE;
```

**Steps to Apply:**
1. Create the file above with the SQL
2. Connect to your PostgreSQL database
3. Run: `psql -U postgres -d errandify < /backend/database/add_confirmation_expires_at.sql`
4. Verify the column exists:
   ```sql
   SELECT column_name FROM information_schema.columns 
   WHERE table_name='errands' AND column_name='confirmation_expires_at';
   -- Should return: confirmation_expires_at
   ```
5. Restart the backend server

### Impact
- ❌ Asker cannot accept bids
- ❌ Doer cannot start tasks
- ❌ Task cannot be marked complete
- ❌ Ratings cannot be submitted
- **Affects:** Entire task workflow (Phases 3-7 blocked)

---

## BUG #2: Errand Assignment Not Created on Bid Accept

**Severity:** 🔴 CRITICAL (Secondary blocker)

**Status:** Task Flow Phase 4 - Task Start FAILS

### The Problem
After bid acceptance completes, the doer cannot start the task:

```
POST /api/tasks/27/start
Response: {"error": "You are not assigned to this task"}
```

### Root Cause
When bid is accepted, the code updates the `errands` table but **never creates a record in the `errand_assignments` table**.

**File:** `/backend/src/routes/bids.ts` (POST `/:id/accept`)

**Current Code (lines 219-223):**
```typescript
// Update errand status to 'confirmed' and set 24h confirmation deadline
await db.query(
  'UPDATE errands SET status = $1, accepted_bid_id = $2, confirmation_expires_at = NOW() + INTERVAL \'24 hours\' WHERE id = $3',
  ['confirmed', id, bid.errand_id]
);
```

**Missing Code:**
```typescript
// INSERT errand_assignments record (MISSING!)
// Should be added after the UPDATE statement above
```

### The Fix

**File:** `/backend/src/routes/bids.ts`

**Location:** In the POST `/:id/accept` handler, after line 223 (after the UPDATE errands query)

**Add this code:**
```typescript
    // Create errand assignment record
    try {
      await db.query(
        `INSERT INTO errand_assignments (errand_id, doer_id, status, created_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (errand_id, doer_id) DO UPDATE 
         SET status = $3`,
        [bid.errand_id, bid.doer_id, 'accepted']
      );
    } catch (assignmentErr) {
      console.error('[Bids] Failed to create assignment:', assignmentErr);
      // Don't fail the entire request if assignment creation fails
    }
```

**Where Exactly to Add:**
After the "Update errand status" block and BEFORE the "Send notification to doer" block:

```typescript
    // Update errand status to 'confirmed' and set 24h confirmation deadline
    await db.query(
      'UPDATE errands SET status = $1, accepted_bid_id = $2, confirmation_expires_at = NOW() + INTERVAL \'24 hours\' WHERE id = $3',
      ['confirmed', id, bid.errand_id]
    );

    // 👇 ADD THE CODE HERE 👇
    // Create errand assignment record
    try {
      await db.query(
        `INSERT INTO errand_assignments (errand_id, doer_id, status, created_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (errand_id, doer_id) DO UPDATE 
         SET status = $3`,
        [bid.errand_id, bid.doer_id, 'accepted']
      );
    } catch (assignmentErr) {
      console.error('[Bids] Failed to create assignment:', assignmentErr);
      // Don't fail the entire request if assignment creation fails
    }

    // Send notification to doer that their bid was accepted
    try {
      // ... rest of code ...
```

### Impact
- ❌ Doer cannot start tasks
- ❌ Task cannot be marked complete
- ❌ Ratings cannot be submitted
- **Affects:** Phases 4-7

---

## VERIFICATION CHECKLIST

After applying both fixes, verify with these SQL queries:

### 1. Confirm Column Added
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name='errands' 
AND column_name IN ('confirmation_expires_at', 'confirmation_extended');
```
Expected: 2 rows returned

### 2. Test Bid Acceptance
```bash
curl -X POST http://localhost:3000/api/bids/8/accept \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"
```
Expected: HTTP 200, `{"success": true, ...}`

### 3. Verify Assignment Created
```sql
SELECT * FROM errand_assignments WHERE errand_id = 27;
```
Expected: 1 row with status='accepted'

### 4. Test Task Start
```bash
curl -X POST http://localhost:3000/api/tasks/27/start \
  -H "Authorization: Bearer $DOER_TOKEN" \
  -H "Content-Type: application/json"
```
Expected: HTTP 200, `{"success": true, ...}`

---

## TESTING EVIDENCE

### Before Fix
```
PHASE 3: ASKER ACCEPTS BID
❌ Bid acceptance failed: Failed to accept bid

PHASE 4: TASK EXECUTION  
❌ Could not start task: You are not assigned to this task
❌ Could not complete task: Cannot complete task in status "open"

PHASE 5: RATINGS
❌ Asker rating failed: Can only rate completed tasks
❌ Doer rating failed: Can only rate completed tasks

Overall: 7/12 tests passed (58%)
```

### Expected After Fix
```
PHASE 3: ASKER ACCEPTS BID
✅ Asker accepted bid successfully

PHASE 4: TASK EXECUTION
✅ Task started successfully
✅ Task marked as complete

PHASE 5: RATINGS
✅ Asker rated doer
✅ Doer rated asker

Overall: 12/12 tests passed (100%)
```

---

## TIME TO FIX

- Database migration: **5 minutes**
- Code addition: **2 minutes**
- Testing: **3 minutes**
- **Total: ~10 minutes**

---

## NEXT STEPS

1. ✏️ Create `/backend/database/add_confirmation_expires_at.sql`
2. 🗄️ Execute migration on database
3. 📝 Add errand_assignments INSERT to `/backend/src/routes/bids.ts`
4. 🔄 Rebuild backend: `npm run build`
5. ▶️ Restart backend: `npm start`
6. ✅ Run QA tests to verify all phases now pass

