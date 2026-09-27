/**
 * @vitest-environment happy-dom
 *
 * Rotating between score-entry approaches must not discard what has been typed.
 *
 * The projection itself is unit-tested in `logic/__tests__/outcomeProjection.test.ts`. This file
 * covers the half that a pure test cannot: the WIRING. The defect was never in a calculation — it
 * was that `switchApproach` nulled the outcome and `renderApproach` handed the next approach the
 * original saved matchUp. A correct projection that nothing calls would leave the bug exactly where
 * it was, so the assertion here is made through the real modal and the real menu.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { matchUpStatusConstants } from 'tods-competition-factory';
import { scoringModal } from '../scoringModal';
import { setScoringConfig } from '../config';

const { WALKOVER } = matchUpStatusConstants;

const SET_INPUT = 'input:not([type="radio"]):not([type="checkbox"])';

function freshMatchUp(): any {
  return {
    matchUpId: 'm1',
    drawId: 'd1',
    matchUpFormat: 'SET3-S:6/TB7',
    matchUpStatus: 'TO_BE_PLAYED',
    sides: [
      { sideNumber: 1, participant: { participantName: 'Alice' } },
      { sideNumber: 2, participant: { participantName: 'Bob' } }
    ]
  };
}

/** Open the dialog on `dynamicSets`, the approach a director lands in by default. */
function open(matchUp: any = freshMatchUp()) {
  const submitted: any[] = [];
  setScoringConfig({ scoringApproach: 'dynamicSets' });
  scoringModal({ matchUp, callback: (o) => submitted.push(o) });

  const setInputs = () => [...document.querySelectorAll<HTMLInputElement>(SET_INPUT)];

  const type = async (values: string[]) => {
    const inputs = setInputs();
    values.forEach((value, index) => {
      const input = inputs[index];
      if (!input) return;
      input.value = value;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await new Promise((resolve) => setTimeout(resolve, 40));
  };

  /** Click the caret, then the named approach in the dropdown it opens. */
  const rotateTo = async (label: string) => {
    const caret = document.querySelector('.chc-modal-menu-caret') as HTMLElement | null;
    if (!caret) throw new Error('no approach menu caret rendered');
    caret.click();
    await new Promise((resolve) => setTimeout(resolve, 20));

    const item = [...document.querySelectorAll<HTMLElement>('div, button, li, span')].find(
      (el) => el.textContent?.trim() === label && el.children.length === 0
    );
    if (!item) throw new Error(`no menu item labelled ${label}`);
    item.click();
    await new Promise((resolve) => setTimeout(resolve, 60));
  };

  return { submitted, setInputs, type, rotateTo };
}

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('rotating between approaches keeps the entry', () => {
  it('renders an approach menu at all — the premise', async () => {
    open();
    // Without a caret there is nothing to rotate with, and every assertion below would be vacuous.
    expect(document.querySelector('.chc-modal-menu-caret')).toBeTruthy();
  });

  it('carries a typed score from Dynamic Sets into Dial Pad', async () => {
    const h = open();
    await h.type(['6', '4']);

    await h.rotateTo('Dial Pad');

    // The bug: Dial Pad used to mount from the SAVED matchUp, which has no score at all, so the
    // entry vanished.
    //
    // Asserted on the FORMATTED score, not on the digits. `toContain('6')` and `toContain('4')` were
    // the first draft and they were vacuous: the Dial Pad renders a 0-9 keypad, so both digits are on
    // screen whether or not anything carried. Falsifying against the pre-fix behaviour is what caught
    // it — the test passed with the bug in place. '6-4' cannot come from a row of single-digit keys.
    const body = document.querySelector('section[id^="cmdl-"]')?.textContent ?? '';
    expect(body).toContain('6-4');
  });

  it('shows a saved walkover in the Free Score field after rotating onto it', async () => {
    // This assertion used to read "the field is EMPTY", recorded as a scope boundary: freeScore
    // seeded its input behind `if (internalScore)`, and a walkover has no score, so a status-only
    // matchUp rendered nothing. That gate has since been widened, so the boundary moved and this
    // moved with it rather than being left to rot or quietly deleted.
    //
    // The winner controls are still asserted, because they are what the carried status drives — the
    // projection's half of this — while the field is freeScore's half.
    const h = open({ ...freshMatchUp(), matchUpStatus: WALKOVER, winningSide: 1 });
    await h.rotateTo('Free Score');

    expect((document.querySelector('#scoreInputV2') as HTMLInputElement | null)?.value).toBe('wo');

    const winnerValues = [...document.querySelectorAll<HTMLInputElement>('input[type="radio"]')].map((r) => r.value);
    expect(winnerValues).toContain('1');
    expect(winnerValues).toContain('2');
  });

  it('rotating twice returns to the first approach with the entry intact', async () => {
    // The projection must not mutate the modal's matchUp, or the second rotation would read the
    // first one's result. This is that test, driven end to end.
    const h = open();
    await h.type(['6', '4']);

    await h.rotateTo('Free Score');
    await h.rotateTo('Dynamic Sets');

    const values = h.setInputs().map((i) => i.value);
    expect(values).toContain('6');
    expect(values).toContain('4');
  });
});
