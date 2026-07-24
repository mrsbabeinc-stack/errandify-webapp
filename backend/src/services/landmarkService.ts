import db from '../db.js';

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
 */
export async function searchLandmark(searchTerm: string): Promise<Landmark | null> {
  if (!searchTerm || searchTerm.length < 2) return null;

  const searchLower = searchTerm.toLowerCase().trim();

  try {
    // First: Exact match
    let result = await db.query(
      `SELECT * FROM landmarks WHERE LOWER(name) = $1 LIMIT 1`,
      [searchLower]
    );

    if (result.rows.length > 0) {
      console.log('[LandmarkService] ✅ Exact match found:', searchLower);
      return result.rows[0];
    }

    // Second: Check alternate names (simple array match)
    result = await db.query(
      `SELECT * FROM landmarks 
       WHERE alternate_names IS NOT NULL 
       AND $1 = ANY(alternate_names) 
       LIMIT 1`,
      [searchLower]
    );

    if (result.rows.length > 0) {
      console.log('[LandmarkService] ✅ Alternate name match:', searchLower);
      return result.rows[0];
    }

    // Third: Partial match (LIKE)
    result = await db.query(
      `SELECT * FROM landmarks 
       WHERE LOWER(name) LIKE $1 
       LIMIT 1`,
      [`%${searchLower}%`]
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
    const result = await db.query(
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
 * Record landmark usage for learning
 */
export async function recordLandmarkUsage(userInput: string, foundPostal: string): Promise<void> {
  if (!userInput || !foundPostal) return;

  const userInputLower = userInput.toLowerCase().trim();

  try {
    await db.query(
      `UPDATE landmarks 
       SET alternate_names = array_append(alternate_names, $1),
           updated_at = NOW()
       WHERE postal_code = $2 
       AND NOT ($1 = ANY(alternate_names))`,
      [userInputLower, foundPostal]
    );
  } catch (error) {
    console.warn('[LandmarkService] Could not record usage');
  }
}
