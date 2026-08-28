/**
 * `getProjectedPressure` — how hard is each participant's road?
 *
 * For every entrant in a single-elimination structure, forward-propagate the
 * bracket to get, per round:
 *
 *  - the probability the participant reaches that round,
 *  - the probability-weighted mean rating of the opponents who could arrive from
 *    the sibling sub-bracket, and the range across them,
 *  - the signed delta of that against the participant's own rating.
 *
 * The key simplification, and why this stays cheap: **the opponent distribution
 * at round `r` is exactly the winner distribution of the sibling sub-bracket.**
 * The two sub-brackets are disjoint, so no conditioning on the participant's own
 * survival is needed.
 *
 * PURITY NOTE — this module is a candidate for promotion into
 * `tods-competition-factory`. It therefore takes plain matchUps, touches no DOM,
 * imports nothing from the component library, and returns plain data. Its only
 * dependencies are the factory's own public `fixtures` (via `ratingScale`) and
 * two local pure modules.
 */

import { buildEliminationGraph, feederPositions, isByeMatchUp } from './drawGraph';
import { resolveParticipantRating, dominantScaleName } from './ratingScale';
import { winProbability } from './winProbability';

// constants and types
import type { EliminationGraph, GraphMatchUp, GraphSide } from './drawGraph';
import type { WinProbabilityModel } from './winProbability';
import { PRESSURE_UNSUPPORTED } from './types';
import type {
  ParticipantPressureProjection,
  ProjectedRoundPressure,
  ProjectedPressureResult,
  PossibleOpponent,
  ResolvedRating
} from './types';

/** Opponents below this arrival probability are excluded from the displayed range. */
export const DEFAULT_RANGE_THRESHOLD = 0.01;

type Distribution = Map<string, number>;

export type GetProjectedPressureParams = {
  /** Structure matchUps, hydrated with sides + participants. */
  matchUps: any[];
  /** SINGLES (default) or DOUBLES — selects which ratings block to read. */
  matchUpType?: string;
  /** Prefer this scale when a participant carries several. */
  scaleName?: string;
  /** Pairwise model knobs; see `winProbability`. */
  model?: WinProbabilityModel;
  /**
   * When true, a played matchUp collapses to its actual winner, so the
   * projection reads "from here". Default **false** — the untouched projection
   * is what the draw said at the outset, which is the comparison the chart makes.
   */
  respectResults?: boolean;
  /** Arrival-probability floor for inclusion in `opponentEloRange`. */
  rangeThreshold?: number;
};

type Context = {
  eloOf: Map<string, number | null>;
  model?: WinProbabilityModel;
  respectResults: boolean;
};

function sideParticipantIds(matchUp: GraphMatchUp): (string | undefined)[] {
  return matchUp.sides.map((side: GraphSide) => (side.bye ? undefined : side.participantId));
}

/** Winner distribution for a first-round matchUp. A bye advances the present side outright. */
function firstRoundDistribution(matchUp: GraphMatchUp, context: Context): Distribution {
  const distribution: Distribution = new Map();
  const [first, second] = sideParticipantIds(matchUp);

  if (context.respectResults && matchUp.winningSide) {
    const winnerId = sideParticipantIds(matchUp)[matchUp.winningSide - 1];
    if (winnerId) distribution.set(winnerId, 1);
    return distribution;
  }

  if (first && !second) distribution.set(first, 1);
  else if (second && !first) distribution.set(second, 1);
  else if (first && second) {
    const probability = winProbability(
      context.eloOf.get(first) ?? null,
      context.eloOf.get(second) ?? null,
      context.model
    );
    distribution.set(first, probability);
    distribution.set(second, 1 - probability);
  }
  return distribution;
}

/** Probability that `candidate` beats a field drawn from `opposing`. */
function beatsField(candidate: string, opposing: Distribution, context: Context): number {
  if (!opposing.size) return 1;
  let total = 0;
  for (const [opponentId, opponentProbability] of opposing) {
    total +=
      opponentProbability *
      winProbability(context.eloOf.get(candidate) ?? null, context.eloOf.get(opponentId) ?? null, context.model);
  }
  return total;
}

function mergeDistributions(sideA: Distribution, sideB: Distribution, context: Context): Distribution {
  const distribution: Distribution = new Map();
  if (!sideA.size) return new Map(sideB);
  if (!sideB.size) return new Map(sideA);
  for (const [id, arrival] of sideA) distribution.set(id, arrival * beatsField(id, sideB, context));
  for (const [id, arrival] of sideB) distribution.set(id, arrival * beatsField(id, sideA, context));
  return distribution;
}

function laterRoundDistribution(
  matchUp: GraphMatchUp,
  feeders: [Distribution, Distribution],
  context: Context
): Distribution {
  if (context.respectResults && matchUp.winningSide) {
    const winnerId = sideParticipantIds(matchUp)[matchUp.winningSide - 1];
    if (winnerId) return new Map([[winnerId, 1]]);
  }
  return mergeDistributions(feeders[0], feeders[1], context);
}

