/**
 * Mapbox Geocoding API Provider
 * Primary address lookup provider for Singapore postal codes
 *
 * Free tier: 600 requests/minute
 * Paid tier: $0.0005/request (cheaper than alternatives for high volume)
 *
 * Requires: MAPBOX_API_KEY environment variable
 */

import axios from 'axios';

export interface MapboxGeocodeResult {
  postal_code: string;
  formatted_address: string;
  latitude: number;
  longitude: number;
  provider: 'mapbox';
  confidence: number; // relevance score 0-1
}

/**
 * Query Mapbox Geocoding API for Singapore postal code
 * Search format: "Singapore [postal_code]"
 *
 * @param postalCode - Normalized 6-digit postal code
 * @returns Address data with coordinates or null if not found
 */
export async function queryMapbox(postalCode: string): Promise<MapboxGeocodeResult | null> {
  const apiKey = process.env.MAPBOX_API_KEY;

  if (!apiKey) {
    console.log('[MapboxProvider] API key not configured - skipping Mapbox lookup');
    return null;
  }

  if (!postalCode || postalCode.length !== 6) {
    console.log('[MapboxProvider] Invalid postal code format:', postalCode);
    return null;
  }

  try {
    console.log('[MapboxProvider] Querying Mapbox for postal code', postalCode);

    const query = `${postalCode} Singapore`;
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json`;

    const response = await axios.get(url, {
      params: {
        country: 'SG',
        access_token: apiKey,
      },
      timeout: 5000,
    });

    if (!response.data.features || response.data.features.length === 0) {
      console.log('[MapboxProvider] No results for postal code', postalCode);
      return null;
    }

    const feature = response.data.features[0];
    const [longitude, latitude] = feature.geometry?.coordinates || [];

    if (!latitude || !longitude) {
      console.log('[MapboxProvider] No coordinates in response for', postalCode);
      return null;
    }

    let formatted_address = `Singapore ${postalCode}`; // Default fallback
    const confidence = feature.relevance || 0.5;

    // Reverse geocode to get full street address (e.g., "433 Choa Chu Kang Avenue 4, Singapore 680433")
    try {
      const reverseUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json`;
      const reverseResponse = await axios.get(reverseUrl, {
        params: {
          country: 'SG',
          access_token: apiKey,
          types: 'address', // Only get detailed addresses
          limit: 1,
        },
        timeout: 5000,
      });

      if (reverseResponse.data.features && reverseResponse.data.features.length > 0) {
        const addressFeature = reverseResponse.data.features[0];
        if (addressFeature.place_name) {
          formatted_address = addressFeature.place_name;
          console.log('[MapboxProvider] Reverse geocoded full address:', formatted_address);
        }
      }
    } catch (err) {
      // If reverse geocoding fails, keep the default
      console.warn('[MapboxProvider] Reverse geocoding failed, using fallback');
    }

    const result: MapboxGeocodeResult = {
      postal_code: postalCode,
      formatted_address,
      latitude,
      longitude,
      provider: 'mapbox',
      confidence,
    };

    console.log('[MapboxProvider] ✅ Success for', postalCode, '-', formatted_address);
    return result;
  } catch (err) {
    console.warn(
      '[MapboxProvider] Error:',
      err instanceof Error ? err.message : String(err)
    );
    return null;
  }
}

export default {
  queryMapbox,
};
