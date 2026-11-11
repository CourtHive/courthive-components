/**
 * Tab out of the score goes to `[Submit]`, then on to the status chips — in Chromium, with real Tabs.
 *
 * CA, 2026-09-30: *"Can the tab order go from the free score entry field or the last dynamic sets entry
 * field directly to [Submit] (when submit is active)? and then to the other status chips?"*
 *
 * Two handlers share the key. Dynamic Sets owns Tab inside its grid — it walks DOWN each column, because
 * the DOM order is wrong for entry — and calls `preventDefault` on every step it takes. The ONE Tab it
 * does not take is the one off the end of the run, and the card recognises that Tab by
 * `event.defaultPrevented` being false and sends it to Submit. Everything else is the browser's.
 *
 * These were `__tests__/tabReachesSubmit.test.ts` under happy-dom, where a dispatched Tab never moves
 * focus: "the native order is left alone" could only be checked as `defaultPrevented === false`, which
 * says the handlers stood aside and nothing about where the browser then went. A trusted `user.tab()`
 * follows the real order, so here the native step is asserted by where it lands.
 */
import { closeAllModals, dialogLauncher, inModal, openFrom } from './helpers/scoreEntryDialogLauncher';
import { one } from './helpers/scoreRegionCard';
import { user } from './helpers/trustedUser';
import { expect } from 'storybook/test';

import type { ScoreEntryDialogParams } from '../components/scoring/scoreEntryDialog';
import type { Meta, StoryObj } from '@storybook/html-vite';

const meta: Meta = {
  title: 'Scoring/Score Entry/Tests/Tab Order',
  tags: ['!dev']
};
export default meta;

const SIDES: [{ participantName: string }, { participantName: string }] = [
  { participantName: 'Lower' },
  { participantName: 'Upper' }
];
const FORMAT = 'SET3-S:6/TB7';
const SUBMIT = 'button[data-action="submit"]';
const CANCEL = 'button[data-action="cancel"]';
const FREE_SCORE_FIELD = 'input[data-free-score]';
const ENDINGS = '.chc-sec-endings';

const opens =
  (over: Partial<ScoreEntryDialogParams> = {}) =>
  () =>
    dialogLauncher(() => ({ sides: SIDES, matchUpFormat: FORMAT, ...over }));
const submit = () => inModal<HTMLButtonElement>(SUBMIT);
const cell = (side: number, set: number) => inModal<HTMLInputElement>(`input[data-side="${side}"][data-set="${set}"]`);
const done = (side: number, set: number) => inModal(`button[data-done-side="${side}"][data-done-set="${set}"]`);

/** Every element a real Tab can stop on inside the dialog, in document order. */
function tabStops(root: HTMLElement): HTMLElement[] {
  const candidates = root.querySelectorAll<HTMLElement>('button, input, select, textarea, [tabindex]');
  return [...candidates].filter(
    (element) => element.tabIndex >= 0 && !(element as HTMLButtonElement).disabled && element.checkVisibility()
  );
}

export const FreeScoreReachesSubmitThenTheChips: StoryObj = {
  name: 'Free Score: Tab from its one field reaches Submit, and the next Tab the status chips',
  render: opens({ approach: 'freeScore' }),
  play: async ({ canvasElement }) => {
    closeAllModals();
    await openFrom(canvasElement);
    await user.fill(inModal(FREE_SCORE_FIELD), '6-4 6-3');
    await expect(submit(), 'the gate is open').toBeEnabled();
    await expect(inModal(FREE_SCORE_FIELD)).toHaveFocus();

    await user.tab();
    await expect(submit()).toHaveFocus();

    await user.tab();
    await expect(inModal(ENDINGS).contains(document.activeElement)).toBe(true);

    await user.click(inModal(CANCEL));
  }
};

export const FreeScoreGateShutIsTheBrowsersTab: StoryObj = {
  name: 'Free Score: with Submit shut, Tab is the browser’s own — the next stop in the document, not Submit',
  render: opens({ approach: 'freeScore' }),
  play: async ({ canvasElement }) => {
    closeAllModals();
    await openFrom(canvasElement);
    await user.fill(inModal(FREE_SCORE_FIELD), '6-4');
    await expect(submit(), 'an unfinished score keeps the gate shut').toBeDisabled();

    const field = inModal(FREE_SCORE_FIELD);
    const stops = tabStops(field.closest<HTMLElement>('section')!);
    const nativeNext = stops[stops.indexOf(field) + 1];

    await user.tab();

    await expect(nativeNext, 'control: there is a next stop').toBeTruthy();
    await expect(nativeNext).toHaveFocus();
    await expect(submit()).not.toHaveFocus();
    await user.click(inModal(CANCEL));
  }
};

