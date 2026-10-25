// @vitest-environment happy-dom
/**
 * What the PACKAGE promises, asserted through the barrel rather than through a deep path.
 *
 * Every other test in this repo imports the module it is testing directly, which is right for
 * behaviour and useless for reachability: `openScoreEntryDialog` can be complete, tested and
 * unreachable by a consumer at the same time, and was for a week. A host installs the package and
 * writes `import { openScoreEntryDialog } from 'courthive-components'` — that line is what this file
 * stands in for.
 *
 * The TYPES are part of the promise and the runtime assertion cannot see them — a dropped
 * `export type` leaves `openScoreEntryDialog` reachable and its parameter object unnameable, so a host
 * writing a wrapper has nothing to annotate. The declarations below name each exported type exactly
 * once, so `check-types` is what pins them. Verified by falsification: removing the type block from
 * `src/index.ts` produces `TS2305: Module '"../index"' has no exported member`.
 */
import { describe, expect, it } from 'vitest';

import type {
  ScoreEntryDialogParams,
  ScoreEntryApproach,
  ScoreEntryOutcome,
  ScoreEntryDialog,
  ScoreEntryCard
} from '../index';

const approach: ScoreEntryApproach = 'dialPad';

const params: ScoreEntryDialogParams = {
  sides: [{ participantName: 'Lower' }, { participantName: 'Upper' }],
  matchUpFormat: 'SET3-S:6/TB7',
  approach
};

/** The shape a host wrapper would declare. Never called; it exists so tsc must resolve both names. */
const openDialog: (params: ScoreEntryDialogParams) => ScoreEntryDialog = () => {
  throw new Error('not called');
};

/** The two remaining exported types, in the positions a host would use them. */
const onSubmit: (outcome: ScoreEntryOutcome) => void = () => undefined;
const readCard: (card: ScoreEntryCard) => HTMLElement = (card) => card.element;

describe('package barrel', () => {
  // 60s, not the 5s default. This is the only test in the repo that evaluates the WHOLE barrel —
  // d3, tiptap, tippy, every card and every panel — and it does so while 126 other files are running
  // on the same workers. Alone it takes ~3s; in the full suite it timed out at 5s the first time it
  // ran. A reachability test that only passes when run alone tells a consumer nothing.
  it('reaches the score entry dialog, and no longer the scoring modal it replaced', async () => {
    const pkg: Record<string, unknown> = await import('../index');

    expect(typeof pkg.openScoreEntryDialog).toBe('function');
    // CONTROL for the removal: a host still importing these gets undefined, not a stale function.
    expect(pkg.scoringModal).toBeUndefined();
    expect(pkg.setScoringConfig).toBeUndefined();
  }, 60_000);

  it('names every type a host has to annotate with', () => {
    expect(params.approach).toBe('dialPad');
    expect([openDialog, onSubmit, readCard].every((fn) => typeof fn === 'function')).toBe(true);
  });
});
