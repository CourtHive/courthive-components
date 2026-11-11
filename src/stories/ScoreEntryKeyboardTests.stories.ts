/**
 * The score-entry keyboard in Chromium: real key presses into the real card.
 *
 * CA, 2026-09-28, using the merged dialog: *"[Clear] button not working on the score entry dialog; also,
 * when I enter '3' and the other side smart auto complete's to '6' the focus should then shift to the 2nd
 * set score entry ... Also the [Cancel] button should work! Also Shift-3 should enter the '3' on the
 * other side!"* And: *"if I click into an entry field that has '0' and enter a value, I should not get
 * e.g. '06'... it should resolve to '6'."*
 *
 * Shift+3 in a text field produces `#`, so the distinction lives only on `keydown` — which is why these
 * press KEYS through `user.keyboard` rather than setting values. They used to dispatch synthetic
 * `keydown`s under happy-dom, where a key that the handler let through inserted nothing and a synthetic
 * Tab moved no focus; here an unhandled key types its character and an unhandled Tab follows the
 * browser's own order. The rules behind the keys — the complement table, the leading zero, the Clear
 * and Submit gates — are asked in node: `__tests__/scoreEntryKeyboard.test.ts` and
 * `logic/__tests__/scoreEntryRules.test.ts`.
 */
import { closeAllModals, dialogLauncher, inModal, openFrom, MODAL } from './helpers/scoreEntryDialogLauncher';
import { matchUpStatusConstants, fixtures, policyConstants } from 'tods-competition-factory';
import { createDynamicSetsRegion } from '../components/scoring/regions/dynamicSetsRegion';
import { renderScoreEntryCard } from '../components/scoring/scoreEntryCard';
import { expect, fn, waitFor } from 'storybook/test';
import { one } from './helpers/scoreRegionCard';
import { user } from './helpers/trustedUser';

import type { StatusCodeGroups } from '../components/scoring/logic/statusCodes';
import type { ScoreEntryCard } from '../components/scoring/scoreEntryCard';
import type { Meta, StoryObj } from '@storybook/html-vite';

const { WALKOVER } = matchUpStatusConstants;
const { POLICY_TYPE_SCORING } = policyConstants;

const REAL_GROUPS = fixtures.policies.POLICY_SCORING_USTA[POLICY_TYPE_SCORING].matchUpStatusCodes as StatusCodeGroups;

const meta: Meta = {
  title: 'Scoring/Score Entry/Tests/Keyboard',
  tags: ['!dev']
};
export default meta;

const FORMAT = 'SET3-S:6/TB7';
const SIDES: [{ participantName: string }, { participantName: string }] = [
  { participantName: 'Rosalind Lem' },
  { participantName: 'Derrick Ellul' }
];
const CLEAR = 'button[data-action="clear"]';
const CANCEL = 'button[data-action="cancel"]';
const BAND = '.chc-sec-band';
const ROW_ENDING = '[data-row-ending]';
const ENDED_EARLY_2 = 'button[data-action="endedEarly"][data-side="2"]';
const WALKOVER_2 = `[data-panel-side="2"] button[data-ending="${WALKOVER}"]`;
const FIRST_TIEBREAK = 'input[data-tiebreak-side="1"][data-tiebreak-set="1"]';
const SECOND_TIEBREAK = 'input[data-tiebreak-side="2"][data-tiebreak-set="1"]';
const SHIFT_3 = '{Shift>}[Digit3]{/Shift}';
const BACKSPACE = '{Backspace}';
const SIX_FOUR = { setNumber: 1, side1Score: 6, side2Score: 4, winningSide: 1 };

type Root = HTMLElement;
type Mounted = { card: ScoreEntryCard; region: ReturnType<typeof createDynamicSetsRegion> };

/** The card and region behind each rendered card, for the two assertions that read them. */
const mounted = new WeakMap<Element, Mounted>();

function cardWith(over: { matchUpFormat?: string; sets?: any[]; smartComplements?: boolean } = {}) {
  return () => {
    const matchUpFormat = over.matchUpFormat ?? FORMAT;
    const region = createDynamicSetsRegion({
      matchUpFormat,
      sets: over.sets,
      smartComplements: over.smartComplements,
      onChange: () => card.refresh(),
      onStructureChange: () => card.rerender()
    });
    const card = renderScoreEntryCard({ sides: SIDES, matchUpFormat, statusCodeGroups: REAL_GROUPS, region });
    mounted.set(card.element, { card, region });

    const frame = document.createElement('div');
    frame.style.cssText = 'width:100%;max-width:720px;padding:16px;box-sizing:border-box';
    frame.append(card.element);
    return frame;
  };
}

