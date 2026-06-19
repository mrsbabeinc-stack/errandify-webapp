# Restricted Categories - BOTH Asker & Doer Affected

## CRITICAL RULE

**If a user declares a criminal conviction in screening:**
- ❌ They CANNOT POST restricted category tasks (as Asker)
- ❌ They CANNOT SEE restricted category tasks (as Doer)
- ❌ They CANNOT BID on restricted category tasks (as Doer)
- ✅ They CAN use non-restricted categories freely

---

## RESTRICTED CATEGORIES LIST

These categories are restricted for BOTH roles:

```
1. Childcare
   ├─ Asker cannot POST: "Hire someone to babysit my kids"
   ├─ Doer cannot BID: "I want to do babysitting jobs"
   ├─ Reason: Direct unsupervised contact with children
   └─ Legal: CYPA (Children & Young Persons Act)

2. Babysitting
   ├─ Asker cannot POST: "Need babysitter for evening"
   ├─ Doer cannot BID: "I offer babysitting services"
   ├─ Reason: Unsupervised care of children
   └─ Legal: CYPA

3. Elderly Care
   ├─ Asker cannot POST: "Help caring for my elderly parent"
   ├─ Doer cannot BID: "I provide elderly care"
   ├─ Reason: Vulnerable adult in home
   └─ Legal: Vulnerable Adults Act 2018

4. Live-in Care
   ├─ Asker cannot POST: "Live-in caregiver needed"
   ├─ Doer cannot BID: "I do live-in care"
   ├─ Reason: Extended home access, vulnerable people
   └─ Legal: VAA 2018 + Penal Code

5. Home Cleaning
   ├─ Asker cannot POST: "Clean my house"
   ├─ Doer cannot BID: "I do house cleaning"
   ├─ Reason: Home access when occupants absent/asleep
   └─ Legal: Penal Code (theft, burglary risk)

6. Home Repairs
   ├─ Asker cannot POST: "Repair my kitchen sink"
   ├─ Doer cannot BID: "I do home repairs"
   ├─ Reason: Access to home, valuables, personal spaces
   └─ Legal: Penal Code (theft, burglary risk)

7. Pet Sitting
   ├─ Asker cannot POST: "Sit my dog while I'm away"
   ├─ Doer cannot BID: "I offer pet sitting"
   ├─ Reason: Home access when occupants absent
   └─ Legal: Penal Code (property theft/damage risk)

8. Personal Assistant
   ├─ Asker cannot POST: "Need personal assistant"
   ├─ Doer cannot BID: "I work as personal assistant"
   ├─ Reason: Close personal proximity, trust-based
   └─ Legal: Penal Code (outrage of modesty, harm)

9. Tutoring (In-Home)
   ├─ Asker cannot POST: "Tutor my child at home"
   ├─ Doer cannot BID: "I tutor children at home"
   ├─ Reason: Unsupervised contact with minors
   └─ Legal: CYPA

10. Home Organization
    ├─ Asker cannot POST: "Organize my home"
    ├─ Doer cannot BID: "I do home organization"
    ├─ Reason: Home access, access to valuables/personal items
    └─ Legal: Penal Code (theft/dishonesty risk)
```

---

## BOTH ROLES EXPLAINED

### ASKER SIDE (Cannot POST)

**If Asker has criminal conviction:**

```
Scenario 1: Asker wants to post "Need elderly caregiver"
├─ Goes to create task
├─ Selects category: "Elderly Care"
├─ System checks: User has conviction
├─ Result: ❌ Category DISABLED with message
│   "This category is restricted due to safety screening"
├─ Cannot submit form
└─ Asker must use different category or cannot post

Scenario 2: Asker tries to post non-restricted task (e.g., delivery)
├─ Goes to create task
├─ Selects category: "Delivery"
├─ System checks: Allowed for this user
├─ Result: ✅ Category ENABLED
├─ Can submit form normally
└─ Task posted successfully
```

