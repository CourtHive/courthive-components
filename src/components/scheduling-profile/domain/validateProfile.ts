/**
 * Scheduling Profile — Validation Rules Engine
 *
 * Validates a scheduling profile draft against temporal constraints.
 * Rules: DATE_UNAVAILABLE, INVALID_SEGMENT_CONFIG, DUPLICATE_ROUND,
 * DUPLICATE_SEGMENT, ROUND_ORDER_VIOLATION.
 */

import type { SchedulingProfile, ValidationResult, TemporalAdapter, FlattenedRound, RoundLocator } from '../types';
import { roundKeyString, roundLabel, pickRoundKey } from './utils';

import { drawDefinitionConstants } from 'tods-competition-factory';

const { ROUND_ROBIN, ROUND_ROBIN_WITH_PLAYOFF } = drawDefinitionConstants;

// ============================================================================
// Public API
// ============================================================================

export interface ValidateProfileParams {
  profile: SchedulingProfile;
  temporal?: TemporalAdapter;
  venueOrder?: string[];
}

export function validateProfile({ profile, temporal, venueOrder }: ValidateProfileParams): ValidationResult[] {
  const results: ValidationResult[] = [];

  // Date availability: ERROR
  if (temporal?.isDateAvailable) {
    for (const day of profile) {
      const a = temporal.isDateAvailable(day.scheduleDate);
      if (!a.ok) {
        results.push({
          code: 'DATE_UNAVAILABLE',
          severity: 'ERROR',
          message: `Can't schedule on ${day.scheduleDate} \u2014 day is unavailable${a.reason ? ': ' + a.reason : ''}.`,
          context: { date: day.scheduleDate },
          fixActions: [{ kind: 'OPEN_TEMPORAL_GRID', date: day.scheduleDate, label: 'Open Temporal Grid' }]
        });
      }
    }
  }

  const planned = flatten(profile);

  // Segment config validity: ERROR
  for (const item of planned) {
    const seg = item.round.roundSegment;
    if (!seg) continue;
    const ok =
      Number.isInteger(seg.segmentNumber) &&
      Number.isInteger(seg.segmentsCount) &&
      seg.segmentsCount >= 2 &&
      seg.segmentNumber >= 1 &&
      seg.segmentNumber <= seg.segmentsCount;
    if (!ok) {
      results.push({
        code: 'INVALID_SEGMENT_CONFIG',
        severity: 'ERROR',
        message: `Invalid segment configuration for ${roundLabel(item.round)}.`,
        context: {
          locator: item.locator,
          date: item.locator.date,
          venueId: item.locator.venueId
        }
      });
    }
  }

  // Duplicates: ERROR
  const seenNoSeg = new Map<string, RoundLocator>();
  const seenSeg = new Map<string, RoundLocator>();

  for (const item of planned) {
    const r = item.round;
    const base = roundKeyString(r);

    if (!r.roundSegment) {
      if (seenNoSeg.has(base)) {
        results.push({
          code: 'DUPLICATE_ROUND',
          severity: 'ERROR',
          message: `Round is planned more than once: ${roundLabel(r)}.`,
          context: {
            scope: `${r.drawId}|${r.structureId}`,
            locator: item.locator,
            date: item.locator.date,
            venueId: item.locator.venueId
          },
          fixActions: [{ kind: 'JUMP_TO_ITEM', locator: seenNoSeg.get(base)!, label: 'Jump to existing' }]
        });
      } else {
        seenNoSeg.set(base, item.locator);
      }
    } else {
      const segKey = `${base}|${r.roundSegment.segmentNumber}/${r.roundSegment.segmentsCount}`;
      if (seenSeg.has(segKey)) {
        results.push({
          code: 'DUPLICATE_SEGMENT',
          severity: 'ERROR',
          message: `Segment planned more than once: ${roundLabel(r)}.`,
          context: {
            scope: `${r.drawId}|${r.structureId}`,
            locator: item.locator,
            date: item.locator.date,
            venueId: item.locator.venueId
          },
          fixActions: [{ kind: 'JUMP_TO_ITEM', locator: seenSeg.get(segKey)!, label: 'Jump to existing' }]
        });
      } else {
        seenSeg.set(segKey, item.locator);
      }
    }
  }

  // Local precedence: ERROR
  results.push(...validateRoundPrecedenceLocal({ profile, venueOrder }));

  return results;
}

// ============================================================================
// Precedence Validation
// ============================================================================