const handles = (root: Root): Mounted => mounted.get(one(root, '[data-component="scoreEntryCard"]'))!;
const maybeCell = (root: Root, side: number, set: number) =>
  root.querySelector<HTMLInputElement>(`input[data-side="${side}"][data-set="${set}"]`);
const cell = (root: Root, side: number, set: number) =>
  one<HTMLInputElement>(root, `input[data-side="${side}"][data-set="${set}"]`);
/** A finished set's folded result — the way back into it is clicking this. */
const done = (root: Root, side: number, set: number) =>
  one<HTMLButtonElement>(root, `button[data-done-side="${side}"][data-done-set="${set}"]`);
const clear = (root: Root) => one<HTMLButtonElement>(root, CLEAR);

/** Click into a cell and press keys there, as an operator does. */
async function typeIn(root: Root, side: number, set: number, keys: string): Promise<void> {
  await user.click(cell(root, side, set));
  await user.keyboard(keys);
}

/** Record a walkover against side 2, the way an operator does: the name, then the ending. */
async function walkoverSideTwo(root: Element): Promise<void> {
  await user.click(one(root, ENDED_EARLY_2));
  await user.click(one(root, WALKOVER_2));
}

// ── Entry begins on the LOWER row ────────────────────────────────────────
//
// CA, 2026-09-28: *"the dynamic sets when launched should always initially give focus to the lower row;
// that way e.g. 3 is lower row and shift+3 is upper row, which feels natural ... each subsequent entry
// column should start on the bottom cell."* The rule is only half about focus: which cell holds the caret
// decides which row an unshifted digit lands on, so these assert the consequence as well as the placement.

export const EntryBeginsOnTheLowerRow: StoryObj = {
  name: 'Lower row: the dialog opens on it, a plain digit lands there, and the next column starts there too',
  render: () => dialogLauncher(() => ({ sides: SIDES, matchUpFormat: FORMAT, statusCodeGroups: REAL_GROUPS })),
  play: async ({ canvasElement }) => {
    closeAllModals();
    await openFrom(canvasElement);
    const modal = one(document.body, MODAL);

    await expect(cell(modal, 2, 1), 'the dialog opens on the first set’s LOWER cell').toHaveFocus();

    // No click: the key goes wherever the dialog put the caret.
    await user.keyboard('[Digit3]');

    await expect(cell(modal, 2, 1)).toHaveValue('3');
    await expect(cell(modal, 1, 1), 'its complement above').toHaveValue('6');
    await expect(cell(modal, 2, 2), 'and the next column starts on ITS bottom cell').toHaveFocus();

    await user.click(inModal(CANCEL));
    await expect(document.querySelector(MODAL)).toBeNull();
  }
};

export const ShiftedDigitFromTheLowerRow: StoryObj = {
  name: 'Lower row: a SHIFTED digit there goes to the upper row, and its complement below',
  render: cardWith(),
  play: async ({ canvasElement }) => {
    handles(canvasElement).region.focusFirst?.();
    await expect(cell(canvasElement, 2, 1)).toHaveFocus();

    await user.keyboard(SHIFT_3);

    await expect(cell(canvasElement, 1, 1)).toHaveValue('3');
    await expect(cell(canvasElement, 2, 1)).toHaveValue('6');
  }
};

// ── A digit typed into an empty cell ─────────────────────────────────────

export const CompletesTheSetAndMovesOn: StoryObj = {
  name: 'Empty cell: a 3 completes to 3-6 and focus moves to the NEXT set’s lower cell',
  render: cardWith(),
  play: async ({ canvasElement }) => {
    await typeIn(canvasElement, 1, 1, '[Digit3]');

    await expect(cell(canvasElement, 1, 1)).toHaveValue('3');
    await expect(cell(canvasElement, 2, 1)).toHaveValue('6');
    await expect(cell(canvasElement, 2, 2)).toHaveFocus();
  }
};

export const ShiftedDigitGoesToTheOtherSide: StoryObj = {
  name: 'Empty cell: Shift+3 puts the 3 on the OTHER side, and never types a #',
  render: cardWith(),
  play: async ({ canvasElement }) => {
    await typeIn(canvasElement, 1, 1, SHIFT_3);

    await expect(cell(canvasElement, 1, 1)).toHaveValue('6');
    await expect(cell(canvasElement, 2, 1)).toHaveValue('3');
    // A real Shift+3 is a `#` in a text field. Under happy-dom nothing was ever typed, so this could not fail.
    await expect(cell(canvasElement, 1, 1).value).not.toContain('#');
    await expect(cell(canvasElement, 2, 1).value).not.toContain('#');
  }
};

