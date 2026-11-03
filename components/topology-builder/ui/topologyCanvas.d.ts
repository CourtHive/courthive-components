import { TopologyState, UIPanel } from '../types';
export interface CanvasCallbacks {
    onSelectNode: (nodeId: string | null) => void;
    onSelectEdge: (edgeId: string | null) => void;
    onDoubleClickNode?: (nodeId: string) => void;
    onMoveNode: (nodeId: string, x: number, y: number) => void;
    onCreateEdge: (sourceNodeId: string, targetNodeId: string, linkType: 'WINNER' | 'LOSER' | 'POSITION') => void;
    onPortMouseDown: (nodeId: string, portType: 'winner' | 'loser') => void;
}
export declare function buildTopologyCanvas(callbacks: CanvasCallbacks): UIPanel<TopologyState>;
