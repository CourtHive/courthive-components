import { cellCardConfig, groupCourts, settingOf, summarizeCourts, surfaceOf } from '../buildCourtLayout';
import { DEFAULT_COURT_LAYOUT_CONFIG, mergeCourtLayoutConfig } from '../defaultConfig';
import { CourtLayoutCourt } from '../types';
import { describe, it, expect } from 'vitest';

const court = (courtName: string, extra: Partial<CourtLayoutCourt> = {}): CourtLayoutCourt => ({
  courtName,
  ...extra
});

describe('settingOf / surfaceOf', () => {
  it('title-cases the raw upper-case values', () => {
    expect(settingOf(court('1', { indoorOutdoor: 'OUTDOOR' }))).toBe('Outdoor');
    expect(surfaceOf(court('1', { surfaceCategory: 'CLAY' }))).toBe('Clay');
  });

  it('labels missing values rather than dropping the court', () => {
    expect(settingOf(court('1'))).toBe('Unspecified');
    expect(surfaceOf(court('1'))).toBe('Unspecified surface');
    expect(settingOf(court('1', { indoorOutdoor: '   ' }))).toBe('Unspecified');
  });
});

describe('groupCourts', () => {
  const courts = [
    court('Court 3', { indoorOutdoor: 'OUTDOOR', surfaceCategory: 'HARD', courtOrder: 3 }),
    court('Court 1', { indoorOutdoor: 'OUTDOOR', surfaceCategory: 'HARD', courtOrder: 1 }),
    court('Court 10', { indoorOutdoor: 'INDOOR', surfaceCategory: 'HARD', courtOrder: 10 }),
    court('Court 2', { indoorOutdoor: 'INDOOR', surfaceCategory: 'CLAY', courtOrder: 2 })
  ];

  it('grouping "none" returns one group in courtOrder', () => {
    const groups = groupCourts(courts, 'none');
    expect(groups).toHaveLength(1);
    expect(groups[0].courts.map((c) => c.courtName)).toEqual(['Court 1', 'Court 2', 'Court 3', 'Court 10']);
  });

  it('groups by setting', () => {
    const groups = groupCourts(courts, 'setting');
    expect(groups.map((g) => g.label)).toEqual(['Outdoor', 'Indoor']);
    expect(groups[0].courts.map((c) => c.courtName)).toEqual(['Court 1', 'Court 3']);
  });

  it('orders GROUPS by first appearance in courtOrder, not alphabetically', () => {
    // court 1 is outdoor, so outdoor leads — 'Indoor' would win a naive alphabetical sort
    expect(groupCourts(courts, 'setting')[0].label).toBe('Outdoor');
  });

  it('groups by surface', () => {
    const groups = groupCourts(courts, 'surface');
    expect(groups.map((g) => g.label)).toEqual(['Hard', 'Clay']);
  });

  it('groups by both, combining the labels', () => {
    const groups = groupCourts(courts, 'both');
    expect(groups.map((g) => g.label)).toEqual(['Outdoor · Hard', 'Indoor · Clay', 'Indoor · Hard']);
  });

  it('keeps courtOrder ordering inside each group', () => {
    const groups = groupCourts(
      [
        court('B', { indoorOutdoor: 'OUTDOOR', courtOrder: 2 }),
        court('A', { indoorOutdoor: 'OUTDOOR', courtOrder: 1 })
      ],
      'setting'
    );
    expect(groups[0].courts.map((c) => c.courtName)).toEqual(['A', 'B']);
  });

  it('does not mutate the input', () => {
    const input = [court('B', { courtOrder: 2 }), court('A', { courtOrder: 1 })];
    groupCourts(input, 'setting');
    expect(input.map((c) => c.courtName)).toEqual(['B', 'A']);
  });

  it('returns no groups for an empty list', () => {
    expect(groupCourts([], 'setting')).toEqual([]);
  });
});

describe('summarizeCourts', () => {
  it('counts by setting + surface, most common first', () => {
    const summary = summarizeCourts([
      court('1', { indoorOutdoor: 'OUTDOOR', surfaceCategory: 'HARD' }),
      court('2', { indoorOutdoor: 'OUTDOOR', surfaceCategory: 'HARD' }),
      court('3', { indoorOutdoor: 'INDOOR', surfaceCategory: 'HARD' })
    ]);
    expect(summary).toBe('2 outdoor hard, 1 indoor hard');
  });

  it('omits unknown parts instead of printing "unspecified"', () => {
    expect(summarizeCourts([court('1', { surfaceCategory: 'CLAY' })])).toBe('1 clay');
    expect(summarizeCourts([court('1', { indoorOutdoor: 'INDOOR' })])).toBe('1 indoor');
  });

  it('falls back to a bare count when nothing is known', () => {
    expect(summarizeCourts([court('1'), court('2')])).toBe('2 court');
  });
});

describe('mergeCourtLayoutConfig', () => {
  it('returns the defaults untouched when no override is given', () => {
    expect(mergeCourtLayoutConfig()).toBe(DEFAULT_COURT_LAYOUT_CONFIG);
  });

  it('honours explicitly falsey overrides', () => {
    const merged = mergeCourtLayoutConfig({ showSummary: false, showGroupHeadings: false });
    expect(merged.showSummary).toBe(false);
    expect(merged.showGroupHeadings).toBe(false);
    expect(merged.grouping).toBe(DEFAULT_COURT_LAYOUT_CONFIG.grouping);
  });

  it('defaults to grouping by setting — the scheduling-relevant split', () => {
    expect(DEFAULT_COURT_LAYOUT_CONFIG.grouping).toBe('setting');
  });
});

describe('cellCardConfig', () => {
  it('drops the setting badge when the group heading already states it', () => {
    expect(cellCardConfig('setting')?.cornerBadges).toEqual(['floodlit']);
    expect(cellCardConfig('both')?.cornerBadges).toEqual(['floodlit']);
  });

  it('keeps the card defaults when grouping does not imply the setting', () => {
    expect(cellCardConfig('none')).toBeUndefined();
    expect(cellCardConfig('surface')).toBeUndefined();
  });

  it('never drops floodlit — grouping never implies it', () => {
    for (const grouping of ['none', 'setting', 'surface', 'both'] as const) {
      const badges = cellCardConfig(grouping)?.cornerBadges;
      if (badges) expect(badges).toContain('floodlit');
    }
  });
});
