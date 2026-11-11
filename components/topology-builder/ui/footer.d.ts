import { buildSanctionLimits } from './sanctionLimits';
import { AcceptanceOptions } from './acceptanceLine';
import { buildFitProposals } from './fitProposals';
import { JourneyParticipant, TopologyState, UIPanel } from '../types';
export interface FooterOptions {
    /** How many playoffs the topology could still add, for the Add playoffs mode's hint. */
    countPlayoffOffers?: (state: TopologyState) => number;
    /** The Fit mode's ledger line: the event's entries by stage, and what was not placed. */
    fitLedger?: (state: TopologyState) => string;
    /** Journey mode: the participant search, the choice, and the chosen journey's summary. */
    journey?: {
        search: (query: string) => JourneyParticipant[];
        choose: (participantId: string) => void;
        summary: (state: TopologyState) => string;
    };
    /** Fit mode's acceptance line: a panel over the canvas, and the pending entry changes beside the ledger. */
    acceptance?: AcceptanceOptions | AcceptanceOptions[];
    proposals?: Parameters<typeof buildFitProposals>[0];
    sanctionLimits?: Parameters<typeof buildSanctionLimits>[0];
}
export interface FooterPanel extends UIPanel<TopologyState> {
    slot: HTMLElement;
}
export declare function buildFooter(options?: FooterOptions): FooterPanel;
