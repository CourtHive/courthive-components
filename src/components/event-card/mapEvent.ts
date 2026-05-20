/**
 * Event Card — Data Mapper
 *
 * Pure function: TODS event record -> flat EventCardData.
 * Caller decides whether to walk matchUps (`lightMode: true` skips it).
 */

import { extractCourtSvgSport, extractImageURL, formatDateRange } from '../../helpers/cards';
import { EventCardData, EventGenderKind, EventMatchUpCounts, EventStatusPill, EventTypeKind } from './types';
import { resolveEventStatus } from './statusResolver';
import { CourtSport } from '../courts/courtSvgUtil';

const EVENT_IMAGE_RESOURCE_NAME = 'eventImage';
const DRAFT_STATE_EXTENSION = 'DRAFT_STATE';

// ============================================================================
// Field normalization
// ============================================================================

function normalizeEventType(raw: string | undefined): EventTypeKind | undefined {
  if (!raw) return undefined;
  const upper = String(raw).toUpperCase();
  if (upper === 'SINGLES' || upper === 'DOUBLES' || upper === 'TEAM' || upper === 'HYBRID') return upper;
  return undefined;
}

function normalizeGender(raw: string | undefined): EventGenderKind | undefined {
  if (!raw) return undefined;
  const upper = String(raw).toUpperCase();
  if (upper === 'M' || upper === 'MALE') return 'MALE';
  if (upper === 'F' || upper === 'FEMALE') return 'FEMALE';
  if (upper === 'MIXED' || upper === 'X') return 'MIXED';
  return undefined;
}

function deriveCategoryLabel(category: any): string | undefined {
  if (!category) return undefined;
  const name = cleanLabel(category.categoryName);
  if (name) return name;
  if (typeof category.ageMin === 'number' && typeof category.ageMax === 'number') {
    if (category.ageMin === category.ageMax) return `Age ${category.ageMin}`;
    return `Age ${category.ageMin}–${category.ageMax}`;
  }
  const code = cleanLabel(category.ageCategoryCode);
  if (code) return code;
  if (category.ratingMin && category.ratingMax) return `Rating ${category.ratingMin}–${category.ratingMax}`;
  return undefined;
}

/**
 * Returns the trimmed value, or undefined if the input is empty or a
 * dashes-only placeholder (e.g. the `------------` "no selection" option
 * exposed by some TMX dropdowns).
 */
function cleanLabel(value: any): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (/^[-—–_]+$/.test(trimmed)) return undefined;
  return trimmed;
}

// ============================================================================
// Draw summary
// ============================================================================

function deriveDrawSummary(drawDefinitions: any[]): string | undefined {
  if (!drawDefinitions.length) return undefined;
  const first = drawDefinitions.find(Boolean);
  if (!first) return undefined;
  const parts: string[] = [];
  if (typeof first.drawSize === 'number') parts.push(String(first.drawSize));
  if (first.drawType) parts.push(String(first.drawType));
  if (drawDefinitions.length > 1) parts.push(`+${drawDefinitions.length - 1}`);
  return parts.length ? parts.join(' ') : undefined;
}

// ============================================================================
// MatchUp walk (only when not lightMode)
// ============================================================================

function walkMatchUps(drawDefinitions: any[]): EventMatchUpCounts {
  let total = 0;
  let completed = 0;
  let scheduled = 0;
  let inProgress = 0;
  for (const draw of drawDefinitions) {
    for (const structure of draw?.structures ?? []) {
      for (const matchUp of structure?.matchUps ?? []) {
        total += 1;
        if (matchUp?.winningSide) completed += 1;
        else if (matchUp?.schedule?.scheduledTime) scheduled += 1;
        if (matchUp?.matchUpStatus === 'IN_PROGRESS') inProgress += 1;
      }
    }
  }
  return { total, completed, scheduled, inProgress };
}

// ============================================================================
// Draft-state detection
// ============================================================================

