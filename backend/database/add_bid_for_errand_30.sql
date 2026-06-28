-- Add a test bid for errand 30 so rating system can work
INSERT INTO bids (errand_id, doer_id, amount, status, created_at)
SELECT 30, 3, 50, 'confirmed', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM bids WHERE errand_id = 30
);