**Why restrict asker?**
- Prevents hiring for sensitive tasks
- Example: Someone convicted of child abuse shouldn't be able to post "Need babysitter"
- Protects vulnerable people (can't hire exposed to harm)
- Even though asker might not be direct contact, they hire the worker

### DOER SIDE (Cannot SEE or BID)

**If Doer has criminal conviction:**

```
Scenario 1: Doer browses available tasks
├─ Opens task listing/search
├─ System fetches tasks and filters:
│   ├─ Show: Delivery, Shopping, Errands, etc. ✅
│   ├─ Hide: Childcare, Elderly Care, Home Cleaning, etc. ❌
├─ Restricted tasks don't appear in list
├─ Doer doesn't even know they exist
└─ Clean, simple experience (no confusion)

Scenario 2: Doer somehow gets direct link to restricted task
├─ Example: google.com/search finds cached link
├─ Doer clicks link directly
├─ System checks: Task is restricted category
├─ Doer has conviction
├─ Result: 403 Forbidden
├─ Message: "You don't have access to this category"
│   "Reason: Restricted due to safety screening"
└─ Cannot view or bid

Scenario 3: Doer tries to bid on allowed category
├─ Example: "Delivery Service"
├─ System checks: Allowed
├─ Doer can bid normally
└─ Bid submitted successfully
```

**Why restrict doer?**
- Prevents offering services in sensitive categories
- Example: Someone convicted of sexual offense shouldn't offer to babysit
- Protects vulnerable people (direct contact prevention)
- Prevents offering dishonest services in any category

---

## IMPLEMENTATION DETAILS

### DATABASE QUERY

```sql
-- Check if user can ACCESS a category (Doer browsing)
SELECT can_user_access_category(user_id, category_name);
-- Returns: true or false

-- Get restrictions for user
SELECT * FROM user_category_restrictions 
WHERE user_id = $1 AND is_active = true;
-- Returns: All active restrictions for user

-- Filter tasks for doer
SELECT * FROM errands 
WHERE category NOT IN (
  SELECT rc.category_name
  FROM user_category_restrictions ucr
  JOIN restricted_categories rc ON ucr.restricted_category_id = rc.id
  WHERE ucr.user_id = $1 AND ucr.is_active = true
);
-- Returns: Only tasks in categories user can access
```

### API ENDPOINTS

**For Asker (Creating Task):**
```
GET /api/screening/categories/accessible?role=asker
├─ Returns: { accessible: [...], restricted: [...] }
├─ Used to: Disable restricted categories in form
└─ Example: If asker has conviction
   └─ accessible: ["Delivery", "Shopping", ...]
   └─ restricted: ["Childcare", "Elderly Care", ...]

POST /api/errands (create task)
├─ Validation: Check if user can post in this category
├─ If restricted: 403 Forbidden
│   └─ Message: "This category is restricted for your account"
└─ If allowed: Create task normally
```

**For Doer (Browsing Tasks):**
```
GET /api/errands?category=*
├─ Backend automatically filters
├─ Returns: Only tasks in accessible categories for user
├─ Restricted tasks don't appear
└─ Doer never sees restricted categories

GET /api/screening/categories/accessible?role=doer
├─ Returns: { accessible: [...], restricted: [...] }
├─ Used to: Show which categories are available
└─ Example: If doer has conviction
   └─ accessible: ["Delivery", "Shopping", ...]
   └─ restricted: ["Childcare", "Elderly Care", ...]

POST /api/bids (place bid)
├─ Validation: Check if user can bid in this category
├─ If restricted: 403 Forbidden
│   └─ Message: "You don't have access to this category"
└─ If allowed: Create bid normally
```

---

## USER EXPERIENCE

### ASKER VIEW

**Without Conviction:**
```
Create Task Form:
├─ Category Dropdown:
│  ├─ Childcare ✅ ENABLED
│  ├─ Elderly Care ✅ ENABLED
│  ├─ Home Cleaning ✅ ENABLED
│  ├─ Delivery ✅ ENABLED
│  └─ ... (all enabled)
└─ Can select any category
```

**With Conviction (e.g., CYPA):**
```
Create Task Form:
├─ Category Dropdown:
│  ├─ Childcare ❌ DISABLED (Restricted)
│  ├─ Babysitting ❌ DISABLED (Restricted)
│  ├─ Tutoring (Home) ❌ DISABLED (Restricted)
│  ├─ Elderly Care ✅ ENABLED
│  ├─ Home Cleaning ✅ ENABLED
│  ├─ Delivery ✅ ENABLED
│  └─ ... (others enabled)
└─ Tooltip on disabled: "Restricted due to safety screening"
```

### DOER VIEW

**Without Conviction:**
```
Task Listing:
├─ [DELIVERY] "Pickup groceries" - $20 ✅
├─ [CHILDCARE] "Babysit Saturday evening" - $50 ✅
├─ [HOME CLEANING] "Clean apartment" - $100 ✅
├─ [ELDERLY CARE] "Visit grandma, chat" - $30 ✅
└─ ... (all visible, can bid on all)
```

**With Conviction (e.g., Penal Code):**
```
Task Listing:
├─ [DELIVERY] "Pickup groceries" - $20 ✅ (Can bid)
├─ [SHOPPING] "Buy groceries" - $25 ✅ (Can bid)
├─ [ERRANDS] "Post letters" - $15 ✅ (Can bid)
├─ [HOME CLEANING] NOT SHOWN ❌ (Hidden from list)
├─ [CHILDCARE] NOT SHOWN ❌ (Hidden from list)
├─ [ELDERLY CARE] NOT SHOWN ❌ (Hidden from list)
└─ [HOME REPAIRS] NOT SHOWN ❌ (Hidden from list)

Note: Restricted categories are completely hidden
(Doer doesn't see them in search results)
```

**If Doer clicks direct link to restricted task:**
```
403 Forbidden
━━━━━━━━━━━━━━━━━
You don't have access to this category.

This category (Childcare) is restricted for your account
due to safety screening.

You can still work on other category tasks:
├─ Delivery
├─ Shopping
├─ Errands
└─ ... and more

Questions? Contact support@errandify.ai
```

---

## DISHONESTY OFFENCE (Special Case)

**Dishonesty conviction affects ALL categories:**

```
If user declared: "Dishonesty offences?" → YES

Impact:
├─ Cannot POST any task (all restricted)
├─ Cannot BID on any task (all restricted)
└─ Cannot even see task listings

Message: "Your account has access restrictions.
Contact support for more information."
```

**Why all categories?**
- Dishonesty (cheating, fraud, breach of trust) is risk in ANY task
- Example: Dishonus person could take money and not do delivery
- Example: Could steal during shopping errand
- Example: Could be dishonest about any task
- One-size-fits-all restriction for fraud prevention

---

## BOTH SIDES IN ACTION

### Complete Example Flow

```
USER A (Asker, convicted of child abuse):
1. Tries to post "Need babysitter"
   └─ Category: Childcare (restricted)
   └─ System: ❌ "Category disabled for your account"
   └─ Result: Cannot post

2. Tries to post "Need delivery person"
   └─ Category: Delivery (allowed)
   └─ System: ✅ "Category allowed"
   └─ Result: Task posted successfully

USER B (Doer, convicted of sexual crime):
1. Searches for tasks to bid on
   └─ System filters out: Childcare, Babysitting, Tutoring (Home)
   └─ Returns: Delivery, Shopping, Errands, etc.
   └─ User doesn't see restricted categories

2. Finds "Pickup groceries" task
   └─ Category: Delivery (allowed)
   └─ System: ✅ "Can bid on this"
   └─ Result: Can place bid

3. User somehow gets link to "Babysit kids"
   └─ Category: Childcare (restricted for user)
   └─ System: ❌ 403 Forbidden
   └─ Result: Cannot access

---

USER C (Doer, convicted of cheating fraud):
1. Searches for ANY tasks
   └─ System: ❌ "All categories restricted"
   └─ Result: Cannot see any tasks
   └─ Cannot bid on anything
```

---

## ENFORCEMENT LAYERS

### Layer 1: API (Backend)

```
When creating task:
POST /api/errands
├─ Check: can_user_access_category(user_id, category)?
├─ If false: 403 Forbidden
└─ If true: Create task

When browsing tasks:
GET /api/errands
├─ Auto-filter: Remove categories user restricted from
├─ Return: Only accessible tasks
└─ Restricted tasks never appear
```

### Layer 2: UI (Frontend)

```
Task Creation Form:
├─ Fetch: /api/screening/categories/accessible
├─ Disable restricted categories (visual + functional)
├─ Cannot select or submit if restricted
└─ Clear message: "Restricted due to safety screening"

Task Browsing:
├─ Show: Only accessible tasks
├─ Hide: Restricted categories completely
├─ If user navigates to restricted task URL:
│  └─ Show error: "You don't have access"
└─ No confusion about what's available
```

### Layer 3: Database (Immutable)

```
user_category_restrictions table:
├─ Links user to restricted categories
├─ Cannot be modified (immutable after creation)
├─ is_active: true/false (can deactivate, not delete)
├─ reason: Why restricted (logged)
└─ Audit trail: When applied, by whom

Queries automatically respect restrictions:
├─ All task fetches filtered
├─ All bid submissions validated
└─ Cannot bypass at database level
```

---

## SUMMARY

**The Golden Rule:**

> **BOTH Asker AND Doer with criminal conviction are RESTRICTED from sensitive categories.**

| Action | Asker | Doer |
|--------|-------|------|
| **Post task in restricted category** | ❌ Blocked | N/A |
| **See restricted category tasks** | N/A | ❌ Hidden |
| **Bid on restricted category tasks** | N/A | ❌ Blocked |
| **View restricted task (direct link)** | N/A | ❌ 403 Forbidden |
| **Use non-restricted categories** | ✅ Full access | ✅ Full access |

**Simple principle:**
- If you declared a conviction, you can't use that category at all
- Doesn't matter if you're asker or doer - BOTH restricted
- Protects vulnerable people from both sides
- Fair, transparent, and legally compliant

---

## NEXT STEPS

### To Fully Implement:

1. **Filter errand listings** (GET /api/errands)
   ```
   Add WHERE category NOT IN (
     user's restricted categories
   )
   ```

2. **Disable categories in form** (POST /api/errands)
   ```
   Validate: can_user_access_category(user_id, category)
   If false: Return 403
   ```

3. **Prevent bids** (POST /api/bids)
   ```
   Validate: can_user_access_category(user_id, category)
   If false: Return 403
   ```

4. **UI updates**
   ```
   Show/disable categories based on:
   /api/screening/categories/accessible
   ```

---

**Status:** ✅ Backend complete, ✅ API ready, ⏳ Frontend integration needed
