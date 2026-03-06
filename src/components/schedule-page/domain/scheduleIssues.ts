/**
 * Schedule Page — Schedule Issue Index Builder
 *
 * Consumer provides issues directly; this module indexes them for UI display.
 */

import type { ScheduleIssue, ScheduleIssueSeverity, ScheduleIssueIndex, ScheduleIssueCounts } from '../types';

export function buildScheduleIssueIndex(issues: ScheduleIssue[]): ScheduleIssueIndex {
  const bySeverity: Record<ScheduleIssueSeverity, ScheduleIssue[]> = { ERROR: [], WARN: [], INFO: [] };
  const byDate: Record<string, ScheduleIssue[]> = {};
  const counts: ScheduleIssueCounts = { total: issues.length, ERROR: 0, WARN: 0, INFO: 0 };
  const countsByDate: Record<string, ScheduleIssueCounts> = {};

  const sevRank = (s: ScheduleIssueSeverity) => (s === 'ERROR' ? 0 : s === 'WARN' ? 1 : 2);

  for (const issue of issues) {
    bySeverity[issue.severity].push(issue);
    counts[issue.severity]++;

    if (issue.date) {
      (byDate[issue.date] ??= []).push(issue);
      const dc = (countsByDate[issue.date] ??= { total: 0, ERROR: 0, WARN: 0, INFO: 0 });
      dc.total++;
      dc[issue.severity]++;
    }
  }

  const stableSort = (a: ScheduleIssue, b: ScheduleIssue) =>
    sevRank(a.severity) - sevRank(b.severity) || a.message.localeCompare(b.message);

  const sorted = [...issues].sort(stableSort);
  for (const k of Object.keys(bySeverity) as ScheduleIssueSeverity[]) bySeverity[k].sort(stableSort);
  for (const k of Object.keys(byDate)) byDate[k].sort(stableSort);

  return { all: sorted, bySeverity, byDate, counts, countsByDate };
}
