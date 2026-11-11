/**
 * Which matchUps `renderInlineMatchUp` offers for scoring, in which mode. The renderer logs the refusal
 * returned here and renders nothing; that wiring is asserted in Chromium by
 * `src/stories/InlineScoringTests.stories.ts`. Moved from the retired happy-dom `renderInlineMatchUp.test.ts`.
 */
import { inlineInputLevel, inlineScoringRefusal } from '../inlineScoringOffer';
import { InlineScoringManager } from '../inlineScoringManager';
import { scoreGovernor } from 'tods-competition-factory';
import { describe, expect, it } from 'vitest';

const STANDARD_FORMAT = 'SET3-S:6/TB7';
const named = (sideNumber: number, participantName: string) => ({ sideNumber, participant: { participantName } });
const matchUp = (overrides: Record<string, any> = {}) =>
  ({
    matchUpId: 'mu-1',
    matchUpFormat: STANDARD_FORMAT,
    sides: [named(1, 'Alfa'), named(2, 'Bravo')],
    ...overrides
  }) as any;

describe('inlineInputLevel', () => {
  it('scores games mode by the game and every other mode by the point', () => {
    expect(inlineInputLevel('games')).toBe('game');
    expect(inlineInputLevel('points')).toBe('point');
  });
});

describe('inlineScoringRefusal', () => {
  it('offers a scorable matchUp and leaves its engine in the manager', () => {
    const manager = new InlineScoringManager();
    expect(inlineScoringRefusal({ matchUp: matchUp(), format: STANDARD_FORMAT, mode: 'points', manager })).toBe(
      undefined
    );
    expect(manager.has('mu-1')).toBe(true);
  });

  it('refuses a matchUp with no format, naming it, without touching the engine', () => {
    // A manager whose getOrCreate throws: no engine may be made for a matchUp that cannot be scored,
    // which is what stops an invented format reaching ScoringEngine.
    const manager = {
      getOrCreate: () => {
        throw new Error('an engine must not be created for a matchUp that cannot be scored');
      }
    } as any;
    const refusal = inlineScoringRefusal({
      matchUp: matchUp({ matchUpFormat: undefined }),
      format: undefined,
      mode: 'points',
      manager
    });
    expect(refusal).toContain('mu-1');
    expect(refusal).toContain("factory's matchUpFormat");
  });
});

// The factory reports what each segment can be scored with (`getInputLevels`). A segment of outs takes set
// totals only; inline scoring is by the point or the game, so such a format is not offered.
const HAS_INPUT_LEVELS = typeof (scoreGovernor.ScoringEngine.prototype as any).getInputLevels === 'function';

describe.skipIf(!HAS_INPUT_LEVELS)('inlineScoringRefusal: input levels', () => {
  it('does not offer point scoring for a format of outs, and removes the engine it asked', () => {
    const manager = new InlineScoringManager();
    const format = 'INN4XA-S:O3';
    const refusal = inlineScoringRefusal({
      matchUp: matchUp({ matchUpFormat: format }),
      format,
      mode: 'points',
      manager
    });
    expect(refusal).toContain(format);
    expect(refusal).toContain('point input');
    expect(manager.has('mu-1')).toBe(false);
  });

  it('does not offer game scoring for a combined point total', () => {
    const manager = new InlineScoringManager();
    const format = 'SET1-S:P32';
    const refusal = inlineScoringRefusal({
      matchUp: matchUp({ matchUpFormat: format }),
      format,
      mode: 'games',
      manager
    });
    expect(refusal).toContain('game input');
    expect(manager.has('mu-1')).toBe(false);
  });

  it('still offers point scoring for a combined point total', () => {
    const manager = new InlineScoringManager();
    const format = 'SET1-S:P32';
    expect(
      inlineScoringRefusal({ matchUp: matchUp({ matchUpFormat: format }), format, mode: 'points', manager })
    ).toBeUndefined();
    expect(manager.has('mu-1')).toBe(true);
  });
});
