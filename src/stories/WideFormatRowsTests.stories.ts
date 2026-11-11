/**
 * Rows wide enough that the names cannot sit beside the scores — measured, at a real viewport size.
 *
 * CA, 2026-09-28: *"If I have 9 timed Bolts the width will make the entry columns collide with the
 * participant names; in such a case the upper participant name should float to a row above the cells
 * and the lower participant name should float/wrap to a row beneath the cells."* And 2026-10-08, a phone
 * screenshot: each row had collapsed to a name over ONE stretched input, the set headings hidden.
 *
 * The unit suite could only check DOM order, with `matchMedia` stubbed; the `grid-column: 1 / -1` that
 * makes a stacked name span the row was "in the stylesheet and not checkable". Here the page is resized
 * for real (`user.viewport`), the card is built at that size — the stack decision is read at render — and
 * the rendered boxes are measured.
 */
import { regionCard, one } from './helpers/scoreRegionCard';
import { user } from './helpers/trustedUser';
import { expect } from 'storybook/test';

import type { RegionCardParams } from './helpers/scoreRegionCard';
import type { Meta, StoryObj } from '@storybook/html-vite';

const meta: Meta = {
  title: 'Scoring/Score Entry/Tests/Wide Format Rows',
  tags: ['!dev']
};
export default meta;

const NINE_BOLTS = 'SET9X-S:T10';
const NINE_RECORDED = Array.from({ length: 9 }, (_unused, index) => ({
  setNumber: index + 1,
  side1Score: 22,
  side2Score: 21,
  winningSide: 1
}));
/** Five sets plus one tiebreak column: six, the most conventional tennis asks for. */
const FIVE_RECORDED = [
  { setNumber: 1, side1Score: 6, side2Score: 4, winningSide: 1 },
  { setNumber: 2, side1Score: 4, side2Score: 6, winningSide: 2 },
  { setNumber: 3, side1Score: 6, side2Score: 3, winningSide: 1 },
  { setNumber: 4, side1Score: 3, side2Score: 6, winningSide: 2 },
  { setNumber: 5, side1Score: 7, side2Score: 6, side1TiebreakScore: 7, side2TiebreakScore: 3, winningSide: 1 }
];

const DESKTOP = { width: 1280, height: 900 };
const PHONE = { width: 390, height: 844 };

/** Resize the page, build the card at that size, run the checks, and give the page its size back. */
async function atViewport(
  canvasElement: HTMLElement,
  size: { width: number; height: number },
  params: RegionCardParams,
  check: (root: HTMLElement) => Promise<void>
): Promise<void> {
  const before = { width: window.innerWidth, height: window.innerHeight };
  await user.viewport(size.width, size.height);
  try {
    await expect(window.innerWidth).toBe(size.width);
    canvasElement.replaceChildren(regionCard('dynamicSets', params));
    await check(canvasElement);
  } finally {
    await user.viewport(before.width, before.height);
  }
}

const row = (root: HTMLElement, side: number) => one(root, `.chc-sec-row[data-side="${side}"]`);
const name = (root: HTMLElement, side: number) => one(row(root, side), '.chc-sec-participant');
const scoreCells = (root: HTMLElement, side: number) => [
  ...row(root, side).querySelectorAll<HTMLElement>('.chc-sec-games-cell')
];
const rect = (element: Element) => element.getBoundingClientRect();

