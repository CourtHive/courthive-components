import { filterCatalog, countNotPlayingRounds, roundPlaysOnDate } from '../domain/catalogProjections';
import type { CatalogRoundItem, SchedulingProfile, RoundProfile } from '../types';
import { mocksEngine, tournamentEngine } from 'tods-competition-factory';
import { validateProfile } from '../domain/validateProfile';
import { roundKeyString } from '../domain/utils';
import { ProfileStore } from '../engine/profileStore';
import { describe, it, expect } from 'vitest';

// 2026-06-15 is a Monday; the tournament runs Monday to Sunday.
const START_DATE = '2026-06-15';
const END_DATE = '2026-06-21';
const MONDAY = '2026-06-15';
const SATURDAY = '2026-06-20';
const SUNDAY = '2026-06-21';
const WEEKEND_EVENT = 'Weekend Singles';
const OPEN_EVENT = 'Open Singles';
const EVENT_DATE_INACTIVE = 'EVENT_DATE_INACTIVE';

// A real catalog: the event's own weekdays narrow the tournament's dates, so `getRounds` attaches
// `playingDates` to that event's rounds only.
function buildCatalog(): CatalogRoundItem[] {
  const result = mocksEngine.generateTournamentRecord({
    eventProfiles: [
      { eventName: WEEKEND_EVENT, drawProfiles: [{ drawSize: 8 }] },
      { eventName: OPEN_EVENT, drawProfiles: [{ drawSize: 8 }] }
    ],
    startDate: START_DATE,
    endDate: END_DATE,
    setState: true
  });
  const tournamentId = result.tournamentRecord.tournamentId;

  const weekendEvent = result.tournamentRecord.events.find((e: any) => e.eventName === WEEKEND_EVENT);
  const setResult: any = tournamentEngine.setEventDates({ eventId: weekendEvent.eventId, weekdays: ['SAT', 'SUN'] });
  expect(setResult.success).toBe(true);

  const roundsResult: any = tournamentEngine.getRounds();
  const rounds: any[] = roundsResult.rounds ?? [];
  expect(rounds.length).toBeGreaterThan(0);

  return rounds.map((r) => ({
    tournamentId,
    eventId: r.eventId,
    eventName: r.eventName,
    drawId: r.drawId,
    drawName: r.drawName,
    structureId: r.structureId,
    roundNumber: r.roundNumber,
    roundName: r.roundName,
    matchCountEstimate: r.matchUpsCount,
    playingDates: r.playingDates
  }));
}

function toRoundProfile(item: CatalogRoundItem): RoundProfile {
  const { playingDates: _playingDates, ...round } = item;
  return round;
}

function profileWith(date: string, rounds: RoundProfile[]): SchedulingProfile {
  return [{ scheduleDate: date, venues: [{ venueId: 'V1', rounds }] }];
}

