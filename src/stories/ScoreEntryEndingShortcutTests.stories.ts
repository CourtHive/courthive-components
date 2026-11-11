/**
 * The ending shortcuts, pressed on a real keyboard: `w`/`W`, `r`/`R`, `d`/`D` per side; `i`, `c`, `a`,
 * `s` for the match.
 *
 * Which ending a letter names is a node test (`logic/__tests__/endingShortcutKeys.test.ts`). What is left
 * is the browser's: a key goes to whatever HAS focus, so these press it from a real focused control —
 * a Dynamic Sets cell, a Dial Pad key, the Free Score field — and never from the card element itself.
 *
 * That is the false green these replace. The unit suite dispatched `keydown` on the card, which worked
 * whatever focus was doing; a real key pressed after focus had fallen to the body would reach nothing.
 * So every story that presses twice is also a check that the first press left focus somewhere live.
 */
import { matchUpStatusConstants, fixtures, policyConstants } from 'tods-competition-factory';
import { createDynamicSetsRegion } from '../components/scoring/regions/dynamicSetsRegion';
import { createFreeScoreRegion } from '../components/scoring/regions/freeScoreRegion';
import { createDialPadRegion } from '../components/scoring/regions/dialPadRegion';
import { renderScoreEntryCard } from '../components/scoring/scoreEntryCard';
import { one } from './helpers/scoreRegionCard';
import { user } from './helpers/trustedUser';
import { expect } from 'storybook/test';

import type { StatusCodeGroups } from '../components/scoring/logic/statusCodes';
import type { Meta, StoryObj } from '@storybook/html-vite';

const { WALKOVER, RETIRED, DEFAULTED, IN_PROGRESS, CANCELLED, AWAITING_RESULT, SUSPENDED } = matchUpStatusConstants;
const { POLICY_TYPE_SCORING } = policyConstants;

const REAL_GROUPS = fixtures.policies.POLICY_SCORING_USTA[POLICY_TYPE_SCORING].matchUpStatusCodes as StatusCodeGroups;

const meta: Meta = {
  title: 'Scoring/Score Entry/Tests/Ending Shortcuts',
  tags: ['!dev']
};
export default meta;

type Approach = 'dynamicSets' | 'freeScore' | 'dialPad';

const FORMAT = 'SET3-S:6/TB7';
const SIDES: any = [{ participantName: 'Rosalind Lem' }, { participantName: 'Derrick Ellul' }];
const ROW_ENDING = '[data-row-ending]';
const BAND = '.chc-sec-band';
const OTHER = '.chc-sec-endings button[data-action="other"]';
const FREE_SCORE = 'input[data-free-score]';
const DIGIT_FOUR = 'button[data-digit="4"]';
const PANEL = '[data-panel-side]';
/** The lower participant is side 2 and the upper side 1 — the convention the case encodes. */
const LOWER = 2;
const UPPER = 1;

/** Build a card into the canvas, as a host would, and return its root. */
function mount(canvasElement: HTMLElement, approach: Approach = 'dynamicSets'): HTMLElement {
  const hooks = { onChange: () => card.refresh(), onStructureChange: () => card.rerender() };
  const region =
    approach === 'freeScore'
      ? createFreeScoreRegion({ matchUpFormat: FORMAT, onChange: hooks.onChange })
      : approach === 'dialPad'
        ? createDialPadRegion({ matchUpFormat: FORMAT, onChange: hooks.onChange })
        : createDynamicSetsRegion({ matchUpFormat: FORMAT, ...hooks });
  const card = renderScoreEntryCard({ sides: SIDES, matchUpFormat: FORMAT, statusCodeGroups: REAL_GROUPS, region });
  const frame = document.createElement('div');
  frame.style.cssText = 'width:100%;max-width:720px;padding:16px;box-sizing:border-box';
  frame.append(card.element);
  canvasElement.replaceChildren(frame);
  return card.element;
}

const cell = (root: HTMLElement, side: number, set = 1) =>
  one<HTMLInputElement>(root, `input[data-side="${side}"][data-set="${set}"]`);
const matchButton = (root: HTMLElement, status: string) =>
  one<HTMLButtonElement>(root, `.chc-sec-endings button[data-ending="${status}"]`);
