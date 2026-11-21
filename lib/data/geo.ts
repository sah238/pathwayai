import type { DmvState } from "./constants";

/**
 * Beta stand-in for ZIP → metro matching (metro wages and zip_cbsa.json are
 * deferred). Maps a ZIP code to DC, MD or VA by its 3-digit USPS prefix:
 * DC 200, 202–205; MD 206–219; VA 201, 220–246. Returns null for a malformed
 * ZIP or one outside the region.
 */
export function zipToState(zip: string): DmvState | null {
  const match = /^(\d{3})\d{2}(-\d{4})?$/.exec(zip.trim());
  if (!match) return null;
  const prefix = Number(match[1]);
  if (prefix === 200 || (prefix >= 202 && prefix <= 205)) return "DC";
  if (prefix >= 206 && prefix <= 219) return "MD";
  if (prefix === 201 || (prefix >= 220 && prefix <= 246)) return "VA";
  return null;
}
