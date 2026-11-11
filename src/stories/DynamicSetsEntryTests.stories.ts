/**
 * Dynamic Sets in Chromium: the grid as an operator meets it.
 *
 * The rules — which columns open, what a typed field means, the Smart complement, integrity — are tested in
 * node (`dynamicSetsRegion.test.ts`, `timedSetEntry.test.ts`, `tiebreakSuperscript.test.ts`). These are
 * the parts only a browser can show: real keystrokes into real inputs, the element kept between digits
 * and rebuilt at a set boundary, where focus lands, the tiebreak column folding away and reopening, the
 * finished set standing in for its fields, the headings standing over their cells, and Enter moving on
 * or submitting.
 */
import { matchUpStatusConstants } from 'tods-competition-factory';
import { regionCard, one } from './helpers/scoreRegionCard';
import { expect, fn, waitFor } from 'storybook/test';
import { user } from './helpers/trustedUser';

import type { RegionCardParams } from './helpers/scoreRegionCard';
import type { Meta, StoryObj } from '@storybook/html-vite';

const { WALKOVER, CANCELLED, SUSPENDED } = matchUpStatusConstants;

const meta: Meta = {
  title: 'Scoring/Score Entry/Tests/Dynamic Sets',
  tags: ['!dev']
};
export default meta;

const BAND = '.chc-sec-band';
const SUBMIT = 'button[data-action="submit"]';
const SMART = 'button[data-action="smartComplements"]';
const LEM_ADVANCES = 'Rosalind Lem advances';
const NINE_BOLTS = 'SET9X-S:T10';
const ARIA_LABEL = 'aria-label';
const ARIA_PRESSED = 'aria-pressed';

type Root = HTMLElement;
const cell = (root: Root, side: number, set: number) =>
  root.querySelector<HTMLInputElement>(`input[data-side="${side}"][data-set="${set}"]`);
const tb = (root: Root, side: number, set: number) =>
  root.querySelector<HTMLInputElement>(`input[data-tiebreak-side="${side}"][data-tiebreak-set="${set}"]`);
const done = (root: Root, side: number, set: number) =>
  one<HTMLButtonElement>(root, `button[data-done-side="${side}"][data-done-set="${set}"]`);
const band = (root: Root) => one(root, BAND);
const submit = (root: Root) => one<HTMLButtonElement>(root, SUBMIT);
const heads = (root: Root) => [...root.querySelectorAll('.chc-sec-col-head')].map((head) => head.textContent);
const must = <T>(value: T | null | undefined, what: string): T => {
  if (value === null || value === undefined) throw new Error(`${what} is not on screen`);
  return value;
};
const field = (root: Root, side: number, set: number) => must(cell(root, side, set), `set ${set} side ${side}`);
const tbField = (root: Root, side: number, set: number) =>
  must(tb(root, side, set), `set ${set} tiebreak side ${side}`);
/** The wrapper of set 1's games cell on one side, holding the raised mark and its spoken twin. */
const gamesCell = (root: Root, side: number) =>
  one(root, `.chc-sec-games-cell:has(> input[data-side="${side}"][data-set="1"])`);
/** Click into a cell and type keys there, as an operator does. */
async function typeIn(root: Root, side: number, set: number, keys: string): Promise<void> {
  await user.click(field(root, side, set));
  await user.keyboard(keys);
}
const digits = (text: string) => [...text].map((digit) => `[Digit${digit}]`).join('');
const card =
  (params: RegionCardParams = {}) =>
  () =>
    regionCard('dynamicSets', params);

const SEVEN_SIX = [{ setNumber: 1, side1Score: 7, side2Score: 6 }];
const SEVEN_SIX_THREE = [
  { setNumber: 1, side1Score: 7, side2Score: 6, side1TiebreakScore: 7, side2TiebreakScore: 3, winningSide: 1 }
];

// ── The grid ───────────────────────────────────────────────────────────

export const RevealsOneSetAtATime: StoryObj = {
  name: 'Grid: one set at a time, headed 1st / 2nd, named in full for a screen reader',
  render: card({ smartComplements: false }),
  play: async ({ canvasElement }) => {
    await expect(heads(canvasElement)).toEqual(['1st']);
    await expect(cell(canvasElement, 1, 1)?.getAttribute(ARIA_LABEL)).toBe('1st set, side 1 games');
    await expect(cell(canvasElement, 1, 2)).toBeNull();

    // half a set opens nothing, and the band has no result
    await typeIn(canvasElement, 1, 1, '[Digit6]');
    await expect(cell(canvasElement, 1, 2), 'the next set must not open on half a score').toBeNull();
    await expect(band(canvasElement).textContent).toMatch(/no result/i);

    await typeIn(canvasElement, 2, 1, '[Digit4]');
    await expect(heads(canvasElement)).toEqual(['1st', '2nd']);
    await expect(one(canvasElement, '.chc-sec-row-head').textContent).not.toMatch(/SET\s*\d/i);
    await expect(cell(canvasElement, 2, 2)?.getAttribute(ARIA_LABEL)).toBe('2nd set, side 2 games');
    await expect(cell(canvasElement, 1, 2)?.getAttribute(ARIA_LABEL)).toBe('2nd set, side 1 games');
    await expect(band(canvasElement).textContent).toContain('6-4');
  }
};

