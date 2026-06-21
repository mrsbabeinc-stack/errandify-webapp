#!/bin/bash

# Colors
G='\033[0;32m'
R='\033[0;31m'
Y='\033[1;33m'
B='\033[0;34m'
NC='\033[0m'

PASSED=0
FAILED=0
SKIPPED=0

pass() { echo -e "${G}✓ $1${NC}"; PASSED=$((PASSED+1)); }
fail() { echo -e "${R}✗ $1${NC}"; FAILED=$((FAILED+1)); }
skip() { echo -e "${Y}⊘ $1${NC}"; SKIPPED=$((SKIPPED+1)); }
info() { echo -e "${B}ℹ $1${NC}"; }
section() { echo ""; echo -e "${B}========================================${NC}"; echo -e "${B}$1${NC}"; echo -e "${B}========================================${NC}"; }

section "ERRANDIFY COMPLETE TASK FLOW TEST"

# Get tokens
info "Retrieving authentication tokens..."
ASKER_JSON=$(curl -s -X POST http://localhost:3000/api/auth/demo-login \
  -H "Content-Type: application/json" \
  -d '{"account":"sarah"}')
ASKER_TOKEN=$(echo "$ASKER_JSON" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)
ASKER_ID="2"

DOER_JSON=$(curl -s -X POST http://localhost:3000/api/auth/demo-login \
  -H "Content-Type: application/json" \
  -d '{"account":"john"}')
DOER_TOKEN=$(echo "$DOER_JSON" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)
DOER_ID="8"

info "Asker: Sarah Tan (ID: $ASKER_ID)"
info "Doer: John Lee (ID: $DOER_ID)"

# ========== PHASE 1 ==========
section "PHASE 1: ASKER CREATES TASK"

TASK_JSON=$(curl -s -X POST http://localhost:3000/api/errands \
  -H "Authorization: Bearer $ASKER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Clean my apartment living room",
    "description": "Need to vacuum, dust, and tidy up my living room. Takes about 2 hours. I have cleaning supplies ready.",
    "category": "Cleaning & Household",
    "location": "Blk 123 Ang Mo Kio, Singapore 567890",
    "budget": 45,
    "deadline": "2026-06-22T14:00:00Z",
    "isRecurring": false
  }')

if echo "$TASK_JSON" | grep -q '"success":true'; then
  TASK_ID=$(echo "$TASK_JSON" | grep -o '"id":[0-9]*' | head -1 | grep -o '[0-9]*')
  pass "Task created successfully (ID: $TASK_ID)"
else
  fail "Task creation failed"
  info "$TASK_JSON"
  exit 1
fi

if echo "$TASK_JSON" | grep -q '"status":"open"'; then
  pass "Task status is 'open'"
else
  fail "Task status is not 'open'"
fi

if echo "$TASK_JSON" | grep -q '"budget":"45.00"'; then
  pass "Budget is correct (\$45.00)"
else
  fail "Budget is incorrect"
fi

# ========== PHASE 2 ==========
section "PHASE 2: DOER BROWSES & PLACES BID"

ERRANDS_JSON=$(curl -s -X GET "http://localhost:3000/api/errands" \
  -H "Authorization: Bearer $DOER_TOKEN")

if echo "$ERRANDS_JSON" | grep -q "$TASK_ID"; then
  pass "Doer can see the task in browse"
else
  fail "Doer cannot see the task in browse"
fi

BID_JSON=$(curl -s -X POST http://localhost:3000/api/bids \
  -H "Authorization: Bearer $DOER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "task_id": '$TASK_ID',
    "amount": 40,
    "note": "I am experienced cleaner, can finish in 1.5 hours"
  }')

if echo "$BID_JSON" | grep -q '"success":true'; then
  BID_ID=$(echo "$BID_JSON" | grep -o '"id":[0-9]*' | head -1 | grep -o '[0-9]*')
  pass "Doer placed bid successfully (ID: $BID_ID)"
  
  if echo "$BID_JSON" | grep -q '"status":"pending"'; then
    pass "Bid status is 'pending'"
  else
    fail "Bid status is not 'pending'"
  fi
else
  fail "Bid placement failed"
  info "$BID_JSON"
fi

# ========== PHASE 3 ==========
section "PHASE 3: ASKER ACCEPTS BID"

BIDS_JSON=$(curl -s -X GET "http://localhost:3000/api/bids/task/$TASK_ID" \
  -H "Authorization: Bearer $ASKER_TOKEN")

if echo "$BIDS_JSON" | grep -q "$BID_ID"; then
  pass "Asker can see bids"
else
  fail "Asker cannot see bids"
fi

