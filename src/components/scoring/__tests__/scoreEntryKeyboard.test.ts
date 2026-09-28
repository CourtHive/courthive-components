/**
 * @vitest-environment happy-dom
 *
 * The keyboard, and the two buttons that did nothing.
 *
 * CA, 2026-09-28, using the merged dialog: *"[Clear] button not working on the score entry dialog; also,
 * when I enter '3' and the other side smart auto complete's to '6' the focus should then shift to the 2nd
 * set score entry, but it doesn't! This behavior works in the old dialog and should work in the new
 * dialog! Also the [Cancel] button should work! Also Shift-3 should enter the '3' on the other side! Like
 * the existing dynamic sets modal... there's lots here that is incomplete!"* And: *"if I click into an
 * entry field that has '0' and enter a value, I should not get e.g. '06'... it should resolve to '6'."*
 *
 * Every one of these is measured against `approaches/dynamicSetsApproach.ts`, which has had the whole
 * keyboard model since long before this card existed. The new region listened for `input` and nothing
 * else, so none of it was here.
 *
 * ── Why these tests press KEYS rather than setting values ──
 *
 * Shift+3 in a text field produces `#`, not `3`. A test that sets `input.value = '3'` and dispatches
 * `input` cannot express the difference between a shifted and an unshifted press, and would have passed
 * against the broken code. So these dispatch real `keydown` events carrying `code` and `shiftKey`, which
 * is the only place the distinction exists.
 */
import { matchUpStatusConstants, fixtures, policyConstants } from 'tods-competition-factory';
import { createDynamicSetsRegion } from '../regions/dynamicSetsRegion';
import { openScoreEntryDialog } from '../scoreEntryDialog';
import { renderScoreEntryCard } from '../scoreEntryCard';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { cModal } from '../../modal/cmodal';

import type { StatusCodeGroups } from '../logic/statusCodes';

const { WALKOVER } = matchUpStatusConstants;
const { POLICY_TYPE_SCORING } = policyConstants;

const REAL_GROUPS = fixtures.policies.POLICY_SCORING_USTA[POLICY_TYPE_SCORING].matchUpStatusCodes as StatusCodeGroups;

const FORMAT = 'SET3-S:6/TB7';
const SIDES: any = [{ participantName: 'Rosalind Lem' }, { participantName: 'Derrick Ellul' }];
const CLEAR = 'button[data-action="clear"]';
const CANCEL = 'button[data-action="cancel"]';
const MODAL = 'section[id^="cmdl-"]';
const FIRST_TIEBREAK = 'input[data-tiebreak-side="1"][data-tiebreak-set="1"]';
const SECOND_TIEBREAK = 'input[data-tiebreak-side="2"][data-tiebreak-set="1"]';

function mount(over: { matchUpFormat?: string; sets?: any[]; smartComplements?: boolean } = {}) {
  document.body.innerHTML = '';
  const matchUpFormat = over.matchUpFormat ?? FORMAT;
  const region = createDynamicSetsRegion({
    matchUpFormat,
    sets: over.sets,
    smartComplements: over.smartComplements,
    onChange: () => card.refresh(),
    onStructureChange: () => card.rerender()
  });
  const card = renderScoreEntryCard({ sides: SIDES, matchUpFormat, statusCodeGroups: REAL_GROUPS, region });
  document.body.append(card.element);

  const q = <T extends Element>(selector: string) => card.element.querySelector<T>(selector);
  const cell = (side: number, set: number) => q<HTMLInputElement>(`input[data-side="${side}"][data-set="${set}"]`);

  /** A real key press, which is the only way `shiftKey` and `code` exist. */
  const press = (input: HTMLInputElement, code: string, shiftKey = false) => {
    input.focus();
    input.dispatchEvent(
      new KeyboardEvent('keydown', { code, key: code.slice(-1), shiftKey, bubbles: true, cancelable: true })
    );
  };

  return { card, region, q, cell, press };
}

