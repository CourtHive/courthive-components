/**
 * Edge Traversal — how a topology edge carries participants: by FINISHING POSITION or by ROUND.
 *
 * The topology-edge form of the factory's `tools.traversesByFinishingPosition` / `traversesByRound` /
 * `isRoundWinnerLink` (factory `src/query/drawDefinition/linkTraversal.ts`, CA ruling 2026-10-23). An edge is a
 * topology object, not a drawDefinition link, and the builder holds nodes rather than structures, so the source is
 * asked as a NODE: is it a round robin.
 *
 *  - A link out of a ROUND ROBIN is directed by `finishingPositions` (group finishers advance by tally), whether it
 *    is labelled POSITION or WINNER. Both labels are valid. A `sourceRoundNumber` on such an edge decides nothing.
 *  - A WINNER or LOSER edge out of an elimination structure is a round edge: it names `sourceRoundNumber`.
 *  - A WINNER edge out of a round robin that names no `finishingPositions` is not a finishing-position edge.
 *  - A LOSER edge is never a finishing-position edge.
 *
 * The builder itself only creates POSITION edges out of a round robin (`TopologyStore.addEdge`); a WINNER-labelled
 * round robin edge arrives in an initial or loaded state hydrated from an existing draw.
 */
import { drawDefinitionConstants } from 'tods-competition-factory';
import type { TopologyEdge, TopologyNode } from '../types';

const { WINNER, LOSER, QUALIFYING, ROUND_ROBIN } = drawDefinitionConstants;
const POSITION = 'POSITION';

type EdgeLike = Pick<TopologyEdge, 'linkType' | 'sourceNodeId' | 'finishingPositions'>;

/** is the node an edge leaves a round robin */
export function leavesRoundRobin(edge: EdgeLike, nodes: TopologyNode[]): boolean {
  const source = nodes.find((n) => n.id === edge.sourceNodeId);
  return source?.structureType === ROUND_ROBIN;
}

/** a POSITION edge, or a WINNER edge out of a round robin that names finishingPositions */
export function traversesByFinishingPosition(edge: EdgeLike, nodes: TopologyNode[]): boolean {
  if (edge.linkType === POSITION) return true;
  return edge.linkType === WINNER && !!edge.finishingPositions?.length && leavesRoundRobin(edge, nodes);
}

/** a WINNER or LOSER edge that is not a finishing-position edge */
export function traversesByRound(edge: EdgeLike, nodes: TopologyNode[]): boolean {
  if (edge.linkType !== WINNER && edge.linkType !== LOSER) return false;
  return !traversesByFinishingPosition(edge, nodes);
}

/** a WINNER edge that carries the winners of a round */
export function isRoundWinnerEdge(edge: EdgeLike, nodes: TopologyNode[]): boolean {
  return edge.linkType === WINNER && traversesByRound(edge, nodes);
}

/** an edge that carries a qualifying structure's qualifiers onward: its round winners, or its group finishers */
export function carriesQualifiers(edge: EdgeLike, nodes: TopologyNode[]): boolean {
  const source = nodes.find((n) => n.id === edge.sourceNodeId);
  if (source?.stage !== QUALIFYING) return false;
  return isRoundWinnerEdge(edge, nodes) || traversesByFinishingPosition(edge, nodes);
}

/** the type an edge is drawn as: a finishing-position edge is drawn as POSITION whatever its label */
export function edgeDisplayType(edge: EdgeLike, nodes: TopologyNode[]): TopologyEdge['linkType'] {
  return traversesByFinishingPosition(edge, nodes) ? POSITION : edge.linkType;
}
