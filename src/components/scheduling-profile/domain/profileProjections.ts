/**
 * Scheduling Profile — Profile Projections
 *
 * Derives board-renderable data from the scheduling profile state.
 */

import type {
  SchedulingProfile,
  RoundProfile,
  RoundKey,
  RoundLocator,
  ValidationResult,
  Severity,
} from '../types';
import { roundKeyString, pickRoundKey } from './utils';

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
    return locatorMatch(r.context?.locator, locator) || locatorMatch(r.context?.prerequisite, locator);
  });
}

function locatorMatch(loc: RoundLocator | undefined, target: RoundLocator): boolean {
  return !!loc && loc.date === target.date && loc.venueId === target.venueId && loc.index === target.index;
}

export function maxSeverity(issues: ValidationResult[]): Severity | null {
  if (!issues.length) return null;
  if (issues.some((i) => i.severity === 'ERROR')) return 'ERROR';
  if (issues.some((i) => i.severity === 'WARN')) return 'WARN';
  return 'INFO';
}

export function findRoundInProfile(
  profile: SchedulingProfile,
  roundKey: RoundKey,
): RoundLocator | null {
  const target = roundKeyString(roundKey);
  for (const day of profile) {
    for (const venue of day.venues) {
      for (let i = 0; i < venue.rounds.length; i++) {
        const r = venue.rounds[i];
        if (roundKeyString(pickRoundKey(r)) === target) {
          return {
            date: day.scheduleDate,
            venueId: venue.venueId,
            index: i,
            roundKey: pickRoundKey(r),
            roundSegment: r.roundSegment,
          };
        }
      }
    }
  }
  return null;
}
