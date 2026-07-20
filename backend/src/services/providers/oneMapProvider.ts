import axios from 'axios';
import { getPlanningAreaFromPostalCode } from '../postalCodeToAreaLookup.js';
import type { AddressLookupResult } from './addressProvider.js';

function titleCase(s: string): string {
  return s.toLowerCase().replace(/\b([a-z])/g, (_m, c) => c.toUpperCase());
}

/**
 * Look up a Singapore postal code via OneMap (SLA, free, no API key).
 * Returns the real block + road address, e.g. "433 Choa Chu Kang Avenue 4, Singapore 680433".
 */
export async function queryOneMap(postalCode: string): Promise<AddressLookupResult | null> {
  try {
    const url = `https://www.onemap.gov.sg/api/common/elastic/search?searchVal=${postalCode}&returnGeom=Y&getAddrDetails=Y&pageNum=1`;
    const resp = await axios.get(url, { timeout: 8000 });
    const results = resp.data?.results;
    if (!Array.isArray(results) || results.length === 0) return null;

    // Require an exact postal-code match (OneMap can return nearby buildings)
    const r = results.find((x: any) => x.POSTAL === postalCode);
    if (!r) return null;

    const blk = r.BLK_NO && r.BLK_NO !== 'NIL' ? String(r.BLK_NO).trim() : '';
    const road = r.ROAD_NAME && r.ROAD_NAME !== 'NIL' ? titleCase(String(r.ROAD_NAME)) : '';
    const street = `${blk}${blk && road ? ' ' : ''}${road}`.trim();
    const formatted = `${street}${street ? ', ' : ''}Singapore ${postalCode}`;

    return {
      postal_code: postalCode,
      formatted_address: formatted,
      area: getPlanningAreaFromPostalCode(postalCode) || undefined,
      latitude: parseFloat(r.LATITUDE) || 0,
      longitude: parseFloat(r.LONGITUDE) || 0,
      provider: 'onemap',
      confidence: 0.98,
    };
  } catch (err) {
    console.warn('[OneMap] lookup failed:', (err as Error).message);
    return null;
  }
}