/** roundNumber -> roundPosition -> distribution over who wins that matchUp. */
function buildWinnerDistributions(graph: EliminationGraph, context: Context): Map<number, Map<number, Distribution>> {
  const winners = new Map<number, Map<number, Distribution>>();
  for (const roundNumber of graph.roundNumbers) {
    const round = graph.byRound.get(roundNumber);
    const forRound = new Map<number, Distribution>();
    if (!round) continue;
    for (const [roundPosition, matchUp] of round) {
      if (roundNumber === graph.firstRound) {
        forRound.set(roundPosition, firstRoundDistribution(matchUp, context));
        continue;
      }
      const previous = winners.get(roundNumber - 1);
      const [firstFeeder, secondFeeder] = feederPositions(roundPosition);
      const feeders: [Distribution, Distribution] = [
        previous?.get(firstFeeder) ?? new Map(),
        previous?.get(secondFeeder) ?? new Map()
      ];
      forRound.set(roundPosition, laterRoundDistribution(matchUp, feeders, context));
    }
    winners.set(roundNumber, forRound);
  }
  return winners;
}

type OpponentSummary = Pick<
  ProjectedRoundPressure,
  'expectedOpponentElo' | 'opponentEloRange' | 'possibleOpponentCount' | 'possibleOpponents'
>;

function summariseOpponents({
  opponents,
  context,
  names,
  rangeThreshold
}: {
  opponents: Distribution;
  context: Context;
  names: Map<string, string | undefined>;
  rangeThreshold: number;
}): OpponentSummary {
  let weightTotal = 0;
  let weightedElo = 0;
  const inRange: number[] = [];
  const possibleOpponents: PossibleOpponent[] = [];

  for (const [opponentId, probability] of opponents) {
    const elo = context.eloOf.get(opponentId) ?? null;
    possibleOpponents.push({
      participantId: opponentId,
      participantName: names.get(opponentId),
      probability,
      elo
    });
    if (elo === null) continue;
    weightTotal += probability;
    weightedElo += probability * elo;
    if (probability >= rangeThreshold) inRange.push(elo);
  }

  return {
    expectedOpponentElo: weightTotal ? weightedElo / weightTotal : null,
    opponentEloRange: inRange.length ? [Math.min(...inRange), Math.max(...inRange)] : null,
    possibleOpponentCount: opponents.size,
    possibleOpponents: possibleOpponents.toSorted(
      (a, b) => b.probability - a.probability || a.participantId.localeCompare(b.participantId, 'en')
    )
  };
}

/** The participant's opponent pool at `roundNumber`: the sibling feeder's winners. */
function opponentsAtRound({
  graph,
  winners,
  roundNumber,
  feederPosition
}: {
  graph: EliminationGraph;
  winners: Map<number, Map<number, Distribution>>;
  roundNumber: number;
  feederPosition: number;
}): Distribution {
  if (roundNumber === graph.firstRound) return new Map();
  const siblingPosition = feederPosition % 2 === 1 ? feederPosition + 1 : feederPosition - 1;
  return winners.get(roundNumber - 1)?.get(siblingPosition) ?? new Map();
}

function firstRoundOpponent(matchUp: GraphMatchUp, participantId: string): Distribution {
  const distribution: Distribution = new Map();
  for (const side of matchUp.sides) {
    if (side.bye || !side.participantId || side.participantId === participantId) continue;
    distribution.set(side.participantId, 1);
  }
  return distribution;
}

