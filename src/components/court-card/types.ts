/**
 * Court Card — Type Definitions
 *
 * Flat data + JSON-serializable config consumed by buildCourtCard.
 */

import { CourtSport } from '../courts/courtSvgUtil';

export interface CourtCardData {
  courtId: string;
  courtName: string;
  courtAbbreviation?: string;
  /** Pre-formatted "Outdoor • Hard" string. */
  surfaceLabel?: string;
  /** Indoor / outdoor / undefined (unknown). */
  indoorOutdoor?: 'INDOOR' | 'OUTDOOR';
  /** Surface category (HARD/CLAY/GRASS/CARPET/...) — raw upper-case. */
  surfaceCategory?: string;
  /** True when the court has floodlights — drives the lit-pip badge. */
  floodlit?: boolean;
  /** Available hours/minutes today (optional summary). */
  availabilitySummary?: string;
  /** Sport identifier for the court-SVG image fallback. */
  courtSvgSport?: CourtSport;
  /** Free-form notes (rendered as title tooltip on the court name). */
  notes?: string;
}

export type CourtCardField =
  | 'title'
  | 'surface'
  | 'amenityRow'
  | 'availability'
  | 'abbreviation';

export type CourtCardCornerField = 'indoorOutdoor' | 'floodlit';

export interface CourtCardConfig {
  showImage?: boolean;
  cornerBadges: CourtCardCornerField[];
  body: CourtCardField[];
  footer: CourtCardField[];
}

export interface CourtCardCallbacks {
  onClick?: (data: CourtCardData) => void;
}
