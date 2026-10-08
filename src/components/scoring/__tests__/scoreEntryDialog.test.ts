/**
 * @vitest-environment happy-dom
 *
 * The dialog — the card IN a modal, which is what a host opens.
 *
 * Everything here was story-local glue until now, and a story is not a gate: `test-storybook` cannot
 * run in this package at all (measured 2026-09-27, 612/612 fail on a runner-internal error), so a
 * Storybook play function is a thing a person watches rather than something CI checks. These are the
 * assertions that actually hold the four behaviours CA asked for — the modal, a working `[X]`, approach
 * switching and the format picker.
 *
 * The one claim worth stating plainly, because it is the reason `update` exists rather than a rebuild:
 * an approach switch must carry the typed score AND keep the recorded ending. A dialog that forgets
 * either looks like it worked.
 */
import { matchUpStatusConstants, fixtures, policyConstants } from 'tods-competition-factory';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { openScoreEntryDialog } from '../scoreEntryDialog';
import { cModal } from '../../modal/cmodal';

import type { StatusCodeGroups } from '../logic/statusCodes';

const { WALKOVER } = matchUpStatusConstants;
const { POLICY_TYPE_SCORING } = policyConstants;

const REAL_GROUPS = fixtures.policies.POLICY_SCORING_USTA[POLICY_TYPE_SCORING].matchUpStatusCodes as StatusCodeGroups;

const SIDES: [{ participantName: string }, { participantName: string }] = [
  { participantName: 'Rosalind Lem' },
  { participantName: 'Derrick Ellul' }
];

const MODAL = 'section[id^="cmdl-"]';
const FREE_SCORE_FIELD = 'input[data-free-score]';
const FORMAT = 'SET3-S:6/TB7';
const SHORT_FORMAT = 'SET1-S:TB10';
const SWITCH = 'button[data-action="switchApproach"]';
const EDIT_FORMAT = 'button[data-action="editFormat"]';
const SET_1_SIDE_1 = 'input[data-side="1"][data-set="1"]';
const SET_1_SIDE_2 = 'input[data-side="2"][data-set="1"]';
const SET_2_SIDE_1 = 'input[data-side="1"][data-set="2"]';
const SET_2_SIDE_2 = 'input[data-side="2"][data-set="2"]';
const SET_3_SIDE_1 = 'input[data-side="1"][data-set="3"]';
/** A best-of-ONE: it has no position for a second set, so anything beyond the first is dropped. */
const BEST_OF_ONE = 'SET1-S:6/TB7';
/** A best-of-three whose DECIDING set is a match tiebreak — only set 3's rule moves. */
const DECIDER_TB10 = 'SET3-S:6/TB7-F:TB10';
const BAND = '.chc-sec-band';
const ENDED_EARLY_2 = 'button[data-action="endedEarly"][data-side="2"]';
const ROW_ENDING = '[data-row-ending]';

function open(over: Record<string, any> = {}) {
  return openScoreEntryDialog({
    sides: SIDES,
    matchUpFormat: FORMAT,
    statusCodeGroups: REAL_GROUPS,
    ...over
  } as any);
}

const modal = () => document.querySelector<HTMLElement>(MODAL);
const q = <T extends HTMLElement>(selector: string) => document.querySelector<T>(`${MODAL} ${selector}`);
const all = (selector: string) => [...document.querySelectorAll<HTMLElement>(`${MODAL} ${selector}`)];
const click = (selector: string) => {
  const target = q<HTMLElement>(selector);
  if (!target) throw new Error(`nothing matched ${selector}`);
  target.click();
};

/** Type into a set cell the way a person does — the region listens for `input`, not for a value. */
function type(selector: string, value: string) {
  const field = q<HTMLInputElement>(selector);
  if (!field) throw new Error(`no input matched ${selector}`);
  field.value = value;
  field.dispatchEvent(new Event('input', { bubbles: true }));
}

afterEach(() => {
  // cModal keeps its stack at module scope, so a dialog left open leaks into the next test's `document`.
  while (document.querySelector(MODAL)) cModal.close();
  document.body.innerHTML = '';
});

