/**
 * The score-entry dialog in Chromium — the card IN a modal, which is what a host opens.
 *
 * These were `__tests__/scoreEntryDialog.test.ts` and `scoreEntryDialog.integrity.test.ts` under happy-dom,
 * which could not answer the questions they asked: focus was read off `document.activeElement` after a
 * `.focus()` that a hidden cell happily took, keys were synthetic events no browser would deliver, and
 * `inert` was only ever READ as a property, so "the card is out of reach under the picker" was never
 * tried. Here focus is what the browser placed, keys are real, and the card under the picker is tried
 * with a real Tab and a real click.
 *
 * The rules behind them are in node: what the dialog seeds its model from, whether it reopened on a
 * result, and what a format change reports discarding (`logic/__tests__/scoreEntryDialogRules.test.ts`);
 * the format change itself (`logic/__tests__/scoreEntryModel.test.ts`, `changeFormat`).
 *
 * Already asserted elsewhere, and not repeated: the 780px modal and Submit closing it (`InModal`), Free
 * Score opening with the recorded text in its field (`InModalFreeScore`), the approach menu taking its own
 * item (`ApproachSwitching`), all in `scoreEntryDialog.stories.ts`.
 */
import { matchUpStatusConstants, fixtures, policyConstants } from 'tods-competition-factory';
import { openScoreEntryDialog } from '../components/scoring/scoreEntryDialog';
import { expect, fn, spyOn, waitFor } from 'storybook/test';
import { cModal } from '../components/modal/cmodal';
import { one } from './helpers/scoreRegionCard';
import { user } from './helpers/trustedUser';
import {
  closeAllModals,
  dialogLauncher,
  inModalOrNull,
  launchers,
  topModal,
  openFrom,
  inModal,
  MODAL
} from './helpers/scoreEntryDialogLauncher';

import type { ScoreEntryDialogParams } from '../components/scoring/scoreEntryDialog';
import type { StatusCodeGroups } from '../components/scoring/logic/statusCodes';
import type { Meta, StoryObj } from '@storybook/html-vite';

const { WALKOVER, RETIRED, COMPLETED, SUSPENDED, DOUBLE_WALKOVER } = matchUpStatusConstants;
const { POLICY_TYPE_SCORING } = policyConstants;

const REAL_GROUPS = fixtures.policies.POLICY_SCORING_USTA[POLICY_TYPE_SCORING].matchUpStatusCodes as StatusCodeGroups;

const meta: Meta = {
  title: 'Scoring/Score Entry/Tests/Dialog',
  tags: ['!dev']
};
export default meta;

const SIDES: [{ participantName: string }, { participantName: string }] = [
  { participantName: 'Rosalind Lem' },
  { participantName: 'Derrick Ellul' }
];
const FORMAT = 'SET3-S:6/TB7';
const SHORT_FORMAT = 'SET1-S:TB10';
const BEST_OF_ONE = 'SET1-S:6/TB7';

const BAND = '.chc-sec-band';
const FORMAT_TEXT = '.chc-sec-format';
const TITLE = 'Enter the score';
const BACKSPACE = '{Backspace}';
const CARD = '[data-component="scoreEntryCard"]';
const CANCEL = 'button[data-action="cancel"]';
const CLEAR = 'button[data-action="clear"]';
const SUBMIT = 'button[data-action="submit"]';
const SWITCH = 'button[data-action="switchApproach"]';
const OTHER = 'button[data-action="other"]';
const EDIT_FORMAT = 'button[data-action="editFormat"]';
const FREE_SCORE_FIELD = 'input[data-free-score]';
const MENU = '.chc-sec-other-menu';
const APPROACH_MENU = '.chc-sec-approach-menu';
const ROW_ENDING = '[data-row-ending]';
const ENDED_EARLY_2 = 'button[data-action="endedEarly"][data-side="2"]';
const FOLDED_1_2 = 'button[data-done-side="2"][data-done-set="1"]';
const ending2 = (status: string) => `[data-panel-side="2"] button[data-ending="${status}"]`;
const setCell = (side: number, set: number) => `input[data-side="${side}"][data-set="${set}"]`;

const SIX_FOUR = { setNumber: 1, side1Score: 6, side2Score: 4, winningSide: 1 };
const SIX_THREE = { setNumber: 2, side1Score: 6, side2Score: 3, winningSide: 1 };
const TWO_ONE = { setNumber: 2, side1Score: 2, side2Score: 1 };

/** A completed 7-6(3) 6-4, reopened. */
const RECORDED_RESULT = {
  matchUpFormat: FORMAT,
  matchUpStatus: COMPLETED,
  winningSide: 1,
  score: {
    sets: [
      { setNumber: 1, side1Score: 7, side2Score: 6, side1TiebreakScore: 7, side2TiebreakScore: 3, winningSide: 1 },
      { setNumber: 2, side1Score: 6, side2Score: 4, winningSide: 1 }
    ]
  }
};

// The host's callbacks. Module-level so a launcher's params can name them; each play clears what it reads.
const onCancel = fn();
const onClose = fn();
const onClear = fn();
const onSubmit = fn();
const onApproachChange = fn();
const onFormatChange = fn();
const onScoreDiscarded = fn();
const hostSpies = [onCancel, onClose, onClear, onSubmit, onApproachChange, onFormatChange, onScoreDiscarded];

