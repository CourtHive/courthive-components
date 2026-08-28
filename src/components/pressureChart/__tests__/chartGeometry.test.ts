import { describe, it, expect } from 'vitest';

import { resolveYDomain, niceStep, defaultRoundLabel } from '../pressureChart';
import { buildEliminationFixture } from './buildFixture';
import { buildPressureSeries } from '../buildPressureSeries';
import { sharedYDomain } from '../pressureSmallMultiples';

// constants and types
import type { PressureSeriesPoint } from '../types';

function point(overrides: Partial<PressureSeriesPoint> = {}): PressureSeriesPoint {
  return {
    roundNumber: 1,
    projected: { expected: null, low: null, high: null },
    reachProbability: 1,
    actual: null,
    bye: false,
    resolved: false,
    ...overrides,
  };
}

describe('resolveYDomain', () => {
  it('is symmetric about zero so playing up and playing down read equally', () => {
    const [min, max] = resolveYDomain([point({ actual: 400 }), point({ actual: -100 })]);
    expect(min).toBeCloseTo(-max, 10);
    expect(max).toBeGreaterThanOrEqual(400);
  });

  it('covers the band edges, not just the expected line', () => {
    const [, max] = resolveYDomain([point({ projected: { expected: 10, low: -900, high: 900 } })]);
    expect(max).toBeGreaterThanOrEqual(900);
  });

  it('falls back to a readable domain when there is nothing to plot', () => {
    expect(resolveYDomain([])).toEqual([-100, 100]);
  });

  it('never collapses to a sliver for a near-even path', () => {
    const [min, max] = resolveYDomain([point({ actual: 1 }), point({ actual: -2 })]);
    expect(max - min).toBeGreaterThanOrEqual(100);
  });

  it('honours an explicit override so small multiples can share a scale', () => {
    expect(resolveYDomain([point({ actual: 5 })], [-1000, 1000])).toEqual([-1000, 1000]);
  });
});

describe('niceStep', () => {
  it('returns a readable 1 / 2 / 5 x 10^n step', () => {
    for (const [extent, expected] of [
      [1000, 500],
      [900, 200],
      [420, 200],
      [250, 100],
      [120, 50],
      [30, 10],
    ] as [number, number][]) {
      expect(niceStep(extent)).toBe(expected);
    }
  });

  it('degrades safely rather than producing NaN or Infinity gridlines', () => {
    expect(niceStep(0)).toBe(1);
    expect(niceStep(-5)).toBe(1);
    expect(niceStep(Number.NaN)).toBe(1);
  });
});

describe('defaultRoundLabel', () => {
  it('names the last three rounds QF / SF / F', () => {
    const labels = [0, 1, 2, 3, 4].map((index) => defaultRoundLabel(index + 1, index, 5));
    expect(labels).toEqual(['R1', 'R2', 'QF', 'SF', 'F']);
  });

  it('falls back to R-numbers when there are fewer than three rounds', () => {
    expect([0, 1].map((index) => defaultRoundLabel(index + 1, index, 2))).toEqual(['R1', 'R2']);
  });
});

describe('sharedYDomain', () => {
  it('spans every cell so the small-multiples grid is actually comparable', () => {
    const matchUps = buildEliminationFixture({
      entrants: [
        { participantId: 'p1', rating: 5 },
        { participantId: 'p2', rating: 6 },
        { participantId: 'p3', rating: 30 },
        { participantId: 'p4', rating: 31 },
      ],
    });
    const { series } = buildPressureSeries({ matchUps });
    const shared = sharedYDomain(series);
    for (const entry of series) {
      const own = resolveYDomain(entry.points);
      expect(shared[0]).toBeLessThanOrEqual(own[0]);
      expect(shared[1]).toBeGreaterThanOrEqual(own[1]);
    }
  });
});
