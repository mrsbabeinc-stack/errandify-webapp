-- Backfill errand_id for existing errands
UPDATE errands
SET errand_id = 'ERR' || EXTRACT(YEAR FROM created_at)::text || '-' ||
                CASE LOWER(category)
                  WHEN 'home-maintenance' THEN 'HM'
                  WHEN 'cleaning-household' THEN 'CL'
                  WHEN 'food-beverage' THEN 'FD'
                  WHEN 'furniture-assembly' THEN 'FR'
                  WHEN 'shopping-errands' THEN 'SH'
                  WHEN 'delivery-moving' THEN 'DV'
                  WHEN 'travel-mobility' THEN 'TR'
                  WHEN 'event-planning' THEN 'EV'
                  WHEN 'childcare-education' THEN 'CH'
                  WHEN 'eldercare-healthcare' THEN 'EL'
                  WHEN 'pet-care' THEN 'PC'
                  WHEN 'personal-care' THEN 'PS'
                  WHEN 'tech-support' THEN 'TC'
                  WHEN 'creative-arts' THEN 'AR'
                  WHEN 'admin-business' THEN 'AD'
                  WHEN 'charity-community' THEN 'CC'
                  ELSE 'XX'
                END || '-' ||
                SUBSTRING(MD5(id::text || created_at::text), 1, 6)
WHERE errand_id IS NULL;
