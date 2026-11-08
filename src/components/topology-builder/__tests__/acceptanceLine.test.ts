import { describe, expect, it } from 'vitest';
import {
  changeSummary,
  clampCut,
  currentCut,
  entryChangesAt,
  heldEntries,
  linePool,
  statusAt
} from '../domain/acceptanceLine';

import type { AcceptanceEntry } from '../types';

/**
 * The acceptance line (CA 2026-11-08): a cut through the ranked MAIN entries. The line runs through DA and ALT only;
 * no cut is today's statuses; a cut at K accepts the first K by ranking. The control and the panel are tested in
 * the browser: src/stories/TopologyFitTests.stories.ts.
 */
const entry = (id: string, entryStatus: string): AcceptanceEntry => ({ participantId: id, name: id, entryStatus });
const DA = 'DIRECT_ACCEPTANCE';
const ALT = 'ALTERNATE';

// ranked best first: an alternate is ranked above the last direct acceptance
const RANKED = [
  entry('a', DA),
  entry('wc', 'WILDCARD'),
  entry('b', DA),
  entry('c', ALT),
  entry('d', DA),
  entry('wd', 'WITHDRAWN'),
  entry('e', ALT)
];

describe('the line', () => {
  it('runs through DA and ALT only; wildcards are held above it; withdrawals are out', () => {
    expect(linePool(RANKED).map((e) => e.participantId)).toEqual(['a', 'b', 'c', 'd', 'e']);
    expect(heldEntries(RANKED).map((e) => e.participantId)).toEqual(['wc']);
  });

  it('stands where today puts it with no cut, and changes nothing', () => {
    const pool = linePool(RANKED);
    expect(currentCut(pool)).toBe(3);
    expect(entryChangesAt(pool, undefined)).toEqual([]);
    expect(pool.map((_, index) => statusAt(pool, index))).toEqual([DA, DA, ALT, DA, ALT]);
  });

  it('a cut accepts the first K by ranking: the alternate ranked above a DA moves up, the DA down', () => {
    const changes = entryChangesAt(linePool(RANKED), 3);
    expect(changes).toEqual([
      { participantId: 'c', from: ALT, to: DA },
      { participantId: 'd', from: DA, to: ALT }
    ]);
    expect(changeSummary(changes)).toBe('1 DA → ALT · 1 ALT → DA');
  });

  it('a cut is kept within the pool', () => {
    const pool = linePool(RANKED);
    expect(clampCut(pool, -2)).toBe(0);
    expect(clampCut(pool, 99)).toBe(5);
    expect(entryChangesAt(pool, 0).every(({ to }) => to === ALT)).toBe(true);
  });
});