export const DynamicSetsReachesSubmitFromTheEndOfTheRun: StoryObj = {
  name: 'Dynamic Sets: the region keeps Tab inside the grid, and only the END of the run reaches Submit',
  render: opens(),
  play: async ({ canvasElement }) => {
    closeAllModals();
    await openFrom(canvasElement);
    // From the lower cell the dialog opens on: a 4 completes to 6-4, a 3 in the next column to 6-3.
    await user.keyboard('[Digit4][Digit3]');
    await expect(submit()).toBeEnabled();

    // Back into set 1's UPPER cell, then forward. The run is bottom-then-top per column, so the region
    // takes the next Tab itself — to set 2's lower cell — rather than letting Submit steal it.
    await user.click(done(1, 1));
    await expect(cell(1, 1)).toHaveFocus();
    await user.tab();
    await expect(cell(2, 2), 'the region stepped within the grid').toHaveFocus();
    await user.tab();
    await expect(cell(1, 2)).toHaveFocus();

    // The last cell of the RUN — set 2's upper cell, which `.at(-1)` over the inputs is not. The region
    // declines this one, and the card sends it to Submit.
    await user.tab();
    await expect(submit()).toHaveFocus();

    await user.tab();
    await expect(inModal(ENDINGS).contains(document.activeElement), 'and on to the chips').toBe(true);
    await user.click(inModal(CANCEL));
  }
};

export const DynamicSetsGateShutIsTheBrowsersTab: StoryObj = {
  name: 'Dynamic Sets: with Submit shut, the Tab the region declines is the browser’s, not Submit’s',
  render: opens(),
  play: async ({ canvasElement }) => {
    closeAllModals();
    await openFrom(canvasElement);
    // A 7 has no complement in `S:6/TB7`, so set 2 does not open and the run ends at set 1's upper cell.
    await user.keyboard('[Digit7]');
    await expect(submit(), 'an incomplete score keeps the gate shut').toBeDisabled();

    await user.click(cell(1, 1));
    const stops = tabStops(cell(1, 1).closest<HTMLElement>('section')!);
    const nativeNext = stops[stops.indexOf(cell(1, 1)) + 1];

    await user.tab();

    // Under happy-dom this was `defaultPrevented === false`, because a dispatched Tab moves nothing. Here
    // the browser moved it, to the next stop in document order.
    await expect(nativeNext, 'control: there is a next stop').toBeTruthy();
    await expect(nativeNext).toHaveFocus();
    await expect(submit()).not.toHaveFocus();
    await user.click(inModal(CANCEL));
  }
};

export const DialPadKeysKeepTheirTab: StoryObj = {
  name: 'Dial Pad: a keypad key is not the end of a score — Tab goes to the next key, even with Submit live',
  render: opens({ approach: 'dialPad' }),
  play: async ({ canvasElement }) => {
    closeAllModals();
    await openFrom(canvasElement);
    // Submit must be LIVE first: with the gate shut the field check is never reached, and the old test passed
    // against a version that treated every keypad key as a score field.
    for (const digit of ['4', '6', '3', '6']) await user.click(inModal(`button[data-digit="${digit}"]`));
    await expect(submit(), 'the keypad entered a complete score').toBeEnabled();

    // The last key pressed, the 6, holds focus — a click focuses a button in Chromium.
    const key = inModal('button[data-digit="6"]');
    await expect(key).toHaveFocus();
    const stops = tabStops(key.closest<HTMLElement>('section')!);
    const nativeNext = stops[stops.indexOf(key) + 1];
    await expect(nativeNext.dataset.digit, 'control: the next stop is another key').toBeTruthy();

    await user.tab();

    await expect(nativeNext).toHaveFocus();
    await expect(submit()).not.toHaveFocus();
    await expect(one(document.body, '[data-component="scoreEntryCard"]')).toBeVisible();
    await user.click(inModal(CANCEL));
  }
};
