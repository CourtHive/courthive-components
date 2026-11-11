/**
 * The Dial Pad in Chromium: that real taps and keystrokes reach its rules, and the card follows.
 *
 * The rules themselves — where a digit lands, Tiebreak mode, Backspace order, the match tiebreak — are
 * `logic/dialPadEntry.ts`, tested in node (`freeScoreAndDialPadRegions.test.ts`,
 * `dialPadHoldsOnUnfinishedSet.test.ts`). These stories are the half node cannot see: the keys are
 * clickable, a keystroke is read from `event.code` so `Shift+3` is a 3, the Tiebreak key reports its
 * state, and the band and readouts follow without the operator doing anything else.
 */
import { matchUpStatusConstants } from 'tods-competition-factory';
import { regionCard, one } from './helpers/scoreRegionCard';
import { user } from './helpers/trustedUser';
import { expect } from 'storybook/test';

import type { Meta, StoryObj } from '@storybook/html-vite';

const { WALKOVER, RETIRED, CANCELLED } = matchUpStatusConstants;

const meta: Meta = {
  title: 'Scoring/Score Entry/Tests/Dial Pad',
  tags: ['!dev']
};
export default meta;

const BAND = '.chc-sec-band';
const SUBMIT = 'button[data-action="submit"]';
const TIEBREAK = 'button[data-action="tiebreak"]';
const BACKSPACE = 'button[data-action="backspace"]';
const ARIA_PRESSED = 'aria-pressed';
const LEM_ADVANCES = 'Rosalind Lem advances';

const band = (root: HTMLElement) => one(root, BAND);
const readout = (root: HTMLElement, side: number) => one(root, `[data-readout-side="${side}"]`);
const submit = (root: HTMLElement) => one<HTMLButtonElement>(root, SUBMIT);
const press = async (root: HTMLElement, ...digits: number[]) => {
  for (const digit of digits) await user.click(one(root, `button[data-digit="${digit}"]`));
};

