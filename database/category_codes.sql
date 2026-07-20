-- Single source of truth for the 16 errand categories.
-- Drives: formatted IDs (errands ER26<code>-<rand>, offers OF26<code>-<rand>)
-- AND the category tiles shown on Home / Browse / etc.
DROP TABLE IF EXISTS category_codes CASCADE;
CREATE TABLE category_codes (
  slug        VARCHAR(50)  PRIMARY KEY,    -- e.g. 'home-maintenance'
  code        CHAR(2)      NOT NULL UNIQUE,-- e.g. 'HM'
  name        VARCHAR(100) NOT NULL,       -- e.g. 'Home Maintenance'
  icon        VARCHAR(12),                 -- emoji tile icon
  color       VARCHAR(60),                 -- tailwind gradient classes
  description VARCHAR(160),                -- short "purpose" line
  group_name  VARCHAR(60),                 -- e.g. '🏠 Home & Household'
  sort_order  INTEGER NOT NULL
);

INSERT INTO category_codes (slug, code, name, icon, color, description, group_name, sort_order) VALUES
  ('home-maintenance',     'HM', 'Home Maintenance',        '🏠', 'from-orange-100 to-orange-50',                   'Repairs, renovations, plumbing, electrical', '🏠 Home & Household',    1),
  ('cleaning-household',   'CL', 'Cleaning & Household',     '🧹', 'from-errandify-orange-100 to-errandify-orange-50','House cleaning, laundry, organizing',        '🏠 Home & Household',    2),
  ('food-beverage',        'FD', 'Food & Beverage',         '🍕', 'from-red-100 to-red-50',                         'Cooking, grocery shopping, meal prep',       '🏠 Home & Household',    3),
  ('furniture-assembly',   'FR', 'Furniture & Assembly',    '🛋️', 'from-amber-100 to-amber-50',                     'Furniture assembly, arrangement, moving',    '🏠 Home & Household',    4),
  ('shopping-errands',     'SH', 'Shopping & Errands',      '🛍️', 'from-pink-100 to-pink-50',                       'Shopping, deliveries, postal services',      '🚚 Errands & Logistics', 5),
  ('delivery-moving',      'DV', 'Delivery & Moving',       '📦', 'from-yellow-100 to-yellow-50',                   'Package delivery, moving assistance',        '🚚 Errands & Logistics', 6),
  ('travel-mobility',      'TR', 'Travel & Mobility',       '✈️', 'from-sky-100 to-sky-50',                         'Airport rides, travel planning, relocation', '🚚 Errands & Logistics', 7),
  ('event-planning',       'EV', 'Event Planning',          '✨', 'from-violet-100 to-violet-50',                   'Weddings, parties, corporate events',        '🚚 Errands & Logistics', 8),
  ('childcare-education',  'CH', 'Childcare & Education',    '🧒', 'from-green-100 to-green-50',                     'Babysitting, tutoring, homework help',       '❤️ Care & Wellbeing',    9),
  ('eldercare-healthcare', 'EL', 'Eldercare & Healthcare',  '👵', 'from-gray-100 to-gray-50',                       'Senior care, medication, health support',    '❤️ Care & Wellbeing',   10),
  ('pet-care',             'PC', 'Pet Care',                '🐕', 'from-purple-100 to-purple-50',                   'Dog walking, pet sitting, grooming',         '❤️ Care & Wellbeing',   11),
  ('personal-care',        'PS', 'Personal Care & Wellness','💆', 'from-rose-100 to-rose-50',                       'Hair styling, massage, fitness coaching',    '❤️ Care & Wellbeing',   12),
  ('tech-support',         'TC', 'Tech Support & IT',       '💻', 'from-indigo-100 to-indigo-50',                   'Computer repair, setup, tech help',          '💡 Skills & Services',  13),
  ('creative-arts',        'AR', 'Creative & Arts',         '🎨', 'from-fuchsia-100 to-fuchsia-50',                 'Design, photography, art services',          '💡 Skills & Services',  14),
  ('admin-business',       'AD', 'Admin & Business',        '📚', 'from-slate-100 to-slate-50',                     'Bookkeeping, document prep, data entry',     '💡 Skills & Services',  15),
  ('charity-community',    'CC', 'Charity & Community',     '❤️', 'from-red-100 to-red-50',                         'Volunteer work, community service',          '💡 Skills & Services',  16);
