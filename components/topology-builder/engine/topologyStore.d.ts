import { TopologyNode, TopologyEdge, TopologyState, TopologyChangeListener } from '../types';
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
    autoLayout(): void;
    loadState(newState: TopologyState): void;
    private computeEdgeLabel;
}
