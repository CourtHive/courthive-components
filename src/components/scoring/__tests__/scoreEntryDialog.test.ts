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
const SMART = 'button[data-action="smartComplements"]';
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
});

describe('Escape', () => {
  const escape = () =>
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));

  it('closes an EMPTY dialog — cModal has no keyboard handling of its own', () => {
    const onClose = vi.fn();
    open({ onClose });

    escape();

    expect(modal()).toBeNull();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does NOT discard a typed score', () => {
    open();

    type(SET_1_SIDE_1, '6');
    escape();

    // The same rule the click-away guard already holds: silent non-dismissal, not a confirm step.
    expect(modal()).toBeTruthy();
    expect(q<HTMLInputElement>(SET_1_SIDE_1)!.value).toBe('6');
  });

  it('does NOT discard a recorded ending', () => {
    open();

    click(ENDED_EARLY_2);
    click(`[data-panel-side="2"] button[data-ending="${WALKOVER}"]`);
    escape();

    expect(modal()).toBeTruthy();
    expect(q(ROW_ENDING)).toBeTruthy();
  });

  it('does NOT discard a LONE value typed with smart complements off', () => {
    // The hole the first version of this guard had. `getSets()` reports only sets whose BOTH sides are
    // in — one value is not a set score — so a lone `6` was invisible to it and Escape threw the
    // keystroke away. With complements ON the complement fills the other side immediately, which is
    // exactly why the hole did not show up: the region has to be asked `hasEntry`, not `getSets`.
    open();

    click(SMART);
    type(SET_1_SIDE_1, '6');

    expect(q<HTMLInputElement>(SET_1_SIDE_2)!.value, 'complements must be off for this to be the test').toBe('');

    escape();

    expect(modal()).toBeTruthy();
    expect(q<HTMLInputElement>(SET_1_SIDE_1)!.value).toBe('6');
  });

  it('treats a LONE ZERO as entry, not as emptiness', () => {
    // `0` is a real score — a set going to love — and the region's entry is a STRING, so a check written
    // as `Number(...)` or `!!score` on the parsed value reads this dialog as untouched. Complements off
    // again, so the zero is genuinely alone: with them on, the other side becomes a 6 and any check at
    // all sees the 6.
    open();

    click(SMART);
    type(SET_1_SIDE_1, '0');

    escape();

    expect(modal()).toBeTruthy();
    expect(q<HTMLInputElement>(SET_1_SIDE_1)!.value).toBe('0');
  });

  it('releases the keydown listener on close', () => {
    // Asserted on `removeEventListener` rather than through behaviour, deliberately. A leaked listener
    // is inert — `onKeyDown` returns early once `closed` is set — so no Escape, no reopen and no second
    // dialog can expose it. The only observable is the removal itself, and the cost of leaking is a
    // listener per dialog opened for the life of the page.
    const remove = vi.spyOn(document, 'removeEventListener');
    const dialog = open();

    dialog.close();

    expect(remove.mock.calls.some(([type]) => type === 'keydown')).toBe(true);
    remove.mockRestore();
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

  it('LOSES a part-entered set across any format change — CA ruled this acceptable', () => {
    // The dialog harvests through `currentRegion.getSets()`, which reports only sets whose BOTH sides
    // are entered — so a half-typed set never reaches the factory and is lost on any format change.
    // CA, 2026-09-29: *"i think it is fine for half-typed sets to be discarded."* Pinned as the settled
    // behaviour, not as an omission awaiting a wider `ScoreRegion` contract.
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

    expect(q<HTMLInputElement>(SET_2_SIDE_1)!.value).toBe('');
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