export const MovesOnWhenTheNextSetIsOnScreen: StoryObj = {
  name: 'Empty cell: moves on even when the next set is ALREADY on screen',
  // The case `settle` cannot cover: it moves focus only when the LAYOUT changed, and correcting a set
  // whose successor is already there changes no layout at all.
  render: cardWith({ sets: [SIX_FOUR, { setNumber: 2, side1Score: 2, side2Score: 1 }] }),
  play: async ({ canvasElement }) => {
    await expect(cell(canvasElement, 1, 2), 'control: set 2 is on screen').toBeVisible();

    // Set 1 opens folded; its result is the way back in. Backspace then empties the selected 6, so the
    // 3 is typed into an EMPTY cell — the case under test.
    await user.click(done(canvasElement, 1, 1));
    await user.keyboard(BACKSPACE);
    await expect(cell(canvasElement, 1, 1)).toHaveValue('');
    await user.keyboard('[Digit3]');

    await expect(cell(canvasElement, 1, 1)).toHaveValue('3');
    await expect(cell(canvasElement, 2, 1)).toHaveValue('6');
    await expect(cell(canvasElement, 2, 2)).toHaveFocus();
  }
};

export const StopsAtTheTiebreak: StoryObj = {
  name: 'Empty cell: a 7-6 stops at the tiebreak, on the LOSER’s cell, rather than skipping ahead',
  render: cardWith(),
  play: async ({ canvasElement }) => {
    // A 7 has no complement in `S:6/TB7`, so it is typed as a character and the caret stays.
    await typeIn(canvasElement, 1, 1, '[Digit7]');
    await expect(cell(canvasElement, 1, 1)).toHaveValue('7');
    await expect(cell(canvasElement, 1, 1)).toHaveFocus();

    await typeIn(canvasElement, 2, 1, '[Digit6]');

    // Focus lands on the side that LOST the set — the only cell the tiebreak complement can fire from.
    await expect(one(canvasElement, FIRST_TIEBREAK)).toBeVisible();
    await expect(one(canvasElement, SECOND_TIEBREAK)).toHaveFocus();
  }
};

export const DoesNotMoveOnOnceDecided: StoryObj = {
  name: 'Empty cell: once the match is decided, no third set opens',
  render: cardWith({ sets: [{ setNumber: 1, side1Score: 6, side2Score: 3, winningSide: 1 }] }),
  play: async ({ canvasElement }) => {
    // SHIFTED, so the 4 goes to side 2 and side 1 takes the set: 6-3 6-4 is a finished best-of-three.
    await typeIn(canvasElement, 1, 2, '{Shift>}[Digit4]{/Shift}');

    await expect(maybeCell(canvasElement, 1, 3)).toBeNull();
    await expect(one(canvasElement, BAND).textContent).toContain('6-3 6-4');
  }
};

export const LeavesAnAmbiguousDigit: StoryObj = {
  name: 'Empty cell: an AMBIGUOUS 7 stands alone for the operator to finish',
  render: cardWith(),
  play: async ({ canvasElement }) => {
    await typeIn(canvasElement, 1, 1, '[Digit7]');

    await expect(cell(canvasElement, 1, 1), 'typed as the character it is').toHaveValue('7');
    await expect(cell(canvasElement, 2, 1)).toHaveValue('');
    await expect(cell(canvasElement, 1, 1)).toHaveFocus();
  }
};

export const RefusesAnUnreachableDigit: StoryObj = {
  name: 'Empty cell: an 8 the format cannot reach is refused — no 8-7, no tiebreak',
  render: cardWith(),
  play: async ({ canvasElement }) => {
    await typeIn(canvasElement, 1, 1, '[Digit8]');

    await expect(cell(canvasElement, 1, 1)).toHaveValue('');
    await expect(cell(canvasElement, 2, 1)).toHaveValue('');
    await expect(canvasElement.querySelector(FIRST_TIEBREAK)).toBeNull();
    await expect(cell(canvasElement, 1, 1)).toHaveFocus();
  }
};

// ── Moving between cells ─────────────────────────────────────────────────
//
// The DOM order is wrong for this grid: one side's cells are siblings, so a native Tab runs along the
// row. The region walks bottom-then-top within each column instead. Under happy-dom these dispatched a
// Tab the browser would never move focus for; here an unhandled Tab WOULD move focus, natively.