/**
 * The old unit test asserted the header and the rows shared one `grid-template-columns` string, which
 * stands in for alignment without measuring it. This measures it: every heading's centre is over its
 * cells' centres, on both rows, with one set, two, and a tiebreak column open.
 */
function alignedCards(): HTMLElement {
  const stack = document.createElement('div');
  stack.style.cssText = 'display:flex;flex-direction:column;gap:12px';
  stack.append(
    regionCard('dynamicSets'),
    regionCard('dynamicSets', { sets: [{ setNumber: 1, side1Score: 6, side2Score: 4 }] }),
    regionCard('dynamicSets', { sets: SEVEN_SIX })
  );
  return stack;
}

export const HeadingsStandOverTheirCells: StoryObj = {
  name: 'Grid: every heading stands over its cells (one set, two, a tiebreak column)',
  render: alignedCards,
  play: async ({ canvasElement }) => {
    const cards = [...canvasElement.querySelectorAll<HTMLElement>('[data-component="scoreEntryCard"]')];
    await expect(cards.map((each) => heads(each))).toEqual([['1st'], ['1st', '2nd'], ['1st', 'TB', '2nd']]);

    const centre = (element: Element) => {
      const rect = element.getBoundingClientRect();
      return rect.left + rect.width / 2;
    };
    for (const each of cards) {
      const headings = [...each.querySelectorAll('.chc-sec-col-head')];
      for (const side of [1, 2]) {
        const row = one(each, `.chc-sec-row[data-side="${side}"]`);
        const inputs = [...row.querySelectorAll<HTMLInputElement>('input.chc-sec-set-input:not([hidden])')];
        const folded = [...row.querySelectorAll<HTMLElement>('button.chc-sec-set-done:not([hidden])')];
        const shownCells = [...inputs, ...folded].sort((a, b) => centre(a) - centre(b));
        await expect(shownCells).toHaveLength(headings.length);
        for (const [index, heading] of headings.entries()) {
          await expect(
            Math.abs(centre(heading) - centre(shownCells[index])),
            `"${heading.textContent}" is not over its side ${side} cell`
          ).toBeLessThan(1.5);
        }
      }
    }
  }
};

// ── Typing ─────────────────────────────────────────────────────────────

export const KeepsTheInputWithinASet: StoryObj = {
  name: 'Typing: the input survives keystrokes within a set, so the caret does',
  render: card({ smartComplements: false }),
  play: async ({ canvasElement }) => {
    const first = field(canvasElement, 1, 1);
    await typeIn(canvasElement, 1, 1, '[Digit6]{Backspace}[Digit5]');

    await expect(cell(canvasElement, 1, 1)).toBe(first);
    await expect(first).toHaveFocus();
    await expect(first).toHaveValue('5');
  }
};

export const RebuildsAtASetBoundary: StoryObj = {
  name: 'Typing: a set boundary rebuilds the grid, keeps the values and the focus',
  render: card({ smartComplements: false }),
  play: async ({ canvasElement }) => {
    const first = field(canvasElement, 1, 1);
    await typeIn(canvasElement, 1, 1, '[Digit6]');
    await typeIn(canvasElement, 2, 1, '[Digit4]');

    // The 2nd set's column did not exist a moment ago, so the cells are new; the VALUES come back.
    await expect(first.isConnected).toBe(false);
    await expect(cell(canvasElement, 1, 1)?.value).toBe('6');
    await expect(cell(canvasElement, 1, 2)).toBeVisible();
    // Focus is restored to the REBUILT cell just typed into, not lost to the page.
    await expect(cell(canvasElement, 2, 1)).toHaveFocus();
  }
};

export const RefusesWhatTheFormatCannotProduce: StoryObj = {
  name: "Typing: letters are dropped, and CA's 3-44 cannot be typed",
  render: card({ smartComplements: false }),
  play: async ({ canvasElement }) => {
    await typeIn(canvasElement, 1, 1, '[Digit6][KeyA]');
    await expect(cell(canvasElement, 1, 1)).toHaveValue('6');

    await typeIn(canvasElement, 1, 1, '[Digit4][Digit4]');
    await expect(cell(canvasElement, 1, 1), 'a set to six cannot hold a 44').toHaveValue('4');

    await typeIn(canvasElement, 2, 1, '[Digit8]');
    await expect(cell(canvasElement, 2, 1)).toHaveValue('');
  }
};

