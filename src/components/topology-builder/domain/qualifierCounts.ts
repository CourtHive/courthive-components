/**
 * How many qualifiers a qualifying structure can produce, and the shape it takes to produce them.
 *
 * An elimination structure's qualifiers are the winners of its final round, so the shape is worked backwards from the
 * count (CA, 2026-11-18): the final round has one matchUp per qualifier, each round before it twice as many, until a
 * first round seats every entrant. That is the factory's own rule — its draw is the smallest qualifiers × 2ⁿ that holds
 * the entrants, the rest byes:
 *   - 40 entrants for 10 → 40 positions, rounds 20, 10, no byes;
 *   - 40 for 16 → 64 positions, rounds 32, 16, 24 byes;
 *   - 40 for 9 → 72 positions, rounds 36, 18, 9, 32 byes.
 * Any count is offered up to half the entrants: every qualifier has won a match (32 from 40 would qualify 24 on byes).
 * The stepper once stopped only at counts that halve the entrants or a power of two; 9 was out of reach.
 *
 * A FEED_IN qualifying structure's counts are the factory's own (`getFeedInQualifyingPositions`).
 */
import { drawDefinitionConstants, drawsGovernor } from 'tods-competition-factory';
import type { TopologyNode } from '../types';

const { FEED_IN } = drawDefinitionConstants;

/** The round sizes of halving `size` exactly, largest first: 40 → [20, 10, 5]. */
function halvings(size: number): number[] {
  const rounds: number[] = [];
  for (let count = size / 2; Number.isInteger(count) && count >= 1; count /= 2) rounds.push(count);
  return rounds;
}

function nextPowerOf2(n: number): number {
  return 2 ** Math.ceil(Math.log2(Math.max(2, n)));
}

/** Qualifier counts an elimination structure of `drawSize` entrants can produce, largest first: every count to half. */
export function eliminationQualifierCounts(drawSize: number): number[] {
  if (!drawSize || drawSize < 2) return [];
  const limit = Math.floor(drawSize / 2);
  return Array.from({ length: limit }, (_, i) => limit - i);
}

/** Qualifier counts for the node's structure type, largest first. */
export function qualifierCounts(node: Pick<TopologyNode, 'drawSize' | 'structureType'>): number[] {
  if (node.structureType === FEED_IN) {
    const { qualifyingPositions = [] } = drawsGovernor.getFeedInQualifyingPositions({ drawSize: node.drawSize });
    return [...qualifyingPositions].filter((n: number) => n < node.drawSize).sort((a: number, b: number) => b - a);
  }
  return eliminationQualifierCounts(node.drawSize);
}

/**
 * A new qualifying structure's count: about a quarter of its entrants, from the counts that need fewest byes — halving
 * the entrants, or a power of two. A quarter of 30 is 7, a 56 draw with 26 byes; 4 plays from 32.
 */
export function defaultQualifiers(node: Pick<TopologyNode, 'drawSize' | 'structureType'>): number {
  const counts =
    node.structureType === FEED_IN
      ? qualifierCounts(node)
      : [...new Set([...halvings(node.drawSize), ...halvings(nextPowerOf2(node.drawSize))])]
          .filter((n) => n <= Math.floor(node.drawSize / 2))
          .sort((a, b) => b - a);
  const quarter = Math.max(1, Math.floor(node.drawSize / 4));
  return counts.find((n) => n <= quarter) ?? counts.at(-1) ?? 1;
}

/** The node's qualifier count, as set or by default. */
export function qualifiersOf(node: Pick<TopologyNode, 'drawSize' | 'structureType' | 'qualifyingPositions'>): number {
  return node.qualifyingPositions || defaultQualifiers(node);
}

/** The next count in `direction` (+1 more qualifiers, −1 fewer), or undefined at either end. */
export function steppedQualifierCount(
  node: Pick<TopologyNode, 'drawSize' | 'structureType' | 'qualifyingPositions'>,
  direction: 1 | -1
): number | undefined {
  const current = qualifiersOf(node);
  const ascending = [...qualifierCounts(node)].sort((a, b) => a - b);
  return direction > 0 ? ascending.find((n) => n > current) : ascending.toReversed().find((n) => n < current);
}

/**
 * The elimination rounds the factory plays to leave `qualifiers` of `drawSize` entrants: the matchUps in each round,
 * and the positions of the first — the smallest `qualifiers × 2ⁿ` (n ≥ 1) that seats every entrant.
 * 40 for 10 → { positions: 40, rounds: [20, 10] }; 40 for 9 → { positions: 72, rounds: [36, 18, 9] }.
 */
export function eliminationQualifyingShape(
  drawSize: number,
  qualifiers: number
): { positions: number; rounds: number[] } {
  const q = Math.max(1, Math.floor(qualifiers) || 1);
  let positions = q * 2;
  while (positions < drawSize) positions *= 2;
  const rounds: number[] = [];
  for (let count = positions / 2; count >= q; count /= 2) rounds.push(count);
  return { positions, rounds };
}
