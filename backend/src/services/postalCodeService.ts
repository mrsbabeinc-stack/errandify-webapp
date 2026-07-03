import db from '../db.js';

interface PostalCodeData {
  postal_code: string;
  block_number?: string;
  street_name?: string;
  building_name?: string;
  full_address: string;
  latitude?: number;
  longitude?: number;
  planning_area?: string;
  subzone?: string;
  source: string;
}

/**
 * Normalize postal code: trim, uppercase, remove leading S, validate 6 digits
 */
export function normalizePostalCode(input: string): string | null {
  const normalized = input.trim().toUpperCase().replace(/^S/, '').replace(/[^0-9]/g, '');
  if (normalized.length === 6 && /^\d{6}$/.test(normalized)) {
    return normalized;
  }
  return null;
}

/**
 * Get postal code data from cache or external APIs
 * Returns null if unable to verify
 */
export async function lookupPostalCode(postalCode: string): Promise<PostalCodeData | null> {
  const normalized = normalizePostalCode(postalCode);
  if (!normalized) {
    return null;
  }

  try {
    // Check cache first
    const cached = await db.query(
      'SELECT * FROM postal_code_cache WHERE postal_code = $1',
      [normalized]
    );

    if (cached.rows.length > 0) {
      const row = cached.rows[0];
      return {
        postal_code: row.postal_code,
        block_number: row.block_number,
        street_name: row.street_name,
        building_name: row.building_name,
        full_address: row.full_address,
        latitude: row.latitude,
        longitude: row.longitude,
        planning_area: row.planning_area,
        subzone: row.subzone,
        source: row.source,
      };
    }

    // Try SingPost SGLocate API (primary source)
    try {
      const singpostResult = await querySingPostAPI(normalized);
      if (singpostResult) {
        // Cache the result
        await cachePostalCodeData(singpostResult);
        return singpostResult;
      }
    } catch (err) {
      console.warn(`[PostalCodeService] SingPost API failed for ${normalized}:`, err);
    }

    // Fallback to OneMap (secondary source)
    try {
      const oneMapResult = await queryOneMapAPI(normalized);
      if (oneMapResult) {
        // Cache the result
        await cachePostalCodeData(oneMapResult);
        return oneMapResult;
      }
    } catch (err) {
      console.warn(`[PostalCodeService] OneMap API failed for ${normalized}:`, err);
    }

    // Unable to verify
    console.warn(`[PostalCodeService] Unable to verify postal code: ${normalized}`);
    return null;
  } catch (err) {
    console.error('[PostalCodeService] Lookup error:', err);
    return null;
  }
}

/**
 * Query SingPost SGLocate API (primary source)
 * This API provides official Singapore address data
 */
async function querySingPostAPI(postalCode: string): Promise<PostalCodeData | null> {
  // SingPost SGLocate API endpoint
  // Note: Requires API key from SingPost - configure in environment
  const apiKey = process.env.SINGPOST_API_KEY;
  if (!apiKey) {
    console.warn('[PostalCodeService] SingPost API key not configured');
    return null;
  }

  try {
    const url = `https://www.singpost.com/api/sglocate/search?postalcode=${postalCode}&key=${apiKey}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data && data.address) {
      const address = data.address;
      const fullAddress = `${address.block_number} ${address.street_name}, Singapore ${postalCode}`;

      // Get planning area from lat/long using URA boundary data
      const planningArea = await getPlanningAreaFromCoords(address.latitude, address.longitude);

      return {
        postal_code: postalCode,
        block_number: address.block_number,
        street_name: address.street_name,
        building_name: address.building_name || undefined,
        full_address: fullAddress,
        latitude: parseFloat(address.latitude),
        longitude: parseFloat(address.longitude),
        planning_area: planningArea || 'Unable to classify',
        subzone: address.subzone || undefined,
        source: 'SingPost SGLocate',
      };
    }
  } catch (err) {
    console.warn('[PostalCodeService] SingPost API query failed:', err);
  }

  return null;
}

/**
 * Query OneMap API (fallback source)
 */
async function queryOneMapAPI(postalCode: string): Promise<PostalCodeData | null> {
  try {
    const url = `https://www.onemap.sg/api/common/elastic/search?searchVal=${postalCode}&returnGeom=Y&getAddrDetails=Y`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.results && data.results.length > 0) {
      const result = data.results[0];
      const fullAddress = result.ADDRESS || `Singapore ${postalCode}`;

      // Get planning area from lat/long
      const planningArea = await getPlanningAreaFromCoords(result.LATITUDE, result.LONGITUDE);

      return {
        postal_code: postalCode,
        full_address: fullAddress,
        latitude: parseFloat(result.LATITUDE),
        longitude: parseFloat(result.LONGITUDE),
        planning_area: planningArea || 'Unable to classify',
        source: 'OneMap',
      };
    }
  } catch (err) {
    console.warn('[PostalCodeService] OneMap API query failed:', err);
  }

  return null;
}

/**
 * Determine planning area using point-in-polygon lookup
 * Uses URA Planning Area Boundary GeoJSON from data.gov.sg
 */
async function getPlanningAreaFromCoords(latitude: number | string, longitude: number | string): Promise<string | null> {
  try {
    const lat = parseFloat(String(latitude));
    const lon = parseFloat(String(longitude));

    // For now, return null as a placeholder
    // In production, this would use a geospatial library or URA API
    // to determine which planning area contains this lat/lon point
    console.warn('[PostalCodeService] Planning area lookup not yet implemented');
    return null;
  } catch (err) {
    console.error('[PostalCodeService] Planning area lookup error:', err);
    return null;
  }
}

/**
 * Cache postal code data to database
 */
async function cachePostalCodeData(data: PostalCodeData): Promise<void> {
  try {
    await db.query(
      `INSERT INTO postal_code_cache
       (postal_code, block_number, street_name, building_name, full_address, latitude, longitude, planning_area, subzone, source, last_verified_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
       ON CONFLICT (postal_code) DO UPDATE SET
       last_verified_at = NOW()`,
      [
        data.postal_code,
        data.block_number || null,
        data.street_name || null,
        data.building_name || null,
        data.full_address,
        data.latitude || null,
        data.longitude || null,
        data.planning_area || null,
        data.subzone || null,
        data.source,
      ]
    );
  } catch (err) {
    console.error('[PostalCodeService] Cache error:', err);
  }
}

export default {
  normalizePostalCode,
  lookupPostalCode,
};
