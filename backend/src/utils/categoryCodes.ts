import { db } from '../db.js';

// Fallback matches the `category_codes` DB seed, so ID generation still works
// before the DB cache has loaded (or if the table is unavailable).
const FALLBACK: Record<string, string> = {
  'home-maintenance': 'HM', 'cleaning-household': 'CL', 'food-beverage': 'FD',
  'furniture-assembly': 'FR', 'shopping-errands': 'SH', 'delivery-moving': 'DV',
  'travel-mobility': 'TR', 'event-planning': 'EV', 'childcare-education': 'CH',
  'eldercare-healthcare': 'EL', 'pet-care': 'PC', 'personal-care': 'PS',
  'tech-support': 'TC', 'creative-arts': 'AR', 'admin-business': 'AD', 'charity-community': 'CC',
};

let cache: Record<string, string> = { ...FALLBACK };

/** Load the 16 category codes from the DB into memory. Call once at startup. */
export async function loadCategoryCodes(): Promise<void> {
  try {
    const result = await db.query('SELECT slug, code FROM category_codes');
    if (result.rows.length > 0) {
      const map: Record<string, string> = {};
      for (const row of result.rows) map[row.slug] = row.code;
      cache = map;
      console.log(`[categoryCodes] Loaded ${result.rows.length} category codes from DB`);
    }
  } catch (err) {
    console.warn('[categoryCodes] Using fallback codes:', (err as Error).message);
  }
}

/** 2-letter code for a category slug, e.g. 'delivery-moving' -> 'DV'. */
export function getCategoryCode(category: string | null | undefined): string {
  if (!category) return 'XX';
  return cache[category.toLowerCase()] || 'XX';
}
