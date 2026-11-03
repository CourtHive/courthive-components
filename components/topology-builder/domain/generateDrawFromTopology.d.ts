import { TopologyState } from '../types';
export interface StructureInfo {
    structureName: string;
    stage: string;
    stageSequence: number;
    matchUpCount: number;
    positionCount: number;
}
export interface GenerationResult {
    success: boolean;
    drawOptions?: any;
    structures?: StructureInfo[];
    linkCount?: number;
    error?: string;
}
export declare function generateDrawFromTopology(state: TopologyState, participantsCount?: number): GenerationResult;