function hasDraftStateExtension(draw: any): boolean {
  const extensions = draw?.extensions;
  if (!Array.isArray(extensions)) return false;
  return extensions.some((ext: any) => ext?.name === DRAFT_STATE_EXTENSION);
}

function hasSeedsOnlyDraw(drawDefinitions: any[]): boolean {
  return drawDefinitions.some(
    (d) => d?.automated?.seedsOnly === true || hasDraftStateExtension(d)
  );
}

function allDrawsCancelled(drawDefinitions: any[]): boolean {
  if (drawDefinitions.length === 0) return false;
  return drawDefinitions.every((d) => d?.drawStatus === 'CANCELLED');
}

// ============================================================================
// Entry count (accepted entries)
// ============================================================================

const ACCEPTED_ENTRY_STATUSES = new Set([
  'DIRECT_ACCEPTANCE',
  'DA',
  'DIRECT_CONFIRMED',
  'DC',
  'ACCEPTED',
  'A',
  'ENTERED',
  'PE',
  'QUALIFIER',
  'Q',
  'WILDCARD',
  'WC'
]);

function countAcceptedEntries(entries: any[]): number {
  if (!entries.length) return 0;
  let n = 0;
  for (const e of entries) {
    if (ACCEPTED_ENTRY_STATUSES.has(String(e?.entryStatus))) n += 1;
  }
  return n;
}

// ============================================================================
// Main mapper
// ============================================================================

export interface MapEventOptions {
  /** Skip matchUp walk for large event counts (TMX uses threshold 15). */
  lightMode?: boolean;
  /** Override match counts (caller fetched via factory engine). */
  matchUpStats?: EventMatchUpCounts;
  /** Parent tournament's resolved sport — used for court-SVG fallback. */
  sport?: CourtSport;
  now?: Date;
  /** Override the resolved status. */
  statusOverride?: EventStatusPill | null;
}

export function mapEventToCardData(event: any, options?: MapEventOptions): EventCardData {
  const drawDefinitions: any[] = Array.isArray(event?.drawDefinitions) ? event.drawDefinitions : [];
  const entries: any[] = Array.isArray(event?.entries) ? event.entries : [];
  const resources = Array.isArray(event?.onlineResources) ? event.onlineResources : undefined;

  const matchUpCounts =
    options?.matchUpStats ??
    (options?.lightMode ? undefined : walkMatchUps(drawDefinitions));

  const status =
    options?.statusOverride !== undefined
      ? options.statusOverride
      : resolveEventStatus(
          {
            allDrawsCancelled: allDrawsCancelled(drawDefinitions),
            drawCount: drawDefinitions.length,
            entryCount: countAcceptedEntries(entries),
            startDate: event?.startDate,
            endDate: event?.endDate,
            matchUpCounts,
            hasDraftState: drawDefinitions.some(hasDraftStateExtension),
            hasSeedsOnlyDraw: hasSeedsOnlyDraw(drawDefinitions)
          },
          options?.now
        );

  return {
    eventId: event?.eventId ?? '',
    eventName: event?.eventName ?? '',
    eventAbbreviation: event?.eventAbbreviation,
    categoryLabel: deriveCategoryLabel(event?.category),
    eventType: normalizeEventType(event?.eventType),
    gender: normalizeGender(event?.gender),
    drawCount: drawDefinitions.length || undefined,
    drawSummary: deriveDrawSummary(drawDefinitions),
    entryCount: countAcceptedEntries(entries) || undefined,
    matchUpCounts,
    startDate: event?.startDate,
    endDate: event?.endDate,
    dateRangeFormatted: formatDateRange(event?.startDate, event?.endDate),
    status,
    eventImageURL: event?.eventImageURL ?? extractImageURL(resources, EVENT_IMAGE_RESOURCE_NAME),
    courtSvgSport: (event?.courtSvgSport ?? extractCourtSvgSport(resources) ?? options?.sport) as
      | CourtSport
      | undefined,
    updatedAt: event?.updatedAt
  };
}
