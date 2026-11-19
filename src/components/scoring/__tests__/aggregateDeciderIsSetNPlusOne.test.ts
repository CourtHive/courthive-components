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
import { typed } from '../logic/__tests__/scoreEntryModelTestHelpers';
import { parseScore } from '../../../tools/freeScore/freeScore';
import { describe, expect, it } from 'vitest';

const FORMAT = 'SET3XA-S:T10-F:TB1';
const DECIDER_IN_BOLT_3 = '30-25 25-30 [1-0]';
const TYPED_DECIDER_AS_SET_4 = '30-25 25-30 20-20 1-0';
const ONE_ZERO_AS_BOLT_3 = '30-25 25-30 1-0';

const ACCEPTS = 'accepts three level bolts and the decider as set 4';
const REFUSES = "refuses the decider in bolt 3's place";

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