export const TabGoesToTheOpposingScore: StoryObj = {
  name: 'Moving: Tab from the lower cell goes UP to the opposing score, not across the row',
  render: cardWith({ sets: [SIX_FOUR] }),
  play: async ({ canvasElement }) => {
    await user.click(done(canvasElement, 2, 1));
    await expect(cell(canvasElement, 2, 1)).toHaveFocus();

    await user.tab();

    await expect(cell(canvasElement, 1, 1)).toHaveFocus();
    // Native order would have run along side 2's row, to its next set.
    await expect(cell(canvasElement, 2, 2)).not.toHaveFocus();
  }
};

export const ShiftTabGoesBack: StoryObj = {
  name: 'Moving: Shift-Tab steps back into the previous set’s upper cell',
  render: cardWith({ sets: [SIX_FOUR] }),
  play: async ({ canvasElement }) => {
    await user.click(cell(canvasElement, 2, 2));

    await user.tab({ shift: true });

    await expect(cell(canvasElement, 1, 1)).toHaveFocus();
    await expect(cell(canvasElement, 1, 1)).toBeVisible();
    await expect(cell(canvasElement, 1, 1).checkVisibility()).toBe(true);
  }
};

export const BackspaceInAnEmptyCellStepsBack: StoryObj = {
  name: 'Moving: Backspace in an EMPTY cell steps back',
  render: cardWith({ sets: [SIX_FOUR] }),
  play: async ({ canvasElement }) => {
    await typeIn(canvasElement, 2, 2, BACKSPACE);

    await expect(cell(canvasElement, 1, 1)).toHaveFocus();
    await expect(cell(canvasElement, 1, 1)).toHaveValue('6');
  }
};

export const BackspaceInAFilledCellDeletes: StoryObj = {
  name: 'Moving: Backspace in a FILLED cell deletes, and does not jump',
  render: cardWith({ sets: [SIX_FOUR] }),
  play: async ({ canvasElement }) => {
    await user.click(done(canvasElement, 2, 1));
    await expect(cell(canvasElement, 2, 1)).toHaveValue('4');

    await user.keyboard(BACKSPACE);

    await expect(cell(canvasElement, 2, 1)).toHaveFocus();
    await expect(cell(canvasElement, 2, 1), 'the 4 is gone — it was deleted, not stepped over').toHaveValue('');
  }
};

// ── A cell that already holds a score ────────────────────────────────────

export const LeadingZeroResolves: StoryObj = {
  name: 'Held score: a 0 with a 6 typed after it resolves to 6, not 06 — and a lone 0 stays',
  // Smart off, so the 0 is not completed to 0-6 and moved past: the subject is the one field.
  render: cardWith({ smartComplements: false }),
  play: async ({ canvasElement }) => {
    await typeIn(canvasElement, 1, 1, '[Digit0]');
    await expect(cell(canvasElement, 1, 1), 'a set lost to love is a real score').toHaveValue('0');

    // A caret AFTER the 0 rather than a selection over it — what a second click into the field leaves.
    await user.keyboard('{End}[Digit6]');

    await expect(cell(canvasElement, 1, 1)).toHaveValue('6');
  }
};

export const SelectsOnFocus: StoryObj = {
  name: 'Held score: a real click AND a real Tab each select what is there, so typing replaces it',
  // A set in progress, so both its cells are on screen and hold a value.
  render: cardWith({ sets: [SIX_FOUR, { setNumber: 2, side1Score: 2, side2Score: 1 }] }),
  play: async ({ canvasElement }) => {
    const lower = cell(canvasElement, 2, 2);
    const upper = cell(canvasElement, 1, 2);

    // A trusted click places a caret where it lands, so the selection here is the focus handler's.
    await user.click(lower);
    await expect(lower).toHaveFocus();
    await expect([lower.selectionStart, lower.selectionEnd], 'a click selects the 1').toEqual([0, 1]);

    await user.tab();
    await expect(upper).toHaveFocus();
    await expect([upper.selectionStart, upper.selectionEnd], 'a Tab selects the 2').toEqual([0, 1]);

    // The consequence: the next digit REPLACES the 2 rather than making it 23.
    await user.keyboard('[Digit5]');
    await expect(upper).toHaveValue('5');
  }
};

// ── [Clear] ──────────────────────────────────────────────────────────────

