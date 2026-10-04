/**
 * The dial pad reads the set count from the format's top level.
 *
 * `matchUpFormatCode.parse` puts `bestOf` and `exactly` at the top level of the parsed format, never inside
 * `setFormat`. The dial pad read `setFormat.bestOf`, so every format was treated as best of 3 (measured
 * 2026-10-04): SET5 dropped sets 4 and 5, a SET5 final-set format governed set 3, and SET1 took a second set.
 */
import { formatScoreString, setCountOf } from '../dialPadLogic';
import { matchUpFormatCode } from 'tods-competition-factory';
import { describe, it, expect } from 'vitest';

const SET5 = 'SET5-S:6/TB7';
const SET3 = 'SET3-S:6/TB7';
const SET3X = 'SET3X-S:T10';

const format = (digits: string, matchUpFormat: string) => formatScoreString(digits, { matchUpFormat });

describe('dial pad set count', () => {
  it('reads bestOf and exactly from the top level of the parsed format', () => {
    expect(setCountOf(matchUpFormatCode.parse(SET5))).toBe(5);
    expect(setCountOf(matchUpFormatCode.parse('SET1-S:6/TB7'))).toBe(1);
    expect(setCountOf(matchUpFormatCode.parse(SET3X))).toBe(3);
    expect(setCountOf(matchUpFormatCode.parse('SET7XA-S:T10P'))).toBe(7);
  });

  it('SET5: takes all five sets of a match that goes the distance', () => {
    expect(format('6446644664', SET5)).toBe('6-4 4-6 6-4 4-6 6-4');
  });

  it('SET5 with a final-set format: the final set is set 5, never set 3', () => {
    // set 3 is a regular set; only set 5 is the match tiebreak
    expect(format('644664', 'SET5-S:6/TB7-F:TB10')).toBe('6-4 4-6 6-4');
    expect(format('64466446' + '10-8', 'SET5-S:6/TB7-F:TB10')).toBe('6-4 4-6 6-4 4-6 [10-8]');
  });

  it('SET5 with -F:6/TB10: five sets are taken and set 5 uses the final-set format', () => {
    expect(format('6446644664', 'SET5-S:6/TB7-F:6/TB10')).toBe('6-4 4-6 6-4 4-6 6-4');
    // a final set at 6-6 goes to a tiebreak in set 5
    expect(format('64466446' + '76' + '12', 'SET5-S:6/TB7-F:6/TB10')).toBe('6-4 4-6 6-4 4-6 7-6(12)');
  });

  it('SET1: one set only', () => {
    expect(format('6464', 'SET1-S:6/TB7')).toBe('6-4');
  });

  it('SET3 is unchanged', () => {
    expect(format('6464', SET3)).toBe('6-4 6-4');
    expect(format('466464', SET3)).toBe('4-6 6-4 6-4');
    expect(format('4664' + '10-8', 'SET3-S:6/TB7-F:TB10')).toBe('4-6 6-4 [10-8]');
  });

  it('exactly: SET5X plays all five timed sets', () => {
    expect(format('5-1-5-1-5-1-5-1-5-1', 'SET5X-S:T10')).toBe('5-1 5-1 5-1 5-1 5-1');
  });

  it('exactly: SET3X still stops at three timed sets', () => {
    expect(format('10-1-0-1-5-3-7-2', SET3X)).toBe('10-1 0-1 5-3');
  });

  it('exactly + aggregate: SET7XA-S:T10P plays all seven timed sets', () => {
    expect(format('1-2-3-4-5-6-7-8-9-10-11-12-13-14', 'SET7XA-S:T10P')).toBe('1-2 3-4 5-6 7-8 9-10 11-12 13-14');
  });

  it('an aggregate decider is still set N + 1', () => {
    expect(format('30-25-25-30-20-20-1-0', 'SET3XA-S:T10-F:TB1')).toBe('30-25 25-30 20-20 [1-0]');
    expect(format('30-25-25-30-20-20-25-25-1-0', 'SET4XA-S:T10-F:TB1')).toBe('30-25 25-30 20-20 25-25 [1-0]');
  });
});

describe('dial pad stops once a best-of match is decided', () => {
  // the factory refuses a set played after the decision (setPlayedAfterDecision)
  it('SET3: no third set after a 2-0 win', () => {
    expect(format('646364', SET3)).toBe('6-4 6-3');
    expect(format('6175' + '11-9', 'SET3-S:6/TB7-F:TB10')).toBe('6-1 7-5');
  });

  it('SET3: a set decided by a tiebreak counts toward the decision', () => {
    expect(format('765-' + '64' + '64', SET3)).toBe('7-6(5) 6-4');
  });

  it('SET5: no fourth set after a 3-0 win', () => {
    expect(format('64646464', SET5)).toBe('6-4 6-4 6-4');
  });

  it('exactly formats play every set whatever the running score', () => {
    expect(format('5-1-5-1-5-1', SET3X)).toBe('5-1 5-1 5-1');
  });
});
