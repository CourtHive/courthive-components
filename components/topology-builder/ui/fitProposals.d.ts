import { FitProposal, TopologyState, UIPanel } from '../types';
export declare function buildFitProposals(options: {
    proposals: (state: TopologyState) => {
        proposals?: FitProposal[];
        error?: unknown;
    };
    choose: (proposal: FitProposal) => void;
}): UIPanel<TopologyState>;
