/**
 * The factory's match-tiebreak complement, which the Dynamic Sets cells derive from.
 *
 * A contract test on `scoreGovernor.getTiebreakComplement`: the low score typed, and the high one the
 * factory answers, on either side. What the CELLS do with it — recalculating while a number is typed,
 * a paste, the shifted upper row, and entry with complements off — is browser input, asserted in
 * `src/stories/MatchTiebreakEntryTests.stories.ts` and `src/stories/MatchTiebreakComplementTests.stories.ts`.
 */
import { scoreGovernor } from 'tods-competition-factory';
import { expect, it } from 'vitest';

it.each([0, 1, 8, 9, 10, 16])('uses the real factory complement for low score %i on either side', (lowValue) => {
  const high = Math.max(10, lowValue + 2);
  expect(scoreGovernor.getTiebreakComplement({ lowValue, tiebreakTo: 10, isSide1: true })).toEqual([lowValue, high]);
  expect(scoreGovernor.getTiebreakComplement({ lowValue, tiebreakTo: 10, isSide1: false })).toEqual([high, lowValue]);
});
