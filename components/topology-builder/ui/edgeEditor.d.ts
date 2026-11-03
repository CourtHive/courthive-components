import { TopologyEdge, TopologyState, UIPanel } from '../types';
export interface EdgeEditorCallbacks {
    onUpdateEdge: (edgeId: string, updates: Partial<TopologyEdge>) => void;
    onDeleteEdge: (edgeId: string) => void;
    readOnly?: boolean;
}
export declare function buildEdgeEditor(callbacks: EdgeEditorCallbacks): UIPanel<TopologyState>;