/** The name spans the whole row (`grid-column: 1 / -1`) and sits wholly above, or wholly below, its cells. */
async function expectStacked(root: HTMLElement): Promise<void> {
  for (const side of [1, 2]) {
    const named = rect(name(root, side));
    const box = rect(row(root, side));
    const padding = getComputedStyle(row(root, side));
    const inner = box.width - parseFloat(padding.paddingLeft) - parseFloat(padding.paddingRight);
    await expect(row(root, side).dataset.stacked).toBe('true');
    await expect(Math.abs(named.width - inner), `side ${side}'s name does not span the row`).toBeLessThan(1);
    await expect(name(root, side)).toBeVisible();
    // No name track before the cells: the columns start at the row's own left edge.
    const firstCell = rect(scoreCells(root, side)[0]);
    await expect(firstCell.left - box.left - parseFloat(padding.paddingLeft), 'a name track survived').toBeLessThan(12);
  }
  const cellsTop = (side: number) => Math.min(...scoreCells(root, side).map((cell) => rect(cell).top));
  const cellsBottom = (side: number) => Math.max(...scoreCells(root, side).map((cell) => rect(cell).bottom));
  await expect(rect(name(root, 1)).bottom, 'the upper name sits ABOVE its cells').toBeLessThanOrEqual(cellsTop(1));
  await expect(rect(name(root, 2)).top, 'the lower name sits BENEATH its cells').toBeGreaterThanOrEqual(cellsBottom(2));
  // No PLAYER heading over a score column; one heading per column, each over its cells.
  const head = one(root, '.chc-sec-row-head');
  await expect(head.textContent).not.toContain('PLAYER');
  const headings = [...head.querySelectorAll('.chc-sec-col-head')];
  await expect(headings).toHaveLength(scoreCells(root, 1).length);
  for (const [index, heading] of headings.entries()) {
    const centre = (element: Element) => rect(element).left + rect(element).width / 2;
    await expect(Math.abs(centre(heading) - centre(scoreCells(root, 1)[index]))).toBeLessThan(1.5);
  }
}

/** The name sits on the same line as the cells, to their left, in a track of its own. */
async function expectInline(root: HTMLElement): Promise<void> {
  for (const side of [1, 2]) {
    await expect(row(root, side).dataset.stacked).toBe('false');
    const named = rect(name(root, side));
    const first = rect(scoreCells(root, side)[0]);
    await expect(named.right, `side ${side}'s name is not beside its cells`).toBeLessThanOrEqual(first.left);
    await expect(named.top).toBeLessThan(first.bottom);
    await expect(named.bottom).toBeGreaterThan(first.top);
  }
}

export const NineBoltsStack: StoryObj = {
  name: 'Nine bolts: the upper name floats above, the lower beneath, each spanning the row',
  render: () => document.createElement('div'),
  play: async ({ canvasElement }) =>
    atViewport(canvasElement, DESKTOP, { matchUpFormat: NINE_BOLTS, sets: NINE_RECORDED, width: 980 }, async (root) => {
      await expect(scoreCells(root, 1), 'all nine columns are on screen').toHaveLength(9);
      await expectStacked(root);
      await expect(row(root, 1).textContent).toContain('Rosalind Lem');
      await expect(row(root, 2).textContent).toContain('Derrick Ellul');
    })
};

export const BestOfThreeStaysInline: StoryObj = {
  name: 'An empty best-of-three stays inline on a wide screen',
  render: () => document.createElement('div'),
  play: async ({ canvasElement }) =>
    atViewport(canvasElement, DESKTOP, {}, async (root) => {
      await expectInline(root);
    })
};

export const BestOfFiveStaysInline: StoryObj = {
  name: 'A completed best-of-five with its tiebreak column stays inline, under a PLAYER heading',
  render: () => document.createElement('div'),
  play: async ({ canvasElement }) =>
    atViewport(canvasElement, DESKTOP, { matchUpFormat: 'SET5-S:6/TB7', sets: FIVE_RECORDED }, async (root) => {
      await expectInline(root);
      await expect(one(root, '.chc-sec-row-head').textContent).toContain('PLAYER');
    })
};

export const PhoneStacksBestOfThree: StoryObj = {
  name: 'On a phone a best-of-three stacks, keeping its set headings and column widths',
  render: () => document.createElement('div'),
  play: async ({ canvasElement }) =>
    atViewport(canvasElement, PHONE, { sets: [{ setNumber: 1, side1Score: 6, side2Score: 4 }] }, async (root) => {
      await expectStacked(root);
      // The defect CA reported: a cell stretched across the screen. Each keeps its column.
      for (const cell of scoreCells(root, 1)) await expect(rect(cell).width).toBeLessThan(80);
      await expect(scoreCells(root, 1)).toHaveLength(2);
    })
};
