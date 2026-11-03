import { TopologyEdge, TopologyNode, TopologyState, UIPanel } from '../types';
export interface NodeEditorCallbacks {
    onUpdateNode: (nodeId: string, updates: Partial<TopologyNode>) => void;
    onUpdateEdge: (edgeId: string, updates: Partial<TopologyEdge>) => void;
    onDeleteNode: (nodeId: string) => void;
    readOnly?: boolean;
    hideDelete?: boolean;
}
export declare function buildNodeEditor(callbacks: NodeEditorCallbacks): UIPanel<TopologyState>;
