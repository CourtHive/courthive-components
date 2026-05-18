/**
 * Shared types used by card primitives (tournament-card, event-card, venue-card).
 */

export interface CardOnlineResource {
  name?: string;
  resourceType?: string;
  resourceSubType?: string;
  url?: string;
  identifier?: string;
}

export interface CardAddress {
  city?: string;
  state?: string;
  region?: string;
  countryCode?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
}

export interface CardVenueLike {
  venueName?: string;
  venueAbbreviation?: string;
  addresses?: CardAddress[];
}