afterEach(() => {
  while (document.querySelector(MODAL)) cModal.close();
  document.body.innerHTML = '';
});

describe('entry begins on the LOWER row', () => {
  // CA, 2026-09-28: *"the dynamic sets when launched should always initially give focus to the lower
  // row; that way e.g. 3 is lower row and shift+3 is upper row, which feels natural ... each subsequent
  // entry column should start on the bottom cell."* The parallel CA drew is the shipping dynamic-sets
  // modal, where the two cells sit side by side and the plain digit is the LEFT one.
  //
  // The rule is only half about focus. Which cell holds the caret decides which row an unshifted digit
  // lands on, so these assert the consequence as well as the placement — a test that only checked
  // `document.activeElement` would pass against a card that then wrote the digit to the wrong row.

  it('focuses the first set\'s lower cell', () => {
    const h = mount();

    h.region.focusFirst();

    expect(document.activeElement).toBe(h.cell(2, 1));
  });

  it('puts a plain digit on the lower row, and its complement above', () => {
    const h = mount();

    h.press(h.cell(2, 1)!, 'Digit3');

    expect(h.cell(2, 1)!.value).toBe('3');
    expect(h.cell(1, 1)!.value).toBe('6');
  });

  it('puts a SHIFTED digit on the upper row, and its complement below', () => {
    const h = mount();

    h.press(h.cell(2, 1)!, 'Digit3', true);

    expect(h.cell(1, 1)!.value).toBe('3');
    expect(h.cell(2, 1)!.value).toBe('6');
  });

  it('starts each subsequent column on its bottom cell too', () => {
    const h = mount();

    h.press(h.cell(2, 1)!, 'Digit3');

    expect(document.activeElement).toBe(h.cell(2, 2));
  });
});

