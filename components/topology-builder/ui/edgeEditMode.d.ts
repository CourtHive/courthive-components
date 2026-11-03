import { TopologyEdge, TopologyState } from '../types';
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
export declare function getEdgeEditMode(edge: TopologyEdge, state: Pick<TopologyState, 'nodes'>): EdgeEditMode;
/** the other finishing-position edges out of the same source: the positions they claim are not available */
export declare function siblingFinishingPositionEdges(edge: TopologyEdge, state: Pick<TopologyState, 'nodes' | 'edges'>): TopologyEdge[];