describe('the modal', () => {
  it('opens the card inside one, wide enough for it', () => {
    open();

    expect(modal()).toBeTruthy();
    expect(q('[data-component="scoreEntryCard"]')).toBeTruthy();

    // 780 and not cModal's 450 default: at 450 the names wrap and the endings row overflows.
    const container = modal()!.firstElementChild as HTMLElement;
    expect(container.style.maxWidth).toBe('780px');
  });

  it('does not close on a backdrop click — a half-entered score is not dismissible by accident', () => {
    const onClose = vi.fn();
    open({ onClose });

    (modal()!.firstElementChild as HTMLElement).click();

    expect(modal()).toBeTruthy();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('closes on [X], and reports it once', () => {
    const onClose = vi.fn();
    const dialog = open({ onClose });

    click('button[data-action="close"]');

    expect(modal()).toBeNull();
    expect(onClose).toHaveBeenCalledTimes(1);

    // Calling close() after cModal has already closed must not report a second time: a host that reopens
    // on close would loop.
    dialog.close();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes on submit, after reporting the outcome', () => {
    const onSubmit = vi.fn();
    open({
      onSubmit,
      sets: [
        { setNumber: 1, side1Score: 6, side2Score: 4, winningSide: 1 },
        { setNumber: 2, side1Score: 6, side2Score: 3, winningSide: 1 }
      ]
    });

    click('button[data-action="submit"]');

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][0].winningSide).toBe(1);
    expect(modal()).toBeNull();
  });
});

