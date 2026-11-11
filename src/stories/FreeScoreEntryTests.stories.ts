/**
 * Free Score in Chromium, and the readout and chrome it shares with the Dial Pad.
 *
 * The parse, the field note's rule and the score line are tested in node
 * (`freeScoreAndDialPadRegions.test.ts`). These are what node cannot see: real typing reaches the parse
 * and the band follows; the label focuses its field; the field survives keystrokes; the card's endings
 * outrank a parsed one (that precedence is the card's `currentResolution`); and the readout's columns
 * line up on screen.
 */
import { matchUpStatusConstants } from 'tods-competition-factory';
import { regionCard, one } from './helpers/scoreRegionCard';
import { user } from './helpers/trustedUser';
import { expect } from 'storybook/test';

import type { Meta, StoryObj } from '@storybook/html-vite';

const { WALKOVER, RETIRED, SUSPENDED, CANCELLED } = matchUpStatusConstants;

const meta: Meta = {
  title: 'Scoring/Score Entry/Tests/Free Score',
  tags: ['!dev']
};
export default meta;

const BAND = '.chc-sec-band';
const SUBMIT = 'button[data-action="submit"]';
const FIELD = 'input[data-free-score]';
const NOTE = '.chc-sec-field-note';
const RET_TEXT = '6-4 2-1 ret';
const LEM_ADVANCES = 'Rosalind Lem advances';

const band = (root: HTMLElement) => one(root, BAND);
const field = (root: HTMLElement) => one<HTMLInputElement>(root, FIELD);
const submit = (root: HTMLElement) => one<HTMLButtonElement>(root, SUBMIT);
const readout = (root: HTMLElement, side: number) => one(root, `[data-readout-side="${side}"]`);
const endedEarly = (root: HTMLElement, side: number) =>
  user.click(one(root, `button[data-action="endedEarly"][data-side="${side}"]`));
const sideOption = (root: HTMLElement, side: number, status: string) =>
  user.click(one(root, `[data-panel-side="${side}"] button[data-ending="${status}"]`));
const matchEnding = (root: HTMLElement, status: string) =>
  user.click(one(root, `.chc-sec-endings > button[data-ending="${status}"]`));

export const TypedTextReachesTheBand: StoryObj = {
  name: 'Typed text reaches the band, the readout and the note',
  render: () => regionCard('freeScore'),
  play: async ({ canvasElement }) => {
    await user.click(field(canvasElement));
    await user.keyboard('6-4');
    await expect(submit(canvasElement), 'one set is not a result').toBeDisabled();
    await user.keyboard(' 6-3');

    await expect(band(canvasElement).textContent).toContain('Rosalind Lem def. Derrick Ellul 6-4 6-3');
    await expect(readout(canvasElement, 1).textContent).toBe('6  6');
    await expect(readout(canvasElement, 2).textContent).toBe('4  3');
    await expect(submit(canvasElement)).toBeEnabled();
    await expect(one(canvasElement, NOTE).dataset.tone).toBe('good');

    await user.fill(field(canvasElement), 'qqq');
    await expect(one(canvasElement, NOTE).dataset.tone).toBe('error');
    await expect(one(canvasElement, NOTE)).toBeVisible();
  }
};

export const FieldSurvivesKeystrokes: StoryObj = {
  name: 'The field element survives keystrokes, so the caret does',
  render: () => regionCard('freeScore'),
  play: async ({ canvasElement }) => {
    const before = field(canvasElement);
    await user.click(before);
    await user.keyboard('6-4');

    await expect(field(canvasElement)).toBe(before);
    await expect(before).toHaveFocus();
    await expect(before).toHaveValue('6-4');
  }
};

export const LabelFocusesTheField: StoryObj = {
  name: 'Clicking the label focuses the field',
  render: () => regionCard('freeScore'),
  play: async ({ canvasElement }) => {
    // `<label for>` rather than an aria-label — the one affordance an aria-label does not give.
    const label = one<HTMLLabelElement>(canvasElement, 'label.chc-sec-field-label');
    await expect(label.htmlFor).toBe(field(canvasElement).id);
    await user.click(label);
    await expect(field(canvasElement)).toHaveFocus();
  }
};

