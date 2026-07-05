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
    const normalized = input
        .trim()
        .toUpperCase()
        .replace(/^S/, '')
        .replace(/[^0-9]/g, '');
    if (normalized.length === 6 && /^\d{6}$/.test(normalized)) {
        return normalized;
    }
    return null;
}
/**
 * Lookup Singapore address from postal code
 * Priority: Google Geocoding > Mapbox > Manual entry
 * Returns null if unable to verify (never guesses)
 */
export async function lookupAddress(postalCode) {
    const normalized = normalizePostalCode(postalCode);
    if (!normalized) {
        console.log('[AddressLookup] Invalid postal code format:', postalCode);
        return null;
    }
    try {
        // Check cache first
        const cached = await db.query('SELECT * FROM postal_code_cache WHERE postal_code = $1', [normalized]);
        if (cached.rows.length > 0) {
            const row = cached.rows[0];
            console.log('[AddressLookup] Cache hit for', normalized);
            return {
                postal_code: row.postal_code,
                formatted_address: row.formatted_address,
                block_number: row.block_number,
                street_name: row.street_name,
                building_name: row.building_name,
                latitude: row.latitude,
                longitude: row.longitude,
                area: row.area,
                subzone: row.subzone,
                provider: row.provider,
                confidence: row.confidence,
            };
        }
        console.log('[AddressLookup] Cache miss for', normalized);
        // Try Google Geocoding API (PRIMARY)
        let result = await queryGoogleGeocoding(normalized);
        if (result) {
            await cacheAddressData(result);
            return result;
        }
        console.log('[AddressLookup] Google Geocoding failed for', normalized);
        // Try Mapbox Geocoding API (FALLBACK)
        result = await queryMapboxGeocoding(normalized);
        if (result) {
            await cacheAddressData(result);
            return result;
        }
        console.log('[AddressLookup] Mapbox failed for', normalized);
        // Unable to verify - return null
        return null;
    }
    catch (err) {
        console.error('[AddressLookup] Lookup error:', err);
        return null;
    }
}
/**
 * Query Google Geocoding API (PRIMARY SOURCE)
 * Free tier: 25,000 requests/day
 * Paid tier: $0.005/request
 *
 * Requires: GOOGLE_MAPS_API_KEY environment variable
 */
async function queryGoogleGeocoding(postalCode) {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
        console.log('[AddressLookup] Google Maps API key not configured - skipping Google');
        return null;
    }
    try {
        console.log('[AddressLookup] Querying Google Geocoding for', postalCode);
        const query = `Singapore ${postalCode}`;
        const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${apiKey}&region=sg&components=country:SG`;
        const response = await axios.get(url, { timeout: 5000 });
        if (!response.data.results || response.data.results.length === 0) {
            console.log('[AddressLookup] Google returned no results for', postalCode);
            return null;
        }
        const result = response.data.results[0];
        // Extract address components
        const addressComponents = {};
        if (result.address_components) {
            for (const comp of result.address_components) {
                const type = comp.types[0];
                if (type === 'street_number')
                    addressComponents.block_number = comp.long_name;
                if (type === 'route')
                    addressComponents.street_name = comp.long_name;
                if (type === 'premise')
                    addressComponents.building_name = comp.long_name;
            }
        }
        const formattedAddress = result.formatted_address || `Singapore ${postalCode}`;
        const latitude = result.geometry?.location?.lat;
        const longitude = result.geometry?.location?.lng;
        // Get area from coordinates
        const area = latitude && longitude ? await getPlanningAreaFromCoordinates(latitude, longitude) : undefined;
        const data = {
            postal_code: postalCode,
            formatted_address: formattedAddress,
            block_number: addressComponents.block_number,
            street_name: addressComponents.street_name,
            building_name: addressComponents.building_name,
            latitude,
            longitude,
            area,
            provider: 'Google Geocoding',
            confidence: result.geometry?.location_type || 'ROOFTOP', // ROOFTOP, RANGE_INTERPOLATED, GEOMETRIC_CENTER, APPROXIMATE
        };
        console.log('[AddressLookup] ✅ Google success:', area, formattedAddress);
        return data;
    }
    catch (err) {
        console.warn('[AddressLookup] Google Geocoding error:', err instanceof Error ? err.message : String(err));
        return null;
    }
}
/**
 * Query Mapbox Geocoding API (FALLBACK SOURCE)
 * Free tier: 600 requests/minute, limited history
 * Paid tier: $0.0005/request (cheaper than Google for high volume)
 *
 * Requires: MAPBOX_API_KEY environment variable
 *
 * Check terms before caching:
 * Mapbox allows caching for most use cases, but verify your account terms
 */
async function queryMapboxGeocoding(postalCode) {
    const apiKey = process.env.MAPBOX_API_KEY;
    if (!apiKey) {
        console.log('[AddressLookup] Mapbox API key not configured - skipping Mapbox');
        return null;
    }
    try {
        console.log('[AddressLookup] Querying Mapbox for', postalCode);
        const query = `${postalCode} Singapore`;
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?country=SG&access_token=${apiKey}`;
        const response = await axios.get(url, { timeout: 5000 });
        if (!response.data.features || response.data.features.length === 0) {
            console.log('[AddressLookup] Mapbox returned no results for', postalCode);
            return null;
        }
        const feature = response.data.features[0];
        const formattedAddress = feature.place_name || `Singapore ${postalCode}`;
        const [longitude, latitude] = feature.geometry?.coordinates || [];
        // Get area from coordinates
        const area = latitude && longitude ? await getPlanningAreaFromCoordinates(latitude, longitude) : undefined;
        const data = {
            postal_code: postalCode,
            formatted_address: formattedAddress,
            latitude,
            longitude,
            area,
            provider: 'Mapbox Geocoding',
            confidence: feature.relevance ? (feature.relevance * 100).toFixed(0) + '%' : 'Unknown',
        };
        console.log('[AddressLookup] ✅ Mapbox success:', area, formattedAddress);
        return data;
    }
    catch (err) {
        console.warn('[AddressLookup] Mapbox error:', err instanceof Error ? err.message : String(err));
        return null;
    }
}
/**
 * Cache address data to database
 * Respects API provider terms (Google allows general caching, Mapbox check your account)
 */
async function cacheAddressData(data) {
    try {
        await db.query(`INSERT INTO postal_code_cache
       (postal_code, formatted_address, block_number, street_name, building_name, latitude, longitude, area, subzone, provider, confidence, last_verified_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
       ON CONFLICT (postal_code) DO UPDATE SET
       last_verified_at = NOW(),
       provider = EXCLUDED.provider`, [
            data.postal_code,
            data.formatted_address,
            data.block_number || null,
            data.street_name || null,
            data.building_name || null,
            data.latitude || null,
            data.longitude || null,
            data.area || null,
            data.subzone || null,
            data.provider,
            data.confidence || null,
        ]);
        console.log('[AddressLookup] Cached:', data.postal_code, 'via', data.provider);
    }
    catch (err) {
        console.error('[AddressLookup] Cache error:', err);
    }
}
export default {
    normalizePostalCode,
    lookupAddress,
};
