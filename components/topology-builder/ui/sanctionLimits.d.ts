import { CompositionLimits, TopologyState, UIPanel } from '../types';
/** Only record-permitted increases get an input. The factory validates every request again. */
export declare function buildSanctionLimits(options: {
    read: () => {
        constraints?: CompositionLimits;
        overrideLimits?: CompositionLimits;
    };
    change: (limits: CompositionLimits) => void;
}): UIPanel<TopologyState>;