describe('the dialog announces and focuses itself', () => {
  it('is named by the card heading, and says it is modal', () => {
    const dialog = open({ title: 'Enter the score' });

    // cModal gives the section `role="dialog"` and stops there: no `aria-modal`, and nothing naming it.
    expect(modal()!.getAttribute('role')).toBe('dialog');
    expect(modal()!.getAttribute('aria-modal')).toBe('true');

    const labelledBy = modal()!.getAttribute('aria-labelledby');
    expect(labelledBy).toBe(dialog.card.titleId);
    expect(document.getElementById(labelledBy!)!.textContent).toBe('Enter the score');
  });

  it('keeps the heading id across an approach switch', () => {
    // The header is rebuilt on every render, so an id assigned from OUTSIDE would survive exactly until
    // the first switch and `aria-labelledby` would then point at nothing.
    const dialog = open();
    const labelledBy = modal()!.getAttribute('aria-labelledby')!;

    dialog.setApproach('dialPad');

    expect(document.getElementById(labelledBy)).toBeTruthy();
  });

  it('focuses the first score cell, so typing starts immediately', () => {
    open();

    // The LOWER participant's cell. CA, 2026-09-28: *"the dynamic sets when launched should always
    // initially give focus to the lower row; that way e.g. 3 is lower row and shift+3 is upper row."*
    // The rule is only half about focus — it is what decides which row an unshifted digit lands on.
    expect(document.activeElement).toBe(q(SET_1_SIDE_2));
  });

  it('focuses the first DIGIT where the approach has no text field', () => {
    open({ approach: 'dialPad' });

    expect(q('input')).toBeNull();
    expect((document.activeElement as HTMLElement)?.dataset.digit).toBeTruthy();
  });

  it('focuses the Free Score FIELD, so it takes a keystroke without being clicked into', () => {
    // CA, 2026-09-28: *"Free Score should give the one entry field focus automatically rather than a
    // user having to click into it."*
    open({ approach: 'freeScore' });

    expect((document.activeElement as HTMLElement)?.dataset.freeScore).toBe('true');
  });

  it('follows the region across an APPROACH SWITCH, which is where focus was being dropped', () => {
    // Opening focused the entry surface; switching did not. The menu item that had focus is removed by
    // the very render that swaps the region, so focus fell to the body and the new approach — Free
    // Score above all, whose whole surface is one field — had to be clicked into before it would type.
    const dialog = open();

    dialog.setApproach('freeScore');
    expect((document.activeElement as HTMLElement)?.dataset.freeScore).toBe('true');

    dialog.setApproach('dialPad');
    expect((document.activeElement as HTMLElement)?.dataset.digit).toBeTruthy();

    dialog.setApproach('dynamicSets');
    expect(document.activeElement).toBe(q(SET_1_SIDE_2));
  });

  it('still leaves focus alone across a switch when the host said not to steal it', () => {
    // The `autoFocus: false` contract has to survive the new placement, or a host that opened the
    // dialog as a side effect of something else would have focus taken on every approach change.
    const outside = document.createElement('input');
    document.body.append(outside);
    outside.focus();

    const dialog = open({ autoFocus: false });
    dialog.setApproach('freeScore');

    expect(document.activeElement).toBe(outside);
  });

  it('leaves focus alone when the host says not to steal it', () => {
    const outside = document.createElement('input');
    document.body.append(outside);
    outside.focus();

    open({ autoFocus: false });

    expect(document.activeElement).toBe(outside);
  });

  // ── A reopened RESULT focuses no entry cell ──
  //
  // CA, 2026-10-01: *"a reopened completed matchUp should not focus any entry cell at all."* Measured
  // before this: the caret landed in set 1's lower cell and the region never folds the set under edit,
  // so a completed 7-6(3) 6-4 reopened with set 1 showing its fields and set 2 folded.
  const RECORDED_RESULT = {
    matchUpFormat: FORMAT,
    matchUpStatus: 'COMPLETED',
    winningSide: 1,
    score: {
      sets: [
        { setNumber: 1, side1Score: 7, side2Score: 6, side1TiebreakScore: 7, side2TiebreakScore: 3, winningSide: 1 },
        { setNumber: 2, side1Score: 6, side2Score: 4, winningSide: 1 }
      ]
    }
  };
  const FOLDED_1_2 = 'button[data-done-side="2"][data-done-set="1"]';

  it('focuses no entry cell when reopened on a completed result, so every set opens folded', () => {
    open({ matchUp: RECORDED_RESULT });

    // The dialog itself holds focus: inside the modal, so Escape and the tab order start there, and on
    // no cell, so nothing is pulled open.
    expect(document.activeElement).toBe(modal());
    expect(q(`${FOLDED_1_2}`)?.hidden, 'set 1 is folded').toBe(false);
    expect(q<HTMLElement>(FOLDED_1_2)?.textContent).toBe('63');
    expect(q<HTMLInputElement>(SET_1_SIDE_2)?.hidden).toBe(true);
  });

  it('keeps no cell focused across an approach switch on a reopened result', () => {
    const dialog = open({ matchUp: RECORDED_RESULT });

    dialog.setApproach('freeScore');
    expect((document.activeElement as HTMLElement)?.dataset?.freeScore).toBeUndefined();

    dialog.setApproach('dynamicSets');
    expect(document.activeElement).toBe(modal());
    expect(q<HTMLInputElement>(SET_1_SIDE_2)?.hidden, 'and set 1 is still folded').toBe(true);
  });

  it('treats a double exit as a result too — nothing to type', () => {
    open({ matchUp: { matchUpFormat: FORMAT, matchUpStatus: 'DOUBLE_WALKOVER', score: { sets: [] } } });

    expect(document.activeElement).toBe(modal());
  });

  it('still focuses the first cell on a reopened PART-score with no winner, which is there to be finished', () => {
    open({
      matchUp: {
        matchUpFormat: FORMAT,
        matchUpStatus: 'SUSPENDED',
        score: {
          sets: [
            { setNumber: 1, side1Score: 6, side2Score: 4, winningSide: 1 },
            { setNumber: 2, side1Score: 2, side2Score: 1 }
          ]
        }
      }
    });

    expect(document.activeElement).toBe(q(SET_1_SIDE_2));
  });
});

/**
 * CA, 2026-10-08: *"I'd like ESC to be the equivalent of the [Cancel] button and DEL/BKSP key to be the
 * equivalent of [Clear] button."* Each key presses its button, so the assertions are the button's own
 * effects; the cases that must NOT clear are where the key already means something else.
 */
describe('Escape is Cancel', () => {
  const escape = () =>
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));

  it('closes an EMPTY dialog and reports Cancel', () => {
    const onCancel = vi.fn();
    const onClose = vi.fn();
    open({ onCancel, onClose });

    escape();

    expect(modal()).toBeNull();
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes a dialog HOLDING a score, exactly as Cancel does — it replaced the keep-the-score guard', () => {
    const onCancel = vi.fn();
    const onSubmit = vi.fn();
    open({ onCancel, onSubmit });
    type(SET_1_SIDE_1, '6');

    escape();

    expect(modal()).toBeNull();
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onSubmit, 'Cancel discards; it never submits').not.toHaveBeenCalled();
  });

  it('does nothing while another dialog stands above it', () => {
    const onCancel = vi.fn();
    open({ onCancel });
    cModal.open({ content: 'a picker above the card', config: {} });

    escape();

    expect(onCancel).not.toHaveBeenCalled();
    expect(document.querySelectorAll(MODAL)).toHaveLength(2);
  });

  it('releases the keydown listener on close', () => {
    // Asserted on `removeEventListener` rather than through behaviour, deliberately. A leaked listener
    // is inert — `onKeyDown` returns early once `closed` is set — so no key, no reopen and no second
    // dialog can expose it. The only observable is the removal itself, and the cost of leaking is a
    // listener per dialog opened for the life of the page.
    const remove = vi.spyOn(document, 'removeEventListener');
    const dialog = open();

    dialog.close();

    expect(remove.mock.calls.some(([type]) => type === 'keydown')).toBe(true);
    remove.mockRestore();
  });
});

