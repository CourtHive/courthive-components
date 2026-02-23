/**
 * Shared test data for Scheduling Profile stories.
 *
 * Mirrors the vanilla prototype data for consistency.
 */

import type {
  VenueInfo,
  CatalogRoundItem,
  SchedulingProfile,
  TemporalAdapter,
  SchedulingProfileConfig,
} from '../../components/scheduling-profile';

// ============================================================================
// Shared Constants
// ============================================================================

const BOYS_SINGLES = 'Boys U16 Singles';
const GIRLS_SINGLES = 'Girls U16 Singles';
const BOYS_DOUBLES = 'Boys U16 Doubles';
const DATE_1 = '2026-06-15';
const DATE_2 = '2026-06-16';
const DATE_3 = '2026-06-17';

// ============================================================================
// Venues
// ============================================================================

export const VENUES: VenueInfo[] = [
  { venueId: 'VENUE_A', name: 'Main Stadium' },
  { venueId: 'VENUE_B', name: 'Practice Center' },
  { venueId: 'VENUE_C', name: 'Outdoor Complex' },
];

export const VENUES_SINGLE: VenueInfo[] = [
  { venueId: 'VENUE_A', name: 'Main Stadium' },
];

// ============================================================================
// Round Catalog
// ============================================================================

export const ROUND_CATALOG: CatalogRoundItem[] = [
  // Event 1: Boys U16 Singles
  { tournamentId: 'T1', eventId: 'E_MS_U16', eventName: BOYS_SINGLES, drawId: 'D1_MAIN', drawName: 'Main', structureId: 'S1', roundNumber: 5, roundName: 'R32', matchCountEstimate: 16 },
  { tournamentId: 'T1', eventId: 'E_MS_U16', eventName: BOYS_SINGLES, drawId: 'D1_MAIN', drawName: 'Main', structureId: 'S1', roundNumber: 6, roundName: 'R16', matchCountEstimate: 8 },
  { tournamentId: 'T1', eventId: 'E_MS_U16', eventName: BOYS_SINGLES, drawId: 'D1_MAIN', drawName: 'Main', structureId: 'S1', roundNumber: 7, roundName: 'QF', matchCountEstimate: 4 },
  { tournamentId: 'T1', eventId: 'E_MS_U16', eventName: BOYS_SINGLES, drawId: 'D1_MAIN', drawName: 'Main', structureId: 'S1', roundNumber: 8, roundName: 'SF', matchCountEstimate: 2 },
  { tournamentId: 'T1', eventId: 'E_MS_U16', eventName: BOYS_SINGLES, drawId: 'D1_MAIN', drawName: 'Main', structureId: 'S1', roundNumber: 9, roundName: 'F', matchCountEstimate: 1 },

  { tournamentId: 'T1', eventId: 'E_MS_U16', eventName: BOYS_SINGLES, drawId: 'D1_CONS', drawName: 'Consolation', structureId: 'S2', roundNumber: 3, roundName: 'R16', matchCountEstimate: 8 },
  { tournamentId: 'T1', eventId: 'E_MS_U16', eventName: BOYS_SINGLES, drawId: 'D1_CONS', drawName: 'Consolation', structureId: 'S2', roundNumber: 4, roundName: 'QF', matchCountEstimate: 4 },
  { tournamentId: 'T1', eventId: 'E_MS_U16', eventName: BOYS_SINGLES, drawId: 'D1_CONS', drawName: 'Consolation', structureId: 'S2', roundNumber: 5, roundName: 'SF', matchCountEstimate: 2 },
  { tournamentId: 'T1', eventId: 'E_MS_U16', eventName: BOYS_SINGLES, drawId: 'D1_CONS', drawName: 'Consolation', structureId: 'S2', roundNumber: 6, roundName: 'F', matchCountEstimate: 1 },

  // Event 2: Girls U16 Singles
  { tournamentId: 'T1', eventId: 'E_WS_U16', eventName: GIRLS_SINGLES, drawId: 'D2_MAIN', drawName: 'Main', structureId: 'S3', roundNumber: 5, roundName: 'R32', matchCountEstimate: 16 },
  { tournamentId: 'T1', eventId: 'E_WS_U16', eventName: GIRLS_SINGLES, drawId: 'D2_MAIN', drawName: 'Main', structureId: 'S3', roundNumber: 6, roundName: 'R16', matchCountEstimate: 8 },
  { tournamentId: 'T1', eventId: 'E_WS_U16', eventName: GIRLS_SINGLES, drawId: 'D2_MAIN', drawName: 'Main', structureId: 'S3', roundNumber: 7, roundName: 'QF', matchCountEstimate: 4 },
  { tournamentId: 'T1', eventId: 'E_WS_U16', eventName: GIRLS_SINGLES, drawId: 'D2_MAIN', drawName: 'Main', structureId: 'S3', roundNumber: 8, roundName: 'SF', matchCountEstimate: 2 },
  { tournamentId: 'T1', eventId: 'E_WS_U16', eventName: GIRLS_SINGLES, drawId: 'D2_MAIN', drawName: 'Main', structureId: 'S3', roundNumber: 9, roundName: 'F', matchCountEstimate: 1 },

  // Event 3: Boys U16 Doubles
  { tournamentId: 'T1', eventId: 'E_MD_U16', eventName: BOYS_DOUBLES, drawId: 'D3_MAIN', drawName: 'Main', structureId: 'S4', roundNumber: 4, roundName: 'R16', matchCountEstimate: 8 },
  { tournamentId: 'T1', eventId: 'E_MD_U16', eventName: BOYS_DOUBLES, drawId: 'D3_MAIN', drawName: 'Main', structureId: 'S4', roundNumber: 5, roundName: 'QF', matchCountEstimate: 4 },
  { tournamentId: 'T1', eventId: 'E_MD_U16', eventName: BOYS_DOUBLES, drawId: 'D3_MAIN', drawName: 'Main', structureId: 'S4', roundNumber: 6, roundName: 'SF', matchCountEstimate: 2 },
  { tournamentId: 'T1', eventId: 'E_MD_U16', eventName: BOYS_DOUBLES, drawId: 'D3_MAIN', drawName: 'Main', structureId: 'S4', roundNumber: 7, roundName: 'F', matchCountEstimate: 1 },
];