export const BandAndSubmitFollowTheGrid: StoryObj = {
  name: 'Typing: the band and Submit follow without anything else',
  render: card({ smartComplements: false }),
  play: async ({ canvasElement }) => {
    await typeIn(canvasElement, 1, 1, '[Digit6]');
    await typeIn(canvasElement, 2, 1, '[Digit4]');
    await expect(band(canvasElement).textContent).toContain('6-4');
    await expect(submit(canvasElement)).toBeDisabled();

    await typeIn(canvasElement, 1, 2, '[Digit6]');
    await typeIn(canvasElement, 2, 2, '[Digit3]');
    await expect(submit(canvasElement)).toBeEnabled();
    await expect(band(canvasElement).textContent).toContain('Rosalind Lem def. Derrick Ellul 6-4 6-3');
  }
};

/** S3 of the state engine: the decisions a keystroke takes come from the MODEL, even when the field lies. */
export const CaretSurvivesTwoDigits: StoryObj = {
  name: 'Typing: two digits into one bolt land in the same element',
  render: card({ matchUpFormat: 'SET3X-S:T10' }),
  play: async ({ canvasElement }) => {
    const first = field(canvasElement, 2, 1);
    await typeIn(canvasElement, 2, 1, '[Digit2][Digit2]');

    await expect(cell(canvasElement, 2, 1)).toBe(first);
    await expect(first).toHaveValue('22');
    await expect(first).toHaveFocus();
    await expect(band(canvasElement).textContent).toMatch(/no result/i);
  }
};

export const RefusedDigitLeavesTheElement: StoryObj = {
  name: 'Typing: a refused second digit leaves the element alone',
  render: card({ smartComplements: false }),
  play: async ({ canvasElement }) => {
    const first = field(canvasElement, 2, 1);
    await typeIn(canvasElement, 2, 1, '[Digit1][Digit0]');
    await expect(cell(canvasElement, 2, 1)).toBe(first);
    await expect(first, 'a set to six cannot hold a ten').toHaveValue('1');
  }
};

export const StaleFieldDigit: StoryObj = {
  name: 'Typing: a digit into a cell the MODEL holds empty complements, whatever the field shows',
  render: card(),
  play: async ({ canvasElement }) => {
    const first = field(canvasElement, 1, 1);
    // The DOM lies: text that never reached the model through an input event.
    first.value = '6';
    await typeIn(canvasElement, 1, 1, '[Digit3]');

    await expect(cell(canvasElement, 1, 1)?.value).toBe('3');
    await expect(cell(canvasElement, 2, 1)?.value).toBe('6');
  }
};

export const StaleFieldBackspace: StoryObj = {
  name: 'Typing: Backspace steps back only when the MODEL holds the cell empty',
  render: card({ smartComplements: false }),
  play: async ({ canvasElement }) => {
    await typeIn(canvasElement, 2, 1, '[Digit4]');
    await typeIn(canvasElement, 1, 1, '[Digit2]');

    // The model holds 2. Empty the field WITHOUT an input event, so only the DOM thinks it is empty.
    const upper = field(canvasElement, 1, 1);
    upper.value = '';
    await user.keyboard('{Backspace}');
    await expect(upper, 'the model holds a 2, so Backspace does not jump').toHaveFocus();

    // Put the 2 back and delete it for real, so the model is empty; then make the field show stale text.
    upper.value = '2';
    await user.keyboard('{End}{Backspace}');
    const live = field(canvasElement, 1, 1);
    await expect(live).toHaveValue('');
    await expect(band(canvasElement).textContent, 'the model no longer holds the 2').not.toContain('2-4');
    live.value = '2';
    await user.keyboard('{Backspace}');
    await expect(cell(canvasElement, 2, 1), 'the model holds nothing, so Backspace steps back').toHaveFocus();
  }
};

// ── Smart complements ──────────────────────────────────────────────────

export const SmartToggle: StoryObj = {
  name: 'Smart: one compact word on the band, and switching it off fills nothing',
  render: card(),
  play: async ({ canvasElement }) => {
    const smart = one<HTMLButtonElement>(canvasElement, SMART);
    // CA, 2026-09-27: *"Just (Smart) maybe, something compact that toggles."*
    await expect(smart.tagName).toBe('BUTTON');
    await expect(smart.textContent?.trim()).toBe('Smart');
    await expect(smart.textContent).not.toMatch(/6-4|type 6|→/);
    await expect(smart.getAttribute(ARIA_LABEL)).toMatch(/fill the opposing score/i);
    await expect(smart.title).toMatch(/fill the opposing score/i);
    await expect(smart.closest(BAND)).toBeTruthy();
    await expect(smart).toBeVisible();
    // The region contributes no block of its own, so there is no spare row.
    await expect(one(canvasElement, '.chc-sec-score-region').children).toHaveLength(0);
    await expect(smart.getAttribute(ARIA_PRESSED)).toBe('true');

    await user.click(smart);
    await expect(one(canvasElement, SMART).getAttribute(ARIA_PRESSED)).toBe('false');
    await typeIn(canvasElement, 1, 1, '[Digit4]');
    await expect(cell(canvasElement, 2, 1)).toHaveValue('');
  }
};

