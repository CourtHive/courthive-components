/**
 * Schedule Page — MatchUp Card play-function tests.
 *
 * Covers the two priority-hint signals on the catalog cards that landed
 * in commit `60ef41d` ("feat(catalog): round-emphasis tiers + non-MAIN
 * stage chip on cards") and the `prominentTime` option used by the
 * Scheduled-tab panel in the TMX schedule grid sidebar.
 *
 * The pure data path (`computeBaseRoundByEvent` → `roundOffset`
 * computation) is covered by 7 unit cases in
 * `matchUpCatalogProjections.test.ts`. These play functions are the
 * rendering-side counterpart: given a `roundOffset` (or a `stage`, or
 * the `prominentTime` flag), does `buildMatchUpCard` paint the right
 * classes / nodes onto the DOM tree?
 *
 * Run interactively: `pnpm storybook`
 * Run as tests:      `pnpm storybook` (one terminal) +
 *                    `pnpm test-storybook` (other)
 */

import type { Meta, StoryObj } from '@storybook/html-vite';
import { expect } from 'storybook/test';
import type { CatalogMatchUpItem } from '../../components/schedule-page';
import { buildMatchUpCard } from '../../components/schedule-page/ui/matchUpCard';

const meta: Meta = {
  title: 'Schedule Page/Tests/MatchUpCard'
};
export default meta;

// ── Selectors / class names referenced across the suite ──

const TITLE_SELECTOR = '[class^="spl-card-title"], [class*=" spl-card-title"]';
const STAGE_CHIP_SELECTOR = '.spl-card-chip.stage';
const TIME_HEADER_SELECTOR = '.spl-card-time-header';
const CLASS_ROUND_CURRENT = 'spl-card-title--round-current';
const CLASS_ROUND_NEXT = 'spl-card-title--round-next';
const CLASS_ROUND_LATER = 'spl-card-title--round-later';

// ── Test fixtures ──

function baseItem(overrides: Partial<CatalogMatchUpItem> = {}): CatalogMatchUpItem {
  return {
    matchUpId: 'mu-test',
    eventId: 'evt-1',
    eventName: 'Test Event',
    drawId: 'draw-1',
    structureId: 'struct-1',
    roundNumber: 1,
    roundName: 'Round 1',
    isScheduled: false,
    ...overrides
  };
}

function renderCard(overrides: Partial<CatalogMatchUpItem>, options: Parameters<typeof buildMatchUpCard>[2] = {}): HTMLElement {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'padding: 16px; background: var(--sp-bg, #1a1a1a); max-width: 320px;';
  const card = buildMatchUpCard(baseItem(overrides), {}, options);
  wrap.appendChild(card);
  return wrap;
}

// ── Round-emphasis class tier ──

export const RoundOffsetCurrent: StoryObj = {
  name: 'roundOffset 0 → round-current',
  render: () => renderCard({ roundNumber: 1 }, { roundOffset: 0 }),
  play: async ({ canvasElement }) => {
    const title = canvasElement.querySelector(TITLE_SELECTOR);
    expect(title?.classList.contains(CLASS_ROUND_CURRENT)).toBe(true);
    expect(title?.classList.contains(CLASS_ROUND_NEXT)).toBe(false);
    expect(title?.classList.contains(CLASS_ROUND_LATER)).toBe(false);
  }
};

export const RoundOffsetNext: StoryObj = {
  name: 'roundOffset 1 → round-next',
  render: () => renderCard({ roundNumber: 2, roundName: 'Round 2' }, { roundOffset: 1 }),
  play: async ({ canvasElement }) => {
    const title = canvasElement.querySelector(TITLE_SELECTOR);
    expect(title?.classList.contains(CLASS_ROUND_NEXT)).toBe(true);
    expect(title?.classList.contains(CLASS_ROUND_CURRENT)).toBe(false);
    expect(title?.classList.contains(CLASS_ROUND_LATER)).toBe(false);
  }
};

export const RoundOffsetLater: StoryObj = {
  name: 'roundOffset 2 → round-later',
  render: () => renderCard({ roundNumber: 3, roundName: 'Round 3' }, { roundOffset: 2 }),
  play: async ({ canvasElement }) => {
    const title = canvasElement.querySelector(TITLE_SELECTOR);
    expect(title?.classList.contains(CLASS_ROUND_LATER)).toBe(true);
    expect(title?.classList.contains(CLASS_ROUND_CURRENT)).toBe(false);
    expect(title?.classList.contains(CLASS_ROUND_NEXT)).toBe(false);
  }
};

