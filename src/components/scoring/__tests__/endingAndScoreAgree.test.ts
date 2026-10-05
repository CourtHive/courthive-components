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

const { RETIRED, SUSPENDED, WALKOVER, DEFAULTED, ABANDONED, INCOMPLETE, CANCELLED } = matchUpStatusConstants;

const SIDES: any = [{ participantName: 'Lower' }, { participantName: 'Upper' }];
const FORMAT = 'SET3-S:6/TB7';
/** The row's recorded ending, read five times across these six tests. */
const ROW_ENDING = '[data-row-ending]';
const PRESSED = 'aria-pressed';

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

    inModal<HTMLButtonElement>(`button[data-ending="${SUSPENDED}"]`).click();
    expect(inModal<HTMLButtonElement>(`button[data-ending="${SUSPENDED}"]`).getAttribute(PRESSED)).toBe('true');

    // Completing the score is the act that contradicts it.
    enterSet(2, '6', '3');

    expect(inModal<HTMLButtonElement>(`button[data-ending="${SUSPENDED}"]`).getAttribute(PRESSED)).toBe('false');
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

// ── CA's rulings of 2026-10-04 ──────────────────────────────────────────────

const PART_PLAYED = 'legitimate while one set is played';
const BOTH_OUT = 'input[data-action="bothSidesOut"]';

/** A per-side control in the lower row's panel, which is the one the lower-case keys open. */
const panelOption = (status: string) =>
  inModal<HTMLButtonElement>(`[data-panel-side="2"] button[data-ending="${status}"]`);
/** A match-level ending, whether it is a privileged button or an item in the Other… menu. */
const matchEnding = (status: string) =>
  document.querySelector<HTMLButtonElement>(`.chc-sec-endings button[data-ending="${status}"]`);
const otherChip = () => inModal<HTMLButtonElement>('.chc-sec-endings button[data-action="other"]');
const submit = () => inModal<HTMLButtonElement>('button[data-action="submit"]');

/** The same card, with the outcome captured — what Submit SENDS is the contradiction CA reported. */
function openCapturing() {
  closeAll();
  const sent: any[] = [];
  openScoreEntryDialog({ sides: SIDES, matchUpFormat: FORMAT, onSubmit: (outcome: any) => sent.push(outcome) } as any);
  return sent;
}

describe('a default cannot follow a finished score', () => {
  // CA, 2026-10-04: *"keep the score (and then refuse Defaulted on a complete score)"*. A default keeps
  // its part-score, exactly as a retirement does, and so is refused on a finished score exactly as a
  // retirement is — in both orders.

  it('keeps the part-score it was given at', () => {
    open();
    enterSet(1, '6', '4');

    press('d');

    expect(inModal(ROW_ENDING).dataset.rowEnding).toBe(DEFAULTED);
    expect(cell(1, 1)!.value, 'a default is not a walkover: the score stays').toBe('6');
    expect(cell(2, 1)!.value).toBe('4');

    closeAll();
  });

  it('refuses the keystroke once the score is complete', () => {
    open();
    enterSet(1, '6', '4');
    enterSet(2, '6', '3');
    expect(band(), 'the match is complete').toContain('6-4 6-3');

    press('d');

    expect(document.querySelector(ROW_ENDING), 'no ending was recorded').toBeNull();
    expect(cell(1, 2)!.value, 'and nothing was cleared').toBe('6');

    closeAll();
  });

  it('disables the panel option, and leaves the walkover on offer', () => {
    open();
    enterSet(1, '6', '4');
    enterSet(2, '6', '3');

    inModal<HTMLButtonElement>('button[data-action="endedEarly"][data-side="2"]').click();

    expect(panelOption(DEFAULTED).disabled).toBe(true);
    expect(panelOption(DEFAULTED).title).toMatch(/score is complete/i);
    // A walkover CLEARS the score rather than contradicting it, so it stays live.
    expect(panelOption(WALKOVER).disabled).toBe(false);

    closeAll();
  });

  it('is retracted when the score finishes AFTER it was chosen', () => {
    open();
    enterSet(1, '6', '4');
    press('d');
    expect(inModal(ROW_ENDING).dataset.rowEnding, PART_PLAYED).toBe(DEFAULTED);

    enterSet(2, '6', '3');

    expect(document.querySelector(ROW_ENDING), 'the default is gone').toBeNull();
    expect(band()).toContain('6-4 6-3');

    closeAll();
  });

  it('retracts a DOUBLE default the same way — it is a default with no one advancing', () => {
    open();
    enterSet(1, '6', '4');
    press('d');
    inModal<HTMLInputElement>(BOTH_OUT).click();
    expect(inModal<HTMLInputElement>(BOTH_OUT).checked).toBe(true);

    enterSet(2, '6', '3');

    expect(document.querySelector(ROW_ENDING)).toBeNull();
    expect(document.querySelector(BOTH_OUT), 'the double default went with it').toBeNull();

    closeAll();
  });
});

