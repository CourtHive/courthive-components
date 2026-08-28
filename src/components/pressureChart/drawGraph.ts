/**
 * Elimination draw graph.
 *
 * The feeding rule — **round `r` position `p` is fed by round `r-1` positions
 * `2p-1` and `2p`** — was verified empirically against factory output rather
 * than assumed, because `drawPositions` is `undefined` on every matchUp beyond
 * round 1 until that matchUp is played. A completed 16 draw resolves to
 * `R2P1 dp=[1,3]` (winners of `R1P1 dp=[1,2]` and `R1P2 dp=[3,4]`),
 * `R3P1 dp=[1,5]`, `R4P1 dp=[1,9]` — the standard balanced binary tree.
 *
 * That is also why this module never reads `drawPositions` for round > 1: on an
 * unplayed draw the field is simply not there, and projecting a path is exactly
 * the case where the draw is unplayed.
 */

// constants and types
import type { PressureUnsupportedReason } from './types';
import { PRESSURE_UNSUPPORTED } from './types';

export const BYE_STATUS = 'BYE';

export type GraphSide = {
  participantId?: string;
  participant?: any;
  drawPosition?: number;
  bye: boolean;
};

export type GraphMatchUp = {
  matchUpId?: string;
  roundNumber: number;
  roundPosition: number;
  sides: [GraphSide, GraphSide];
  winningSide?: number;
  matchUpStatus?: string;
  raw: any;
};

export type EliminationGraph = {
  roundNumbers: number[];
  /** roundNumber -> roundPosition -> matchUp */
  byRound: Map<number, Map<number, GraphMatchUp>>;
  firstRound: number;
};

function toSide(side: any): GraphSide {
  return {
    participantId: side?.participant?.participantId ?? side?.participantId,
    participant: side?.participant,
    drawPosition: side?.drawPosition,
    bye: Boolean(side?.bye)
  };
}

function toGraphMatchUp(matchUp: any): GraphMatchUp | null {
  const roundNumber = matchUp?.roundNumber;
  const roundPosition = matchUp?.roundPosition;
  if (typeof roundNumber !== 'number' || typeof roundPosition !== 'number') return null;
  const sides = Array.isArray(matchUp.sides) ? matchUp.sides : [];
  const sideOne = sides.find((s: any) => s?.sideNumber === 1) ?? sides[0];
  const sideTwo = sides.find((s: any) => s?.sideNumber === 2) ?? sides[1];
  return {
    matchUpId: matchUp.matchUpId,
    roundNumber,
    roundPosition,
    sides: [toSide(sideOne), toSide(sideTwo)],
    winningSide: matchUp.winningSide,
    matchUpStatus: matchUp.matchUpStatus,
    raw: matchUp
  };
}

/**
 * Build the graph, or say why it could not be built.
 *
 * Rejects anything that is not a clean halving tree — round-robin containers,
 * ad-hoc structures, and fed/consolation shapes whose round sizes do not halve.
 * Refusing is deliberate: a wrong tree would produce a plausible-looking
 * projection with silently wrong opponents, which is worse than no chart.
 */
export function buildEliminationGraph(matchUps: any[]): {
  graph?: EliminationGraph;
  unsupported?: PressureUnsupportedReason;
} {
  if (!Array.isArray(matchUps) || !matchUps.length) return { unsupported: PRESSURE_UNSUPPORTED.NO_MATCHUPS };

  const byRound = new Map<number, Map<number, GraphMatchUp>>();
  for (const matchUp of matchUps) {
    const graphMatchUp = toGraphMatchUp(matchUp);
    if (!graphMatchUp) continue;
    const round = byRound.get(graphMatchUp.roundNumber) ?? new Map<number, GraphMatchUp>();
    round.set(graphMatchUp.roundPosition, graphMatchUp);
    byRound.set(graphMatchUp.roundNumber, round);
  }

  const roundNumbers = [...byRound.keys()].toSorted((a, b) => a - b);
  if (!roundNumbers.length) {
    // We were handed matchUps but none of them is a bracket node. The common
    // real case is a ROUND_ROBIN / CONTAINER structure: its matchUps carry a
    // `roundNumber` but **no `roundPosition`** (verified against factory output),
    // so there is no tree to walk. Say NOT_ELIMINATION rather than NO_MATCHUPS —
    // "there was nothing here" and "this is the wrong shape" send an operator to
    // very different places.
    return { unsupported: PRESSURE_UNSUPPORTED.NOT_ELIMINATION };
  }

  const firstRound = roundNumbers[0];
  for (let index = 1; index < roundNumbers.length; index += 1) {
    const previousSize = byRound.get(roundNumbers[index - 1])?.size ?? 0;
    const currentSize = byRound.get(roundNumbers[index])?.size ?? 0;
    if (roundNumbers[index] !== roundNumbers[index - 1] + 1)
      return { unsupported: PRESSURE_UNSUPPORTED.NOT_ELIMINATION };
    if (currentSize * 2 !== previousSize) return { unsupported: PRESSURE_UNSUPPORTED.NOT_ELIMINATION };
  }

  // A single round with more than one matchUp and no second round is a container,
  // not a bracket — there is no path to project.
  if (roundNumbers.length === 1 && (byRound.get(firstRound)?.size ?? 0) > 1) {
    return { unsupported: PRESSURE_UNSUPPORTED.NOT_ELIMINATION };
  }

  return { graph: { roundNumbers, byRound, firstRound } };
}

/** The two feeder positions of `(roundNumber, roundPosition)` in the previous round. */
export function feederPositions(roundPosition: number): [number, number] {
  return [roundPosition * 2 - 1, roundPosition * 2];
}

/** The position a winner of `roundPosition` advances into, in the next round. */
export function advancingPosition(roundPosition: number): number {
  return Math.ceil(roundPosition / 2);
}

/** True when the matchUp is a bye for whichever side is present. */
export function isByeMatchUp(matchUp: GraphMatchUp): boolean {
  if (matchUp.matchUpStatus === BYE_STATUS) return true;
  return matchUp.sides.some((side) => side.bye);
}
