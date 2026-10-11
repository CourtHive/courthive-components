/**
 * Inline (rally-by-rally) scoring of a combined-point total that allows a tie: 32 points split 16–16 end
 * the match with no winner (CA, 2026-10-11: ties are valid). The manager announced completion only for a
 * winner, so a tie reached inline never completed.
 */
import { InlineScoringManager } from '../inlineScoringManager';
import { describe, expect, it } from 'vitest';

const POINTS_32 = 'SET1-S:P32';

const base = (matchUpFormat: string): any => ({
  matchUpId: 'm1',
  matchUpFormat,
  matchUpStatus: 'TO_BE_PLAYED',
  sides: [{ sideNumber: 1 }, { sideNumber: 2 }]
});

function play(matchUpFormat: string, winners: (0 | 1)[]) {
  const completions: any[] = [];
  const manager = new InlineScoringManager({ onMatchComplete: (params) => completions.push(params) });
  const matchUp = base(matchUpFormat);
  manager.getOrCreate('m1', matchUpFormat, matchUp);
  for (const winner of winners) manager.addPoint('m1', winner, matchUp);
  return { manager, completions };
}

const alternating = (count: number) => Array.from({ length: count }, (_, index) => (index % 2) as 0 | 1);

describe('a combined-point tie reached inline', () => {
  it('16–16 of 32 completes the match, with no winner', () => {
    const { manager, completions } = play(POINTS_32, alternating(32));
    expect(manager.isComplete('m1')).toBe(true);
    expect(completions).toHaveLength(1);
    expect(completions[0].winningSide).toBeUndefined();
  });

  it('control: 17–15 completes with its winner, and 31 points have not completed', () => {
    const won = play(POINTS_32, [...alternating(30), 0, 0]);
    expect(won.completions).toHaveLength(1);
    expect(won.completions[0].winningSide).toBe(1);
    expect(play(POINTS_32, alternating(31)).completions).toHaveLength(0);
  });
});
