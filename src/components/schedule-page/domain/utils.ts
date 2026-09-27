/**
 * Schedule Page — Domain Utilities
 *
 * Pure helper functions shared across the schedule page domain layer.
 */

import type { CatalogMatchUpItem, MatchUpSide, ScheduleCellSide } from '../types';

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

/**
 * Everything a catalog item can be found by, as one lower-cased line.
 *
 * `sides[].participantName` alone left doubles players unfindable by their own
 * name: the factory composes a PAIR's `participantName` from family names only
 * (`Phoebus/Smith`), so a search for "Aiden Phoebus" matched his singles matchUps
 * and silently skipped every doubles matchUp he was in. `individualParticipants`
 * carries the given+family names that the pair name drops, so both are pushed.
 */
/**
 * "Aiden Phoebus / Ravi Smith" — a doubles side's members, spelled out in full.
 *
 * Empty for a singles side and for an un-hydrated pair, which is the caller's cue to
 * set no tooltip at all rather than an empty one.
 *
 * Pure and here rather than inline in the renderer so it can be tested without a DOM:
 * the ecosystem's DOM layer is Playwright/Storybook, and `test-storybook` cannot
 * currently run in this repo (612/612 suites fail in the runner, measured 2026-09-27).
 */
export function memberNamesLabel(side?: MatchUpSide | ScheduleCellSide): string {
  return (side?.individualParticipants ?? [])
    .map((member) => member.participantName)
    .filter((participantName): participantName is string => !!participantName)
    .join(' / ');
}

export function matchUpSearchKey(item: CatalogMatchUpItem): string {
  const parts = [item.eventName, item.drawName ?? '', item.roundName ?? ''];
  if (item.sides) {
    for (const s of item.sides) {
      if (s.participantName) parts.push(s.participantName);
      for (const member of s.individualParticipants ?? []) {
        if (member.participantName) parts.push(member.participantName);
      }
    }
  }
  return parts.join(' ').toLowerCase();
}
