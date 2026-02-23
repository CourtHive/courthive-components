/**
 * Scheduling Profile — Profile Projections
 *
 * Derives board-renderable data from the scheduling profile state.
 */

import type {
  SchedulingProfile,
  RoundProfile,
  RoundLocator,
  ValidationResult,
  Severity,
} from '../types';

export function getVenueRounds(
  profile: SchedulingProfile,
  date: string,
  venueId: string,
): RoundProfile[] {
  const day = profile.find((d) => d.scheduleDate === date);
  const venue = day?.venues?.find((v) => v.venueId === venueId);
  return venue?.rounds ?? [];
}

export function getRoundAt(
  profile: SchedulingProfile,
  locator: RoundLocator,
): RoundProfile | null {
  const day = profile.find((d) => d.scheduleDate === locator.date);
  const venue = day?.venues?.find((v) => v.venueId === locator.venueId);
  return venue?.rounds?.[locator.index] ?? null;
}

export function findIssuesForLocator(
  ruleResults: ValidationResult[],
  locator: RoundLocator,
): ValidationResult[] {
  return ruleResults.filter((r) => {
    const loc = r.context?.locator;
    return (
      loc && loc.date === locator.date && loc.venueId === locator.venueId && loc.index === locator.index
    );
  });
}

export function maxSeverity(issues: ValidationResult[]): Severity | null {
  if (!issues.length) return null;
  if (issues.some((i) => i.severity === 'ERROR')) return 'ERROR';
  if (issues.some((i) => i.severity === 'WARN')) return 'WARN';
  return 'INFO';
}
