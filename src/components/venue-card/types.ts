/**
 * Venue Card — Type Definitions
 *
 * Flat data + JSON-serializable config consumed by buildVenueCard.
 * Mirrors the tournament-card / event-card pattern.
 */

import { CourtSport } from '../courts/courtSvgUtil';

// ============================================================================
// Card Data
// ============================================================================

export interface VenueCardData {
  venueId: string;
  venueName: string;
  venueAbbreviation?: string;
  /** Pre-formatted "City, REGION, Country" */
  addressFormatted?: string;
  /** GPS coordinates — when present, the image zone renders a map by default. */
  latitude?: number;
  longitude?: number;
  /** Number of courts attached to this venue. */
  courtCount?: number;
  /** Pre-formatted "6 outdoor hard, 2 indoor" string. */
  courtBreakdown?: string;
  /** Subset signals for the amenity row. */
  indoorCount?: number;
  outdoorCount?: number;
  floodlitCount?: number;
  /** True when this is the primary/default venue for its parent tournament. */
  isPrimary?: boolean;
  /** Hosted image URL (preferred over map / court-SVG fallback). */
  venueImageURL?: string;
  /** Sport identifier for the court-SVG fallback (caller supplies). */
  courtSvgSport?: CourtSport;
  /** Free-form notes (rendered as title tooltip on the venue name). */
  notes?: string;
}

// ============================================================================
// Card Config
// ============================================================================

export type VenueCardField =
  | 'title'
  | 'address'
  | 'courtBreakdown'
  | 'amenityRow'
  | 'venueAbbreviation';

export type VenueCardCornerField = 'primaryBadge';

export interface VenueCardConfig {
  /** Whether to render the image zone. Defaults to true. */
  showImage?: boolean;
  /** Whether to use OSM map preview when venue has lat/lng. Defaults to true. */
  showMap?: boolean;
  /** Corner badges anchored over the image. */
  cornerBadges: VenueCardCornerField[];
  /** Body fields (rendered in order). */
  body: VenueCardField[];
  /** Footer fields. */
  footer: VenueCardField[];
}

// ============================================================================
// Callbacks
// ============================================================================

export interface VenueCardCallbacks {
  onClick?: (data: VenueCardData) => void;
}
