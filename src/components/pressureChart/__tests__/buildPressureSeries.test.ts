import { describe, it, expect } from 'vitest';

import { buildEliminationFixture, completeMatchUp, WTN } from './buildFixture';
import { buildPressureSeries, byPathDifficulty } from '../buildPressureSeries';
import { getActualPressure } from '../getActualPressure';
import { ratingToElo } from '../ratingScale';

const STRONG = 5;
const WEAK = 30;

function fourDraw() {
  return buildEliminationFixture({
    entrants: [
      { participantId: 'p1', rating: STRONG },
      { participantId: 'p2', rating: 6 },
      { participantId: 'p3', rating: WEAK },
      { participantId: 'p4', rating: 31 },
    ],
  });
}

function seriesFor(result: ReturnType<typeof buildPressureSeries>, participantId: string) {
  const series = result.series.find((s) => s.participantId === participantId);
  if (!series) throw new Error(`no series for ${participantId}`);
  return series;
}

describe('getActualPressure', () => {
  it('produces no played rounds for an untouched draw', () => {
    const actual = getActualPressure({ matchUps: fourDraw() });
    for (const entry of actual) {
      expect(entry.rounds.every((round) => round.won === undefined)).toBe(true);
      expect(entry.matchesPlayed).toBe(0);
      expect(entry.facedDifficulty).not.toBeUndefined();
    }
  });

  it('records the opponent, the signed delta and the closeness bucket for a played matchUp', () => {
    const matchUps = fourDraw();
    completeMatchUp({
      matchUps,
      matchUpId: 'r1p1',
      winningSide: 1,
      sets: [
        { side1Score: 7, side2Score: 6 },
        { side1Score: 7, side2Score: 6 },
      ],
    });
    const actual = getActualPressure({ matchUps }).find((entry) => entry.participantId === 'p1');
    const round1 = actual?.rounds.find((round) => round.roundNumber === 1);
    expect(round1?.opponentParticipantId).toBe('p2');
    expect(round1?.won).toBe(true);
    // p2 (WTN 6) is weaker than p1 (WTN 5), so p1 played DOWN: negative delta.
    expect(round1?.signedDelta).toBeLessThan(0);
    // Two tiebreak sets is as close as a match gets.
    expect(round1?.competitiveness).toBe('COMPETITIVE');
    expect(actual?.matchesPlayed).toBe(1);
  });

  it('classifies a lopsided scoreline as DECISIVE', () => {
    const matchUps = fourDraw();
    completeMatchUp({
      matchUps,
      matchUpId: 'r1p1',
      winningSide: 1,
      sets: [
        { side1Score: 6, side2Score: 0 },
        { side1Score: 6, side2Score: 0 },
      ],
    });
    const actual = getActualPressure({ matchUps }).find((entry) => entry.participantId === 'p1');
    expect(actual?.rounds[0].competitiveness).toBe('DECISIVE');
  });

  it('prefers a published competitiveProfile over recomputing from the score', () => {
    const matchUps = fourDraw();
    completeMatchUp({
      matchUps,
      matchUpId: 'r1p1',
      winningSide: 1,
      sets: [
        { side1Score: 6, side2Score: 0 },
        { side1Score: 6, side2Score: 0 },
      ],
    });
    const target = matchUps.find((m) => m.matchUpId === 'r1p1');
    target.competitiveProfile = { competitiveness: 'ROUTINE' };
    const actual = getActualPressure({ matchUps }).find((entry) => entry.participantId === 'p1');
    expect(actual?.rounds[0].competitiveness).toBe('ROUTINE');
  });

  it('marks a bye round and gives it no opponent or closeness', () => {
    const matchUps = buildEliminationFixture({
      entrants: [
        { participantId: 'p1', rating: 10 },
        { bye: true, participantId: 'bye1' },
        { participantId: 'p3', rating: 12 },
        { participantId: 'p4', rating: 14 },
      ],
    });
    const actual = getActualPressure({ matchUps }).find((entry) => entry.participantId === 'p1');
    expect(actual?.rounds[0].bye).toBe(true);
    expect(actual?.rounds[0].opponentParticipantId).toBeUndefined();
    expect(actual?.rounds[0].competitiveness).toBeUndefined();
    expect(actual?.rounds[0].signedDelta).toBeNull();
  });
});

