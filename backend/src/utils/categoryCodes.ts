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

/** The 16 valid category slugs. */
export function getCategorySlugs(): string[] {
  return Object.keys(cache);
}

/**
 * Common free-text labels that aren't slugs. Hana's extraction returns display
 * names ("Home Services", "Cleaning"), and an errand stored under one of those
 * matches no category filter anywhere in the app — the marketplace compares
 * `e.category = $slug` exactly — and gets an 'XX' errand id.
 */
const ALIASES: Record<string, string> = {
  'home services': 'home-maintenance',
  'home service': 'home-maintenance',
  'handyman': 'home-maintenance',
  'repairs': 'home-maintenance',
  'maintenance': 'home-maintenance',
  'cleaning': 'cleaning-household',
  'household': 'cleaning-household',
  'housekeeping': 'cleaning-household',
  'food': 'food-beverage',
  'catering': 'food-beverage',
  'furniture': 'furniture-assembly',
  'assembly': 'furniture-assembly',
  'shopping': 'shopping-errands',
  'groceries': 'shopping-errands',
  'delivery': 'delivery-moving',
  'moving': 'delivery-moving',
  'logistics': 'delivery-moving',
  'transport': 'travel-mobility',
  'travel': 'travel-mobility',
  'events': 'event-planning',
  'event': 'event-planning',
  'childcare': 'childcare-education',
  'tutoring': 'childcare-education',
  'education': 'childcare-education',
  'training': 'childcare-education',
  'eldercare': 'eldercare-healthcare',
  'healthcare': 'eldercare-healthcare',
  'pets': 'pet-care',
  'beauty': 'personal-care',
  'tech': 'tech-support',
  'technology': 'tech-support',
  'it': 'tech-support',
  'security': 'admin-business',
  'admin': 'admin-business',
  'business': 'admin-business',
  'creative': 'creative-arts',
  'charity': 'charity-community',
  'community': 'charity-community',
};

/**
 * Best-effort resolution of free text to one of the 16 category slugs.
 * Returns null when nothing matches, so the caller can ask rather than store
 * something unfilterable.
 */
export function resolveCategorySlug(input: string | null | undefined): string | null {
  if (!input) return null;

  const raw = String(input).trim().toLowerCase();
  if (!raw) return null;

  // Already a slug
  if (cache[raw]) return raw;

  // "Cleaning & Household" -> "cleaning-household"
  const slugged = raw.replace(/&/g, ' ').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  if (cache[slugged]) return slugged;

  if (ALIASES[raw]) return ALIASES[raw];
  if (ALIASES[slugged.replace(/-/g, ' ')]) return ALIASES[slugged.replace(/-/g, ' ')];

  // Fall back to the first slug sharing a word with the input
  const words = slugged.split('-').filter((w) => w.length > 3);
  for (const slug of Object.keys(cache)) {
    if (words.some((w) => slug.includes(w))) return slug;
  }

  return null;
}