describe('a digit typed into an empty cell', () => {
  it('completes the set and moves on to the NEXT one', () => {
    // CA's case exactly: a 3 complements to 6, and focus lands in the second set.
    const h = mount();

    h.press(h.cell(1, 1)!, 'Digit3');

    expect(h.cell(1, 1)!.value).toBe('3');
    expect(h.cell(2, 1)!.value).toBe('6');
    // The LOWER cell of the next set: entry begins on the lower row in every column (CA, 2026-09-28).
    expect(document.activeElement).toBe(h.cell(2, 2));
  });

  it('puts a SHIFTED digit on the other side', () => {
    // Shift+3 means "the 3 belongs to them": side 2 gets the 3 and side 1 its complement. In a text field
    // this keystroke produces `#`, so it can only be read from `keydown`.
    const h = mount();

    h.press(h.cell(1, 1)!, 'Digit3', true);

    expect(h.cell(1, 1)!.value).toBe('6');
    expect(h.cell(2, 1)!.value).toBe('3');
    expect(h.cell(1, 1)!.value).not.toContain('#');
  });

  it('moves on even when the next set is ALREADY on screen', () => {
    // The case `settle` cannot cover: it moves focus only when the LAYOUT changed — a column appearing or
    // folding away — and correcting a set whose successor is already there changes no layout at all. Found
    // by planting the explicit focus away and watching nothing fail.
    const h = mount({
      sets: [
        { setNumber: 1, side1Score: 6, side2Score: 4, winningSide: 1 },
        { setNumber: 2, side1Score: 2, side2Score: 1 }
      ]
    });
    expect(h.cell(1, 2)).toBeTruthy();

    // Emptied first, as selecting on focus and typing would do in a browser.
    const first = h.cell(1, 1)!;
    first.value = '';
    first.dispatchEvent(new Event('input', { bubbles: true }));

    h.press(first, 'Digit3');

    expect(first.value).toBe('3');
    expect(h.cell(2, 1)!.value).toBe('6');
    expect(document.activeElement).toBe(h.cell(2, 2));
  });

  it('stops at the tiebreak when the set calls for one, rather than skipping ahead', () => {
    const h = mount();

    // A 6 has no complement in this format — 6-6 and 7-6 are both live — so the second value is typed.
    h.press(h.cell(1, 1)!, 'Digit7');
    h.cell(2, 1)!.value = '6';
    h.cell(2, 1)!.dispatchEvent(new Event('input', { bubbles: true }));

    // Both cells are there, and focus lands on the one belonging to the side that LOST the set — here
    // side 2, at 7-6. That is the only cell the complement can fire from: `getTiebreakComplement` derives
    // the winner's points from the loser's, and the winner's imply nothing about the loser's. On a 7-6 it
    // is also the lower row, so the tiebreak column and the games columns agree wherever they can.
    expect(h.q(FIRST_TIEBREAK)).toBeTruthy();
    expect(document.activeElement).toBe(h.q(SECOND_TIEBREAK));
  });

  it('does not move on once the match is decided', () => {
    const h = mount({ sets: [{ setNumber: 1, side1Score: 6, side2Score: 3, winningSide: 1 }] });

    // SHIFTED, so the 4 goes to side 2 and side 1 takes the set: 6-3 6-4 is a finished best-of-three.
    // Unshifted it would read 4-6, which is one set each and legitimately opens a third.
    h.press(h.cell(1, 2)!, 'Digit4', true);

    expect(h.cell(1, 2)!.value).toBe('6');
    expect(h.cell(2, 2)!.value).toBe('4');
    expect(h.cell(1, 3)).toBeNull();
  });

  it('leaves an AMBIGUOUS digit alone, for the operator to finish', () => {
    // A 7 complements to nothing in `S:6/TB7`, measured across all ten digits: 0-4 give n-6, a 5 gives
    // 5-7, a 6 gives 6-7 and opens the tiebreak, and 8 and 9 are out of range. Only the 7 is left for the
    // operator, because 7-5 and 7-6 are both live and guessing would put a set on screen nobody entered.
    const h = mount();
    const first = h.cell(1, 1)!;

    h.press(first, 'Digit7');

    expect(h.cell(2, 1)!.value).toBe('');
    expect(document.activeElement).toBe(first);
  });

  it('refuses a digit the format cannot reach, rather than inventing a score', () => {
    // The regression this path introduced: writing straight into the entries skips `clampGames`, so an 8
    // complemented to a 7 and stood as **8-7** — a score `S:6/TB7` cannot produce — with focus sent into
    // the tiebreak. The same keystroke on the input path was declined.
    const h = mount();

    h.press(h.cell(1, 1)!, 'Digit8');

    expect(h.cell(1, 1)!.value).toBe('');
    expect(h.cell(2, 1)!.value).toBe('');
    expect(h.q(FIRST_TIEBREAK)).toBeNull();
  });

  it('complements every digit the way the FACTORY does', () => {
    // The whole table, so a change in `getSetComplement` shows up here as a diff rather than as a bug
    // report. `-` is a digit the format leaves alone.
    const entered = [...Array(10).keys()].map((digit) => {
      const h = mount();
      h.press(h.cell(1, 1)!, `Digit${digit}`);
      return `${digit}:${h.cell(1, 1)!.value || '-'}-${h.cell(2, 1)!.value || '-'}`;
    });

    expect(entered).toEqual(['0:0-6', '1:1-6', '2:2-6', '3:3-6', '4:4-6', '5:5-7', '6:6-7', '7:---', '8:---', '9:---']);
  });
});