describe('Delete and Backspace are Clear', () => {
  const CLEAR = 'button[data-action="clear"]';
  const press = (target: EventTarget, key: string, init: { metaKey?: boolean } = {}) =>
    target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init }));
  const clearEnabled = () => !q<HTMLButtonElement>(CLEAR)!.disabled;

  it.each(['Delete', 'Backspace'])('%s from the dialog clears the score and the ending', (key) => {
    const onClear = vi.fn();
    open({ onClear });
    type(SET_1_SIDE_1, '6');
    click(ENDED_EARLY_2);
    click(`[data-panel-side="2"] button[data-ending="${WALKOVER}"]`);
    expect(clearEnabled(), 'control: there is something to clear').toBe(true);

    press(modal()!, key);

    expect(onClear).toHaveBeenCalledTimes(1);
    expect(q<HTMLInputElement>(SET_1_SIDE_1)!.value).toBe('');
    expect(q(ROW_ENDING)).toBeNull();
    expect(modal(), 'Clear empties the card; it does not close it').toBeTruthy();
  });

  it.each(['Delete', 'Backspace'])('%s inside a score cell edits the cell and does not clear', (key) => {
    const onClear = vi.fn();
    open({ onClear });
    type(SET_1_SIDE_1, '6');

    press(q(SET_1_SIDE_1)!, key);

    expect(onClear).not.toHaveBeenCalled();
    expect(q<HTMLInputElement>(SET_1_SIDE_1)!.value).toBe('6');
  });

  it('Backspace inside the Free Score field edits the text and does not clear', () => {
    const onClear = vi.fn();
    open({ approach: 'freeScore', onClear });
    type(FREE_SCORE_FIELD, '6-4');

    press(q(FREE_SCORE_FIELD)!, 'Backspace');

    expect(onClear).not.toHaveBeenCalled();
    expect(q<HTMLInputElement>(FREE_SCORE_FIELD)!.value).toBe('6-4');
  });

  it("leaves Backspace to the Dial Pad's keypad, and Delete there clears", () => {
    const onClear = vi.fn();
    open({ approach: 'dialPad', onClear });
    click('[data-digit="6"]');
    click('[data-digit="4"]');
    const digit = q('[data-digit="6"]')!;

    press(digit, 'Backspace');
    expect(onClear, "Backspace is the keypad's own key").not.toHaveBeenCalled();
    expect(clearEnabled(), 'the 6 is still entered').toBe(true);

    press(digit, 'Delete');
    expect(onClear).toHaveBeenCalledTimes(1);
    expect(clearEnabled()).toBe(false);
  });

  it('does nothing to an empty card', () => {
    const onClear = vi.fn();
    open({ onClear });

    press(modal()!, 'Delete');

    expect(onClear, 'Clear is disabled with nothing to remove').not.toHaveBeenCalled();
  });

  it('ignores a modified chord, which belongs to the browser', () => {
    const onClear = vi.fn();
    open({ onClear });
    type(SET_1_SIDE_1, '6');

    press(modal()!, 'Backspace', { metaKey: true });

    expect(onClear).not.toHaveBeenCalled();
  });

  it('ignores a key pressed OUTSIDE the dialog', () => {
    const onClear = vi.fn();
    open({ onClear });
    type(SET_1_SIDE_1, '6');
    const outside = document.createElement('button');
    document.body.append(outside);

    press(outside, 'Backspace');

    expect(onClear).not.toHaveBeenCalled();
    outside.remove();
  });
});

