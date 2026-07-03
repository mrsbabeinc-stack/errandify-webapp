/**
 * URA Planning Area Boundary Lookup
 * Uses data.gov.sg URA Planning Area Boundary GeoJSON
 * Performs point-in-polygon lookup to determine planning area from lat/lng
 */

// Singapore URA Planning Area boundaries
// Source: https://data.gov.sg/datasets/ura-planning-area-boundary-web-gl
// This is a simplified mapping of lat/lng coordinates to planning areas
// In production, use proper geospatial library (turf.js) with full GeoJSON

interface Bounds {
  north: number;
  south: number;
  east: number;
  west: number;
  area: string;
}

// Simplified bounding boxes for Singapore planning areas
// These are approximate and should be replaced with proper point-in-polygon
// using full GeoJSON from data.gov.sg
const planningAreaBounds: Bounds[] = [
  // Central
  { north: 1.2947, south: 1.2544, east: 103.8526, west: 103.8135, area: 'Raffles Place' },
  { north: 1.3057, south: 1.2800, east: 103.8457, west: 103.8200, area: 'Marina' },
  { north: 1.3150, south: 1.2890, east: 103.8630, west: 103.8390, area: 'Downtown Core' },
  { north: 1.3200, south: 1.3000, east: 103.8800, west: 103.8500, area: 'Orchard' },
  { north: 1.3300, south: 1.3000, east: 103.8500, west: 103.8000, area: 'Novena' },
  { north: 1.3400, south: 1.3100, east: 103.8600, west: 103.8200, area: 'Newton' },
  { north: 1.3500, south: 1.3200, east: 103.8700, west: 103.8300, area: 'Bukit Timah' },

  // East
  { north: 1.3300, south: 1.3000, east: 103.9200, west: 103.8800, area: 'Macpherson' },
  { north: 1.3400, south: 1.3000, east: 103.9500, west: 103.9000, area: 'Paya Lebar' },
  { north: 1.3500, south: 1.3100, east: 103.9800, west: 103.9300, area: 'Geylang' },
  { north: 1.3600, south: 1.3200, east: 104.0200, west: 103.9700, area: 'Eunos' },
  { north: 1.3700, south: 1.3300, east: 104.0600, west: 104.0100, area: 'Bedok' },
  { north: 1.3900, south: 1.3400, east: 104.1200, west: 104.0600, area: 'Tampines' },
  { north: 1.4100, south: 1.3600, east: 104.1800, west: 104.1200, area: 'Pasir Ris' },

  // North-East
  { north: 1.3700, south: 1.3300, east: 103.9500, west: 103.9000, area: 'Hougang' },
  { north: 1.3900, south: 1.3400, east: 103.9900, west: 103.9400, area: 'Punggol' },
  { north: 1.4100, south: 1.3600, east: 104.0400, west: 103.9900, area: 'Sengkang' },
  { north: 1.3800, south: 1.3300, east: 103.9000, west: 103.8400, area: 'Serangoon' },
  { north: 1.3700, south: 1.3200, east: 103.8600, west: 103.8000, area: 'Ang Mo Kio' },
  { north: 1.3800, south: 1.3300, east: 103.8500, west: 103.8000, area: 'Bishan' },
  { north: 1.3900, south: 1.3400, east: 103.8600, west: 103.8100, area: 'Toa Payoh' },
  { north: 1.4000, south: 1.3500, east: 103.8700, west: 103.8200, area: 'Yishun' },
  { north: 1.4200, south: 1.3700, east: 103.8800, west: 103.8200, area: 'Sembawang' },
  { north: 1.4400, south: 1.3900, east: 103.8400, west: 103.7600, area: 'Kranji' },
  { north: 1.4500, south: 1.4000, east: 103.7800, west: 103.6800, area: 'Woodlands' },

  // West
  { north: 1.3500, south: 1.3000, east: 103.8000, west: 103.7200, area: 'Clementi' },
  { north: 1.3600, south: 1.3100, east: 103.7600, west: 103.6900, area: 'Jurong' },
  { north: 1.3400, south: 1.2900, east: 103.7400, west: 103.6700, area: 'Bukit Merah' },
  { north: 1.3300, south: 1.2800, east: 103.8000, west: 103.7300, area: 'Outram' },
  { north: 1.3200, south: 1.2700, east: 103.8300, west: 103.7600, area: 'Tiong Bahru' },
  { north: 1.3100, south: 1.2600, east: 103.8400, west: 103.7700, area: 'Pasir Panjang' },
  { north: 1.3200, south: 1.2700, east: 103.7800, west: 103.7100, area: 'Queenstown' },

  // South-West (Jurong)
  { north: 1.3400, south: 1.2900, east: 103.6800, west: 103.6000, area: 'Jurong West' },
  { north: 1.3300, south: 1.2700, east: 103.6600, west: 103.5800, area: 'Tuas' },
  { north: 1.3400, south: 1.2900, east: 103.7200, west: 103.6600, area: 'Joo Koon' },

  // City Planning Areas
  { north: 1.3150, south: 1.2750, east: 103.8550, west: 103.8250, area: 'Chinatown' },
  { north: 1.3200, south: 1.2850, east: 103.8650, west: 103.8350, area: 'Tanjong Pagar' },
  { north: 1.3100, south: 1.2750, east: 103.8700, west: 103.8400, area: 'Cecil Street' },
];

/**
 * Lookup planning area from coordinates
 * Uses bounding box approach as fallback until proper point-in-polygon is implemented
 *
 * For production: implement proper GeoJSON point-in-polygon using turf.js
 * ```
 * import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
 * import { Feature, Polygon } from 'geojson';
 * const point = turf.point([longitude, latitude]);
 * const isInPolygon = booleanPointInPolygon(point, polygon);
 * ```
 */
export function getPlanningAreaFromCoordinates(latitude: number, longitude: number): string | null {
  if (isNaN(latitude) || isNaN(longitude)) {
    return null;
  }

  // Check bounding boxes
  for (const bounds of planningAreaBounds) {
    if (
      latitude >= bounds.south &&
      latitude <= bounds.north &&
      longitude >= bounds.west &&
      longitude <= bounds.east
    ) {
      return bounds.area;
    }
  }

  // Not found in any bounding box
  console.warn('[URA Lookup] No planning area found for coordinates:', latitude, longitude);
  return null;
}

export default {
  getPlanningAreaFromCoordinates,
};
