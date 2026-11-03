import { TopologyState } from '../types';
export interface DrawOptionsResult {
    drawOptions: any;
    postGenerationMethods: any[];
}
export declare function topologyToDrawOptions(state: TopologyState): DrawOptionsResult;
