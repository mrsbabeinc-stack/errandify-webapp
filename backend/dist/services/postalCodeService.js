import db from '../db.js';
import axios from 'axios';
import { getPlanningAreaFromCoordinates } from './uraPlannningAreaLookup.js';
/**
 * Normalize postal code: trim, uppercase, remove leading S, validate 6 digits
 * Input: "S680433" → Output: "680433"
 * Input: " 680433 " → Output: "680433"
 * Input: "invalid" → Output: null
 */
export function normalizePostalCode(input) {
    if (!input || typeof input !== 'string') {
        return null;
    }
    // Trim spaces, uppercase, remove leading S, remove all non-digits
    const normalized = input
        .trim()
        .toUpperCase()
        .replace(/^S/, '')
        .replace(/[^0-9]/g, '');
    // Validate exactly 6 digits
    if (normalized.length === 6 && /^\d{6}$/.test(normalized)) {
        return normalized;
    }
    return null;
}
/**
 * Get postal code data from cache or SingPost API
 * Returns null if unable to verify (never guesses)
 */
export async function lookupPostalCode(postalCode) {
    const normalized = normalizePostalCode(postalCode);
    if (!normalized) {
        console.log('[PostalCodeService] Invalid postal code format:', postalCode);
        return null;
    }
    try {
        // Check cache first
        const cached = await db.query('SELECT * FROM postal_code_cache WHERE postal_code = $1', [normalized]);
        if (cached.rows.length > 0) {
            const row = cached.rows[0];
            console.log('[PostalCodeService] Cache hit for', normalized);
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
        console.log('[PostalCodeService] Cache miss for', normalized);
        // Try SingPost SGLocate API (PRIMARY SOURCE)
        const singpostResult = await querySingPostAPI(normalized);
        if (singpostResult) {
            await cachePostalCodeData(singpostResult);
            return singpostResult;
        }
        console.log('[PostalCodeService] SingPost failed for', normalized);
        // Fallback: Try OneMap API (SECONDARY SOURCE)
        const oneMapResult = await queryOneMapAPI(normalized);
        if (oneMapResult) {
            await cachePostalCodeData(oneMapResult);
            return oneMapResult;
        }
        console.log('[PostalCodeService] OneMap failed for', normalized);
        // Unable to verify - return null (don't guess)
        return null;
    }
    catch (err) {
        console.error('[PostalCodeService] Lookup error:', err);
        return null;
    }
}
/**
 * Query SingPost SGLocate API (PRIMARY SOURCE)
 * Requires: SINGPOST_API_KEY environment variable
 *
 * Returns official Singapore postal data with lat/lng for area classification
 */
async function querySingPostAPI(postalCode) {
    const apiKey = process.env.SINGPOST_API_KEY;
    if (!apiKey) {
        console.log('[PostalCodeService] SingPost API key not configured - skipping SingPost lookup');
        return null;
    }
    try {
        console.log('[PostalCodeService] Querying SingPost for', postalCode);
        // SingPost SGLocate API endpoint
        // Documentation: https://www.singpost.com/developer-api
        const url = `https://api.singpost.com/sglocate/search`;
        const response = await axios.post(url, { postalCode }, {
            headers: { 'Authorization': `Bearer ${apiKey}` },
            timeout: 5000,
        });
        if (!response.data || !response.data.address) {
            console.log('[PostalCodeService] SingPost returned no address for', postalCode);
            return null;
        }
        const addr = response.data.address;
        // Construct full address
        const fullAddress = `${addr.block_number || ''} ${addr.street_name || ''}`.trim() +
            (addr.building_name ? `, ${addr.building_name}` : '') +
            `, Singapore ${postalCode}`;
        // Get planning area from lat/lng using URA boundaries
        const planningArea = await getPlanningAreaFromCoords(addr.latitude, addr.longitude);
        const result = {
            postal_code: postalCode,
            block_number: addr.block_number || undefined,
            street_name: addr.street_name || undefined,
            building_name: addr.building_name || undefined,
            full_address: fullAddress,
            latitude: addr.latitude ? parseFloat(addr.latitude) : undefined,
            longitude: addr.longitude ? parseFloat(addr.longitude) : undefined,
            planning_area: planningArea || undefined,
            subzone: addr.subzone || undefined,
            source: 'SingPost SGLocate',
        };
        console.log('[PostalCodeService] ✅ SingPost success:', result.planning_area, result.full_address);
        return result;
    }
    catch (err) {
        console.warn('[PostalCodeService] SingPost API error:', err instanceof Error ? err.message : String(err));
        return null;
    }
}
/**
 * Query OneMap API (FALLBACK SOURCE)
 * Only used if SingPost fails or is unavailable
 */
async function queryOneMapAPI(postalCode) {
    try {
        console.log('[PostalCodeService] Querying OneMap for', postalCode);
        const url = `https://www.onemap.sg/api/common/elastic/search?searchVal=${postalCode}&returnGeom=Y&getAddrDetails=Y`;
        const response = await axios.get(url, { timeout: 5000 });
        if (!response.data.results || response.data.results.length === 0) {
            console.log('[PostalCodeService] OneMap returned no results for', postalCode);
            return null;
        }
        const result = response.data.results[0];
        // Get planning area from lat/lng
        const planningArea = await getPlanningAreaFromCoords(result.LATITUDE, result.LONGITUDE);
        const fullAddress = result.ADDRESS || `Singapore ${postalCode}`;
        const data = {
            postal_code: postalCode,
            full_address: fullAddress,
            latitude: result.LATITUDE ? parseFloat(result.LATITUDE) : undefined,
            longitude: result.LONGITUDE ? parseFloat(result.LONGITUDE) : undefined,
            planning_area: planningArea || undefined,
            source: 'OneMap (Fallback)',
        };
        console.log('[PostalCodeService] ✅ OneMap success:', data.planning_area, data.full_address);
        return data;
    }
    catch (err) {
        console.warn('[PostalCodeService] OneMap error:', err instanceof Error ? err.message : String(err));
        return null;
    }
}
/**
 * Determine planning area using latitude/longitude
 * Uses URA Planning Area Boundary lookup with bounding boxes
 *
 * Returns official planning area name or null if unable to classify (never guesses)
 */
async function getPlanningAreaFromCoords(latitude, longitude) {
    if (!latitude || !longitude) {
        console.log('[PostalCodeService] Missing latitude/longitude, cannot determine planning area');
        return null;
    }
    try {
        const lat = parseFloat(String(latitude));
        const lon = parseFloat(String(longitude));
        if (isNaN(lat) || isNaN(lon)) {
            console.log('[PostalCodeService] Invalid coordinates:', lat, lon);
            return null;
        }
        // Use URA boundary lookup (bounding box approach)
        // Returns null if not found (never guesses)
        const area = getPlanningAreaFromCoordinates(lat, lon);
        if (!area) {
            console.log('[PostalCodeService] Unable to classify area for coordinates:', lat, lon);
            return null;
        }
        console.log('[PostalCodeService] ✅ Planning area determined:', area);
        return area;
    }
    catch (err) {
        console.error('[PostalCodeService] Coordinate lookup error:', err);
        return null;
    }
}
/**
 * Cache postal code data to database
 * Never overwrites existing data unless last_verified_at is old
 */
async function cachePostalCodeData(data) {
    try {
        await db.query(`INSERT INTO postal_code_cache
       (postal_code, block_number, street_name, building_name, full_address, latitude, longitude, planning_area, subzone, source, last_verified_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
       ON CONFLICT (postal_code) DO UPDATE SET
       last_verified_at = NOW()`, [
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
        ]);
        console.log('[PostalCodeService] Cached postal code:', data.postal_code);
    }
    catch (err) {
        console.error('[PostalCodeService] Cache error:', err);
    }
}
export default {
    normalizePostalCode,
    lookupPostalCode,
};