// Structure types where round ordering is not meaningful
const UNORDERED_STRUCTURE_TYPES = new Set([ROUND_ROBIN, ROUND_ROBIN_WITH_PLAYOFF]);

export function validateRoundPrecedenceLocal({
  profile,
}: {
  profile: SchedulingProfile;
  venueOrder?: string[];
}): ValidationResult[] {
  const out: ValidationResult[] = [];
  const planned = flatten(profile);

  // Only check ordering within the same structure + date + venue.
  // Cross-venue and cross-date ordering is left to the factory's validateSchedulingProfile().
  const byScope = groupBy(planned, (p) =>
    `${p.round.structureId}|${p.locator.date}|${p.locator.venueId}`
  );

  for (const [scope, items] of byScope.entries()) {
    // Skip structures where round order doesn't imply precedence
    const sType = items[0]?.round.structureType;
    if (sType && UNORDERED_STRUCTURE_TYPES.has(sType)) continue;

    // Sort by index within the venue (already the natural order from flatten)
    items.sort((a, b) => a.locator.index - b.locator.index);

    for (let i = 0; i < items.length; i++) {
      const cur = items[i];

      let prereq: FlattenedRound | null = null;
      for (let j = i - 1; j >= 0; j--) {
        if (items[j].round.roundNumber > cur.round.roundNumber) {
          prereq = items[j];
          break;
        }
      }
      if (!prereq) continue;

      const fix = computeMinimalFix(items, i, prereq);

      out.push({
        code: 'ROUND_ORDER_VIOLATION',
        severity: 'ERROR',
        message: `Cannot place ${roundLabel(cur.round)} before ${roundLabel(prereq.round)} in this venue.`,
        context: {
          scope,
          drawId: cur.round.drawId,
          structureId: cur.round.structureId,
          date: cur.locator.date,
          venueId: cur.locator.venueId,
          locator: cur.locator,
          prerequisite: prereq.locator
        },
        fixActions: [
          { kind: 'JUMP_TO_ITEM', locator: prereq.locator, label: 'Jump to prerequisite' },
          ...(fix.moveOffenderAfter
            ? [
                {
                  kind: 'MOVE_ITEM_AFTER' as const,
                  locator: cur.locator,
                  after: fix.moveOffenderAfter,
                  label: 'Move offending round after prerequisite set'
                }
              ]
            : []),
          ...(fix.movePrereqBefore
            ? [
                {
                  kind: 'MOVE_ITEM_BEFORE' as const,
                  locator: prereq.locator,
                  before: fix.movePrereqBefore,
                  label: 'Move prerequisite before offending round'
                }
              ]
            : [])
        ]
      });
    }
  }

  return dedupe(out);
}

// ============================================================================
// Internal Helpers
// ============================================================================

function computeMinimalFix(
  items: FlattenedRound[],
  _index: number,
  prereq: FlattenedRound
): { moveOffenderAfter: RoundLocator; movePrereqBefore: RoundLocator } {
  const cur = items[_index];

  let lastHigher = items.indexOf(prereq);
  for (let j = lastHigher + 1; j < items.length; j++) {
    if (items[j].round.roundNumber >= prereq.round.roundNumber) lastHigher = j;
  }

  return {
    moveOffenderAfter: items[lastHigher].locator,
    movePrereqBefore: cur.locator
  };
}

export function flatten(profile: SchedulingProfile): FlattenedRound[] {
  const out: FlattenedRound[] = [];
  for (const day of profile) {
    for (const venue of day.venues) {
      for (let i = 0; i < venue.rounds.length; i++) {
        const r = venue.rounds[i];
        out.push({
          round: r,
          locator: {
            date: day.scheduleDate,
            venueId: venue.venueId,
            index: i,
            roundKey: pickRoundKey(r),
            roundSegment: r.roundSegment
          }
        });
      }
    }
  }
  return out;
}

function groupBy<T>(items: T[], keyFn: (item: T) => string): Map<string, T[]> {
  const m = new Map<string, T[]>();
  for (const it of items) {
    const k = keyFn(it);
    const arr = m.get(k);
    if (arr) arr.push(it);
    else m.set(k, [it]);
  }
  return m;
}


function dedupe(results: ValidationResult[]): ValidationResult[] {
  const seen = new Set<string>();
  const out: ValidationResult[] = [];
  for (const r of results) {
    const k =
      r.code + '|' + r.message + '|' + (r.context?.scope ?? '') + '|' + JSON.stringify(r.context?.locator ?? {});
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(r);
  }
  return out;
}
