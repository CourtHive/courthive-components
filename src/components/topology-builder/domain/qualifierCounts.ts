/**
 * How many qualifiers a qualifying structure can produce, and the shape it takes to produce them (CA, 2026-11-17).
 *
 * An elimination structure's qualifiers are the winners of one round, so the count is a round's matchUp count. The
 * factory builds it in one of two shapes:
 *   - halving its own size, when the count is reached that way: 40 entrants → 20, 10, 5, in 40 positions, no byes;
 *   - otherwise the next power of two, with byes: 40 entrants → 16, 8, 4, 2, 1 from 64 positions, 24 of them byes.
 * Both are offered, up to half the entrants: every qualifier has won a match (32 from 40 would qualify 24 on byes).
 * The card stepper and the properties pane both read this list; it was a ±1 stepper that reached 18, which no
 * structure of 40 produces, and a pane that offered only the halving shape.
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

/** Qualifier counts an elimination structure of `drawSize` entrants can produce, largest first. */
export function eliminationQualifierCounts(drawSize: number): number[] {
  if (!drawSize || drawSize < 2) return [];
  const limit = Math.floor(drawSize / 2);
  const counts = new Set([...halvings(drawSize), ...halvings(nextPowerOf2(drawSize))].filter((n) => n <= limit));
  return [...counts].sort((a, b) => b - a);
}

/** Qualifier counts for the node's structure type, largest first. */
export function qualifierCounts(node: Pick<TopologyNode, 'drawSize' | 'structureType'>): number[] {
  if (node.structureType === FEED_IN) {
    const { qualifyingPositions = [] } = drawsGovernor.getFeedInQualifyingPositions({ drawSize: node.drawSize });
    return [...qualifyingPositions].filter((n: number) => n < node.drawSize).sort((a: number, b: number) => b - a);
  }
  return eliminationQualifierCounts(node.drawSize);
}

/** A new qualifying structure's count: the largest it can produce of about a quarter of its entrants. */
export function defaultQualifiers(node: Pick<TopologyNode, 'drawSize' | 'structureType'>): number {
  const counts = qualifierCounts(node);
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
 * and the positions of the first. 40 for 10 → { positions: 40, rounds: [20, 10] }; 40 for 16 → 64 positions, 24 byes,
 * rounds [32, 16].
 */
export function eliminationQualifyingShape(
  drawSize: number,
  qualifiers: number
): { positions: number; rounds: number[] } {
  const own = halvings(drawSize);
  const positions = own.includes(qualifiers) ? drawSize : nextPowerOf2(drawSize);
  const all = halvings(positions);
  // a count no round produces is shown to the round that comes nearest without going under it
  const last = all.findLastIndex((n) => n >= qualifiers);
  return { positions, rounds: all.slice(0, Math.max(1, last + 1)) };
}
