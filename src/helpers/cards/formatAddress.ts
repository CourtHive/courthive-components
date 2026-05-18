/**
 * Pure address/location formatter shared by tournament-card, event-card, venue-card.
 *
 * Accepts a TODS venue-like shape (with `addresses[]`) or a flat address object.
 * Returns "City, REGION, COUNTRY" when fields are present; falls back to
 * `venueName` if the address lacks geographic parts; returns undefined otherwise.
 */

import { CardAddress, CardVenueLike } from './types';

function joinAddressParts(address: CardAddress): string {
  const parts: string[] = [];
  if (address.city) parts.push(address.city);
  if (address.state || address.region) parts.push((address.state || address.region) as string);
  if (address.countryCode) parts.push(address.countryCode);
  else if (address.country) parts.push(address.country);
  return parts.join(', ');
}

export function formatAddress(address?: CardAddress | null): string | undefined {
  if (!address) return undefined;
  const joined = joinAddressParts(address);
  return joined.length ? joined : undefined;
}

export function formatVenueLocation(venues?: CardVenueLike[] | null): string | undefined {
  const venue = venues?.find(Boolean);
  if (!venue) return undefined;
  const address = venue.addresses?.find(Boolean);
  return address ? formatAddress(address) ?? venue.venueName : venue.venueName;
}
