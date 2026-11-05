import { columns, error, isComplete, winningSide } from '../scoreEntrySelectors';
import { getSetFormatForIndex, matchUpConfigFor } from '../dynamicSetsLogic';
import { frozen, typed } from './scoreEntryModelTestHelpers';
import { describe, expect, it } from 'vitest';

/**
 * Score entry for overtime formats (overtime activation S6, CA 2026-11-04). The card capped the sets at
 * `exactly` and opened the next one whenever the last was timed, so F2/F3/F5 could not enter overtime and
 * F1/F4 opened it after a decided regulation. The entered sets are now replayed through the factory's
 * ScoringEngine, which decides how many are played.
 */

const F1 = 'HAL2XA-S:T45P-O:2X/T15P-F:TB1';
const F2 = 'QTR4XA-S:T12P-O:U/T5P';
const F3 = 'PER3XA-S:T20P-O:USD/T20P';
const F4 = 'PER3XA-S:T20P-O:1SD/T5P-F:TB1';
const F5 = 'HAL2XA-S:T40P-O:1/T10P';
const SO = 'HAL2XA-S:T45P-O:2X/T15P-F:SO5';

/** The set indexes the card offers for entry, in order. */
const openSets = (model) => [...new Set(columns(model).map((slot) => slot.setIndex))];

describe('the segment each set is played to', () => {
  it.each([
    [F1, 2, { timed: true, minutes: 15, based: 'P' }],
    [F1, 4, { tiebreakSet: { tiebreakTo: 1 } }],
    [F2, 9, { timed: true, minutes: 5, based: 'P' }],
    [SO, 4, { shootout: 5 }]
  ])('%s set index %i', (format, index, setFormat) => {
    expect(getSetFormatForIndex(index, matchUpConfigFor(format))).toEqual(setFormat);
  });
});

describe('overtime opens only on a level regulation', () => {
  it.each([F1, F4, F5])('%s: a decided regulation is the result', (format) => {
    const regulation =
      format === F4
        ? [
            [2, 0],
            [0, 1],
            [0, 0]
          ]
        : [
            [2, 0],
            [0, 1]
          ];
    const model = typed(format, ...(regulation as Array<[number, number]>));
    expect(openSets(model)).toEqual(regulation.map((_, i) => i));
    expect(isComplete(model)).toBe(true);
    expect(winningSide(model)).toBe(1);
  });

  it.each([
    [
      F2,
      [
        [20, 20],
        [20, 20],
        [20, 20],
        [20, 20]
      ]
    ],
    [
      F3,
      [
        [1, 0],
        [0, 1],
        [0, 0]
      ]
    ],
    [
      F5,
      [
        [1, 0],
        [0, 1]
      ]
    ]
  ])('%s: a level regulation opens an overtime period', (format, regulation) => {
    const model = typed(format, ...(regulation as Array<[number, number]>));
    expect(openSets(model)).toEqual([...regulation.map((_, i) => i), regulation.length]);
    expect(isComplete(model)).toBe(false);
  });
});

describe('overtime runs as long as the format says', () => {
  it('an exact block is played to its end', () => {
    const model = typed(F1, [1, 0], [0, 1], [1, 0]);
    expect(openSets(model)).toEqual([0, 1, 2, 3]);
    expect(isComplete(model)).toBe(false);
  });

  it('then the decider opens on a level total, and decides', () => {
    let model = typed(F1, [1, 0], [0, 1], [1, 0], [0, 1]);
    expect(openSets(model)).toEqual([0, 1, 2, 3, 4]);
    model = typed(F1, [1, 0], [0, 1], [1, 0], [0, 1], [0, 1]);
    expect(isComplete(model)).toBe(true);
    expect(winningSide(model)).toBe(2);
  });

  it('unlimited overtime grows one period at a time until a period ends unequal', () => {
    let model = typed(F2, [20, 20], [20, 20], [20, 20], [20, 20], [5, 5], [6, 6]);
    expect(openSets(model)).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(isComplete(model)).toBe(false);
    model = typed(F2, [20, 20], [20, 20], [20, 20], [20, 20], [5, 5], [6, 6], [7, 5]);
    expect(openSets(model)).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(isComplete(model)).toBe(true);
    expect(winningSide(model)).toBe(1);
  });

  it('a sudden-death period is decided by its one goal', () => {
    const model = typed(F3, [1, 0], [0, 1], [0, 0], [0, 1]);
    expect(isComplete(model)).toBe(true);
    expect(winningSide(model)).toBe(2);
  });

  it('a finite ceiling ending level, with no decider, is finished with no winner', () => {
    const model = typed(F5, [1, 0], [0, 1], [1, 1]);
    expect(openSets(model)).toEqual([0, 1, 2]);
    expect(isComplete(model)).toBe(true);
    expect(winningSide(model)).toBeUndefined();
  });

  it('a saved unlimited-overtime score opens with every period', () => {
    const sets = [
      [20, 20],
      [20, 20],
      [20, 20],
      [20, 20],
      [5, 5],
      [6, 6],
      [7, 5]
    ].map(([a, b], i) => ({
      setNumber: i + 1,
      side1Score: a,
      side2Score: b
    }));
    const model = frozen({ matchUpFormat: F2, sets });
    expect(isComplete(model)).toBe(true);
    expect(winningSide(model)).toBe(1);
  });
});

describe('a shootout decider is its tally', () => {
  const level: Array<[number, number]> = [
    [1, 0],
    [0, 1],
    [0, 0],
    [0, 0]
  ];

  it('opens after a level extra time and decides', () => {
    expect(openSets(typed(SO, ...level))).toEqual([0, 1, 2, 3, 4]);
    const model = typed(SO, ...level, [4, 3]);
    expect(isComplete(model)).toBe(true);
    expect(winningSide(model)).toBe(1);
  });

  it('a tally no shootout ends on is an error, with the reason', () => {
    const model = typed(SO, ...level, [4, 0]);
    expect(isComplete(model)).toBe(false);
    expect(error(model)).toMatch(/catch up/);
  });
});