const pill = (root: HTMLElement) => root.querySelector<HTMLElement>(ROW_ENDING);
const pillSide = (root: HTMLElement) => pill(root)?.closest<HTMLElement>('.chc-sec-row')?.dataset.side;
const isPressed = (element: Element) => element.getAttribute('aria-pressed');
const pressedEndings = (root: HTMLElement) => [
  ...root.querySelectorAll<HTMLElement>('.chc-sec-endings > button[aria-pressed="true"]')
];

/** Put focus in the first lower-row cell, where an operator entering a score is. */
async function focusEntry(root: HTMLElement): Promise<void> {
  await user.click(cell(root, LOWER));
  await expect(cell(root, LOWER)).toHaveFocus();
}

/** Type a set into Dynamic Sets with real keys, lower row first — the order entry takes. */
async function enterSet(root: HTMLElement, set: number, side1: string, side2: string): Promise<void> {
  await user.fill(cell(root, 2, set), side2);
  await user.fill(cell(root, 1, set), side1);
}

/** Focus is somewhere the keyboard still reaches, and visibly so — not left on the body. */
async function expectLiveFocus(root: HTMLElement): Promise<HTMLElement> {
  const focused = document.activeElement as HTMLElement;
  await expect(focused).not.toBe(document.body);
  await expect(root.contains(focused), 'focus left the card').toBe(true);
  await expect(focused.checkVisibility()).toBe(true);
  await expect(focused).toBeVisible();
  return focused;
}

// ── Side endings: the letter names the ending, the CASE names the row ──

export const SideLettersNameTheRow: StoryObj = {
  name: 'w/W, r/R, d/D record against the lower/upper row, from a Dial Pad key',
  render: () => document.createElement('div'),
  play: async ({ canvasElement }) => {
    const cases: [string, string, number][] = [
      ['w', WALKOVER, LOWER],
      ['W', WALKOVER, UPPER],
      ['r', RETIRED, LOWER],
      ['R', RETIRED, UPPER],
      ['d', DEFAULTED, LOWER],
      ['D', DEFAULTED, UPPER]
    ];
    for (const [key, status, side] of cases) {
      const root = mount(canvasElement, 'dialPad');
      // A retirement needs a score to keep (CA, 2026-10-08): one tap gives every row one. The tap also
      // leaves focus on the key, which is where the letter is pressed from.
      await user.click(one(root, DIGIT_FOUR));
      await expect(one(root, DIGIT_FOUR)).toHaveFocus();

      await user.keyboard(key);

      await expect(pill(root), `${key} recorded nothing`).not.toBeNull();
      await expect(pill(root)!.dataset.rowEnding, key).toBe(status);
      await expect(pillSide(root), key).toBe(String(side));
    }
  }
};

export const LetterAdvancesTheOtherParticipant: StoryObj = {
  name: '`w` advances the upper participant and `W` the lower — the inversion, from the keyboard',
  render: () => document.createElement('div'),
  play: async ({ canvasElement }) => {
    const root = mount(canvasElement);
    await focusEntry(root);

    await user.keyboard('w');
    await expect(one(root, BAND)).toHaveTextContent('Rosalind Lem advances');

    // Two more presses from wherever the first left focus: off again, then the capital.
    await user.keyboard('w');
    await expect(pill(root)).toBeNull();
    await user.keyboard('W');
    await expect(one(root, BAND)).toHaveTextContent('Derrick Ellul advances');
  }
};

export const LetterOpensThatRowsPanel: StoryObj = {
  name: "`w` opens that row's panel, with its reason codes visible",
  render: () => document.createElement('div'),
  play: async ({ canvasElement }) => {
    const root = mount(canvasElement);
    await focusEntry(root);
    await expect(root.querySelector(PANEL), 'no panel before the press').toBeNull();

    await user.keyboard('w');

    const panel = one(root, `[data-panel-side="${LOWER}"]`);
    await expect(panel).toBeVisible();
    await expect(panel).toHaveTextContent('What happened to Derrick Ellul?');
    await expect(root.querySelector(`[data-panel-side="${UPPER}"]`)).toBeNull();
    const chip = one(panel, 'button[data-reason]');
    await expect(chip.checkVisibility()).toBe(true);
    await expect(chip).toBeVisible();
  }
};

