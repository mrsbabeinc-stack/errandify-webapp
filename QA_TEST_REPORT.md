# QA TEST REPORT: Complete Task Flow

**Test Date:** June 21, 2026  
**Test Environment:** Local (http://localhost:3000 backend, http://localhost:5173 frontend)  
**Test Type:** End-to-End Task Lifecycle Testing  
**Overall Result:** ❌ PARTIAL FAILURE (58% Success Rate)

---

## EXECUTIVE SUMMARY

The task flow was tested from creation through bidding, acceptance, execution, and rating. **7 out of 12 test cases passed** (58% success rate). The main blocking issue is a database schema mismatch in the bid acceptance flow that prevents the task from moving forward.

### Test Participants
- **Asker:** Sarah Tan (ID: 2)
- **Doer:** John Lee (ID: 8)

---

## DETAILED TEST RESULTS

### ✅ PHASE 1: ASKER CREATES TASK (3/3 PASSED)

**Status:** WORKING CORRECTLY

| Step | Test | Result | Notes |
|------|------|--------|-------|
| 1.1 | Create task with POST /api/errands | ✅ PASS | Task ID: 27 created successfully |
| 1.2 | Verify task status is 'open' | ✅ PASS | Status: "open" confirmed |
| 1.3 | Verify budget amount | ✅ PASS | Budget correctly saved as $45.00 |

**Details:**
```json
POST /api/errands
Response:
{
  "success": true,
  "data": {
    "id": 27,
    "title": "Clean my apartment living room",
    "description": "Need to vacuum, dust, and tidy up my living room. Takes about 2 hours. I have cleaning supplies ready.",
    "category": "Cleaning & Household",
    "status": "open",
    "budget": "45.00",
    "location": "Blk 123 Ang Mo Kio, Singapore 567890",
    "deadline": "2026-06-22T06:00:00.000Z",
    "isRecurring": false,
    "createdAt": "2026-06-21T10:20:34.210Z"
  }
}
```

---

### ✅ PHASE 2: DOER BROWSES & PLACES BID (3/3 PASSED)

**Status:** WORKING CORRECTLY

| Step | Test | Result | Notes |
|------|------|--------|-------|
| 2.1 | Get available errands with GET /api/errands | ✅ PASS | Doer can see task in list |
| 2.2 | Place bid with POST /api/bids | ✅ PASS | Bid ID: 8 created successfully |
| 2.3 | Verify bid status is 'pending' | ✅ PASS | Status: "pending" confirmed |

**Details:**
```json
POST /api/bids
Request:
{
  "task_id": 27,
  "amount": 40,
  "note": "I am experienced cleaner, can finish in 1.5 hours"
}

Response:
{
  "success": true,
  "data": {
    "id": 8,
    "taskId": 27,
    "doerId": 8,
    "doerName": "John Lee",
    "amount": "40.00",
    "note": "I am experienced cleaner, can finish in 1.5 hours",
    "status": "pending",
    "createdAt": "2026-06-21T10:20:35.022Z"
  }
}
```

---

### ❌ PHASE 3: ASKER ACCEPTS BID (1/2 PASSED)

**Status:** BLOCKED - BID ACCEPTANCE FAILS

| Step | Test | Result | Notes |
|------|------|--------|-------|
| 3.1 | Get bids for task with GET /api/bids/task/:id | ✅ PASS | Asker can retrieve bids |
| 3.2 | Accept bid with POST /api/bids/:id/accept | ❌ FAIL | 500 Internal Server Error |

**Error Details:**
```
HTTP/1.1 500 Internal Server Error
{"error": "Failed to accept bid"}
```

**Root Cause:** Database schema mismatch
- **File:** `/backend/src/routes/bids.ts` line 221
- **Code:** `UPDATE errands SET status = $1, accepted_bid_id = $2, confirmation_expires_at = NOW() + INTERVAL '24 hours' WHERE id = $3`
- **Issue:** The `confirmation_expires_at` column does not exist in the `errands` table
- **Database:** The migration to add this field was never created or executed

**Evidence:**
- Schema check shows `errands` table has:
  - ✅ `accepted_bid_id` INTEGER (exists)
  - ❌ `confirmation_expires_at` TIMESTAMP (MISSING)

**Files Affected:**
- `/backend/src/routes/bids.ts` (lines 220-223) - attempts to set missing column
- `/backend/database/schema.sql` - column not defined in CREATE TABLE
- Migration files - no migration to add this column exists

---

### ❌ PHASE 4: TASK EXECUTION (0/2 PASSED)

**Status:** BLOCKED - Bid acceptance failure cascades

| Step | Test | Result | Notes |
|------|------|--------|-------|
| 4.1 | Start task with POST /api/tasks/:id/start | ❌ FAIL | Cannot start - doer not assigned |
| 4.2 | Complete task with POST /api/tasks/:id/complete | ❌ FAIL | Task still in 'open' status |

**Error Details:**

Task Start:
```json
{
  "error": "You are not assigned to this task"
}
```

Task Complete:
```json
{
  "error": "Cannot complete task in status \"open\""
}
```

**Root Cause:** The bid acceptance never completed, so:
1. The `errand_assignments` table was never populated (no assignment created)
2. The `errands.status` was never changed from 'open' to 'confirmed'
3. Doer cannot start task because they have no assignment record
4. Asker cannot mark complete because task is still 'open'

---

### ❌ PHASE 5: RATINGS (0/2 PASSED)

**Status:** BLOCKED - Task not in completed state

| Step | Test | Result | Notes |
|------|------|--------|-------|
| 5.1 | Asker rates doer with POST /api/ratings | ❌ FAIL | Task must be completed first |
| 5.2 | Doer rates asker with POST /api/ratings | ❌ FAIL | Task must be completed first |

**Error Details:**
```json
{
  "error": "Can only rate completed tasks"
}
```

**Root Cause:** Ratings endpoint checks `if (!task.status.includes('completed'))` - the task is still in 'open' state, so ratings cannot be submitted.

---

## CRITICAL ISSUE: BID ACCEPTANCE FAILURE

### Issue Summary
The bid acceptance endpoint (`POST /api/bids/:id/accept`) fails with a 500 error due to attempting to update a non-existent database column.

### SQL Error Analysis
The code tries to execute:
```sql
UPDATE errands 
SET status = $1, accepted_bid_id = $2, confirmation_expires_at = NOW() + INTERVAL '24 hours' 
WHERE id = $3
```

But the `errands` table schema does NOT include `confirmation_expires_at`:
```sql
CREATE TABLE errands (
  id SERIAL PRIMARY KEY,
  asker_id INTEGER NOT NULL,
  title VARCHAR(255) NOT NULL,
  -- ... other fields ...
  accepted_bid_id INTEGER,  -- ✅ EXISTS
  -- confirmation_expires_at TIMESTAMP,  -- ❌ MISSING
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Impact
- **Severity:** CRITICAL - Blocks entire task workflow
- **Affected Feature:** Bid acceptance (core functionality)
- **Affected Users:** Both asker and doer (cannot proceed past bidding phase)
- **Cascade Effect:** Prevents task execution, completion, and rating

### Solution Required
Create database migration to add the missing column:

```sql
ALTER TABLE errands 
ADD COLUMN confirmation_expires_at TIMESTAMP;
```

---

## SECONDARY ISSUES DISCOVERED

### Issue 2: Errand Assignment Not Created on Bid Accept

When bid acceptance completes successfully, the code should create an `errand_assignments` record. Currently, the code does not perform this operation.

**Code Reference:** `/backend/src/routes/bids.ts` (POST `/:id/accept`)

**Expected Behavior:**
```sql
INSERT INTO errand_assignments (errand_id, doer_id, status)
VALUES ($1, $2, 'accepted')
```

**Current Behavior:** No INSERT statement exists

**Impact:** The `errand_assignments` table stays empty, causing the task start endpoint to fail with "You are not assigned to this task"

---

## TEST COVERAGE SUMMARY

| Phase | Endpoint | Method | Status | Tests Passed |
|-------|----------|--------|--------|--------------|
| 1 | POST /api/errands | POST | ✅ Working | 3/3 |
| 2 | GET /api/errands | GET | ✅ Working | 2/2 |
| 2 | POST /api/bids | POST | ✅ Working | 1/1 |
| 2 | GET /api/bids/task/:id | GET | ✅ Working | 1/1 |
| 3 | POST /api/bids/:id/accept | POST | ❌ **BROKEN** | 0/1 |
| 4 | POST /api/tasks/:id/start | POST | ❌ Blocked | 0/1 |
| 4 | POST /api/tasks/:id/complete | POST | ❌ Blocked | 0/1 |
| 5 | POST /api/ratings | POST | ❌ Blocked | 0/2 |

---

## DATA PERSISTENCE CHECK

### Task Data Saved ✅
```sql
SELECT * FROM errands WHERE id = 27;
-- Returns: All fields correctly saved in database
```

### Bid Data Saved ✅
```sql
SELECT * FROM bids WHERE id = 8;
-- Returns: Bid correctly saved with status = 'pending'
```

### Assignment Data NOT Created ❌
```sql
SELECT * FROM errand_assignments WHERE errand_id = 27;
-- Returns: No rows (empty)
```

---

## API ENDPOINT VERIFICATION

| Endpoint | Method | Status | Response Code |
|----------|--------|--------|-------|
| POST /api/errands | Create task | ✅ Working | 201 Created |
| GET /api/errands | List tasks | ✅ Working | 200 OK |
| POST /api/bids | Place bid | ✅ Working | 201 Created |
| GET /api/bids/task/:id | List bids | ✅ Working | 200 OK |
| POST /api/bids/:id/accept | Accept bid | ❌ BROKEN | 500 Internal Error |
| POST /api/tasks/:id/start | Start task | ❌ Blocked | 400 Bad Request |
| POST /api/tasks/:id/complete | Complete task | ❌ Blocked | 400 Bad Request |
| POST /api/ratings | Submit rating | ❌ Blocked | 400 Bad Request |

---

## BROWSER CONSOLE ERRORS

**Testing:** No browser console errors were present during API testing (curl-based).

Frontend testing would require opening two browser windows as per test plan.

---

## RECOMMENDATIONS

### Immediate Actions (CRITICAL)
1. **Create migration file:** `database/add_confirmation_expires_at.sql`
   ```sql
   ALTER TABLE errands ADD COLUMN confirmation_expires_at TIMESTAMP;
   ALTER TABLE errands ADD COLUMN confirmation_extended BOOLEAN DEFAULT FALSE;
   ```

2. **Execute migration:** Run the migration on the development database

3. **Add errand_assignments creation:** Update `/backend/src/routes/bids.ts` POST `/:id/accept` to insert assignment record

4. **Restart backend:** `npm start` to reload code

5. **Re-run tests:** Verify all phases now pass

### Testing Verification
After fixes, re-run the complete test flow:
```bash
# Phase 1: Create task ✅
# Phase 2: Browse & bid ✅  
# Phase 3: Accept bid (should now work)
# Phase 4: Execute task (should now work)
# Phase 5: Rate each other (should now work)
# Phase 8: Verify final state (complete, ratings saved, balances updated)
```

### Long-term Improvements
1. Add integration tests for complete task flow
2. Add database schema validation in CI/CD pipeline
3. Add API contract tests to catch schema mismatches
4. Document all required database columns in code comments

---

## CONCLUSION

The Errandify task flow is **58% functional** in its current state. The core issue blocking progress is a **missing database column** (`confirmation_expires_at`) referenced in the bid acceptance logic. Once this migration is applied and errand_assignments creation is added, the complete task flow should work end-to-end.

**Next Step:** Apply the database migration and code fix to unblock the workflow.

---

## APPENDIX: Test Environment Details

- **Backend:** Express.js, Node.js
- **Database:** PostgreSQL
- **Frontend:** React/Vite
- **Auth:** JWT tokens (demo login)
- **Test Accounts:**
  - Asker: sarah (ID: 2)
  - Doer: john (ID: 8)
- **Test Task:** Clean my apartment living room ($45 budget, Task ID: 27)
- **Test Bid:** $40 from John Lee (Bid ID: 8)