describe('an ending that resolves nobody cannot follow a finished score', () => {
  // The reverse order of the retraction above. Finishing the score and THEN clicking Suspended used to
  // submit SUSPENDED beside a complete 6-4 6-3, because the retraction only ran when the SCORE changed.
  // The card's own words: "A rule enforced on only one of those orders is a rule an operator can walk
  // around."

  it('disables Suspended once the score is complete, and Submit sends an ordinary result', () => {
    const sent = openCapturing();
    enterSet(1, '6', '4');
    enterSet(2, '6', '3');

    const suspended = matchEnding(SUSPENDED)!;
    expect(suspended.disabled).toBe(true);
    expect(suspended.title).toMatch(/score is complete/i);

    // Clicked anyway: a disabled button dispatches nothing, so nothing is recorded.
    suspended.click();
    expect(matchEnding(SUSPENDED)!.getAttribute(PRESSED)).toBe('false');

    submit().click();
    expect(sent).toHaveLength(1);
    // An ordinary completed result carries NO matchUpStatus — the card reports a finished score as the
    // score and its winner (see `ScoreEntryOutcome`). The defect sent SUSPENDED here.
    expect(sent[0].matchUpStatus).toBeUndefined();
    expect(sent[0].winningSide).toBe(1);
    expect(sent[0].score).toBe('6-4 6-3');

    closeAll();
  });

  it('disables it AS the score finishes, without waiting for a full render', () => {
    // The privileged buttons are built by `render()`, and a typed score that finishes reaches only the
    // derived refresh. A control drawn while the score was partial must not stay live after it.
    open();
    enterSet(1, '6', '4');
    expect(matchEnding(SUSPENDED)!.disabled, PART_PLAYED).toBe(false);

    enterSet(2, '6', '3');

    expect(matchEnding(SUSPENDED)!.disabled).toBe(true);

    closeAll();
  });

  it('disables the Other… menu items that keep the score, and not the ones that clear it', () => {
    open();
    enterSet(1, '6', '4');
    enterSet(2, '6', '3');

    otherChip().click();

    expect(matchEnding(ABANDONED)!.disabled).toBe(true);
    expect(matchEnding(INCOMPLETE)!.disabled).toBe(true);
    // Cancelled CLEARS the score (as a walkover does), which resolves the contradiction rather than
    // leaving it standing — so it is still offered.
    expect(matchEnding(CANCELLED)!.disabled).toBe(false);

    matchEnding(ABANDONED)!.click();
    expect(otherChip().getAttribute(PRESSED), 'nothing was recorded from the menu').toBe('false');

    closeAll();
  });

  it('retracts an Other… ending chosen BEFORE the score finished', () => {
    open();
    enterSet(1, '6', '4');
    otherChip().click();
    matchEnding(ABANDONED)!.click();
    expect(otherChip().getAttribute(PRESSED), PART_PLAYED).toBe('true');

    enterSet(2, '6', '3');

    expect(otherChip().getAttribute(PRESSED)).toBe('false');
    expect(band()).toContain('6-4 6-3');

    closeAll();
  });

  it('keeps Tab from Submit landing on a chip it cannot focus', () => {
    // On a finished score the leading privileged chips are disabled, so "the first chip" has to be
    // the first one that can take focus.
    open();
    enterSet(1, '6', '4');
    enterSet(2, '6', '3');

    submit().focus();
    submit().dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }));

    const focused = document.activeElement as HTMLButtonElement;
    expect(inModal('.chc-sec-endings').contains(focused)).toBe(true);
    expect(focused.disabled).toBe(false);

    closeAll();
  });
});