export const FocusLandsOnTheChosenEnding: StoryObj = {
  name: 'Focus lands on the ending just chosen, inside its panel — not on the body',
  render: () => document.createElement('div'),
  play: async ({ canvasElement }) => {
    const root = mount(canvasElement);
    await focusEntry(root);

    await user.keyboard('w');

    // The press re-renders the whole card and the cell it came from is gone (a walkover locks the score).
    const focused = await expectLiveFocus(root);
    await expect(focused.dataset.ending).toBe(WALKOVER);
    await expect(focused.closest<HTMLElement>(PANEL)?.dataset.panelSide).toBe(String(LOWER));

    // And the reason chips are one Tab away, which is why focus goes there.
    await user.tab();
    await expect((document.activeElement as HTMLElement).closest(`[data-panel-side="${LOWER}"]`)).not.toBeNull();
  }
};

export const LetterToggles: StoryObj = {
  name: 'The same letter twice leaves the card as it started, and focus on the row',
  render: () => document.createElement('div'),
  play: async ({ canvasElement }) => {
    const root = mount(canvasElement);
    await focusEntry(root);

    await user.keyboard('w');
    await expect(pill(root)).not.toBeNull();

    await user.keyboard('w');

    await expect(pill(root)).toBeNull();
    await expect(root.querySelector(`[data-panel-side="${LOWER}"]`), 'the panel closes with it').toBeNull();
    await expect(one(root, BAND).dataset.tone).toBe('neutral');
    // On the row's opener, so a third press of the same letter still works.
    const focused = await expectLiveFocus(root);
    await expect(focused.dataset.action).toBe('endedEarly');
    await expect(focused.dataset.side).toBe(String(LOWER));
    await user.keyboard('w');
    await expect(pill(root)?.dataset.rowEnding).toBe(WALKOVER);
  }
};

export const LetterMovesBetweenRows: StoryObj = {
  name: '`w` then `W` moves the walkover to the upper row rather than recording two',
  render: () => document.createElement('div'),
  play: async ({ canvasElement }) => {
    const root = mount(canvasElement);
    await focusEntry(root);

    await user.keyboard('w');
    await user.keyboard('W');

    const pills = [...root.querySelectorAll<HTMLElement>(ROW_ENDING)];
    await expect(pills).toHaveLength(1);
    await expect(pillSide(root)).toBe(String(UPPER));
    await expect(root.querySelector(`[data-panel-side="${LOWER}"]`)).toBeNull();
    await expect(one(root, `[data-panel-side="${UPPER}"]`)).toBeVisible();
  }
};

export const LetterReplacesOnTheSameRow: StoryObj = {
  name: '`d` then `r` replaces the default with a retirement on the same row',
  render: () => document.createElement('div'),
  play: async ({ canvasElement }) => {
    // A default coexists with a score and a retirement needs one (CA, 2026-10-08), so the replacement is
    // d → r over a tapped game; a walkover would have cleared and locked the score first.
    const root = mount(canvasElement, 'dialPad');
    await user.click(one(root, DIGIT_FOUR));

    await user.keyboard('d');
    await expect(pill(root)?.dataset.rowEnding).toBe(DEFAULTED);
    await user.keyboard('r');

    await expect(pill(root)?.dataset.rowEnding).toBe(RETIRED);
    await expect(pillSide(root)).toBe(String(LOWER));
    await expect(root.querySelectorAll(ROW_ENDING)).toHaveLength(1);
  }
};

export const EveryScoringMode: StoryObj = {
  name: 'Every scoring mode records a walkover from the keyboard — CA, 2026-09-28',
  render: () => document.createElement('div'),
  play: async ({ canvasElement, step }) => {
    await step('Dynamic Sets, from a score cell', async () => {
      const root = mount(canvasElement, 'dynamicSets');
      await focusEntry(root);
      await user.keyboard('w');
      await expect(pill(root)?.dataset.rowEnding).toBe(WALKOVER);
      await expect(pillSide(root)).toBe(String(LOWER));
    });

    await step('Dial Pad, from a key', async () => {
      const root = mount(canvasElement, 'dialPad');
      await user.click(one(root, DIGIT_FOUR));
      await user.keyboard('w');
      await expect(pill(root)?.dataset.rowEnding).toBe(WALKOVER);
      await expect(pillSide(root)).toBe(String(LOWER));
    });

    await step('Free Score, from the control after the field', async () => {
      const root = mount(canvasElement, 'freeScore');
      await user.click(one(root, FREE_SCORE));
      await user.tab();
      await expect(one(root, FREE_SCORE)).not.toHaveFocus();
      await user.keyboard('w');
      await expect(pill(root)?.dataset.rowEnding).toBe(WALKOVER);
      await expect(pillSide(root)).toBe(String(LOWER));
    });
  }
};

