import { TopologyState } from '../types';
export interface ValidationError {
    severity: 'error' | 'warning';
    message: string;
    nodeId?: string;
    edgeId?: string;
}
export declare function validateTopology(state: TopologyState): ValidationError[];