/** The format picker the host injects, captured so a play can answer for it. */
let picker: Parameters<NonNullable<ScoreEntryDialogParams['openFormatPicker']>>[0] | undefined;
const fakePicker: ScoreEntryDialogParams['openFormatPicker'] = (params) => (picker = params);

const base = (over: Partial<ScoreEntryDialogParams> = {}): ScoreEntryDialogParams => ({
  sides: SIDES,
  matchUpFormat: FORMAT,
  statusCodeGroups: REAL_GROUPS,
  onCancel,
  onClose,
  onClear,
  onSubmit,
  ...over
});

/** A story whose one launcher opens the dialog with these params. */
const opens =
  (over: Partial<ScoreEntryDialogParams> = {}) =>
  () =>
    dialogLauncher(() => base(over));

/** A clean slate for a play: nothing standing from the last story, no calls recorded from it. */
function fresh(): void {
  closeAllModals();
  for (const spy of hostSpies) spy.mockClear();
  picker = undefined;
}

const modal = () => {
  const found = topModal();
  if (!found) throw new Error('no dialog is open');
  return found;
};

/**
 * Put focus on the dialog ITSELF: a click on its band, which is not focusable, focuses the nearest
 * focusable ancestor — the `tabIndex = -1` section. A key pressed then has the dialog as its target.
 */
async function focusTheDialog(): Promise<void> {
  await user.click(inModal(BAND));
  await expect(modal(), 'control: the dialog itself holds focus').toHaveFocus();
}

async function chooseApproach(approach: string): Promise<void> {
  await user.click(inModal(SWITCH));
  await user.click(inModal(`${APPROACH_MENU} [data-approach="${approach}"]`));
}

// ── The modal ────────────────────────────────────────────────────────────

export const AnnouncesItselfAndHasNoX: StoryObj = {
  name: 'Modal: named by the card heading, says it is modal, and has no [X] — Cancel and Escape are the ways out',
  render: opens({ title: TITLE }),
  play: async ({ canvasElement }) => {
    fresh();
    const launched = await openFrom(canvasElement);

    // cModal gives the section `role="dialog"` and stops there; the dialog adds the rest.
    await expect(modal().getAttribute('role')).toBe('dialog');
    await expect(modal().getAttribute('aria-modal')).toBe('true');
    const labelledBy = modal().getAttribute('aria-labelledby');
    await expect(labelledBy).toBe(launched.dialog!.card.titleId);
    await expect(document.getElementById(labelledBy!)?.textContent).toBe(TITLE);

    // CA, 2026-10-08: *"do we need the [X] at all given we have both ESC for computer and [Cancel]"*.
    await expect(inModalOrNull('button[data-action="close"]')).toBeNull();
    await expect(inModal(CANCEL)).toBeVisible();

    // The header is rebuilt on every render, so an id assigned from outside would survive only until the
    // first switch and `aria-labelledby` would then point at nothing.
    await chooseApproach('dialPad');
    await expect(document.getElementById(labelledBy!)?.textContent).toBe(TITLE);
    await expect(modal().getAttribute('aria-labelledby')).toBe(labelledBy);

    await user.click(inModal(CANCEL));
  }
};

export const BackdropClickDoesNotClose: StoryObj = {
  name: 'Modal: a click on the backdrop does not close it — a half-entered score is not dismissed by accident',
  render: opens(),
  play: async ({ canvasElement }) => {
    fresh();
    await openFrom(canvasElement);
    await user.fill(inModal<HTMLInputElement>(setCell(1, 1)), '7');

    // The modal's full-page container, at its very corner — well outside the 780px dialog itself.
    await user.clickAt(modal().firstElementChild!, { x: 4, y: 4 });

    await expect(topModal(), 'still open').toBeTruthy();
    await expect(onClose).not.toHaveBeenCalled();
    await expect(inModal(setCell(1, 1))).toHaveValue('7');
    await user.click(inModal(CANCEL));
  }
};

export const CancelReportsOnce: StoryObj = {
  name: 'Modal: Cancel closes it and reports once, and a later close() reports nothing more',
  render: opens(),
  play: async ({ canvasElement }) => {
    fresh();
    const launched = await openFrom(canvasElement);

    await user.click(inModal(CANCEL));

    await expect(topModal()).toBeUndefined();
    await expect(onCancel).toHaveBeenCalledTimes(1);
    await expect(onClose).toHaveBeenCalledTimes(1);

    // A host that reopens on close would loop if a second close() reported again.
    launched.dialog!.close();
    await expect(onClose).toHaveBeenCalledTimes(1);
  }
};

export const SubmitReportsTheWinnerThenCloses: StoryObj = {
  name: 'Modal: Submit reports the outcome with its winner, then closes',
  render: opens({ sets: [SIX_FOUR, SIX_THREE] }),
  play: async ({ canvasElement }) => {
    fresh();
    const launched = await openFrom(canvasElement);

    await user.click(inModal(SUBMIT));

    await expect(onSubmit).toHaveBeenCalledTimes(1);
    await expect(onSubmit.mock.calls[0][0].winningSide).toBe(1);
    await expect(launched.submitted[0].score).toBe('6-4 6-3');
    await expect(topModal()).toBeUndefined();
  }
};