// ── Which focused field may receive a shortcut ──

export const FiresFromADynamicSetsCell: StoryObj = {
  name: 'A Dynamic Sets cell takes digits only, so `w` and `s` typed there are shortcuts',
  render: () => document.createElement('div'),
  play: async ({ canvasElement, step }) => {
    await step('w', async () => {
      const root = mount(canvasElement, 'dynamicSets');
      await focusEntry(root);
      await user.keyboard('w');
      await expect(pill(root)?.dataset.rowEnding).toBe(WALKOVER);
    });

    await step('s, with a part-score the cell keeps', async () => {
      const root = mount(canvasElement, 'dynamicSets');
      await user.fill(cell(root, LOWER), '3');
      await expect(cell(root, LOWER)).toHaveFocus();
      await user.keyboard('s');
      await expect(isPressed(matchButton(root, SUSPENDED))).toBe('true');
      // The letter did not land in the cell as text.
      await expect(cell(root, LOWER)).toHaveValue('3');
    });
  }
};

export const FreeScoreFieldKeepsItsLetters: StoryObj = {
  name: 'Letters typed into the Free Score field are text — `6-4 ret` is why it exists',
  render: () => document.createElement('div'),
  play: async ({ canvasElement }) => {
    const root = mount(canvasElement, 'freeScore');
    await user.click(one(root, FREE_SCORE));
    await expect(one(root, FREE_SCORE)).toHaveFocus();

    await user.keyboard('wrdicas');

    // The positive half: the field RECEIVED them. A guard that merely swallowed them would pass the rest.
    await expect(one<HTMLInputElement>(root, FREE_SCORE).value).toContain('wrdicas');
    await expect(one(root, FREE_SCORE)).toHaveFocus();
    await expect(pill(root)).toBeNull();
    await expect(pressedEndings(root)).toHaveLength(0);
    await expect(root.querySelector(PANEL)).toBeNull();
  }
};

export const FreeScoreFiresOutsideTheField: StoryObj = {
  name: 'The same card fires the shortcut once focus has left the field — the guard is not simply off',
  render: () => document.createElement('div'),
  play: async ({ canvasElement }) => {
    const root = mount(canvasElement, 'freeScore');
    await user.click(one(root, FREE_SCORE));
    await user.tab();
    await expect(one(root, FREE_SCORE)).not.toHaveFocus();
    await expectLiveFocus(root);

    await user.keyboard('s');
    await expect(isPressed(matchButton(root, SUSPENDED))).toBe('true');
  }
};

// ── Match-level endings: i, c, a, s — no side, so either case ──

export const MatchLettersEitherCase: StoryObj = {
  name: 'i/I, c/C, a/A, s/S record that match ending against no row',
  render: () => document.createElement('div'),
  play: async ({ canvasElement }) => {
    const cases: [string, string][] = [
      ['i', IN_PROGRESS],
      ['I', IN_PROGRESS],
      ['c', CANCELLED],
      ['C', CANCELLED],
      ['a', AWAITING_RESULT],
      ['A', AWAITING_RESULT],
      ['s', SUSPENDED],
      ['S', SUSPENDED]
    ];
    for (const [key, status] of cases) {
      const root = mount(canvasElement);
      await focusEntry(root);

      await user.keyboard(key);

      // Cancelled has no button of its own; the Other… chip carries it.
      const control =
        root.querySelector<HTMLElement>(`.chc-sec-endings > button[data-ending="${status}"]`) ?? one(root, OTHER);
      await expect(isPressed(control), key).toBe('true');
      await expect(pressedEndings(root), key).toHaveLength(1);
      await expect(pill(root), `${key}: a match ending marks no row`).toBeNull();
    }
  }
};