export const SmartFillsTheOpposingCell: StoryObj = {
  name: 'Smart: starts off when asked; switched on, a 4 fills the 6 opposite',
  render: card({ smartComplements: false }),
  play: async ({ canvasElement }) => {
    await expect(one(canvasElement, SMART).getAttribute(ARIA_PRESSED)).toBe('false');
    await typeIn(canvasElement, 1, 1, '[Digit4]');
    await expect(cell(canvasElement, 2, 1)).toHaveValue('');

    await user.click(one(canvasElement, SMART));
    await expect(one(canvasElement, SMART).getAttribute(ARIA_PRESSED)).toBe('true');
    await typeIn(canvasElement, 1, 1, '{Backspace}[Digit4]');
    await expect(cell(canvasElement, 2, 1)?.value ?? done(canvasElement, 2, 1).textContent).toBe('6');
    await expect(band(canvasElement).textContent).toContain('4-6');
  }
};

export const FaultShowsFirstAndSmartStays: StoryObj = {
  name: 'Integrity: the fault leads the band, Smart stays reachable, Submit stays shut under an ending',
  render: card({ sets: [{ setNumber: 1, side1Score: 3, side2Score: 7, winningSide: 2 }] }),
  play: async ({ canvasElement }) => {
    await expect(band(canvasElement).dataset.tone).toBe('warn');
    await expect(band(canvasElement).textContent).toMatch(/1st set:.*must be at least 5/);
    await expect(one(canvasElement, SMART), 'the toggle must survive the error band').toBeVisible();
    await expect(submit(canvasElement)).toBeDisabled();

    // An impossible score stays impossible however it is labelled.
    await user.click(one(canvasElement, `.chc-sec-endings > button[data-ending="${SUSPENDED}"]`));
    await expect(submit(canvasElement)).toBeDisabled();
  }
};

// ── A saved score, and the endings ─────────────────────────────────────

export const SeededScore: StoryObj = {
  name: 'Saved: a recorded score reopens in the grid, a genuine 0 included',
  render: card({
    sets: [
      { setNumber: 1, side1Score: 6, side2Score: 4, winningSide: 1 },
      { setNumber: 2, side1Score: 6, side2Score: 0, winningSide: 1 }
    ]
  }),
  play: async ({ canvasElement }) => {
    await expect([1, 2].map((set) => [cell(canvasElement, 1, set)?.value, cell(canvasElement, 2, set)?.value])).toEqual(
      [
        ['6', '4'],
        ['6', '0']
      ]
    );
    await expect(done(canvasElement, 2, 2).textContent).toBe('0');
    await expect(done(canvasElement, 2, 2)).toBeVisible();
    // No third column: the match is decided.
    await expect(cell(canvasElement, 1, 3)).toBeNull();
    await expect(submit(canvasElement)).toBeEnabled();
    await expect(band(canvasElement).textContent).toContain('Rosalind Lem def. Derrick Ellul 6-4 6-0');
  }
};

export const WalkoverOverAPartScore: StoryObj = {
  name: 'Endings: a walkover submits over a part-score, and records none',
  render: card({ sets: [{ setNumber: 1, side1Score: 6, side2Score: 4 }] }),
  play: async ({ canvasElement }) => {
    await user.click(one(canvasElement, 'button[data-action="endedEarly"][data-side="2"]'));
    await user.click(one(canvasElement, `[data-panel-side="2"] button[data-ending="${WALKOVER}"]`));
    await expect(submit(canvasElement)).toBeEnabled();
    await expect(band(canvasElement).textContent).toContain(LEM_ADVANCES);
    await expect(band(canvasElement).textContent).toContain('no score recorded');
  }
};

export const CancelledQuotesThePartScore: StoryObj = {
  name: 'Endings: Cancelled quotes the part-score it clears',
  render: card({
    sets: [
      { setNumber: 1, side1Score: 6, side2Score: 4 },
      { setNumber: 2, side1Score: 2, side2Score: 1 }
    ]
  }),
  play: async ({ canvasElement }) => {
    await user.click(one(canvasElement, 'button[data-action="other"]'));
    await user.click(one(canvasElement, `.chc-sec-other-menu button[data-ending="${CANCELLED}"]`));
    await expect(band(canvasElement).dataset.tone).toBe('warn');
    await expect(band(canvasElement).textContent).toContain('6-4 2-1');
    await expect(band(canvasElement).textContent).toMatch(/cleared/i);
  }
};