// ── Focus ────────────────────────────────────────────────────────────────

export const FocusOnOpenInEveryApproach: StoryObj = {
  name: 'Focus: each approach opens where its entry begins, and takes a keystroke without a click',
  render: () =>
    launchers(
      dialogLauncher(() => base(), 'Dynamic Sets', 'dynamicSets'),
      dialogLauncher(() => base({ approach: 'freeScore' }), 'Free Score', 'freeScore'),
      dialogLauncher(() => base({ approach: 'dialPad' }), 'Dial Pad', 'dialPad')
    ),
  play: async ({ canvasElement }) => {
    fresh();

    // The LOWER participant's cell. CA, 2026-09-28: *"the dynamic sets when launched should always initially
    // give focus to the lower row"*.
    await openFrom(canvasElement, 'dynamicSets');
    await expect(inModal(setCell(2, 1))).toHaveFocus();
    await user.keyboard('[Digit7]');
    await expect(inModal(setCell(2, 1)), 'the key landed in it').toHaveValue('7');

    // CA, 2026-09-28: *"Free Score should give the one entry field focus automatically"*.
    closeAllModals();
    await openFrom(canvasElement, 'freeScore');
    await expect(inModal(FREE_SCORE_FIELD)).toHaveFocus();
    await user.keyboard('6-4');
    await expect(inModal(FREE_SCORE_FIELD)).toHaveValue('6-4');

    // No text field at all: the first digit key.
    closeAllModals();
    await openFrom(canvasElement, 'dialPad');
    await expect(inModalOrNull('input')).toBeNull();
    await expect((document.activeElement as HTMLElement).dataset.digit).toBeTruthy();
    await expect(modal().contains(document.activeElement)).toBe(true);

    closeAllModals();
  }
};

export const FocusFollowsAnApproachSwitch: StoryObj = {
  name: 'Focus: follows the region across a switch made from the menu, where it used to fall to the body',
  render: opens(),
  play: async ({ canvasElement }) => {
    fresh();
    await openFrom(canvasElement);

    // The menu item that had focus is removed by the very render that swaps the region.
    await chooseApproach('freeScore');
    await expect(inModal(FREE_SCORE_FIELD)).toHaveFocus();
    await user.keyboard('6-4');
    await expect(inModal(FREE_SCORE_FIELD), 'typed without a click').toHaveValue('6-4');

    await chooseApproach('dialPad');
    await expect((document.activeElement as HTMLElement).dataset.digit).toBeTruthy();
    await expect(modal().contains(document.activeElement)).toBe(true);

    await chooseApproach('dynamicSets');
    await expect(inModal(setCell(2, 1))).toHaveFocus();
    await expect(inModal(setCell(2, 1))).toBeVisible();

    await user.click(inModal(CANCEL));
  }
};

export const AutoFocusFalseLeavesFocusAlone: StoryObj = {
  name: 'Focus: autoFocus false leaves focus where the host had it, on open and across a switch',
  render: opens({ autoFocus: false }),
  play: async ({ canvasElement }) => {
    fresh();
    const launch = one(canvasElement, 'button[data-launch]');
    const launched = await openFrom(canvasElement);

    // The click that opened it focused the launcher; nothing took that away.
    await expect(launch).toHaveFocus();

    launched.dialog!.setApproach('freeScore');
    await expect(launch, 'a host-driven switch does not steal it either').toHaveFocus();
    await expect(inModal(FREE_SCORE_FIELD)).not.toHaveFocus();

    await user.click(inModal(CANCEL));
  }
};

export const ReopenedResultFocusesTheDialog: StoryObj = {
  name: 'Focus: a reopened RESULT focuses the dialog itself, so every set stays folded',
  // CA, 2026-10-01: *"a reopened completed matchUp should not focus any entry cell at all."*
  render: opens({ matchUp: RECORDED_RESULT }),
  play: async ({ canvasElement }) => {
    fresh();
    const launched = await openFrom(canvasElement);

    await expect(modal()).toHaveFocus();
    await expect(inModal(FOLDED_1_2), 'set 1 is folded').toBeVisible();
    await expect(inModal(FOLDED_1_2).checkVisibility()).toBe(true);
    await expect(inModal(FOLDED_1_2).textContent).toBe('63');
    await expect(inModal(setCell(2, 1))).not.toBeVisible();
    await expect(inModal(setCell(2, 1)).checkVisibility()).toBe(false);

    // Focus on the section is focus INSIDE the dialog: Escape and the tab order begin there.
    await user.tab();
    await expect(modal().contains(document.activeElement)).toBe(true);
    await expect(document.activeElement).not.toBe(modal());

    // Across a switch and back, still no cell — and set 1 is still folded.
    launched.dialog!.setApproach('freeScore');
    await expect(inModal(FREE_SCORE_FIELD)).not.toHaveFocus();
    launched.dialog!.setApproach('dynamicSets');
    await expect(modal()).toHaveFocus();
    await expect(inModal(setCell(2, 1))).not.toBeVisible();

    await user.keyboard('{Escape}');
    await expect(topModal(), 'Escape, from the dialog itself, cancels').toBeUndefined();
  }
};

