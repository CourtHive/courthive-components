// @vitest-environment happy-dom
/**
 * An ending and a score must not contradict each other.
 *
 * Three findings from CA's written review, 2026-09-30, which are one rule seen from three sides: the
 * card knew about each contradiction and said so in the band, while leaving the state that caused it
 * exactly where it was. Describing a contradiction is not resolving one.
 */
import { describe, expect, it } from 'vitest';

import { matchUpStatusConstants } from 'tods-competition-factory';
import { openScoreEntryDialog } from '../scoreEntryDialog';
import { cModal } from '../../modal/cmodal';

const { RETIRED, SUSPENDED, WALKOVER } = matchUpStatusConstants;

const SIDES: any = [{ participantName: 'Lower' }, { participantName: 'Upper' }];
const FORMAT = 'SET3-S:6/TB7';
/** The row's recorded ending, read five times across these six tests. */
const ROW_ENDING = '[data-row-ending]';

const inModal = <T extends HTMLElement>(s: string) => document.querySelector<T>(s) as T;
const cell = (side: number, set: number) =>
  document.querySelector<HTMLInputElement>(`input[data-side="${side}"][data-set="${set}"]`);
const band = () => document.querySelector('.chc-sec-band')?.textContent ?? '';
const card = () => inModal<HTMLElement>('[data-component="scoreEntryCard"]');

function closeAll() {
  for (let attempt = 0; attempt < 6 && document.querySelector('section[id^="cmdl-"]'); attempt += 1) cModal.close();
  document.body.replaceChildren();
}

function open() {
  closeAll();
  return openScoreEntryDialog({ sides: SIDES, matchUpFormat: FORMAT } as any);
}

function type(side: number, set: number, value: string) {
  const input = cell(side, set)!;
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

/** Entry begins on the LOWER row, so the loser's games go in first. */
function enterSet(set: number, side1: string, side2: string) {
  type(2, set, side2);
  type(1, set, side1);
}

const press = (key: string) => card().dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));

describe('a walkover discards the score', () => {
  it('CLEARS the cells, not just the submitted outcome', () => {
    open();
    enterSet(1, '6', '4');
    expect(cell(1, 1)!.value, 'the score is there to begin with').toBe('6');

    press('w');

    // The defect: the band said "no score recorded" while 6 and 4 sat in the cells, so the operator
    // read a walkover with a set score beside it.
    expect(cell(1, 1)!.value).toBe('');
    expect(cell(2, 1)!.value).toBe('');
    expect(inModal(ROW_ENDING).dataset.rowEnding).toBe(WALKOVER);

    closeAll();
  });

  it('does NOT clear for a retirement, which keeps its part-score', () => {
    open();
    // One set only, so the match is not yet decided and a retirement is still legitimate. A second
    // part-set cannot be used to set this up: typing a lone digit into set 2 SMART-COMPLETES it —
    // measured, `1` becomes 6-1 — and the match would be over before the key was pressed.
    enterSet(1, '6', '4');

    press('r');

    // The whole reason the clear is keyed on "carries no score" rather than "has an ending".
    expect(cell(1, 1)!.value).toBe('6');
    expect(cell(2, 1)!.value).toBe('4');
    expect(inModal(ROW_ENDING).dataset.rowEnding).toBe(RETIRED);

    closeAll();
  });
});

describe('a retirement cannot follow a finished score', () => {
  it('refuses the keystroke', () => {
    open();
    enterSet(1, '6', '4');
    enterSet(2, '6', '3');
    expect(band(), 'the match is complete').toContain('6-4 6-3');

    press('r');

    expect(document.querySelector(ROW_ENDING), 'no ending was recorded').toBeNull();

    closeAll();
  });

  it('disables the control, so the refusal is visible before it is tried', () => {
    open();
    enterSet(1, '6', '4');
    enterSet(2, '6', '3');

    inModal<HTMLButtonElement>('button[data-action="endedEarly"][data-side="2"]').click();

    const retired = inModal<HTMLButtonElement>(`[data-panel-side="2"] button[data-ending="${RETIRED}"]`);
    expect(retired.disabled).toBe(true);

    // And the endings that are still legitimate are still offered — a blanket disable would be the
    // easy wrong fix.
    expect(inModal<HTMLButtonElement>(`[data-panel-side="2"] button[data-ending="${WALKOVER}"]`).disabled).toBe(false);

    closeAll();
  });
});

describe('a completed score retracts an ending that says otherwise', () => {
  it('drops SUSPENDED when the score finishes', () => {
    open();
    enterSet(1, '6', '4');
    type(2, 2, '3');

    inModal<HTMLButtonElement>(`button[data-ending="${SUSPENDED}"]`).click();
    expect(inModal<HTMLButtonElement>(`button[data-ending="${SUSPENDED}"]`).getAttribute('aria-pressed')).toBe('true');

    // Completing the score is the act that contradicts it.
    type(1, 2, '6');

    expect(inModal<HTMLButtonElement>(`button[data-ending="${SUSPENDED}"]`).getAttribute('aria-pressed')).toBe('false');
    expect(band(), 'and the band reports an ordinary result').toContain('6-4 6-3');

    closeAll();
  });

  it('drops a RETIREMENT reached from the other order', () => {
    open();
    enterSet(1, '6', '4');
    press('r');
    expect(inModal(ROW_ENDING).dataset.rowEnding, 'legitimate while one set is played').toBe(RETIRED);

    // `endingOffered` refuses a retirement on a finished score; this is the same contradiction
    // arrived at backwards. A rule enforced on only one order is one an operator can walk around.
    enterSet(2, '6', '3');

    expect(document.querySelector(ROW_ENDING)).toBeNull();
    expect(band()).toContain('6-4 6-3');

    closeAll();
  });
});