export const SuspendedKeepsTheScore: StoryObj = {
  name: 'Endings: Suspended keeps the part-score, and the values survive the re-render',
  render: card({ sets: [{ setNumber: 1, side1Score: 6, side2Score: 4 }] }),
  play: async ({ canvasElement }) => {
    const suspended = () => one(canvasElement, `.chc-sec-endings > button[data-ending="${SUSPENDED}"]`);
    await user.click(suspended());
    await expect(band(canvasElement).textContent).toContain('6-4');
    await expect(band(canvasElement).textContent).toMatch(/recorded/i);

    await user.click(suspended());
    await expect(cell(canvasElement, 1, 1)?.value).toBe('6');
    await expect(cell(canvasElement, 2, 1)?.value).toBe('4');
    await expect(band(canvasElement).textContent).toContain('6-4');
  }
};

// ── The tiebreak column ────────────────────────────────────────────────

export const TiebreakColumnAppears: StoryObj = {
  name: 'Tiebreak: a 7-6 opens a column per side, named as points, beside the 2nd set',
  render: card({ sets: SEVEN_SIX }),
  play: async ({ canvasElement }) => {
    await expect(heads(canvasElement)).toEqual(['1st', 'TB', '2nd']);
    await expect(tbField(canvasElement, 1, 1)).toBeVisible();
    await expect(tbField(canvasElement, 2, 1)).toBeVisible();
    await expect(tb(canvasElement, 1, 1)?.getAttribute(ARIA_LABEL)).toBe('1st set tiebreak, side 1 points');
    await expect(tb(canvasElement, 2, 1)?.getAttribute(ARIA_LABEL)).toBe('1st set tiebreak, side 2 points');
    await expect(submit(canvasElement)).toBeDisabled();
  }
};

export const EnterInAnEmptyTiebreakMovesOn: StoryObj = {
  name: 'Tiebreak: Enter in the empty column moves on to the next set',
  render: card({ sets: SEVEN_SIX }),
  play: async ({ canvasElement }) => {
    await user.click(tbField(canvasElement, 2, 1));
    await user.keyboard('{Enter}');
    await expect((document.activeElement as HTMLElement | null)?.dataset.set).toBe('2');
    // the column stays: the points can still be typed, and the band will say they were left out
    await expect(tb(canvasElement, 1, 1)).toBeTruthy();
  }
};

export const TiebreakFoldsAndReturns: StoryObj = {
  name: 'Tiebreak: the points raise on the loser, fold away on leaving, and come back on return',
  render: card({ sets: SEVEN_SIX }),
  play: async ({ canvasElement }) => {
    await user.click(tbField(canvasElement, 2, 1));
    await user.keyboard('[Digit3]');
    await expect(tb(canvasElement, 1, 1)).toHaveValue('7');

    // Raised beside the LOSER's games while the set is being edited, nothing beside the winner's.
    const markOn = (side: number) => one(gamesCell(canvasElement, side), 'sup');
    await expect(markOn(2).textContent).toBe('3');
    await expect(markOn(2)).toBeVisible();
    await expect(markOn(2).getAttribute('aria-hidden')).toBe('true');
    await expect(markOn(1).textContent).toBe('');
    // and said in words, since a raised digit reads as a bare number
    const spoken = (side: number) => one(gamesCell(canvasElement, side), '.chc-sec-sr-only');
    await expect(spoken(2).textContent).toMatch(/tiebreak 3/);
    await expect(spoken(1).textContent).toBe('');

    // Leaving for the second set folds the column away, and set 1 stands as its result.
    await user.click(field(canvasElement, 2, 2));
    await expect(tb(canvasElement, 1, 1), 'the tiebreak column should be gone').toBeNull();
    await expect(heads(canvasElement)).toEqual(['1st', '2nd']);
    await expect(done(canvasElement, 2, 1)).toBeVisible();
    await expect(done(canvasElement, 2, 1).textContent).toBe('63');

    // Clicking the result is the way back in: set 1, TB and set 2 together.
    await user.click(done(canvasElement, 1, 1));
    await expect(heads(canvasElement)).toEqual(['1st', 'TB', '2nd']);
    await expect(tb(canvasElement, 1, 1)).toHaveValue('7');
    await expect(tb(canvasElement, 2, 1)).toHaveValue('3');
  }
};

export const TiebreakReopensFromTheKeyboard: StoryObj = {
  name: 'Tiebreak: Shift+Tab back into a folded set reopens its column',
  render: card({ sets: SEVEN_SIX_THREE }),
  play: async ({ canvasElement }) => {
    await expect(tb(canvasElement, 1, 1)).toBeNull();
    await user.click(field(canvasElement, 2, 2));
    await user.keyboard('{Shift>}{Tab}{/Shift}');

    await expect(tb(canvasElement, 1, 1), 'the keyboard gets the same affordance as a click').toBeTruthy();
    await expect(cell(canvasElement, 1, 1)).toHaveFocus();
  }
};

export const NoTiebreakToReopen: StoryObj = {
  name: 'Tiebreak: returning to a 6-4 opens no column it never had',
  render: card({ sets: [{ setNumber: 1, side1Score: 6, side2Score: 4 }] }),
  play: async ({ canvasElement }) => {
    await user.click(done(canvasElement, 1, 1));
    await expect(cell(canvasElement, 1, 1)).toHaveFocus();
    await expect(tb(canvasElement, 1, 1)).toBeNull();
  }
};

