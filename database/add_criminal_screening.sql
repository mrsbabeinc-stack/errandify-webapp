-- Migration: Add criminal screening & sensitive category restrictions
-- This prevents users with criminal convictions from accessing sensitive tasks

-- ============================================================================
-- 1. Add screening fields to users table
-- ============================================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS criminal_conviction BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS conviction_declaration_date TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS conviction_details TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS screening_completed BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS screening_completed_date TIMESTAMP;

-- Add index for quick lookups
CREATE INDEX IF NOT EXISTS idx_users_criminal_conviction ON users(criminal_conviction);
CREATE INDEX IF NOT EXISTS idx_users_screening_completed ON users(screening_completed);

-- ============================================================================
-- 2. Define sensitive categories that require background check
-- ============================================================================

-- Categories restricted to non-convicted users ONLY
CREATE TABLE IF NOT EXISTS restricted_categories (
  id SERIAL PRIMARY KEY,
  category_name VARCHAR(100) NOT NULL UNIQUE,
  reason TEXT NOT NULL,
  requires_home_access BOOLEAN DEFAULT true,
  min_age INTEGER DEFAULT 18,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Insert restricted categories
INSERT INTO restricted_categories (category_name, reason, requires_home_access)
VALUES
  ('Childcare', 'Direct contact with children - requires background check', true),
  ('Babysitting', 'Unsupervised care of children - requires background check', true),
  ('Elderly Care', 'Care for vulnerable adults - requires background check', true),
  ('Live-in Care', 'Home access and intimate care - requires background check', true),
  ('Home Cleaning', 'Access to home when occupants absent - requires background check', true),
  ('Home Repairs', 'Access to home, trusted with valuables - requires background check', true),
  ('Pet Sitting', 'Home access, care of animals - requires background check', true),
  ('Personal Assistant', 'Close personal proximity - requires background check', true),
  ('Tutoring (Home)', 'Alone with minors - requires background check', true),
  ('Home Organization', 'Access to home, valuables - requires background check', true)
ON CONFLICT (category_name) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_restricted_categories_name ON restricted_categories(category_name);

-- ============================================================================
-- 3. Add screening audit log
-- ============================================================================

CREATE TABLE IF NOT EXISTS criminal_screening_audit (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  screening_type VARCHAR(50) NOT NULL,
  declared_conviction BOOLEAN NOT NULL,
  screening_timestamp TIMESTAMP DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT,
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_screening_audit_user_id ON criminal_screening_audit(user_id);
CREATE INDEX IF NOT EXISTS idx_screening_audit_timestamp ON criminal_screening_audit(screening_timestamp DESC);

-- ============================================================================
-- 4. Add visibility restrictions table
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_category_restrictions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  restricted_category_id INTEGER NOT NULL REFERENCES restricted_categories(id) ON DELETE CASCADE,
  reason VARCHAR(200) NOT NULL,
  restriction_start TIMESTAMP DEFAULT NOW(),
  restriction_end TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  UNIQUE(user_id, restricted_category_id)
);

CREATE INDEX IF NOT EXISTS idx_user_category_restrictions_user ON user_category_restrictions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_category_restrictions_active ON user_category_restrictions(is_active);

-- ============================================================================
-- 5. Screening declaration (what user confirms during signup)
-- ============================================================================

CREATE TABLE IF NOT EXISTS screening_declarations (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Have they been convicted under these acts?
  cypa_conviction BOOLEAN NOT NULL DEFAULT false,           -- Children & Young Persons Act
  womens_charter_conviction BOOLEAN NOT NULL DEFAULT false,  -- Domestic violence/abuse
  penal_code_conviction BOOLEAN NOT NULL DEFAULT false,      -- Outrage of modesty, rape, hurt, etc
  elder_abuse_conviction BOOLEAN NOT NULL DEFAULT false,     -- Elder abuse / VAA 2018
  dishonesty_conviction BOOLEAN NOT NULL DEFAULT false,      -- Cheating, criminal breach of trust

  -- Consolidated
  any_conviction BOOLEAN NOT NULL DEFAULT false,

  -- Consent & acknowledgment
  understood_restrictions BOOLEAN NOT NULL DEFAULT false,
  consent_timestamp TIMESTAMP DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT,

  -- Admin review
  reviewed_by_admin BOOLEAN DEFAULT false,
  admin_notes TEXT,
  reviewed_timestamp TIMESTAMP,

  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_screening_declarations_any_conviction ON screening_declarations(any_conviction);
CREATE INDEX IF NOT EXISTS idx_screening_declarations_user ON screening_declarations(user_id);

-- ============================================================================
-- 6. Helper function to check if user can access category
-- ============================================================================

CREATE OR REPLACE FUNCTION can_user_access_category(
  p_user_id INTEGER,
  p_category TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  v_is_restricted BOOLEAN;
  v_user_has_conviction BOOLEAN;
  v_has_active_restriction BOOLEAN;
BEGIN
  -- Check if category is restricted
  SELECT EXISTS(
    SELECT 1 FROM restricted_categories WHERE category_name = p_category
  ) INTO v_is_restricted;

  IF NOT v_is_restricted THEN
    -- Non-restricted category, user can access
    RETURN true;
  END IF;

  -- Category IS restricted - check user's conviction status
  SELECT COALESCE(any_conviction, false) INTO v_user_has_conviction
  FROM screening_declarations
  WHERE user_id = p_user_id;

  IF v_user_has_conviction THEN
    -- User has conviction - cannot access restricted categories
    RETURN false;
  END IF;

  -- Check for active restrictions (override, in case of admin action)
  SELECT EXISTS(
    SELECT 1 FROM user_category_restrictions ucr
    JOIN restricted_categories rc ON ucr.restricted_category_id = rc.id
    WHERE ucr.user_id = p_user_id
    AND rc.category_name = p_category
    AND ucr.is_active = true
    AND (ucr.restriction_end IS NULL OR ucr.restriction_end > NOW())
  ) INTO v_has_active_restriction;

  RETURN NOT v_has_active_restriction;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- 7. Helper function to apply automatic restrictions based on declaration
-- ============================================================================

CREATE OR REPLACE FUNCTION apply_category_restrictions(
  p_user_id INTEGER,
  p_any_conviction BOOLEAN
) RETURNS void AS $$
BEGIN
  IF p_any_conviction THEN
    -- User declared conviction - restrict all sensitive categories
    INSERT INTO user_category_restrictions (user_id, restricted_category_id, reason)
    SELECT
      p_user_id,
      id,
      'Criminal conviction declared during signup'
    FROM restricted_categories
    ON CONFLICT (user_id, restricted_category_id) DO UPDATE
    SET is_active = true, reason = 'Criminal conviction declared during signup';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 8. View for admin: Users with convictions
-- ============================================================================

CREATE OR REPLACE VIEW users_with_convictions AS
SELECT
  u.id,
  u.display_name,
  u.email,
  sd.any_conviction,
  sd.cypa_conviction,
  sd.womens_charter_conviction,
  sd.penal_code_conviction,
  sd.elder_abuse_conviction,
  sd.dishonesty_conviction,
  sd.consent_timestamp,
  u.created_at
FROM users u
LEFT JOIN screening_declarations sd ON u.id = sd.user_id
WHERE sd.any_conviction = true
ORDER BY sd.consent_timestamp DESC;

-- ============================================================================
-- 9. View for displaying restrictions
-- ============================================================================

CREATE OR REPLACE VIEW active_user_restrictions AS
SELECT
  ucr.user_id,
  rc.category_name,
  rc.reason as category_reason,
  ucr.reason as restriction_reason,
  ucr.restriction_start,
  ucr.restriction_end,
  ucr.is_active
FROM user_category_restrictions ucr
JOIN restricted_categories rc ON ucr.restricted_category_id = rc.id
WHERE ucr.is_active = true
AND (ucr.restriction_end IS NULL OR ucr.restriction_end > NOW());

-- ============================================================================
-- Documentation
-- ============================================================================

/*
CRIMINAL SCREENING SYSTEM
========================

PURPOSE:
Prevent users with criminal convictions from accessing or posting sensitive
category tasks involving children, elderly, or home access.

WHEN APPLIED:
1. During signup: User must declare if convicted under specific acts
2. If YES to any conviction → Automatically restricted from all sensitive categories
3. User CAN still use platform for non-sensitive categories (food delivery, etc)

CATEGORIES RESTRICTED:
- Childcare
- Babysitting
- Elderly Care
- Live-in Care
- Home Cleaning
- Home Repairs
- Pet Sitting
- Personal Assistant
- Tutoring (Home)
- Home Organization

LEGAL ACTS COVERED:
1. Children & Young Persons Act (CYPA) - child safety
2. Women's Charter - domestic violence/abuse
3. Penal Code sections - outrage of modesty, rape, hurt, wrongful confinement
4. Vulnerable Adults Act 2018 - elder/vulnerable adult abuse
5. Dishonesty crimes - cheating, criminal breach of trust (applies to ALL categories)

BOTH ASKER AND DOER RESTRICTIONS:
- Asker: Cannot POST tasks in restricted categories (can't hire for these)
- Doer: Cannot ACCEPT tasks in restricted categories (can't work on these)
- Both: Cannot SEE these category tasks in their feed

HOW IT WORKS:
=========

Signup Flow:
1. User creates account
2. Asked: "Have you been convicted under [these acts]?"
3. If YES → Declaration recorded + Restrictions automatically applied
4. User must check "I understand restrictions" to proceed

Visibility:
1. When user browses errands → Restricted categories hidden (SQL filter)
2. When user creates task → Restricted categories disabled (form validation)
3. When doer searches tasks → Restricted tasks not shown (query filter)

Admin Override:
- Admin can manually restrict/unrestrict users
- All changes logged in audit table
- Audit trail shows who made change and when

DATABASE SCHEMA:
===============

users table:
- criminal_conviction: BOOLEAN (derived from screening_declarations.any_conviction)
- screening_completed: BOOLEAN
- screening_completed_date: TIMESTAMP

screening_declarations:
- cypa_conviction: User declared under CYPA?
- womens_charter_conviction: Domestic violence/abuse?
- penal_code_conviction: Modesty/rape/hurt/confinement?
- elder_abuse_conviction: Elder/vulnerable adult abuse?
- dishonesty_conviction: Cheating/breach of trust?
- any_conviction: Any of above?
- understood_restrictions: User confirmed they understand restrictions?

user_category_restrictions:
- user_id: Which user
- restricted_category_id: Which category
- reason: Why (e.g., "Criminal conviction declared")
- is_active: Still in effect?

restricted_categories:
- category_name: (Childcare, Elderly Care, etc)
- requires_home_access: Does this task involve home entry?

criminal_screening_audit:
- Log of all screening declarations (for compliance)

API CHANGES NEEDED:
=================

1. GET /api/categories → Filter out restricted categories for user
2. GET /api/errands → Filter out restricted category tasks
3. POST /api/errands → Validate user can post in this category
4. POST /api/bids → Validate user can bid on this task's category
5. POST /api/auth/signup → Include screening questions
6. GET /api/user/restrictions → Show what's restricted for this user

FRONTEND CHANGES NEEDED:
=======================

1. Signup: Add screening questions
2. Category selection: Hide restricted categories
3. Errand browsing: Don't show restricted category tasks
4. Errand creation: Disable restricted categories (show reason)
5. Profile: Show restrictions if applicable
6. Chat/Execution: Prevent execution on restricted categories

COMPLIANCE:
===========

This system ensures:
✅ CYPA compliance (protect children)
✅ Women's Charter compliance (protect abuse victims/prevent abusers)
✅ Penal Code compliance (protect vulnerable people)
✅ VAA 2018 compliance (protect elderly)
✅ Consumer protection (protect all users from dishonest doers)
✅ Platform safety (reduce risk)

AUDIT TRAIL:
============

Every screening decision is logged:
- When user declared
- What they declared
- IP address & user agent
- Admin review (if applicable)
- Any changes made

This creates legal defensibility if issues arise.
*/