describe('moving between cells', () => {
  it('Tab goes to the OPPOSING score, not across to the next set', () => {
    // The DOM order is wrong for this grid: one side's cells are siblings, so a native Tab runs along the
    // row. The old dialog takes Tab over for the same reason.
    const h = mount({ sets: [{ setNumber: 1, side1Score: 6, side2Score: 4, winningSide: 1 }] });
    // From the cell entry BEGINS in — the lower row — so the step under test is the one an operator
    // actually takes. The walk is bottom-then-top within each column, so this is the opposing score.
    const from = h.cell(2, 1)!;

    from.focus();
    from.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }));

    expect(document.activeElement).toBe(h.cell(1, 1));
  });

  it('Shift-Tab goes back', () => {
    const h = mount({ sets: [{ setNumber: 1, side1Score: 6, side2Score: 4, winningSide: 1 }] });
    const from = h.cell(2, 2)!;

    from.focus();
    from.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true }));

    // Back out of the second set's entry cell and into the first set's upper row — the cell before it in
    // the same bottom-then-top walk.
    expect(document.activeElement).toBe(h.cell(1, 1));
  });

  it('Backspace in an EMPTY cell steps back', () => {
    const h = mount({ sets: [{ setNumber: 1, side1Score: 6, side2Score: 4, winningSide: 1 }] });
    const from = h.cell(2, 2)!;

    from.focus();
    from.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true, cancelable: true }));

    expect(document.activeElement).toBe(h.cell(1, 1));
  });

  it('Backspace in a FILLED cell deletes, and does not jump', () => {
    const h = mount({ sets: [{ setNumber: 1, side1Score: 6, side2Score: 4, winningSide: 1 }] });
    const from = h.cell(2, 1)!;

    from.focus();
    from.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true, cancelable: true }));

    expect(document.activeElement).toBe(from);
  });
});

describe('a cell that already holds a score', () => {
  it('resolves a leading zero, so a 0 plus a 6 is 6 and not 06', () => {
    // CA's case. Selecting on focus covers the keyboard; a mouse click places a caret instead, so the
    // value is normalised as well.
    const h = mount();
    const first = h.cell(1, 1)!;
    first.value = '0';
    first.dispatchEvent(new Event('input', { bubbles: true }));

    first.value = '06';
    first.dispatchEvent(new Event('input', { bubbles: true }));

    expect(first.value).toBe('6');
  });

  it('keeps a lone zero, because a set lost to love is a real score', () => {
    const h = mount();
    const first = h.cell(1, 1)!;
    first.value = '0';
    first.dispatchEvent(new Event('input', { bubbles: true }));

    expect(first.value).toBe('0');
  });

  it('keeps a two-digit score whose first digit is not a zero', () => {
    const h = mount({ matchUpFormat: 'SET1-S:TB10' });
    const first = h.cell(1, 1)!;
    first.value = '10';
    first.dispatchEvent(new Event('input', { bubbles: true }));

    expect(first.value).toBe('10');
  });

  it('SELECTS what is there on focus, so typing replaces it', () => {
    const h = mount({ sets: [{ setNumber: 1, side1Score: 6, side2Score: 4, winningSide: 1 }] });
    const first = h.cell(1, 1)!;

    first.focus();

    expect(first.selectionStart).toBe(0);
    expect(first.selectionEnd).toBe(1);
  });
});