export const ClearDiscardsTheScore: StoryObj = {
  name: 'Clear: discards the SCORE as well as the ending, and puts focus back where entry begins',
  render: cardWith({ sets: [SIX_FOUR] }),
  play: async ({ canvasElement }) => {
    await expect(done(canvasElement, 1, 1).textContent, 'control: the card opened on a 6-4').toBe('6');

    await user.click(clear(canvasElement));

    await expect(cell(canvasElement, 1, 1)).toHaveValue('');
    await expect(cell(canvasElement, 2, 1)).toHaveValue('');
    await expect(handles(canvasElement).region.getSets()).toEqual([]);
    // This card opened on a recorded score, so the band says what Submit will now do to it. The rule is
    // `clearGate` / `clearHeadline`, in `logic/__tests__/scoreEntryRules.test.ts`.
    await expect(one(canvasElement, BAND).textContent).toMatch(/will be removed/i);
    // The first set's LOWER cell — the same place the dialog opens on.
    await expect(cell(canvasElement, 2, 1)).toHaveFocus();
  }
};

export const ClearTakesTheEndingToo: StoryObj = {
  name: 'Clear: a recorded ending counts as something to clear, and goes with the click',
  render: cardWith(),
  play: async ({ canvasElement }) => {
    await expect(clear(canvasElement), 'nothing to clear yet').toBeDisabled();

    await walkoverSideTwo(canvasElement);
    await expect(one(canvasElement, ROW_ENDING)).toBeVisible();
    await expect(clear(canvasElement), 'an ending with no score is something to clear').toBeEnabled();

    await user.click(clear(canvasElement));

    await expect(canvasElement.querySelector(ROW_ENDING)).toBeNull();
    await expect(handles(canvasElement).card.getState()).toEqual({});
    await expect(clear(canvasElement)).toBeDisabled();
  }
};

export const ClearedSetComplementsAgain: StoryObj = {
  name: 'Clear: a cleared set complements again, and Clear is live only while there is something to take',
  // `complementsUsed` fires a complement once per set. Left standing through a Clear, the set would behave
  // differently from one in a card that had never been typed into.
  render: cardWith(),
  play: async ({ canvasElement }) => {
    await expect(clear(canvasElement)).toBeDisabled();

    await typeIn(canvasElement, 1, 1, '[Digit3]');
    await expect(cell(canvasElement, 2, 1)).toHaveValue('6');
    await expect(clear(canvasElement)).toBeEnabled();

    await user.click(clear(canvasElement));
    await expect(clear(canvasElement)).toBeDisabled();

    await typeIn(canvasElement, 1, 1, '[Digit4]');
    await expect(cell(canvasElement, 1, 1)).toHaveValue('4');
    await expect(cell(canvasElement, 2, 1)).toHaveValue('6');
  }
};

// ── [Cancel] and Enter, in the dialog ────────────────────────────────────

/** What the host heard, in order. Reset by each play that reads it. */
const heard: string[] = [];
const onSubmit = fn();

export const CancelClosesAndTellsTheHostFirst: StoryObj = {
  name: 'Dialog: Cancel closes it, and the host hears Cancel before Close',
  // The card only REPORTS the click — it has no idea it is in a modal — and the dialog once passed no
  // `onCancel`, so the button did nothing whatsoever.
  render: () =>
    dialogLauncher(() => ({
      sides: SIDES,
      matchUpFormat: FORMAT,
      statusCodeGroups: REAL_GROUPS,
      onCancel: () => heard.push('cancel'),
      onClose: () => heard.push('close')
    })),
  play: async ({ canvasElement }) => {
    closeAllModals();
    heard.length = 0;
    await openFrom(canvasElement);

    await user.click(inModal(CANCEL));

    await expect(document.querySelector(MODAL)).toBeNull();
    await expect(heard).toEqual(['cancel', 'close']);
  }
};

export const EnterSubmitsOnlyWhenLive: StoryObj = {
  name: 'Dialog: Enter submits when Submit is live, and does nothing when it is not',
  render: () =>
    dialogLauncher(() => ({ sides: SIDES, matchUpFormat: FORMAT, statusCodeGroups: REAL_GROUPS, onSubmit })),
  play: async ({ canvasElement }) => {
    closeAllModals();
    onSubmit.mockClear();
    await openFrom(canvasElement);

    await user.keyboard('{Enter}');
    await expect(onSubmit, 'nothing entered: the gate is shut').not.toHaveBeenCalled();
    await expect(document.querySelector(MODAL)).not.toBeNull();

    // From the lower cell the dialog opened on: Shift sends each digit to the upper row, so this is 3-6 4-6.
    await user.keyboard(SHIFT_3);
    await user.keyboard('{Shift>}[Digit4]{/Shift}');
    await expect(inModal(BAND).textContent).toContain('3-6 4-6');

    await user.keyboard('{Enter}');

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    await expect(onSubmit.mock.calls[0][0].score).toBe('3-6 4-6');
    await expect(document.querySelector(MODAL), 'and the dialog closed').toBeNull();
  }
};
