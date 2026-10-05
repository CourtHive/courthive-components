/**
 * An aggregate format's sudden-death decider is set N + 1, never one of the N (factory #5166).
 *
 * CA, 2026-10-04: "-F:TB1 is a 'sudden death' tiebreak which only occurs in matchUps which are decided
 * by aggregate point scoring. In the INTENNSE competition format that is not to be considered one of
 * the N sets."
 *
 * So in SET3XA-S:T10-F:TB1 all three bolts are timed and the tiebreak is set 4, played only on a level
 * total. Each entry path components offers is pinned here: it accepts three level bolts plus the
 * decider as set 4, and refuses the decider played in bolt 3's place.
 */
import { columns, isComplete, winningSide as cardWinningSide } from '../logic/scoreEntrySelectors';
import { validateScore, validateSetScores } from '../utils/scoreValidator';
import { shouldExpandSets } from '../utils/setExpansionLogic';
import { formatScoreString } from '../approaches/dialPadLogic';
import { typed } from '../logic/__tests__/scoreEntryModelTestHelpers';
import { parseScore } from '../../../tools/freeScore/freeScore';
import { describe, expect, it } from 'vitest';

const FORMAT = 'SET3XA-S:T10-F:TB1';
const DECIDER_AS_SET_4 = '30-25 25-30 20-20 [1-0]';
const DECIDER_IN_BOLT_3 = '30-25 25-30 [1-0]';
const TYPED_DECIDER_AS_SET_4 = '30-25 25-30 20-20 1-0';
const ONE_ZERO_AS_BOLT_3 = '30-25 25-30 1-0';

const ACCEPTS = 'accepts three level bolts and the decider as set 4';
const REFUSES = "refuses the decider in bolt 3's place";

const LEVEL_BOLTS = [
  { side1: 30, side2: 25 },
  { side1: 25, side2: 30 },
  { side1: 20, side2: 20 }
];
const DECIDER = { side1TiebreakScore: 1, side2TiebreakScore: 0 };

describe('validateScore', () => {
  it(ACCEPTS, () => {
    const result = validateScore(DECIDER_AS_SET_4, FORMAT);
    expect(result.isValid).toBe(true);
    expect(result.winningSide).toBe(1);
  });

  it(REFUSES, () => {
    expect(validateScore(DECIDER_IN_BOLT_3, FORMAT).isValid).toBe(false);
  });

  it('refuses a decider after bolts that are not level', () => {
    expect(validateScore('30-25 25-30 20-10 [1-0]', FORMAT).isValid).toBe(false);
  });
});

describe('validateSetScores (Dynamic Sets)', () => {
  it(ACCEPTS, () => {
    const result = validateSetScores([...LEVEL_BOLTS, DECIDER], FORMAT, false);
    expect(result.isValid).toBe(true);
    expect(result.winningSide).toBe(1);
    expect(result.score).toBe(DECIDER_AS_SET_4);
  });

  it(REFUSES, () => {
    expect(validateSetScores([LEVEL_BOLTS[0], LEVEL_BOLTS[1], DECIDER], FORMAT, false).isValid).toBe(false);
  });
});

describe('parseScore (Free Score)', () => {
  it(ACCEPTS, () => {
    const result = parseScore(TYPED_DECIDER_AS_SET_4, FORMAT);
    expect(result.valid).toBe(true);
    expect(result.matchComplete).toBe(true);
    expect(result.sets[3].side1TiebreakScore).toBe(1);
  });

  it(REFUSES, () => {
    expect(parseScore(DECIDER_IN_BOLT_3, FORMAT).valid).toBe(false);
    // Unbracketed, a 1-0 in bolt 3 is a timed bolt and never the decider
    const bolt = parseScore(ONE_ZERO_AS_BOLT_3, FORMAT);
    expect(bolt.sets[2].side1Score).toBe(1);
    expect(bolt.sets[2].side1TiebreakScore).toBeUndefined();
  });
});

describe('formatScoreString (Dial Pad)', () => {
  it('formats the decider as set 4', () => {
    expect(formatScoreString(TYPED_DECIDER_AS_SET_4, { matchUpFormat: FORMAT })).toBe(DECIDER_AS_SET_4);
  });

  it('never formats bolt 3 as the decider', () => {
    expect(formatScoreString(ONE_ZERO_AS_BOLT_3, { matchUpFormat: FORMAT })).toBe(ONE_ZERO_AS_BOLT_3);
  });
});

describe('shouldExpandSets', () => {
  it('opens the set 4 decider after three level bolts, and not after three that are not', () => {
    const level = LEVEL_BOLTS.map(({ side1, side2 }) => ({ side1Score: side1, side2Score: side2 }));
    expect(shouldExpandSets(level, FORMAT)).toBe(true);
    expect(shouldExpandSets([...level.slice(0, 2), { side1Score: 20, side2Score: 10 }], FORMAT)).toBe(false);
  });

  it('opens bolt 3 after two bolts, level or not', () => {
    expect(
      shouldExpandSets(
        [
          { side1Score: 30, side2Score: 25 },
          { side1Score: 25, side2Score: 30 }
        ],
        FORMAT
      )
    ).toBe(true);
  });
});

describe('the score-entry card', () => {
  it(ACCEPTS, () => {
    const model = typed(FORMAT, [30, 25], [25, 30], [20, 20], [1, 0]);
    expect(isComplete(model)).toBe(true);
    expect(cardWinningSide(model)).toBe(1);
  });

  it('offers the set 4 decider only on a level total', () => {
    const level = typed(FORMAT, [30, 25], [25, 30], [20, 20]);
    expect(columns(level).some((slot) => slot.setIndex === 3)).toBe(true);
    expect(isComplete(level)).toBe(false);

    const decided = typed(FORMAT, [30, 25], [25, 30], [20, 10]);
    expect(columns(decided).some((slot) => slot.setIndex === 3)).toBe(false);
    expect(isComplete(decided)).toBe(true);
  });

  it(REFUSES, () => {
    // Bolt 3 is timed: a 1-0 there is a bolt, and the total 56-55 decides the match without a decider
    const model = typed(FORMAT, [30, 25], [25, 30], [1, 0]);
    expect(cardWinningSide(model)).toBe(1);
    expect(columns(model).some((slot) => slot.setIndex === 3)).toBe(false);
  });
});
