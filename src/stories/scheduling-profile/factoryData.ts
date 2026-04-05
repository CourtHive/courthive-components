/**
 * Factory-backed data helpers for Scheduling Profile stories.
 *
 * Generates a realistic multi-event tournament via mocksEngine and extracts
 * everything needed for SchedulingProfileConfig. Uses TemporalEngine for
 * real capacity data instead of stub adapters.
 */

import {
  mocksEngine,
  tournamentEngine,
  TemporalEngine,
  temporal,
  drawDefinitionConstants,
  eventConstants
} from 'tods-competition-factory';

import type {
  VenueInfo,
  CatalogRoundItem,
  SchedulingProfile,
  TemporalAdapter,
  DemandAdapter,
  DependencyAdapter,
  SchedulingProfileConfig,
  RoundProfile
} from '../../components/scheduling-profile';

const { calculateCapacityStats } = temporal;
const { FIRST_MATCH_LOSER_CONSOLATION } = drawDefinitionConstants;
const { DOUBLES } = eventConstants;

// ============================================================================
// Types
// ============================================================================

export interface FactorySetup {
  tournamentRecord: any;
  tournamentId: string;
  venues: VenueInfo[];
  roundCatalog: CatalogRoundItem[];
  schedulableDates: string[];
  startDate: string;
  endDate: string;
  engine: TemporalEngine;
  temporalAdapter: TemporalAdapter;
  demandAdapter: DemandAdapter;
  dependencyAdapter: DependencyAdapter;
  config: SchedulingProfileConfig;
}

export interface FactorySetupOptions {
  includeBookings?: boolean;
  venueCount?: number;
}

// ============================================================================
// Constants
// ============================================================================

const START_DATE = '2026-06-15';
const END_DATE = '2026-06-21';
const AVG_MATCH_MINUTES = 75;

const VENUE_PROFILES = [
  {
    venueId: 'venue-main-stadium',
    venueName: 'Main Stadium',
    venueAbbreviation: 'MS',
    courtsCount: 8,
    startTime: '08:00',
    endTime: '20:00'
  },
  {
    venueId: 'venue-practice-center',
    venueName: 'Practice Center',
    venueAbbreviation: 'PC',
    courtsCount: 4,
    startTime: '07:00',
    endTime: '21:00'
  },
  {
    venueId: 'venue-outdoor-complex',
    venueName: 'Outdoor Complex',
    venueAbbreviation: 'OC',
    courtsCount: 6,
    startTime: '08:00',
    endTime: '19:00'
  }
];

const EVENT_PROFILES = [
  {
    eventName: 'Boys U16 Singles',
    category: { categoryName: 'U16' },
    gender: 'MALE',
    drawProfiles: [{ drawSize: 32, drawType: FIRST_MATCH_LOSER_CONSOLATION }]
  },
  {
    eventName: 'Girls U16 Singles',
    category: { categoryName: 'U16' },
    gender: 'FEMALE',
    drawProfiles: [{ drawSize: 32 }]
  },
  {
    eventName: 'Boys U16 Doubles',
    eventType: DOUBLES,
    category: { categoryName: 'U16' },
    gender: 'MALE',
    drawProfiles: [{ drawSize: 16 }]
  }
];

// ============================================================================
// Date Helpers
// ============================================================================

