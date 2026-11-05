import { determineWinningSide, shouldExpandSets } from '../../../components/scoring/utils/setExpansionLogic';
import { parseScore } from '../freeScore';
import { describe, expect, it } from 'vitest';

/**
 * Free Score on an overtime format (overtime activation S6): periods are "#-#", and how many are played is the
 * scoring engine's answer. The timed parser expected exactly the regulation count, so no overtime period could
 * be typed at all.
 */

const F1 = 'HAL2XA-S:T45P-O:2X/T15P-F:TB1';
const F2 = 'QTR4XA-S:T12P-O:U/T5P';
const F5 = 'HAL2XA-S:T40P-O:1/T10P';
const SO = 'HAL2XA-S:T45P-O:2X/T15P-F:SO5';

describe('Free Score, overtime', () => {
  it('a decided regulation is complete', () => {
    const result = parseScore('2-0 0-1', F5);
    expect(result).toMatchObject({ valid: true, matchComplete: true, incomplete: false });
  });

  it('a level regulation asks for overtime', () => {
    expect(parseScore('1-0 0-1', F5)).toMatchObject({ valid: false, matchComplete: false, incomplete: true });
    expect(parseScore('1-0 0-1 1-0', F5)).toMatchObject({ valid: true, matchComplete: true });
  });

  it('an exact block is played to its end, then the one-point decider', () => {
    expect(parseScore('1-0 0-1 1-0', F1)).toMatchObject({ matchComplete: false, incomplete: true });
    const decided = parseScore('1-0 0-1 1-0 0-1 0-1', F1);
    expect(decided).toMatchObject({ valid: true, matchComplete: true });
    expect(decided.sets.at(-1)).toMatchObject({ side1TiebreakScore: 0, side2TiebreakScore: 1 });
  });

  it('unlimited overtime takes as many periods as it plays', () => {
    const result = parseScore('20-20 20-20 20-20 20-20 5-5 6-6 7-5', F2);
    expect(result).toMatchObject({ valid: true, matchComplete: true });
    expect(result.sets).toHaveLength(7);
  });

  it('a period after the match was decided is an error, with the reason', () => {
    const result = parseScore('2-0 0-1 1-0', F5);
    expect(result.valid).toBe(false);
    expect(result.errors[0]?.message).toMatch(/^Set 3:/);
  });

  it('a shootout is its tally', () => {
    expect(parseScore('1-0 0-1 0-0 0-0 4-3', SO)).toMatchObject({ valid: true, matchComplete: true });
    expect(parseScore('1-0 0-1 0-0 0-0 4-0', SO).errors[0]?.message).toMatch(/catch up/);
  });
});

describe('set expansion, overtime', () => {
  it('expands while the engine calls the match undecided, and names the winner', () => {
    const sets = (pairs: number[][]) => pairs.map(([a, b]) => ({ side1Score: a, side2Score: b }));
    expect(
      shouldExpandSets(
        sets([
          [1, 0],
          [0, 1]
        ]),
        F5
      )
    ).toBe(true);
    expect(
      shouldExpandSets(
        sets([
          [2, 0],
          [0, 1]
        ]),
        F5
      )
    ).toBe(false);
    expect(
      determineWinningSide(
        sets([
          [1, 0],
          [0, 1],
          [0, 1]
        ]),
        F5
      )
    ).toBe(2);
  });
});