export const SeedsFromInitialText: StoryObj = {
  name: 'Opens on an initial score',
  render: () => regionCard('freeScore', { initialText: '6-4 6-3' }),
  play: async ({ canvasElement }) => {
    await expect(field(canvasElement)).toHaveValue('6-4 6-3');
    await expect(submit(canvasElement)).toBeEnabled();
  }
};

export const TypedRetirementAsksWho: StoryObj = {
  name: 'A typed "ret" asks WHO retired, and naming the row completes it',
  render: () => regionCard('freeScore'),
  play: async ({ canvasElement }) => {
    await user.fill(field(canvasElement), RET_TEXT);

    await expect(band(canvasElement).textContent).toMatch(/retired/i);
    await expect(band(canvasElement).textContent).toMatch(/no winner yet|not ready/i);
    await expect(submit(canvasElement), 'a retirement with no named side is not submittable').toBeDisabled();

    await endedEarly(canvasElement, 2);
    await sideOption(canvasElement, 2, RETIRED);
    await expect(submit(canvasElement)).toBeEnabled();
    await expect(band(canvasElement).textContent).toContain(LEM_ADVANCES);
  }
};

export const TypedWalkover: StoryObj = {
  name: 'A typed "wo" becomes a walkover',
  render: () => regionCard('freeScore'),
  play: async ({ canvasElement }) => {
    await user.fill(field(canvasElement), 'wo');
    await expect(band(canvasElement).textContent).toMatch(/walkover/i);
  }
};

/** The precedence lives in the card (`currentResolution`): a click is an instruction, parsed text an inference. */
export const SelectionOverridesParsedEnding: StoryObj = {
  name: 'A selected ending overrides a parsed one; clearing it falls back',
  render: () => regionCard('freeScore'),
  play: async ({ canvasElement }) => {
    await user.fill(field(canvasElement), RET_TEXT);
    await expect(band(canvasElement).textContent).toMatch(/retired/i);
    // A parsed ending does NOT light up the endings controls, so nothing lies about being selected.
    await expect(canvasElement.querySelectorAll('[aria-pressed="true"]')).toHaveLength(0);

    await matchEnding(canvasElement, SUSPENDED);
    await expect(band(canvasElement).textContent).toMatch(/suspended/i);
    await expect(band(canvasElement).textContent).not.toMatch(/retired/i);

    await matchEnding(canvasElement, SUSPENDED);
    await expect(band(canvasElement).textContent).toMatch(/retired/i);
  }
};

export const SideEndingOverridesParsedEnding: StoryObj = {
  name: 'A selected side ending overrides a parsed one too',
  render: () => regionCard('freeScore'),
  play: async ({ canvasElement }) => {
    await user.fill(field(canvasElement), RET_TEXT);
    await endedEarly(canvasElement, 1);
    await sideOption(canvasElement, 1, WALKOVER);

    await expect(band(canvasElement).textContent).toMatch(/walkover/i);
    await expect(band(canvasElement).textContent).toContain('Derrick Ellul advances');
  }
};

export const CancelledQuotesThePartScore: StoryObj = {
  name: 'Cancelled quotes the part-score it clears',
  render: () => regionCard('freeScore', { initialText: '6-4 2-1' }),
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
  render: () => regionCard('freeScore'),
  play: async ({ canvasElement }) => {
    await endedEarly(canvasElement, 2);
    await sideOption(canvasElement, 2, WALKOVER);
    await expect(submit(canvasElement)).toBeEnabled();
    await expect(band(canvasElement).textContent).toContain(LEM_ADVANCES);
  }
};

export const RetirementKeepsThePartScore: StoryObj = {
  name: 'A retirement keeps the part-score',
  render: () => regionCard('freeScore', { initialText: '6-4' }),
  play: async ({ canvasElement }) => {
    await endedEarly(canvasElement, 2);
    await sideOption(canvasElement, 2, RETIRED);
    await expect(band(canvasElement).textContent).toContain(LEM_ADVANCES);
    await expect(band(canvasElement).textContent).toContain('6-4');
  }
};

/**
 * `6-7(10) 7-5 1-6`: the raised 10 is the widest a losing tiebreak gets, and it must stay inside its own
 * set column rather than push the next set along — so the two rows' set columns still line up. The old
 * unit test claimed this and checked only the DOM; this measures it.
 */