export const Keypad: StoryObj = {
  name: 'Ten digit keys, Tiebreak and Backspace, and a readout per row',
  render: () => regionCard('dialPad'),
  play: async ({ canvasElement }) => {
    const keys = [...canvasElement.querySelectorAll<HTMLButtonElement>('.chc-sec-dialpad button[data-digit]')];
    await expect(keys.map((key) => key.textContent)).toEqual(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']);
    for (const key of keys) await expect(key).toBeVisible();
    await expect(one(canvasElement, TIEBREAK)).toBeVisible();
    await expect(one(canvasElement, BACKSPACE)).toBeVisible();
    // The card owns endings; the keypad carries none of its own.
    await expect(canvasElement.querySelectorAll('.chc-sec-dialpad button[data-ending]')).toHaveLength(0);

    // A readout per row, no per-set inputs, and no header strip above the one unlabelled column.
    await expect(canvasElement.querySelectorAll('.chc-sec-readout')).toHaveLength(2);
    await expect(readout(canvasElement, 1)).toBeVisible();
    await expect(readout(canvasElement, 2)).toBeVisible();
    await expect(canvasElement.querySelectorAll('input[data-set]')).toHaveLength(0);
    await expect(canvasElement.querySelector('.chc-sec-row-head')).toBeNull();
  }
};

export const TapsFillTheLowerRowFirst: StoryObj = {
  name: 'Taps fill the lower row first, and the band follows',
  render: () => regionCard('dialPad'),
  play: async ({ canvasElement }) => {
    await press(canvasElement, 4);
    await expect(readout(canvasElement, 2).textContent).toBe('4');
    await expect(readout(canvasElement, 1).textContent).toBe('0');

    await press(canvasElement, 6);
    await expect(readout(canvasElement, 1).textContent).toBe('6');
    await expect(band(canvasElement).textContent).toContain('6-4');
    await expect(submit(canvasElement)).toBeDisabled();

    await press(canvasElement, 3, 6);
    await expect(submit(canvasElement)).toBeEnabled();
    await expect(band(canvasElement).textContent).toContain('Rosalind Lem def. Derrick Ellul 6-4 6-3');
  }
};

export const BackspaceKey: StoryObj = {
  name: 'Backspace undoes the most recent tap',
  render: () => regionCard('dialPad'),
  play: async ({ canvasElement }) => {
    // On an empty pad it does nothing rather than throwing.
    await user.click(one(canvasElement, BACKSPACE));
    await expect(band(canvasElement).textContent).toMatch(/no result/i);

    await press(canvasElement, 4, 6);
    await expect(band(canvasElement).textContent).toContain('6-4');

    await user.click(one(canvasElement, BACKSPACE));
    await expect(readout(canvasElement, 2).textContent).toBe('4');
    await expect(band(canvasElement).textContent).not.toContain('6-4');

    await user.click(one(canvasElement, BACKSPACE));
    await expect(band(canvasElement).textContent).toMatch(/no result/i);
  }
};

export const HoldsOnAnUnfinishedSet: StoryObj = {
  name: 'After 5-1 the keypad goes quiet',
  render: () => regionCard('dialPad'),
  play: async ({ canvasElement }) => {
    await press(canvasElement, 1, 5, 4, 1);
    await expect(band(canvasElement).textContent).toContain('5-1');
    await expect(band(canvasElement).textContent).not.toContain('1-4');
    await expect(readout(canvasElement, 1).textContent).toBe('5');
    await expect(one(canvasElement, TIEBREAK)).toBeDisabled();
  }
};

/**
 * CA, 2026-09-28: *"Dial pad should work the same way with key strokes."* Focus goes to a key first (the
 * Backspace key, a no-op on an empty pad), because the keypad listens on its own wrapper.
 */
export const Keystrokes: StoryObj = {
  name: 'Keystrokes as well as taps, with Shift naming the upper row',
  render: () => regionCard('dialPad'),
  play: async ({ canvasElement }) => {
    await user.click(one(canvasElement, BACKSPACE));

    await user.keyboard('[Digit4]');
    await expect(readout(canvasElement, 2).textContent).toBe('4');

    await user.keyboard('{Shift>}[Digit6]{/Shift}');
    await expect(readout(canvasElement, 1).textContent).toBe('6');
    await expect(band(canvasElement).textContent).toContain('6-4');

    // The Backspace KEY, not only the button.
    await user.keyboard('{Backspace}');
    await expect(readout(canvasElement, 1).textContent).toBe('0');
    await expect(band(canvasElement).textContent).not.toContain('6-4');
  }
};

export const ShiftThreeIsAThree: StoryObj = {
  name: 'Shift+3 is a 3, not a #',
  render: () => regionCard('dialPad'),
  play: async ({ canvasElement }) => {
    // Typed as `#`, so the keydown carries `key: '#'` with `code: 'Digit3'` — measured; `[Digit3]` under a
    // held Shift arrives as `key: '3'` and could not tell the two apart. The handler reads `event.code`.
    await user.click(one(canvasElement, BACKSPACE));
    await user.keyboard('{Shift>}#{/Shift}');

    await expect(readout(canvasElement, 1).textContent).toBe('3');
    // The opposing cell reads 0, not blank: a set with one side entered is still a set.
    await expect(readout(canvasElement, 2).textContent).toBe('0');
  }
};

export const TiebreakKey: StoryObj = {
  name: 'The Tiebreak key is a toggle, offered once the games carry one',
  render: () => regionCard('dialPad'),
  play: async ({ canvasElement }) => {
    const key = one<HTMLButtonElement>(canvasElement, TIEBREAK);
    await expect(key).toBeDisabled();

    await press(canvasElement, 6, 7);
    await expect(key).toBeEnabled();
    await expect(key.getAttribute(ARIA_PRESSED)).toBe('false');

    await user.click(key);
    await expect(key.getAttribute(ARIA_PRESSED)).toBe('true');
    await press(canvasElement, 3);
    await expect(band(canvasElement).textContent).toContain('7-6(3)');
    // The raised points sit on the loser's readout only.
    await expect(readout(canvasElement, 2).querySelector('sup')?.textContent).toBe('3');
    await expect(readout(canvasElement, 1).querySelector('sup')).toBeNull();

    await user.click(key);
    await expect(key.getAttribute(ARIA_PRESSED)).toBe('false');
  }
};

export const NoTiebreakFormat: StoryObj = {
  name: 'A format with no tiebreak never offers the key',
  render: () => regionCard('dialPad', { matchUpFormat: 'SET3-S:6NOAD' }),
  play: async ({ canvasElement }) => {
    await press(canvasElement, 6, 7);
    await expect(one(canvasElement, TIEBREAK)).toBeDisabled();
  }
};

export const ShiftedMatchTiebreak: StoryObj = {
  name: 'A match tiebreak: Shift+1 Shift+1 is eleven on the upper row',
  render: () => regionCard('dialPad', { matchUpFormat: 'SET1-S:TB10' }),
  play: async ({ canvasElement }) => {
    await expect(one(canvasElement, TIEBREAK)).toBeDisabled();
    await user.click(one(canvasElement, BACKSPACE));
    await user.keyboard('{Shift>}[Digit1][Digit1]{/Shift}');

    await expect(band(canvasElement).textContent).toContain('[11-13]');
    await expect(readout(canvasElement, 1).textContent).toBe('11');
    await expect(readout(canvasElement, 2).textContent).toBe('13');
    await expect(submit(canvasElement)).toBeEnabled();
  }
};

const PART_SCORE = [
  { setNumber: 1, side1Score: 6, side2Score: 4 },
  { setNumber: 2, side1Score: 2, side2Score: 1 }
];

export const CancelledQuotesThePartScore: StoryObj = {
  name: 'Cancelled quotes the part-score it clears',
  render: () => regionCard('dialPad', { sets: PART_SCORE }),
  play: async ({ canvasElement }) => {
    await user.click(one(canvasElement, 'button[data-action="other"]'));
    await user.click(one(canvasElement, `.chc-sec-other-menu button[data-ending="${CANCELLED}"]`));

    await expect(band(canvasElement).dataset.tone).toBe('warn');
    await expect(band(canvasElement).textContent).toContain('6-4 2-1');
    await expect(band(canvasElement).textContent).toMatch(/cleared/i);
  }
};

export const WalkoverWithNoScore: StoryObj = {
  name: 'A walkover submits with no score at all',
  render: () => regionCard('dialPad'),
  play: async ({ canvasElement }) => {
    await user.click(one(canvasElement, 'button[data-action="endedEarly"][data-side="2"]'));
    await user.click(one(canvasElement, `[data-panel-side="2"] button[data-ending="${WALKOVER}"]`));

    await expect(submit(canvasElement)).toBeEnabled();
    await expect(band(canvasElement).textContent).toContain(LEM_ADVANCES);
  }
};

export const RetirementKeepsThePartScore: StoryObj = {
  name: 'A retirement keeps the part-score',
  render: () => regionCard('dialPad', { sets: [{ setNumber: 1, side1Score: 6, side2Score: 4 }] }),
  play: async ({ canvasElement }) => {
    await user.click(one(canvasElement, 'button[data-action="endedEarly"][data-side="2"]'));
    await user.click(one(canvasElement, `[data-panel-side="2"] button[data-ending="${RETIRED}"]`));

    await expect(band(canvasElement).textContent).toContain(LEM_ADVANCES);
    await expect(band(canvasElement).textContent).toContain('6-4');
  }
};

export const ReadoutRaisesTheLowerPoints: StoryObj = {
  name: 'The readout raises only the LOWER tiebreak points',
  render: () =>
    regionCard('dialPad', {
      sets: [
        { setNumber: 1, side1Score: 7, side2Score: 6, side1TiebreakScore: 7, side2TiebreakScore: 3, winningSide: 1 }
      ]
    }),
  play: async ({ canvasElement }) => {
    // CA, 2026-09-30: *"only show the lower tiebreak score via superscript"*.
    await expect(readout(canvasElement, 1).textContent).toBe('7');
    await expect(readout(canvasElement, 2).textContent).toBe('63');
    const sup = one(readout(canvasElement, 2), 'sup');
    await expect(sup.textContent).toBe('3');
    await expect(sup).toBeVisible();
    await expect(readout(canvasElement, 1).querySelector('sup')).toBeNull();
    await expect(readout(canvasElement, 2).getAttribute('aria-label')).toBe('Side 2: 6 tiebreak 3');
  }
};

export const MatchTiebreakReadsPlainly: StoryObj = {
  name: 'A match tiebreak reads plainly — its cells ARE the points',
  render: () =>
    regionCard('dialPad', {
      matchUpFormat: 'SET1-S:TB10',
      sets: [
        { setNumber: 1, side1Score: 0, side2Score: 0, side1TiebreakScore: 10, side2TiebreakScore: 8, winningSide: 1 }
      ]
    }),
  play: async ({ canvasElement }) => {
    await expect(readout(canvasElement, 1).textContent).toBe('10');
    await expect(readout(canvasElement, 2).textContent).toBe('8');
    await expect(readout(canvasElement, 2).querySelector('sup')).toBeNull();
    await expect(band(canvasElement).textContent).toContain('[10-8]');
  }
};