// ============================================================================
// Schedulable Dates
// ============================================================================

export const DATES = [DATE_1, DATE_2, DATE_3];

export const DATES_EXTENDED = [
  DATE_1, DATE_2, DATE_3,
  '2026-06-18', '2026-06-19', '2026-06-20', '2026-06-21',
];

// ============================================================================
// Temporal Adapters
// ============================================================================

export function makeTemporalAdapter(schedulable: string[]): TemporalAdapter {
  return {
    isDateAvailable: (date: string) =>
      schedulable.includes(date)
        ? { ok: true }
        : { ok: false, reason: 'Not schedulable' },
  };
}

// ============================================================================
// Pre-built Profiles
// ============================================================================

/** Empty profile — nothing scheduled yet. */
export const EMPTY_PROFILE: SchedulingProfile = [];

/** Valid profile — correctly ordered rounds across dates. */
export const VALID_PROFILE: SchedulingProfile = [
  {
    scheduleDate: DATE_1,
    venues: [
      {
        venueId: 'VENUE_A',
        rounds: [
          { tournamentId: 'T1', eventId: 'E_MS_U16', eventName: BOYS_SINGLES, drawId: 'D1_MAIN', structureId: 'S1', roundNumber: 5, roundName: 'R32', sortOrder: 1 },
          { tournamentId: 'T1', eventId: 'E_WS_U16', eventName: GIRLS_SINGLES, drawId: 'D2_MAIN', structureId: 'S3', roundNumber: 5, roundName: 'R32', sortOrder: 2 },
        ],
      },
      {
        venueId: 'VENUE_B',
        rounds: [
          { tournamentId: 'T1', eventId: 'E_MD_U16', eventName: BOYS_DOUBLES, drawId: 'D3_MAIN', structureId: 'S4', roundNumber: 4, roundName: 'R16', sortOrder: 1 },
        ],
      },
      { venueId: 'VENUE_C', rounds: [] },
    ],
  },
  {
    scheduleDate: DATE_2,
    venues: [
      {
        venueId: 'VENUE_A',
        rounds: [
          { tournamentId: 'T1', eventId: 'E_MS_U16', eventName: BOYS_SINGLES, drawId: 'D1_MAIN', structureId: 'S1', roundNumber: 6, roundName: 'R16', sortOrder: 1 },
          { tournamentId: 'T1', eventId: 'E_WS_U16', eventName: GIRLS_SINGLES, drawId: 'D2_MAIN', structureId: 'S3', roundNumber: 6, roundName: 'R16', sortOrder: 2 },
        ],
      },
      {
        venueId: 'VENUE_B',
        rounds: [
          { tournamentId: 'T1', eventId: 'E_MD_U16', eventName: BOYS_DOUBLES, drawId: 'D3_MAIN', structureId: 'S4', roundNumber: 5, roundName: 'QF', sortOrder: 1 },
        ],
      },
      { venueId: 'VENUE_C', rounds: [] },
    ],
  },
  {
    scheduleDate: DATE_3,
    venues: [
      {
        venueId: 'VENUE_A',
        rounds: [
          { tournamentId: 'T1', eventId: 'E_MS_U16', eventName: BOYS_SINGLES, drawId: 'D1_MAIN', structureId: 'S1', roundNumber: 7, roundName: 'QF', sortOrder: 1 },
        ],
      },
      { venueId: 'VENUE_B', rounds: [] },
      { venueId: 'VENUE_C', rounds: [] },
    ],
  },
];

