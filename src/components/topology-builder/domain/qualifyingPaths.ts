/**
 * Qualifying paths: each qualifying card's place on the way to MAIN, read from the topology (CA, 2026-11-18,
 * planning/2026-11-17-qualifying-entry-routing.md). Nothing is typed by the director; a card's path is where it is drawn.
 *
 * A card linked to MAIN heads a chain; a card linked to a qualifying card is that card's pre-qualifying, and so on back.
 * Each card's entries carry the path the builder writes on Generate:
 *   - `roundTarget`: the MAIN round the chain's head feeds (a stronger field can earn R3);
 *   - `entryStageSequence`: the card's place in its chain, 1 the deepest — the factory's stage sequence.
 * A chain is one qualifying profile, deepest first, as the factory generates a pre-qualifying chain.
 */
import { drawDefinitionConstants } from 'tods-competition-factory';
import { carriesQualifiers } from './edgeTraversal';
import { qualifiersOf } from './qualifierCounts';
import type { TopologyEdge, TopologyNode, TopologyState } from '../types';

const { MAIN, QUALIFYING } = drawDefinitionConstants;

export interface QualifyingChain {
  /** The MAIN round the chain's head feeds. */
  roundTarget: number;
  /** The chain's cards, deepest first: [pre-qualifying, qualifying]. */
  nodes: TopologyNode[];
  /** The head's edge into MAIN. */
  edge: TopologyEdge;
}

export interface QualifyingPath {
  roundTarget: number;
  entryStageSequence: number;
  /** 1 for the card feeding MAIN, 2 for its pre-qualifying, … */
  depth: number;
  label: string;
}

/** Qualifying, Pre-qualifying, Pre-pre-qualifying, … by distance from MAIN. */
export function depthLabel(depth: number): string {
  return depth <= 1 ? 'Qualifying' : `Pre-${'pre-'.repeat(depth - 2)}qualifying`;
}

/** The qualifying cards that send their qualifiers to `target`. */
function feeders(target: TopologyNode, state: TopologyState): TopologyNode[] {
  return state.edges
    .filter((edge) => edge.targetNodeId === target.id && carriesQualifiers(edge, state.nodes))
    .map((edge) => state.nodes.find((n) => n.id === edge.sourceNodeId))
    .filter((n): n is TopologyNode => !!n && n.stage === QUALIFYING);
}

/**
 * Each chain of qualifying cards into MAIN. A card fed by more than one pre-qualifying card is read through its first;
 * the validator names the others.
 */
export function qualifyingChains(state: TopologyState): QualifyingChain[] {
  const main = state.nodes.find((n) => n.stage === MAIN);
  if (!main) return [];
  const heads = state.edges.filter(
    (edge) =>
      edge.targetNodeId === main.id &&
      carriesQualifiers(edge, state.nodes) &&
      state.nodes.some((n) => n.id === edge.sourceNodeId)
  );
  return heads.map((edge) => {
    const chain = [state.nodes.find((n) => n.id === edge.sourceNodeId)!];
    const seen = new Set(chain.map((n) => n.id));
    for (let next = feeders(chain[0], state)[0]; next && !seen.has(next.id); next = feeders(next, state)[0]) {
      seen.add(next.id);
      chain.unshift(next);
    }
    return { roundTarget: edge.targetRoundNumber || 1, nodes: chain, edge };
  });
}

/** Each qualifying card's path, by node id. A card in no chain to MAIN has none. */
export function qualifyingPaths(state: TopologyState): Map<string, QualifyingPath> {
  const paths = new Map<string, QualifyingPath>();
  for (const { roundTarget, nodes } of qualifyingChains(state)) {
    nodes.forEach((node, i) => {
      const depth = nodes.length - i;
      paths.set(node.id, { roundTarget, entryStageSequence: i + 1, depth, label: depthLabel(depth) });
    });
  }
  return paths;
}

/** The warning a parallel chain's head carries, on its card and from the validator. */
export const PARALLEL_QUALIFYING_WARNING = (structureName: string) =>
  `${structureName} feeds the same round of the main draw as another qualifying structure. Use one structure with more qualifiers: each qualifier comes from its own section.`;

/**
 * Chains into the same MAIN round: their cards' paths coincide (two chains' deepest cards are both sequence 1 to that
 * round), so routing cannot tell their entries apart. CA, 2026-11-18: one card is a draw with sections; parallel cards
 * wait for a real need. Each such chain's head, after the first.
 */
export function parallelQualifying(state: TopologyState): TopologyNode[] {
  const rounds = new Set<number>();
  const parallel: TopologyNode[] = [];
  for (const { roundTarget, nodes } of qualifyingChains(state)) {
    if (rounds.has(roundTarget)) parallel.push(nodes.at(-1)!);
    rounds.add(roundTarget);
  }
  return parallel;
}

/** One band of the QUALIFYING acceptance list: the card its entrants play, and how many it takes directly. */
export interface QualifyingSlot {
  nodeId: string;
  structureName: string;
  path: QualifyingPath;
  /** The card's own entrants: its size less the qualifiers its pre-qualifying sends it. */
  entrants: number;
}

/**
 * The QUALIFYING acceptance list's bands, strongest first (CA, 2026-11-18): the stronger field earns the later entry
 * point, so a chain into a later MAIN round comes first, and within a chain the card nearest MAIN before its
 * pre-qualifying. Each band is as long as its card's own entrants, so resizing a card moves the cut line after it.
 */
export function qualifyingSlots(state: TopologyState): QualifyingSlot[] {
  const paths = qualifyingPaths(state);
  const chains = qualifyingChains(state).toSorted((a, b) => b.roundTarget - a.roundTarget);
  return chains.flatMap(({ nodes }) =>
    nodes.toReversed().map((node) => {
      const fed = feeders(node, state).reduce((sum, feeder) => sum + qualifiersOf(feeder), 0);
      return {
        nodeId: node.id,
        structureName: node.structureName,
        path: paths.get(node.id)!,
        entrants: Math.max(0, node.drawSize - fed)
      };
    })
  );
}

/**
 * The accepted QUALIFYING entries, in acceptance order, cut into the slots' bands: the path each participant's entry
 * takes. Entries past the last band have no slot (the draws have no room for them).
 */
export function assignQualifyingSlots(
  participantIds: string[],
  slots: QualifyingSlot[]
): { slot: QualifyingSlot; participantIds: string[] }[] {
  let start = 0;
  return slots.map((slot) => {
    const band = participantIds.slice(start, start + slot.entrants);
    start += slot.entrants;
    return { slot, participantIds: band };
  });
}

/**
 * Whether the bands route their entries: more than one band, or one into a MAIN round after the first. A lone
 * qualifying structure into round 1 needs no path, and its entries are left as they are.
 */
export function routesQualifying(assignments: { roundTarget: number }[]): boolean {
  return assignments.length > 1 || assignments.some(({ roundTarget }) => roundTarget > 1);
}
