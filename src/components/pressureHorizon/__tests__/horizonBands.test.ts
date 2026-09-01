import { describe, it, expect } from 'vitest';

import {
  buildHorizonRows,
  resolveHorizonDomain,
  selectCellValue,
  bandLayers,
  MIN_HORIZON_DOMAIN
} from '../horizonBands';

// constants and types
import { HORIZON_DIRECTION, HORIZON_SOURCE } from '../types';
import type { PressureSeries, PressureSeriesPoint } from '../../pressureChart/types';

function point(overrides: Partial<PressureSeriesPoint> = {}): PressureSeriesPoint {
  return {
    roundNumber: 1,
    projected: { expected: 0, low: null, high: null },
    reachProbability: 1,
    actual: null,
    bye: false,
    resolved: false,
    ...overrides
  };
}

function series(overrides: Partial<PressureSeries> = {}): PressureSeries {
  return {
    participantId: 'p1',
    participantName: 'One',
    drawPosition: 1,
    rating: { elo: 1500, scaleName: 'WTN', sourceValue: 8 },
    pathDifficulty: 0,
    slotDifficulty: 0,
    facedDifficulty: null,
    points: [point()],
    ...overrides
  };
}

describe('bandLayers', () => {
  it('folds a magnitude into full bands plus a partial cap', () => {
    // 2.6 steps of a 4-band, 400-wide domain: two full layers and one at 0.6.
    const { layers, clipped } = bandLayers({ magnitude: 260, bands: 4, domainMax: 400 });
    expect(layers.map((layer) => layer.bandIndex)).toEqual([0, 1, 2]);
    expect(layers[0].fraction).toBe(1);
    expect(layers[1].fraction).toBe(1);
    expect(layers[2].fraction).toBeCloseTo(0.6, 10);
    expect(clipped).toBe(false);
  });

  it('paints a single partial layer below one step', () => {
    const { layers } = bandLayers({ magnitude: 40, bands: 4, domainMax: 400 });
    expect(layers).toHaveLength(1);
    expect(layers[0].fraction).toBeCloseTo(0.4, 10);
  });

  it('caps at the darkest band and reports the clip rather than overflowing', () => {
    const { layers, clipped } = bandLayers({ magnitude: 900, bands: 4, domainMax: 400 });
    expect(layers).toHaveLength(4);
    expect(layers.every((layer) => layer.fraction === 1)).toBe(true);
    expect(clipped).toBe(true);
  });

  it('paints nothing for a zero magnitude or a degenerate domain', () => {
    expect(bandLayers({ magnitude: 0, bands: 4, domainMax: 400 }).layers).toEqual([]);
    expect(bandLayers({ magnitude: 100, bands: 4, domainMax: 0 }).layers).toEqual([]);
    expect(bandLayers({ magnitude: 100, bands: 0, domainMax: 400 }).layers).toEqual([]);
  });
});

describe('resolveHorizonDomain', () => {
  it('takes the largest magnitude across every row', () => {
    const rows = [
      series({ points: [point({ projected: { expected: 120, low: null, high: null } })] }),
      series({ participantId: 'p2', points: [point({ projected: { expected: -310, low: null, high: null } })] })
    ];
    expect(resolveHorizonDomain(rows, HORIZON_SOURCE.PROJECTED)).toBe(310);
  });

  it('never scales below the floor, so a flat draw does not fill the darkest band with noise', () => {
    const rows = [series({ points: [point({ projected: { expected: 3, low: null, high: null } })] })];
    expect(resolveHorizonDomain(rows, HORIZON_SOURCE.PROJECTED)).toBe(MIN_HORIZON_DOMAIN);
    expect(resolveHorizonDomain([], HORIZON_SOURCE.PROJECTED)).toBe(MIN_HORIZON_DOMAIN);
  });
});

describe('selectCellValue', () => {
  it('reads the projection by default', () => {
    const value = selectCellValue(
      point({ projected: { expected: 90, low: null, high: null }, actual: -40 }),
      HORIZON_SOURCE.PROJECTED
    );
    expect(value).toEqual({ value: 90, fromActual: false });
  });

  it('prefers a played result under the actual source', () => {
    const value = selectCellValue(
      point({ projected: { expected: 90, low: null, high: null }, actual: -40 }),
      HORIZON_SOURCE.ACTUAL
    );
    expect(value).toEqual({ value: -40, fromActual: true });
  });

  it('falls back to the projection where the round has not been played', () => {
    const value = selectCellValue(point({ projected: { expected: 90, low: null, high: null } }), HORIZON_SOURCE.ACTUAL);
    expect(value).toEqual({ value: 90, fromActual: false });
  });
});

describe('buildHorizonRows', () => {
  it('aligns every row to the union of round numbers so the stack stays comparable', () => {
    const rows = buildHorizonRows({
      series: [
        series({ points: [point({ roundNumber: 1 }), point({ roundNumber: 2 })] }),
        series({ participantId: 'p2', points: [point({ roundNumber: 2 }), point({ roundNumber: 3 })] })
      ]
    });
    expect(rows.roundNumbers).toEqual([1, 2, 3]);
    expect(rows.rows.every((row) => row.cells.length === 3)).toBe(true);
    // The short row leaves a gap in ITS missing column, not a leftward shift.
    expect(rows.rows[1].cells.map((cell) => cell.roundNumber)).toEqual([1, 2, 3]);
    expect(rows.rows[1].cells[0].value).toBeNull();
  });

  it('signs direction from the delta: playing up is hard, playing down is easy', () => {
    const rows = buildHorizonRows({
      series: [
        series({
          points: [
            point({ roundNumber: 1, projected: { expected: 150, low: null, high: null } }),
            point({ roundNumber: 2, projected: { expected: -150, low: null, high: null } })
          ]
        })
      ]
    });
    expect(rows.rows[0].cells[0].direction).toBe(HORIZON_DIRECTION.HARD);
    expect(rows.rows[0].cells[1].direction).toBe(HORIZON_DIRECTION.EASY);
  });

  it('paints nothing for a BYE — no opponent means no wall, never a guessed one', () => {
    const rows = buildHorizonRows({
      series: [series({ points: [point({ bye: true, projected: { expected: 200, low: null, high: null } })] })]
    });
    expect(rows.rows[0].cells[0].layers).toEqual([]);
    expect(rows.rows[0].cells[0].value).toBeNull();
    expect(rows.rows[0].cells[0].bye).toBe(true);
  });

  it('counts capped walls so the caption can say so', () => {
    const rows = buildHorizonRows({
      series: [series({ points: [point({ projected: { expected: 5000, low: null, high: null } })] })],
      domainMax: 400
    });
    expect(rows.clippedCells).toBe(1);
  });

  it('honours an externally fixed domain so two stacks can be read against each other', () => {
    const built = buildHorizonRows({
      series: [series({ points: [point({ projected: { expected: 100, low: null, high: null } })] })],
      domainMax: 800,
      bands: 4
    });
    // 100 of an 800 domain across 4 bands is half of one step — a single pale layer.
    expect(built.domainMax).toBe(800);
    expect(built.rows[0].cells[0].layers).toEqual([{ bandIndex: 0, fraction: 0.5 }]);
  });
});