/** Profile with intentional errors — precedence violation and duplicate. */
export const ERROR_PROFILE: SchedulingProfile = [
  {
    scheduleDate: DATE_1,
    venues: [
      {
        venueId: 'VENUE_A',
        rounds: [
          // Precedence violation: R16 before R32 in same draw
          { tournamentId: 'T1', eventId: 'E_MS_U16', eventName: BOYS_SINGLES, drawId: 'D1_MAIN', structureId: 'S1', roundNumber: 6, roundName: 'R16', sortOrder: 1 },
          { tournamentId: 'T1', eventId: 'E_MS_U16', eventName: BOYS_SINGLES, drawId: 'D1_MAIN', structureId: 'S1', roundNumber: 5, roundName: 'R32', roundSegment: { segmentNumber: 2, segmentsCount: 2 }, sortOrder: 2 },
        ],
      },
      {
        venueId: 'VENUE_B',
        rounds: [
          // Duplicate: same round as VENUE_A index 0
          { tournamentId: 'T1', eventId: 'E_MS_U16', eventName: BOYS_SINGLES, drawId: 'D1_MAIN', structureId: 'S1', roundNumber: 6, roundName: 'R16', sortOrder: 1 },
        ],
      },
      { venueId: 'VENUE_C', rounds: [] },
    ],
  },
  {
    scheduleDate: DATE_2,
    venues: [
      { venueId: 'VENUE_A', rounds: [] },
      { venueId: 'VENUE_B', rounds: [] },
      { venueId: 'VENUE_C', rounds: [] },
    ],
  },
  {
    scheduleDate: DATE_3,
    venues: [
      { venueId: 'VENUE_A', rounds: [] },
      { venueId: 'VENUE_B', rounds: [] },
      { venueId: 'VENUE_C', rounds: [] },
    ],
  },
];

// ============================================================================
// Pre-built Configs
// ============================================================================

export function makeBaseConfig(overrides: Partial<SchedulingProfileConfig> = {}): SchedulingProfileConfig {
  return {
    venues: VENUES,
    roundCatalog: ROUND_CATALOG,
    schedulableDates: DATES,
    venueOrder: VENUES.map((v) => v.venueId),
    temporalAdapter: makeTemporalAdapter(DATES),
    ...overrides,
  };
}
