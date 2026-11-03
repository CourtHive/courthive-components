import { TopologyNode } from '../types';
/**
 * Compute the number of schematic rounds for a given draw configuration.
 * For qualifying structures with qualifyingPositions, truncate to only
 * the rounds needed to produce that many qualifiers.
 */
export declare function getNumRounds(node: TopologyNode): number;
/**
 * Compute the card width needed to fit the schematic preview.
 */
export declare function getCardWidth(node: TopologyNode): number;
export interface RoundAnnotation {
    roundNumber: number;
    linkType: string;
    direction: 'source' | 'target';
    edgeId: string;
    isSelected: boolean;
}
export interface PositionChip {
    position: number;
    edgeId: string;
    targetName: string;
}
export interface StructureCardCallbacks {
    onSelect: (nodeId: string) => void;
    onSelectEdge: (edgeId: string) => void;
    onDoubleClick?: (nodeId: string) => void;
    onPortMouseDown: (nodeId: string, portType: 'winner' | 'loser') => void;
    onPortMouseUp: (nodeId: string) => void;
    onDragStart: (nodeId: string, startX: number, startY: number) => void;
}
export declare function buildStructureCard(node: TopologyNode, callbacks: StructureCardCallbacks, isSelected: boolean, hasWinnerLink: boolean, roundAnnotations?: RoundAnnotation[], warnings?: string[], advanceInfo?: string, positionChips?: PositionChip[]): HTMLElement;
/**
 * Get port position relative to canvas for SVG edge rendering.
 */
export declare function getPortPosition(node: TopologyNode, portType: 'input' | 'winner' | 'loser'): {
    x: number;
    y: number;
};
