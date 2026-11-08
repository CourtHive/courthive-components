import { TopologyNode, TopologyEdge, TopologyState, TopologyChangeListener, TopologyMode } from '../types';
export declare class TopologyStore {
    private state;
    private listeners;
    constructor(initialState?: Partial<TopologyState>);
    getState(): TopologyState;
    subscribe(listener: TopologyChangeListener): () => void;
    private notify;
    setDrawName(name: string): void;
    addNode(partial: Omit<TopologyNode, 'id' | 'position'>): TopologyNode;
    updateNode(nodeId: string, updates: Partial<Omit<TopologyNode, 'id'>>): void;
    removeNode(nodeId: string): void;
    addEdge(partial: Omit<TopologyEdge, 'id' | 'label'>): TopologyEdge | null;
    updateEdge(edgeId: string, updates: Partial<Omit<TopologyEdge, 'id'>>): void;
    removeEdge(edgeId: string): void;
    selectNode(nodeId: string | null): void;
    selectEdge(edgeId: string | null): void;
    /**
     * If the given node is a consolation structure, clamp its drawSize so it
     * does not exceed the total capacity of inbound links.
     */
    private clampConsolationDrawSize;
    /** Sum of losers that all inbound edges can deliver to a node. */
    private inboundCapacity;
    /** Find a non-overlapping position for a newly added node. */
    private nextNodePosition;
    /**
     * Place the nodes in columns by flow, each column stacked top to bottom.
     *
     * `sizeOf` gives a card's rendered size. The store has no DOM, so without it every card is taken as `CARD_HEIGHT`
     * tall and `getCardWidth` wide, which a round robin's tall preview or a row of Add playoffs chips exceeds — the next
     * card in the column, or the next column, was then drawn over it (2026-11-08). The controller measures and passes
     * it; a card it cannot measure (no layout, as under a headless DOM) keeps the computed size.
     */
    autoLayout(sizeOf?: (nodeId: string) => CardSize | undefined): void;
    loadState(newState: TopologyState): void;
    setJourneyParticipant(participantId: string | undefined): void;
    /** Fit mode's acceptance line; `undefined` is today's statuses. */
    setAcceptanceCut(cut: number | undefined): void;
    setMode(mode: TopologyMode): void;
    private computeEdgeLabel;
}
/** A card's rendered size, as the controller measures it. */
export interface CardSize {
    width: number;
    height: number;
}
