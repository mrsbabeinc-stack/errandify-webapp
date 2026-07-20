-- Single source of truth for the 16 errand categories and their 2-letter codes.
-- Used to build formatted IDs: errands ER26<code>-<rand>, offers OF26<code>-<rand>.
CREATE TABLE IF NOT EXISTS category_codes (
  slug        VARCHAR(50)  PRIMARY KEY,   -- e.g. 'home-maintenance'
  code        CHAR(2)      NOT NULL UNIQUE,-- e.g. 'HM'
  name        VARCHAR(100) NOT NULL,      -- e.g. 'Home Maintenance'
  icon        VARCHAR(12),                -- emoji
  group_name  VARCHAR(60),                -- e.g. 'Home & Household'
  sort_order  INTEGER NOT NULL
);

INSERT INTO category_codes (slug, code, name, icon, group_name, sort_order) VALUES
  ('home-maintenance',     'HM', 'Home Maintenance',        '🏠', 'Home & Household',     1),
  ('cleaning-household',   'CL', 'Cleaning & Household',     '🧹', 'Home & Household',     2),
  ('food-beverage',        'FD', 'Food & Beverage',         '🍕', 'Home & Household',     3),
  ('furniture-assembly',   'FR', 'Furniture & Assembly',    '🛋️', 'Home & Household',     4),
  ('shopping-errands',     'SH', 'Shopping & Errands',      '🛍️', 'Errands & Logistics',  5),
  ('delivery-moving',      'DV', 'Delivery & Moving',       '📦', 'Errands & Logistics',  6),
  ('travel-mobility',      'TR', 'Travel & Mobility',       '✈️', 'Errands & Logistics',  7),
  ('event-planning',       'EV', 'Event Planning',          '✨', 'Errands & Logistics',  8),
  ('childcare-education',  'CH', 'Childcare & Education',    '🧒', 'Care & Wellbeing',     9),
  ('eldercare-healthcare', 'EL', 'Eldercare & Healthcare',  '👵', 'Care & Wellbeing',    10),
  ('pet-care',             'PC', 'Pet Care',                '🐕', 'Care & Wellbeing',    11),
  ('personal-care',        'PS', 'Personal Care & Wellness','💆', 'Care & Wellbeing',    12),
  ('tech-support',         'TC', 'Tech Support & IT',       '💻', 'Skills & Services',   13),
  ('creative-arts',        'AR', 'Creative & Arts',         '🎨', 'Skills & Services',   14),
  ('admin-business',       'AD', 'Admin & Business',        '📚', 'Skills & Services',   15),
  ('charity-community',    'CC', 'Charity & Community',     '❤️', 'Skills & Services',   16)
ON CONFLICT (slug) DO UPDATE SET
  code = EXCLUDED.code, name = EXCLUDED.name, icon = EXCLUDED.icon,
  group_name = EXCLUDED.group_name, sort_order = EXCLUDED.sort_order;
