/**
 * The issues a TEAM dual reports (the factory's `getDualIssues`), sorted for the scorecard: those of a line go to the
 * line's card in its collection, those of the dual to the banner under the header. Rendering only: the rules are the
 * factory's, and the codes here mirror its `dualIssueConstants`.
 *
 * Pure: no DOM.
 */
export type ScorecardIssue = {
    code: string;
    matchUpId?: string;
    matchUpIds?: string[];
    collectionId?: string;
    participantIds?: string[];
    sideNumber?: number;
    info?: string;
};
export declare const DUAL_DECIDED = "DUAL_DECIDED";
export declare const MANUAL_SCORE = "MANUAL_SCORE";
export declare const MANUAL_SCORE_DIVERGES = "MANUAL_SCORE_DIVERGES";
export declare const DEFAULT_ISSUE_MESSAGES: Record<string, string>;
export declare const isDualIssue: (issue: ScorecardIssue) => boolean;
/** the issues naming any of `matchUpIds`, keyed by line: a duplicate names each of its lines */
export declare function lineIssues(issues: ScorecardIssue[], matchUpIds: string[]): Map<string, ScorecardIssue[]>;
export declare const dualIssues: (issues?: ScorecardIssue[]) => ScorecardIssue[];
/** a reader's message for an issue; the divergence names what the lines produce */
export declare function issueMessage(issue: ScorecardIssue, messages?: Record<string, string>): string;
