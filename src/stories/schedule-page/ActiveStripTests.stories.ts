/**
 * Schedule Page — Active Strip play-function tests.
 *
 * Two quiet signals on the "Now" strip:
 *
 *   1. The leading spacer shows `(n)` beneath its label: how many strip cells hold a
 *      matchUp, live or not — in progress, suspended, due and next all count (CA,
 *      2026-10-27). A free court does not.
 *   2. A free court whose column still holds an un-called pending matchUp shows a
 *      faint centred clock — the slot will fill when the next one is called.
 *   3. A court block in force paints a banner whose type, time window and detail
 *      sit on separate lines — the end time is never lost to an ellipsis, and a
 *      detail that only repeats the type is dropped (CA, 2026-11-07).
 *
 * The pure `hasPending` flag is covered in `__tests__/activeStrip.test.ts`. These
 * play functions are the rendering-side counterpart.
 *
 * Run interactively: `pnpm storybook`
 * Run as tests:      `pnpm test:stories` (Storybook's Vitest integration, headless Chromium)
 */

import { buildActiveStripPanel } from '../../components/schedule-page/ui/activeStrip';
// The strip's own stylesheet: without it the geometry assertions below measure unstyled inline spans.
import '../../components/schedule-page/ui/styles';
import type { Meta, StoryObj } from '@storybook/html-vite';
import { expect } from 'storybook/test';

// constants and types
import type { ActiveStripPanelData } from '../../components/schedule-page/ui/activeStrip';

const meta: Meta = {
  title: 'Scheduling/Schedule Page/Tests/Active Strip',
  // A play-function test: hidden from the sidebar, still run by `pnpm test:stories`.
  tags: ['!dev']
};
export default meta;

const SPACER_COUNT = '.spl-active-strip-spacer-count';
const BLOCK_LABEL = '.spl-active-strip-block-label';
const BLOCK_TIME = '.spl-active-strip-block-time';
const BLOCK_DETAIL = '.spl-active-strip-block-detail';
const PENDING_ICON = '.spl-active-strip-pending';
const CELL = '.spl-active-strip-cell';
const CALLED = '2026-10-24T12:00:00.000Z';

const matchUp = (matchUpId: string, over: Record<string, unknown> = {}) => ({ matchUpId, participantIds: [], ...over });

// C1 live, C2 live, C3 suspended, C4 called (NEXT), C5 idle with a queued match, C6 idle and empty.
const DATA: ActiveStripPanelData = {
  grid: {
    columns: [
      { courtId: 'C1', cells: [matchUp('M1', { matchUpStatus: 'IN_PROGRESS' })] },
      { courtId: 'C2', cells: [matchUp('M2', { hasScore: true })] },
      { courtId: 'C3', cells: [matchUp('M3', { matchUpStatus: 'SUSPENDED' })] },
      { courtId: 'C4', cells: [matchUp('M4', { matchUpStatus: 'TO_BE_PLAYED', calledAt: CALLED })] },
      {
        courtId: 'C5',
        cells: [matchUp('M5', { matchUpStatus: 'COMPLETED', winningSide: 1 }), null, matchUp('M6')]
      },
      { courtId: 'C6', cells: [matchUp('M7', { matchUpStatus: 'COMPLETED', winningSide: 2 })] }
    ]
  },
  gridTemplateColumns: '48px repeat(6, 140px)'
};

function renderStrip(data: ActiveStripPanelData, spacerLabel?: string): HTMLElement {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'padding: 16px;';
  const strip = buildActiveStripPanel({}, { spacerLabel, cellHeight: '56px' });
  strip.setData(data);
  wrap.appendChild(strip.element);
  return wrap;
}

const cellFor = (root: HTMLElement, courtId: string) =>
  root.querySelector<HTMLElement>(`${CELL}[data-court-id="${courtId}"]`);

export const LiveCountBeneathNow: StoryObj = {
  name: 'Now spacer counts the courts with a matchUp, live or not',
  render: () => renderStrip(DATA, 'Now'),
  play: async ({ canvasElement }) => {
    const count = canvasElement.querySelector(SPACER_COUNT);
    // C1 and C2 (live), C3 (suspended), C4 (called, NEXT) — not C5 or C6, which are free.
    expect(count?.textContent).toBe('(4)');
    expect(count?.getAttribute('title')).toBe('4 courts with a matchUp');
    // the cells it counts are exactly the ones that are not free
    expect(canvasElement.querySelectorAll(`${CELL}:not(.state-free)`).length).toBe(4);
  }
};

export const NoCountWithoutLabel: StoryObj = {
  name: 'no count when the spacer carries no label',
  render: () => renderStrip(DATA),
  play: async ({ canvasElement }) => {
    expect(canvasElement.querySelector(SPACER_COUNT)).toBeNull();
  }
};

