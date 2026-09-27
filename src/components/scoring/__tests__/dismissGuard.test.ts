/**
 * @vitest-environment happy-dom
 *
 * A click outside the scoring dialog must not discard a typed score.
 *
 * `cmodal` routes both the backdrop click and the modal-container click through `close(true)`, and
 * that conditional close is blocked only by an explicit `clickAway: false`. `scoringModal` passed
 * nothing, so the value was `undefined`, the guard never fired, and a mis-aimed click closed a
 * dialog full of unsaved input — silently, with no confirmation and no undo.
 *
 * Measured across the repo before the fix: `clickAway` was set in three stories and nowhere in
 * production, and only `false` blocks — so the stories passing `true` were no-ops and every modal in
 * the library dismissed on click-away.
 *
 * These assertions are about the dialog STILL BEING THERE, which is the whole property. The
 * companion assertion — that Cancel still closes it — matters just as much: a guard that made the
 * dialog undismissable would be a worse bug than the one it fixed, and is the obvious way to get
 * this wrong.
 *
 * ── Why the backdrop is not exercised here ──
 *
 * `cmodal` holds its backdrop in a MODULE-scope variable and creates it behind `if (!backdrop)`.
 * Clearing `document.body` between tests detaches the node while leaving that variable truthy, so it
 * is never re-appended and a backdrop assertion fails on a null for reasons that have nothing to do
 * with the guard. The modal container is re-created on every open and carries the same
 * `close(true)`, so it is the honest place to make this assertion. Recorded rather than worked
 * around, because the next person to write a cmodal test will meet the same thing.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { scoringModal } from '../scoringModal';
import { setScoringConfig } from '../config';

const DIALOG = 'section[id^="cmdl-"]';

function matchUp(): any {
  return {
    matchUpId: 'm1',
    matchUpFormat: 'SET3-S:6/TB7',
    matchUpStatus: 'TO_BE_PLAYED',
    sides: [
      { sideNumber: 1, participant: { participantName: 'Alice' } },
      { sideNumber: 2, participant: { participantName: 'Bob' } }
    ]
  };
}

function open() {
  setScoringConfig({ scoringApproach: 'dynamicSets' });
  scoringModal({ matchUp: matchUp(), callback: () => undefined });
  return {
    dialog: () => document.querySelector(DIALOG),
    /** The full-viewport container behind the dialog card — cmodal binds `close(true)` to it. */
    container: () => document.querySelector('.chc-modal-container') as HTMLElement | null,
    type: async (value: string) => {
      const input = document.querySelector(
        `${DIALOG} input:not([type="radio"]):not([type="checkbox"])`
      ) as HTMLInputElement | null;
      if (!input) throw new Error('no score input rendered');
      input.value = value;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      await new Promise((resolve) => setTimeout(resolve, 30));
    }
  };
}

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('the scoring dialog does not dismiss on a click away', () => {
  it('survives a click on the modal container', async () => {
    const h = open();
    await h.type('6');
    expect(h.dialog()).toBeTruthy();

    const container = h.container();
    expect(container, 'no modal container to click — the test would be vacuous').toBeTruthy();
    container?.click();
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(h.dialog()).toBeTruthy();
  });

  it('still closes on Cancel — the guard must not trap the operator', async () => {
    // The obvious way to get this wrong. A dialog that cannot be dismissed is worse than one that
    // dismisses too easily, and `cmodal` has no Escape handler to fall back on.
    const h = open();
    const cancel = [...document.querySelectorAll<HTMLButtonElement>(`${DIALOG} button`)].find((b) =>
      /cancel/i.test(b.textContent ?? '')
    );
    expect(cancel, 'no Cancel button rendered').toBeTruthy();

    cancel?.click();
    await new Promise((resolve) => setTimeout(resolve, 30));

    expect(h.dialog()).toBeNull();
  });
});
