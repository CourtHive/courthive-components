// @vitest-environment happy-dom
/**
 * Tab out of the score goes to `[Submit]`, then on to the status chips.
 *
 * CA, 2026-09-30: *"Can the tab order go from the free score entry field or the last dynamic sets
 * entry field directly to [Submit] (when submit is active)? and then to the other status chips?"*
 *
 * The mechanism is worth knowing before reading the assertions. Dynamic Sets already owns Tab — it
 * walks DOWN each column rather than across the row, because the DOM order of the grid is wrong for
 * entry — and calls `preventDefault` on every step it takes. The one Tab it does NOT take is the one
 * off the end of the run, so the card can recognise that Tab by `event.defaultPrevented` being false
 * and needs no new region contract to do it. Free Score never takes any, so its field qualifies on
 * the first press.
 */
import { describe, expect, it } from 'vitest';

import { openScoreEntryDialog } from '../scoreEntryDialog';
import { cModal } from '../../modal/cmodal';

const SIDES: any = [{ participantName: 'Lower' }, { participantName: 'Upper' }];
const FORMAT = 'SET3-S:6/TB7';

const submit = () => document.querySelector<HTMLButtonElement>('button[data-action="submit"]')!;
const endings = () => document.querySelector('.chc-sec-endings') as HTMLElement;
const cell = (side: number, set: number) =>
  document.querySelector<HTMLInputElement>(`input[data-side="${side}"][data-set="${set}"]`);

function closeAll() {
  for (let attempt = 0; attempt < 6 && document.querySelector('section[id^="cmdl-"]'); attempt += 1) cModal.close();
  document.body.replaceChildren();
}

function open(over: Record<string, any> = {}) {
  closeAll();
  openScoreEntryDialog({ sides: SIDES, matchUpFormat: FORMAT, ...over } as any);
}

function type(input: HTMLInputElement, value: string) {
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

/** A real Tab: dispatched from the focused element so it bubbles the way the browser's does. */
function pressTab(from: HTMLElement, shiftKey = false) {
  from.focus();
  from.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey, bubbles: true, cancelable: true }));
}

describe('Tab from the score', () => {
  it('Free Score reaches Submit from its one field', () => {
    open({ approach: 'freeScore' });
    const field = document.querySelector<HTMLInputElement>(
      '.chc-sec-score-region input, .chc-sec-score-region textarea'
    )!;
    type(field, '6-4 6-3');
    expect(submit().disabled, 'the gate is open').toBe(false);

    pressTab(field);

    expect(document.activeElement).toBe(submit());
    closeAll();
  });

  it('and then Submit reaches the status chips', () => {
    open({ approach: 'freeScore' });
    const field = document.querySelector<HTMLInputElement>(
      '.chc-sec-score-region input, .chc-sec-score-region textarea'
    )!;
    type(field, '6-4 6-3');

    pressTab(submit());

    expect(endings().contains(document.activeElement)).toBe(true);
    closeAll();
  });

  it('Dynamic Sets reaches Submit only from the END of the run', () => {
    open();
    type(cell(2, 1)!, '4');
    type(cell(1, 1)!, '6');
    type(cell(2, 2)!, '3');
    type(cell(1, 2)!, '6');
    expect(submit().disabled).toBe(false);

    // From the FIRST cell the region takes the Tab itself and steps within the grid — Submit must not
    // steal it, or an operator could never tab from one cell to the next.
    pressTab(cell(1, 1)!);
    expect(document.activeElement, 'still inside the score').not.toBe(submit());

    // From the last cell of the RUN the region declines, and the card takes over.
    //
    // The run is not DOM order. Entry walks each column bottom-to-top — lower row first, then upper —
    // so the final position is the last set's UPPER cell, side 1. `.at(-1)` over the inputs gives side
    // 2's last cell instead, because the rows are siblings and side 1's whole row comes first; naming
    // the cell is the only way to be asking about the end of the run.
    pressTab(cell(1, 2)!);
    expect(document.activeElement).toBe(submit());

    closeAll();
  });

  it('does nothing while Submit is disabled, leaving the native order alone', () => {
    open();
    // A `7`, because in `S:6/TB7` it has no smart complement — measured. A `4` completes to 6-4, which
    // opens set 2, and the region then CONSUMES the Tab as an ordinary step: `defaultPrevented` would
    // be true for a reason that has nothing to do with the gate.
    type(cell(2, 1)!, '7');
    expect(submit().disabled, 'an incomplete score keeps the gate shut').toBe(true);

    const event = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    cell(1, 1)!.focus();
    cell(1, 1)!.dispatchEvent(event);

    // Asserted on the EVENT, not on focus. Calling `.focus()` on a disabled button moves nothing, so
    // "focus did not land on Submit" is true whether the gate is honoured or ignored — measured, and
    // the reason this assertion is not about `document.activeElement`.
    expect(event.defaultPrevented, 'the Tab is left to the browser').toBe(false);
    closeAll();
  });

  it('leaves a keypad key alone — a button is not the end of a score', () => {
    open({ approach: 'dialPad' });

    // Submit must be LIVE first. With the gate shut the field check is never reached, and this test
    // passed against a version that treated every keypad key as a score field — measured.
    for (const digit of ['4', '6', '3', '6']) {
      document.querySelector<HTMLButtonElement>(`.chc-sec-score-region button[data-digit="${digit}"]`)!.click();
    }
    expect(submit().disabled, 'the keypad entered a complete score').toBe(false);

    const key = document.querySelector<HTMLButtonElement>('.chc-sec-score-region button[data-digit="6"]')!;
    const event = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    key.focus();
    key.dispatchEvent(event);

    // Tabbing between keys has to keep working, so the keypad is never treated as a score field.
    expect(event.defaultPrevented, 'the Tab is left to the browser').toBe(false);
    expect(document.activeElement).not.toBe(submit());
    closeAll();
  });
});
