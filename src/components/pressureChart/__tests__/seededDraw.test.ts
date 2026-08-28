import { describe, it, expect } from 'vitest';

import { buildPressureSeries, byPathDifficulty } from '../buildPressureSeries';
import { getProjectedPressure } from '../getProjectedPressure';
import { seededDraw } from '../../../stories/pressureChartFixture';

/**
 * Validates the whole chain on a REALISTIC draw: rating-consistent seeding ->
 * projection -> ranking. A draw with ratings but no seeding scatters the strong
 * players at random, so every projected curve is arbitrary and none of these
 * assertions would mean anything — which is exactly why the story fixture seeds
 * by rating, and why that fixture is exercised here rather than only rendered.
 */

describe('a rating-seeded draw', () => {
  it('gives the seeded players easier slots than the unseeded, on average', () => {
    // NOT "the top seed has strictly the easiest slot" — seeds 1 and 2 occupy
    // near-mirror-image slots, so which of them comes out lowest turns on where
    // the unseeded players happened to land. The population claim is the one
    // seeding actually makes.
    const fixture = seededDraw({ drawSize: 32, seedsCount: 8 });
    const { series } = buildPressureSeries({ matchUps: fixture.matchUps });
    const seeds = new Set(fixture.seedIds);
    const mean = (values: number[]) => values.reduce((total, value) => total + value, 0) / values.length;
    const rated = series.filter((entry) => entry.slotDifficulty !== null);
    const seeded = rated.filter((entry) => seeds.has(entry.participantId));
    const unseeded = rated.filter((entry) => !seeds.has(entry.participantId));
    expect(seeded.length).toBe(8);
    expect(mean(seeded.map((e) => e.slotDifficulty as number))).toBeLessThan(
      mean(unseeded.map((e) => e.slotDifficulty as number)),
    );
  });

  it('ranks the seeds below the unseeded — seeding is visible in the output', () => {
    const fixture = seededDraw({ drawSize: 32, seedsCount: 8 });
    const { series } = buildPressureSeries({ matchUps: fixture.matchUps });
    const ranked = byPathDifficulty(series).filter((entry) => entry.slotDifficulty !== null);
    const topSeedRank = ranked.findIndex((entry) => entry.participantId === fixture.topSeedId);
    // Hardest first, so the top seed belongs in the last quarter of the list.
    expect(topSeedRank).toBeGreaterThan(ranked.length * 0.75);
  });

  it('projects the top seed to play DOWN and the unseeded player to play UP', () => {
    const fixture = seededDraw({ drawSize: 16, seedsCount: 4 });
    const { series } = buildPressureSeries({ matchUps: fixture.matchUps });
    const topSeed = series.find((entry) => entry.participantId === fixture.topSeedId);
    const unseeded = series.find((entry) => entry.participantId === fixture.unseededId);
    expect(topSeed?.slotDifficulty).toBeLessThan(0);
    expect(unseeded?.slotDifficulty).toBeGreaterThan(0);
    expect(unseeded?.slotDifficulty as number).toBeGreaterThan(topSeed?.slotDifficulty as number);
  });

  it("makes the top seed's final far harder than their opener", () => {
    // Deliberately NOT a round-by-round monotonic assertion. In a real seeded
    // draw the early rounds are not monotonic: round 1 is one specific opponent
    // while round 2 is a probability-weighted pool of two, and that pool can be
    // weaker than the round-1 opponent depending on where the unseeded players
    // fell. What seeding does guarantee is the endpoints.
    const fixture = seededDraw({ drawSize: 32, seedsCount: 8 });
    const { series } = buildPressureSeries({ matchUps: fixture.matchUps });
    const topSeed = series.find((entry) => entry.participantId === fixture.topSeedId);
    const deltas = (topSeed?.points ?? [])
      .filter((point) => point.projected.expected !== null)
      .map((point) => point.projected.expected as number);
    expect(deltas.length).toBe(5);
    expect(deltas.at(-1) as number).toBeGreaterThan(deltas[0]);
    // And the back half is harder than the front half.
    const mean = (values: number[]) => values.reduce((total, value) => total + value, 0) / values.length;
    expect(mean(deltas.slice(3))).toBeGreaterThan(mean(deltas.slice(0, 2)));
  });

  it('gives byes to the seeds when the field is short', () => {
    const fixture = seededDraw({ drawSize: 16, seedsCount: 4, participantsCount: 12 });
    const { projections } = getProjectedPressure({ matchUps: fixture.matchUps });
    const topSeed = projections.find((entry) => entry.participantId === fixture.topSeedId);
    expect(topSeed?.rounds[0].bye).toBe(true);
  });
});

describe('a rating-seeded draw played to form', () => {
  it('is won by the top seed when there are no upsets', () => {
    const fixture = seededDraw({ drawSize: 16, seedsCount: 4, play: true });
    const { series } = buildPressureSeries({ matchUps: fixture.matchUps });
    const champion = series.find((entry) => entry.points.at(-1)?.won === true);
    expect(champion?.participantId).toBe(fixture.topSeedId);
  });

  it('records a planted upset as a loss for the favourite', () => {
    const fixture = seededDraw({ drawSize: 16, seedsCount: 4, play: true, upsetsInRounds: [2] });
    const { series } = buildPressureSeries({ matchUps: fixture.matchUps });
    const losses = series.flatMap((entry) => entry.points.filter((point) => point.won === false));
    expect(losses.length).toBeGreaterThan(0);
    // The upset is a three-setter, so it must classify as the closest band.
    const upsetRound = series
      .flatMap((entry) => entry.points)
      .filter((point) => point.roundNumber === 2 && point.competitiveness === 'COMPETITIVE');
    expect(upsetRound.length).toBeGreaterThan(0);
  });

  it('fills the actual series alongside the projection for every played round', () => {
    const fixture = seededDraw({ drawSize: 16, seedsCount: 4, play: true });
    const { series } = buildPressureSeries({ matchUps: fixture.matchUps });
    const champion = series.find((entry) => entry.points.at(-1)?.won === true);
    for (const point of champion?.points ?? []) {
      if (point.bye) continue;
      expect(point.actual).not.toBeNull();
      expect(point.projected.expected).not.toBeNull();
      expect(point.competitiveness).toBeDefined();
    }
  });
});
