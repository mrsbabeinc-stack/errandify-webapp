-- Backfill offer_id for all existing bids that don't have one
-- Generate OFFERID: OF[YY][CATEGORY][4-RANDOM-CHARS]

UPDATE bids b
SET offer_id = (
  'OF26' ||
  CASE 
    WHEN e.category = 'home-maintenance' THEN 'HM'
    WHEN e.category = 'cleaning-household' THEN 'CL'
    WHEN e.category = 'food-beverage' THEN 'FB'
    WHEN e.category = 'furniture-assembly' THEN 'FA'
    WHEN e.category = 'shopping-errands' THEN 'SH'
    WHEN e.category = 'delivery-moving' THEN 'DE'
    WHEN e.category = 'travel-mobility' THEN 'TR'
    WHEN e.category = 'event-planning' THEN 'EV'
    WHEN e.category = 'childcare-education' THEN 'CH'
    WHEN e.category = 'eldercare-healthcare' THEN 'EH'
    WHEN e.category = 'pet-care' THEN 'PC'
    WHEN e.category = 'personal-care' THEN 'PE'
    WHEN e.category = 'tech-support' THEN 'TE'
    WHEN e.category = 'creative-arts' THEN 'CR'
    WHEN e.category = 'admin-business' THEN 'AB'
    ELSE 'XX'
  END ||
  '-' ||
  SUBSTRING(MD5(RANDOM()::text || b.id::text || NOW()::text), 1, 4)
)
FROM errands e
WHERE b.errand_id = e.id
AND b.offer_id IS NULL;

SELECT COUNT(*) as bids_updated FROM bids WHERE offer_id IS NOT NULL;