export const DoubleExitFocusesTheDialog: StoryObj = {
  name: 'Focus: a double exit is a result too — nothing to type',
  render: opens({ matchUp: { matchUpFormat: FORMAT, matchUpStatus: DOUBLE_WALKOVER, score: { sets: [] } } }),
  play: async ({ canvasElement }) => {
    fresh();
    await openFrom(canvasElement);
    await expect(modal()).toHaveFocus();
    await user.click(inModal(CANCEL));
  }
};

export const PartScoreKeepsTheCaret: StoryObj = {
  name: 'Focus: a reopened PART-score with no winner focuses the first cell, to be finished',
  render: opens({ matchUp: { matchUpFormat: FORMAT, matchUpStatus: SUSPENDED, score: { sets: [SIX_FOUR, TWO_ONE] } } }),
  play: async ({ canvasElement }) => {
    fresh();
    await openFrom(canvasElement);
    await expect(inModal(setCell(2, 1))).toHaveFocus();
    await expect(inModal(setCell(2, 1))).toBeVisible();
    await user.click(inModal(CANCEL));
  }
};

// ── Escape is Cancel ─────────────────────────────────────────────────────
//
// CA, 2026-10-08: *"I'd like ESC to be the equivalent of the [Cancel] button and DEL/BKSP key to be the
// equivalent of [Clear] button."*

export const EscapeCancels: StoryObj = {
  name: 'Escape: closes an empty dialog AND one holding a score, exactly as Cancel does, and never submits',
  render: opens(),
  play: async ({ canvasElement }) => {
    fresh();
    await openFrom(canvasElement);
    await user.keyboard('{Escape}');
    await expect(topModal()).toBeUndefined();
    await expect(onCancel).toHaveBeenCalledTimes(1);
    await expect(onClose).toHaveBeenCalledTimes(1);

    await openFrom(canvasElement);
    await user.keyboard('[Digit7]');
    await expect(inModal(setCell(2, 1)), 'control: a score is held').toHaveValue('7');

    await user.keyboard('{Escape}');

    await expect(topModal()).toBeUndefined();
    await expect(onCancel).toHaveBeenCalledTimes(2);
    await expect(onSubmit, 'Cancel discards; it never submits').not.toHaveBeenCalled();
  }
};

export const EscapeUnderAnotherDialog: StoryObj = {
  name: 'Escape: does nothing while another dialog stands above it',
  render: opens(),
  play: async ({ canvasElement }) => {
    fresh();
    await openFrom(canvasElement);
    // A host opening a second dialog above the card.
    cModal.open({ content: 'a dialog above the card', config: {} });
    await expect(document.querySelectorAll(MODAL)).toHaveLength(2);

    await user.keyboard('{Escape}');

    await expect(onCancel).not.toHaveBeenCalled();
    await expect(document.querySelectorAll(MODAL)).toHaveLength(2);
    closeAllModals();
  }
};

// ── Delete and Backspace are Clear ───────────────────────────────────────
//
// Each key presses the button, so the assertions are the button's own effects. The cases that must NOT
// clear are where the key already means something else — and here, unlike under happy-dom, that something
// else really happens: a Backspace in a field deletes a character.

const clearsFromTheDialog = (key: 'Delete' | 'Backspace'): StoryObj => ({
  name: `Clear key: ${key} from the dialog clears the score and the ending, and does not close it`,
  render: opens(),
  play: async ({ canvasElement }) => {
    fresh();
    await openFrom(canvasElement);
    // A 7 has no complement, so it stands as a part-score; a retirement keeps it.
    await user.fill(inModal<HTMLInputElement>(setCell(1, 1)), '7');
    await user.click(inModal(ENDED_EARLY_2));
    await user.click(inModal(ending2(RETIRED)));
    await expect(inModal(ROW_ENDING)).toBeVisible();
    await expect(inModal(setCell(1, 1)), 'control: the score survives the retirement').toHaveValue('7');
    await expect(inModal(CLEAR), 'control: there is something to clear').toBeEnabled();

    await focusTheDialog();
    await user.keyboard(`{${key}}`);

    await expect(onClear).toHaveBeenCalledTimes(1);
    await expect(inModal(setCell(1, 1))).toHaveValue('');
    await expect(inModalOrNull(ROW_ENDING)).toBeNull();
    await expect(topModal(), 'Clear empties the card; it does not close it').toBeTruthy();
    await user.click(inModal(CANCEL));
  }
});
export const DeleteFromTheDialogClears = clearsFromTheDialog('Delete');
export const BackspaceFromTheDialogClears = clearsFromTheDialog('Backspace');

export const KeysInAScoreCellEditTheCell: StoryObj = {
  name: 'Clear key: Delete and Backspace inside a score cell edit the cell, and do not clear',
  render: opens(),
  play: async ({ canvasElement }) => {
    fresh();
    await openFrom(canvasElement);
    const cell = inModal<HTMLInputElement>(setCell(1, 1));

    await user.fill(cell, '7');
    await user.keyboard('{End}{Backspace}');
    await expect(cell, 'Backspace deleted the 7').toHaveValue('');

    await user.fill(cell, '7');
    await user.keyboard('{Home}{Delete}');
    await expect(cell, 'Delete deleted the 7').toHaveValue('');

    await expect(onClear).not.toHaveBeenCalled();
    await expect(topModal()).toBeTruthy();
    await user.click(inModal(CANCEL));
  }
};

