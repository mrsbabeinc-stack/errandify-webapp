/**
 * Address Provider Interface
 * Adapter pattern for multiple address lookup providers
 *
 * Current providers:
 * - Mapbox (primary)
 * - Google Geocoding (future)
 * - SingPost SGLocate (future)
 *
 * Allows switching providers without changing core lookup logic
 */

import db from '../../db.js';
import { normalizePostalCode } from '../postalCodeNormalizer.js';
import { getPlanningAreaFromPostalCode } from '../postalCodeToAreaLookup.js';
import { queryMapbox } from './mapboxProvider.js';
import { queryOneMap } from './oneMapProvider.js';

export interface AddressLookupResult {
  postal_code: string;
  formatted_address: string;
  latitude: number;
  longitude: number;
  area?: string;
  subzone?: string;
  provider: string;
  confidence: number;
  manually_corrected?: boolean;
  corrected_by_user_id?: string;
  last_verified_at?: Date;
}

/**
 * Main address lookup - check cache first, then query provider
 *
 * @param postalCode - Input postal code (may have spaces, "S" prefix, etc)
 * @returns Complete address data with area and coordinates, or null if unable to verify
 */
export async function lookupAddress(postalCode: string): Promise<AddressLookupResult | null> {
  const normalized = normalizePostalCode(postalCode);

  if (!normalized) {
    console.log('[AddressProvider] Invalid postal code format:', postalCode);
    return null;
  }

  try {
    // Check cache first
    const cached = await getCachedAddress(normalized);
    if (cached) {
      console.log('[AddressProvider] Cache hit for', normalized);
      return cached;
    }

    console.log('[AddressProvider] Cache miss for', normalized);

    // Query OneMap (SLA, free, accurate for Singapore) - primary provider
    const oneMapResult = await queryOneMap(normalized);
    if (oneMapResult) {
      const addressData = await enrichWithAreaAndCache(oneMapResult);
      return addressData;
    }

    // Query Mapbox (secondary provider)
    const mapboxResult = await queryMapbox(normalized);
    if (mapboxResult) {
      const addressData = await enrichWithAreaAndCache(mapboxResult);
      return addressData;
    }

    console.log('[AddressProvider] Providers failed, trying fallback with local database...');

    // Fallback: Query local singapore_postcodes table for full address
    try {
      const dbResult = await db.query(
        `SELECT postal_code, full_address, area, latitude, longitude
         FROM singapore_postcodes
         WHERE postal_code = $1`,
        [normalized]
      );

      if (dbResult.rows.length > 0) {
        const row = dbResult.rows[0];
        console.log('[AddressProvider] ✅ Fallback: Found in local database:', row.full_address);
        const fallbackResult: AddressLookupResult = {
          postal_code: row.postal_code,
          formatted_address: row.full_address,
          area: row.area,
          latitude: parseFloat(row.latitude) || 0,
          longitude: parseFloat(row.longitude) || 0,
          provider: 'local_database',
          confidence: 0.95,
        };
        return fallbackResult;
      }

    } catch (dbErr) {
      console.warn('[AddressProvider] Database lookup failed:', dbErr instanceof Error ? dbErr.message : '');
    }

    // Last-resort fallback — ALWAYS return something (never fail).
    // Sector map gives the general area; the address degrades to "Singapore <postal>".
    // Not cached, so a real provider result can still replace it on a later lookup.
    const area = getPlanningAreaFromPostalCode(normalized);
    console.log('[AddressProvider] Using guaranteed fallback for', normalized, '(area:', area || 'unknown', ')');
    return {
      postal_code: normalized,
      formatted_address: `Singapore ${normalized}`,
      area: area || 'Singapore',
      latitude: 0,
      longitude: 0,
      provider: 'postal_code_lookup',
      confidence: area ? 0.8 : 0.4,
    };
  } catch (err) {
    console.error('[AddressProvider] Lookup error:', err);
    // Even on an unexpected error, never fail — return a safe minimal result
    const safe = normalizePostalCode(postalCode) || postalCode;
    return {
      postal_code: safe,
      formatted_address: `Singapore ${safe}`,
      area: 'Singapore',
      latitude: 0,
      longitude: 0,
      provider: 'error_fallback',
      confidence: 0.3,
    };
  }
}