export const TwoDigitTiebreakMark: StoryObj = {
  name: 'Tiebreak: a two-digit TB10 completes to 10 and raises its 8',
  render: card({ matchUpFormat: 'SET3-S:6/TB10', sets: [{ setNumber: 1, side1Score: 6, side2Score: 7 }] }),
  play: async ({ canvasElement }) => {
    await user.click(tbField(canvasElement, 1, 1));
    await user.keyboard('[Digit8]');
    await expect(tb(canvasElement, 2, 1)).toHaveValue('10');
    const mark = one(gamesCell(canvasElement, 1), 'sup');
    await expect(mark.textContent).toBe('8');
    await expect(mark).toBeVisible();
  }
};

function multiDigit(side: 1 | 2): StoryObj {
  return {
    name: `Tiebreak: side ${side} types a 10 one digit at a time, and Enter folds it`,
    render: card({
      sets: [{ setNumber: 1, side1Score: side === 1 ? 6 : 7, side2Score: side === 1 ? 7 : 6 }]
    }),
    play: async ({ canvasElement }) => {
      await user.click(tbField(canvasElement, side, 1));
      await user.keyboard('[Digit1]');
      await expect(tb(canvasElement, side, 1), 'focus stays in the tiebreak after the 1').toHaveFocus();
      await user.keyboard('[Digit0]');
      await expect(tb(canvasElement, side, 1)).toHaveValue('10');
      await expect(tb(canvasElement, side === 1 ? 2 : 1, 1)).toHaveValue('12');

      await user.keyboard('{Enter}');
      await expect(tb(canvasElement, side, 1)).toBeNull();
      await expect(cell(canvasElement, 2, 2)).toHaveFocus();
    }
  };
}
export const MultiDigitTiebreakSide1 = multiDigit(1);
export const MultiDigitTiebreakSide2 = multiDigit(2);

// ── A finished set shows its result (notes 11/12) ──────────────────────

export const FoldsWhenTiebreakIsConfirmed: StoryObj = {
  name: 'Folded: 7 above 6 with a raised 3, fields hidden, once the tiebreak is confirmed',
  render: card({ smartComplements: false }),
  play: async ({ canvasElement }) => {
    await typeIn(canvasElement, 1, 1, '[Digit7]');
    await typeIn(canvasElement, 2, 1, '[Digit6]');
    await user.click(tbField(canvasElement, 1, 1));
    await user.keyboard('[Digit7]');
    // Mid-tiebreak the set is still the operator's: fields showing, nothing folded.
    await expect(done(canvasElement, 1, 1)).not.toBeVisible();
    await expect(cell(canvasElement, 1, 1)).toBeVisible();

    await user.click(tbField(canvasElement, 2, 1));
    await user.keyboard('[Digit3]{Enter}');

    await expect(done(canvasElement, 1, 1).textContent).toBe('7');
    await expect(done(canvasElement, 2, 1).textContent, 'the games with the raised points').toBe('63');
    await expect(one(done(canvasElement, 2, 1), 'sup').textContent).toBe('3');
    await expect(done(canvasElement, 1, 1).querySelector('sup'), 'nothing raised beside the winner').toBeNull();
    await expect(done(canvasElement, 1, 1)).toBeVisible();
    await expect(done(canvasElement, 2, 1)).toBeVisible();
    // `hidden` alone proves nothing: the field must actually be gone from the page.
    for (const side of [1, 2]) {
      const games = field(canvasElement, side, 1);
      await expect(games).not.toBeVisible();
      await expect(games.checkVisibility()).toBe(false);
    }
    await expect(done(canvasElement, 2, 1).getAttribute(ARIA_LABEL)).toContain('tiebreak 3');
  }
};

export const OpensFolded: StoryObj = {
  name: 'Folded: a saved score opens folded, with the set in progress open',
  render: card({ sets: [...SEVEN_SIX_THREE, { setNumber: 2, side1Score: 2, side2Score: 1 }] }),
  play: async ({ canvasElement }) => {
    await expect(done(canvasElement, 2, 1).textContent).toBe('63');
    await expect(done(canvasElement, 2, 1)).toBeVisible();
    await expect(done(canvasElement, 1, 2), 'an unfinished set keeps its fields').not.toBeVisible();
    await expect(cell(canvasElement, 1, 2)).toBeVisible();
    await expect(cell(canvasElement, 1, 2)!.checkVisibility()).toBe(true);
  }
};

export const ClickTheResultToReopen: StoryObj = {
  name: 'Folded: clicking the result is the way back in',
  render: card({ sets: SEVEN_SIX_THREE }),
  play: async ({ canvasElement }) => {
    await expect(done(canvasElement, 2, 1)).toBeVisible();
    await user.click(done(canvasElement, 2, 1));

    await expect(done(canvasElement, 2, 1), 'folded no more').not.toBeVisible();
    await expect(cell(canvasElement, 2, 1)).toBeVisible();
    await expect(cell(canvasElement, 2, 1)).toHaveValue('6');
    await expect(cell(canvasElement, 2, 1)).toHaveFocus();
    await expect(tb(canvasElement, 1, 1), 'and its tiebreak column is back for correction').toBeTruthy();
  }
};

