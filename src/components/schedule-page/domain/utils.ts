/**
 * Schedule Page — Domain Utilities
 *
 * Pure helper functions shared across the schedule page domain layer.
 */

import type { CatalogMatchUpItem, MatchUpSide } from '../types';

export function deepClone<T>(obj: T): T {
  return structuredClone(obj);
}

export function matchUpLabel(item: CatalogMatchUpItem): string {
  const sides = item.sides;
  if (sides?.length === 2) {
    const a = participantLabel(sides[0]);
    const b = participantLabel(sides[1]);
    if (a && b) return `${a} vs ${b}`;
    if (a) return `${a} vs TBD`;
    if (b) return `TBD vs ${b}`;
  }
  return 'TBD vs TBD';
}

export function participantLabel(side?: MatchUpSide): string {
  if (!side) return '';
  const name = side.participantName ?? '';
  const seed = side.seedNumber ? ` [${side.seedNumber}]` : '';
  return `${name}${seed}`;
}

export function matchUpSearchKey(item: CatalogMatchUpItem): string {
  const parts = [item.eventName, item.drawName ?? '', item.roundName ?? ''];
  if (item.sides) {
    for (const s of item.sides) {
      if (s.participantName) parts.push(s.participantName);
    }
  }
  return parts.join(' ').toLowerCase();
}
