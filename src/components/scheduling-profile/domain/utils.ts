/**
 * Scheduling Profile — Domain Utilities
 *
 * Pure helper functions shared across the scheduling profile domain layer.
 */

import type { RoundProfile, RoundLocator, RoundKey } from '../types';

export function deepClone<T>(obj: T): T {
  return structuredClone(obj);
}

export function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

export function roundKeyString(r: RoundKey | RoundProfile): string {
  return `${r.tournamentId}|${r.eventId}|${r.drawId}|${r.structureId}|${r.roundNumber}`;
}

export function roundLabel(r: RoundProfile): string {
  const e = r.eventName ? `${r.eventName} \u2013 ` : '';
  const rn = r.roundName ?? `Round ${r.roundNumber}`;
  const seg = r.roundSegment
    ? ` (seg ${r.roundSegment.segmentNumber}/${r.roundSegment.segmentsCount})`
    : '';
  return `${e}${rn}${seg}`;
}

export function sameLocator(a: RoundLocator | null, b: RoundLocator | null): boolean {
  if (!a || !b) return false;
  return a.date === b.date && a.venueId === b.venueId && a.index === b.index;
}

export function pickRoundKey(r: RoundProfile): RoundKey {
  return {
    tournamentId: r.tournamentId,
    eventId: r.eventId,
    drawId: r.drawId,
    structureId: r.structureId,
    roundNumber: r.roundNumber,
  };
}