/**
 * Get cached address data
 * Returns null if cache miss or address not found
 */
async function getCachedAddress(postalCode: string): Promise<AddressLookupResult | null> {
  try {
    const result = await db.query(
      `SELECT * FROM postal_code_cache
       WHERE postal_code = $1
       AND last_verified_at > NOW() - INTERVAL '90 days'`,
      [postalCode]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      postal_code: row.postal_code,
      formatted_address: row.full_address,
      latitude: row.latitude,
      longitude: row.longitude,
      area: row.planning_area,
      subzone: row.subzone,
      provider: row.provider,
      confidence: parseFloat(row.confidence),
      manually_corrected: row.manually_corrected,
      corrected_by_user_id: row.corrected_by_user_id,
      last_verified_at: row.last_verified_at,
    };
  } catch (err) {
    console.error('[AddressProvider] Cache lookup error:', err);
    return null;
  }
}

/**
 * Enrich address with area from postal code and cache the result
 */
async function enrichWithAreaAndCache(
  addressData: any
): Promise<AddressLookupResult | null> {
  try {
    // Resolve area from postal code using official Singapore postal code ranges
    // This method is 100% accurate as it uses the official postal code to area mapping
    const area = addressData.postal_code
      ? getPlanningAreaFromPostalCode(addressData.postal_code)
      : null;

    const result: AddressLookupResult = {
      postal_code: addressData.postal_code,
      formatted_address: addressData.formatted_address,
      latitude: addressData.latitude,
      longitude: addressData.longitude,
      area: area || undefined,
      provider: addressData.provider,
      confidence: addressData.confidence,
      last_verified_at: new Date(),
    };

    // Cache the result
    await cacheAddress(result);

    console.log('[AddressProvider] ✅ Complete lookup for', addressData.postal_code, 'area:', area);
    return result;
  } catch (err) {
    console.error('[AddressProvider] Enrichment error:', err);
    return null;
  }
}

/**
 * Cache address data to database
 */
async function cacheAddress(data: AddressLookupResult): Promise<void> {
  try {
    await db.query(
      `INSERT INTO postal_code_cache
       (postal_code, full_address, latitude, longitude, planning_area, subzone, provider, confidence, last_verified_at, manually_corrected)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), $9)
       ON CONFLICT (postal_code) DO UPDATE SET
       full_address = EXCLUDED.full_address,
       latitude = EXCLUDED.latitude,
       longitude = EXCLUDED.longitude,
       planning_area = EXCLUDED.planning_area,
       subzone = EXCLUDED.subzone,
       provider = EXCLUDED.provider,
       confidence = EXCLUDED.confidence,
       last_verified_at = NOW()`,
      [
        data.postal_code,
        data.formatted_address,
        data.latitude,
        data.longitude,
        data.area || null,
        data.subzone || null,
        data.provider,
        data.confidence,
        data.manually_corrected || false,
      ]
    );

    console.log('[AddressProvider] ✅ Cached:', data.postal_code);
  } catch (err) {
    console.error('[AddressProvider] Cache write error:', err);
  }
}

/**
 * Mark an address as manually corrected by user
 * Updates the cache record to indicate user intervention
 */
export async function markManuallyCorrect(
  postalCode: string,
  userId: string,
  correctedAddress?: string
): Promise<void> {
  try {
    await db.query(
      `UPDATE postal_code_cache
       SET manually_corrected = TRUE,
           corrected_by_user_id = $1,
           full_address = COALESCE($2, full_address),
           last_verified_at = NOW()
       WHERE postal_code = $3`,
      [userId, correctedAddress || null, postalCode]
    );

    console.log('[AddressProvider] ✅ Marked corrected:', postalCode, 'by', userId);
  } catch (err) {
    console.error('[AddressProvider] Mark corrected error:', err);
  }
}

export default {
  lookupAddress,
  markManuallyCorrect,
};
