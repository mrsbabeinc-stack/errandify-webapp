import { query } from '../db.js';

export interface Landmark {
  id: number;
  name: string;
  postal_code: string;
  address: string;
  category: string;
  alternate_names: string[];
  latitude?: number;
  longitude?: number;
}

/**
 * Search for landmark by name and return postal code + address
 * Uses fuzzy matching on name and alternate names
 */
export async function searchLandmark(searchTerm: string): Promise<Landmark | null> {
  if (!searchTerm || searchTerm.length < 2) return null;

  const searchLower = searchTerm.toLowerCase().trim();

  try {
    // First: Exact match on name (fastest)
    let result = await query(
      `SELECT * FROM landmarks 
       WHERE LOWER(name) = $1 
       LIMIT 1`,
      [searchLower]
    );

    if (result.rows.length > 0) {
      console.log('[LandmarkService] ✅ Exact match found:', searchLower);
      return result.rows[0];
    }

    // Second: Match against alternate names
    result = await query(
      `SELECT * FROM landmarks 
       WHERE $1 = ANY(alternate_names) 
       LIMIT 1`,
      [searchLower]
    );

    if (result.rows.length > 0) {
      console.log('[LandmarkService] ✅ Alternate name match:', searchLower);
      return result.rows[0];
    }

    // Third: Partial match on name (LIKE)
    result = await query(
      `SELECT * FROM landmarks 
       WHERE LOWER(name) LIKE $1 
       ORDER BY similarity(LOWER(name), $2) DESC
       LIMIT 1`,
      [`%${searchLower}%`, searchLower]
    );

    if (result.rows.length > 0) {
      console.log('[LandmarkService] ✅ Partial match found:', result.rows[0].name);
      return result.rows[0];
    }

    console.log('[LandmarkService] No landmark found for:', searchTerm);
    return null;
  } catch (error) {
    console.error('[LandmarkService] Search error:', error instanceof Error ? error.message : error);
    return null;
  }
}

/**
 * Get landmark by postal code
 */
export async function getLandmarkByPostal(postalCode: string): Promise<Landmark | null> {
  if (!postalCode || postalCode.length !== 6) return null;

  try {
    const result = await query(
      `SELECT * FROM landmarks WHERE postal_code = $1 LIMIT 1`,
      [postalCode]
    );

    return result.rows.length > 0 ? result.rows[0] : null;
  } catch (error) {
    console.error('[LandmarkService] Postal lookup error:', error instanceof Error ? error.message : error);
    return null;
  }
}

/**
 * Add user-discovered landmark to alternate names
 * Improves search over time
 */
export async function recordLandmarkUsage(userInput: string, foundPostal: string): Promise<void> {
  if (!userInput || !foundPostal) return;

  const userInputLower = userInput.toLowerCase().trim();

  try {
    // Check if this alternate name already exists
    const check = await query(
      `SELECT id FROM landmarks 
       WHERE postal_code = $1 AND $2 = ANY(alternate_names)`,
      [foundPostal, userInputLower]
    );

    if (check.rows.length === 0) {
      // Add new alternate name
      await query(
        `UPDATE landmarks 
         SET alternate_names = array_append(alternate_names, $1),
             updated_at = NOW()
         WHERE postal_code = $2`,
        [userInputLower, foundPostal]
      );
      console.log('[LandmarkService] Added alternate name:', userInputLower, 'for postal:', foundPostal);
    }
  } catch (error) {
    console.warn('[LandmarkService] Could not record usage:', error instanceof Error ? error.message : error);
  }
}

/**
 * Get all landmarks in a category (e.g., all schools)
 */
export async function getLandmarksByCategory(category: string): Promise<Landmark[]> {
  if (!category) return [];

  try {
    const result = await query(
      `SELECT * FROM landmarks WHERE category = $1 ORDER BY name`,
      [category]
    );
    return result.rows;
  } catch (error) {
    console.error('[LandmarkService] Category lookup error:', error instanceof Error ? error.message : error);
    return [];
  }
}
