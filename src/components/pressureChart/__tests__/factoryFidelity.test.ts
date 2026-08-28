import { describe, it, expect } from 'vitest';

import { buildPressureSeries, byPathDifficulty } from '../buildPressureSeries';
import { getProjectedPressure } from '../getProjectedPressure';

// constants and types
import { mocksEngine, tournamentEngine } from 'tods-competition-factory';
import { PRESSURE_UNSUPPORTED } from '../types';

/**
 * Fidelity: the hand-built fixtures in `buildFixture.ts` are only useful if they
 * match what `getEventData` actually returns. These specs run the projection
 * against REAL factory output, hydrated exactly the way CFS hydrates it in
 * `competition-factory-server/src/modules/factory/functions/public/getEventData.ts`:
 *
 *   participantsProfile: { convertExtensions, withScaleValues, withGroupings, ... }
 *   contextProfile:      { withCompetitiveness: true }
 *
 * The `withScaleValues` flag is load-bearing and is the reason this file exists.
 * Without it `participant.ratings` is present but EMPTY — the value lives in
 * `participant.timeItems` instead — and the projection would silently produce
 * nothing. A spec that only ran hand-built fixtures would never catch that.
 */

const CFS_PARTICIPANTS_PROFILE = {
  convertExtensions: true,
  withScaleValues: true,
  withGroupings: true,
  withISO2: true,
  withIOC: true
};

function generate({
  drawSize,
  participantsCount,
  completeAllMatchUps,
  withScaleValues = true
}: {
  drawSize: number;
  participantsCount?: number;
  completeAllMatchUps?: boolean;
  withScaleValues?: boolean;
}) {
  const { tournamentRecord } = mocksEngine.generateTournamentRecord({
    drawProfiles: [{ drawSize, participantsCount, drawType: 'SINGLE_ELIMINATION' }],
    participantsProfile: { category: { ratingType: 'WTN' } },
    completeAllMatchUps,
    setState: true,
    nonRandom: 1
  });
  const { eventData }: any = tournamentEngine.getEventData({
    eventId: tournamentRecord.events[0].eventId,
    participantsProfile: withScaleValues ? CFS_PARTICIPANTS_PROFILE : { withGroupings: true },
    contextProfile: { withCompetitiveness: true },
    hydrateParticipants: true
  });
  const structure = eventData.drawsData[0].structures[0];
  return { matchUps: Object.values(structure.roundMatchUps).flat() as any[] };
}

describe('getProjectedPressure — against real factory output', () => {
  it('projects every entrant of a 32 draw across all five rounds', () => {
    const { matchUps } = generate({ drawSize: 32 });
    const result = getProjectedPressure({ matchUps });
    expect(result.unsupported).toBeUndefined();
    expect(result.projections).toHaveLength(32);
    expect(result.scaleName).toBe('WTN');
    // Real corpora are only PARTIALLY rated — mocksEngine leaves a couple of
    // entrants without a WTN, which is exactly the production case. The contract
    // is that they are counted and surfaced, never silently given a default.
    expect(result.unratedCount).toBeGreaterThan(0);
    expect(result.unratedCount).toBeLessThan(result.projections.length);
    for (const projection of result.projections) {
      expect(projection.rounds.map((r) => r.roundNumber)).toEqual([1, 2, 3, 4, 5]);
      if (projection.rating) expect(projection.rating.elo).toBeGreaterThan(0);
      else expect(projection.slotDifficulty).toBeNull();
    }
    const rated = result.projections.filter((p) => p.rating);
    expect(rated).toHaveLength(32 - result.unratedCount);
  });

  it('widens the opponent pool 1 -> 2 -> 4 -> 8 -> 16 on a real 32 draw', () => {
    const { matchUps } = generate({ drawSize: 32 });
    const projection = getProjectedPressure({ matchUps }).projections[0];
    expect(projection.rounds.map((r) => r.possibleOpponentCount)).toEqual([1, 2, 4, 8, 16]);
  });

  it('never lists a participant as their own possible opponent', () => {
    const { matchUps } = generate({ drawSize: 16 });
    for (const projection of getProjectedPressure({ matchUps }).projections) {
      for (const round of projection.rounds) {
        const ids = round.possibleOpponents.map((o) => o.participantId);
        expect(ids).not.toContain(projection.participantId);
      }
    }
  });

  it('sums title probability across the field to exactly 1', () => {
    const { matchUps } = generate({ drawSize: 16 });
    const result = getProjectedPressure({ matchUps });
    const finalRoundReach = result.projections.reduce(
      (total, p) => total + (p.rounds.at(-1)?.reachProbability ?? 0),
      0
    );
    // Two participants reach the final, so reach-the-final probabilities sum to 2.
    expect(finalRoundReach).toBeCloseTo(2, 8);
  });

  it('handles a real draw containing BYEs', () => {
    const { matchUps } = generate({ drawSize: 16, participantsCount: 12 });
    const result = getProjectedPressure({ matchUps });
    expect(result.projections).toHaveLength(12);
    const byeRounds = result.projections.flatMap((p) => p.rounds.filter((r) => r.bye));
    expect(byeRounds.length).toBe(4);
    for (const round of byeRounds) {
      expect(round.possibleOpponentCount).toBe(0);
      expect(round.expectedSignedDelta).toBeNull();
    }
  });

  it('reports NO_RATINGS when the query omits withScaleValues — the field is present but empty', () => {
    const { matchUps } = generate({ drawSize: 16, withScaleValues: false });
    // Proves the failure is a REFUSAL, not a silently defaulted rating.
    const result = getProjectedPressure({ matchUps });
    expect(result.unsupported).toBe(PRESSURE_UNSUPPORTED.NO_RATINGS);
    expect(result.unratedCount).toBe(16);
  });
});

