/**
 * What `inlineScoring.showSituation` shows. The footer drawing it, and real points played to a break point,
 * are `src/stories/InlineScoringTests.stories.ts` (Situation flags).
 */
import { InlineScoringManager } from '../inlineScoringManager';
import { situationFlags } from '../situationFlags';
import { describe, expect, it } from 'vitest';

import type { MatchUp } from '../../../types';

const NONE = {
  isTiebreak: false,
  isBreakPoint: false,
  isGamePoint: false,
  isSetPoint: false,
  isMatchPoint: false
};

describe('situationFlags', () => {
  it('names each flag that is on, in the order TB, Break, Game, Set, Match', () => {
    expect(situationFlags({ ...NONE, isBreakPoint: true }, false)).toBe('Break');
    expect(situationFlags({ ...NONE, isGamePoint: true, isSetPoint: true }, false)).toBe('Game • Set');
    expect(
      situationFlags(
        { isMatchPoint: true, isSetPoint: true, isGamePoint: true, isBreakPoint: true, isTiebreak: true },
        false
      )
    ).toBe('TB • Break • Game • Set • Match');
  });

  it('is empty with no flag on, and with no situation yet', () => {
    expect(situationFlags(NONE, false)).toBe('');
    expect(situationFlags(undefined, false)).toBe('');
  });

  it('reads Complete once the match is complete, whatever the last situation said', () => {
    expect(situationFlags({ ...NONE, isMatchPoint: true }, true)).toBe('Complete');
    expect(situationFlags(undefined, true)).toBe('Complete');
  });

  it('ignores the engine’s non-flag fields (server, serverDerived, isGoldenPoint)', () => {
    expect(situationFlags({ ...NONE, server: 1, serverDerived: true, isGoldenPoint: true }, false)).toBe('');
  });
});

describe('situationFlags over a real engine, SET3-S:6/TB7', () => {
  const base = { matchUpId: 'mu-1', matchUpFormat: 'SET3-S:6/TB7', sides: [] } as unknown as MatchUp;
  const flagsAfter = (points: (0 | 1)[]) => {
    const manager = new InlineScoringManager();
    manager.getOrCreate('mu-1', 'SET3-S:6/TB7', base);
    for (const winner of points) manager.addPoint('mu-1', winner, base);
    return situationFlags(manager.getSituation('mu-1'), manager.isComplete('mu-1'));
  };

  it('0-40 against side 1’s serve is a break point', () => {
    expect(flagsAfter([1, 1, 1])).toBe('Break');
  });

  it('5-0 and 40-0 on side 2’s serve is a game and set point', () => {
    expect(flagsAfter(Array.from({ length: 23 }, () => 1))).toBe('Game • Set');
  });

  it('nothing to flag at 15-0', () => {
    expect(flagsAfter([0])).toBe('');
  });
});