export const NeverFoldsTheSetUnderEdit: StoryObj = {
  name: 'Folded: never the set under edit, so a timed bolt takes its second digit',
  render: card({ matchUpFormat: 'SET3X-S:T10' }),
  play: async ({ canvasElement }) => {
    await typeIn(canvasElement, 2, 1, digits('21'));
    await typeIn(canvasElement, 1, 1, '[Digit2]');
    // 2-21 is a finished bolt by the format's lights; it is also the one being typed into.
    await expect(done(canvasElement, 1, 1)).not.toBeVisible();

    await user.keyboard('[Digit2]');
    await expect(cell(canvasElement, 1, 1)).toHaveValue('22');
    await expect(cell(canvasElement, 1, 1)).toBeVisible();
  }
};

export const PlainSetFoldsToItsGames: StoryObj = {
  name: 'Folded: a set with no tiebreak folds to its games alone',
  render: card({ smartComplements: false }),
  play: async ({ canvasElement }) => {
    await typeIn(canvasElement, 1, 1, '[Digit6]');
    await typeIn(canvasElement, 2, 1, '[Digit4]');
    await typeIn(canvasElement, 2, 2, '[Digit1]');

    await expect(done(canvasElement, 1, 1).textContent).toBe('6');
    await expect(done(canvasElement, 2, 1).textContent).toBe('4');
    await expect(done(canvasElement, 2, 1).querySelector('sup')).toBeNull();
    await expect(done(canvasElement, 2, 1)).toBeVisible();
  }
};

export const ClearedSetKeepsTheNextOnScreen: StoryObj = {
  name: 'Folded: clearing set 1 of 6-2 6-2 leaves set 2 on screen with its score (note 9)',
  render: card({
    smartComplements: false,
    sets: [
      { setNumber: 1, side1Score: 6, side2Score: 2 },
      { setNumber: 2, side1Score: 6, side2Score: 2 }
    ]
  }),
  play: async ({ canvasElement }) => {
    await expect(band(canvasElement).textContent).toContain('Rosalind Lem def.');
    await user.click(done(canvasElement, 1, 1));
    await user.clear(field(canvasElement, 1, 1));
    await user.clear(field(canvasElement, 2, 1));

    await expect(done(canvasElement, 1, 2)).toBeVisible();
    await expect(done(canvasElement, 1, 2).textContent).toBe('6');
    await expect(done(canvasElement, 2, 2).textContent).toBe('2');
    await expect(band(canvasElement).textContent).toContain('1st set: has no score');
    await expect(band(canvasElement).textContent).not.toContain('def.');
    await expect(submit(canvasElement)).toBeDisabled();
  }
};

// ── Timed bolts: Enter, not a digit, moves on ──────────────────────────

/**
 * CA, 2026-09-28: *"when I'm in a timed format the enter key in an entry cell should advance to the next
 * 'set/bolt', not a numeric key"*. Real keystrokes, so the browser inserts the text — the unit suite had
 * to emulate that insertion by hand.
 */
export const TwentyTwoTwentyOne: StoryObj = {
  name: 'Timed: 22/21 typed straight through; the caret stays at the end when bolt 2 appears',
  render: card({ matchUpFormat: NINE_BOLTS }),
  play: async ({ canvasElement }) => {
    await typeIn(canvasElement, 2, 1, digits('21'));
    await expect(cell(canvasElement, 1, 2), 'bolt 2 is not revealed yet').toBeNull();

    await typeIn(canvasElement, 1, 1, '[Digit2]');
    await expect(cell(canvasElement, 1, 2), 'bolt 2 revealed, so the grid did change').toBeTruthy();
    const live = field(canvasElement, 1, 1);
    await expect(live, 'the operator is still in the cell they were typing in').toHaveFocus();
    await expect(live.selectionStart).toBe(live.value.length);
    await expect(live.selectionEnd).toBe(live.value.length);

    await user.keyboard('[Digit2]');
    await expect(cell(canvasElement, 2, 1)).toHaveValue('21');
    await expect(cell(canvasElement, 1, 1)).toHaveValue('22');
    // a DIGIT does not move on
    await expect(cell(canvasElement, 1, 1)).toHaveFocus();
  }
};

export const EnterMovesToTheNextBolt: StoryObj = {
  name: 'Timed: Enter moves to the next bolt, on its lower row, and does not submit',
  args: { onSubmit: fn() },
  render: (args) => regionCard('dynamicSets', { matchUpFormat: NINE_BOLTS, onSubmit: args.onSubmit }),
  play: async ({ canvasElement, args }) => {
    await typeIn(canvasElement, 2, 1, digits('21'));
    await typeIn(canvasElement, 1, 1, digits('22'));
    await user.keyboard('{Enter}');

    await expect(cell(canvasElement, 2, 2)).toHaveFocus();
    await expect(args.onSubmit).not.toHaveBeenCalled();
  }
};