function dateRange(start: string, end: string): string[] {
  const dates: string[] = [];
  const current = new Date(start + 'T00:00:00');
  const last = new Date(end + 'T00:00:00');
  while (current <= last) {
    dates.push(current.toISOString().slice(0, 10));
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

// ============================================================================
// Dependency Adapter Builder
// ============================================================================

export function buildDependencyAdapter(tournamentId: string): DependencyAdapter {
  const { matchUps } = tournamentEngine.allTournamentMatchUps({ inContext: true });

  const { matchUpDependencies } = tournamentEngine.getMatchUpDependencies({ matchUps });

  // Build matchUpId → roundKeyString index
  const matchUpToRoundKey = new Map<string, string>();
  for (const mu of matchUps ?? []) {
    const key = [tournamentId, mu.eventId, mu.drawId, mu.structureId, mu.roundNumber].join('|');
    matchUpToRoundKey.set(mu.matchUpId, key);
  }

  // Build round-level dependency map (deduplicated via Set)
  const roundDeps = new Map<string, Set<string>>();
  for (const [matchUpId, deps] of Object.entries(matchUpDependencies ?? {})) {
    const roundKey = matchUpToRoundKey.get(matchUpId);
    if (!roundKey) continue;

    for (const depMatchUpId of (deps as any).matchUpIds ?? []) {
      const depRoundKey = matchUpToRoundKey.get(depMatchUpId);
      if (!depRoundKey || depRoundKey === roundKey) continue;

      const set = roundDeps.get(roundKey) ?? new Set();
      set.add(depRoundKey);
      roundDeps.set(roundKey, set);
    }
  }

  return {
    getRoundDependencies: (key: string): string[] => [...(roundDeps.get(key) ?? [])]
  };
}

// ============================================================================
// Venue Generation
// ============================================================================

const VENUE_NAMES = [
  'Main Stadium',
  'Practice Center',
  'Outdoor Complex',
  'Indoor Arena',
  'Clay Courts',
  'Grass Courts',
  'Training Center',
  'Community Courts',
  'Riverside Courts',
  'Hilltop Courts',
  'South Wing',
  'North Wing'
];

function generateVenueProfiles(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    venueId: `venue-${i + 1}`,
    venueName: VENUE_NAMES[i] ?? `Venue ${i + 1}`,
    venueAbbreviation: `V${i + 1}`,
    courtsCount: Math.max(2, 8 - i),
    startTime: '08:00',
    endTime: '20:00'
  }));
}

// ============================================================================
// Core Setup
// ============================================================================

