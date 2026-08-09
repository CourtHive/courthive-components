/**
 * Venue Locator — Data Mapper
 *
 * Pure function: TODS venue record -> flat VenueLocatorData.
 *
 * A TODS `Venue` from the factory (or the `Venue` emitted by courthive-facilities'
 * `GET /facilities/:facilityId/venue`) maps straight across. Coordinates come from the venue's
 * address; per-court geo is read when present but nothing populates it today.
 */

import { formatAddress } from '../../helpers/cards';
import { VenueLocatorCourt, VenueLocatorData } from './types';

function firstNumber(...values: unknown[]): number | undefined {
  for (const value of values) if (typeof value === 'number' && Number.isFinite(value)) return value;
  return undefined;
}

function mapCourt(court: any, index: number): VenueLocatorCourt {
  const indoorOutdoor = typeof court?.indoorOutdoor === 'string' ? court.indoorOutdoor.toUpperCase() : undefined;
  return {
    courtId: court?.courtId ?? `court-${index + 1}`,
    courtName: court?.courtName ?? `Court ${index + 1}`,
    indoorOutdoor: indoorOutdoor === 'INDOOR' || indoorOutdoor === 'OUTDOOR' ? indoorOutdoor : undefined,
    surfaceCategory: court?.surfaceCategory,
    floodlit: court?.floodlit,
    courtOrder: firstNumber(court?.courtOrder),
    latitude: firstNumber(court?.latitude),
    longitude: firstNumber(court?.longitude)
  };
}

export function mapVenueToLocatorData(venue: any): VenueLocatorData {
  const courts = Array.isArray(venue?.courts) ? venue.courts : [];
  const address = venue?.addresses?.find((a: any) => a);

  return {
    // '' rather than undefined for the identity fields, matching mapVenueToCardData's null-tolerance
    venueId: venue?.venueId ?? '',
    venueName: venue?.venueName ?? venue?.venueAbbreviation ?? '',
    venueAbbreviation: venue?.venueAbbreviation,
    addressFormatted: formatAddress(address),
    latitude: firstNumber(venue?.latitude, address?.latitude),
    longitude: firstNumber(venue?.longitude, address?.longitude),
    courts: courts.map(mapCourt),
    notes: venue?.notes
  };
}
