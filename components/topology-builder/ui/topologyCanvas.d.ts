import { PlayoffOffer, TopologyState, UIPanel } from '../types';
import { FitLever, NodeFit, NodeJourney } from './structureCard';
export interface CanvasCallbacks {
    onSelectNode: (nodeId: string | null) => void;
    onSelectEdge: (edgeId: string | null) => void;
    onDoubleClickNode?: (nodeId: string) => void;
    onMoveNode: (nodeId: string, x: number, y: number) => void;
    onCreateEdge: (sourceNodeId: string, targetNodeId: string, linkType: 'WINNER' | 'LOSER' | 'POSITION') => void;
    onPortMouseDown: (nodeId: string, portType: 'winner' | 'loser') => void;
    /** The live draw's offers for a node; given, the cards leave out the mock-draw rounds line. */
    playoffOffers?: (nodeId: string) => PlayoffOffer[] | undefined;
    onAddPlayoff?: (nodeId: string, offer: PlayoffOffer) => void;
    /** Fit mode: a node's fit, and the levers it may move. */
    fitFor?: (nodeId: string) => NodeFit;
    onFitLever?: (nodeId: string, lever: FitLever, direction: 1 | -1) => void;
    /** Journey mode: a node's steps for the chosen participant, and the links they travelled. */
    journeyFor?: (nodeId: string) => NodeJourney | undefined;
    journeyEdges?: () => Set<string>;
}
export declare function buildTopologyCanvas(callbacks: CanvasCallbacks): UIPanel<TopologyState>;
