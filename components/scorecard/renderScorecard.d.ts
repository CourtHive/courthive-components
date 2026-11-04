import { FinishingOrderEntryOptions, ScorecardLabels } from './renderCollectionCard';
import { ScorecardHomeOptions } from './homeSides';
import { ScorecardIssue } from './dualIssues';
import { TeamScoreOptions } from './teamScoreEditor';
export type { ScorecardLabels } from './renderCollectionCard';
export interface ScorecardOptions {
    matchUp: any;
    composition?: any;
    eventHandlers?: any;
    swapSides?: boolean;
    labels?: ScorecardLabels;
    /** one collection in its order-of-finish entry mode (see `renderCollectionCard`) */
    finishingOrder?: FinishingOrderEntryOptions & {
        editingCollectionId?: string;
    };
    /** the dual's issues: line issues mark their lines, the dual's own fill the banner */
    issues?: ScorecardIssue[];
    /** a banner action per dual issue code, e.g. recording a decided dual's unplayed lines */
    issueActions?: Record<string, IssueAction>;
    /** the header's team score set by hand; `manual` defaults to whether the issues say it is */
    teamScore?: TeamScoreOptions;
    /** the dual's home team (see `homeSideStates`): tagged where it falls, settable with `onSetHome` */
    home?: ScorecardHomeOptions;
}
export interface IssueAction {
    label: string;
    onClick: (issue: ScorecardIssue) => void;
}
export interface TeamVsOptions {
    side1Name: string;
    side2Name: string;
    sets?: any[];
    winningSide?: number;
    side1Id?: string;
    side2Id?: string;
}
/**
 * Render a full team scorecard: header + collection panels + matchUp grids.
 */
export declare function renderScorecard({ matchUp, composition, eventHandlers, swapSides, labels, finishingOrder, issues, issueActions, teamScore, home }: ScorecardOptions): HTMLDivElement;
/**
 * Render the team vs team header with names and aggregate score.
 */
export declare function renderTeamVsHeader({ side1Name, side2Name, sets, winningSide, side1Id, side2Id }: TeamVsOptions): HTMLDivElement;
/**
 * Update the aggregate tie score in-place (avoids full re-render).
 */
export declare function updateTieScore(result: any, side1Id?: string, side2Id?: string, swapSides?: boolean): void;
