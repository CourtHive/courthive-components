/**
 * Event Card — Type Definitions
 *
 * Flat data + JSON-serializable config consumed by buildEventCard.
 */

import { CourtSport } from '../courts/courtSvgUtil';

// ============================================================================
// Status Pill
// ============================================================================

export type EventStatusKind =
  | 'cancelled'
  | 'completed'
  | 'live'
  | 'drawing'
  | 'entries-open'
  | 'upcoming';

export interface EventStatusPill {
  kind: EventStatusKind;
  label: string;
}

// ============================================================================
// MatchUp Counts (skipped in lightMode)
// ============================================================================

export interface EventMatchUpCounts {
  total: number;
  completed: number;
  scheduled: number;
  inProgress: number;
}

// ============================================================================
// Card Data
// ============================================================================

export type EventTypeKind = 'SINGLES' | 'DOUBLES' | 'TEAM' | 'HYBRID';
export type EventGenderKind = 'MALE' | 'FEMALE' | 'MIXED';

export interface EventCardData {
  eventId: string;
  eventName: string;
  eventAbbreviation?: string;
  /** Human label derived from event.category (name / age range / code). */
  categoryLabel?: string;
  /** Normalized event type for badge styling. */
  eventType?: EventTypeKind;
  /** Normalized gender for badge styling. */
  gender?: EventGenderKind;
  drawCount?: number;
  /** Short summary like "32 SE" or "16 RR + Playoff". */
  drawSummary?: string;
  entryCount?: number;
  /** undefined in lightMode (caller skipped the matchUp walk). */
  matchUpCounts?: EventMatchUpCounts;
  startDate?: string;
  endDate?: string;
  dateRangeFormatted?: string;
  status?: EventStatusPill | null;
  eventImageURL?: string;
  courtSvgSport?: CourtSport;
  updatedAt?: string;
}

// ============================================================================
// Card Config
// ============================================================================

export type EventCardField =
  | 'title'
  | 'categoryLabel'
  | 'drawSummary'
  | 'dateRange'
  | 'playerCount'
  | 'matchUpProgress'
  | 'updatedAt';

export type EventCardCornerField = 'status' | 'eventTypeBadge' | 'genderBadge';

export interface EventCardConfig {
  showImage?: boolean;
  cornerBadges: EventCardCornerField[];
  body: EventCardField[];
  footer: EventCardField[];
}

// ============================================================================
// Callbacks
// ============================================================================

export interface EventCardCallbacks {
  onClick?: (data: EventCardData) => void;
}
