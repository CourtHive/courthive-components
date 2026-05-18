/**
 * Event Card — Status Pill Resolver
 *
 * Pure precedence:
 *   1. Every draw cancelled                                       -> cancelled
 *   2. matchUpCounts.total > 0 AND completed === total            -> completed
 *   3. matchUpCounts.inProgress > 0
 *      OR (start ≤ now ≤ end AND matchUpCounts.total > 0)         -> live
 *   4. drawCount > 0 AND (DRAFT_STATE present OR seedsOnly draw)  -> drawing
 *   5. drawCount === 0 AND entryCount > 0                         -> entries-open
 *   6. now < startDate                                            -> upcoming
 *   7. else                                                       -> null
 *
 * In lightMode the resolver doesn't have matchUpCounts and skips rules 2-3.
 */

import { EventMatchUpCounts, EventStatusPill } from './types';

export interface EventStatusResolverInput {
  allDrawsCancelled?: boolean;
  drawCount?: number;
  entryCount?: number;
  startDate?: string;
  endDate?: string;
  matchUpCounts?: EventMatchUpCounts;
  /** True when at least one drawDefinition carries the DRAFT_STATE extension. */
  hasDraftState?: boolean;
  /** True when at least one drawDefinition was generated with `automated.seedsOnly`. */
  hasSeedsOnlyDraw?: boolean;
}

function parseDate(iso?: string): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

function isLiveWindow(now: Date, start: Date | null, end: Date | null): boolean {
  if (!start || !end) return false;
  return start.getTime() <= now.getTime() && now.getTime() <= end.getTime();
}

export function resolveEventStatus(
  input: EventStatusResolverInput,
  now: Date = new Date()
): EventStatusPill | null {
  if (input.allDrawsCancelled) return { kind: 'cancelled', label: 'Cancelled' };

  const counts = input.matchUpCounts;
  if (counts && counts.total > 0 && counts.completed === counts.total) {
    return { kind: 'completed', label: 'Completed' };
  }

  const startDate = parseDate(input.startDate);
  const endDate = parseDate(input.endDate);

  if (counts && (counts.inProgress > 0 || (isLiveWindow(now, startDate, endDate) && counts.total > 0))) {
    return { kind: 'live', label: 'Live' };
  }

  const drawCount = input.drawCount ?? 0;
  if (drawCount > 0 && (input.hasDraftState || input.hasSeedsOnlyDraw)) {
    return { kind: 'drawing', label: 'Drawing' };
  }

  if (drawCount === 0 && (input.entryCount ?? 0) > 0) {
    return { kind: 'entries-open', label: 'Entries Open' };
  }

  if (startDate && now.getTime() < startDate.getTime()) {
    return { kind: 'upcoming', label: 'Upcoming' };
  }

  return null;
}
