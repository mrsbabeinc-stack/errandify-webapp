-- Populate formatted_id for all errands that don't have one
-- Maps categories to codes, generates ER26{CODE}-{RANDOM}

UPDATE errands
SET formatted_id =
  CASE
    WHEN formatted_id IS NULL THEN
      'ER26' ||
      CASE
        WHEN category = 'home-maintenance' THEN 'HM'
        WHEN category = 'cleaning-household' THEN 'CL'
        WHEN category = 'food-beverage' THEN 'FD'
        WHEN category = 'furniture-assembly' THEN 'FR'
        WHEN category = 'shopping-errands' THEN 'SH'
        WHEN category = 'delivery-moving' THEN 'DV'
        WHEN category = 'travel-mobility' THEN 'TR'
        WHEN category = 'event-planning' THEN 'EV'
        WHEN category = 'childcare-education' THEN 'CH'
        WHEN category = 'childcare-tutoring' THEN 'CH'
        WHEN category = 'eldercare-healthcare' THEN 'EL'
        WHEN category = 'pet-care' THEN 'PC'
        WHEN category = 'personal-care' THEN 'PS'
        WHEN category = 'tech-support' THEN 'TC'
        WHEN category = 'creative-arts' THEN 'AR'
        WHEN category = 'admin-business' THEN 'AD'
        WHEN category = 'charity-community' THEN 'CC'
        ELSE 'XX'
      END || '-' ||
      SUBSTRING(MD5(RANDOM()::TEXT), 1, 4)
    ELSE formatted_id
  END
WHERE formatted_id IS NULL;

SELECT id, formatted_id, title, category FROM errands WHERE formatted_id IS NOT NULL ORDER BY id DESC LIMIT 10;