export const RoundOffsetFarLater: StoryObj = {
  name: 'roundOffset 5 → round-later (anything >= 2 collapses to the muted tier)',
  render: () => renderCard({ roundNumber: 6, roundName: 'Round 6' }, { roundOffset: 5 }),
  play: async ({ canvasElement }) => {
    const title = canvasElement.querySelector(TITLE_SELECTOR);
    expect(title?.classList.contains(CLASS_ROUND_LATER)).toBe(true);
  }
};

export const RoundOffsetOmitted: StoryObj = {
  name: 'roundOffset omitted → no round tier class',
  render: () => renderCard({}, {}),
  play: async ({ canvasElement }) => {
    const title = canvasElement.querySelector(TITLE_SELECTOR);
    expect(title?.classList.contains(CLASS_ROUND_CURRENT)).toBe(false);
    expect(title?.classList.contains(CLASS_ROUND_NEXT)).toBe(false);
    expect(title?.classList.contains(CLASS_ROUND_LATER)).toBe(false);
  }
};

// ── Stage chip ──

export const StageNonMainRendersChip: StoryObj = {
  name: 'stage CONSOLATION → stage chip rendered with label',
  render: () => renderCard({ stage: 'CONSOLATION' }, {}),
  play: async ({ canvasElement }) => {
    const stageChip = canvasElement.querySelector(STAGE_CHIP_SELECTOR);
    expect(stageChip).not.toBeNull();
    expect(stageChip?.textContent).toBe('CONSOLATION');
  }
};

export const StageUnderscoresBecomeSpaces: StoryObj = {
  name: 'stage ROUND_ROBIN → chip text strips underscores',
  render: () => renderCard({ stage: 'ROUND_ROBIN' }, {}),
  play: async ({ canvasElement }) => {
    const stageChip = canvasElement.querySelector(STAGE_CHIP_SELECTOR);
    expect(stageChip).not.toBeNull();
    expect(stageChip?.textContent).toBe('ROUND ROBIN');
  }
};

export const StageMainOmitsChip: StoryObj = {
  name: 'stage MAIN → no stage chip (MAIN is the silent default)',
  render: () => renderCard({ stage: 'MAIN' }, {}),
  play: async ({ canvasElement }) => {
    const stageChip = canvasElement.querySelector(STAGE_CHIP_SELECTOR);
    expect(stageChip).toBeNull();
  }
};

export const StageUndefinedOmitsChip: StoryObj = {
  name: 'stage undefined → no stage chip',
  render: () => renderCard({}, {}),
  play: async ({ canvasElement }) => {
    const stageChip = canvasElement.querySelector(STAGE_CHIP_SELECTOR);
    expect(stageChip).toBeNull();
  }
};

// ── prominentTime ──

export const ProminentTimeRendersTimeHeader: StoryObj = {
  name: 'prominentTime + scheduledTime → with-time class + time-header span',
  render: () =>
    renderCard(
      { scheduledTime: '10:30', isScheduled: true },
      { prominentTime: true }
    ),
  play: async ({ canvasElement }) => {
    const title = canvasElement.querySelector(TITLE_SELECTOR);
    expect(title?.classList.contains('with-time')).toBe(true);
    const timeHeader = canvasElement.querySelector(TIME_HEADER_SELECTOR);
    expect(timeHeader).not.toBeNull();
    expect(timeHeader?.textContent).toBe('10:30');
  }
};

export const ProminentTimeSuppressesTimeChip: StoryObj = {
  name: 'prominentTime → standard time chip is NOT rendered',
  render: () =>
    renderCard(
      { scheduledTime: '10:30', isScheduled: true },
      { prominentTime: true }
    ),
  play: async ({ canvasElement }) => {
    // The non-prominent path puts the time in a `.spl-card-chip.time` chip.
    // With prominentTime: true the chip path is skipped — only the header
    // shows the time.
    const timeChip = canvasElement.querySelector('.spl-card-chip.time');
    expect(timeChip).toBeNull();
  }
};

export const ProminentTimeWithoutScheduledTimeNoHeader: StoryObj = {
  name: 'prominentTime true but no scheduledTime → no time-header (falls back to plain title)',
  render: () => renderCard({}, { prominentTime: true }),
  play: async ({ canvasElement }) => {
    const timeHeader = canvasElement.querySelector(TIME_HEADER_SELECTOR);
    expect(timeHeader).toBeNull();
    const title = canvasElement.querySelector(TITLE_SELECTOR);
    expect(title?.classList.contains('with-time')).toBe(false);
  }
};