export const BackspaceInFreeScoreEditsTheText: StoryObj = {
  name: 'Clear key: Backspace inside the Free Score field edits the text, and does not clear',
  render: opens({ approach: 'freeScore' }),
  play: async ({ canvasElement }) => {
    fresh();
    await openFrom(canvasElement);
    await user.fill(inModal(FREE_SCORE_FIELD), '6-4');

    await user.keyboard('{End}{Backspace}');

    await expect(onClear).not.toHaveBeenCalled();
    await expect(inModal(FREE_SCORE_FIELD)).toHaveValue('6-');
    await user.click(inModal(CANCEL));
  }
};

export const DialPadKeepsBackspace: StoryObj = {
  name: "Clear key: the Dial Pad's keypad keeps Backspace for itself, and Delete there clears",
  render: opens({ approach: 'dialPad' }),
  play: async ({ canvasElement }) => {
    fresh();
    await openFrom(canvasElement);
    await user.click(inModal('[data-digit="6"]'));
    await user.click(inModal('[data-digit="4"]'));
    await expect(modal().contains(document.activeElement), 'control: a keypad key holds focus').toBe(true);

    await user.keyboard(BACKSPACE);
    await expect(onClear, "Backspace is the keypad's own key").not.toHaveBeenCalled();
    await expect(inModal(CLEAR), 'the 6 is still entered').toBeEnabled();

    await user.keyboard('{Delete}');
    await expect(onClear).toHaveBeenCalledTimes(1);
    await expect(inModal(CLEAR)).toBeDisabled();
    await user.click(inModal(CANCEL));
  }
};

export const ClearKeyIgnoresChordsAndEmptyCards: StoryObj = {
  name: 'Clear key: nothing on an empty card, nothing for a modified chord — and the plain key does clear',
  render: opens(),
  play: async ({ canvasElement }) => {
    fresh();
    await openFrom(canvasElement);

    await focusTheDialog();
    await user.keyboard('{Delete}');
    await expect(onClear, 'Clear is disabled with nothing to remove').not.toHaveBeenCalled();

    await user.fill(inModal<HTMLInputElement>(setCell(1, 1)), '7');
    await focusTheDialog();
    // Cmd/Ctrl/Alt chords belong to the browser and the OS.
    await user.keyboard('{Meta>}{Backspace}{/Meta}');
    await user.keyboard('{Control>}{Backspace}{/Control}');
    await expect(onClear).not.toHaveBeenCalled();
    await expect(inModal(setCell(1, 1))).toHaveValue('7');

    // The control: the same key, unmodified, from the same place.
    await user.keyboard(BACKSPACE);
    await expect(onClear).toHaveBeenCalledTimes(1);
    await user.click(inModal(CANCEL));
  }
};

export const ClearKeyIgnoresTheHostPage: StoryObj = {
  name: 'Clear key: a Backspace pressed OUTSIDE the dialog does not clear it',
  // `autoFocus: false`, so focus stays on the host page's launcher — the one way a key reaches the page
  // while the dialog stands.
  render: opens({ autoFocus: false, sets: [SIX_FOUR] }),
  play: async ({ canvasElement }) => {
    fresh();
    await openFrom(canvasElement);
    await expect(one(canvasElement, 'button[data-launch]'), 'control: focus is on the host page').toHaveFocus();
    await expect(inModal(CLEAR), 'control: there is something to clear').toBeEnabled();

    await user.keyboard(BACKSPACE);

    await expect(onClear).not.toHaveBeenCalled();
    await expect(inModal(BAND).textContent).toContain('6-4');

    // The control: the same key from inside the dialog does clear.
    await focusTheDialog();
    await user.keyboard(BACKSPACE);
    await expect(onClear).toHaveBeenCalledTimes(1);
    await user.click(inModal(CANCEL));
  }
};

// ── Opening on a recorded score ──────────────────────────────────────────

const RECORDED_RETIREMENT = {
  matchUpFormat: FORMAT,
  matchUpStatus: RETIRED,
  winningSide: 1,
  score: { sets: [SIX_FOUR, TWO_ONE] }
};

export const HydratesEveryApproach: StoryObj = {
  name: 'Recorded: every approach opens on the recorded score, and the format comes off the matchUp',
  // Measured 2026-09-28: Free Score opened with an empty field while the other two hydrated. Asserted across
  // all three together, because the gap was invisible while each was checked on its own.
  render: () =>
    launchers(
      ...(['dynamicSets', 'freeScore', 'dialPad'] as const).map((approach) =>
        dialogLauncher(() => base({ matchUp: RECORDED_RETIREMENT, approach }), approach, approach)
      ),
      dialogLauncher(
        () => base({ matchUpFormat: undefined, matchUp: { matchUpFormat: SHORT_FORMAT, score: { sets: [] } } }),
        'Format off the matchUp',
        'formatOffMatchUp'
      )
    ),
  play: async ({ canvasElement }) => {
    fresh();
    for (const approach of ['dynamicSets', 'freeScore', 'dialPad']) {
      closeAllModals();
      await openFrom(canvasElement, approach);
      await expect(inModal(BAND).textContent, approach).toContain('6-4 2-1');
      await expect(inModal(ROW_ENDING).textContent, `${approach}: and the retirement`).toMatch(/retired/i);
    }

    closeAllModals();
    await openFrom(canvasElement, 'formatOffMatchUp');
    await expect(inModal(FORMAT_TEXT).textContent).toBe(SHORT_FORMAT);
    closeAllModals();
  }
};

