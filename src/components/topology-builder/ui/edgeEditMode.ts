/**
 * Edge Edit Mode — which fields the edge editor shows for an edge. Pure, so the decision is testable without a DOM.
 */
import { isRoundWinnerEdge, leavesRoundRobin, traversesByFinishingPosition } from '../domain/edgeTraversal';
import { drawDefinitionConstants } from 'tods-competition-factory';
import type { TopologyEdge, TopologyState } from '../types';

const { LOSER, QUALIFYING } = drawDefinitionConstants;

export interface EdgeEditMode {
  /** a round winner edge out of a qualifying structure: edits its qualifying positions */
  isQualifyingWinner: boolean;
  /** a finishing-position edge out of a round robin, either label: edits finishing positions per group */
  isRRPosition: boolean;
  /** source and target round fields */
  showRoundFields: boolean;
  /** free-text finishing positions, for a finishing-position edge out of a structure that is not a round robin */
  showFinishingPositionsInput: boolean;
  showFeedProfile: boolean;
}

export function getEdgeEditMode(edge: TopologyEdge, state: Pick<TopologyState, 'nodes'>): EdgeEditMode {
  const source = state.nodes.find((n) => n.id === edge.sourceNodeId);
  const byFinishingPosition = traversesByFinishingPosition(edge, state.nodes);
  const isRRPosition = byFinishingPosition && leavesRoundRobin(edge, state.nodes);

  return {
    isQualifyingWinner: isRoundWinnerEdge(edge, state.nodes) && source?.stage === QUALIFYING,
    isRRPosition,
    showRoundFields: !isRRPosition,
    showFinishingPositionsInput: byFinishingPosition && !isRRPosition,
    showFeedProfile: edge.linkType === LOSER
  };
}

/** the other finishing-position edges out of the same source: the positions they claim are not available */
export function siblingFinishingPositionEdges(edge: TopologyEdge, state: Pick<TopologyState, 'nodes' | 'edges'>) {
  return state.edges.filter(
    (e) => e.id !== edge.id && e.sourceNodeId === edge.sourceNodeId && traversesByFinishingPosition(e, state.nodes)
  );
}