export function createFactorySetup(options?: FactorySetupOptions): FactorySetup {
  // 1. Generate tournament
  const venueProfiles = options?.venueCount ? generateVenueProfiles(options.venueCount) : VENUE_PROFILES;

  const result = mocksEngine.generateTournamentRecord({
    venueProfiles,
    eventProfiles: EVENT_PROFILES,
    startDate: START_DATE,
    endDate: END_DATE
  });

  const { tournamentRecord } = result;
  if (!tournamentRecord) {
    throw new Error(`Failed to generate tournament: ${JSON.stringify(result.error || 'unknown error')}`);
  }

  tournamentEngine.setState(tournamentRecord);

  // 2. Optionally add court bookings
  if (options?.includeBookings) {
    const mainVenue = tournamentRecord.venues?.find((v: any) => v.venueId === 'venue-main-stadium');
    const mainCourts: any[] = mainVenue?.courts || [];

    if (mainCourts[0]) {
      tournamentEngine.modifyCourtAvailability({
        courtId: mainCourts[0].courtId,
        dateAvailability: [
          {
            date: START_DATE,
            startTime: '08:00',
            endTime: '20:00',
            bookings: [{ startTime: '09:00', endTime: '11:00', bookingType: 'MAINTENANCE' }]
          }
        ]
      });
    }

    if (mainCourts[2]) {
      tournamentEngine.modifyCourtAvailability({
        courtId: mainCourts[2].courtId,
        dateAvailability: [
          {
            date: START_DATE,
            startTime: '08:00',
            endTime: '20:00',
            bookings: [{ startTime: '14:00', endTime: '16:00', bookingType: 'PRACTICE' }]
          }
        ]
      });
    }
  }

  // Retrieve updated record
  const stateResult = tournamentEngine.getState();
  const record = stateResult?.tournamentRecord ?? tournamentRecord;
  const tournamentId = record.tournamentId;

  // 3. Extract VenueInfo[]
  const venues: VenueInfo[] = (record.venues || []).map((v: any) => ({
    venueId: v.venueId,
    name: v.venueName
  }));

  // 4. Extract round catalog via getRounds()
  const roundsResult = tournamentEngine.getRounds({ tournamentRecord: record });
  const factoryRounds: any[] = roundsResult?.rounds || [];

  const roundCatalog: CatalogRoundItem[] = factoryRounds.map((r: any) => ({
    tournamentId,
    eventId: r.eventId,
    eventName: r.eventName || '',
    drawId: r.drawId,
    drawName: r.structureName || r.drawName,
    structureId: r.structureId,
    roundNumber: r.roundNumber,
    roundName: r.roundName,
    matchCountEstimate: r.matchUpsCount
  }));

  // 5. Compute schedulable dates
  const schedulableDates = dateRange(START_DATE, END_DATE);

  // 6. Initialize TemporalEngine
  const engine = new TemporalEngine();
  engine.init(record, {
    dayStartTime: '06:00',
    dayEndTime: '22:00',
    slotMinutes: 15
  });

  // 7. Create TemporalAdapter
  const temporalAdapter: TemporalAdapter = {
    isDateAvailable: (date: string) => {
      if (!schedulableDates.includes(date)) {
        return { ok: false, reason: 'Date outside tournament range' };
      }
      const curve = engine.getCapacityCurve(date);
      const stats = calculateCapacityStats(curve);
      if (stats.totalCourtHours <= 0) {
        return { ok: false, reason: 'No court capacity on this date' };
      }
      return { ok: true };
    },
    getDayCapacityMinutes: (date: string) => {
      const curve = engine.getCapacityCurve(date);
      const stats = calculateCapacityStats(curve);
      return Math.round((stats.totalAvailableHours ?? stats.totalCourtHours) * 60);
    }
  };

  // 8. Create DemandAdapter
  const demandAdapter: DemandAdapter = {
    estimateDayDemandMinutes: (date: string, profile: SchedulingProfile) => {
      const day = profile.find((d) => d.scheduleDate === date);
      if (!day) return 0;
      let totalMatches = 0;
      for (const venue of day.venues) {
        for (const round of venue.rounds) {
          const catalogEntry = roundCatalog.find(
            (c) =>
              c.structureId === round.structureId && c.roundNumber === round.roundNumber && c.drawId === round.drawId
          );
          totalMatches += catalogEntry?.matchCountEstimate ?? round.matchCountEstimate ?? 4;
        }
      }
      return totalMatches * AVG_MATCH_MINUTES;
    }
  };

  // 9. Build dependency adapter
  const dependencyAdapter = buildDependencyAdapter(tournamentId);

  // 10. Extract activeDates from tournament record (if set)
  const tournamentInfo = tournamentEngine.getTournamentInfo?.() ?? {};
  const activeDates: string[] | undefined = (tournamentInfo as any).activeDates?.map((d: Date | string) =>
    typeof d === 'string' ? d.slice(0, 10) : (d as Date).toISOString().slice(0, 10)
  );

  // 11. Build config
  const config: SchedulingProfileConfig = {
    venues,
    roundCatalog,
    schedulableDates,
    activeDates,
    venueOrder: venues.map((v) => v.venueId),
    temporalAdapter,
    demandAdapter,
    dependencyAdapter
  };

  return {
    tournamentRecord: record,
    tournamentId,
    venues,
    roundCatalog,
    schedulableDates,
    startDate: START_DATE,
    endDate: END_DATE,
    engine,
    temporalAdapter,
    demandAdapter,
    dependencyAdapter,
    config
  };
}

// ============================================================================
// Profile Format Conversion
// ============================================================================

/**
 * Strip display-only fields from the component profile shape to produce
 * the minimal format expected by tournamentEngine.setSchedulingProfile().
 */
export function profileToFactoryFormat(profile: SchedulingProfile): SchedulingProfile {
  return profile.map((day) => ({
    scheduleDate: day.scheduleDate,
    venues: day.venues.map((v) => ({
      venueId: v.venueId,
      rounds: v.rounds.map((r) => {
        const base: RoundProfile = {
          tournamentId: r.tournamentId,
          eventId: r.eventId,
          drawId: r.drawId,
          structureId: r.structureId,
          roundNumber: r.roundNumber
        };
        if (r.roundSegment) base.roundSegment = r.roundSegment;
        if (r.notBeforeTime) base.notBeforeTime = r.notBeforeTime;
        return base;
      })
    }))
  }));
}

