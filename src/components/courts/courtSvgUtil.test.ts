/**
 * @vitest-environment happy-dom
 */
import { describe, expect, it } from 'vitest';

import {
  COURT_SVG_RESOURCE_SUB_TYPE,
  createCourtSvg,
  resolveCourtSport,
  sportFromMatchUpFormat
} from './courtSvgUtil';

const TENNIS = 'tennis';
const BEST_OF_3 = 'SET3-S:6/TB7';

describe('sportFromMatchUpFormat', () => {
  it('returns undefined for no input', () => {
    expect(sportFromMatchUpFormat()).toBeUndefined();
    expect(sportFromMatchUpFormat('')).toBeUndefined();
  });

  it('maps SET-based formats to tennis', () => {
    expect(sportFromMatchUpFormat(BEST_OF_3)).toBe(TENNIS);
    expect(sportFromMatchUpFormat('SET1-S:4/TB7')).toBe(TENNIS);
  });

  it('maps T-prefix formats to tennis', () => {
    expect(sportFromMatchUpFormat('T:10')).toBe(TENNIS);
  });

  it('maps SET with @RALLY to pickleball', () => {
    expect(sportFromMatchUpFormat('SET3-S:11@RALLY')).toBe('pickleball');
  });

  it('maps HAL to basketball', () => {
    expect(sportFromMatchUpFormat('HAL4-S:12')).toBe('basketball');
  });

  it('maps INN to baseball', () => {
    expect(sportFromMatchUpFormat('INN9')).toBe('baseball');
  });

  it('maps PER to hockey', () => {
    expect(sportFromMatchUpFormat('PER3-S:20')).toBe('hockey');
  });

  it('returns undefined for unrecognized formats', () => {
    expect(sportFromMatchUpFormat('UNKNOWN')).toBeUndefined();
  });
});

describe('resolveCourtSport', () => {
  it('returns undefined for no event', () => {
    expect(resolveCourtSport()).toBeUndefined();
    expect(resolveCourtSport({})).toBeUndefined();
  });

  it('prefers competitionFormat.sport', () => {
    expect(resolveCourtSport({ competitionFormat: { sport: 'TENNIS' } })).toBe(TENNIS);
    expect(resolveCourtSport({ competitionFormat: { sport: 'PICKLEBALL' } })).toBe('pickleball');
    expect(resolveCourtSport({ competitionFormat: { sport: 'PADEL' } })).toBe('padel');
    expect(resolveCourtSport({ competitionFormat: { sport: 'BADMINTON' } })).toBe('badminton');
  });

  it('falls back to matchUpFormat', () => {
    expect(resolveCourtSport({ matchUpFormat: BEST_OF_3 })).toBe(TENNIS);
    expect(resolveCourtSport({ matchUpFormat: 'HAL4-S:12' })).toBe('basketball');
  });

  it('ignores unrecognized competitionFormat.sport and falls back', () => {
    expect(
      resolveCourtSport({
        competitionFormat: { sport: 'CRICKET' },
        matchUpFormat: BEST_OF_3
      })
    ).toBe(TENNIS);
  });
});

describe('createCourtSvg', () => {
  it('returns an SVG element for a known sport', () => {
    const svg = createCourtSvg('tennis');
    expect(svg).toBeDefined();
    expect(svg?.tagName.toLowerCase()).toBe('svg');
  });

  it('applies the sport class plus a custom className', () => {
    const svg = createCourtSvg('tennis', 'extra-class');
    expect(svg?.getAttribute('class')).toBe('court--tennis extra-class');
  });

  it('applies just the sport class when no custom className is given', () => {
    const svg = createCourtSvg('basketball');
    expect(svg?.getAttribute('class')).toBe('court--basketball');
  });

  it('rotates portrait viewBox to landscape (tennis is 360x780 portrait)', () => {
    const svg = createCourtSvg('tennis');
    const vb = svg?.getAttribute('viewBox')?.split(/\s+/).map(Number);
    expect(vb?.[2]).toBeGreaterThanOrEqual(vb?.[3] ?? 0);
  });

  it('returns undefined for an unknown sport', () => {
    expect(createCourtSvg('cricket' as any)).toBeUndefined();
  });

  it('returns undefined for missing sport', () => {
    expect(createCourtSvg(undefined)).toBeUndefined();
  });
});

describe('COURT_SVG_RESOURCE_SUB_TYPE', () => {
  it('is COURT_SVG', () => {
    expect(COURT_SVG_RESOURCE_SUB_TYPE).toBe('COURT_SVG');
  });
});