export const TwoDigitTiebreakStaysInItsColumn: StoryObj = {
  name: 'A two-digit losing tiebreak stays inside its own set column',
  render: () => regionCard('freeScore', { initialText: '6-7(10) 7-5 1-6' }),
  play: async ({ canvasElement }) => {
    const top = readout(canvasElement, 1);
    const bottom = readout(canvasElement, 2);
    const cells = (row: HTMLElement) => [...row.querySelectorAll<HTMLElement>('.chc-sec-readout-set')];

    await expect(cells(top).map((cell) => cell.firstChild?.textContent)).toEqual(['6', '7', '1']);
    await expect(cells(bottom).map((cell) => cell.firstChild?.textContent)).toEqual(['7', '5', '6']);
    await expect(top.getAttribute('aria-label')).toBe('Side 1: 6 tiebreak 10, 7, 1');
    await expect(bottom.querySelector('sup')).toBeNull();

    const sup = one(cells(top)[0], 'sup');
    await expect(sup.textContent).toBe('10');
    await expect(sup).toBeVisible();

    // Each set's column sits at the same x on both rows: the raised points consumed no track width.
    for (const [index, cell] of cells(top).entries()) {
      const above = cell.getBoundingClientRect();
      const below = cells(bottom)[index].getBoundingClientRect();
      await expect(Math.abs(above.left - below.left), `set ${index + 1} columns misalign`).toBeLessThan(1);
      await expect(Math.abs(above.width - below.width)).toBeLessThan(1);
    }
    // And the 10 ends before the next set's games are drawn. Measured against the GLYPH, through a Range
    // over its text: the 10 runs ~1px past its own 3ch box, into the next box's empty centring margin.
    const glyph = document.createRange();
    glyph.selectNodeContents(cells(top)[1].firstChild as Node);
    await expect(sup.getBoundingClientRect().right).toBeLessThanOrEqual(glyph.getBoundingClientRect().left);
  }
};

export const ReadoutRaisesTheLowerPoints: StoryObj = {
  name: 'The readout raises only the LOWER tiebreak points, from typed text',
  render: () => regionCard('freeScore', { initialText: '7-6(3) 6-4' }),
  play: async ({ canvasElement }) => {
    await expect(readout(canvasElement, 1).textContent).toBe('7  6');
    await expect(readout(canvasElement, 2).textContent).toBe('63  4');
    const sup = one(readout(canvasElement, 2), 'sup');
    await expect(sup.textContent).toBe('3');
    await expect(sup).toBeVisible();
    await expect(readout(canvasElement, 1).querySelector('sup')).toBeNull();
  }
};

function threeCards(): HTMLElement {
  const stack = document.createElement('div');
  stack.style.cssText = 'display:flex;flex-direction:column;gap:12px';
  stack.append(regionCard('freeScore'), regionCard('dialPad'), regionCard('dynamicSets'));
  return stack;
}

export const TheCardIsIdentical: StoryObj = {
  name: 'The card around every region is identical, and the readout column matches',
  render: threeCards,
  play: async ({ canvasElement }) => {
    const cards = [...canvasElement.querySelectorAll<HTMLElement>('[data-component="scoreEntryCard"]')];
    await expect(cards).toHaveLength(3);
    const chrome = ['.chc-sec-header', '.chc-sec-rows', '.chc-sec-endings', BAND, '.chc-sec-footer', SUBMIT];
    for (const card of cards) {
      for (const selector of chrome) await expect(one(card, selector), `${selector} missing`).toBeVisible();
      await expect(card.querySelectorAll('.chc-sec-endings > button[data-ending]')).toHaveLength(3);
      await expect(one(card, 'button[data-action="other"]')).toBeVisible();
    }

    // Free Score and the Dial Pad share one readout column width, from one constant: the readout sits at
    // the same place in both rows of both cards.
    const [freeScore, dialPad] = cards;
    const track = (card: HTMLElement) =>
      getComputedStyle(one(card, '.chc-sec-row')).gridTemplateColumns.split(' ').at(-1);
    await expect(track(freeScore)).toBe('200px');
    await expect(track(dialPad)).toBe(track(freeScore));
    const centre = (card: HTMLElement) => {
      const cell = one(card, '[data-readout-side="1"]').getBoundingClientRect();
      return cell.left + cell.width / 2 - card.getBoundingClientRect().left;
    };
    await expect(Math.abs(centre(freeScore) - centre(dialPad))).toBeLessThan(1);
  }
};