describe('[Clear]', () => {
  it('discards the SCORE as well as the ending', () => {
    // It cleared the card's ending state and called `onClear`, and left every typed set where it was —
    // which is why it read as doing nothing at all.
    const h = mount({ sets: [{ setNumber: 1, side1Score: 6, side2Score: 4, winningSide: 1 }] });
    expect(h.cell(1, 1)!.value).toBe('6');

    h.q<HTMLButtonElement>(CLEAR)!.click();

    expect(h.cell(1, 1)!.value).toBe('');
    expect(h.cell(2, 1)!.value).toBe('');
    expect(h.region.getSets()).toEqual([]);
    expect(h.q<HTMLElement>('.chc-sec-band')!.textContent).toMatch(/no result/i);
  });

  it('clears a recorded ending too, and the reason with it', () => {
    const h = mount();

    h.q<HTMLButtonElement>('button[data-action="endedEarly"][data-side="2"]')!.click();
    h.q<HTMLButtonElement>(`[data-panel-side="2"] button[data-ending="${WALKOVER}"]`)!.click();
    expect(h.q('[data-row-ending]')).toBeTruthy();

    h.q<HTMLButtonElement>(CLEAR)!.click();

    expect(h.q('[data-row-ending]')).toBeNull();
    expect(h.card.getState()).toEqual({});
  });

  it('puts focus back where entry begins', () => {
    const h = mount({ sets: [{ setNumber: 1, side1Score: 6, side2Score: 4, winningSide: 1 }] });

    h.q<HTMLButtonElement>(CLEAR)!.click();

    // The first set's LOWER cell, which is where entry begins — the same place the dialog opens on.
    expect(document.activeElement).toBe(h.cell(2, 1));
  });

  it('lets a cleared set complement again', () => {
    // `complementsUsed` fires a complement once per set. Left standing through a Clear, the set would
    // behave differently from one in a dialog that had never been typed into.
    const h = mount();
    h.press(h.cell(1, 1)!, 'Digit3');
    expect(h.cell(2, 1)!.value).toBe('6');

    h.q<HTMLButtonElement>(CLEAR)!.click();
    h.press(h.cell(1, 1)!, 'Digit4');

    expect(h.cell(2, 1)!.value).toBe('6');
  });

  it('is DISABLED when there is nothing to clear, and live when there is', () => {
    const h = mount();
    expect(h.q<HTMLButtonElement>(CLEAR)!.disabled).toBe(true);

    h.press(h.cell(1, 1)!, 'Digit3');
    expect(h.q<HTMLButtonElement>(CLEAR)!.disabled).toBe(false);

    h.q<HTMLButtonElement>(CLEAR)!.click();
    expect(h.q<HTMLButtonElement>(CLEAR)!.disabled).toBe(true);
  });

  it('counts an ENDING as something to clear, with no score at all', () => {
    const h = mount();

    h.q<HTMLButtonElement>('button[data-action="endedEarly"][data-side="2"]')!.click();
    h.q<HTMLButtonElement>(`[data-panel-side="2"] button[data-ending="${WALKOVER}"]`)!.click();

    expect(h.q<HTMLButtonElement>(CLEAR)!.disabled).toBe(false);
  });
});

describe('[Cancel] and Enter, in the dialog', () => {
  const inModal = <T extends HTMLElement>(selector: string) => document.querySelector<T>(`${MODAL} ${selector}`);

  it('Cancel closes the dialog, and tells the host first', () => {
    // The card only REPORTS the click — it has no idea it is in a modal — and the dialog passed no
    // `onCancel`, so the button did nothing whatsoever.
    const order: string[] = [];
    openScoreEntryDialog({
      sides: SIDES,
      matchUpFormat: FORMAT,
      statusCodeGroups: REAL_GROUPS,
      onCancel: () => order.push('cancel'),
      onClose: () => order.push('close')
    } as any);

    inModal<HTMLButtonElement>(CANCEL)!.click();

    expect(document.querySelector(MODAL)).toBeNull();
    expect(order).toEqual(['cancel', 'close']);
  });

  it('Enter submits when Submit is live, and does nothing when it is not', () => {
    const onSubmit = vi.fn();
    openScoreEntryDialog({
      sides: SIDES,
      matchUpFormat: FORMAT,
      statusCodeGroups: REAL_GROUPS,
      onSubmit
    } as any);

    const enter = () =>
      inModal('[data-component="scoreEntryCard"]')!.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })
      );

    enter();
    expect(onSubmit).not.toHaveBeenCalled();

    const first = inModal<HTMLInputElement>('input[data-side="1"][data-set="1"]')!;
    first.focus();
    first.dispatchEvent(new KeyboardEvent('keydown', { code: 'Digit3', key: '3', bubbles: true, cancelable: true }));
    const second = inModal<HTMLInputElement>('input[data-side="1"][data-set="2"]')!;
    second.focus();
    second.dispatchEvent(new KeyboardEvent('keydown', { code: 'Digit4', key: '4', bubbles: true, cancelable: true }));

    enter();
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][0].score).toBe('3-6 4-6');
  });
});
