/**
 * Merge the projected and actual series into one chart-ready shape.
 *
 * Everything is expressed in **signed-delta space** — opponent rating minus the
 * participant's own — so both series share a single y-axis whose zero line means
 * "an even match". That is deliberate: a dual-axis chart would be the obvious way
 * to plot "difficulty" against "closeness" and it would be wrong. Closeness rides
 * the marker instead (`competitiveness` on each point), never a second scale.
 */

import { getProjectedPressure } from './getProjectedPressure';
import { getActualPressure } from './getActualPressure';

// constants and types
import type { GetProjectedPressureParams } from './getProjectedPressure';
import type { ProjectedPressureResult, PressureSeries, PressureSeriesPoint } from './types';

export type BuildPressureSeriesParams = GetProjectedPressureParams;

export type PressureSeriesResult = {
  series: PressureSeries[];
  projection: ProjectedPressureResult;
  /** The rating scale the values were read from, for axis labelling. */
  scaleName?: string;
  unratedCount: number;
};

export function buildPressureSeries(params: BuildPressureSeriesParams): PressureSeriesResult {
  const projection = getProjectedPressure(params);
  if (!projection.projections.length) {
    return { series: [], projection, scaleName: projection.scaleName, unratedCount: projection.unratedCount };
  }

  const actualByParticipant = new Map(
    getActualPressure({
      matchUps: params.matchUps,
      matchUpType: params.matchUpType,
      scaleName: params.scaleName,
    }).map((entry) => [entry.participantId, entry]),
  );

  const series = projection.projections.map((participantProjection) => {
    const actual = actualByParticipant.get(participantProjection.participantId);
    const actualByRound = new Map((actual?.rounds ?? []).map((round) => [round.roundNumber, round]));
    const ownElo = participantProjection.rating?.elo ?? null;

    const points: PressureSeriesPoint[] = participantProjection.rounds.map((round) => {
      const played = actualByRound.get(round.roundNumber);
      const range = round.opponentEloRange;
      return {
        roundNumber: round.roundNumber,
        projected: {
          expected: round.expectedSignedDelta,
          low: range && ownElo !== null ? range[0] - ownElo : null,
          high: range && ownElo !== null ? range[1] - ownElo : null,
        },
        reachProbability: round.reachProbability,
        actual: played?.signedDelta ?? null,
        competitiveness: played?.competitiveness,
        won: played?.won,
        bye: round.bye || Boolean(played?.bye),
        resolved: round.resolved,
      };
    });

    return {
      participantId: participantProjection.participantId,
      participantName: participantProjection.participantName,
      drawPosition: participantProjection.drawPosition,
      rating: participantProjection.rating,
      pathDifficulty: participantProjection.pathDifficulty,
      slotDifficulty: participantProjection.slotDifficulty,
      facedDifficulty: actual?.facedDifficulty ?? null,
      points,
    };
  });

  return { series, projection, scaleName: projection.scaleName, unratedCount: projection.unratedCount };
}

/**
 * Participants ordered hardest SLOT first — the ranked "path difficulty" view,
 * and the entry point of the all-players surface.
 *
 * Sorts on `slotDifficulty`, not `pathDifficulty`: the reach-weighted figure
 * discounts the late rounds a weak player is unlikely to reach, so ranking on it
 * would report the toughest draws in the field as the easiest. Unrated
 * participants sort last rather than being dropped, so the field size stays honest.
 */
export function byPathDifficulty(series: PressureSeries[]): PressureSeries[] {
  return series.toSorted((a, b) => {
    if (a.slotDifficulty === null && b.slotDifficulty === null) {
      return (a.participantName ?? '').localeCompare(b.participantName ?? '', 'en', { numeric: true });
    }
    if (a.slotDifficulty === null) return 1;
    if (b.slotDifficulty === null) return -1;
    return b.slotDifficulty - a.slotDifficulty;
  });
}
