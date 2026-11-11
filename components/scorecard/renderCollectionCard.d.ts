import { FinishingOrderEntry } from './finishingOrderState';
import { ScorecardIssue } from './dualIssues';
import { TeamPresentation } from './teamPalette';
export interface ScorecardLabels {
    /** names the order-of-finish badge for assistive technology and its tooltip, e.g. "Order of finish" */
    orderOfFinish?: string;
    /** the entry mode's buttons */
    save?: string;
    cancel?: string;
    /** a message per issue code, in place of the English defaults */
    issues?: Record<string, string>;
    /** names the header's count of lines with an issue, e.g. "Lines with issues" */
    issueCount?: string;
    /** the order-of-finish entry mode's instruction, shown beside Save / Cancel */
    finishingOrderHint?: string;
    /** the header's team-score override: its buttons, the tag shown while the score is set by hand, the winner choice */
    override?: string;
    restore?: string;
    manual?: string;
    winner?: string;
    /** the home team: its label, and the label's tooltip when the home team was inferred */
    home?: string;
    homeVenue?: string;
    homeHostOrganisation?: string;
    /** editing the home team: the corner gear and check, and the group of the two teams */
    editHome?: string;
    saveHome?: string;
    homeTeam?: string;
    /** the edit bar's instruction; `NoClear` when the set home cannot be removed, and the two inferred-home variants */
    homeEditHint?: string;
    homeEditHintNoClear?: string;
    homeInferredVenueHint?: string;
    homeInferredHostHint?: string;
    /** the edit bar's draft, `{{name}}` the team's name; and its message when the save was refused */
    homeDraft?: string;
    homeDraftNone?: string;
    homeSaveFailed?: string;
    /** @deprecated the per-name "Set as home" and "Clear" buttons are gone (home is edited from the gear); ignored */
    setHome?: string;
    /** @deprecated see `setHome`; ignored */
    clearHome?: string;
}
export interface FinishingOrderEntryOptions {
    editing?: boolean;
    /**
     * the whole order, every line played to a result numbered 1..n, as `setOrderOfFinish` takes it. The card then takes
     * the order as saved and disables Save until the next edit, unless this returns (or resolves to) `false` or throws:
     * then the edits stay and Save is offered again.
     */
    onSave?: (finishingOrder: FinishingOrderEntry[]) => void | boolean | Promise<void | boolean>;
    onCancel?: () => void;
}
export interface CollectionCardOptions {
    collectionDefinition: any;
    collectionMatchUps: any[];
    composition?: any;
    eventHandlers?: any;
    swapSides?: boolean;
    teamBranding?: boolean;
    teamPresentation?: TeamPresentation;
    labels?: ScorecardLabels;
    finishingOrder?: FinishingOrderEntryOptions;
    /** the dual's issues; those naming this collection's lines are marked */
    issues?: ScorecardIssue[];
}
export declare function renderCollectionCard({ collectionDefinition, collectionMatchUps, composition, eventHandlers, teamBranding, teamPresentation, swapSides, labels, finishingOrder, issues }: CollectionCardOptions): HTMLDivElement;
