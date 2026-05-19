import { mapCourtToCardData } from '../mapCourt';
import { describe, it, expect } from 'vitest';

describe('mapCourtToCardData', () => {
  it('returns empty defaults for null input', () => {
    const out = mapCourtToCardData(null);
    expect(out.courtId).toBe('');
    expect(out.courtName).toBe('');
    expect(out.floodlit).toBe(false);
  });

  it('maps identity + abbreviation', () => {
    const out = mapCourtToCardData({ courtId: 'c1', courtName: 'Court 1', courtAbbreviation: 'C1' });
    expect(out.courtId).toBe('c1');
    expect(out.courtName).toBe('Court 1');
    expect(out.courtAbbreviation).toBe('C1');
  });

  it('normalizes indoorOutdoor', () => {
    expect(mapCourtToCardData({ courtId: 'c1', indoorOutdoor: 'indoor' }).indoorOutdoor).toBe('INDOOR');
    expect(mapCourtToCardData({ courtId: 'c1', indoorOutdoor: 'OUTDOOR' }).indoorOutdoor).toBe('OUTDOOR');
    expect(mapCourtToCardData({ courtId: 'c1', indoorOutdoor: 'something' }).indoorOutdoor).toBeUndefined();
  });

  it('uppercases surfaceCategory', () => {
    expect(mapCourtToCardData({ courtId: 'c1', surfaceCategory: 'hard' }).surfaceCategory).toBe('HARD');
  });

  it('falls back to surfaceType when it holds a known category', () => {
    expect(mapCourtToCardData({ courtId: 'c1', surfaceType: 'CLAY' }).surfaceCategory).toBe('CLAY');
    expect(mapCourtToCardData({ courtId: 'c1', surfaceType: 'grass' }).surfaceCategory).toBe('GRASS');
  });

  it('prefers surfaceCategory over surfaceType when both are set', () => {
    const out = mapCourtToCardData({ courtId: 'c1', surfaceCategory: 'HARD', surfaceType: 'AC' });
    expect(out.surfaceCategory).toBe('HARD');
  });

  it('builds surfaceLabel from indoorOutdoor + surfaceCategory', () => {
    const out = mapCourtToCardData({ courtId: 'c1', indoorOutdoor: 'OUTDOOR', surfaceCategory: 'HARD' });
    expect(out.surfaceLabel).toContain('Outdoor');
    expect(out.surfaceLabel).toContain('Hard');
  });

  it('passes through floodlit flag', () => {
    expect(mapCourtToCardData({ courtId: 'c1', floodlit: true }).floodlit).toBe(true);
    expect(mapCourtToCardData({ courtId: 'c1', floodlit: false }).floodlit).toBe(false);
  });

  it('uses parent sport for court-SVG fallback', () => {
    const out = mapCourtToCardData({ courtId: 'c1' }, { sport: 'tennis' });
    expect(out.courtSvgSport).toBe('tennis');
  });
});
