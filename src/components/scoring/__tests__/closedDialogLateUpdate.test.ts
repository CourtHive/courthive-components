// @vitest-environment happy-dom
/**
 * A closed scoring dialog must not reach into the next one.
 *
 * Found as a flaky story on #675(courthive-components), the first CI run to execute play functions:
 * `reasonCodeRoundTrip`'s "A full round trip through the dialog" sometimes submitted nothing. Probed
 * (2026-10-11): the free-score approach schedules `setTimeout(…, 100)` when it opens, and that timer
 * still fires after its dialog has closed. It then runs the CLOSED dialog's `handleScoreChange`, which
 * found Submit by the page-wide id `submitScoreV2` — by then the NEXT dialog's button — and disabled it
 * from its own stale, empty state. In the failing run that landed 24 ms before the click.
 *
 * In TMX the same thing happens to an operator who closes one score dialog and opens another within
 * about 100 ms: the new dialog's Submit is disabled for no reason they can see.
 *
 * Fake timers make the late update deterministic instead of a race.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { scoringModal } from '../scoringModal';
import { setScoringConfig } from '../config';
import { cModal } from '../../modal/cmodal';

const MODAL = 'section[id^="cmdl-"]';
const sides = () => [
  { sideNumber: 1, participant: { participantName: 'A. Player' } },
  { sideNumber: 2, participant: { participantName: 'B. Player' } }
];

/** A recorded retirement, opened in free score: the approach that schedules the late update. */
const retiredMatchUp = () => ({
  matchUpId: 'late-update-retired',
  matchUpStatus: 'RETIRED',
  winningSide: 1,
  score: { sets: [{ setNumber: 1, side1Score: 6, side2Score: 2, winningSide: 1 }], scoreStringSide1: '6-2 Ret.' },
  sides: sides()
});

/** A walkover, opened in dynamic sets, where the operator declares the ending as the story did. */
const walkoverMatchUp = () => ({
  matchUpId: 'late-update-walkover',
  matchUpStatus: 'WALKOVER',
  winningSide: 1,
  matchUpFormat: 'SET3-S:6/TB7',
  sides: sides()
});

function closeAll(): void {
  for (let attempt = 0; attempt < 5 && document.querySelector(MODAL); attempt += 1) cModal.close();
}

const openModals = () => document.querySelectorAll(MODAL).length;

/** Choose a radio the way the story's operator does; the approach defers its update with a 0 ms timer. */
function pickRadio(name: string, value: string): void {
  const radio = document.querySelector<HTMLInputElement>(`input[name="${name}"][value="${value}"]`);
  expect(radio, `control: the ${name} radio "${value}" is rendered`).toBeTruthy();
  radio!.checked = true;
  radio!.dispatchEvent(new Event('change', { bubbles: true }));
}
const submitButtons = () => [...document.querySelectorAll<HTMLButtonElement>('#submitScoreV2')];

beforeEach(() => {
  vi.useFakeTimers();
  closeAll();
});

afterEach(() => {
  closeAll();
  vi.useRealTimers();
  setScoringConfig({ scoringApproach: 'dynamicSets' });
});

describe('a closed scoring dialog', () => {
  it("does not disable the next dialog's Submit when its late update fires", () => {
    // Dialog A: free score, closed before its 100 ms timer fires.
    setScoringConfig({ scoringApproach: 'freeScore' });
    scoringModal({ matchUp: retiredMatchUp(), callback: () => undefined });
    expect(openModals(), 'control: dialog A opened').toBe(1);
    closeAll();
    expect(openModals(), 'control: dialog A closed').toBe(0);

    // Dialog B: a walkover the operator declares, submittable once its own deferred updates have run.
    setScoringConfig({ scoringApproach: 'dynamicSets' });
    let emitted: any;
    scoringModal({ matchUp: walkoverMatchUp(), callback: (outcome: any) => (emitted = outcome) });
    pickRadio('matchOutcome', 'WALKOVER');
    pickRadio('irregularWinner', '1');
    vi.advanceTimersByTime(50);
    expect(submitButtons(), 'control: only dialog B has a Submit').toHaveLength(1);
    expect(submitButtons()[0].disabled, 'control: dialog B is submittable on its own').toBe(false);

    // Dialog A's timer fires now, after it closed.
    vi.advanceTimersByTime(200);
    expect(submitButtons()[0].disabled).toBe(false);

    submitButtons()[0].click();
    expect(emitted?.matchUpStatus).toBe('WALKOVER');
  });
});