describe('opening on a recorded score', () => {
  const RECORDED = {
    matchUpFormat: FORMAT,
    matchUpStatus: 'RETIRED',
    winningSide: 1,
    score: {
      sets: [
        { setNumber: 1, side1Score: 6, side2Score: 4, winningSide: 1 },
        { setNumber: 2, side1Score: 2, side2Score: 1 }
      ]
    }
  };

  it('hydrates EVERY approach, not just the ones with cells', () => {
    // Measured 2026-09-28: Dynamic Sets and the Dial Pad hydrated from `sets` while **Free Score opened
    // with an empty field and a band showing no score at all** — the initial region was built with
    // `text: undefined`, so the one approach whose entire input is text had nothing to show. Asserted
    // across all three together, because the gap was invisible while each was checked on its own.
    for (const approach of ['dynamicSets', 'freeScore', 'dialPad'] as const) {
      const dialog = open({ matchUp: RECORDED, approach });

      expect(q<HTMLElement>(BAND)!.textContent, approach).toContain('6-4 2-1');
      dialog.close();
    }
  });

  it('puts the recorded score in the Free Score FIELD, as the text the other approaches display', () => {
    open({ matchUp: RECORDED, approach: 'freeScore' });

    expect(q<HTMLInputElement>(FREE_SCORE_FIELD)!.value).toBe('6-4 2-1');
  });

  it('reads the format off the matchUp when none is passed', () => {
    // `matchUpFormat: undefined` explicitly, because this file's `open` helper supplies one by default
    // and an explicitly passed format is meant to win.
    open({ matchUpFormat: undefined, matchUp: { matchUpFormat: SHORT_FORMAT, score: { sets: [] } } });

    expect(q<HTMLElement>('.chc-sec-format')!.textContent).toBe(SHORT_FORMAT);
  });
});

describe('approach switching', () => {
  it('offers all three and marks the one showing', () => {
    open();

    click(SWITCH);

    const items = all('[data-approach]');
    expect(items.map((item) => item.dataset.approach)).toEqual(['dynamicSets', 'freeScore', 'dialPad']);
    // The active one is listed and marked rather than omitted — a menu that hides the current state
    // makes the operator infer it from what is absent.
    expect(
      items.filter((item) => item.dataset.pressed === 'true' || item.getAttribute('aria-pressed') === 'true')
    ).toHaveLength(1);
    expect(q('[data-approach="dynamicSets"]')!.getAttribute('aria-pressed')).toBe('true');
  });

  it('swaps the region, and the switcher says which', () => {
    const onApproachChange = vi.fn();
    const dialog = open({ onApproachChange });

    expect(q('input[data-set="1"]')).toBeTruthy();

    click(SWITCH);
    click('[data-approach="freeScore"]');

    expect(q(FREE_SCORE_FIELD)).toBeTruthy();
    expect(q('input[data-set="1"]')).toBeNull();
    expect(q(SWITCH)!.textContent).toBe('Free Score');
    expect(dialog.approach()).toBe('freeScore');
    expect(onApproachChange).toHaveBeenCalledWith('freeScore');
  });

  it('carries the typed score across — sets to text, and back to cells', () => {
    const dialog = open();

    type(SET_1_SIDE_1, '6');
    type(SET_1_SIDE_2, '4');

    dialog.setApproach('freeScore');
    expect(q<HTMLInputElement>(FREE_SCORE_FIELD)!.value).toContain('6-4');

    dialog.setApproach('dialPad');
    expect(all('.chc-sec-readout').map((cell) => cell.textContent)).toEqual(['6', '4']);

    dialog.setApproach('dynamicSets');
    expect(q<HTMLInputElement>(SET_1_SIDE_1)!.value).toBe('6');
    expect(q<HTMLInputElement>(SET_1_SIDE_2)!.value).toBe('4');
  });

  it('keeps the recorded ending — it is a fact about the match, not about the keypad', () => {
    const dialog = open();

    click(ENDED_EARLY_2);
    click(`[data-panel-side="2"] button[data-ending="${WALKOVER}"]`);
    expect(q(ROW_ENDING)!.dataset.rowEnding).toBe(WALKOVER);

    dialog.setApproach('dialPad');

    const pill = q<HTMLElement>(ROW_ENDING);
    expect(pill, 'the walkover survives an approach switch').toBeTruthy();
    expect(pill!.closest<HTMLElement>('.chc-sec-row')!.dataset.side).toBe('2');
    expect(q<HTMLElement>(BAND)!.textContent).toContain('Rosalind Lem advances');
  });

  it('shows no menu when only one approach is offered', () => {
    const onSwitchApproach = vi.fn();
    open({ approaches: ['dialPad'], onSwitchApproach });

    expect(q(SWITCH)!.textContent).toBe('Dial Pad');
    click(SWITCH);
    expect(all('[data-approach]')).toHaveLength(0);
  });
});

