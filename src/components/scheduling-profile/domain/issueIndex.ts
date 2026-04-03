/**
 * Scheduling Profile — Issue Index
 *
 * Aggregates validation results into indexed groups for badges and panels.
 */

import type { ValidationResult, IssueIndex, Severity, SeverityCounts } from '../types';

export function buildIssueIndex(results: ValidationResult[]): IssueIndex {
  const bySeverity: Record<Severity, ValidationResult[]> = { ERROR: [], WARN: [], INFO: [] };
  const byDate: Record<string, ValidationResult[]> = {};
  const byVenue: Record<string, ValidationResult[]> = {};
  const byDraw: Record<string, ValidationResult[]> = {};
  const counts = {
    total: results.length,
    ERROR: 0,
    WARN: 0,
    INFO: 0,
    byDate: {} as Record<string, SeverityCounts>,
    byVenue: {} as Record<string, SeverityCounts>,
    byDraw: {} as Record<string, SeverityCounts>
  };

  const sevRank = (s: Severity) => (s === 'ERROR' ? 0 : s === 'WARN' ? 1 : 2);
  const stableSort = (a: ValidationResult, b: ValidationResult) =>
    sevRank(a.severity) - sevRank(b.severity) || a.code.localeCompare(b.code) || a.message.localeCompare(b.message);

  for (const r of results) {
    bySeverity[r.severity].push(r);
    counts[r.severity]++;

    const date = r.context?.date ?? r.context?.locator?.date;
    const venueId = r.context?.venueId ?? r.context?.locator?.venueId;
    const drawKey =
      r.context?.scope ??
      (r.context?.drawId && r.context?.structureId ? `${r.context.drawId}|${r.context.structureId}` : undefined);

    if (date) (byDate[date] ??= []).push(r);
    if (venueId) (byVenue[venueId] ??= []).push(r);
    if (drawKey) (byDraw[drawKey] ??= []).push(r);

    bump(counts.byDate, date, r.severity);
    bump(counts.byVenue, venueId, r.severity);
    bump(counts.byDraw, drawKey, r.severity);
  }

  for (const k of Object.keys(bySeverity) as Severity[]) bySeverity[k].sort(stableSort);
  for (const map of [byDate, byVenue, byDraw]) {
    for (const k of Object.keys(map)) map[k].sort(stableSort);
  }

  return { all: results, bySeverity, byDate, byVenue, byDraw, counts };
}

function bump(bucket: Record<string, SeverityCounts>, key: string | undefined, sev: Severity): void {
  if (!key) return;
  const c = (bucket[key] ??= { total: 0, ERROR: 0, WARN: 0, INFO: 0 });
  c.total++;
  c[sev]++;
}