// ── Approach switching ───────────────────────────────────────────────────

export const SwitchCarriesTheScoreThereAndBack: StoryObj = {
  name: 'Approach: one marked, the host told, and the typed score carried to text, keypad and back to cells',
  render: opens({ onApproachChange }),
  play: async ({ canvasElement }) => {
    fresh();
    const launched = await openFrom(canvasElement);
    await user.fill(inModal<HTMLInputElement>(setCell(1, 1)), '6');
    await user.fill(inModal<HTMLInputElement>(setCell(2, 1)), '4');

    await user.click(inModal(SWITCH));
    const pressed = [...modal().querySelectorAll<HTMLElement>('[data-approach]')].filter(
      (item) => item.getAttribute('aria-pressed') === 'true'
    );
    await expect(
      pressed.map((item) => item.dataset.approach),
      'exactly one marked, the one showing'
    ).toEqual(['dynamicSets']);
    await user.click(inModal(`${APPROACH_MENU} [data-approach="freeScore"]`));

    await expect(launched.dialog!.approach()).toBe('freeScore');
    await expect(onApproachChange).toHaveBeenCalledWith('freeScore');
    await expect(inModal(FREE_SCORE_FIELD)).toHaveValue('6-4');

    await chooseApproach('dialPad');
    await expect([...modal().querySelectorAll('.chc-sec-readout')].map((cell) => cell.textContent)).toEqual(['6', '4']);

    await chooseApproach('dynamicSets');
    await expect(inModal(setCell(1, 1))).toHaveValue('6');
    await expect(inModal(setCell(2, 1))).toHaveValue('4');
    await expect(onApproachChange).toHaveBeenCalledTimes(3);
    await user.click(inModal(CANCEL));
  }
};

export const SwitchKeepsTheEnding: StoryObj = {
  name: 'Approach: the recorded ending survives a switch — a fact about the match, not about the keypad',
  render: opens(),
  play: async ({ canvasElement }) => {
    fresh();
    await openFrom(canvasElement);
    await user.click(inModal(ENDED_EARLY_2));
    await user.click(inModal(ending2(WALKOVER)));
    await expect(inModal(ROW_ENDING).dataset.rowEnding).toBe(WALKOVER);

    await chooseApproach('dialPad');

    const pill = inModal(ROW_ENDING);
    await expect(pill, 'the walkover survives an approach switch').toBeVisible();
    await expect(pill.closest<HTMLElement>('.chc-sec-row')!.dataset.side).toBe('2');
    await expect(inModal(BAND).textContent).toContain('Rosalind Lem advances');
    await user.click(inModal(CANCEL));
  }
};

export const OneApproachNoMenu: StoryObj = {
  name: 'Approach: no menu when only one approach is offered',
  render: opens({ approaches: ['dialPad'] }),
  play: async ({ canvasElement }) => {
    fresh();
    await openFrom(canvasElement);
    await expect(inModal(SWITCH).textContent).toBe('Dial Pad');

    await user.click(inModal(SWITCH));

    await expect(modal().querySelectorAll('[data-approach]')).toHaveLength(0);
    await user.click(inModal(CANCEL));
  }
};

// ── The format chip ──────────────────────────────────────────────────────

export const FormatChipIsTextWithoutAHost: StoryObj = {
  name: 'Format: inert text until the host can accept a change',
  render: opens(),
  play: async ({ canvasElement }) => {
    fresh();
    await openFrom(canvasElement);
    await expect(inModal(FORMAT_TEXT)).toBeVisible();
    await expect(inModal(FORMAT_TEXT).tagName).not.toBe('BUTTON');
    await expect(inModalOrNull(EDIT_FORMAT)).toBeNull();
    await user.click(inModal(CANCEL));
  }
};

export const FormatPickerAppliesWhatComesBack: StoryObj = {
  name: 'Format: the picker opens on the format showing, applies a choice, and ignores an empty one',
  render: opens({ onFormatChange, openFormatPicker: fakePicker }),
  play: async ({ canvasElement }) => {
    fresh();
    await openFrom(canvasElement);

    await user.click(inModal(EDIT_FORMAT));
    await expect(picker?.existingMatchUpFormat).toBe(FORMAT);
    // The picker reports nothing — dismissed without a choice.
    picker!.callback('');
    picker!.onClose?.();
    await expect(onFormatChange).not.toHaveBeenCalled();
    await expect(inModal(EDIT_FORMAT).textContent).toBe(FORMAT);

    await user.click(inModal(EDIT_FORMAT));
    picker!.callback(SHORT_FORMAT);
    picker!.onClose?.();

    await expect(inModal(EDIT_FORMAT).textContent).toBe(SHORT_FORMAT);
    await expect(onFormatChange).toHaveBeenCalledWith(SHORT_FORMAT);
    await user.click(inModal(CANCEL));
  }
};