export const EnterSubmitsTheLastBolt: StoryObj = {
  name: 'Timed: Enter submits on the last bolt, where there is nowhere to go',
  args: { onSubmit: fn() },
  render: (args) => regionCard('dynamicSets', { matchUpFormat: 'SET1-S:T10', onSubmit: args.onSubmit }),
  play: async ({ canvasElement, args }) => {
    await typeIn(canvasElement, 2, 1, digits('21'));
    await typeIn(canvasElement, 1, 1, digits('22'));
    await user.keyboard('{Enter}');
    await waitFor(() => expect(args.onSubmit).toHaveBeenCalledTimes(1));
  }
};

export const EnterSubmitsAGamesFormat: StoryObj = {
  name: 'Timed: Enter still submits in a GAMES format',
  args: { onSubmit: fn() },
  render: (args) =>
    regionCard('dynamicSets', {
      onSubmit: args.onSubmit,
      sets: [
        { setNumber: 1, side1Score: 6, side2Score: 4, winningSide: 1 },
        { setNumber: 2, side1Score: 6, side2Score: 3, winningSide: 1 }
      ]
    }),
  play: async ({ canvasElement, args }) => {
    await user.click(done(canvasElement, 2, 1));
    await expect(cell(canvasElement, 2, 1)).toHaveFocus();
    await user.keyboard('{Enter}');
    await waitFor(() => expect(args.onSubmit).toHaveBeenCalledTimes(1));
  }
};

export const EnterOnAHalfBolt: StoryObj = {
  name: 'Timed: Enter does nothing while the bolt is half entered',
  render: card({ matchUpFormat: NINE_BOLTS }),
  play: async ({ canvasElement }) => {
    await typeIn(canvasElement, 2, 1, `${digits('21')}{Enter}`);
    await expect(cell(canvasElement, 1, 2)).toBeNull();
    await expect(cell(canvasElement, 2, 1)).toHaveFocus();
  }
};

const WON_FIVE = Array.from({ length: 5 }, (_unused, index) => ({
  setNumber: index + 1,
  side1Score: 22,
  side2Score: 21,
  winningSide: 1
}));

export const EnterIntoTheSixthBolt: StoryObj = {
  name: 'Timed: five bolts won still leaves four to play, and Enter goes to the sixth',
  render: card({ matchUpFormat: NINE_BOLTS, sets: WON_FIVE }),
  play: async ({ canvasElement }) => {
    await expect(cell(canvasElement, 2, 6)).toBeVisible();
    await user.click(done(canvasElement, 1, 5));
    await user.keyboard('{Enter}');
    await expect(cell(canvasElement, 2, 6)).toHaveFocus();
  }
};

export const DrawnBoltMovesOn: StoryObj = {
  name: 'Timed: a drawn bolt reveals the next, and Enter moves into it',
  render: card({ matchUpFormat: NINE_BOLTS }),
  play: async ({ canvasElement }) => {
    await typeIn(canvasElement, 2, 1, digits('21'));
    await typeIn(canvasElement, 1, 1, digits('21'));
    await expect(cell(canvasElement, 1, 2)).toBeVisible();
    await expect(cell(canvasElement, 2, 2)).toBeVisible();
    await user.keyboard('{Enter}');
    await expect(cell(canvasElement, 2, 2)).toHaveFocus();
  }
};

export const NineBoltsTypedThrough: StoryObj = {
  name: 'Timed: nine bolts typed one by one open Submit at the ninth, not before',
  render: card({ matchUpFormat: NINE_BOLTS }),
  play: async ({ canvasElement }) => {
    // Alternating winners, so after eight the match stands 4-4 and only the ninth settles it. Each bolt:
    // the lower row, Tab to the upper, then Enter on to the next — the path an operator takes.
    await user.click(field(canvasElement, 2, 1));
    for (let bolt = 1; bolt <= 9; bolt += 1) {
      const side1Wins = bolt % 2 === 1;
      await user.keyboard(`${digits(side1Wins ? '21' : '22')}{Tab}${digits(side1Wins ? '22' : '21')}`);
      if (bolt === 8) {
        await expect(cell(canvasElement, 1, 9), 'the ninth bolt has been revealed').toBeTruthy();
        await expect(submit(canvasElement), 'level at four bolts each').toBeDisabled();
      }
      if (bolt < 9) await user.keyboard('{Enter}');
    }

    await expect(cell(canvasElement, 1, 9)).toHaveValue('22');
    await expect(cell(canvasElement, 2, 9)).toHaveValue('21');
    await expect(submit(canvasElement), 'all nine bolts in').toBeEnabled();
  }
};