function projectParticipant({
  participantId,
  entryMatchUp,
  graph,
  winners,
  context,
  ratings,
  names,
  rangeThreshold
}: {
  participantId: string;
  entryMatchUp: GraphMatchUp;
  graph: EliminationGraph;
  winners: Map<number, Map<number, Distribution>>;
  context: Context;
  ratings: Map<string, ResolvedRating | null>;
  names: Map<string, string | undefined>;
  rangeThreshold: number;
}): ParticipantPressureProjection {
  const rating = ratings.get(participantId) ?? null;
  const rounds: ProjectedRoundPressure[] = [];
  // `position` is the participant's roundPosition in the round being processed;
  // `previousPosition` is the feeder slot they arrived from, which is what
  // identifies the SIBLING feeder holding their possible opponents.
  let position = entryMatchUp.roundPosition;
  let previousPosition = position;
  let reachProbability = 1;

  for (const roundNumber of graph.roundNumbers) {
    const matchUp = graph.byRound.get(roundNumber)?.get(position);
    const bye = roundNumber === graph.firstRound && !!matchUp && isByeMatchUp(matchUp);
    const opponents =
      roundNumber === graph.firstRound && matchUp
        ? firstRoundOpponent(matchUp, participantId)
        : opponentsAtRound({ graph, winners, roundNumber, feederPosition: previousPosition });

    const summary = summariseOpponents({ opponents, context, names, rangeThreshold });
    const expectedSignedDelta =
      summary.expectedOpponentElo !== null && rating ? summary.expectedOpponentElo - rating.elo : null;

    rounds.push({
      roundNumber,
      reachProbability,
      expectedSignedDelta,
      resolved: summary.possibleOpponentCount === 1,
      bye,
      ...summary
    });

    reachProbability = winners.get(roundNumber)?.get(position)?.get(participantId) ?? 0;
    previousPosition = position;
    position = Math.ceil(position / 2);
  }

  return {
    participantId,
    participantName: entryMatchUp.sides.find((s) => s.participantId === participantId)?.participant?.participantName,
    drawPosition: entryMatchUp.sides.find((s) => s.participantId === participantId)?.drawPosition,
    rating,
    rounds,
    pathDifficulty: weightedPathDifficulty(rounds),
    slotDifficulty: unweightedSlotDifficulty(rounds),
    expectedMatchesPlayed: rounds.reduce((total, round) => total + (round.bye ? 0 : round.reachProbability), 0)
  };
}

/** Reach-weighted mean signed delta — the difficulty actually expected to be *experienced*. */
function weightedPathDifficulty(rounds: ProjectedRoundPressure[]): number | null {
  let weight = 0;
  let total = 0;
  for (const round of rounds) {
    if (round.bye || round.expectedSignedDelta === null) continue;
    weight += round.reachProbability;
    total += round.reachProbability * round.expectedSignedDelta;
  }
  return weight ? total / weight : null;
}

/**
 * Unweighted mean signed delta across every round carrying a rated opponent —
 * how hard the SLOT is, independent of whether its occupant is likely to survive
 * to walk it. Ranking on the reach-weighted figure instead would make a weak
 * player's brutal draw look easy, because the brutal rounds get discounted by
 * that player's small chance of reaching them.
 */
function unweightedSlotDifficulty(rounds: ProjectedRoundPressure[]): number | null {
  const deltas = rounds
    .filter((round) => !round.bye && round.expectedSignedDelta !== null)
    .map((round) => round.expectedSignedDelta as number);
  if (!deltas.length) return null;
  return deltas.reduce((total, delta) => total + delta, 0) / deltas.length;
}

function collectEntrants(graph: EliminationGraph): Map<string, GraphMatchUp> {
  const entrants = new Map<string, GraphMatchUp>();
  const firstRound = graph.byRound.get(graph.firstRound);
  if (!firstRound) return entrants;
  for (const matchUp of firstRound.values()) {
    for (const side of matchUp.sides) {
      if (side.bye || !side.participantId) continue;
      entrants.set(side.participantId, matchUp);
    }
  }
  return entrants;
}

export function getProjectedPressure(params: GetProjectedPressureParams): ProjectedPressureResult {
  const { graph, unsupported } = buildEliminationGraph(params.matchUps);
  if (!graph) return { projections: [], unsupported, unratedCount: 0 };

  const entrants = collectEntrants(graph);
  if (!entrants.size) return { projections: [], unsupported: PRESSURE_UNSUPPORTED.NO_MATCHUPS, unratedCount: 0 };

  const ratings = new Map<string, ResolvedRating | null>();
  const eloOf = new Map<string, number | null>();
  const names = new Map<string, string | undefined>();
  for (const [participantId, matchUp] of entrants) {
    const side = matchUp.sides.find((s) => s.participantId === participantId);
    const rating = resolveParticipantRating({
      participant: side?.participant,
      matchUpType: params.matchUpType,
      preferredScaleName: params.scaleName
    });
    ratings.set(participantId, rating);
    eloOf.set(participantId, rating?.elo ?? null);
    names.set(participantId, side?.participant?.participantName);
  }

  const unratedCount = [...ratings.values()].filter((rating) => !rating).length;
  if (unratedCount === ratings.size) {
    return { projections: [], unsupported: PRESSURE_UNSUPPORTED.NO_RATINGS, unratedCount };
  }

  const context: Context = { eloOf, model: params.model, respectResults: Boolean(params.respectResults) };
  const winners = buildWinnerDistributions(graph, context);
  const rangeThreshold = params.rangeThreshold ?? DEFAULT_RANGE_THRESHOLD;

  const projections = [...entrants.entries()].map(([participantId, entryMatchUp]) =>
    projectParticipant({ participantId, entryMatchUp, graph, winners, context, ratings, names, rangeThreshold })
  );

  return {
    projections: projections.toSorted((a, b) => (a.drawPosition ?? 0) - (b.drawPosition ?? 0)),
    scaleName: dominantScaleName([...ratings.values()]),
    unratedCount
  };
}