describe('buildPressureSeries', () => {
  it('puts both series on one signed-delta axis, with the band expressed as deltas', () => {
    const result = buildPressureSeries({ matchUps: fourDraw() });
    const p1 = seriesFor(result, 'p1');
    const ownElo = ratingToElo({ scaleName: WTN, value: STRONG }) as number;
    const round2 = p1.points[1];
    expect(round2.projected.low).toBeCloseTo((ratingToElo({ scaleName: WTN, value: 31 }) as number) - ownElo, 6);
    expect(round2.projected.high).toBeCloseTo((ratingToElo({ scaleName: WTN, value: WEAK }) as number) - ownElo, 6);
    // A strong player facing the weak half projects well BELOW the zero line.
    expect(round2.projected.expected as number).toBeLessThan(0);
  });

  it('leaves actual null until the round is played, then fills it alongside the projection', () => {
    const matchUps = fourDraw();
    expect(seriesFor(buildPressureSeries({ matchUps }), 'p1').points[0].actual).toBeNull();

    completeMatchUp({ matchUps, matchUpId: 'r1p1', winningSide: 1 });
    const point = seriesFor(buildPressureSeries({ matchUps }), 'p1').points[0];
    expect(point.actual).not.toBeNull();
    expect(point.projected.expected).not.toBeNull();
    expect(point.competitiveness).toBeDefined();
    expect(point.won).toBe(true);
  });

  it('reports the scale it read so the axis can be labelled honestly', () => {
    expect(buildPressureSeries({ matchUps: fourDraw() }).scaleName).toBe(WTN);
  });

  it('returns an empty series — not a fabricated one — for an unrated field', () => {
    const matchUps = buildEliminationFixture({
      entrants: [1, 2, 3, 4].map((n) => ({ participantId: `p${n}` })),
    });
    const result = buildPressureSeries({ matchUps });
    expect(result.series).toHaveLength(0);
    expect(result.projection.unsupported).toBe('NO_RATINGS');
  });
});

describe('byPathDifficulty', () => {
  it('orders hardest SLOT first — the weakest player has the hardest draw', () => {
    const result = buildPressureSeries({ matchUps: fourDraw() });
    const ordered = byPathDifficulty(result.series);
    // p4 (WTN 31) is the weakest and must walk past p3 then the strong half.
    expect(ordered[0].participantId).toBe('p4');
    // p1 (WTN 5) is the strongest and plays down all the way.
    expect(ordered.at(-1)?.participantId).toBe('p1');
  });

  it('would rank WRONGLY on the reach-weighted figure — which is why it does not', () => {
    // Guards the distinction between the two metrics. `pathDifficulty` discounts
    // rounds a weak player is unlikely to reach, so ordering on it puts p3 above
    // p4 even though p4 has strictly the harder road. If these two ever agree for
    // this fixture the metrics have been conflated and the ranked view is lying.
    const { series } = buildPressureSeries({ matchUps: fourDraw() });
    const byReachWeighted = series.toSorted(
      (a, b) => (b.pathDifficulty as number) - (a.pathDifficulty as number),
    );
    expect(byReachWeighted[0].participantId).toBe('p3');
    expect(byPathDifficulty(series)[0].participantId).toBe('p4');
  });

  it('rates the weakest player the hardest slot and the strongest the easiest', () => {
    const { series } = buildPressureSeries({ matchUps: fourDraw() });
    const slot = new Map(series.map((s) => [s.participantId, s.slotDifficulty as number]));
    expect(slot.get('p4')).toBeGreaterThan(slot.get('p3') as number);
    expect(slot.get('p3')).toBeGreaterThan(slot.get('p2') as number);
    expect(slot.get('p2')).toBeGreaterThan(slot.get('p1') as number);
  });

  it('sorts unrated participants last instead of dropping them', () => {
    const matchUps = buildEliminationFixture({
      entrants: [
        { participantId: 'p1', rating: STRONG },
        { participantId: 'p2', rating: 6 },
        { participantId: 'p3', rating: WEAK },
        { participantId: 'unrated' },
      ],
    });
    const ordered = byPathDifficulty(buildPressureSeries({ matchUps }).series);
    expect(ordered).toHaveLength(4);
    expect(ordered.at(-1)?.participantId).toBe('unrated');
  });
});
