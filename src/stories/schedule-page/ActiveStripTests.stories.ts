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
 *
 * The pure `hasPending` flag is covered in `__tests__/activeStrip.test.ts`. These
 * play functions are the rendering-side counterpart.
 *
 * Run interactively: `pnpm storybook`
 * Run as tests:      `pnpm test:stories` (Storybook's Vitest integration, headless Chromium)
 */

import { buildActiveStripPanel } from '../../components/schedule-page/ui/activeStrip';
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
