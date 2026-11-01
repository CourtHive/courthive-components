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

export const DUAL_DECIDED = 'DUAL_DECIDED';
export const MANUAL_SCORE = 'MANUAL_SCORE';
export const MANUAL_SCORE_DIVERGES = 'MANUAL_SCORE_DIVERGES';
const DUAL_CODES = new Set([DUAL_DECIDED, MANUAL_SCORE, MANUAL_SCORE_DIVERGES]);

export const DEFAULT_ISSUE_MESSAGES: Record<string, string> = {
  LINEUP_INCOMPLETE: 'Line-up incomplete',
  DUPLICATE_IN_COLLECTION: 'Player on more than one line',
  INELIGIBLE_GENDER: 'Player does not fit the gender',
  INELIGIBLE_CATEGORY: 'Player outside the category',
  SCORE_INCOMPLETE: 'Score incomplete',
  MISSING_REASON: 'No reason given',
  [DUAL_DECIDED]: 'Decided with lines unplayed',
  [MANUAL_SCORE]: 'Team score set by hand',
  [MANUAL_SCORE_DIVERGES]: 'The lines produce'
};

export const isDualIssue = (issue: ScorecardIssue) => DUAL_CODES.has(issue.code);

/** the issues naming any of `matchUpIds`, keyed by line: a duplicate names each of its lines */
export function lineIssues(issues: ScorecardIssue[] = [], matchUpIds: string[]): Map<string, ScorecardIssue[]> {
  const wanted = new Set(matchUpIds);
  const byLine = new Map<string, ScorecardIssue[]>();
  for (const issue of issues) {
    if (isDualIssue(issue)) continue;
    const named = issue.matchUpId ? [issue.matchUpId] : (issue.matchUpIds ?? []);
    for (const matchUpId of named.filter((id) => wanted.has(id))) {
      byLine.set(matchUpId, [...(byLine.get(matchUpId) ?? []), issue]);
    }
  }
  return byLine;
}

export const dualIssues = (issues: ScorecardIssue[] = []) => issues.filter(isDualIssue);

/** a reader's message for an issue; the divergence names what the lines produce */
export function issueMessage(issue: ScorecardIssue, messages?: Record<string, string>): string {
  const message = messages?.[issue.code] ?? DEFAULT_ISSUE_MESSAGES[issue.code] ?? issue.code;
  return issue.code === MANUAL_SCORE_DIVERGES && issue.info ? `${message} ${issue.info}` : message;
}
