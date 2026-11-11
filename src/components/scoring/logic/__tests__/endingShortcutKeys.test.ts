/**
 * The shortcut table: which ending a letter names, and which row the CASE names.
 *
 * CA, 2026-09-28: *"in all scoring modes 'w' should be a WALKOVER to the lower participant and 'W'
 * should be a WALKOVER to the upper participant; same for 'r/R' and 'd/D'"*. CA, 2026-10-15: `i`, `c`,
 * `a`, `s` for the match-level endings in either case, and *"we will leave 'Abandoned' and 'Incomplete'
 * without shortcut keys"*.
 *
 * Everything the browser decides — which focused field may receive a shortcut, where focus lands, the
 * panel opening, a refused control refusing its key — is in `ScoreEntryEndingShortcutTests.stories.ts`.
 */
import { matchUpStatusConstants } from 'tods-competition-factory';
import { endingForKey } from '../endingShortcutKeys';
import { describe, expect, it } from 'vitest';

const { WALKOVER, RETIRED, DEFAULTED, IN_PROGRESS, CANCELLED, AWAITING_RESULT, SUSPENDED } = matchUpStatusConstants;

/** The card's convention: lower case writes to the lower row, side 2. */
const CARD = { entrySide: 2 as const };
const NONE = {};

describe('the letter names the ending, and the CASE names the row', () => {
  it.each([
    ['w', WALKOVER, 2],
    ['W', WALKOVER, 1],
    ['r', RETIRED, 2],
    ['R', RETIRED, 1],
    ['d', DEFAULTED, 2],
    ['D', DEFAULTED, 1]
  ])('%s names %s against side %i', (key, status, sideNumber) => {
    expect(endingForKey(key, NONE, CARD)).toEqual({ kind: 'side', sideNumber, status });
  });

  it('reads the case from the CHARACTER, so Shift is irrelevant to it', () => {
    // Caps Lock produces `W` with no Shift held, and the operator is looking at a capital either way. A
    // modifier object carrying shiftKey must not change the answer for either case.
    expect(endingForKey('W', { shiftKey: true } as any, CARD)).toEqual({
      kind: 'side',
      sideNumber: 1,
      status: WALKOVER
    });
    expect(endingForKey('w', { shiftKey: true } as any, CARD)).toEqual({
      kind: 'side',
      sideNumber: 2,
      status: WALKOVER
    });
  });

  it('derives the upper side from the entry side, so the two cannot disagree', () => {
    expect(endingForKey('w', NONE, { entrySide: 1 })).toEqual({ kind: 'side', sideNumber: 1, status: WALKOVER });
    expect(endingForKey('W', NONE, { entrySide: 1 })).toEqual({ kind: 'side', sideNumber: 2, status: WALKOVER });
  });
});

describe('match-level endings: i, c, a, s — no side, so either case', () => {
  it.each([
    ['i', IN_PROGRESS],
    ['I', IN_PROGRESS],
    ['c', CANCELLED],
    ['C', CANCELLED],
    ['a', AWAITING_RESULT],
    ['A', AWAITING_RESULT],
    ['s', SUSPENDED],
    ['S', SUSPENDED]
  ])('%s names %s for the match, against no side', (key, status) => {
    expect(endingForKey(key, NONE, CARD)).toEqual({ kind: 'match', status });
  });
});

describe('what names nothing', () => {
  it.each(['b', 'B', 'n', 'N'])('%s — Abandoned and Incomplete have no key', (key) => {
    expect(endingForKey(key, NONE, CARD)).toBeUndefined();
  });

  it.each(['q', 'z', 'x', '4', '-', ' '])('%s — a letter or character outside the table', (key) => {
    // A table that swallowed unrelated keys would make the card unusable for anything else.
    expect(endingForKey(key, NONE, CARD)).toBeUndefined();
  });

  it.each(['W1', 'Escape', 'Enter', 'Shift', 'Tab'])('%s — a named key, not a character', (key) => {
    // `Escape` lower-cases to `escape`, which starts with `e` — and `Enter` with `e` too. Only a
    // single character is a shortcut.
    expect(endingForKey(key, NONE, CARD)).toBeUndefined();
  });

  it.each([
    ['r', { metaKey: true }],
    ['d', { ctrlKey: true }],
    ['w', { altKey: true }],
    ['s', { ctrlKey: true, metaKey: true }]
  ])('%s with a command modifier — Cmd+R is a reload and Ctrl+D a shell EOF', (key, modifiers) => {
    expect(endingForKey(key, modifiers, CARD)).toBeUndefined();
  });

  it('a modifier explicitly OFF is no modifier', () => {
    expect(endingForKey('r', { metaKey: false, ctrlKey: false, altKey: false }, CARD)).toEqual({
      kind: 'side',
      sideNumber: 2,
      status: RETIRED
    });
  });
});
