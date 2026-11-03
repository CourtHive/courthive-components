import { FinishingOrderEntry } from './finishingOrderState';
import { ScorecardIssue } from './dualIssues';
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
    labels?: ScorecardLabels;
    finishingOrder?: FinishingOrderEntryOptions;
    /** the dual's issues; those naming this collection's lines are marked */
    issues?: ScorecardIssue[];
}
export declare function renderCollectionCard({ collectionDefinition, collectionMatchUps, composition, eventHandlers, swapSides, labels, finishingOrder, issues }: CollectionCardOptions): HTMLDivElement;