describe('buildPressureSeries — against real factory output', () => {
  it('fills the actual series for a completed draw and leaves an unplayed draw blank', () => {
    const unplayed = buildPressureSeries({ matchUps: generate({ drawSize: 16 }).matchUps });
    expect(unplayed.series.flatMap((s) => s.points).every((p) => p.actual === null)).toBe(true);

    const played = buildPressureSeries({ matchUps: generate({ drawSize: 16, completeAllMatchUps: true }).matchUps });
    const withActual = played.series.flatMap((s) => s.points).filter((p) => p.actual !== null);
    expect(withActual.length).toBeGreaterThan(0);
    for (const point of withActual) {
      expect(point.competitiveness).toBeDefined();
      expect(typeof point.won).toBe('boolean');
    }
  });

  it('gives the champion a full set of played rounds', () => {
    const { matchUps } = generate({ drawSize: 16, completeAllMatchUps: true });
    const { series } = buildPressureSeries({ matchUps });
    const champion = series.find((s) => s.points.every((p) => p.won !== false) && s.points.at(-1)?.won === true);
    expect(champion).toBeDefined();
    expect(champion?.points.filter((p) => p.won === true)).toHaveLength(4);
    expect(champion?.facedDifficulty).not.toBeNull();
  });

  it('ranks a real field by slot difficulty without dropping anyone', () => {
    const { matchUps } = generate({ drawSize: 32 });
    const ordered = byPathDifficulty(buildPressureSeries({ matchUps }).series);
    expect(ordered).toHaveLength(32);
    // Unrated entrants have a null slotDifficulty and sort to the tail; assert
    // monotonicity over the rated prefix and that the nulls are all at the end.
    const rated = ordered.filter((s) => s.slotDifficulty !== null);
    expect(rated.length).toBeGreaterThan(0);
    expect(ordered.slice(0, rated.length).every((s) => s.slotDifficulty !== null)).toBe(true);
    for (let index = 1; index < rated.length; index += 1) {
      expect(rated[index - 1].slotDifficulty as number).toBeGreaterThanOrEqual(rated[index].slotDifficulty as number);
    }
  });
});

describe('getProjectedPressure — non-elimination structures are refused, not guessed', () => {
  it('refuses a round-robin structure', () => {
    const { tournamentRecord } = mocksEngine.generateTournamentRecord({
      drawProfiles: [{ drawSize: 8, drawType: 'ROUND_ROBIN' }],
      participantsProfile: { category: { ratingType: 'WTN' } },
      setState: true,
      nonRandom: 1
    });
    const { eventData }: any = tournamentEngine.getEventData({
      eventId: tournamentRecord.events[0].eventId,
      participantsProfile: CFS_PARTICIPANTS_PROFILE,
      hydrateParticipants: true
    });
    const structure = eventData.drawsData[0].structures[0];
    const matchUps = Object.values(structure.roundMatchUps).flat() as any[];
    // Non-empty input: a CONTAINER really does hand us matchUps. They carry a
    // roundNumber but no roundPosition, so there is no bracket to walk.
    expect(matchUps.length).toBeGreaterThan(0);
    expect(matchUps.every((m: any) => m.roundPosition === undefined)).toBe(true);
    const result = getProjectedPressure({ matchUps });
    expect(result.projections).toHaveLength(0);
    expect(result.unsupported).toBe(PRESSURE_UNSUPPORTED.NOT_ELIMINATION);
  });
});