describe('catalog rounds and their event playing dates (real engine)', () => {
  it('getRounds gives playingDates only to the event whose dates are narrowed', () => {
    const catalog = buildCatalog();
    const weekend = catalog.filter((r) => r.eventName === WEEKEND_EVENT);
    const open = catalog.filter((r) => r.eventName === OPEN_EVENT);
    expect(weekend.length).toBeGreaterThan(0);
    expect(open.length).toBeGreaterThan(0);
    for (const r of weekend) expect(r.playingDates).toEqual([SATURDAY, SUNDAY]);
    for (const r of open) expect(r.playingDates).toBeUndefined();
  });

  it('hides a round on a date its event does not play and shows it on a playing date', () => {
    const catalog = buildCatalog();
    const onMonday = filterCatalog(catalog, '', new Set(), 'dim', { selectedDate: MONDAY });
    expect(onMonday.some((r) => r.eventName === WEEKEND_EVENT)).toBe(false);
    expect(onMonday.filter((r) => r.eventName === OPEN_EVENT)).toHaveLength(
      catalog.filter((r) => r.eventName === OPEN_EVENT).length
    );

    const onSaturday = filterCatalog(catalog, '', new Set(), 'dim', { selectedDate: SATURDAY });
    expect(onSaturday).toHaveLength(catalog.length);

    const weekendCount = catalog.filter((r) => r.eventName === WEEKEND_EVENT).length;
    expect(countNotPlayingRounds(catalog, MONDAY, new Set())).toBe(weekendCount);
    expect(countNotPlayingRounds(catalog, SATURDAY, new Set())).toBe(0);
  });

  it('keeps today’s behaviour without a selected date or without the options argument', () => {
    const catalog = buildCatalog();
    expect(filterCatalog(catalog, '', new Set())).toHaveLength(catalog.length);
    expect(filterCatalog(catalog, '', new Set(), 'dim', { selectedDate: null })).toHaveLength(catalog.length);
    expect(countNotPlayingRounds(catalog, null, new Set())).toBe(0);
  });

  it('keeps a placed round listed on a non-playing date so its placement stays removable', () => {
    const catalog = buildCatalog();
    const weekendRound = catalog.find((r) => r.eventName === WEEKEND_EVENT)!;
    const placed = new Set([roundKeyString(weekendRound)]);

    const dimmed = filterCatalog(catalog, '', placed, 'dim', { selectedDate: MONDAY, placedKeys: placed });
    const kept = dimmed.find((r) => roundKeyString(r) === roundKeyString(weekendRound));
    expect(kept?.isPlanned).toBe(true);
    expect(countNotPlayingRounds(catalog, MONDAY, placed)).toBe(
      catalog.filter((r) => r.eventName === WEEKEND_EVENT).length - 1
    );

    // plannedRoundBehavior 'hide' still hides planned rounds
    const hidden = filterCatalog(catalog, '', placed, 'hide', { selectedDate: MONDAY, placedKeys: placed });
    expect(hidden.some((r) => roundKeyString(r) === roundKeyString(weekendRound))).toBe(false);
  });

  it('warns, never errors, when a round is planned on a day its event does not play', () => {
    const catalog = buildCatalog();
    const weekendRound = catalog.find((r) => r.eventName === WEEKEND_EVENT)!;
    const openRound = catalog.find((r) => r.eventName === OPEN_EVENT)!;
    const profile = profileWith(MONDAY, [toRoundProfile(weekendRound), toRoundProfile(openRound)]);

    const results = validateProfile({ profile, roundCatalog: catalog });
    const inactive = results.filter((r) => r.code === EVENT_DATE_INACTIVE);
    expect(inactive).toHaveLength(1);
    expect(inactive[0].severity).toBe('WARN');
    expect(inactive[0].context.date).toBe(MONDAY);
    expect(inactive[0].context.locator?.roundKey.eventId).toBe(weekendRound.eventId);
    expect(inactive[0].message).toContain(`plays ${SATURDAY}, ${SUNDAY}`);

    const onSaturday = validateProfile({
      profile: profileWith(SATURDAY, [toRoundProfile(weekendRound)]),
      roundCatalog: catalog
    });
    expect(onSaturday.filter((r) => r.code === EVENT_DATE_INACTIVE)).toHaveLength(0);

    // without a catalog the rule does not run (backward compatible)
    expect(validateProfile({ profile }).filter((r) => r.code === EVENT_DATE_INACTIVE)).toHaveLength(0);
  });

  it('the store surfaces the warning and does not reject a drop onto a non-playing day', () => {
    const catalog = buildCatalog();
    const weekendRound = catalog.find((r) => r.eventName === WEEKEND_EVENT)!;
    const store = new ProfileStore({
      venues: [{ venueId: 'V1', name: 'Venue A' }],
      roundCatalog: catalog,
      schedulableDates: [MONDAY, SATURDAY, SUNDAY]
    });

    const result = store.dropRound(
      { type: 'CATALOG_ROUND', roundRef: weekendRound },
      { date: MONDAY, venueId: 'V1', index: 0 }
    );
    expect(result.ok).toBe(true);

    const warnings = store.getState().ruleResults.filter((r) => r.code === EVENT_DATE_INACTIVE);
    expect(warnings).toHaveLength(1);
    expect(store.getState().issueIndex.counts.WARN).toBeGreaterThanOrEqual(1);
  });
});

describe('roundPlaysOnDate', () => {
  it('treats absent playingDates as unconstrained and an empty list as playing nowhere', () => {
    expect(roundPlaysOnDate({}, MONDAY)).toBe(true);
    expect(roundPlaysOnDate({ playingDates: [SATURDAY] }, MONDAY)).toBe(false);
    expect(roundPlaysOnDate({ playingDates: [SATURDAY] }, SATURDAY)).toBe(true);
    expect(roundPlaysOnDate({ playingDates: [] }, MONDAY)).toBe(false);
    expect(roundPlaysOnDate({ playingDates: [] }, undefined)).toBe(true);
  });

  it('warns that an event with no playing dates has none', () => {
    const round = {
      tournamentId: 'T1',
      eventId: 'E1',
      eventName: 'E',
      drawId: 'D1',
      structureId: 'S1',
      roundNumber: 1
    };
    const results = validateProfile({
      profile: profileWith(MONDAY, [round]),
      roundCatalog: [{ ...round, playingDates: [] }]
    });
    const inactive = results.filter((r) => r.code === EVENT_DATE_INACTIVE);
    expect(inactive).toHaveLength(1);
    expect(inactive[0].message).toContain('has no playing dates');
  });
});