describe('the format picker', () => {
  it('is inert text until the host can accept a change', () => {
    open();

    expect(q('.chc-sec-format')).toBeTruthy();
    expect(q(EDIT_FORMAT)).toBeNull();
  });

  it('opens the picker with the format showing, and applies what comes back', () => {
    const openFormatPicker = vi.fn();
    const onFormatChange = vi.fn();
    open({ onFormatChange, openFormatPicker });

    click(EDIT_FORMAT);
    expect(openFormatPicker.mock.calls[0][0].existingMatchUpFormat).toBe(FORMAT);

    // The picker calls back when the operator confirms, which is the only path that changes anything.
    openFormatPicker.mock.calls[0][0].callback(SHORT_FORMAT);

    expect(q(EDIT_FORMAT)!.textContent).toBe(SHORT_FORMAT);
    expect(onFormatChange).toHaveBeenCalledWith(SHORT_FORMAT);
  });

  it('rebuilds the region under the new format, KEEPING what the format has not invalidated', () => {
    // The third behaviour this has had. It carried the whole score, then CLEARED it (CA, 2026-09-28:
    // *"any change of matchUpFormat should clear the score... but we'll do something interesting
    // later"*), and this is the later: the factory's `retainScoreForFormat` decides, set by set.
    //
    // A completed 6-4 is a legal first set under `SET1-S:6/TB7`, so it stays. What goes is the SECOND
    // set — the new format has no position for it.
    const dialog = open({ onFormatChange: vi.fn(), openFormatPicker: vi.fn() });

    type(SET_1_SIDE_1, '6');
    type(SET_1_SIDE_2, '4');

    // A completed first set reveals the second, under a best-of-three.
    expect(q(SET_2_SIDE_1)).toBeTruthy();

    // Best of ONE: there is no second set to reveal. This is the assertion that the region was genuinely
    // rebuilt under the new format rather than merely relabelled — a stale region would still be offering
    // a second set the format does not have.
    dialog.setMatchUpFormat(BEST_OF_ONE);

    expect(q<HTMLInputElement>(SET_1_SIDE_1)!.value).toBe('6');
    expect(q<HTMLInputElement>(SET_1_SIDE_2)!.value).toBe('4');
    expect(q(SET_2_SIDE_1)).toBeNull();
  });

  it("CLEARS a set the new format cannot express — CA's own scenario", () => {
    // Two finished sets and a part-entered third, then the third becomes a match tiebreak. CA:
    // *"obviously the first two sets don't need to change at all ... But if a partial 3rd set was
    // entered it would need to be trimmed away."*
    const dialog = open({
      onFormatChange: vi.fn(),
      openFormatPicker: vi.fn(),
      // ONE SET EACH, deliberately: 2-0 decides a best-of-three, and a decided match reveals no third
      // column at all — the first version of this test asked for a cell that could not exist.
      sets: [
        { setNumber: 1, side1Score: 6, side2Score: 4, winningSide: 1 },
        { setNumber: 2, side1Score: 3, side2Score: 6, winningSide: 2 }
      ]
    });

    // A third set is in progress.
    type(SET_3_SIDE_1, '2');
    type('input[data-side="2"][data-set="3"]', '1');

    dialog.setMatchUpFormat('SET3-S:6NOAD/TB7-F:TB10');

    // The first two are untouched; the third is gone.
    expect(q<HTMLInputElement>(SET_1_SIDE_1)!.value).toBe('6');
    expect(q<HTMLInputElement>(SET_2_SIDE_1)!.value).toBe('3');
    expect(q<HTMLInputElement>(SET_3_SIDE_1)?.value || '').toBe('');
  });

  it('reports WHAT it discarded, so a host can say so rather than let it be discovered', () => {
    const onScoreDiscarded = vi.fn();
    const dialog = open({
      onFormatChange: vi.fn(),
      openFormatPicker: vi.fn(),
      onScoreDiscarded,
      sets: [
        { setNumber: 1, side1Score: 6, side2Score: 4, winningSide: 1 },
        { setNumber: 2, side1Score: 6, side2Score: 3, winningSide: 1 }
      ]
    });

    dialog.setMatchUpFormat(BEST_OF_ONE);

    expect(onScoreDiscarded).toHaveBeenCalledTimes(1);
    const reported = onScoreDiscarded.mock.calls[0][0];
    expect(reported.discarded.map((set: any) => set.setNumber)).toEqual([2]);
    expect(reported.sets.map((set: any) => set.setNumber)).toEqual([1]);
    expect(reported.matchUpFormat).toBe(BEST_OF_ONE);
  });

  it('keeps a complete but ILLEGAL set whose rule the change did not touch', () => {
    // THE case `previousMatchUpFormat` exists for, and it is not the obvious one. A 3-7 is complete and
    // illegal: the band says so and `getSets()` still carries it, so it reaches the factory. Under a
    // change touching only the DECIDING set, its own rule did not move — so it stays, and the operator
    // can fix it. Dropping the previous format instead validates it and deletes their typing.
    const dialog = open({
      onFormatChange: vi.fn(),
      openFormatPicker: vi.fn(),
      sets: [{ setNumber: 1, side1Score: 3, side2Score: 7, winningSide: 2 }]
    });

    dialog.setMatchUpFormat(DECIDER_TB10);

    expect(q<HTMLInputElement>(SET_1_SIDE_1)!.value).toBe('3');
    expect(q<HTMLInputElement>(SET_1_SIDE_2)!.value).toBe('7');
  });

  it('KEEPS a part-entered set across a format change that leaves its rule alone — CA ruled 2026-10-01', () => {
    // This pinned the LOSS until S5. The dialog harvested through `getSets()`, which reports only sets
    // whose both sides are entered, so a half-typed set never reached the factory; CA, 2026-09-29, had
    // allowed that: *"i think it is fine for half-typed sets to be discarded."* With the model holding
    // the partial, the format change goes through `changeFormat` and the factory's
    // `retainScoreForFormat` rule 2 — a set whose rule did not change is kept, finished or not — and
    // CA, asked again on 2026-10-01 with that available, chose to keep it: *"2) is what I want, yes"*.
    //
    // A first version of this test typed a `3` and asserted the partial SURVIVED — and passed, because
    // smart complements filled the other side and made it a complete 3-6. A `7` has no complement in
    // `S:6/TB7`, which is what makes it a genuine partial and this assertion honest.
    const dialog = open({
      onFormatChange: vi.fn(),
      openFormatPicker: vi.fn(),
      sets: [{ setNumber: 1, side1Score: 6, side2Score: 4, winningSide: 1 }]
    });

    type(SET_2_SIDE_1, '7');
    expect(q<HTMLInputElement>(SET_2_SIDE_1)!.value, 'a genuine partial').toBe('7');
    expect(q<HTMLInputElement>(SET_2_SIDE_2)!.value, 'no complement for a 7').toBe('');

    // A change touching only the DECIDING set — nothing about set 2's rule moved.
    dialog.setMatchUpFormat(DECIDER_TB10);

    expect(q<HTMLInputElement>(SET_2_SIDE_1)!.value, 'the 7 the operator typed is still there').toBe('7');
  });

  it('stays SILENT when the change costs the operator nothing — the control', () => {
    // Without this, a host would be told about every format change and would learn to ignore it.
    const onScoreDiscarded = vi.fn();
    const dialog = open({
      onFormatChange: vi.fn(),
      openFormatPicker: vi.fn(),
      sets: [{ setNumber: 1, side1Score: 6, side2Score: 4, winningSide: 1 }],
      onScoreDiscarded
    });

    // Only the DECIDING set's rule moves; the first set is untouched.
    dialog.setMatchUpFormat(DECIDER_TB10);

    expect(onScoreDiscarded).not.toHaveBeenCalled();
    expect(q<HTMLInputElement>(SET_1_SIDE_1)!.value).toBe('6');
  });

  it('ignores a picker that reports nothing', () => {
    const openFormatPicker = vi.fn();
    const onFormatChange = vi.fn();
    open({ onFormatChange, openFormatPicker });

    click(EDIT_FORMAT);
    openFormatPicker.mock.calls[0][0].callback('');

    expect(onFormatChange).not.toHaveBeenCalled();
    expect(q(EDIT_FORMAT)!.textContent).toBe(FORMAT);
  });
});