export const FormatChangeRebuildsTheRegion: StoryObj = {
  name: 'Format: a change rebuilds the region under the new format, keeps what it allows, and says what it cut',
  render: () =>
    launchers(
      dialogLauncher(() => base({ onFormatChange, openFormatPicker: fakePicker }), 'Typed 6-4', 'typed'),
      dialogLauncher(
        () => base({ onFormatChange, openFormatPicker: fakePicker, onScoreDiscarded, sets: [SIX_FOUR, SIX_THREE] }),
        'Recorded 6-4 6-3',
        'recorded'
      )
    ),
  play: async ({ canvasElement }) => {
    fresh();
    await openFrom(canvasElement, 'typed');
    await user.fill(inModal<HTMLInputElement>(setCell(1, 1)), '6');
    await user.fill(inModal<HTMLInputElement>(setCell(2, 1)), '4');
    await expect(inModal(setCell(1, 2)), 'a completed first set reveals the second').toBeVisible();

    await user.click(inModal(EDIT_FORMAT));
    picker!.callback(BEST_OF_ONE);
    picker!.onClose?.();

    // A stale region would still be offering a second set the format does not have.
    await expect(inModal(setCell(1, 1))).toHaveValue('6');
    await expect(inModal(setCell(2, 1))).toHaveValue('4');
    await expect(inModalOrNull(setCell(1, 2))).toBeNull();

    // A change that DOES cost something is reported, once. What it reports is pinned in node.
    closeAllModals();
    await openFrom(canvasElement, 'recorded');
    await user.click(inModal(EDIT_FORMAT));
    picker!.callback(BEST_OF_ONE);
    picker!.onClose?.();
    await expect(onScoreDiscarded).toHaveBeenCalledTimes(1);
    await expect(onScoreDiscarded.mock.calls[0][0].matchUpFormat).toBe(BEST_OF_ONE);
    await expect(inModal(BAND).textContent).toContain('6-4');
    await expect(inModal(BAND).textContent).not.toContain('6-3');
    closeAllModals();
  }
};

// ── Menus and the picker hold the card ───────────────────────────────────
//
// CA, 2026-10-08, two screenshots: the mode selector bumped the dialog's edge, both menus could stand open
// together, the card stayed live under an open menu, and the card stayed live under the format picker.

export const OneMenuAtATime: StoryObj = {
  name: 'Menus: one at a time — opening Other closes the approach menu',
  render: opens(),
  play: async ({ canvasElement }) => {
    fresh();
    await openFrom(canvasElement);
    await user.click(inModal(SWITCH));
    await expect(inModal(APPROACH_MENU), 'control: the approach menu opened').toBeVisible();

    await user.click(inModal(OTHER));

    await expect(inModalOrNull(APPROACH_MENU)).toBeNull();
    await expect(modal().querySelectorAll(MENU)).toHaveLength(1);
    await expect(inModal(MENU)).toBeVisible();
    closeAllModals();
  }
};

export const ClickElsewhereOnlyClosesTheMenu: StoryObj = {
  name: 'Menus: a click elsewhere in the card closes the open menu and does nothing else',
  render: opens({ sets: [SIX_FOUR, SIX_THREE] }),
  play: async ({ canvasElement }) => {
    fresh();
    await openFrom(canvasElement);
    await expect(inModal(SUBMIT), 'control: Submit is live').toBeEnabled();
    await user.click(inModal(SWITCH));

    await user.click(inModal(SUBMIT));

    await expect(onSubmit, 'the click under the menu must not submit').not.toHaveBeenCalled();
    await expect(inModalOrNull(APPROACH_MENU)).toBeNull();
    await expect(topModal()).toBeTruthy();

    await user.click(inModal(SUBMIT));
    await expect(onSubmit, 'with the menu closed, Submit works again').toHaveBeenCalledTimes(1);
  }
};

const escapeStepsBack = (label: string, trigger: string, menu: string): StoryObj => ({
  name: `Menus: Escape with the ${label} menu open closes the menu; the next Escape cancels`,
  render: opens(),
  play: async ({ canvasElement }) => {
    fresh();
    await openFrom(canvasElement);
    await user.click(inModal(trigger));
    await expect(inModal(menu), 'control: the menu opened').toBeVisible();

    await user.keyboard('{Escape}');

    await expect(inModalOrNull(menu)).toBeNull();
    await expect(topModal()).toBeTruthy();
    await expect(onCancel).not.toHaveBeenCalled();

    await user.keyboard('{Escape}');
    await expect(onCancel).toHaveBeenCalledTimes(1);
    await expect(topModal()).toBeUndefined();
  }
});
export const EscapeClosesTheOtherMenuFirst = escapeStepsBack('Other', OTHER, MENU);
export const EscapeClosesTheApproachMenuFirst = escapeStepsBack('approach', SWITCH, APPROACH_MENU);

