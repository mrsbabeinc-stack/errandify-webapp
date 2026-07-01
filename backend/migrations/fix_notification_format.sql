-- Migration: Fix notification formatting to use full errand IDs and aliases
-- Updates old notifications to show ER26XX-XXXX format instead of ER50

BEGIN;

-- Update "New offer Placed" notifications to show full format
UPDATE notifications
SET 
  title = 'New Offer Place',
  message = CONCAT(
    e.errand_id,
    ' • ',
    COALESCE(b.offer_id, 'OF26XX-XXXX'),
    ': ',
    COALESCE(u.alias, u.display_name),
    ' has placed an offer for $',
    b.amount
  )
FROM errands e
JOIN bids b ON e.id = b.errand_id
JOIN users u ON b.doer_id = u.id
WHERE notifications.type = 'bid_placed'
AND notifications.related_errand_id = e.id
AND notifications.title = 'New offer Placed';

-- Update "Offer Not Selected" notifications
UPDATE notifications
SET 
  message = CONCAT(
    e.errand_id,
    ': Your offer wasn''t selected'
  )
FROM errands e
WHERE notifications.type = 'bid_rejected'
AND notifications.related_errand_id = e.id
AND notifications.title = 'Offer Not Selected';

-- Update "Errand Started" notifications  
UPDATE notifications
SET 
  title = 'Errand Started',
  message = CONCAT(e.errand_id, ': Started')
FROM errands e
WHERE notifications.type = 'task_started'
AND notifications.related_errand_id = e.id
AND notifications.title LIKE '%Errand Started%';

-- Update any other notifications with ER50 format to use full errand ID
UPDATE notifications
SET message = REGEXP_REPLACE(
  message,
  'ER\d+(?![A-Z])',
  (SELECT errand_id FROM errands WHERE id = notifications.related_errand_id),
  'g'
)
WHERE related_errand_id IS NOT NULL
AND message ~ 'ER\d+(?![A-Z])'
AND message NOT LIKE 'ER%-%'; -- Skip if already has full format

COMMIT;
