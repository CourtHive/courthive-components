/**
 * Venue Card — Data Mapper
 *
 * Pure function: TODS venue record -> flat VenueCardData.
 * Caller passes the parent tournament's resolved sport for the court-SVG fallback.
 */

import { extractCourtSvgSport, extractImageURL, formatAddress } from '../../helpers/cards';
import { CourtSport } from '../courts/courtSvgUtil';
import { VenueCardData } from './types';

const VENUE_IMAGE_RESOURCE_NAME = 'venueImage';

interface CourtLike {
  indoorOutdoor?: string;
  surfaceCategory?: string;
  surfaceType?: string;
  floodlit?: boolean;
}

function describeCourt(court: CourtLike): string {
  const parts: string[] = [];
  if (court.indoorOutdoor) parts.push(court.indoorOutdoor.toLowerCase());
  if (court.surfaceCategory) parts.push(court.surfaceCategory.toLowerCase());
  return parts.length ? parts.join(' ') : 'court';
}

function summarizeCourts(courts: CourtLike[]): string | undefined {
  if (!courts.length) return undefined;
  const counts = new Map<string, number>();
  for (const court of courts) {
    const key = describeCourt(court);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const entries = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  return entries.map(([label, count]) => `${count} ${label}`).join(', ');
}

function countWhere(courts: CourtLike[], predicate: (c: CourtLike) => boolean): number {
  let n = 0;
  for (const c of courts) if (predicate(c)) n += 1;
  return n;
}

export interface MapVenueOptions {
  /** Parent tournament's resolved sport — used for the court-SVG fallback. */
  sport?: CourtSport;
}

export function mapVenueToCardData(venue: any, options?: MapVenueOptions): VenueCardData {
  const courts: CourtLike[] = Array.isArray(venue?.courts) ? venue.courts : [];
  const resources = Array.isArray(venue?.onlineResources) ? venue.onlineResources : undefined;
  const address = venue?.addresses?.find((a: any) => a);

  return {
    venueId: venue?.venueId ?? '',
    venueName: venue?.venueName ?? '',
    venueAbbreviation: venue?.venueAbbreviation,
    addressFormatted: formatAddress(address),
    latitude: typeof address?.latitude === 'number' ? address.latitude : undefined,
    longitude: typeof address?.longitude === 'number' ? address.longitude : undefined,
    courtCount: courts.length || undefined,
    courtBreakdown: summarizeCourts(courts),
    indoorCount: countWhere(courts, (c) => c.indoorOutdoor === 'INDOOR') || undefined,
    outdoorCount: countWhere(courts, (c) => c.indoorOutdoor === 'OUTDOOR') || undefined,
    floodlitCount: countWhere(courts, (c) => !!c.floodlit) || undefined,
    isPrimary: !!venue?.isPrimary,
    venueImageURL: venue?.venueImageURL ?? extractImageURL(resources, VENUE_IMAGE_RESOURCE_NAME),
    courtSvgSport: (venue?.courtSvgSport ?? extractCourtSvgSport(resources) ?? options?.sport) as
      | CourtSport
      | undefined,
    notes: venue?.notes
  };
}
