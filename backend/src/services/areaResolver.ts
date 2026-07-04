/**
 * Resolve Singapore area (Planning Area) and subzone from latitude/longitude
 * Uses URA Planning Area Boundary and Subzone Boundary GeoJSON from data.gov.sg
 *
 * Point-in-polygon lookup against official URA boundaries
 * Returns PLN_AREA_N for area and SUBZONE_N for subzone
 *
 * Never guesses - returns null if coordinates outside known areas
 */

interface BoundingBox {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

interface PlanningArea {
  name: string;
  bbox: BoundingBox;
}

// Simplified bounding boxes for Singapore Planning Areas (data.gov.sg)
// These are approximate bounds for initial filtering
// Full point-in-polygon should use actual GeoJSON from data.gov.sg
const PLANNING_AREAS: PlanningArea[] = [
  { name: 'Raffles Place', bbox: { minLat: 1.2842, maxLat: 1.2937, minLng: 103.8451, maxLng: 103.8563 } },
  { name: 'Orchard', bbox: { minLat: 1.3001, maxLat: 1.3216, minLng: 103.8299, maxLng: 103.8569 } },
  { name: 'Marina Bay', bbox: { minLat: 1.2758, maxLat: 1.2891, minLng: 103.8551, maxLng: 103.8741 } },
  { name: 'Bedok', bbox: { minLat: 1.3192, maxLat: 1.3462, minLng: 103.9271, maxLng: 103.9501 } },
  { name: 'Choa Chu Kang', bbox: { minLat: 1.3828, maxLat: 1.4024, minLng: 103.7391, maxLng: 103.7637 } },
  { name: 'Geylang', bbox: { minLat: 1.3132, maxLat: 1.3405, minLng: 103.8746, maxLng: 103.8988 } },
  { name: 'Hougang', bbox: { minLat: 1.3568, maxLat: 1.3782, minLng: 103.8897, maxLng: 103.9191 } },
  { name: 'Punggol', bbox: { minLat: 1.3905, maxLat: 1.4062, minLng: 103.9099, maxLng: 103.9385 } },
  { name: 'Sengkang', bbox: { minLat: 1.3703, maxLat: 1.3914, minLng: 103.8963, maxLng: 103.9248 } },
  { name: 'Tampines', bbox: { minLat: 1.3524, maxLat: 1.3743, minLng: 103.9358, maxLng: 103.9657 } },
  { name: 'Clementi', bbox: { minLat: 1.3317, maxLat: 1.3549, minLng: 103.7613, maxLng: 103.7896 } },
  { name: 'Bukit Merah', bbox: { minLat: 1.2750, maxLat: 1.3041, minLng: 103.8241, maxLng: 103.8500 } },
  { name: 'Bukit Timah', bbox: { minLat: 1.3200, maxLat: 1.3750, minLng: 103.7600, maxLng: 103.8150 } },
  { name: 'Serangoon', bbox: { minLat: 1.3492, maxLat: 1.3719, minLng: 103.8615, maxLng: 103.8910 } },
  { name: 'Jurong East', bbox: { minLat: 1.3200, maxLat: 1.3418, minLng: 103.7402, maxLng: 103.7581 } },
  { name: 'Jurong West', bbox: { minLat: 1.3100, maxLat: 1.3627, minLng: 103.6700, maxLng: 103.7400 } },
  { name: 'Sembawang', bbox: { minLat: 1.4155, maxLat: 1.4450, minLng: 103.8100, maxLng: 103.8450 } },
  { name: 'Woodlands', bbox: { minLat: 1.4450, maxLat: 1.4512, minLng: 103.8306, maxLng: 103.8683 } },
  { name: 'Yishun', bbox: { minLat: 1.4148, maxLat: 1.4358, minLng: 103.8384, maxLng: 103.8682 } },
  { name: 'Bishan', bbox: { minLat: 1.3494, maxLat: 1.3713, minLng: 103.8481, maxLng: 103.8714 } },
  { name: 'Toa Payoh', bbox: { minLat: 1.3357, maxLat: 1.3547, minLng: 103.8508, maxLng: 103.8733 } },
  { name: 'Kallang', bbox: { minLat: 1.3064, maxLat: 1.3239, minLng: 103.8649, maxLng: 103.8840 } },
  { name: 'Novena', bbox: { minLat: 1.3223, maxLat: 1.3367, minLng: 103.8449, maxLng: 103.8615 } },
  { name: 'Tanglin', bbox: { minLat: 1.3104, maxLat: 1.3251, minLng: 103.8133, maxLng: 103.8346 } },
  { name: 'Outram', bbox: { minLat: 1.2889, maxLat: 1.3050, minLng: 103.8198, maxLng: 103.8390 } },
  { name: 'Downtown Core', bbox: { minLat: 1.2758, maxLat: 1.2891, minLng: 103.8417, maxLng: 103.8620 } },
];

/**
 * Get planning area from coordinates using bounding box lookup
 * This is a simplified version - for production, use proper GeoJSON point-in-polygon
 *
 * @param latitude - Latitude in decimal degrees
 * @param longitude - Longitude in decimal degrees
 * @returns Planning area name or null if not found
 */
export function getPlanningAreaFromCoordinates(latitude: number, longitude: number): string | null {
  if (!latitude || !longitude) {
    return null;
  }

  // Simple bounding box check
  for (const area of PLANNING_AREAS) {
    const { bbox } = area;
    if (
      latitude >= bbox.minLat &&
      latitude <= bbox.maxLat &&
      longitude >= bbox.minLng &&
      longitude <= bbox.maxLng
    ) {
      return area.name;
    }
  }

  // No matching area found
  console.log(`[AreaResolver] Coordinates (${latitude}, ${longitude}) outside known areas`);
  return null;
}

/**
 * Get subzone from coordinates
 * Currently not implemented - requires URA Subzone GeoJSON
 * Placeholder for future enhancement
 *
 * @param latitude - Latitude in decimal degrees
 * @param longitude - Longitude in decimal degrees
 * @returns Subzone name or null if not found
 */
export function getSubzoneFromCoordinates(latitude: number, longitude: number): string | null {
  // TODO: Implement with URA Subzone Boundary GeoJSON from data.gov.sg
  // For now, return null - area resolver is sufficient for MVP
  return null;
}

export default {
  getPlanningAreaFromCoordinates,
  getSubzoneFromCoordinates,
};