export const CardIsOutOfReachUnderThePicker: StoryObj = {
  name: 'Menus: under the format picker the card takes no Tab, no click and no key — and is live again after',
  render: opens({ onFormatChange, openFormatPicker: fakePicker }),
  play: async ({ canvasElement }) => {
    fresh();
    await openFrom(canvasElement);
    const lower = inModal<HTMLInputElement>(setCell(2, 1));

    await user.click(inModal(EDIT_FORMAT));
    await expect(modal().inert, 'the property is set').toBe(true);

    // Tab right round: a real Tab skips an `inert` subtree, so focus never enters the card.
    for (let press = 0; press < 8; press += 1) {
      await user.tab();
      await expect(modal().contains(document.activeElement), `Tab ${press + 1} stayed out of the card`).toBe(false);
    }

    // A click at the cell's own position lands on what is BENEATH an inert card — cModal's backdrop — and
    // never on the cell. The backdrop is the target because an inert subtree is skipped by hit-testing.
    const box = lower.getBoundingClientRect();
    await user.clickAt(one(document.body, '#cmdl-backdrop'), {
      x: box.left + box.width / 2,
      y: box.top + box.height / 2
    });
    await expect(lower).not.toHaveFocus();
    await user.keyboard('[Digit3]');
    await expect(lower, 'no keystroke reached it').toHaveValue('');
    await expect(topModal(), 'and the click beneath closed nothing').toBeTruthy();

    // However the picker closes, the card comes back — focused where entry begins, and clickable.
    picker!.onClose?.();
    await expect(modal().inert).toBe(false);
    await expect(lower).toHaveFocus();
    await user.click(inModal(setCell(1, 1)));
    await expect(inModal(setCell(1, 1))).toHaveFocus();
    await user.click(inModal(CANCEL));
  }
};

// ── Disposal ─────────────────────────────────────────────────────────────

export const CloseDisposesTheNestedPicker: StoryObj = {
  name: 'Disposal: close() takes the real picker above it down too, and reports once',
  render: opens({ onFormatChange }),
  play: async ({ canvasElement }) => {
    fresh();
    const launched = await openFrom(canvasElement);
    // The REAL picker, a second cModal on top.
    await user.click(inModal(EDIT_FORMAT));
    await waitFor(() => expect(document.querySelectorAll(MODAL)).toHaveLength(2));
    await expect(document.querySelectorAll(CARD)).toHaveLength(1);

    launched.dialog!.close();
    launched.dialog!.close();

    await expect(document.querySelectorAll(MODAL)).toHaveLength(0);
    await expect(onClose).toHaveBeenCalledTimes(1);
  }
};

export const KeydownListenerReleased: StoryObj = {
  name: 'Disposal: the document keydown listener is released however the dialog closes',
  // Asserted on the removal rather than through behaviour, deliberately: a leaked listener is inert —
  // `onKeyDown` returns once `closed` is set — so no key can expose it. The cost of a leak is a listener per
  // dialog opened for the life of the page.
  render: opens(),
  play: async () => {
    fresh();
    const add = spyOn(document, 'addEventListener');
    const remove = spyOn(document, 'removeEventListener');
    try {
      for (const closeBy of ['cancel', 'external'] as const) {
        // Opened by the host call itself, synchronously, so every listener added in it is the dialog's — a
        // trusted click also lets the test runner's own machinery add listeners to the page.
        add.mockClear();
        const dialog = openScoreEntryDialog(base());
        const added = add.mock.calls.filter(([type]) => type === 'keydown').map(([, listener]) => listener);
        await expect(added, 'control: the dialog added one').toHaveLength(1);
        remove.mockClear();

        if (closeBy === 'cancel') await user.click(inModal(CANCEL));
        // cModal closing for its own reasons, as a nested-modal teardown does.
        else cModal.close();
        dialog.close();

        // Counted, not compared by identity: `spyOn` from storybook/test hands the spy a wrapped listener.
        const removed = remove.mock.calls.filter(([type]) => type === 'keydown');
        await expect(removed, closeBy).toHaveLength(1);
        await expect(topModal()).toBeUndefined();
      }
    } finally {
      add.mockRestore();
      remove.mockRestore();
    }
  }
};

export const EndingsMenuStopsTrackingOnClose: StoryObj = {
  name: 'Disposal: an endings menu open at close stops following scroll and resize',
  render: opens(),
  play: async ({ canvasElement }) => {
    fresh();
    const { innerWidth: width, innerHeight: height } = globalThis;
    const remove = spyOn(globalThis, 'removeEventListener');
    try {
      const launched = await openFrom(canvasElement);
      await user.click(inModal(`.chc-sec-endings ${OTHER}`));
      const menu = inModal(MENU);
      await expect(menu).toBeVisible();

      // The control: while open, a resize repositions the menu — the tracking this asks about is real.
      menu.style.top = '-999px';
      await user.viewport(width - 40, height);
      await waitFor(() => expect(menu.style.top).not.toBe('-999px'));

      launched.dialog!.close();
      await expect(remove.mock.calls.some(([type, , capture]) => type === 'scroll' && capture === true)).toBe(true);

      // After close, a resize writes nothing to the menu it used to follow.
      menu.style.top = '-999px';
      await user.viewport(width, height);
      await new Promise((settle) => requestAnimationFrame(() => requestAnimationFrame(settle)));
      await expect(menu.style.top).toBe('-999px');
    } finally {
      remove.mockRestore();
      await user.viewport(width, height);
    }
  }
};
