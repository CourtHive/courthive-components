/**
 * `getActualPressure` — the difficulty a participant actually faced.
 *
 * Two axes, deliberately kept separate:
 *
 *  1. **Faced rating** — `signedDelta`, the opponent's rating minus the
 *     participant's own, on the common ELO-equivalent scale. Positive means they
 *     played up.
 *  2. **Scoreline closeness** — the COMPETITIVE / ROUTINE / DECISIVE bucket.
 *
 * The closeness classification is NOT recomputed here. It prefers
 * `matchUp.competitiveProfile.competitiveness`, which CFS already puts on the
 * wire (`getEventData` is called with `contextProfile: { withCompetitiveness: true }`),
 * and falls back to the shared local classifier that `burstChart` and
 * `competitivenessBar` use, so competitiveness reads identically everywhere.
 */

import { competitivenessForMatchUp } from '../burstChart/competitiveness';
import { resolveParticipantRating } from './ratingScale';
import { buildEliminationGraph, isByeMatchUp } from './drawGraph';

// constants and types
import type { CompetitivenessBucket } from '../competitivenessBar/types';
import type { GraphMatchUp, GraphSide } from './drawGraph';
import type { ActualRoundPressure, ParticipantActualPressure, ResolvedRating } from './types';

export type GetActualPressureParams = {
  matchUps: any[];
  matchUpType?: string;
  scaleName?: string;
};

function bucketFor(matchUp: GraphMatchUp): CompetitivenessBucket | undefined {
  const published = matchUp.raw?.competitiveProfile?.competitiveness;
  if (published) return published as CompetitivenessBucket;
  return competitivenessForMatchUp({
    winningSide: matchUp.winningSide,
    matchUpStatus: matchUp.matchUpStatus,
    sets: matchUp.raw?.score?.sets,
    scoreString: matchUp.raw?.score?.scoreStringSide1,
  });
}

function ratingFor(side: GraphSide | undefined, params: GetActualPressureParams): ResolvedRating | null {
  return resolveParticipantRating({
    participant: side?.participant,
    matchUpType: params.matchUpType,
    preferredScaleName: params.scaleName,
  });
}

function roundFor({
  matchUp,
  participantId,
  ownElo,
  params,
}: {
  matchUp: GraphMatchUp;
  participantId: string;
  ownElo: number | null;
  params: GetActualPressureParams;
}): ActualRoundPressure {
  const ownIndex = matchUp.sides.findIndex((side) => side.participantId === participantId);
  const opponent = matchUp.sides[1 - ownIndex];
  const bye = isByeMatchUp(matchUp);
  // A round-1 matchUp has hydrated sides from the moment the draw is made, so
  // "the opponent is known" is NOT the same as "the round was played". Only a
  // result makes this an ACTUAL data point; a known-but-unplayed opponent is
  // already modelled on the projection side as `resolved: true`. Emitting a
  // delta here would draw an actual-series marker for a match nobody has played.
  const played = Boolean(matchUp.winningSide);
  const opponentRating = bye || !played ? null : ratingFor(opponent, params);
  const opponentElo = opponentRating?.elo ?? null;

  return {
    roundNumber: matchUp.roundNumber,
    matchUpId: matchUp.matchUpId,
    opponentParticipantId: bye ? undefined : opponent?.participantId,
    opponentParticipantName: bye ? undefined : opponent?.participant?.participantName,
    opponentElo,
    signedDelta: opponentElo !== null && ownElo !== null ? opponentElo - ownElo : null,
    competitiveness: bye || !played ? undefined : bucketFor(matchUp),
    won: played ? matchUp.winningSide === ownIndex + 1 : undefined,
    bye,
  };
}

/**
 * Walk every matchUp a participant appears in and describe what they met.
 *
 * Only matchUps whose sides are hydrated contribute — an unplayed later round
 * has empty sides, so it simply produces no entry. That is the correct
 * behaviour: this series exists to show what *happened*.
 */
export function getActualPressure(params: GetActualPressureParams): ParticipantActualPressure[] {
  const { graph } = buildEliminationGraph(params.matchUps);
  if (!graph) return [];

  const appearances = new Map<string, GraphMatchUp[]>();
  const ratings = new Map<string, ResolvedRating | null>();

  for (const round of graph.byRound.values()) {
    for (const matchUp of round.values()) {
      for (const side of matchUp.sides) {
        if (side.bye || !side.participantId) continue;
        const list = appearances.get(side.participantId) ?? [];
        list.push(matchUp);
        appearances.set(side.participantId, list);
        if (!ratings.has(side.participantId)) ratings.set(side.participantId, ratingFor(side, params));
      }
    }
  }

  return [...appearances.entries()].map(([participantId, matchUps]) => {
    const rating = ratings.get(participantId) ?? null;
    const rounds = matchUps
      .toSorted((a, b) => a.roundNumber - b.roundNumber)
      .map((matchUp) => roundFor({ matchUp, participantId, ownElo: rating?.elo ?? null, params }));

    const rated = rounds.filter((round) => !round.bye && round.signedDelta !== null);
    return {
      participantId,
      rating,
      rounds,
      facedDifficulty: rated.length
        ? rated.reduce((total, round) => total + (round.signedDelta as number), 0) / rated.length
        : null,
      matchesPlayed: rounds.filter((round) => !round.bye && round.won !== undefined).length,
    };
  });
}