export const MatchLetterPressesItsButton: StoryObj = {
  name: '`s` is the same as clicking Suspended: pressed, and focused',
  render: () => document.createElement('div'),
  play: async ({ canvasElement }) => {
    const root = mount(canvasElement);
    await focusEntry(root);

    await user.keyboard('s');

    await expect(isPressed(matchButton(root, SUSPENDED))).toBe('true');
    await expect(matchButton(root, SUSPENDED)).toHaveFocus();
    await expectLiveFocus(root);
  }
};

export const CancelledChipTakesFocus: StoryObj = {
  name: '`c`: Cancelled lives in Other…, so the chip names it and takes focus',
  render: () => document.createElement('div'),
  play: async ({ canvasElement }) => {
    const root = mount(canvasElement);
    await focusEntry(root);

    await user.keyboard('c');

    const other = one(root, OTHER);
    await expect(other).toHaveTextContent('Cancelled');
    await expect(isPressed(other)).toBe('true');
    await expect(other).toHaveFocus();
    await expect(root.querySelector('.chc-sec-other-menu'), 'the menu stays closed').toBeNull();
  }
};

export const MatchLetterToggles: StoryObj = {
  name: '`a` then `A` undoes it — either case is the same key',
  render: () => document.createElement('div'),
  play: async ({ canvasElement }) => {
    const root = mount(canvasElement);
    await focusEntry(root);

    await user.keyboard('a');
    await expect(isPressed(matchButton(root, AWAITING_RESULT))).toBe('true');
    await user.keyboard('A');

    await expect(isPressed(matchButton(root, AWAITING_RESULT))).toBe('false');
    await expect(pressedEndings(root)).toHaveLength(0);
  }
};

export const MatchLetterReplacesASideEnding: StoryObj = {
  name: '`w` then `i` replaces the walkover with In Progress, as clicking does',
  render: () => document.createElement('div'),
  play: async ({ canvasElement }) => {
    const root = mount(canvasElement);
    await focusEntry(root);

    await user.keyboard('w');
    await expect(pill(root)).not.toBeNull();
    await user.keyboard('i');

    await expect(isPressed(matchButton(root, IN_PROGRESS))).toBe('true');
    await expect(pill(root)).toBeNull();
    // The row's panel stays open, as it does after clicking In Progress, but holds no selection.
    await expect(root.querySelectorAll('[data-panel-side] button[data-ending][aria-pressed="true"]')).toHaveLength(0);
  }
};

export const CancelledClearsLikeClicking: StoryObj = {
  name: '`c` clears a part-score exactly as clicking Other… → Cancelled does',
  render: () => document.createElement('div'),
  play: async ({ canvasElement }) => {
    const clicked = mount(canvasElement);
    await enterSet(clicked, 1, '6', '4');
    await user.click(one(clicked, OTHER));
    await user.click(one(clicked, `.chc-sec-other-menu button[data-ending="${CANCELLED}"]`));
    const byClick = one(clicked, BAND).textContent;
    await expect(byClick).toMatch(/cleared/i);

    const typed = mount(canvasElement);
    await enterSet(typed, 1, '6', '4');
    await user.keyboard('c');

    await expect(one(typed, BAND).textContent).toBe(byClick);
    await expect(one(typed, BAND)).toHaveTextContent('6-4');
    await expect(cell(typed, 1)).toHaveValue('');
    await expect(cell(typed, 2)).toHaveValue('');
  }
};

export const RefusedWhenTheScoreIsComplete: StoryObj = {
  name: '`s` is refused on a complete score, as the disabled button is',
  render: () => document.createElement('div'),
  play: async ({ canvasElement }) => {
    const root = mount(canvasElement);
    await enterSet(root, 1, '6', '3');
    await enterSet(root, 2, '6', '2');
    await expect(matchButton(root, SUSPENDED)).toBeDisabled();
    await expect(one(root, BAND)).toHaveTextContent('Rosalind Lem def. Derrick Ellul');

    await user.click(cell(root, 1, 2));
    await user.keyboard('s');

    await expect(isPressed(matchButton(root, SUSPENDED))).toBe('false');
    await expect(pressedEndings(root)).toHaveLength(0);
    await expect(one(root, BAND)).toHaveTextContent('Rosalind Lem def. Derrick Ellul');
  }
};