ACCEPT_JSON=$(curl -s -X POST "http://localhost:3000/api/bids/$BID_ID/accept" \
  -H "Authorization: Bearer $ASKER_TOKEN" \
  -H "Content-Type: application/json")

if echo "$ACCEPT_JSON" | grep -q '"success":true'; then
  pass "Asker accepted bid successfully"
  
  if echo "$ACCEPT_JSON" | grep -q '"status":"accepted"'; then
    pass "Bid status is 'accepted'"
  fi
else
  if echo "$ACCEPT_JSON" | grep -q '"error"'; then
    ERROR_MSG=$(echo "$ACCEPT_JSON" | grep -o '"error":"[^"]*' | cut -d'"' -f4)
    fail "Bid acceptance failed: $ERROR_MSG"
  else
    fail "Bid acceptance failed (unknown error)"
  fi
  info "$ACCEPT_JSON"
fi

# ========== PHASE 4 ==========
section "PHASE 4: TASK EXECUTION"

START_JSON=$(curl -s -X POST "http://localhost:3000/api/tasks/$TASK_ID/start" \
  -H "Authorization: Bearer $DOER_TOKEN" \
  -H "Content-Type: application/json")

if echo "$START_JSON" | grep -q '"success":true'; then
  pass "Task started successfully"
else
  if echo "$START_JSON" | grep -q '"error"'; then
    ERROR=$(echo "$START_JSON" | grep -o '"error":"[^"]*' | cut -d'"' -f4)
    fail "Could not start task: $ERROR"
  else
    fail "Could not start task"
  fi
  info "$START_JSON"
fi

COMPLETE_JSON=$(curl -s -X POST "http://localhost:3000/api/tasks/$TASK_ID/complete" \
  -H "Authorization: Bearer $ASKER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "approved": true,
    "notes": "Work looks great!"
  }')

if echo "$COMPLETE_JSON" | grep -q '"success":true'; then
  pass "Task marked as complete"
else
  if echo "$COMPLETE_JSON" | grep -q '"error"'; then
    ERROR=$(echo "$COMPLETE_JSON" | grep -o '"error":"[^"]*' | cut -d'"' -f4)
    fail "Could not complete task: $ERROR"
  else
    fail "Could not complete task"
  fi
  info "$COMPLETE_JSON"
fi

# ========== PHASE 5 ==========
section "PHASE 5: RATINGS"

ASKER_RATE=$(curl -s -X POST "http://localhost:3000/api/ratings" \
  -H "Authorization: Bearer $ASKER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "taskId": '$TASK_ID',
    "ratedUserId": '$DOER_ID',
    "rating": 5,
    "comment": "Excellent work! Very thorough."
  }')

if echo "$ASKER_RATE" | grep -q '"success":true'; then
  pass "Asker rated doer"
else
  if echo "$ASKER_RATE" | grep -q '"error"'; then
    ERROR=$(echo "$ASKER_RATE" | grep -o '"error":"[^"]*' | cut -d'"' -f4)
    fail "Asker rating failed: $ERROR"
  else
    fail "Asker rating failed"
  fi
  info "$ASKER_RATE"
fi

DOER_RATE=$(curl -s -X POST "http://localhost:3000/api/ratings" \
  -H "Authorization: Bearer $DOER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "taskId": '$TASK_ID',
    "ratedUserId": '$ASKER_ID',
    "rating": 5,
    "comment": "Great communication!"
  }')

if echo "$DOER_RATE" | grep -q '"success":true'; then
  pass "Doer rated asker"
else
  if echo "$DOER_RATE" | grep -q '"error"'; then
    ERROR=$(echo "$DOER_RATE" | grep -o '"error":"[^"]*' | cut -d'"' -f4)
    fail "Doer rating failed: $ERROR"
  else
    fail "Doer rating failed"
  fi
  info "$DOER_RATE"
fi

# ========== SUMMARY ==========
section "TEST SUMMARY"

TOTAL=$((PASSED + FAILED + SKIPPED))
TOTAL_TESTS=$((PASSED + FAILED))
SUCCESS_RATE=0
if [ $TOTAL_TESTS -gt 0 ]; then
  SUCCESS_RATE=$((PASSED * 100 / TOTAL_TESTS))
fi

echo ""
echo "Total Tests: $TOTAL_TESTS"
echo -e "${G}Passed: $PASSED${NC}"
echo -e "${R}Failed: $FAILED${NC}"
echo -e "${Y}Skipped: $SKIPPED${NC}"
echo ""
echo "Success Rate: ${SUCCESS_RATE}%"
echo ""

if [ $FAILED -eq 0 ]; then
  echo -e "${G}✓ ALL TESTS PASSED${NC}"
  exit 0
else
  echo -e "${R}✗ SOME TESTS FAILED${NC}"
  exit 1
fi

