/**
 * Tournament Card — Type Definitions
 *
 * Flat data + JSON-serializable config consumed by buildTournamentCard.
 * Mirrors the schedule-grid-cell pattern: zones + field arrays.
 */

import { CourtSport } from '../courts/courtSvgUtil';

// ============================================================================
// Status Pill
// ============================================================================

export type TournamentStatusKind =
  | 'cancelled'
  | 'completed'
  | 'live'
  | 'closing-soon'
  | 'registration-opens'
  | 'registration-open';

export interface TournamentStatusPill {
  kind: TournamentStatusKind;
  label: string;
}

// ============================================================================
// Entry Fee (mapper input shape)
// ============================================================================

export interface TournamentEntryFee {
  amount: number;
  currencyCode?: string;
  category?: string;
  eventType?: string;
}

// ============================================================================
// Card Data (factory matchUp-style flat shape)
// ============================================================================

export interface TournamentCardData {
  tournamentId: string;
  tournamentName: string;
  /** ISO date */
  startDate?: string;
  /** ISO date */
  endDate?: string;
  /** Pre-formatted date range (e.g. "May 22 – May 24, 2026"). Mapper provides; consumer may override. */
  dateRangeFormatted?: string;
  /** "City, REGION, Country" or similar — already formatted */
  location?: string;
  /** URL pointing to a hosted tournament image (preferred over court SVG). */
  tournamentImageURL?: string;
  /** Court sport identifier — used to render a court SVG when no URL image is present. */
  courtSvgSport?: CourtSport;
  /** Number of registered participants */
  participantCount?: number;
  /** Number of events (for table view; not in default card) */
  eventCount?: number;
  /** Organizer / club name (for table view; not in default card) */
  organizerName?: string;
  /** Pre-resolved status pill (mapper computes — consumer may override) */
  status?: TournamentStatusPill | null;
  /** Pre-formatted fee string (e.g. "USD $40 – $85") */
  feeFormatted?: string | null;
  /** ISO last-updated timestamp (for table view) */
  updatedAt?: string;
  /** When true, render an offline/local indicator */
  offline?: boolean;
}

// ============================================================================
// Card Config (JSON-serializable; persistable as provider extension)
// ============================================================================

export type TournamentCardField =
  | 'title'
  | 'location'
  | 'dateRange'
  | 'feeBadge'
  | 'playerCount'
  | 'eventCount'
  | 'organizerName'
  | 'updatedAt';

export type TournamentCardCornerField = 'status' | 'offline';

export interface TournamentCardConfig {
  /** Whether to render the image zone. Defaults to true. */
  showImage?: boolean;
  /** Corner badges anchored over the image (top-left). */
  cornerBadges: TournamentCardCornerField[];
  /** Body fields (rendered in order, between image and footer). */
  body: TournamentCardField[];
  /** Footer fields (rendered as a row at the bottom). */
  footer: TournamentCardField[];
}

// ============================================================================
// Card Callbacks
// ============================================================================

export interface TournamentCardCallbacks {
  onClick?: (data: TournamentCardData) => void;
}