export const PendingMarkerOnIdleCourt: StoryObj = {
  name: 'idle court with a queued matchUp shows the pending clock',
  render: () => renderStrip(DATA, 'Now'),
  play: async ({ canvasElement }) => {
    // C5 is free, with an un-called pending matchUp below its completed one.
    expect(cellFor(canvasElement, 'C5')?.querySelector(PENDING_ICON)).toBeTruthy();
    // C6 is free with only history — nothing is coming, so no marker.
    expect(cellFor(canvasElement, 'C6')?.querySelector(PENDING_ICON)).toBeNull();
    // Occupied courts never carry it.
    for (const courtId of ['C1', 'C2', 'C3', 'C4']) {
      expect(cellFor(canvasElement, courtId)?.querySelector(PENDING_ICON)).toBeNull();
    }
  }
};

export const BlockBannerSupersedesPending: StoryObj = {
  name: 'a block in force replaces the pending clock',
  render: () => renderStrip({ ...DATA, courtBlocks: { C5: { type: 'MAINTENANCE', label: 'MAINTENANCE' } } }, 'Now'),
  play: async ({ canvasElement }) => {
    expect(cellFor(canvasElement, 'C5')?.querySelector(PENDING_ICON)).toBeNull();
  }
};

// TMX's court-column floor (MIN_COURT_WIDTH_FLOOR = 110). "BLOCKED 06:00–07:45" on one
// 11px line needs ~125px, so this is exactly the width at which the old banner lost its end time.
const NARROW = { ...DATA, gridTemplateColumns: '48px repeat(6, 110px)' };
// Below the floor: the window may break at the dash, but must never run past the cell.
const BELOW_FLOOR = { ...DATA, gridTemplateColumns: '48px repeat(6, 72px)' };
const WINDOW = '06:00–07:45';

export const BlockBannerTimeOnItsOwnLine: StoryObj = {
  name: 'block banner: type and time window on separate lines, redundant detail dropped',
  render: () =>
    renderStrip(
      {
        ...NARROW,
        courtBlocks: { C6: { type: 'BLOCKED', label: 'BLOCKED', timeRange: WINDOW, detail: 'BLOCKED' } }
      },
      'Now'
    ),
  play: async ({ canvasElement }) => {
    const cell = cellFor(canvasElement, 'C6');
    const label = cell?.querySelector<HTMLElement>(BLOCK_LABEL);
    const time = cell?.querySelector<HTMLElement>(BLOCK_TIME);
    expect(label?.textContent).toBe('BLOCKED');
    expect(time?.textContent).toBe(WINDOW);
    // a reason that merely repeats the type is not shown a second time
    expect(cell?.querySelector(BLOCK_DETAIL)).toBeNull();

    // The time window sits beneath the type, not beside it ...
    const labelBox = label!.getBoundingClientRect();
    const timeBox = time!.getBoundingClientRect();
    expect(timeBox.top).toBeGreaterThanOrEqual(labelBox.bottom - 1);
    // ... on a single line, with both of its ends inside the cell: nothing to ellipsize.
    expect(timeBox.height).toBeLessThan(labelBox.height * 2);
    const cellBox = cell!.getBoundingClientRect();
    expect(timeBox.left).toBeGreaterThanOrEqual(cellBox.left);
    expect(timeBox.right).toBeLessThanOrEqual(cellBox.right + 0.5);
    expect(time!.scrollWidth).toBeLessThanOrEqual(cell!.clientWidth);
  }
};

export const BlockBannerBelowColumnFloor: StoryObj = {
  name: 'block banner: narrower than the floor, the window breaks at the dash and stays inside the cell',
  render: () =>
    renderStrip(
      { ...BELOW_FLOOR, courtBlocks: { C6: { type: 'BLOCKED', label: 'BLOCKED', timeRange: WINDOW } } },
      'Now'
    ),
  play: async ({ canvasElement }) => {
    const cell = cellFor(canvasElement, 'C6');
    const time = cell?.querySelector<HTMLElement>(BLOCK_TIME);
    expect(time?.textContent).toBe(WINDOW);
    const cellBox = cell!.getBoundingClientRect();
    const timeBox = time!.getBoundingClientRect();
    expect(timeBox.right).toBeLessThanOrEqual(cellBox.right + 0.5);
    expect(time!.scrollWidth).toBeLessThanOrEqual(cell!.clientWidth);
  }
};

export const BlockBannerKeepsDistinctDetail: StoryObj = {
  name: 'block banner: a detail that says something new is kept',
  render: () =>
    renderStrip(
      {
        ...NARROW,
        courtBlocks: {
          C6: { type: 'MAINTENANCE', label: 'MAINTENANCE', timeRange: WINDOW, detail: 'Resurfacing' }
        }
      },
      'Now'
    ),
  play: async ({ canvasElement }) => {
    const cell = cellFor(canvasElement, 'C6');
    expect(cell?.querySelector(BLOCK_DETAIL)?.textContent).toBe('Resurfacing');
    expect(cell?.querySelector(BLOCK_TIME)?.textContent).toBe(WINDOW);
  }
};