// ============================================================================
// Heavy Profile Builder (for oversubscription demos)
// ============================================================================

/**
 * Creates a profile that crams many rounds onto day 1 at the first venue,
 * demonstrating oversubscription and capacity warnings.
 */
export function buildHeavyProfile(setup: FactorySetup): SchedulingProfile {
  const day1 = setup.schedulableDates[0];
  const firstVenueId = setup.venues[0]?.venueId;
  if (!day1 || !firstVenueId) return [];

  // Take first 8 rounds (or all if fewer) and place them all on day 1
  const heavyRounds: RoundProfile[] = setup.roundCatalog.slice(0, 8).map((c, i) => ({
    tournamentId: c.tournamentId,
    eventId: c.eventId,
    eventName: c.eventName,
    drawId: c.drawId,
    drawName: c.drawName,
    structureId: c.structureId,
    roundNumber: c.roundNumber,
    roundName: c.roundName,
    matchCountEstimate: c.matchCountEstimate,
    sortOrder: i + 1
  }));

  return [
    {
      scheduleDate: day1,
      venues: setup.venues.map((v) => ({
        venueId: v.venueId,
        rounds: v.venueId === firstVenueId ? heavyRounds : []
      }))
    }
  ];
}

// ============================================================================
// Spread Profile Builder (for PreScheduled story)
// ============================================================================

/**
 * Builds a valid profile by distributing rounds across dates, grouping
 * by draw and respecting round-number precedence (lower rounds before higher).
 */
export function buildSpreadProfile(setup: FactorySetup): SchedulingProfile {
  const { roundCatalog, schedulableDates, venues } = setup;

  // Group rounds by draw
  const drawGroups = new Map<string, CatalogRoundItem[]>();
  for (const round of roundCatalog) {
    const key = `${round.drawId}|${round.structureId}`;
    const group = drawGroups.get(key) || [];
    group.push(round);
    drawGroups.set(key, group);
  }

  // Sort each group by roundNumber ascending
  for (const group of drawGroups.values()) {
    group.sort((a, b) => a.roundNumber - b.roundNumber);
  }

  // Assign rounds to dates round-robin across draws
  const dayAssignments: Map<string, RoundProfile[]> = new Map();
  for (const date of schedulableDates) {
    dayAssignments.set(date, []);
  }

  let dateIndex = 0;
  const allGroups = Array.from(drawGroups.values());

  // Distribute round-by-round across dates
  const maxRoundsPerDraw = Math.max(...allGroups.map((g) => g.length));
  for (let roundIdx = 0; roundIdx < maxRoundsPerDraw; roundIdx++) {
    for (const group of allGroups) {
      if (roundIdx >= group.length) continue;
      const c = group[roundIdx];
      const date = schedulableDates[dateIndex % schedulableDates.length];
      const rounds = dayAssignments.get(date)!;
      rounds.push({
        tournamentId: c.tournamentId,
        eventId: c.eventId,
        eventName: c.eventName,
        drawId: c.drawId,
        drawName: c.drawName,
        structureId: c.structureId,
        roundNumber: c.roundNumber,
        roundName: c.roundName,
        matchCountEstimate: c.matchCountEstimate,
        sortOrder: rounds.length + 1
      });
    }
    dateIndex++;
  }

  // Build profile — spread rounds across venues within each day
  const profile: SchedulingProfile = [];
  for (const date of schedulableDates) {
    const dayRounds = dayAssignments.get(date) || [];
    if (dayRounds.length === 0 && profile.length > 0) continue; // skip empty trailing days

    const venueSchedules = venues.map((v, vi) => ({
      venueId: v.venueId,
      rounds: dayRounds.filter((_, ri) => ri % venues.length === vi)
    }));

    profile.push({ scheduleDate: date, venues: venueSchedules });
  }

  return profile;
}
