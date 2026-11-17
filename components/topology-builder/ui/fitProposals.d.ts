import { FitProposal, TopologyState, UIPanel } from '../types';
export declare function buildFitProposals(options: {
    proposals: (state: TopologyState) => {
        proposals?: FitProposal[];
        error?: unknown;
    };
    choose: (proposal: FitProposal) => void;
    /** Why there is nothing to propose yet, or nothing when there is: the button is disabled and its title says why. */
    unavailable?: (state: TopologyState) => string | undefined;
}): UIPanel<TopologyState>;
