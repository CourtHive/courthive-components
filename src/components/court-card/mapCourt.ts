/**
 * Court Card — Data Mapper
 *
 * Pure function: TODS court record -> flat CourtCardData.
 * Caller passes the parent tournament's resolved sport for the court-SVG fallback.
 */

import { CourtSport } from '../courts/courtSvgUtil';
import { CourtCardData } from './types';

const INDOOR = 'INDOOR';
const OUTDOOR = 'OUTDOOR';

function normalizeIndoorOutdoor(raw: string | undefined): 'INDOOR' | 'OUTDOOR' | undefined {
  if (!raw) return undefined;
  const upper = String(raw).toUpperCase();
  if (upper === INDOOR) return INDOOR;
  if (upper === OUTDOOR) return OUTDOOR;
  return undefined;
}

function formatSurfaceLabel(indoorOutdoor: string | undefined, surfaceCategory: string | undefined): string | undefined {
  const parts: string[] = [];
  if (indoorOutdoor) parts.push(indoorOutdoor.charAt(0) + indoorOutdoor.slice(1).toLowerCase());
  if (surfaceCategory) parts.push(surfaceCategory.charAt(0) + surfaceCategory.slice(1).toLowerCase());
  return parts.length ? parts.join(' · ') : undefined;
}

export interface MapCourtOptions {
  /** Parent tournament's resolved sport — used for the court-SVG fallback. */
  sport?: CourtSport;
}

export function mapCourtToCardData(court: any, options?: MapCourtOptions): CourtCardData {
  const indoorOutdoor = normalizeIndoorOutdoor(court?.indoorOutdoor);
  const surfaceCategory = court?.surfaceCategory ? String(court.surfaceCategory).toUpperCase() : undefined;

  return {
    courtId: court?.courtId ?? '',
    courtName: court?.courtName ?? '',
    courtAbbreviation: court?.courtAbbreviation,
    surfaceLabel: formatSurfaceLabel(indoorOutdoor, surfaceCategory),
    indoorOutdoor,
    surfaceCategory,
    floodlit: !!court?.floodlit,
    courtSvgSport: options?.sport,
    notes: court?.notes
  };
}
