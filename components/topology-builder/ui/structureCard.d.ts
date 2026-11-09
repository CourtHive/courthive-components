import { JourneyStep, PlayoffOffer, StructureFit, TopologyNode } from '../types';
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
/** What the `addPlayoffs` mode adds to a card. */
export interface CardPlayoffOffers {
    offers: PlayoffOffer[];
    onAddPlayoff: (offer: PlayoffOffer) => void;
}
/** A Fit mode lever on a card. */
export type FitLever = 'size' | 'qualifiers' | 'feedIn';
/** A node's fit, as Fit mode draws it on the card. */
export interface NodeFit {
    /** False for a structure filled by results (a playoff, a consolation): nothing to fit. */
    takesEntries: boolean;
    fit?: StructureFit;
    canResize?: {
        down: boolean;
        up: boolean;
    };
    /** A qualifying structure's qualifier count. */
    canQualify?: {
        down: boolean;
        up: boolean;
    };
}
/** A node's part in the chosen participant's journey. */
export interface NodeJourney {
    steps: JourneyStep[];
    onStep?: (step: JourneyStep) => void;
}
/** Card extras beyond the positional parameters. */
export interface StructureCardExtras {
    /** Journey mode: the chosen participant's steps in this structure (none — the card steps back). */
    journey?: NodeJourney;
    /** Fit mode: this node's fit, and the levers it may move (none in a read-only topology). */
    fit?: NodeFit;
    onFitLever?: (lever: FitLever, direction: 1 | -1) => void;
    /** The `addPlayoffs` mode: this card's chips, or none (the card is dimmed: nothing to add from it). */
    playoffOffers?: CardPlayoffOffers;
    /** A live draw: the mock-draw rounds line describes a draw that is not this one, so it is left out. */
    hideRoundsInfo?: boolean;
}
/** The chip's text: `+ 17–24`, an en dash as a range reads. */
export declare function offerLabel(offer: PlayoffOffer): string;
export interface StructureCardCallbacks {
    onSelect: (nodeId: string) => void;
    onSelectEdge: (edgeId: string) => void;
    onDoubleClick?: (nodeId: string) => void;
    onPortMouseDown: (nodeId: string, portType: 'winner' | 'loser') => void;
    onPortMouseUp: (nodeId: string) => void;
    onDragStart: (nodeId: string, startX: number, startY: number) => void;
}
export declare function buildStructureCard(node: TopologyNode, callbacks: StructureCardCallbacks, isSelected: boolean, hasWinnerLink: boolean, roundAnnotations?: RoundAnnotation[], warnings?: string[], advanceInfo?: string, positionChips?: PositionChip[], extras?: StructureCardExtras): HTMLElement;
/**
 * Get port position relative to canvas for SVG edge rendering.
 */
export declare function getPortPosition(node: TopologyNode, portType: 'input' | 'winner' | 'loser'): {
    x: number;
    y: number;
};
