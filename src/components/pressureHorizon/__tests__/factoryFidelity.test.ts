import { describe, it, expect } from 'vitest';

import { buildPressureSeries } from '../../pressureChart/buildPressureSeries';
import { createDrawOrderGame } from '../drawOrderGameState';
import { seededDraw } from '../../../stories/pressureChartFixture';
import { buildHorizonRows } from '../horizonBands';

// constants and types
import { HORIZON_DIRECTION } from '../types';

/**
 * Fidelity against REAL factory output, for two claims the horizon and the game
 * both stand on. Neither is provable from a hand-built fixture, because a
 * hand-built fixture is just me writing down what I already believe.
 *
 * 1. `drawPosition` is actually POPULATED on the series. The game orders the
 *    answer key by it, and a field that exists in the types and is `undefined` at
 *    runtime would produce a puzzle whose answer is arbitrary — silently, with
 *    every unit test still green.
 *
 * 2. The deduction the game asks for is really available. Two players who meet in
 *    round 1 are each other's round-1 opponent, so their round-1 signed deltas are
 *    exact negatives and their walls are mirrors. If that were not true the game
 *    would be a guessing exercise wearing a puzzle's clothes.
 */

const DRAW_SIZE = 16;

function drawOrderSeries() {
  const fixture = seededDraw({ drawSize: DRAW_SIZE, seedsCount: 4 });
  const { series, scaleName } = buildPressureSeries({ matchUps: fixture.matchUps });
  return { series: series.toSorted((a, b) => (a.drawPosition ?? 0) - (b.drawPosition ?? 0)), scaleName };
}

describe('pressure horizon against real factory output', () => {
  it('carries a drawPosition on every rated entrant — the answer key depends on it', () => {
    const { series } = drawOrderSeries();
    expect(series).toHaveLength(DRAW_SIZE);
    expect(series.every((entry) => typeof entry.drawPosition === 'number')).toBe(true);
    expect(series.map((entry) => entry.drawPosition)).toEqual(
      Array.from({ length: DRAW_SIZE }, (_, index) => index + 1)
    );
  });

  it('builds one aligned row per entrant across all four rounds', () => {
    const { series } = drawOrderSeries();
    const built = buildHorizonRows({ series });
    expect(built.roundNumbers).toEqual([1, 2, 3, 4]);
    expect(built.rows).toHaveLength(DRAW_SIZE);
    expect(built.rows.every((row) => row.cells.length === 4)).toBe(true);
    expect(built.domainMax).toBeGreaterThan(0);
  });

  it('paints round-1 pairs as mirrors — the deduction the game is built on', () => {
    const { series } = drawOrderSeries();
    const built = buildHorizonRows({ series });

    // Consecutive draw positions (1-2, 3-4, ...) meet in round 1.
    for (let index = 0; index < built.rows.length; index += 2) {
      const [top, bottom] = [built.rows[index].cells[0], built.rows[index + 1].cells[0]];
      expect(top.value).not.toBeNull();
      expect(bottom.value).not.toBeNull();
      expect(top.value as number).toBeCloseTo(-(bottom.value as number), 6);
      expect(top.direction).not.toBe(bottom.direction);
    }
  });

  /**
   * Falsification of the above: the mirror assertion has to be able to fail. Rows
   * that do NOT meet in round 1 are not mirrors, so pairing across a bracket
   * boundary must break it — otherwise "they mirror" would be a property of the
   * comparison rather than of the draw.
   */
  it('does not mirror rows that never meet', () => {
    const { series } = drawOrderSeries();
    const built = buildHorizonRows({ series });
    const mismatches = built.rows.slice(1, -1).filter((row, index) => {
      const pairedAcrossBoundary = built.rows[index + 2].cells[0];
      return Math.abs((row.cells[0].value ?? 0) + (pairedAcrossBoundary.value ?? 0)) > 1e-6;
    });
    expect(mismatches.length).toBeGreaterThan(0);
  });

  it('reads the top seed as a protected slot — mostly playing down, hardest at the end', () => {
    const { series } = drawOrderSeries();
    const built = buildHorizonRows({ series });
    const fixture = seededDraw({ drawSize: DRAW_SIZE, seedsCount: 4 });
    const topSeedRow = built.rows.find((row) => row.participantId === fixture.topSeedId);

    // Same seeded fixture, so the top seed is present and its road ramps up.
    expect(topSeedRow).toBeDefined();
    const values = (topSeedRow?.cells ?? []).map((cell) => cell.value ?? 0);
    expect(values[0]).toBeLessThan(values.at(-1) as number);
    expect(topSeedRow?.cells[0].direction).toBe(HORIZON_DIRECTION.EASY);
  });

  it('deals a game whose answer key is the real draw order', () => {
    const { series } = drawOrderSeries();
    const state = createDrawOrderGame({ actualOrder: series.map((entry) => entry.participantId), seed: 1 });
    expect(state.actualOrder).toEqual(series.map((entry) => entry.participantId));
    expect(state.order).not.toEqual(state.actualOrder);
  });
});
