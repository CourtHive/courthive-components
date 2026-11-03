import { TopologyEdge, TopologyNode } from '../types';
type EdgeLike = Pick<TopologyEdge, 'linkType' | 'sourceNodeId' | 'finishingPositions'>;
/** is the node an edge leaves a round robin */
export declare function leavesRoundRobin(edge: EdgeLike, nodes: TopologyNode[]): boolean;
/** a POSITION edge, or a WINNER edge out of a round robin that names finishingPositions */
export declare function traversesByFinishingPosition(edge: EdgeLike, nodes: TopologyNode[]): boolean;
/** a WINNER or LOSER edge that is not a finishing-position edge */
export declare function traversesByRound(edge: EdgeLike, nodes: TopologyNode[]): boolean;
/** a WINNER edge that carries the winners of a round */
export declare function isRoundWinnerEdge(edge: EdgeLike, nodes: TopologyNode[]): boolean;
/** an edge that carries a qualifying structure's qualifiers onward: its round winners, or its group finishers */
export declare function carriesQualifiers(edge: EdgeLike, nodes: TopologyNode[]): boolean;
/** the type an edge is drawn as: a finishing-position edge is drawn as POSITION whatever its label */
export declare function edgeDisplayType(edge: EdgeLike, nodes: TopologyNode[]): TopologyEdge['linkType'];
export {};
