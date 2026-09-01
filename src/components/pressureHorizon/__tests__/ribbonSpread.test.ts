import { describe, it, expect } from 'vitest';

import { buildPressureSeries } from '../../pressureChart/buildPressureSeries';
import { seededDraw } from '../../../stories/pressureChartFixture';
import { buildHorizonRows } from '../horizonBands';

/**
 * The fan, against real factory output.
 *
 * The ribbon's whole claim is that it carries information the walls discard, so
 * these specs check the information is actually there and actually differs — not
 * merely that a field is non-null. A fan whose inner envelope equalled its outer
 * would be two paths drawn on top of each other and a lie about precision.
 */

const DRAW_SIZE = 16;

function fixture() {
  const drawn = seededDraw({ drawSize: DRAW_SIZE, seedsCount: 4 });
  const { series, projection } = buildPressureSeries({ matchUps: drawn.matchUps });
  return {
    series: series.toSorted((a: any, b: any) => (a.drawPosition ?? 0) - (b.drawPosition ?? 0)),
    projection
  };
}

describe('ribbon spread against real factory output', () => {
  it('weights every cell when the projection is supplied', () => {
    const { series, projection } = fixture();
    const built = buildHorizonRows({ series, projection });
    const cells = built.rows.flatMap((row) => row.cells);
    expect(cells).toHaveLength(DRAW_SIZE * 4);
    expect(cells.every((cell) => cell.spread !== null)).toBe(true);
    expect(cells.every((cell) => cell.spread?.weighted)).toBe(true);
  });

  it('falls back to the unweighted envelope, and says so, when no projection is passed', () => {
    const { series } = fixture();
    const built = buildHorizonRows({ series });
    const cells = built.rows.flatMap((row) => row.cells).filter((cell) => cell.spread);
    expect(cells.length).toBeGreaterThan(0);
    expect(cells.every((cell) => cell.spread?.weighted === false)).toBe(true);
    // Unweighted means there is nothing to distinguish inner from outer.
    expect(cells.every((cell) => cell.spread?.innerLow === cell.spread?.outerLow)).toBe(true);
  });

  it('collapses round 1 to a point — the first opponent is known', () => {
    const { series, projection } = fixture();
    const built = buildHorizonRows({ series, projection });
    for (const row of built.rows) {
      const first = row.cells[0].spread;
      expect(first).not.toBeNull();
      expect(first?.outerHigh).toBeCloseTo(first?.outerLow as number, 6);
      expect(first?.innerHigh).toBeCloseTo(first?.innerLow as number, 6);
    }
  });

  /**
   * The quantitative justification for two envelopes rather than one. If the weighted
   * inner range were about as wide as the 1%-threshold outer range, the extra path
   * would be cost with no benefit.
   */
  it('makes the inner envelope materially narrower than the outer one', () => {
    const { series, projection } = fixture();
    const built = buildHorizonRows({ series, projection });
    const later = built.rows.flatMap((row) => row.cells).filter((cell) => cell.roundNumber > 1 && cell.spread);
    expect(later.length).toBeGreaterThan(0);

    const outer = later.map((cell) => (cell.spread as any).outerHigh - (cell.spread as any).outerLow);
    const inner = later.map((cell) => (cell.spread as any).innerHigh - (cell.spread as any).innerLow);
    const mean = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;

    expect(mean(inner)).toBeLessThan(mean(outer) * 0.75);
    // And it must never escape the outer envelope on any single cell.
    expect(inner.every((width, index) => width <= outer[index] + 1e-9)).toBe(true);
  });

  it('never lets the inner envelope escape the outer one', () => {
    const { series, projection } = fixture();
    const built = buildHorizonRows({ series, projection });
    for (const cell of built.rows.flatMap((row) => row.cells)) {
      if (!cell.spread) continue;
      expect(cell.spread.innerLow).toBeGreaterThanOrEqual(cell.spread.outerLow - 1e-9);
      expect(cell.spread.innerHigh).toBeLessThanOrEqual(cell.spread.outerHigh + 1e-9);
    }
  });

  it('brackets the expected value inside the outer envelope', () => {
    const { series, projection } = fixture();
    const built = buildHorizonRows({ series, projection });
    for (const cell of built.rows.flatMap((row) => row.cells)) {
      if (!cell.spread || cell.value === null) continue;
      expect(cell.value).toBeGreaterThanOrEqual(cell.spread.outerLow - 1e-6);
      expect(cell.value).toBeLessThanOrEqual(cell.spread.outerHigh + 1e-6);
    }
  });
});
