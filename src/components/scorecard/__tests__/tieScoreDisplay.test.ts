/**
 * What `updateTieScore` writes into the header, by position. Moved from the retired happy-dom
 * `swapSides.test.ts`; the header itself, swapped and not, is asserted in Chromium by
 * `src/stories/ScorecardSwapSidesTests.stories.ts`.
 */
import { tieScoreDisplay } from '../scorecardSides';
import { describe, expect, it } from 'vitest';

const result = (side1Score: number, side2Score: number, winningSide?: number) => ({
  score: { sets: [{ side1Score, side2Score }] },
  winningSide
});

describe('tieScoreDisplay', () => {
  it('puts side 1 on the left, with its win, by default', () => {
    expect(tieScoreDisplay(result(3, 5, 2))).toEqual({ left: '3', right: '5', winner: 2 });
    expect(tieScoreDisplay(result(4, 2, 1), false)).toEqual({ left: '4', right: '2', winner: 1 });
  });

  it('swapped, puts side 2 and its win on the left', () => {
    expect(tieScoreDisplay(result(3, 5, 2), true)).toEqual({ left: '5', right: '3', winner: 1 });
    expect(tieScoreDisplay(result(4, 2, 1), true)).toEqual({ left: '2', right: '4', winner: 2 });
  });

  it('marks no winner while the tie is undecided, swapped or not', () => {
    expect(tieScoreDisplay(result(2, 2))).toEqual({ left: '2', right: '2', winner: undefined });
    expect(tieScoreDisplay(result(2, 1), true)).toEqual({ left: '1', right: '2', winner: undefined });
  });

  it('shows 0 for a side with no score yet', () => {
    expect(tieScoreDisplay({ score: { sets: [{ side1Score: 1 }] } }, true)).toEqual({
      left: '0',
      right: '1',
      winner: undefined
    });
  });

  it('has nothing to show for a result with no set', () => {
    expect(tieScoreDisplay({ score: { sets: [] } })).toBeUndefined();
    expect(tieScoreDisplay(undefined)).toBeUndefined();
  });
});
